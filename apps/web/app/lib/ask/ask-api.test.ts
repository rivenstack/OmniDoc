import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ASK_PATH, askNotes } from "./ask-api";

const originalOrigin = process.env.OMNIDOC_API_ORIGIN;

beforeEach(() => {
  process.env.OMNIDOC_API_ORIGIN = "http://api.test";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  if (originalOrigin === undefined) {
    delete process.env.OMNIDOC_API_ORIGIN;
  } else {
    process.env.OMNIDOC_API_ORIGIN = originalOrigin;
  }
});

type FetchCall = { url: string; init: RequestInit | undefined };

function stubFetch(
  respond: (call: FetchCall) => Response | Promise<Response>,
): FetchCall[] {
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

function bodyOf(call: FetchCall): Record<string, unknown> {
  return JSON.parse(String(call.init?.body)) as Record<string, unknown>;
}

const citation = {
  noteId: "ws_mine_launch",
  versionId: "ws_mine_launch_v1",
  chunkId: "ws_mine_launch_chunk1",
  anchor: { startOffset: 0, endOffset: 51 },
  preview: "The launch review is on Tuesday.",
};

function streamBody(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[index]));
      index += 1;
    },
  });
}

const streamResponse = (chunks: string[]) =>
  new Response(streamBody(chunks), {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

async function drain(outcome: Awaited<ReturnType<typeof askNotes>>) {
  if (outcome.status !== "stream") {
    throw new Error(`expected a stream, got ${outcome.status}`);
  }
  const frames = [];
  for await (const frame of outcome.frames) {
    frames.push(frame);
  }
  return frames;
}

describe("askNotes", () => {
  it("POSTs to the ask path with the session cookies and workspace selector", async () => {
    const calls = stubFetch(() => streamResponse(["event: generating\ndata: {}\n\n"]));

    await askNotes({ question: "When?" }, { session: "S1", csrf: "t1" }, "ws_1");

    expect(calls[0].url).toBe(`http://api.test${ASK_PATH}`);
    expect(calls[0].init?.method).toBe("POST");
    expect(headersOf(calls[0]).get("cookie")).toBe("JSESSIONID=S1; XSRF-TOKEN=t1");
    expect(headersOf(calls[0]).get("x-xsrf-token")).toBe("t1");
    expect(headersOf(calls[0]).get("omnidoc-workspace-id")).toBe("ws_1");
    expect(headersOf(calls[0]).get("accept")).toBe("text/event-stream");
  });

  it("sends the question, the locale, and no mode", async () => {
    const calls = stubFetch(() => streamResponse([]));

    await askNotes({ question: "When is the launch review?" });

    // `mode` absent: sending one would be a silent mode switch
    // (`docs/design/system-ux.md` §2).
    expect(bodyOf(calls[0])).toEqual({
      question: "When is the launch review?",
      locale: "en",
    });
  });

  it("sends corpusOwnership only when it is active", async () => {
    const calls = stubFetch(() => streamResponse([]));

    await askNotes({ question: "q", corpusOwnership: "sample" });
    expect(bodyOf(calls[0])).toEqual({
      question: "q",
      locale: "en",
      corpusOwnership: "sample",
    });

    await askNotes({ question: "q" });
    expect(bodyOf(calls[1])).toEqual({ question: "q", locale: "en" });
  });

  it("yields parsed frames from a started stream", async () => {
    stubFetch(() =>
      streamResponse([
        "event: generating\ndata: {}\n\n",
        `event: claim\ndata: ${JSON.stringify({ text: "Tuesday.", citations: [citation] })}\n\n`,
        `event: completed\ndata: ${JSON.stringify({ outcome: "supported", text: "Tuesday.", citations: [citation] })}\n\n`,
      ]),
    );

    const frames = await drain(await askNotes({ question: "q" }));

    expect(frames.map((f) => (f.type === "event" ? f.event.event : f.type))).toEqual([
      "generating",
      "claim",
      "completed",
    ]);
  });

  it("maps each pre-stream failure class distinctly", async () => {
    stubFetch(() => json({ code: "validation", detail: "bad" }, 400));
    expect(await askNotes({ question: "q" })).toEqual({
      status: "failure",
      failure: { class: "validation", detail: "bad" },
    });

    stubFetch(() => json({ code: "unauthenticated", detail: "x" }, 401));
    expect(await askNotes({ question: "q" })).toEqual({
      status: "failure",
      failure: { class: "unauthenticated" },
    });

    stubFetch(() => json({ code: "forbidden", detail: "not yours" }, 403));
    expect(await askNotes({ question: "q" })).toEqual({
      status: "failure",
      failure: { class: "denied" },
    });

    stubFetch(() =>
      json({ code: "mode_forbidden", detail: "gated", mode: "customer_key" }, 403),
    );
    expect(await askNotes({ question: "q" })).toEqual({
      status: "failure",
      failure: { class: "mode_forbidden", mode: "customer_key" },
    });

    stubFetch(() =>
      json(
        { code: "quota_exhausted", detail: "spent", mode: "operator_free_tier" },
        429,
      ),
    );
    expect(await askNotes({ question: "q" })).toEqual({
      status: "failure",
      failure: { class: "quota_exhausted", mode: "operator_free_tier" },
    });

    stubFetch(() => json({ code: "unavailable", detail: "down" }, 503));
    expect(await askNotes({ question: "q" })).toEqual({
      status: "failure",
      failure: { class: "unavailable", detail: "down" },
    });
  });

  it("reports unreachable instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("connection refused");
      }),
    );

    expect(await askNotes({ question: "q" })).toEqual({
      status: "failure",
      failure: { class: "unavailable" },
    });
  });

  it("forwards the caller's abort signal to the request", async () => {
    const controller = new AbortController();
    const calls = stubFetch(() => streamResponse([]));

    await askNotes({ question: "q" }, {}, undefined, { signal: controller.signal });

    const fetchSignal = calls[0].init?.signal;
    expect(fetchSignal).toBeInstanceOf(AbortSignal);
    expect(fetchSignal?.aborted).toBe(false);

    controller.abort();
    expect(fetchSignal?.aborted).toBe(true);
  });

  it("cancels the upstream stream when the consumer stops early", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("event: generating\ndata: {}\n\n"));
      },
      cancel() {
        cancelled = true;
      },
    });
    stubFetch(() => new Response(body, { status: 200 }));

    const outcome = await askNotes({ question: "q" });
    if (outcome.status !== "stream") {
      throw new Error("expected a stream");
    }
    for await (const frame of outcome.frames) {
      void frame;
      break;
    }

    expect(cancelled).toBe(true);
  });

  it("treats a 200 with no body as unavailable", async () => {
    stubFetch(() => new Response(null, { status: 200 }));
    expect(await askNotes({ question: "q" })).toEqual({
      status: "failure",
      failure: { class: "unavailable" },
    });
  });
});
