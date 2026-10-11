import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  HYBRID_SEARCH_PATH,
  LEXICAL_SEARCH_PATH,
  boundedTopK,
  searchNotes,
} from "./search-api";

const originalOrigin = process.env.OMNIDOC_API_ORIGIN;

beforeEach(() => {
  process.env.OMNIDOC_API_ORIGIN = "http://api.test";
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalOrigin === undefined) {
    delete process.env.OMNIDOC_API_ORIGIN;
  } else {
    process.env.OMNIDOC_API_ORIGIN = originalOrigin;
  }
});

type FetchCall = { url: string; init: RequestInit | undefined };

function stubFetch(respond: (call: FetchCall) => Response | Promise<Response>): FetchCall[] {
  const calls: FetchCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown, init?: RequestInit) => {
      const call = { url: String(input), init };
      calls.push(call);
      return respond(call);
    }),
  );
  return calls;
}

function headersOf(call: FetchCall): Headers {
  return new Headers(call.init?.headers);
}

function bodyOf(call: FetchCall): Record<string, unknown> {
  return JSON.parse(String(call.init?.body)) as Record<string, unknown>;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const hit = (overrides: Record<string, unknown> = {}) => ({
  chunkId: "chunk_1",
  noteId: "note_1",
  versionId: "v1",
  score: 0.87,
  snippet: "... pgvector index ...",
  ...overrides,
});

describe("searchNotes", () => {
  it("defaults to the hybrid path and sends only contract fields", async () => {
    const calls = stubFetch(() => json({ hits: [hit()], degraded: false }));

    const result = await searchNotes(
      { query: "pgvector" },
      { session: "S1", csrf: "t1" },
      "ws_1",
    );

    expect(result.status).toBe("results");
    expect(calls[0].url).toBe(`http://api.test${HYBRID_SEARCH_PATH}`);
    expect(calls[0].init?.method).toBe("POST");
    expect(headersOf(calls[0]).get("cookie")).toBe("JSESSIONID=S1; XSRF-TOKEN=t1");
    expect(headersOf(calls[0]).get("x-xsrf-token")).toBe("t1");
    expect(headersOf(calls[0]).get("omnidoc-workspace-id")).toBe("ws_1");
    // Exactly `query` and a bounded `topK` — no invented filter keys.
    expect(bodyOf(calls[0])).toEqual({ query: "pgvector", topK: 10 });
  });

  it("sends corpusOwnership as a real request field only when it is active", async () => {
    const calls = stubFetch(() => json({ hits: [hit()], degraded: false }));

    await searchNotes({ query: "pgvector", corpusOwnership: "sample" });
    expect(bodyOf(calls[0])).toEqual({
      query: "pgvector",
      topK: 10,
      corpusOwnership: "sample",
    });

    await searchNotes({ query: "pgvector", topK: 25, corpusOwnership: "mine" });
    expect(bodyOf(calls[1])).toEqual({
      query: "pgvector",
      topK: 25,
      corpusOwnership: "mine",
    });

    // "All" is the absence of the field, not an empty value.
    await searchNotes({ query: "pgvector" });
    expect(bodyOf(calls[2])).toEqual({ query: "pgvector", topK: 10 });
  });

  it("keeps topK inside the contract window", async () => {
    expect(boundedTopK(undefined)).toBe(10);
    expect(boundedTopK(0)).toBe(1);
    expect(boundedTopK(1_000)).toBe(100);
    expect(boundedTopK(7.9)).toBe(7);

    const calls = stubFetch(() => json({ hits: [], degraded: false }));
    await searchNotes({ query: "q", topK: 1_000 });
    expect(bodyOf(calls[0]).topK).toBe(100);
  });

  it("reaches the lexical endpoint when a caller names it", async () => {
    const calls = stubFetch(() => json({ hits: [], degraded: false }));

    await searchNotes({ query: "q" }, {}, undefined, { path: LEXICAL_SEARCH_PATH });

    expect(calls[0].url).toBe(`http://api.test${LEXICAL_SEARCH_PATH}`);
  });

  it("passes the server's hits and degraded flag through untouched", async () => {
    const hits = [
      hit(),
      hit({ chunkId: "chunk_2", noteId: "note_2", corpusOwnership: "sample" }),
    ];
    stubFetch(() => json({ hits, degraded: true }));

    const result = await searchNotes({ query: "q" });

    expect(result).toEqual({ status: "results", hits, degraded: true });
  });

  it("keeps every failure class distinct", async () => {
    stubFetch(() => json({ hits: [], degraded: false }, 400));
    expect(await searchNotes({ query: "q" })).toEqual({ status: "validation" });

    stubFetch(() => json({}, 401));
    expect(await searchNotes({ query: "q" })).toEqual({ status: "unauthorized" });

    stubFetch(() => json({}, 403));
    expect(await searchNotes({ query: "q" })).toEqual({ status: "forbidden" });

    for (const status of [500, 503, 504]) {
      stubFetch(() => json({}, status));
      expect(await searchNotes({ query: "q" })).toEqual({ status: "unavailable" });
    }
  });

  it("reports an unreachable service instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("connection refused");
      }),
    );

    expect(await searchNotes({ query: "q" })).toEqual({ status: "unavailable" });
  });

  it("keeps hits whose optional corpus ownership is JSON null", async () => {
    // The API serializes "no value" for the optional field as an explicit
    // `null` (`SearchController` maps the domain `Optional` with `.orElse(null)`),
    // and every note in the dev database has no `corpus_ownership`. Treating that
    // as a malformed response made every real search render the unavailable
    // state — "we could not ask" — for an answer the server did send.
    const unlabelled = hit({ corpusOwnership: null as unknown as undefined });
    stubFetch(() => json({ hits: [unlabelled], degraded: false }));

    const result = await searchNotes({ query: "president" });

    expect(result.status).toBe("results");
    expect(result.status === "results" && result.hits).toHaveLength(1);
    // Absent, not invented: the port does not guess a corpus.
    expect(result.status === "results" && result.hits[0].corpusOwnership).toBeUndefined();
  });

  it("still refuses a corpus value the contract does not define", async () => {
    stubFetch(() =>
      json({ hits: [hit({ corpusOwnership: "someone-else" })], degraded: false }),
    );
    expect(await searchNotes({ query: "q" })).toEqual({ status: "unavailable" });
  });

  it("refuses to invent results from a malformed body", async () => {
    // No `degraded` flag: the honest answer is "we could not read it".
    stubFetch(() => json({ hits: [hit()] }));
    expect(await searchNotes({ query: "q" })).toEqual({ status: "unavailable" });

    // A hit missing a required field is not a hit.
    stubFetch(() => json({ hits: [{ snippet: "..." }], degraded: false }));
    expect(await searchNotes({ query: "q" })).toEqual({ status: "unavailable" });

    stubFetch(() => new Response("not json", { status: 200 }));
    expect(await searchNotes({ query: "q" })).toEqual({ status: "unavailable" });
  });
});
