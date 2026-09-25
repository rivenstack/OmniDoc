import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  INGESTION_JOBS_PATH,
  NOTES_PATH,
  createNote,
  listNotes,
  notePath,
  readIngestionJob,
  readNote,
  softDeleteNote,
  updateNote,
  workspaceNotesPath,
} from "./notes-api";

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

function bodyOf(call: FetchCall): unknown {
  return call.init?.body === undefined ? undefined : JSON.parse(String(call.init.body));
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const bodyJson = { type: "doc", content: [{ type: "paragraph" }] };

const note = (overrides: Record<string, unknown> = {}) => ({
  id: "note_1",
  workspaceId: "ws_1",
  versionId: "v1",
  title: "Ergonomics",
  bodyJson,
  updatedAt: "2026-09-25T10:00:00Z",
  ...overrides,
});

describe("createNote", () => {
  it("posts title and body only, to the workspace-scoped collection", async () => {
    const calls = stubFetch(() => json(note(), 201));

    const result = await createNote("ws_1", { title: "Ergonomics", bodyJson }, { session: "S1", csrf: "t1" });

    expect(result).toEqual({ status: "saved", note: note() });
    expect(calls[0].url).toBe(`http://api.test${workspaceNotesPath("ws_1")}`);
    expect(calls[0].init?.method).toBe("POST");
    expect(headersOf(calls[0]).get("cookie")).toBe("JSESSIONID=S1; XSRF-TOKEN=t1");
    expect(headersOf(calls[0]).get("x-xsrf-token")).toBe("t1");
    expect(headersOf(calls[0]).get("omnidoc-workspace-id")).toBe("ws_1");
    // A note is creatable with a title and body only — nothing else is sent.
    expect(bodyOf(calls[0])).toEqual({ title: "Ergonomics", bodyJson });
  });

  it("encodes the workspace id rather than interpolating it raw", async () => {
    const calls = stubFetch(() => json(note(), 201));

    await createNote("ws/weird", { title: "t", bodyJson });

    expect(calls[0].url).toBe(`http://api.test${workspaceNotesPath("ws/weird")}`);
    expect(calls[0].url).toContain("ws%2Fweird");
  });

  it("separates a denied workspace from a validation failure", async () => {
    stubFetch(() => json({ code: "forbidden" }, 403));
    await expect(createNote("ws_2", { title: "t", bodyJson })).resolves.toEqual({
      status: "forbidden",
    });

    stubFetch(() => json({ code: "validation" }, 400));
    await expect(createNote("ws_1", { title: "t", bodyJson })).resolves.toEqual({
      status: "validation",
    });
  });

  it("reports an unreachable API as unavailable rather than throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("ECONNREFUSED"))),
    );

    await expect(createNote("ws_1", { title: "t", bodyJson })).resolves.toEqual({
      status: "unavailable",
    });
  });
});

describe("updateNote", () => {
  it("sends the last seen version as expectedVersion on a PATCH", async () => {
    const calls = stubFetch(() => json(note({ versionId: "v2" })));

    const result = await updateNote(
      "note_1",
      { title: "Ergonomics v2", bodyJson, expectedVersion: "v1" },
      { session: "S1", csrf: "t1" },
      "ws_1",
    );

    expect(result).toEqual({ status: "saved", note: note({ versionId: "v2" }) });
    expect(calls[0].url).toBe(`http://api.test${notePath("note_1")}`);
    expect(calls[0].init?.method).toBe("PATCH");
    expect(headersOf(calls[0]).get("omnidoc-workspace-id")).toBe("ws_1");
    expect(bodyOf(calls[0])).toEqual({
      title: "Ergonomics v2",
      bodyJson,
      expectedVersion: "v1",
    });
  });

  it("reports a 409 as a conflict and does not retry into last-write-wins", async () => {
    const calls = stubFetch(() => json({ code: "conflict" }, 409));

    const result = await updateNote(
      "note_1",
      { title: "t", bodyJson, expectedVersion: "v1" },
      { session: "S1", csrf: "t1" },
    );

    expect(result).toEqual({ status: "conflict" });
    // One attempt only: the client must not pick the winning version.
    expect(calls).toHaveLength(1);
  });

  it("keeps not_found distinct from a denial", async () => {
    stubFetch(() => json({ code: "not_found" }, 404));
    await expect(
      updateNote("note_gone", { title: "t", bodyJson, expectedVersion: "v1" }),
    ).resolves.toEqual({ status: "not_found" });
  });
});

describe("readNote", () => {
  it("returns a contract note and forwards the workspace selector", async () => {
    const calls = stubFetch(() => json(note()));

    const result = await readNote("note_1", { session: "S1" }, "ws_1");

    expect(result).toEqual({ status: "found", note: note() });
    expect(calls[0].init?.method).toBe("GET");
    expect(headersOf(calls[0]).get("omnidoc-workspace-id")).toBe("ws_1");
  });

  it("refuses a body that is not a note instead of inventing one", async () => {
    stubFetch(() => json({ id: "note_1" }));

    await expect(readNote("note_1")).resolves.toEqual({ status: "unavailable" });
  });
});

describe("softDeleteNote", () => {
  it("posts to the soft-delete action and treats 204 as done", async () => {
    const calls = stubFetch(() => new Response(null, { status: 204 }));

    await expect(softDeleteNote("note_1", { session: "S1", csrf: "t1" })).resolves.toEqual({
      status: "deleted",
    });
    expect(calls[0].url).toBe(`http://api.test${notePath("note_1")}/soft-delete`);
    expect(calls[0].init?.method).toBe("POST");
  });
});

describe("listNotes", () => {
  it("omits an empty query string and forwards a cursor when present", async () => {
    const calls = stubFetch(() => json({ items: [note()], nextCursor: null }));

    const first = await listNotes("ws_1", { session: "S1" });
    expect(first).toEqual({ status: "listed", notes: [note()], nextCursor: null });
    expect(calls[0].url).toBe(`http://api.test${workspaceNotesPath("ws_1")}`);

    stubFetch(() => json({ items: [], nextCursor: "c1" }));
    const second = await listNotes("ws_1", { session: "S1" }, { limit: 20, cursor: "c0" });
    expect(second).toEqual({ status: "listed", notes: [], nextCursor: "c1" });
  });
});

describe("readIngestionJob", () => {
  it("returns the job progress for an import", async () => {
    const calls = stubFetch(() =>
      json({ jobId: "job_1", status: "running", completedUnits: 3, totalUnits: 10 }),
    );

    const result = await readIngestionJob("job_1", { session: "S1" }, "ws_1");

    expect(result).toEqual({
      status: "job",
      job: { jobId: "job_1", status: "running", completedUnits: 3, totalUnits: 10 },
    });
    expect(calls[0].url).toBe(`http://api.test${INGESTION_JOBS_PATH}/job_1`);
  });

  it("exposes the note path prefix the contract fixes", () => {
    expect(NOTES_PATH).toBe("/api/v1/notes");
  });
});
