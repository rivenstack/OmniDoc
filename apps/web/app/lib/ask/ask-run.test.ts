import { describe, expect, it, vi } from "vitest";

import type { Workspace } from "../identity/identity-api";
import type { AskPort, AskPortOutcome, AskPortRequest } from "./ask-api";
import { createAskSseParser, type AskSseParseResult } from "./ask-sse";
import {
  askSseResponse,
  handleAskRequest,
  parseAskBody,
  resolveAskTarget,
  runAsk,
  type AskSessionInput,
} from "./ask-run";

/**
 * Route-data-path tests, with the port injected.
 *
 * The proxy's whole decision surface is exercised here without `next/headers`:
 * body validation, workspace-selector authorization (the IDOR negative), the
 * failure-status mapping, and the streaming response's single-terminal rule.
 */

const workspace = (id: string): Workspace => ({
  id,
  tenantId: `tenant_${id}`,
  name: id,
});

const resolved = (
  ids: string[],
  preference?: string,
): AskSessionInput => ({
  status: "resolved",
  workspaces: ids.map(workspace),
  ...(preference ? { preference } : {}),
});

const jar = { session: "S1", csrf: "t1" };

/** Build a real parsed frame from the wire, so the fixtures cannot drift. */
function frame(event: string, data: unknown): AskSseParseResult {
  const parser = createAskSseParser();
  const [result] = parser.push(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
  );
  if (!result) {
    throw new Error(`could not build a "${event}" frame`);
  }
  return result;
}

function fakePort(outcome: AskPortOutcome): AskPort {
  return vi.fn(async () => outcome) as unknown as AskPort;
}

function recordingPort(): {
  port: AskPort;
  requests: AskPortRequest[];
  selectors: (string | undefined)[];
} {
  const requests: AskPortRequest[] = [];
  const selectors: (string | undefined)[] = [];
  const port: AskPort = async (request, _jar, selector) => {
    requests.push(request);
    selectors.push(selector);
    return { status: "failure", failure: { class: "unavailable" } };
  };
  return { port, requests, selectors };
}

const jsonBody = async (response: Response) =>
  (await response.json()) as Record<string, unknown>;

describe("parseAskBody", () => {
  it("rejects an empty or missing question", () => {
    expect(parseAskBody(undefined)).toEqual({
      ok: false,
      failure: { class: "validation" },
    });
    expect(parseAskBody({ question: "   " })).toEqual({
      ok: false,
      failure: { class: "validation" },
    });
  });

  it("trims the question and reads the selector", () => {
    expect(
      parseAskBody({ question: "  When?  ", workspaceId: "ws_1" }),
    ).toEqual({ ok: true, question: "When?", workspaceSelector: "ws_1" });
  });

  it("rejects a corpus value the contract does not define", () => {
    expect(parseAskBody({ question: "q", corpusOwnership: "someone-else" })).toEqual(
      { ok: false, failure: { class: "validation" } },
    );
    expect(parseAskBody({ question: "q", corpusOwnership: "sample" })).toEqual({
      ok: true,
      question: "q",
      corpusOwnership: "sample",
    });
  });
});

describe("resolveAskTarget", () => {
  it("keeps unauthenticated and unavailable distinct", () => {
    expect(resolveAskTarget({ status: "unauthenticated" }, undefined)).toEqual({
      status: "failure",
      failure: { class: "unauthenticated" },
    });
    expect(resolveAskTarget({ status: "unavailable" }, undefined)).toEqual({
      status: "failure",
      failure: { class: "unavailable" },
    });
  });

  it("denies a selector the session is not a member of", () => {
    // The IDOR negative: user A's session plus user B's workspace id.
    expect(resolveAskTarget(resolved(["ws_mine"]), "ws_other")).toEqual({
      status: "failure",
      failure: { class: "denied" },
    });
  });

  it("honours a selector that is a membership", () => {
    expect(resolveAskTarget(resolved(["ws_mine", "ws_empty"]), "ws_empty")).toEqual({
      status: "ready",
      workspaceId: "ws_empty",
    });
  });

  it("falls back to the preference, then the first membership", () => {
    expect(resolveAskTarget(resolved(["ws_mine", "ws_empty"], "ws_empty"), undefined))
      .toEqual({ status: "ready", workspaceId: "ws_empty" });
    expect(resolveAskTarget(resolved(["ws_mine", "ws_empty"]), undefined)).toEqual({
      status: "ready",
      workspaceId: "ws_mine",
    });
    expect(resolveAskTarget(resolved([]), undefined)).toEqual({
      status: "failure",
      failure: { class: "unavailable" },
    });
  });
});

describe("runAsk", () => {
  it("never calls the port for a blank question", async () => {
    const port = vi.fn() as unknown as AskPort;
    const outcome = await runAsk("ws_1", jar, { question: "   " }, port);
    expect(outcome).toEqual({
      status: "failure",
      failure: { class: "validation" },
    });
    expect(port).not.toHaveBeenCalled();
  });

  it("passes the trimmed question and the resolved workspace to the port", async () => {
    const { port, requests, selectors } = recordingPort();
    await runAsk("ws_1", jar, { question: "  When?  " }, port);
    expect(requests).toEqual([{ question: "When?" }]);
    expect(selectors).toEqual(["ws_1"]);
  });
});

describe("handleAskRequest", () => {
  it("returns a 400 ErrorBody for a blank question and never opens a stream", async () => {
    const port = vi.fn() as unknown as AskPort;
    const response = await handleAskRequest({
      session: resolved(["ws_1"]),
      jar,
      body: { question: "" },
      port,
    });

    expect(response.status).toBe(400);
    expect(await jsonBody(response)).toEqual({
      code: "validation",
      detail: "The question must be a nonempty string.",
    });
    expect(port).not.toHaveBeenCalled();
  });

  it("returns a generic 403 denial for a non-member selector, without calling the port", async () => {
    const port = vi.fn() as unknown as AskPort;
    const response = await handleAskRequest({
      session: resolved(["ws_mine"]),
      jar,
      body: { question: "q", workspaceId: "ws_other" },
      port,
    });

    expect(response.status).toBe(403);
    const body = await jsonBody(response);
    expect(body.code).toBe("forbidden");
    // The denial must not reveal whether the workspace exists.
    expect(String(body.detail)).not.toContain("ws_other");
    expect(port).not.toHaveBeenCalled();
  });

  it("returns the port's failure at its class status", async () => {
    const response = await handleAskRequest({
      session: resolved(["ws_1"]),
      jar,
      body: { question: "q" },
      port: fakePort({
        status: "failure",
        failure: { class: "quota_exhausted", mode: "operator_free_tier" },
      }),
    });

    expect(response.status).toBe(429);
    expect(await jsonBody(response)).toMatchObject({
      code: "quota_exhausted",
      mode: "operator_free_tier",
    });
  });

  it("streams frames and stops after the terminal event", async () => {
    async function* frames(): AsyncGenerator<AskSseParseResult> {
      yield frame("generating", {});
      yield frame("claim", { text: "Tuesday.", citations: [] });
      yield frame("completed", { outcome: "supported", text: "Tuesday.", citations: [] });
      // A misbehaving upstream emits a second terminal; the proxy must drop it.
      yield frame("completed", { outcome: "conflict", text: "nope", citations: [] });
    }

    const response = await handleAskRequest({
      session: resolved(["ws_1"]),
      jar,
      body: { question: "q" },
      port: fakePort({ status: "stream", frames: frames() }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const text = await response.text();
    expect(text.match(/^event: completed$/gm)).toHaveLength(1);
    expect(text).toContain("event: claim");
    expect(text).toContain("event: generating");
    expect(text).not.toContain("nope");
  });

  it("turns an unreadable frame into a terminal error frame", async () => {
    async function* frames(): AsyncGenerator<AskSseParseResult> {
      yield frame("generating", {});
      yield { type: "malformed", detail: "bad record" };
    }

    const response = await handleAskRequest({
      session: resolved(["ws_1"]),
      jar,
      body: { question: "q" },
      port: fakePort({ status: "stream", frames: frames() }),
    });

    const text = await response.text();
    expect(text).toContain("event: error");
    expect(text).toContain('"code":"unavailable"');
  });
});

describe("askSseResponse", () => {
  it("does not forward a frame after a terminal event", async () => {
    async function* frames(): AsyncGenerator<AskSseParseResult> {
      yield frame("truncated", { code: "timeout", detail: "cut" });
      yield frame("claim", { text: "late", citations: [] });
    }

    const response = askSseResponse(frames());
    const text = await response.text();
    expect(text).toContain("event: truncated");
    expect(text).not.toContain("late");
  });
});
