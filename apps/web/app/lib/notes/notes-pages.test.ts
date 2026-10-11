import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MAX_LIST_PAGE_CHAIN,
  collectNotePages,
  pageHref,
  readCursors,
  toOrganizeNote,
} from "./notes-pages";

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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const note = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  workspaceId: "ws_1",
  versionId: `v-${id}`,
  title: `Note ${id}`,
  bodyJson: { type: "doc", content: [{ type: "paragraph" }] },
  updatedAt: "2026-09-25T10:00:00Z",
  ...overrides,
});

const page = (ids: string[], nextCursor: string | null) =>
  json({ items: ids.map((id) => note(id)), nextCursor });

describe("collectNotePages", () => {
  it("walks one page, then follows the server cursor from the URL", async () => {
    const calls = stubFetch(({ url }) => {
      if (url.includes("cursor=c1")) {
        return page(["n2"], "c2");
      }
      return page(["n1"], "c1");
    });

    const outcome = await collectNotePages("ws_1", { session: "S1" }, ["c1"]);

    expect(outcome).toEqual({
      status: "listed",
      notes: [
        {
          id: "n1",
          title: "Note n1",
          updatedAt: "2026-09-25T10:00:00Z",
          corpusOwnership: undefined,
        },
        {
          id: "n2",
          title: "Note n2",
          updatedAt: "2026-09-25T10:00:00Z",
          corpusOwnership: undefined,
        },
      ],
      cursors: ["c1"],
      nextCursor: "c2",
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).not.toContain("cursor");
    expect(calls[1]?.url).toContain("cursor=c1");
    // The workspace id selects; it travels as the selector header on every page.
    for (const call of calls) {
      expect(new Headers(call.init?.headers).get("OmniDoc-Workspace-Id")).toBe(
        "ws_1",
      );
    }
  });

  it("stops at the last page the server vouches for when the URL cursor is stale", async () => {
    const calls = stubFetch(() => page(["n1"], "c1"));

    const outcome = await collectNotePages("ws_1", {}, ["stale-cursor"]);

    // One request only: the stale cursor is never replayed, and the offered
    // cursor is the server's own.
    expect(calls).toHaveLength(1);
    expect(outcome).toEqual({
      status: "listed",
      notes: [
        {
          id: "n1",
          title: "Note n1",
          updatedAt: "2026-09-25T10:00:00Z",
          corpusOwnership: undefined,
        },
      ],
      cursors: [],
      nextCursor: "c1",
    });
  });

  it("stops when the server says there is nothing more", async () => {
    const calls = stubFetch(({ url }) =>
      url.includes("cursor=c1") ? page(["n2"], null) : page(["n1"], "c1"),
    );

    const outcome = await collectNotePages("ws_1", {}, ["c1", "c2"]);

    expect(calls).toHaveLength(2);
    expect(outcome.status).toBe("listed");
    if (outcome.status === "listed") {
      expect(outcome.notes.map((item) => item.id)).toEqual(["n1", "n2"]);
      expect(outcome.cursors).toEqual(["c1"]);
      expect(outcome.nextCursor).toBeNull();
    }
  });

  it("reports a forbidden workspace as the generic denial", async () => {
    stubFetch(() => new Response(null, { status: 403 }));

    expect(await collectNotePages("ws_1", {}, [])).toEqual({
      status: "denied",
    });
  });

  it("keeps an expired session and a transport failure as 'could not ask'", async () => {
    stubFetch(() => new Response(null, { status: 401 }));
    expect(await collectNotePages("ws_1", {}, [])).toEqual({
      status: "unavailable",
    });

    vi.unstubAllGlobals();
    stubFetch(() => new Response(null, { status: 500 }));
    expect(await collectNotePages("ws_1", {}, [])).toEqual({
      status: "unavailable",
    });

    vi.unstubAllGlobals();
    stubFetch(() => json({ items: "not-an-array" }));
    expect(await collectNotePages("ws_1", {}, [])).toEqual({
      status: "unavailable",
    });
  });
});

describe("readCursors", () => {
  it("reads absent, single and repeated cursor parameters", () => {
    expect(readCursors(undefined)).toEqual([]);
    expect(readCursors(" c1 ")).toEqual(["c1"]);
    expect(readCursors(["c1", "", "  ", "c2"])).toEqual(["c1", "c2"]);
  });

  it("bounds the chain a URL may ask for", () => {
    const many = Array.from({ length: 40 }, (_, index) => `c${index}`);
    expect(readCursors(many)).toHaveLength(MAX_LIST_PAGE_CHAIN);
  });
});

describe("pageHref", () => {
  it("is the base path with no cursors, and repeats the parameter otherwise", () => {
    expect(pageHref("/inbox", [])).toBe("/inbox");
    expect(pageHref("/inbox", ["c1", "c2"])).toBe(
      "/inbox?cursor=c1&cursor=c2",
    );
  });

  it("encodes a cursor rather than trusting it in the URL", () => {
    expect(pageHref("/notes", ["a b&c"])).toBe("/notes?cursor=a+b%26c");
  });
});

describe("toOrganizeNote", () => {
  it("carries only what a row renders — never the body", () => {
    const projected = toOrganizeNote(
      note("n1", {
        title: "Ergonomics",
        corpusOwnership: "sample",
      }) as Parameters<typeof toOrganizeNote>[0],
    );

    expect(projected).toEqual({
      id: "n1",
      title: "Ergonomics",
      updatedAt: "2026-09-25T10:00:00Z",
      corpusOwnership: "sample",
    });
    expect(Object.keys(projected)).not.toContain("bodyJson");
  });
});
