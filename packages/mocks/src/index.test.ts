import { afterEach, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import type { Answer, AskOutcome, AskSseEvent } from "@omnidoc/contracts";
import {
  createMockEnvironment,
  askQuestions,
  chunks,
  fixedNow,
  identities,
  jobSteps,
  longToken,
  mockCorpusVersion,
  notes,
  richTextMarkdown,
  scenarios,
  workspaces,
  type ScenarioName,
} from "./index";
import { fixtureText, type Schema } from "./fixtures";

let close = () => undefined as void;
afterEach(() => close());
function harness(scenario: ScenarioName = "personal") {
  const baseUrl = `http://${scenario}.omnidoc.test`;
  const env = createMockEnvironment({ scenario, baseUrl });
  const server = setupServer(...env.handlers);
  server.listen({ onUnhandledRequest: "error" });
  close = () => {
    env.releaseResponses();
    server.close();
  };
  const request = (
    path: string,
    method = "GET",
    data?: unknown,
    overrides: Record<string, string> = {},
  ) =>
    fetch(`${baseUrl}/api/v1${path}`, {
      method,
      headers: {
        ...env.getSessionHeaders(),
        "OmniDoc-Workspace-Id": scenario === "sample" ? "ws_sample" : "ws_mine",
        ...(data === undefined ? {} : { "Content-Type": "application/json" }),
        ...overrides,
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
  const ask = (outcome: AskOutcome = "supported", extra = {}) =>
    request("/ask", "POST", { question: askQuestions[outcome], ...extra });
  return { env, server, request, ask, baseUrl };
}
function present<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Expected fixture value to exist.");
  return value;
}
function events(text: string): AskSseEvent[] {
  return text
    .trim()
    .split("\n\n")
    .map((record) => {
      const [name, payload] = record.split("\n");
      return {
        event: name.slice(7),
        data: JSON.parse(payload.slice(6)),
      } as AskSseEvent;
    });
}
async function completed(response: Response): Promise<Answer> {
  expect(response.status).toBe(200);
  const last = present(events(await response.text()).at(-1));
  expect(last.event).toBe("completed");
  return last.data as Answer;
}
function sessionHeaders(response: Response) {
  const pairs = response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0]);
  const token = present(
    pairs.find((cookie) => cookie.startsWith("XSRF-TOKEN=")),
  ).slice("XSRF-TOKEN=".length);
  return { Cookie: pairs.join("; "), "X-XSRF-TOKEN": token };
}

describe("versioned corpus and themes", () => {
  it("has stable immutable seeds, ProseMirror content, ownership and exact citation anchors", () => {
    expect(mockCorpusVersion).toBe("s-03-v1");
    expect(new Set(notes.map((n) => n.id)).size).toBe(notes.length);
    expect(
      notes.every((n) => n.updatedAt === fixedNow && n.bodyJson.type === "doc"),
    ).toBe(true);
    expect(
      notes.every(
        (n) =>
          n.corpusOwnership ===
          (n.workspaceId === "ws_sample" ? "sample" : "mine"),
      ),
    ).toBe(true);
    expect(workspaces.every((w) => !("corpusOwnership" in w))).toBe(true);
    expect(Object.isFrozen(notes[0].bodyJson)).toBe(true);
    for (const chunk of chunks) {
      const note = present(notes.find((n) => n.id === chunk.noteId));
      expect(note.versionId).toBe(chunk.versionId);
      expect(
        fixtureText(note.bodyJson).slice(
          chunk.anchor.startOffset,
          chunk.anchor.endOffset,
        ),
      ).toBe(chunk.text);
    }
  });
  it("contains actual rich-body edge cases and markdown rendering examples", () => {
    const note = present(notes.find((n) => n.id === "ws_mine_formatting"));
    expect(note.title.length).toBeGreaterThan(250);
    const json = JSON.stringify(note.bodyJson);
    for (const token of [
      "blockquote",
      "codeBlock",
      "table",
      "expectedVersion",
      "https://example.test",
      "/notes/research/launch.md",
      "pgvector",
      "BYOK",
      "OpenAI",
      longToken,
    ])
      expect(json).toContain(token);
    expect(longToken).toMatch(/^\S{720}$/);
    expect(richTextMarkdown).toContain("```ts");
    expect(richTextMarkdown).toContain("| Stage | Owner |");
    expect(richTextMarkdown).toContain(">> Nested quote");
    expect(Object.keys(askQuestions).sort()).toEqual([
      "conflict",
      "no_supported_answer",
      "partial",
      "refused_policy",
      "supported",
    ]);
    for (const key of [
      "empty",
      "loading",
      "indexing",
      "timeout",
      "unavailable",
      "operator_quota",
      "customer_quota",
      "sample",
      "operator",
      "customer",
    ])
      expect(scenarios).toHaveProperty(key);
  });
});

describe("sessions, membership and notes", () => {
  it("signs in using fixed credentials, binds membership, rotates session and logs out", async () => {
    const { request } = harness("signed_out");
    expect((await request("/session")).status).toBe(401);
    expect(
      (
        await request("/session", "POST", {
          email: identities.alex.email,
          password: "wrong",
        })
      ).status,
    ).toBe(401);
    const login = await request("/session", "POST", {
      email: identities.alex.email,
      password: identities.alex.password,
    });
    expect(await login.json()).toEqual({ actorId: identities.alex.actorId });
    expect(login.headers.getSetCookie().join(";")).toContain("HttpOnly");
    const headers = sessionHeaders(login);
    expect(
      await (await request("/workspaces", "GET", undefined, headers)).json(),
    ).toEqual({
      workspaces: workspaces.filter((w) =>
        identities.alex.workspaceIds.includes(w.id),
      ),
    });
    expect(
      (await request("/workspaces/ws_other/notes", "GET", undefined, headers))
        .status,
    ).toBe(403);
    const replacement = await request(
      "/session",
      "POST",
      { email: identities.blair.email, password: identities.blair.password },
      headers,
    );
    expect((await request("/session", "GET", undefined, headers)).status).toBe(
      401,
    );
    const blairHeaders = sessionHeaders(replacement);
    expect(
      (
        await request("/session", "DELETE", undefined, {
          ...blairHeaders,
          "X-XSRF-TOKEN": "bad",
        })
      ).status,
    ).toBe(403);
    expect(
      (await request("/session", "DELETE", undefined, blairHeaders)).status,
    ).toBe(204);
    expect(
      (await request("/session", "GET", undefined, blairHeaders)).status,
    ).toBe(401);
  });
  it("rejects forged session cookies and selectors rather than falling back", async () => {
    const { request } = harness();
    expect(
      (
        await request("/workspaces", "GET", undefined, {
          Cookie: "JSESSIONID=forged",
        })
      ).status,
    ).toBe(401);
    expect((await request("/notes/ws_other_private")).status).toBe(403);
    expect(
      (
        await request("/notes/ws_mine_launch", "GET", undefined, {
          "OmniDoc-Workspace-Id": "ws_empty",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request("/notes/ws_mine_launch", "GET", undefined, {
          "OmniDoc-Workspace-Id": "",
        })
      ).status,
    ).toBe(403);
    expect((await request("/notes/missing")).status).toBe(404);
  });
  it("supports headerless note access, CRUD conflict, concurrent edits, delete and purge", async () => {
    const { request, baseUrl, env } = harness();
    const created = await request("/workspaces/ws_mine/notes", "POST", {
      title: "",
      bodyJson: { type: "doc" },
    });
    expect(created.status).toBe(201);
    const note: Schema["Note"] = await created.json();
    expect(
      (
        await fetch(`${baseUrl}/api/v1/notes/${note.id}`, {
          headers: env.getSessionHeaders(),
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(`/notes/${note.id}`, "PATCH", {
          title: "Edit",
          bodyJson: {},
          expectedVersion: "stale",
        })
      ).status,
    ).toBe(409);
    const edits = await Promise.all(
      [1, 2].map((i) =>
        request(`/notes/${note.id}`, "PATCH", {
          title: `Edit ${i}`,
          bodyJson: {},
          expectedVersion: note.versionId,
        }),
      ),
    );
    expect(edits.map((r) => r.status).sort()).toEqual([200, 409]);
    const updated: Schema["Note"] = await present(
      edits.find((r) => r.status === 200),
    ).json();
    expect(updated.versionId).not.toBe(note.versionId);
    expect(
      (await request(`/notes/${note.id}/soft-delete`, "POST")).status,
    ).toBe(204);
    expect((await request(`/notes/${note.id}`)).status).toBe(404);
    expect((await request(`/notes/${note.id}/purge`, "POST")).status).toBe(204);
    expect((await request(`/notes/${note.id}/purge`, "POST")).status).toBe(404);
  });
  it("paginates deterministically and binds cursors to workspace membership", async () => {
    const { request } = harness();
    const first: Schema["NotePage"] = await (
      await request("/workspaces/ws_mine/notes?limit=2")
    ).json();
    const second: Schema["NotePage"] = await (
      await request(
        `/workspaces/ws_mine/notes?limit=2&cursor=${encodeURIComponent(present(first.nextCursor))}`,
      )
    ).json();
    expect(
      new Set([...first.items, ...second.items].map((n) => n.id)).size,
    ).toBe(4);
    expect(second.nextCursor).toBeNull();
    expect(
      (
        await request(
          `/workspaces/ws_empty/notes?cursor=${encodeURIComponent(present(first.nextCursor))}`,
        )
      ).status,
    ).toBe(400);
    expect((await request("/workspaces/ws_mine/notes?cursor=bad")).status).toBe(
      400,
    );
    expect((await request("/workspaces/ws_mine/notes?limit=101")).status).toBe(
      400,
    );
    expect(await (await request("/workspaces/ws_empty/notes")).json()).toEqual({
      items: [],
      nextCursor: null,
    });
  });
  it.each([
    ["/workspaces/ws_mine/notes", "POST"],
    ["/notes/ws_mine_launch", "PATCH"],
    ["/notes/ws_mine_launch/soft-delete", "POST"],
    ["/notes/ws_mine_launch/purge", "POST"],
    ["/search/lexical", "POST"],
    ["/search/hybrid", "POST"],
    ["/ask", "POST"],
    ["/vault", "POST"],
    ["/vault/vault_alex_demo/rotate", "POST"],
    ["/vault/vault_alex_demo/revoke", "POST"],
    ["/vault/vault_alex_demo/verify", "POST"],
    ["/runtime-mode", "PUT"],
  ])("requires CSRF on %s %s", async (path, method) => {
    const { request } = harness();
    const response = await request(path, method, {}, { "X-XSRF-TOKEN": "" });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "forbidden" });
  });
  it("does not accept malformed bodies or client tenant authority", async () => {
    const { request } = harness();
    for (const data of [
      [],
      { title: "bad", bodyJson: [] },
      { title: "bad", bodyJson: {}, tenantId: "tenant_blair" },
    ])
      expect(
        (await request("/workspaces/ws_mine/notes", "POST", data)).status,
      ).toBe(400);
    expect(
      (
        await request("/ask", "POST", {
          question: "x",
          tenantId: "tenant_blair",
        })
      ).status,
    ).toBe(400);
  });
});

describe("retrieval, Ask and sample trust", () => {
  it.each(Object.keys(askQuestions) as AskOutcome[])(
    "%s is completed on 200 SSE and has accessible exact-version citations",
    async (outcome) => {
      const { ask, request } = harness();
      const response = await ask(outcome);
      expect(response.headers.get("Content-Type")).toContain(
        "text/event-stream",
      );
      expect(response.status).toBe(200);
      const records = events(await response.text());
      expect(records[0]).toEqual({ event: "generating", data: {} });
      expect(
        records.filter((e) =>
          ["completed", "error", "truncated"].includes(e.event),
        ),
      ).toHaveLength(1);
      const answer = present(records.at(-1)).data as Answer;
      expect(answer.outcome).toBe(outcome);
      if (outcome === "conflict") expect(answer.citations).toHaveLength(2);
      if (outcome === "no_supported_answer" || outcome === "refused_policy")
        expect(answer.citations).toEqual([]);
      for (const cite of answer.citations) {
        const source: Schema["Note"] = await (
          await request(`/notes/${cite.noteId}`)
        ).json();
        expect(source.versionId).toBe(cite.versionId);
        expect(cite.corpusOwnership).toBe("mine");
        expect(chunks.find((c) => c.chunkId === cite.chunkId)?.text).toBe(
          cite.preview,
        );
      }
    },
  );
  it("returns no-supported-answer for unknown questions, empty and wrong ownership scopes", async () => {
    const { ask, request } = harness();
    expect(
      (
        await completed(
          await request("/ask", "POST", { question: "An unknown question" }),
        )
      ).outcome,
    ).toBe("no_supported_answer");
    expect(
      (await completed(await ask("supported", { corpusOwnership: "sample" })))
        .citations,
    ).toEqual([]);
    expect(
      (
        await completed(
          await request(
            "/ask",
            "POST",
            { question: askQuestions.supported },
            { "OmniDoc-Workspace-Id": "ws_empty" },
          ),
        )
      ).outcome,
    ).toBe("no_supported_answer");
  });
  it.each(["lexical", "hybrid"])(
    "%s applies tenant/ownership/filters before returning hits",
    async (kind) => {
      const { request } = harness();
      const hits: Schema["SearchResults"] = await (
        await request(`/search/${kind}`, "POST", { query: "launch", topK: 1 })
      ).json();
      expect(hits.hits.map((h) => h.noteId)).toEqual(["ws_mine_launch"]);
      expect(
        (
          await request(
            `/search/${kind}`,
            "POST",
            { query: "launch" },
            { "OmniDoc-Workspace-Id": "ws_other" },
          )
        ).status,
      ).toBe(403);
      for (const extra of [
        { corpusOwnership: "sample" },
        { filters: { noteId: "ws_other_private" } },
        { filters: { unknown: "value" } },
      ]) {
        expect(
          await (
            await request(`/search/${kind}`, "POST", {
              query: "launch",
              ...extra,
            })
          ).json(),
        ).toEqual({ hits: [], degraded: false });
      }
      expect(
        (
          await (
            await request(`/search/${kind}`, "POST", { query: "BYOK" })
          ).json()
        ).hits[0].noteId,
      ).toBe("ws_mine_formatting");
      expect(
        (
          await (
            await request(`/search/${kind}`, "POST", {
              query: "release meeting",
            })
          ).json()
        ).hits,
      ).toHaveLength(2);
    },
  );
  it("invalidates changed/deleted source evidence and never persists Ask answers", async () => {
    const { request, ask } = harness();
    const before = await (await request("/workspaces/ws_mine/notes")).text();
    await completed(await ask());
    expect(await (await request("/workspaces/ws_mine/notes")).text()).toBe(
      before,
    );
    await request("/notes/ws_mine_launch", "PATCH", {
      title: "Changed",
      bodyJson: { type: "doc" },
      expectedVersion: "ws_mine_launch_v1",
    });
    expect((await completed(await ask())).outcome).toBe("no_supported_answer");
    await request("/notes/ws_mine_conflict/soft-delete", "POST");
    expect(
      (
        await (
          await request("/search/hybrid", "POST", { query: "launch" })
        ).json()
      ).hits,
    ).toEqual([]);
    await request("/notes/ws_mine_conflict/purge", "POST");
    expect((await completed(await ask("conflict"))).citations).toEqual([]);
  });
  it("preauthenticates the sample guest, labels every supported surface, and denies writes", async () => {
    const { request, ask } = harness("sample");
    expect(await (await request("/session")).json()).toEqual({
      actorId: identities.guest.actorId,
    });
    expect(
      (await (await request("/workspaces")).json()).workspaces.map(
        (w: Schema["Workspace"]) => w.id,
      ),
    ).toEqual(["ws_sample"]);
    const page: Schema["NotePage"] = await (
      await request("/workspaces/ws_sample/notes")
    ).json();
    expect(page.items.every((n) => n.corpusOwnership === "sample")).toBe(true);
    expect(
      (
        await completed(await ask("supported", { corpusOwnership: "sample" }))
      ).citations.every((c) => c.corpusOwnership === "sample"),
    ).toBe(true);
    expect(
      (
        await (
          await request("/search/lexical", "POST", { query: "launch" })
        ).json()
      ).hits.every((h: Schema["SearchHit"]) => h.corpusOwnership === "sample"),
    ).toBe(true);
    expect((await request("/workspaces/ws_mine/notes")).status).toBe(403);
    for (const [path, method] of [
      ["/workspaces/ws_sample/notes", "POST"],
      ["/notes/ws_sample_launch", "PATCH"],
      ["/notes/ws_sample_launch/soft-delete", "POST"],
      ["/notes/ws_sample_launch/purge", "POST"],
      ["/vault", "POST"],
      ["/runtime-mode", "PUT"],
    ])
      expect((await request(path, method, {})).status).toBe(403);
  });
});

describe("transport, runtime metadata, progress and replay", () => {
  it.each([
    ["timeout", 504, "timeout"],
    ["unavailable", 503, "unavailable"],
    ["operator_quota", 429, "quota_exhausted"],
    ["customer_quota", 429, "quota_exhausted"],
  ] as const)("%s is a pre-stream HTTP failure", async (name, status, code) => {
    const { ask } = harness(name);
    const response = await ask();
    expect(response.status).toBe(status);
    const error = await response.json();
    expect(error.code).toBe(code);
    expect(error).not.toHaveProperty("outcome");
    if (status === 429) expect(error.mode).toBe(scenarios[name].mode);
  });
  it.each(["truncated", "stream_error"] as const)(
    "%s terminates the 200 stream without completion",
    async (name) => {
      const { ask } = harness(name);
      const response = await ask();
      expect(response.status).toBe(200);
      const records = events(await response.text());
      expect(present(records.at(-1)).event).toBe(
        name === "truncated" ? "truncated" : "error",
      );
      expect(
        records.filter((e) =>
          ["completed", "error", "truncated"].includes(e.event),
        ),
      ).toHaveLength(1);
      expect(records.some((e) => e.event === "completed")).toBe(false);
      if (name === "stream_error")
        expect(present(records.at(-1)).data).toMatchObject({
          mode: "operator_free_tier",
        });
    },
  );
  it("uses fixed resettable IDs and byte-identical SSE, including mutations and progress", async () => {
    const { request, ask, env } = harness();
    const sequence = async () => {
      env.advanceProgress();
      return Promise.all([
        request("/workspaces/ws_mine/notes", "POST", {
          title: "Replay",
          bodyJson: {},
        }).then((r) => r.text()),
        ask().then((r) => r.text()),
        request("/ingestion-jobs/job_mine_import").then((r) => r.text()),
      ]);
    };
    const first = await sequence();
    env.reset();
    expect(await sequence()).toEqual(first);
    expect(notes.some((n) => n.title === "Replay")).toBe(false);
  });
  it.each(["truncated", "stream_error"] as const)(
    "replays %s SSE bytes after reset",
    async (name) => {
      const { ask, env } = harness(name);
      const first = await (await ask()).text();
      env.reset();
      expect(await (await ask()).text()).toBe(first);
    },
  );
  it("keeps progress static until explicitly advanced, capped and resettable", async () => {
    const { request, env } = harness("indexing");
    for (const step of jobSteps) {
      expect(
        await (await request("/ingestion-jobs/job_mine_import")).json(),
      ).toEqual(step);
      expect(
        await (await request("/ingestion-jobs/job_mine_import")).json(),
      ).toEqual(step);
      env.advanceProgress();
    }
    expect(
      await (await request("/ingestion-jobs/job_mine_import")).json(),
    ).toEqual(jobSteps[2]);
    env.reset();
    expect(
      await (await request("/ingestion-jobs/job_mine_import")).json(),
    ).toEqual(jobSteps[0]);
    expect(
      (
        await request("/ingestion-jobs/job_mine_import", "GET", undefined, {
          "OmniDoc-Workspace-Id": "ws_empty",
        })
      ).status,
    ).toBe(404);
  });
  it("holds loading responses until explicitly released", async () => {
    const { request, env, server } = harness("loading");
    const started = new Promise<void>((resolve) =>
      server.events.on("request:start", () => resolve()),
    );
    let settled = false;
    const response = request("/workspaces").then((r) => {
      settled = true;
      return r;
    });
    await started;
    await Promise.resolve();
    expect(settled).toBe(false);
    env.releaseResponses();
    expect((await response).status).toBe(200);
  });
  it("rejects silent mode switches, scopes metadata, and treats unavailable usage as success", async () => {
    const { request, ask } = harness("usage_unavailable");
    expect(await (await request("/runtime-mode")).json()).toEqual({
      mode: "mock",
      feature: "ask",
    });
    expect(
      (await ask("supported", { mode: "operator_free_tier" })).status,
    ).toBe(403);
    expect(
      (
        await request("/runtime-mode", "PUT", {
          requestedMode: "customer_key",
          feature: "ask",
        })
      ).status,
    ).toBe(403);
    for (const path of ["/usage", "/usage/limits"]) {
      const response = await request(path);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ status: "unavailable" });
    }
  });
  it.each(["operator", "customer"] as const)(
    "simulates %s metadata with explicit changes and no fallback",
    async (name) => {
      const { request, ask } = harness(name);
      expect(await (await request("/runtime-mode?feature=ask")).json()).toEqual(
        { mode: scenarios[name].mode, feature: "ask" },
      );
      expect((await completed(await ask())).outcome).toBe("supported");
      expect(
        (
          await request("/runtime-mode", "PUT", {
            requestedMode: "mock",
            feature: "ask",
          })
        ).status,
      ).toBe(200);
      expect(
        (await ask("supported", { mode: scenarios[name].mode })).status,
      ).toBe(403);
      expect((await completed(await ask())).outcome).toBe("supported");
    },
  );
  it("stores only vault metadata, verifies/revokes/rotates, and never falls back on revocation", async () => {
    const { request, ask } = harness("customer");
    const secret = "sentinel-do-not-retain";
    const stored = await request("/vault", "POST", {
      plaintextKey: secret,
      toolChapterId: "openrouter",
      label: "Test",
    });
    expect(stored.status).toBe(201);
    const metadata: Schema["VaultMetadata"] = await stored.json();
    expect(JSON.stringify(metadata)).not.toContain(secret);
    expect(
      await (
        await request(`/vault/${metadata.vaultRecordId}/verify`, "POST")
      ).json(),
    ).toEqual({ verification: "ok" });
    for (const id of ["vault_alex_demo", metadata.vaultRecordId])
      expect((await request(`/vault/${id}/revoke`, "POST")).status).toBe(204);
    expect((await ask()).status).toBe(403);
    expect(await (await request("/runtime-mode")).json()).toMatchObject({
      mode: "customer_key",
    });
    expect(
      await (
        await request(`/vault/${metadata.vaultRecordId}/verify`, "POST")
      ).json(),
    ).toEqual({ verification: "invalid" });
    expect(
      (
        await request(`/vault/${metadata.vaultRecordId}/rotate`, "POST", {
          plaintextKey: secret,
        })
      ).status,
    ).toBe(200);
    expect(await (await request("/vault")).text()).not.toContain(secret);
    expect((await completed(await ask())).outcome).toBe("supported");
  });
  it("isolates state between environment instances", async () => {
    const { request, server } = harness();
    await request("/notes/ws_mine_launch/soft-delete", "POST");
    const other = createMockEnvironment({
      baseUrl: "http://personal.omnidoc.test",
    });
    server.resetHandlers(...other.handlers);
    expect((await request("/notes/ws_mine_launch")).status).toBe(200);
  });
});

describe("reset and failure boundary regressions", () => {
  it.each(["operator_quota", "customer_quota", "stream_error"] as const)(
    "keeps mock Ask available after an explicit switch from %s",
    async (name) => {
      const { request, ask } = harness(name);
      expect(
        (
          await request("/runtime-mode", "PUT", {
            requestedMode: "mock",
            feature: "ask",
          })
        ).status,
      ).toBe(200);
      expect((await completed(await ask())).outcome).toBe("supported");
    },
  );
  it.each(Object.keys(askQuestions) as AskOutcome[])(
    "replays %s success bytes exactly",
    async (outcome) => {
      const { ask, env } = harness();
      const first = await (await ask(outcome)).text();
      env.reset();
      expect(await (await ask(outcome)).text()).toBe(first);
    },
  );
  it.each([
    ["indexing_failed", "failed"],
    ["indexing_partial", "partial"],
  ] as const)("provides %s as a static job fixture", async (name, status) => {
    const { request, env } = harness(name);
    env.advanceProgress();
    expect(
      await (await request("/ingestion-jobs/job_mine_import")).json(),
    ).toMatchObject({ status });
  });
  it("reset cancels held writes instead of applying them to the fresh corpus", async () => {
    const { request, env, server } = harness("loading");
    const started = new Promise<void>((resolve) =>
      server.events.on("request:start", () => resolve()),
    );
    const pending = request("/workspaces/ws_mine/notes", "POST", {
      title: "Must not survive reset",
      bodyJson: {},
    });
    const rejected = expect(pending).rejects.toThrow();
    await started;
    // Let MSW reach the held resolver before resetting.
    await new Promise<void>((resolve) => setImmediate(resolve));
    env.reset();
    await rejected;
    env.releaseResponses();
    const page: Schema["NotePage"] = await (
      await request("/workspaces/ws_mine/notes")
    ).json();
    expect(page.items).toHaveLength(4);
  });
  it("client cancellation of loading does not mutate notes", async () => {
    const { env, baseUrl, server, request } = harness("loading");
    const started = new Promise<void>((resolve) =>
      server.events.on("request:start", () => resolve()),
    );
    const controller = new AbortController();
    const pending = fetch(`${baseUrl}/api/v1/workspaces/ws_mine/notes`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        ...env.getSessionHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: "Cancelled", bodyJson: {} }),
    });
    const rejected = expect(pending).rejects.toThrow();
    await started;
    controller.abort();
    await rejected;
    env.releaseResponses();
    expect(
      (await (await request("/workspaces/ws_mine/notes")).json()).items,
    ).toHaveLength(4);
  });
  it("denies cross-tenant notes mutations, Ask and vault metadata even with valid CSRF", async () => {
    const { request } = harness();
    const scope = { "OmniDoc-Workspace-Id": "ws_other" };
    for (const [path, method] of [
      ["/notes/ws_other_private", "PATCH"],
      ["/notes/ws_other_private/soft-delete", "POST"],
      ["/notes/ws_other_private/purge", "POST"],
      ["/ask", "POST"],
      ["/vault", "GET"],
      ["/runtime-mode", "GET"],
    ]) {
      expect(
        (await request(path, method, method === "GET" ? undefined : {}, scope))
          .status,
      ).toBe(403);
    }
    // Authenticate the second fixture identity and prove its note was untouched.
    const login = await request("/session", "POST", {
      email: identities.blair.email,
      password: identities.blair.password,
    });
    const blair = { ...sessionHeaders(login), ...scope };
    const note: Schema["Note"] = await (
      await request("/notes/ws_other_private", "GET", undefined, blair)
    ).json();
    expect(note.versionId).toBe("ws_other_private_v1");
    expect(
      (await request("/vault/vault_alex_demo", "GET", undefined, blair)).status,
    ).toBe(404);
  });
});
