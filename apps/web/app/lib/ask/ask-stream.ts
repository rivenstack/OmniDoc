/**
 * Ask answer-stream state machine — pure, no fetch and no React.
 *
 * `docs/api/ask-sse.md` describes one stream with exactly one terminal event,
 * and `architecture.md` §4 splits the world into **success outcomes**
 * (`supported`, `partial`, `no_supported_answer`, `conflict`, `refused_policy`)
 * and a **different class** of transport failures (`truncated`, `error`,
 * pre-stream `ErrorBody`). The product must be able to tell them apart and must
 * never render one as the other.
 *
 * This module is that decision, in one testable place. The client component and
 * the Next proxy both feed it the same events, so what the UI does is a
 * function of the stream, not of which code path happened to run.
 *
 * Rules it enforces:
 *
 * - **Exactly one terminal event.** Frames after a terminal state are ignored, so
 *   a stray `completed` after `truncated` cannot resurrect a failed answer.
 * - **Stop is a client state, never `completed`.** Cancelling yields `stopped`
 *   with whatever partial claims arrived; it is explicitly *not* a finished,
 *   cited answer.
 * - **A malformed frame is an honest failure.** It is never coerced into an
 *   event, because inventing a citation or an outcome is a trust failure.
 */
import type { components } from "@omnidoc/contracts";
import { type Answer, type Citation } from "@omnidoc/contracts";
import type { AskClaimUnit, AskFailureClass } from "@omnidoc/ui";
import { asAskErrorBody, type AskSseParseResult } from "./ask-sse";

export type RuntimeMode = components["schemas"]["RuntimeMode"];

/**
 * A failure the screen renders. The `class` vocabulary is owned by the Ask
 * blocks (`@omnidoc/ui`) so the state machine and the view cannot drift.
 */
export type AskFailure = {
  class: AskFailureClass;
  /** Server detail text. Omitted where showing it would leak existence. */
  detail?: string;
  /** Present for `mode_forbidden` / `quota_exhausted`. */
  mode?: RuntimeMode;
};

export type AskSessionStatus =
  | "idle"
  | "starting"
  | "generating"
  | "streaming"
  | "completed"
  | "stopped"
  | "failed";

export type AskSessionState = {
  status: AskSessionStatus;
  /** The trimmed question this state belongs to. */
  question: string;
  /** Claim units appended so far (streaming preview; kept after a stop). */
  claims: AskClaimUnit[];
  /** The final answer, once `completed`. */
  answer: Answer | null;
  /** The terminal-class or malformed failure, once `failed`. */
  failure: AskFailure | null;
};

export function initialAskSessionState(): AskSessionState {
  return { status: "idle", question: "", claims: [], answer: null, failure: null };
}

/** True while a request is in flight — the composer shows Stop. */
export function isAskBusy(status: AskSessionStatus): boolean {
  return status === "starting" || status === "generating" || status === "streaming";
}

/** True once the stream can never produce another event. */
export function isAskTerminal(status: AskSessionStatus): boolean {
  return status === "completed" || status === "stopped" || status === "failed";
}

/**
 * Map one SSE `error` event's code to the failure the screen shows.
 *
 * `mode_forbidden` and `quota_exhausted` keep their own class so the copy can
 * name the mode (`ui-qa-checklist.md` §9.4); anything else is a generic
 * transport-class stream failure. `truncated` is handled separately — it is its
 * own terminal event, not an `error` code.
 */
function failureFromErrorEvent(code: string): AskFailureClass {
  if (code === "mode_forbidden") {
    return "mode_forbidden";
  }
  if (code === "quota_exhausted") {
    return "quota_exhausted";
  }
  return "stream_error";
}

/**
 * Map an HTTP response (the upstream API, or the Next proxy) onto a failure.
 *
 * Shared by the port and the client so both read a status the same way. The
 * generic-denial rule is a security contract: a `403` becomes `denied` and its
 * server `detail` is dropped, because a message that distinguishes "does not
 * exist" from "not yours" turns the route into an existence oracle
 * (`architecture.md` §2).
 */
export function failureFromResponse(status: number, body: unknown): AskFailure {
  const error = asAskErrorBody(body);
  const mode = error ? asRuntimeMode(error.mode) : undefined;
  const detail = error?.detail;

  if (status === 400) {
    return detail ? { class: "validation", detail } : { class: "validation" };
  }
  if (status === 401) {
    // No detail: a session rejection must not say why or for whom.
    return { class: "unauthenticated" };
  }
  if (status === 403) {
    if (error?.code === "mode_forbidden") {
      return mode
        ? { class: "mode_forbidden", mode }
        : { class: "mode_forbidden" };
    }
    // Generic denial — never the server's own explanation.
    return { class: "denied" };
  }
  if (status === 429) {
    return mode ? { class: "quota_exhausted", mode } : { class: "quota_exhausted" };
  }
  return detail ? { class: "unavailable", detail } : { class: "unavailable" };
}

function asRuntimeMode(value: unknown): RuntimeMode | undefined {
  if (value === "mock" || value === "operator_free_tier" || value === "customer_key") {
    return value;
  }
  return undefined;
}

export type AskSessionEvent =
  | { type: "submit"; question: string }
  /**
   * A failure that happened outside the frame stream — a pre-stream 4xx/5xx from
   * the proxy, a connection that could not be opened, or a body that broke midway.
   * Applied only while a request is live, so a late transport error cannot
   * replace a finished answer.
   */
  | { type: "transport_failure"; failure: AskFailure }
  | { type: "frame"; result: AskSseParseResult }
  | { type: "stop" }
  | { type: "reset" };

function reduceFrame(
  state: AskSessionState,
  result: AskSseParseResult,
): AskSessionState {
  // Frames after a terminal event are not applied: exactly one terminal event
  // ends a stream.
  if (isAskTerminal(state.status)) {
    return state;
  }

  if (result.type === "malformed") {
    return {
      ...state,
      status: "failed",
      failure: { class: "malformed", detail: result.detail },
    };
  }

  const { event } = result;
  switch (event.event) {
    case "generating":
      return state.status === "starting" || state.status === "generating"
        ? { ...state, status: "generating" }
        : state;
    case "claim":
      return {
        ...state,
        status: "streaming",
        claims: [...state.claims, event.data],
      };
    case "completed":
      return { ...state, status: "completed", answer: event.data };
    case "truncated": {
      const mode = asRuntimeMode(event.data.mode);
      return {
        ...state,
        status: "failed",
        failure: {
          class: "truncated",
          detail: event.data.detail,
          ...(mode ? { mode } : {}),
        },
      };
    }
    case "error": {
      const mode = asRuntimeMode(event.data.mode);
      return {
        ...state,
        status: "failed",
        failure: {
          class: failureFromErrorEvent(event.data.code),
          detail: event.data.detail,
          ...(mode ? { mode } : {}),
        },
      };
    }
  }
}

/**
 * Apply one session event. Total: any event from any state yields a state, so
 * the UI can dispatch optimistically and still be correct.
 */
export function reduceAskSession(
  state: AskSessionState,
  event: AskSessionEvent,
): AskSessionState {
  switch (event.type) {
    case "submit":
      return {
        ...initialAskSessionState(),
        status: "starting",
        question: event.question,
      };
    case "transport_failure":
      // Applies while a request is live; a finished answer is not replaced by a
      // late transport error.
      return isAskBusy(state.status)
        ? { ...state, status: "failed", failure: event.failure }
        : state;
    case "stop":
      // Stop only means something while a stream is live. It never produces a
      // `completed` outcome — the partial text is not a finished answer.
      return isAskBusy(state.status) ? { ...state, status: "stopped" } : state;
    case "reset":
      return initialAskSessionState();
    case "frame":
      return reduceFrame(state, event.result);
  }
}

/**
 * The citations to show, in order, from the final answer or the streamed claims.
 *
 * Exact duplicate citations (same note, version, chunk, and offsets) are
 * collapsed; two citations are **never** merged into a different note, and no
 * citation is ever synthesized. The final `Answer.citations` is authoritative
 * once the answer completes.
 */
export function collectCitations(state: AskSessionState): Citation[] {
  const source = state.answer
    ? state.answer.citations
    : state.claims.flatMap((claim) => claim.citations);

  const seen = new Set<string>();
  const citations: Citation[] = [];
  for (const citation of source) {
    const key = `${citation.noteId}\u0000${citation.versionId}\u0000${citation.chunkId}\u0000${citation.anchor.startOffset}\u0000${citation.anchor.endOffset}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    citations.push(citation);
  }
  return citations;
}
