import { describe, expect, it, vi } from "vitest";

import type { ApiJar } from "../api/transport";
import type { SearchHit, SearchOutcome, SearchPortRequest } from "./search-api";
import { toSearchResult, runSearch, type SearchPort } from "./search-run";

/**
 * Route tests for `/search`, with the port injected.
 *
 * The route's data path is one function, so every screen state the UI must keep
 * apart is produced here rather than inferred: results, degraded, zero matches,
 * the generic denial, a rejected request, an unreachable service, and the idle
 * screen that must never reach the API at all.
 */

const hit = (overrides: Partial<SearchHit> = {}): SearchHit => ({
  chunkId: "chunk_1",
  noteId: "note_1",
  versionId: "v1",
  score: 0.5,
  snippet: "... snippet ...",
  ...overrides,
});

function fakePort(outcome: SearchOutcome): SearchPort {
  return vi.fn(async () => outcome) as unknown as SearchPort;
}

/** A port that records exactly what it was asked for. */
function recordingPort(outcome: SearchOutcome) {
  const requests: SearchPortRequest[] = [];
  const jars: ApiJar[] = [];
  const selectors: (string | undefined)[] = [];

  const port: SearchPort = async (request, jar, workspaceSelector) => {
    requests.push(request);
    jars.push(jar ?? {});
    selectors.push(workspaceSelector);
    return outcome;
  };

  return { port, requests, jars, selectors };
}

const jar = { session: "S1", csrf: "t1" };

describe("runSearch", () => {
  it("does not call the port at all for an empty query", async () => {
    const port = fakePort({ status: "results", hits: [], degraded: false });

    const outcome = await runSearch(
      "ws_1",
      jar,
      { query: "", corpus: null },
      port,
    );

    expect(outcome).toEqual({ status: "idle" });
    // The contract requires `query` minLength 1, and the idle screen searches
    // nothing — so no request may be sent.
    expect(port).not.toHaveBeenCalled();
  });

  it("asks for the query with a bounded topK and the resolved workspace", async () => {
    const { port, requests, jars, selectors } = recordingPort({
      status: "results",
      hits: [hit()],
      degraded: false,
    });

    const outcome = await runSearch(
      "ws_1",
      jar,
      { query: "pgvector BYOK", corpus: null },
      port,
    );

    expect(requests).toEqual([{ query: "pgvector BYOK", topK: 10 }]);
    expect(jars[0]).toBe(jar);
    expect(selectors[0]).toBe("ws_1");
    expect(outcome).toEqual({
      status: "results",
      hits: [toSearchResult(hit())],
      degraded: false,
      topK: 10,
    });
  });

  it("sends corpusOwnership only when the Sample/Mine filter is active", async () => {
    const { port, requests } = recordingPort({
      status: "results",
      hits: [hit()],
      degraded: false,
    });

    await runSearch("ws_1", jar, { query: "q", corpus: "sample" }, port);
    expect(requests[0]).toEqual({
      query: "q",
      topK: 10,
      corpusOwnership: "sample",
    });

    await runSearch("ws_1", jar, { query: "q", corpus: null }, port);
    // "All" is the absence of the field, so the request cannot filter by
    // accident.
    expect(requests[1]).toEqual({ query: "q", topK: 10 });
  });

  it("passes the server's degraded flag through instead of deriving it", async () => {
    const outcome = await runSearch(
      "ws_1",
      jar,
      { query: "q", corpus: null },
      fakePort({ status: "results", hits: [hit()], degraded: true }),
    );

    expect(outcome.status).toBe("results");
    expect(outcome.status === "results" && outcome.degraded).toBe(true);
  });

  it("keeps a zero-match answer distinct from every failure", async () => {
    const empty = await runSearch(
      "ws_1",
      jar,
      { query: "nothing matches", corpus: null },
      fakePort({ status: "results", hits: [], degraded: false }),
    );
    expect(empty).toEqual({ status: "no_results", query: "nothing matches" });

    expect(
      await runSearch(
        "ws_1",
        jar,
        { query: "q", corpus: null },
        fakePort({ status: "forbidden" }),
      ),
    ).toEqual({ status: "denied" });

    expect(
      await runSearch(
        "ws_1",
        jar,
        { query: "q", corpus: null },
        fakePort({ status: "validation" }),
      ),
    ).toEqual({ status: "validation" });

    // An expired session and an unreachable API are both "we could not ask";
    // neither may read as "nothing matched".
    for (const status of ["unauthorized", "unavailable"] as const) {
      expect(
        await runSearch(
          "ws_1",
          jar,
          { query: "q", corpus: null },
          fakePort({ status }),
        ),
      ).toEqual({ status: "unavailable" });
    }
  });
});

describe("toSearchResult", () => {
  it("keeps every contract field and adds none", () => {
    const sample = hit({ corpusOwnership: "sample" });
    expect(Object.keys(toSearchResult(sample))).toEqual(Object.keys(sample));

    const plain = hit();
    expect(Object.keys(toSearchResult(plain))).toEqual(Object.keys(plain));
    expect(toSearchResult(plain).corpusOwnership).toBeUndefined();
  });
});
