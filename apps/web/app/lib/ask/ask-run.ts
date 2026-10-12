/**
 * Ask route data path — the Next proxy's decision logic, framework-free.
 *
 * The browser cannot reach the Java API (its origin and the session cookies are
 * server-only), so `/ask` streams through a small Next route handler that this
 * module implements. Keeping the decision here — not in the handler — means the
 * whole thing is testable with an injected port and no `next/headers`:
 *
 * 1. **Parse the request.** Only contract fields are read (`question`, and the
 *    optional `corpusOwnership`), plus the workspace **selector** the page
 *    passed. An empty question is a validation failure, not an API call.
 * 2. **Resolve the workspace server-side.** A selector is honoured only if the
 *    session is a member — `architecture.md` §2: the id *selects*, it does not
 *    *authorize*. A selector the session is not a member of is a **generic
 *    denial** (`denied`), never a hint about which workspaces exist.
 * 3. **Open the stream.** A pre-stream failure is returned as the contract's
 *    JSON `ErrorBody` at the class's HTTP status; a started stream is piped back
 *    as SSE, frame by frame.
 *
 * Two behaviours the proxy owns and a naive pass-through would get wrong:
 *
 * - **Exactly one terminal frame.** The proxy stops after `completed` /
 *   `truncated` / `error`, so a misbehaving upstream cannot emit two terminals.
 * - **Validated frames only.** A record the parser could not trust is replaced
 *   by an honest terminal `error` — the browser never has to guess at a
 *   half-record.
 */
import type { components } from "@omnidoc/contracts";
import type { AskFailureClass } from "@omnidoc/ui";
import type { ApiJar } from "../api/transport";
import type { Workspace } from "../identity/identity-api";
import { resolveWorkspaceSelection } from "../identity/workspace-selection";
import {
  askNotes,
  type AskFrameSource,
  type AskPort,
  type AskPortOutcome,
  type AskPortRequest,
} from "./ask-api";
import {
  isTerminalAskEvent,
  serializeAskSseEvent,
  serializeAskSseMalformed,
} from "./ask-sse";
import type { AskFailure } from "./ask-stream";

type CorpusOwnership = components["schemas"]["CorpusOwnership"];
type ErrorBody = components["schemas"]["ErrorBody"];

/** What the route handler can learn about the session, server-side. */
export type AskSessionInput =
  | { status: "unauthenticated" }
  | { status: "unavailable" }
  | {
      status: "resolved";
      workspaces: readonly Workspace[];
      /** The workspace the user last chose — a preference, not a grant. */
      preference?: string;
    };

export type HandleAskInput = {
  session: AskSessionInput;
  jar: ApiJar;
  /** The raw parsed request body from the browser. Validated here. */
  body: unknown;
  port?: AskPort;
  signal?: AbortSignal;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type ParsedAskBody =
  | {
      ok: true;
      question: string;
      corpusOwnership?: CorpusOwnership;
      workspaceSelector?: string;
    }
  | { ok: false; failure: AskFailure };

/** Read the request body. Only contract fields are honoured. */
export function parseAskBody(body: unknown): ParsedAskBody {
  if (!isObject(body)) {
    return { ok: false, failure: { class: "validation" } };
  }
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (question.length === 0) {
    return { ok: false, failure: { class: "validation" } };
  }

  const rawCorpus = body.corpusOwnership;
  let corpusOwnership: CorpusOwnership | undefined;
  if (rawCorpus === undefined || rawCorpus === null) {
    corpusOwnership = undefined;
  } else if (rawCorpus === "sample" || rawCorpus === "mine") {
    corpusOwnership = rawCorpus;
  } else {
    // A corpus value the contract does not define must not reach the API.
    return { ok: false, failure: { class: "validation" } };
  }

  const rawSelector = body.workspaceId;
  const workspaceSelector =
    typeof rawSelector === "string" && rawSelector.length > 0
      ? rawSelector
      : undefined;

  return {
    ok: true,
    question,
    ...(corpusOwnership ? { corpusOwnership } : {}),
    ...(workspaceSelector ? { workspaceSelector } : {}),
  };
}

type AskTarget =
  | { status: "ready"; workspaceId: string }
  | { status: "failure"; failure: AskFailure };

/**
 * Resolve the workspace the stream runs against.
 *
 * A selector that is not in the session's server-resolved membership list is a
 * generic denial: the response must not distinguish "not yours" from "does not
 * exist" (`architecture.md` §2).
 */
export function resolveAskTarget(
  session: AskSessionInput,
  selector: string | undefined,
): AskTarget {
  if (session.status === "unauthenticated") {
    return { status: "failure", failure: { class: "unauthenticated" } };
  }
  if (session.status !== "resolved") {
    return { status: "failure", failure: { class: "unavailable" } };
  }
  if (selector !== undefined) {
    if (!session.workspaces.some((workspace) => workspace.id === selector)) {
      return { status: "failure", failure: { class: "denied" } };
    }
    return { status: "ready", workspaceId: selector };
  }
  const selection = resolveWorkspaceSelection(session.workspaces, session.preference);
  if (!selection.currentWorkspaceId) {
    // No membership at all: there is nothing to ask, and that is not a denial.
    return { status: "failure", failure: { class: "unavailable" } };
  }
  return { status: "ready", workspaceId: selection.currentWorkspaceId };
}

/** The HTTP status each failure class is returned with. */
const FAILURE_STATUS: Record<AskFailureClass, number> = {
  validation: 400,
  unauthenticated: 401,
  denied: 403,
  mode_forbidden: 403,
  quota_exhausted: 429,
  unavailable: 503,
  truncated: 503,
  stream_error: 503,
  malformed: 503,
};

/** The `ErrorCode` each failure class is returned with. */
const FAILURE_CODE: Record<AskFailureClass, ErrorBody["code"]> = {
  validation: "validation",
  unauthenticated: "unauthenticated",
  denied: "forbidden",
  mode_forbidden: "mode_forbidden",
  quota_exhausted: "quota_exhausted",
  unavailable: "unavailable",
  truncated: "timeout",
  stream_error: "unavailable",
  malformed: "unavailable",
};

const FAILURE_DETAIL: Record<AskFailureClass, string> = {
  validation: "The question must be a nonempty string.",
  unauthenticated: "The session is not authenticated.",
  denied: "The workspace is not available.",
  mode_forbidden: "The requested runtime mode is not available.",
  quota_exhausted: "The answer quota is exhausted.",
  unavailable: "The answer service is unavailable.",
  truncated: "The answer stream ended before a complete answer.",
  stream_error: "The answer stream failed.",
  malformed: "A frame in the answer stream could not be read.",
};

/** Serialize a failure as the contract's pre-stream `ErrorBody` response. */
export function failureResponse(failure: AskFailure): Response {
  const body: ErrorBody = {
    code: FAILURE_CODE[failure.class],
    detail: failure.detail?.trim() || FAILURE_DETAIL[failure.class],
  };
  if (failure.mode) {
    body.mode = failure.mode as ErrorBody["mode"];
  }
  return Response.json(body, { status: FAILURE_STATUS[failure.class] });
}

const ASK_SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  // No buffering: the point of the stream is that frames arrive as they are made.
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
};

/**
 * Pipe parsed frames back to the browser as SSE.
 *
 * Stops after the first terminal event, and turns an unreadable frame into a
 * terminal `error` rather than forwarding a record the client cannot trust.
 */
export function askSseResponse(
  frames: AskFrameSource,
  signal?: AbortSignal,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const result of frames) {
          if (signal?.aborted) {
            break;
          }
          if (result.type === "malformed") {
            controller.enqueue(encoder.encode(serializeAskSseMalformed(result.detail)));
            break;
          }
          controller.enqueue(encoder.encode(serializeAskSseEvent(result.event)));
          if (isTerminalAskEvent(result.event.event)) {
            break;
          }
        }
      } catch {
        // The upstream ended unpredictably or the browser stopped the request.
        // Nothing to report: the client either cancelled or will see the cut.
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed by cancel() */
        }
      }
    },
    cancel() {
      // The browser closed the response (Stop). The abort reaches the upstream
      // fetch through the forwarded signal; no work is needed here.
    },
  });

  return new Response(stream, { status: 200, headers: ASK_SSE_HEADERS });
}

/**
 * Open one Ask stream for a resolved workspace.
 *
 * A blank question never reaches the port (the contract requires `minLength: 1`),
 * so a stray empty submit cannot spend a request.
 */
export async function runAsk(
  workspaceId: string,
  jar: ApiJar,
  request: AskPortRequest,
  port: AskPort = askNotes,
  options: { signal?: AbortSignal } = {},
): Promise<AskPortOutcome> {
  const question = request.question.trim();
  if (question.length === 0) {
    return { status: "failure", failure: { class: "validation" } };
  }
  const payload: AskPortRequest = { question };
  if (request.corpusOwnership !== undefined) {
    payload.corpusOwnership = request.corpusOwnership;
  }
  return port(payload, jar, workspaceId, options);
}

/**
 * The route handler's whole job, minus `next/headers`.
 *
 * Returns a `Response` in every case: a JSON `ErrorBody` for a pre-stream
 * failure, or a 200 SSE stream.
 */
export async function handleAskRequest(input: HandleAskInput): Promise<Response> {
  const parsed = parseAskBody(input.body);
  if (!parsed.ok) {
    return failureResponse(parsed.failure);
  }

  const target = resolveAskTarget(input.session, parsed.workspaceSelector);
  if (target.status === "failure") {
    return failureResponse(target.failure);
  }

  const outcome = await runAsk(
    target.workspaceId,
    input.jar,
    {
      question: parsed.question,
      ...(parsed.corpusOwnership
        ? { corpusOwnership: parsed.corpusOwnership }
        : {}),
    },
    input.port ?? askNotes,
    { signal: input.signal },
  );

  if (outcome.status === "failure") {
    return failureResponse(outcome.failure);
  }
  return askSseResponse(outcome.frames, input.signal);
}
