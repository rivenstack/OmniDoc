import { http, HttpResponse, type HttpResponseResolver } from "msw";
import type {
  Answer,
  AskOutcome,
  AskSseEvent,
  Citation,
  ErrorBody,
} from "@omnidoc/contracts";
import {
  askQuestions,
  chunks,
  failedJob,
  fixedNow,
  identities,
  jobSteps,
  notes as seedNotes,
  partialJob,
  scenarios,
  searchRankings,
  vaultSeed,
  workspaces,
  type IdentityName,
  type ScenarioName,
  type Schema,
} from "./fixtures";
import {
  body,
  fail,
  MockHttpError,
  object,
  onlyFields,
  requiredString,
  streamResponse,
} from "./http-utils";

export interface MockEnvironmentOptions {
  scenario?: ScenarioName;
  baseUrl?: string;
}
type Session = { id: string; identity: IdentityName; csrf: string };
type VaultEntry = { tenantId: string; metadata: Schema["VaultMetadata"] };

/** One isolated, resettable mock server state per story/test/browser session. */
export function createMockEnvironment(options: MockEnvironmentOptions = {}) {
  const scenarioName = options.scenario ?? "personal";
  const scenario = scenarios[scenarioName];
  const base = (options.baseUrl ?? "http://localhost:8080").replace(/\/$/, "");
  let notes: Schema["Note"][];
  let deleted: Set<string>;
  let sessions: Map<string, Session>;
  let bootstrap: Session | undefined;
  let counter: number;
  let progress: number;
  let vault: VaultEntry[];
  let modes: Map<string, Schema["RuntimeMode"]>;
  let held = false;
  let generation = 0;
  const pending = new Set<() => void>();
  function releaseResponses() {
    held = false;
    for (const release of pending) release();
    pending.clear();
  }
  function reset() {
    generation++;
    releaseResponses();
    notes = structuredClone(seedNotes);
    deleted = new Set();
    sessions = new Map();
    counter = 0;
    progress = 0;
    vault = [{ tenantId: "tenant_alex", metadata: structuredClone(vaultSeed) }];
    modes = new Map();
    bootstrap = scenario.identity
      ? {
          id: `mock_session_${scenario.identity}`,
          identity: scenario.identity,
          csrf: `mock_csrf_${scenario.identity}`,
        }
      : undefined;
    if (bootstrap) sessions.set(bootstrap.id, bootstrap);
    held = scenarioName === "loading";
  }
  reset();
  function nextId(kind: string) {
    return `s03_${kind}_${++counter}`;
  }
  function session(cookies: Record<string, string | undefined>): Session {
    // Only the explicitly selected preauthenticated scenario can bootstrap.
    // An invalid supplied cookie never falls back to that scenario identity.
    const current =
      cookies.JSESSIONID !== undefined
        ? sessions.get(cookies.JSESSIONID)
        : bootstrap;
    if (!current) fail(401, "unauthenticated", "Sign in to continue.");
    return current;
  }
  function csrf(
    request: Request,
    cookies: Record<string, string | undefined>,
    current: Session,
  ) {
    if (
      request.headers.get("X-XSRF-TOKEN") !== current.csrf ||
      cookies["XSRF-TOKEN"] !== current.csrf
    )
      fail(403, "forbidden", "CSRF token mismatch.");
  }
  function workspace(current: Session, id: string | null) {
    const found = workspaces.find((w) => w.id === id);
    if (!found || !identities[current.identity].workspaceIds.includes(found.id))
      fail(403, "forbidden", "Workspace membership is required.");
    return found;
  }
  function writable(current: Session) {
    if (identities[current.identity].readOnly)
      fail(403, "forbidden", "The sample workspace is read-only.");
  }
  function bind(
    request: Request,
    cookies: Record<string, string | undefined>,
    mutate = false,
  ) {
    const current = session(cookies);
    if (request.method !== "GET") csrf(request, cookies, current);
    const scope = workspace(
      current,
      request.headers.get("OmniDoc-Workspace-Id"),
    );
    if (mutate) writable(current);
    return { current, scope };
  }
  function resolveNote(
    request: Request,
    current: Session,
    id: string,
    tombstone = false,
  ) {
    const selector = request.headers.get("OmniDoc-Workspace-Id");
    if (selector !== null) workspace(current, selector);
    const note = notes.find((n) => n.id === id);
    if (!note) fail(404, "not_found", "Note not found.");
    workspace(current, note.workspaceId);
    if (selector !== null && note.workspaceId !== selector)
      fail(403, "forbidden", "Note is outside the selected workspace.");
    if (!tombstone && deleted.has(id))
      fail(404, "not_found", "Note not found.");
    return note;
  }
  function cookieHeaders(current: Session, clear = false) {
    const headers = new Headers();
    const tail = clear ? "; Max-Age=0" : "";
    headers.append(
      "Set-Cookie",
      `JSESSIONID=${clear ? "" : current.id}; Path=/; HttpOnly; SameSite=Lax${tail}`,
    );
    headers.append(
      "Set-Cookie",
      `XSRF-TOKEN=${clear ? "" : current.csrf}; Path=/; SameSite=Lax${tail}`,
    );
    return headers;
  }
  const guarded =
    (resolver: HttpResponseResolver): HttpResponseResolver =>
    async (info) => {
      const startedIn = generation;
      if (held)
        await new Promise<void>((resolve) => {
          const release = () => {
            pending.delete(release);
            info.request.signal.removeEventListener("abort", release);
            resolve();
          };
          pending.add(release);
          info.request.signal.addEventListener("abort", release, {
            once: true,
          });
          if (info.request.signal.aborted) release();
        });
      if (info.request.signal.aborted || startedIn !== generation)
        return HttpResponse.error();
      try {
        return await resolver(info);
      } catch (error) {
        if (error instanceof MockHttpError)
          return HttpResponse.json(error.body, { status: error.status });
        throw error;
      }
    };
  function ownership(value: unknown): Schema["CorpusOwnership"] | undefined {
    if (value !== undefined && value !== "mine" && value !== "sample")
      fail(400, "validation", "Invalid corpus ownership.");
    return value;
  }
  function runtimeMode(value: unknown): Schema["RuntimeMode"] {
    if (
      value !== "mock" &&
      value !== "operator_free_tier" &&
      value !== "customer_key"
    )
      fail(400, "validation", "Invalid runtime mode.");
    return value;
  }
  function feature(value: unknown): Schema["RuntimeFeature"] {
    if (value !== "ask" && value !== "embed")
      fail(400, "validation", "Invalid runtime feature.");
    return value;
  }
  function resolvedMode(workspaceId: string, target: Schema["RuntimeFeature"]) {
    return modes.get(`${workspaceId}:${target}`) ?? scenario.mode;
  }
  function checkMode(scope: Schema["Workspace"], mode: Schema["RuntimeMode"]) {
    if (mode !== "mock" && scenario.mode !== mode)
      fail(
        403,
        "mode_forbidden",
        "This scenario only allows mock mode or its explicitly simulated mode.",
      );
    if (
      mode === "customer_key" &&
      !vault.some(
        (v) => v.tenantId === scope.tenantId && v.metadata.status === "active",
      )
    )
      fail(
        403,
        "mode_forbidden",
        "An active simulated customer credential is required.",
      );
  }
  function transportFailure(mode: Schema["RuntimeMode"], ask: boolean) {
    const code =
      scenarioName === "timeout"
        ? "timeout"
        : scenarioName === "unavailable"
          ? "unavailable"
          : ask &&
              mode !== "mock" &&
              (scenarioName === "operator_quota" ||
                scenarioName === "customer_quota")
            ? "quota_exhausted"
            : undefined;
    if (!code) return;
    const error: ErrorBody = {
      code,
      detail: `Simulated ${code}.`,
      ...(code === "quota_exhausted" ? { mode } : {}),
    };
    return HttpResponse.json(error, {
      status: code === "timeout" ? 504 : code === "unavailable" ? 503 : 429,
    });
  }
  function availableNotes(
    workspaceId: string,
    corpusOwnership?: Schema["CorpusOwnership"],
  ) {
    return notes.filter(
      (n) =>
        n.workspaceId === workspaceId &&
        !deleted.has(n.id) &&
        (!corpusOwnership || n.corpusOwnership === corpusOwnership),
    );
  }
  function citation(note: Schema["Note"]): Citation | undefined {
    const chunk = chunks.find(
      (c) => c.noteId === note.id && c.versionId === note.versionId,
    );
    if (!chunk) return;
    return {
      noteId: note.id,
      versionId: note.versionId,
      chunkId: chunk.chunkId,
      anchor: { ...chunk.anchor },
      preview: chunk.text,
      updatedAt: note.updatedAt,
      corpusOwnership: note.corpusOwnership,
    };
  }
  function answerFor(
    question: string,
    workspaceId: string,
    corpusOwnership?: Schema["CorpusOwnership"],
  ): Answer {
    const outcome =
      (Object.keys(askQuestions) as AskOutcome[]).find(
        (key) => askQuestions[key] === question.trim(),
      ) ?? "no_supported_answer";
    const visible = availableNotes(workspaceId, corpusOwnership);
    const launch = visible.find((n) => n.id === `${workspaceId}_launch`);
    const competing = visible.find((n) => n.id === `${workspaceId}_conflict`);
    const first = launch && citation(launch);
    const second = competing && citation(competing);
    if (outcome === "refused_policy")
      return {
        outcome,
        text: "I cannot disclose another workspace’s private notes.",
        citations: [],
      };
    if (
      outcome === "no_supported_answer" ||
      !first ||
      (outcome === "conflict" && !second)
    )
      return {
        outcome: "no_supported_answer",
        text: "These notes do not support an answer. Add a relevant source or change the question.",
        citations: [],
      };
    if (outcome === "conflict" && second)
      return {
        outcome,
        text: "The checklist says Tuesday; the competing draft says Thursday. The sources disagree.",
        citations: [first, second],
      };
    if (outcome === "partial")
      return {
        outcome,
        text: "The launch review is on Tuesday. Unsupported: the notes do not establish an approved budget.",
        citations: [first],
      };
    return {
      outcome: "supported",
      text: "The launch review is on Tuesday. Alex owns the checklist.",
      citations: [first],
    };
  }

  const handlers = [
    http.post(
      `${base}/api/v1/session`,
      guarded(async ({ request, cookies }) => {
        const input = await body(request);
        onlyFields(input, ["email", "password"]);
        const identity = (Object.keys(identities) as IdentityName[]).find(
          (key) =>
            identities[key].email === input.email &&
            identities[key].password === input.password,
        );
        if (!identity)
          fail(401, "unauthenticated", "Invalid demo credentials.");
        const old = cookies.JSESSIONID ?? bootstrap?.id;
        if (old) sessions.delete(old);
        bootstrap = undefined;
        const id = nextId("session");
        const current = { id, identity, csrf: `${id}_csrf` };
        sessions.set(id, current);
        return HttpResponse.json<Schema["Principal"]>(
          { actorId: identities[identity].actorId },
          { headers: cookieHeaders(current) },
        );
      }),
    ),
    http.get(
      `${base}/api/v1/session`,
      guarded(({ cookies }) => {
        const current = session(cookies);
        return HttpResponse.json<Schema["Principal"]>(
          { actorId: identities[current.identity].actorId },
          { headers: cookieHeaders(current) },
        );
      }),
    ),
    http.delete(
      `${base}/api/v1/session`,
      guarded(({ request, cookies }) => {
        const current = session(cookies);
        csrf(request, cookies, current);
        sessions.delete(current.id);
        if (bootstrap?.id === current.id) bootstrap = undefined;
        return new HttpResponse(null, {
          status: 204,
          headers: cookieHeaders(current, true),
        });
      }),
    ),
    http.get(
      `${base}/api/v1/workspaces`,
      guarded(({ cookies }) => {
        const current = session(cookies);
        return HttpResponse.json<Schema["WorkspaceList"]>({
          workspaces: workspaces.filter((w) =>
            identities[current.identity].workspaceIds.includes(w.id),
          ),
        });
      }),
    ),
    http.get(
      `${base}/api/v1/workspaces/:workspaceId/notes`,
      guarded(({ request, cookies, params }) => {
        const current = session(cookies);
        const scope = workspace(current, String(params.workspaceId));
        const query = new URL(request.url).searchParams;
        const limit = Number(query.get("limit") ?? 20);
        if (!Number.isInteger(limit) || limit < 1 || limit > 100)
          fail(400, "validation", "Limit must be between 1 and 100.");
        const sorted = availableNotes(scope.id).sort(
          (a, b) =>
            b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id),
        );
        let start = 0;
        const cursor = query.get("cursor");
        if (cursor !== null) {
          try {
            const decoded: unknown = JSON.parse(atob(cursor));
            if (
              !Array.isArray(decoded) ||
              decoded.length !== 3 ||
              decoded[0] !== scope.id
            )
              throw new Error();
            const index = sorted.findIndex(
              (n) => n.updatedAt === decoded[1] && n.id === decoded[2],
            );
            if (index < 0) throw new Error();
            start = index + 1;
          } catch {
            fail(400, "validation", "Invalid cursor for this workspace.");
          }
        }
        const items = sorted.slice(start, start + limit);
        const last = items.at(-1);
        return HttpResponse.json<Schema["NotePage"]>({
          items,
          nextCursor:
            last && start + limit < sorted.length
              ? btoa(JSON.stringify([scope.id, last.updatedAt, last.id]))
              : null,
        });
      }),
    ),
    http.post(
      `${base}/api/v1/workspaces/:workspaceId/notes`,
      guarded(async ({ request, cookies, params }) => {
        const current = session(cookies);
        csrf(request, cookies, current);
        const scope = workspace(current, String(params.workspaceId));
        writable(current);
        const input = await body(request);
        onlyFields(input, ["title", "bodyJson", "corpusOwnership"]);
        if (typeof input.title !== "string" || !object(input.bodyJson))
          fail(400, "validation", "Title and an object bodyJson are required.");
        const note: Schema["Note"] = {
          id: nextId("note"),
          workspaceId: scope.id,
          versionId: nextId("version"),
          title: input.title,
          bodyJson: input.bodyJson,
          updatedAt: fixedNow,
          corpusOwnership: ownership(input.corpusOwnership) ?? "mine",
        };
        notes.push(note);
        return HttpResponse.json(note, { status: 201 });
      }),
    ),
    http.get(
      `${base}/api/v1/notes/:noteId`,
      guarded(({ request, cookies, params }) =>
        HttpResponse.json(
          resolveNote(request, session(cookies), String(params.noteId)),
        ),
      ),
    ),
    http.patch(
      `${base}/api/v1/notes/:noteId`,
      guarded(async ({ request, cookies, params }) => {
        const current = session(cookies);
        csrf(request, cookies, current);
        writable(current);
        const note = resolveNote(request, current, String(params.noteId));
        const input = await body(request);
        onlyFields(input, ["title", "bodyJson", "expectedVersion"]);
        if (typeof input.title !== "string" || !object(input.bodyJson))
          fail(400, "validation", "Title and an object bodyJson are required.");
        requiredString(input.expectedVersion);
        if (input.expectedVersion !== note.versionId)
          fail(409, "conflict", "The note version has changed.");
        Object.assign(note, {
          title: input.title,
          bodyJson: input.bodyJson,
          versionId: nextId("version"),
          updatedAt: fixedNow,
        });
        return HttpResponse.json(note);
      }),
    ),
    ...(["soft-delete", "purge"] as const).map((action) =>
      http.post(
        `${base}/api/v1/notes/:noteId/${action}`,
        guarded(({ request, cookies, params }) => {
          const current = session(cookies);
          csrf(request, cookies, current);
          writable(current);
          const note = resolveNote(
            request,
            current,
            String(params.noteId),
            action === "purge",
          );
          if (action === "purge") {
            notes = notes.filter((n) => n.id !== note.id);
            deleted.delete(note.id);
          } else deleted.add(note.id);
          return new HttpResponse(null, { status: 204 });
        }),
      ),
    ),
    ...(["lexical", "hybrid"] as const).map((kind) =>
      http.post(
        `${base}/api/v1/search/${kind}`,
        guarded(async ({ request, cookies }) => {
          const { scope } = bind(request, cookies);
          const input = await body(request);
          onlyFields(input, ["query", "topK", "filters", "corpusOwnership"]);
          const query = requiredString(input.query).trim().toLowerCase();
          const topK = input.topK ?? 10;
          if (
            typeof topK !== "number" ||
            !Number.isInteger(topK) ||
            topK < 1 ||
            topK > 100
          )
            fail(400, "validation", "Invalid topK.");
          const filter = ownership(input.corpusOwnership);
          if (
            input.filters !== undefined &&
            (!object(input.filters) ||
              Object.values(input.filters).some((v) => typeof v !== "string"))
          )
            fail(400, "validation", "Filters must contain strings.");
          const failure = transportFailure(
            resolvedMode(scope.id, "ask"),
            false,
          );
          if (failure) return failure;
          // Unknown filters fail closed with no hits; mock-supported filter: noteId.
          const filters = input.filters as Record<string, string> | undefined;
          const visible = availableNotes(scope.id, filter).filter(
            (n) =>
              !filters ||
              Object.entries(filters).every(
                ([key, value]) => key === "noteId" && n.id === value,
              ),
          );
          const ranked = searchRankings[query] ?? [];
          const hits = ranked
            .flatMap((key, i) => {
              const note = visible.find((n) => n.id === `${scope.id}_${key}`);
              if (!note) return [];
              const source = citation(note);
              if (!source) return [];
              return [
                {
                  chunkId: source.chunkId,
                  noteId: note.id,
                  versionId: note.versionId,
                  score: 1 - i / 10,
                  snippet: source.preview,
                  corpusOwnership: note.corpusOwnership,
                },
              ];
            })
            .slice(0, topK);
          return HttpResponse.json<Schema["SearchResults"]>({
            hits,
            degraded: false,
          });
        }),
      ),
    ),
    http.post(
      `${base}/api/v1/ask`,
      guarded(async ({ request, cookies }) => {
        const { scope } = bind(request, cookies);
        const input = await body(request);
        onlyFields(input, ["question", "locale", "mode", "corpusOwnership"]);
        const question = requiredString(input.question);
        if (input.locale !== undefined) requiredString(input.locale);
        const selected = resolvedMode(scope.id, "ask");
        const mode =
          input.mode === undefined ? selected : runtimeMode(input.mode);
        if (mode !== selected)
          fail(
            403,
            "mode_forbidden",
            "Switch runtime mode explicitly before asking.",
          );
        checkMode(scope, mode);
        const filter = ownership(input.corpusOwnership);
        const failure = transportFailure(mode, true);
        if (failure) return failure;
        const answer = answerFor(question, scope.id, filter);
        const events: AskSseEvent[] = [{ event: "generating", data: {} }];
        if (answer.citations.length)
          events.push({
            event: "claim",
            data: { text: answer.text, citations: answer.citations },
          });
        if (scenarioName === "truncated")
          events.push({
            event: "truncated",
            data: {
              code: "timeout",
              detail: "The simulated stream ended early.",
            },
          });
        else if (scenarioName === "stream_error" && mode !== "mock")
          events.push({
            event: "error",
            data: {
              code: "quota_exhausted",
              detail: "Simulated quota exhausted after stream opened.",
              mode,
            },
          });
        else events.push({ event: "completed", data: answer });
        return streamResponse(events, request.signal);
      }),
    ),
    http.get(
      `${base}/api/v1/ingestion-jobs/:jobId`,
      guarded(({ request, cookies, params }) => {
        const { scope } = bind(request, cookies);
        if (scope.id !== "ws_mine" || params.jobId !== jobSteps[0].jobId)
          fail(404, "not_found", "Job not found in this workspace.");
        return HttpResponse.json(
          scenarioName === "indexing_failed"
            ? failedJob
            : scenarioName === "indexing_partial"
              ? partialJob
              : jobSteps[progress],
        );
      }),
    ),
    http.get(
      `${base}/api/v1/vault`,
      guarded(({ request, cookies }) => {
        const { scope } = bind(request, cookies);
        return HttpResponse.json<Schema["VaultMetadataList"]>({
          items: vault
            .filter((v) => v.tenantId === scope.tenantId)
            .map((v) => v.metadata),
        });
      }),
    ),
    http.post(
      `${base}/api/v1/vault`,
      guarded(async ({ request, cookies }) => {
        const { scope } = bind(request, cookies, true);
        const input = await body(request);
        onlyFields(input, ["plaintextKey", "toolChapterId", "label"]);
        requiredString(input.plaintextKey);
        const toolChapterId = requiredString(input.toolChapterId);
        if (input.label !== undefined && typeof input.label !== "string")
          fail(400, "validation", "Label must be a string.");
        // Do not retain, derive a prefix from, or echo submitted credentials.
        const metadata: Schema["VaultMetadata"] = {
          vaultRecordId: nextId("vault"),
          maskedPrefix: "demo-••••",
          toolChapterId,
          ...(input.label === undefined
            ? {}
            : { label: input.label as string }),
          status: "active",
        };
        vault.push({ tenantId: scope.tenantId, metadata });
        return HttpResponse.json(metadata, { status: 201 });
      }),
    ),
    http.get(
      `${base}/api/v1/vault/:vaultRecordId`,
      guarded(({ request, cookies, params }) => {
        const { scope } = bind(request, cookies);
        const found = vault.find(
          (v) =>
            v.tenantId === scope.tenantId &&
            v.metadata.vaultRecordId === params.vaultRecordId,
        );
        if (!found) fail(404, "not_found", "Vault record not found.");
        return HttpResponse.json(found.metadata);
      }),
    ),
    ...(["rotate", "revoke", "verify"] as const).map((action) =>
      http.post(
        `${base}/api/v1/vault/:vaultRecordId/${action}`,
        guarded(async ({ request, cookies, params }) => {
          const { scope } = bind(request, cookies, true);
          const found = vault.find(
            (v) =>
              v.tenantId === scope.tenantId &&
              v.metadata.vaultRecordId === params.vaultRecordId,
          );
          if (!found) fail(404, "not_found", "Vault record not found.");
          if (action === "verify")
            return HttpResponse.json<Schema["VaultVerification"]>({
              verification:
                found.metadata.status === "active" ? "ok" : "invalid",
            });
          if (action === "revoke") {
            found.metadata.status = "revoked";
            return new HttpResponse(null, { status: 204 });
          }
          const input = await body(request);
          onlyFields(input, ["plaintextKey"]);
          requiredString(input.plaintextKey);
          found.metadata.status = "active";
          return HttpResponse.json(found.metadata);
        }),
      ),
    ),
    ...(["usage", "usage/limits"] as const).map((path) =>
      http.get(
        `${base}/api/v1/${path}`,
        guarded(({ request, cookies }) => {
          const { scope } = bind(request, cookies);
          const query = new URL(request.url).searchParams;
          const mode = runtimeMode(
            query.get("mode") ?? resolvedMode(scope.id, "ask"),
          );
          if (mode !== resolvedMode(scope.id, "ask"))
            fail(
              403,
              "forbidden",
              "Usage mode does not match the selected mode.",
            );
          if (scenarioName === "usage_unavailable")
            return HttpResponse.json<Schema["UsageUnavailable"]>({
              status: "unavailable",
              reason: "Simulated usage metadata is unavailable.",
            });
          if (path === "usage/limits")
            return HttpResponse.json<Schema["RemainingLimits"]>({
              status: "available",
              requests: 20,
              tokens: 4000,
            });
          return HttpResponse.json<Schema["UsageSnapshot"]>({
            status: "available",
            inputTokens: 120,
            outputTokens: 45,
            remainingRequests: 20,
          });
        }),
      ),
    ),
    http.get(
      `${base}/api/v1/runtime-mode`,
      guarded(({ request, cookies }) => {
        const { scope } = bind(request, cookies);
        const target = feature(
          new URL(request.url).searchParams.get("feature") ?? "ask",
        );
        return HttpResponse.json<Schema["ResolvedRuntimeMode"]>({
          feature: target,
          mode: resolvedMode(scope.id, target),
        });
      }),
    ),
    http.put(
      `${base}/api/v1/runtime-mode`,
      guarded(async ({ request, cookies }) => {
        const { scope } = bind(request, cookies, true);
        const input = await body(request);
        onlyFields(input, ["requestedMode", "feature"]);
        const mode = runtimeMode(input.requestedMode);
        const target = feature(input.feature);
        if (
          mode === "customer_key" &&
          !vault.some(
            (v) =>
              v.tenantId === scope.tenantId && v.metadata.status === "active",
          )
        )
          fail(
            404,
            "vault_missing",
            "An active simulated customer credential is required.",
          );
        checkMode(scope, mode);
        modes.set(`${scope.id}:${target}`, mode);
        return HttpResponse.json<Schema["ResolvedRuntimeMode"]>({
          mode,
          feature: target,
        });
      }),
    ),
  ];
  return {
    handlers,
    reset,
    releaseResponses,
    advanceProgress() {
      progress = Math.min(progress + 1, jobSteps.length - 1);
    },
    /** Node clients have no cookie jar. Browser clients obtain cookies via GET session. */
    getSessionHeaders(): Record<string, string> {
      if (!bootstrap) return {};
      return {
        Cookie: `JSESSIONID=${bootstrap.id}; XSRF-TOKEN=${bootstrap.csrf}`,
        "X-XSRF-TOKEN": bootstrap.csrf,
      };
    },
  };
}
