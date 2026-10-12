import { describe, expect, it } from "vitest";

import type { AskOutcome, Citation } from "@omnidoc/contracts";
import type { AskSseParseResult } from "./ask-sse";
import {
  collectCitations,
  failureFromResponse,
  initialAskSessionState,
  isAskBusy,
  isAskTerminal,
  reduceAskSession,
  type AskSessionEvent,
  type AskSessionState,
} from "./ask-stream";

/**
 * Answer-stream state-machine tests.
 *
 * Every screen state the UI must keep apart is produced here: the five success
 * outcomes, both terminal-class errors, a malformed frame, a stop, and each
 * pre-stream failure class — with the S-03 outcome/transport vocabulary.
 */

function citation(overrides: Partial<Citation> = {}): Citation {
  return {
    noteId: "ws_mine_launch",
    versionId: "ws_mine_launch_v1",
    chunkId: "ws_mine_launch_chunk1",
    anchor: { startOffset: 0, endOffset: 51 },
    preview: "The launch review is on Tuesday.",
    ...overrides,
  };
}

const claim = (
  text: string,
  citations: Citation[] = [citation()],
): AskSseParseResult => ({
  type: "event",
  event: { event: "claim", data: { text, citations } },
});

function run(
  events: AskSessionEvent[],
  start: AskSessionState = initialAskSessionState(),
): AskSessionState {
  return events.reduce(reduceAskSession, start);
}

const submit = (question = "When is the launch review?"): AskSessionEvent => ({
  type: "submit",
  question,
});

describe("reduceAskSession", () => {
  it("starts idle and moves to starting on submit", () => {
    expect(initialAskSessionState().status).toBe("idle");
    const state = run([submit()]);
    expect(state.status).toBe("starting");
    expect(state.question).toBe("When is the launch review?");
    expect(state.claims).toEqual([]);
    expect(state.answer).toBeNull();
  });

  it("announces generating, then streams appended claims, then completes", () => {
    let state = run([submit()]);
    state = reduceAskSession(state, {
      type: "frame",
      result: { type: "event", event: { event: "generating", data: {} } },
    });
    expect(state.status).toBe("generating");

    state = reduceAskSession(state, { type: "frame", result: claim("One.") });
    expect(state.status).toBe("streaming");
    expect(state.claims).toHaveLength(1);

    state = reduceAskSession(state, { type: "frame", result: claim("Two.") });
    expect(state.claims).toHaveLength(2);

    state = reduceAskSession(state, {
      type: "frame",
      result: {
        type: "event",
        event: {
          event: "completed",
          data: { outcome: "supported", text: "One. Two.", citations: [citation()] },
        },
      },
    });
    expect(state.status).toBe("completed");
    // Claims are kept, and the final answer is the server's.
    expect(state.claims).toHaveLength(2);
    expect(state.answer).toMatchObject({ outcome: "supported" });
    expect(state.failure).toBeNull();
  });

  it("renders every success outcome as success, never a failure", () => {
    for (const outcome of [
      "supported",
      "partial",
      "no_supported_answer",
      "conflict",
      "refused_policy",
    ] as AskOutcome[]) {
      const state = run([
        submit(),
        {
          type: "frame",
          result: {
            type: "event",
            event: {
              event: "completed",
              data: { outcome, text: "…", citations: [] },
            },
          },
        },
      ]);
      expect(state.status).toBe("completed");
      expect(state.failure).toBeNull();
      expect(state.answer?.outcome).toBe(outcome);
    }
  });

  it("keeps truncated distinct from error and from a success outcome", () => {
    const truncated = run([
      submit(),
      {
        type: "frame",
        result: {
          type: "event",
          event: {
            event: "truncated",
            data: { code: "timeout", detail: "Stream ended early." },
          },
        },
      },
    ]);
    expect(truncated.status).toBe("failed");
    expect(truncated.failure).toEqual({
      class: "truncated",
      detail: "Stream ended early.",
    });
    expect(truncated.answer).toBeNull();
  });

  it("maps a quota error to quota_exhausted with its mode", () => {
    const state = run([
      submit(),
      {
        type: "frame",
        result: {
          type: "event",
          event: {
            event: "error",
            data: {
              code: "quota_exhausted",
              detail: "Operator free-tier quota exhausted.",
              mode: "operator_free_tier",
            },
          },
        },
      },
    ]);
    expect(state.failure).toEqual({
      class: "quota_exhausted",
      detail: "Operator free-tier quota exhausted.",
      mode: "operator_free_tier",
    });
  });

  it("maps a mode_forbidden error and a generic error to different classes", () => {
    const forbidden = run([
      submit(),
      {
        type: "frame",
        result: {
          type: "event",
          event: {
            event: "error",
            data: { code: "mode_forbidden", detail: "dark" },
          },
        },
      },
    ]);
    expect(forbidden.failure?.class).toBe("mode_forbidden");

    const generic = run([
      submit(),
      {
        type: "frame",
        result: {
          type: "event",
          event: { event: "error", data: { code: "unavailable", detail: "down" } },
        },
      },
    ]);
    expect(generic.failure?.class).toBe("stream_error");
  });

  it("treats a malformed frame as an honest failure", () => {
    const state = run([
      submit(),
      { type: "frame", result: { type: "malformed", detail: "bad record" } },
    ]);
    expect(state.status).toBe("failed");
    expect(state.failure).toEqual({ class: "malformed", detail: "bad record" });
  });

  it("stops after exactly one terminal event", () => {
    const base: AskSseParseResult = {
      type: "event",
      event: {
        event: "completed",
        data: { outcome: "no_supported_answer", text: "No.", citations: [] },
      },
    };
    let state = run([submit(), { type: "frame", result: base }]);
    const completed = state;

    // A stray truncated after completed must not resurrect a failure.
    state = reduceAskSession(state, {
      type: "frame",
      result: {
        type: "event",
        event: { event: "truncated", data: { code: "timeout", detail: "x" } },
      },
    });
    expect(state).toBe(completed);

    // A late claim must not append either.
    state = reduceAskSession(state, { type: "frame", result: claim("late") });
    expect(state).toBe(completed);
  });

  it("stops the stream on cancel without producing a completed outcome", () => {
    let state = run([submit(), { type: "frame", result: claim("Partial.") }]);
    state = reduceAskSession(state, { type: "stop" });
    expect(state.status).toBe("stopped");
    expect(state.answer).toBeNull();
    expect(state.claims).toHaveLength(1);

    // Stop is a no-op once terminal.
    expect(reduceAskSession(state, { type: "stop" })).toBe(state);
  });

  it("ignores stop when nothing is in flight", () => {
    const idle = initialAskSessionState();
    expect(reduceAskSession(idle, { type: "stop" })).toBe(idle);
  });

  it("applies a transport failure only while a request is live", () => {
    const failed = run([
      submit(),
      { type: "transport_failure", failure: { class: "denied" } },
    ]);
    expect(failed.status).toBe("failed");
    expect(failed.failure?.class).toBe("denied");

    const completed = run([
      submit(),
      {
        type: "frame",
        result: {
          type: "event",
          event: {
            event: "completed",
            data: { outcome: "supported", text: "x", citations: [] },
          },
        },
      },
    ]);
    // A late transport error cannot replace a finished answer.
    const after = reduceAskSession(completed, {
      type: "transport_failure",
      failure: { class: "unavailable" },
    });
    expect(after).toBe(completed);
  });

  it("resets to idle", () => {
    const state = run([submit(), { type: "reset" }]);
    expect(state).toEqual(initialAskSessionState());
  });

  it("classifies busy and terminal statuses", () => {
    expect(isAskBusy("idle")).toBe(false);
    expect(isAskBusy("starting")).toBe(true);
    expect(isAskBusy("generating")).toBe(true);
    expect(isAskBusy("streaming")).toBe(true);
    expect(isAskBusy("completed")).toBe(false);

    expect(isAskTerminal("completed")).toBe(true);
    expect(isAskTerminal("stopped")).toBe(true);
    expect(isAskTerminal("failed")).toBe(true);
    expect(isAskTerminal("streaming")).toBe(false);
  });
});

describe("failureFromResponse", () => {
  it("keeps denied / validation / unavailable / mode_forbidden distinct", () => {
    expect(failureFromResponse(403, { code: "forbidden", detail: "no" })).toEqual({
      class: "denied",
    });
    expect(failureFromResponse(400, { code: "validation", detail: "bad" })).toEqual({
      class: "validation",
      detail: "bad",
    });
    expect(failureFromResponse(503, {})).toEqual({ class: "unavailable" });
    expect(
      failureFromResponse(403, {
        code: "mode_forbidden",
        detail: "gated",
        mode: "customer_key",
      }),
    ).toEqual({ class: "mode_forbidden", mode: "customer_key" });
  });

  it("drops the server detail on a generic denial so it cannot leak existence", () => {
    const failure = failureFromResponse(403, {
      code: "forbidden",
      detail: "Workspace ws_other does not exist.",
    });
    expect(failure.class).toBe("denied");
    expect(failure).not.toHaveProperty("detail");
  });

  it("keeps quota and session classes distinct", () => {
    expect(
      failureFromResponse(429, {
        code: "quota_exhausted",
        detail: "spent",
        mode: "operator_free_tier",
      }),
    ).toEqual({ class: "quota_exhausted", mode: "operator_free_tier" });
    expect(failureFromResponse(401, { code: "unauthenticated", detail: "x" })).toEqual(
      { class: "unauthenticated" },
    );
  });
});

describe("collectCitations", () => {
  it("prefers the final answer's citations once completed", () => {
    const state = run([
      submit(),
      { type: "frame", result: claim("a", [citation({ chunkId: "old" })]) },
      {
        type: "frame",
        result: {
          type: "event",
          event: {
            event: "completed",
            data: {
              outcome: "supported",
              text: "a",
              citations: [citation({ chunkId: "final" })],
            },
          },
        },
      },
    ]);
    expect(collectCitations(state).map((c) => c.chunkId)).toEqual(["final"]);
  });

  it("collapses exact duplicates but never merges different notes", () => {
    const state = run([
      submit(),
      { type: "frame", result: claim("a", [citation()]) },
      {
        type: "frame",
        result: claim("b", [
          citation(),
          citation({ noteId: "ws_mine_conflict", chunkId: "ws_mine_conflict_chunk1" }),
        ]),
      },
    ]);

    const citations = collectCitations(state);
    expect(citations).toHaveLength(2);
    expect(citations.map((c) => c.noteId)).toEqual([
      "ws_mine_launch",
      "ws_mine_conflict",
    ]);
  });
});
