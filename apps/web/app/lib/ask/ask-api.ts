/**
 * Answer port — the only place the frontend opens an Ask stream.
 *
 * A typed adapter over `docs/api/openapi.yaml` (`Ask` tag) and the canonical SSE
 * event contract in `docs/api/ask-sse.md`: `POST /api/v1/ask` streams
 * `generating` / `claim` / `completed` / `truncated` / `error` records, and a
 * pre-stream failure arrives as a JSON `ErrorBody` on a 4xx/5xx response.
 *
 * Four rules from `architecture.md` §4 / `docs/design/system-ux.md` §2 shape it:
 *
 * - **Search and Ask are different ports.** This module never searches, and the
 *   browser never reaches the API — the request goes out server-side and the
 *   session cookies are relayed by the caller, exactly like the search port.
 * - **A workspace id selects; it does not authorize.** The id travels as the
 *   `OmniDoc-Workspace-Id` selector header and the server re-binds membership. A
 *   mismatch is a generic denial.
 * - **The server owns the answer, the claims, the `outcome`, and the citations.**
 *   The port validates what came back and reports outcomes; it never invents an
 *   event and never fabricates a citation.
 * - **Success outcomes are success.** `supported`, `partial`,
 *   `no_supported_answer`, `conflict`, and `refused_policy` all arrive on a 200
 *   stream; only a 4xx/5xx response or a terminal `truncated`/`error` event is a
 *   failure.
 *
 * Unlike the JSON ports, this one cannot use the shared JSON transport: an SSE
 * stream must be handed back as a live body (so the route can stream it to the
 * browser and the browser can stop it), and the shared transport does not expose
 * the raw `Response` or accept an abort signal. It re-uses the transport's
 * origin and cookie-header helpers so those two facts stay single-sourced, and
 * hands the caller an async iterable of parsed frames.
 */
import type { components } from "@omnidoc/contracts";
import {
  apiOrigin,
  cookieHeader,
  readJson,
  type ApiJar,
} from "../api/transport";
import {
  CSRF_HEADER_NAME,
  WORKSPACE_SELECTOR_HEADER,
} from "../identity/constants";
import { locale } from "../../locale";
import { createAskSseParser, type AskSseParseResult } from "./ask-sse";
import { failureFromResponse, type AskFailure } from "./ask-stream";

export type AskRequest = components["schemas"]["AskRequest"];

export const ASK_PATH = "/api/v1/ask";

/**
 * How long to wait for the response **headers** before giving up.
 *
 * Only the connect phase is bounded: once the stream is open, a long answer is
 * legitimate, so the body is bounded by the caller's signal (the browser
 * closing the request) rather than by a fixed deadline.
 */
const CONNECT_TIMEOUT_MS = 15_000;

/**
 * What the port sends.
 *
 * `locale` and `mode` are deliberately absent: the contract defaults them, and
 * sending an invented `mode` would be a silent mode switch — the exact thing
 * `system-ux.md` §2 forbids. Only `question` and the optional `corpusOwnership`
 * filter travel.
 */
export type AskPortRequest = {
  question: string;
  corpusOwnership?: components["schemas"]["CorpusOwnership"];
};

/** Parsed frames from a started stream, in arrival order. */
export type AskFrameSource = AsyncIterable<AskSseParseResult>;

export type AskPortOutcome =
  | { status: "stream"; frames: AskFrameSource }
  | { status: "failure"; failure: AskFailure };

export type AskPortOptions = { signal?: AbortSignal };

/** The injectable port shape (tests and the route handler inject a stand-in). */
export type AskPort = typeof askNotes;

/**
 * Read the SSE body into parsed frames.
 *
 * The decoder is flushed and the parser is flushed at end-of-stream, so a final
 * record that arrived without its terminating blank line is still delivered —
 * a stream that was cut short can have produced a complete final event.
 */
async function* readAskFrames(
  body: ReadableStream<Uint8Array>,
  cleanup: () => void,
): AsyncGenerator<AskSseParseResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parser = createAskSseParser();

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      for (const result of parser.push(decoder.decode(value, { stream: true }))) {
        yield result;
      }
    }
    for (const result of parser.push(decoder.decode())) {
      yield result;
    }
    for (const result of parser.flush()) {
      yield result;
    }
  } finally {
    cleanup();
    // Stop reading even if the consumer broke out early (e.g. after a terminal
    // event): the upstream connection must not be left open.
    await reader.cancel().catch(() => undefined);
  }
}

/**
 * Open one Ask stream.
 *
 * Returns `{ status: "stream" }` once the response headers say 200, or a
 * `failure` outcome for a pre-stream 4xx/5xx — never a throw, so "we could not
 * ask" and "the answer is no" stay different states.
 */
export async function askNotes(
  request: AskPortRequest,
  jar: ApiJar = {},
  workspaceSelector?: string,
  options: AskPortOptions = {},
): Promise<AskPortOutcome> {
  const payload: AskRequest = {
    question: request.question,
    // The contract defaults `locale`, but the generated type requires it, and
    // the value belongs to the single locale source rather than to this module.
    locale: locale.lang,
  };
  if (request.corpusOwnership !== undefined) {
    payload.corpusOwnership = request.corpusOwnership;
  }

  const headers = new Headers({
    Accept: "text/event-stream",
    "Content-Type": "application/json",
  });
  const cookie = cookieHeader(jar);
  if (cookie) {
    headers.set("Cookie", cookie);
  }
  if (workspaceSelector) {
    headers.set(WORKSPACE_SELECTOR_HEADER, workspaceSelector);
  }
  // A POST is state-changing, so Spring's `spa()` CSRF needs the cookie's token
  // back in the header (the identity port owns the cookie names).
  if (jar.csrf) {
    headers.set(CSRF_HEADER_NAME, jar.csrf);
  }

  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  const detach = () => options.signal?.removeEventListener("abort", forwardAbort);
  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener("abort", forwardAbort, { once: true });
    }
  }
  const connectTimer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${apiOrigin()}${ASK_PATH}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch {
    clearTimeout(connectTimer);
    detach();
    return { status: "failure", failure: { class: "unavailable" } };
  }
  // Headers are in: the connect deadline no longer applies.
  clearTimeout(connectTimer);

  if (!response.ok) {
    detach();
    const body = await readJson(response);
    return { status: "failure", failure: failureFromResponse(response.status, body) };
  }
  if (!response.body) {
    detach();
    return { status: "failure", failure: { class: "unavailable" } };
  }

  return {
    status: "stream",
    frames: readAskFrames(response.body, detach),
  };
}
