import { describe, expect, it } from "vitest";

import {
  ASK_STREAM_PATH,
  answerStatus,
  askQuestionFromDraft,
  askRequestBody,
  canSubmitAsk,
  citationHref,
} from "./ask-navigation";

describe("askQuestionFromDraft", () => {
  it("trims, and a whitespace draft is nothing", () => {
    expect(askQuestionFromDraft("  When?  ")).toBe("When?");
    expect(askQuestionFromDraft("   ")).toBe("");
  });
});

describe("canSubmitAsk", () => {
  it("allows a real draft only when nothing is in flight", () => {
    expect(canSubmitAsk({ draft: "When?", status: "idle" })).toBe(true);
    expect(canSubmitAsk({ draft: "   ", status: "idle" })).toBe(false);
    for (const status of ["starting", "generating", "streaming"] as const) {
      expect(canSubmitAsk({ draft: "When?", status })).toBe(false);
    }
    // A finished answer can be replaced by a new question.
    expect(canSubmitAsk({ draft: "When?", status: "completed" })).toBe(true);
    expect(canSubmitAsk({ draft: "When?", status: "stopped" })).toBe(true);
    expect(canSubmitAsk({ draft: "When?", status: "failed" })).toBe(true);
  });
});

describe("answerStatus", () => {
  it("maps the session status onto the answer block, idle → nothing", () => {
    expect(answerStatus("idle")).toBeNull();
    expect(answerStatus("starting")).toBe("generating");
    expect(answerStatus("generating")).toBe("generating");
    expect(answerStatus("streaming")).toBe("streaming");
    expect(answerStatus("completed")).toBe("completed");
    expect(answerStatus("stopped")).toBe("stopped");
    expect(answerStatus("failed")).toBe("failed");
  });
});

describe("citationHref", () => {
  it("encodes the note id into the capture route", () => {
    expect(
      citationHref({
        noteId: "ws_mine_launch/chunk 1",
        versionId: "v1",
        chunkId: "c1",
        anchor: { startOffset: 0, endOffset: 1 },
        preview: "…",
      }),
    ).toBe("/notes/ws_mine_launch%2Fchunk%201");
  });
});

describe("askRequestBody", () => {
  it("sends only the question and the workspace selector", () => {
    expect(askRequestBody({ question: "When?", workspaceId: "ws_1" })).toEqual({
      question: "When?",
      workspaceId: "ws_1",
    });
  });

  it("points the stream at the same-origin proxy", () => {
    expect(ASK_STREAM_PATH).toBe("/ask/stream");
  });
});
