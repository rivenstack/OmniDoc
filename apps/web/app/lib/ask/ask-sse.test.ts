import { describe, expect, it } from "vitest";

import {
  asAskErrorBody,
  asCitation,
  createAskSseParser,
  serializeAskSseEvent,
  type AskSseParseResult,
} from "./ask-sse";

/**
 * Frame-parser tests for the Ask SSE contract (`docs/api/ask-sse.md`).
 *
 * Fixtures mirror the S-03 corpus shapes (`packages/mocks`): the passages, the
 * citation identity, and the five success outcomes. They are hand-written here
 * because the `web → mocks` import exception is not authorized — the port is
 * injected instead, and the fixtures are the documented wire shapes.
 */

const citation = (overrides: Record<string, unknown> = {}) => ({
  noteId: "ws_mine_launch",
  versionId: "ws_mine_launch_v1",
  chunkId: "ws_mine_launch_chunk1",
  anchor: { startOffset: 0, endOffset: 51 },
  preview: "The launch review is on Tuesday. Alex owns the checklist.",
  ...overrides,
});

const frame = (event: string, data: unknown) =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

function collect(chunks: string[]): AskSseParseResult[] {
  const parser = createAskSseParser();
  const out: AskSseParseResult[] = [];
  for (const chunk of chunks) {
    out.push(...parser.push(chunk));
  }
  out.push(...parser.flush());
  return out;
}

describe("createAskSseParser", () => {
  it("parses a whole generating → claim → completed stream", () => {
    const wire =
      frame("generating", {}) +
      frame("claim", { text: "The launch review is Tuesday.", citations: [citation()] }) +
      frame("completed", {
        outcome: "supported",
        text: "The launch review is Tuesday.",
        citations: [citation()],
      });

    expect(collect([wire])).toEqual([
      { type: "event", event: { event: "generating", data: {} } },
      {
        type: "event",
        event: {
          event: "claim",
          data: {
            text: "The launch review is Tuesday.",
            citations: [
              {
                noteId: "ws_mine_launch",
                versionId: "ws_mine_launch_v1",
                chunkId: "ws_mine_launch_chunk1",
                anchor: { startOffset: 0, endOffset: 51 },
                preview: "The launch review is on Tuesday. Alex owns the checklist.",
              },
            ],
          },
        },
      },
      {
        type: "event",
        event: {
          event: "completed",
          data: {
            outcome: "supported",
            text: "The launch review is Tuesday.",
            citations: [citation()],
          },
        },
      },
    ]);
  });

  it("accepts all five success outcomes on completed", () => {
    const outcomes = [
      "supported",
      "partial",
      "no_supported_answer",
      "conflict",
      "refused_policy",
    ];
    for (const outcome of outcomes) {
      const result = collect([
        frame("completed", { outcome, text: "…", citations: [] }),
      ]);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: "event",
        event: { event: "completed", data: { outcome } },
      });
    }
  });

  it("reframes a record split across three chunks", () => {
    const wire =
      frame("claim", { text: "Split across chunks.", citations: [] }) +
      frame("completed", { outcome: "partial", text: "Done.", citations: [] });

    const first = wire.slice(0, 12);
    const second = wire.slice(12, 30);
    const third = wire.slice(30);

    const result = collect([first, second, third]);
    expect(result.map((r) => (r.type === "event" ? r.event.event : r.type))).toEqual([
      "claim",
      "completed",
    ]);
  });

  it("handles several records in one chunk and CRLF framing", () => {
    const wire = [
      "event: generating\r\ndata: {}\r\n\r\n",
      "event: completed\r\ndata: {\"outcome\":\"supported\",\"text\":\"x\",\"citations\":[]}\r\n\r\n",
    ].join("");

    const result = collect([wire]);
    expect(result.map((r) => (r.type === "event" ? r.event.event : r.type))).toEqual([
      "generating",
      "completed",
    ]);
  });

  it("ignores comments and unknown fields", () => {
    const wire =
      ": keep-alive\n" +
      "event: generating\n" +
      "data: {}\n" +
      "id: 7\n" +
      "\n";

    expect(collect([wire])).toEqual([
      { type: "event", event: { event: "generating", data: {} } },
    ]);
  });

  it("flushes a trailing record with no terminating blank line", () => {
    const parser = createAskSseParser();
    const wire = 'event: truncated\ndata: {"code":"timeout","detail":"cut"}';
    expect(parser.push(wire)).toEqual([]);
    expect(parser.flush()).toEqual([
      {
        type: "event",
        event: { event: "truncated", data: { code: "timeout", detail: "cut" } },
      },
    ]);
  });

  it("keeps mode on a quota error and drops an unknown mode", () => {
    const withMode = collect([
      frame("error", {
        code: "quota_exhausted",
        detail: "Operator free-tier quota exhausted.",
        mode: "operator_free_tier",
      }),
    ]);
    expect(withMode[0]).toMatchObject({
      type: "event",
      event: { event: "error", data: { mode: "operator_free_tier" } },
    });

    const unknownMode = collect([
      frame("error", { code: "quota_exhausted", detail: "x", mode: "turbo" }),
    ]);
    expect(unknownMode[0]).toMatchObject({
      type: "event",
      event: { event: "error", data: { code: "quota_exhausted" } },
    });
    expect(
      unknownMode[0].type === "event" ? unknownMode[0].event.data : null,
    ).not.toHaveProperty("mode");
  });

  it("reports malformed for an unknown event name", () => {
    const result = collect([frame("token", { text: "hi" })]);
    expect(result[0].type).toBe("malformed");
  });

  it("reports malformed for invalid JSON, a non-object payload, or no data", () => {
    expect(collect(["event: claim\ndata: {not json}\n\n"])[0].type).toBe(
      "malformed",
    );
    expect(collect(["event: claim\ndata: [1,2]\n\n"])[0].type).toBe("malformed");
    // An empty `data:` line is not valid JSON.
    expect(collect(["event: claim\ndata: \n\n"])[0].type).toBe("malformed");
    // A record with an event and no data line at all is reported as such.
    expect(collect(["event: claim\n\n"])[0]).toEqual({
      type: "malformed",
      detail: 'SSE record for event "claim" has no data.',
    });
    expect(collect(["data: {}\n\n"])[0].type).toBe("malformed");
  });

  it("reports malformed when a claim or citation is missing required fields", () => {
    expect(
      collect([frame("claim", { text: "x" })])[0].type,
    ).toBe("malformed");
    expect(
      collect([frame("claim", { text: "x", citations: [{ noteId: "n" }] })])[0]
        .type,
    ).toBe("malformed");
    expect(
      collect([
        frame("claim", {
          text: "x",
          citations: [citation({ anchor: { startOffset: -1, endOffset: 5 } })],
        }),
      ])[0].type,
    ).toBe("malformed");
  });

  it("never coerces an unknown corpus value into a citation", () => {
    const result = collect([
      frame("claim", {
        text: "x",
        citations: [citation({ corpusOwnership: "someone-else" })],
      }),
    ]);
    expect(result[0].type).toBe("malformed");
  });

  it("reports malformed for a completed event with a non-outcome value", () => {
    expect(
      collect([frame("completed", { outcome: "error", text: "x", citations: [] })])[0]
        .type,
    ).toBe("malformed");
  });

  it("rejects an ErrorBody with no code", () => {
    expect(
      collect([frame("error", { detail: "no code" })])[0].type,
    ).toBe("malformed");
  });
});

describe("serializeAskSseEvent", () => {
  it("round-trips through the parser", () => {
    const wire = serializeAskSseEvent({
      event: "completed",
      data: {
        outcome: "supported",
        text: "Hello",
        citations: [citation({ corpusOwnership: "sample" })],
      },
    });
    const result = collect([wire]);
    expect(result[0]).toMatchObject({
      type: "event",
      event: {
        event: "completed",
        data: { citations: [{ corpusOwnership: "sample" }] },
      },
    });
  });
});

describe("asCitation / asAskErrorBody", () => {
  it("keeps optional fields only when the server sent them", () => {
    const parsed = asCitation(citation());
    expect(parsed).not.toBeNull();
    expect(parsed).not.toHaveProperty("updatedAt");
    expect(parsed).not.toHaveProperty("corpusOwnership");

    const labelled = asCitation(
      citation({
        updatedAt: "2026-09-20T12:00:00Z",
        corpusOwnership: "mine",
      }),
    );
    expect(labelled).toMatchObject({
      updatedAt: "2026-09-20T12:00:00Z",
      corpusOwnership: "mine",
    });
  });

  it("requires the anchor offsets", () => {
    expect(asCitation(citation({ anchor: { startOffset: 0 } }))).toBeNull();
    expect(asCitation(citation({ anchor: undefined }))).toBeNull();
  });

  it("accepts an ErrorBody with and without mode", () => {
    expect(
      asAskErrorBody({ code: "unavailable", detail: "down" }),
    ).toEqual({ code: "unavailable", detail: "down" });
    expect(
      asAskErrorBody({ code: "timeout", detail: "slow", mode: "mock" }),
    ).toEqual({ code: "timeout", detail: "slow", mode: "mock" });
    expect(asAskErrorBody({ detail: "missing code" })).toBeNull();
  });
});
