/**
 * Ask SSE frame parser — pure logic, no fetch and no React.
 *
 * `docs/api/ask-sse.md` is the canonical event contract for `POST /api/v1/ask`:
 * one SSE record per event, `event:` + a single `data:` JSON line, a blank line
 * terminates the record, comments (`:` lines) are ignored, and `id` /
 * `Last-Event-ID` are unused in Phase 1. Exactly one `completed` / `truncated` /
 * `error` event ends a stream.
 *
 * This module is the only place the raw wire text is turned into typed events,
 * and it does two jobs the rest of the slice relies on:
 *
 * 1. **Reframing across chunk boundaries.** A network chunk is not a record:
 *    one chunk may hold several records, and one record may be split between two
 *    chunks. The parser buffers until a blank line, so a frame is never parsed
 *    half-formed.
 * 2. **Validating the server's payload.** The server is the only source of the
 *    answer, claims, citations, `outcome`, and terminal events
 *    (`docs/design/system-ux.md` §2). A record this parser cannot validate is
 *    reported as `malformed` — it is never coerced into a plausible-looking
 *    event, because inventing a citation or an `outcome` is a trust failure, not
 *    a convenience.
 *
 * The parser is total: it never throws on hostile or truncated input. Callers
 * (the port, the route handler, tests) receive `AskSseParseResult`s and decide
 * what an unreadable frame means.
 */
import type {
  AskOutcome,
  AskSseEvent,
  Citation,
  ErrorBody,
  components,
} from "@omnidoc/contracts";

/** A parsed record, or an honest report that a record could not be trusted. */
export type AskSseParseResult =
  | { type: "event"; event: AskSseEvent }
  | { type: "malformed"; detail: string };

export type AskSseParser = {
  /** Feed decoded text; returns every whole record completed so far. */
  push(text: string): AskSseParseResult[];
  /**
   * End of the byte stream. Flushes a trailing record that arrived without its
   * terminating blank line — a stream that was cut off can still have delivered
   * a complete final record.
   */
  flush(): AskSseParseResult[];
};

type CorpusOwnership = components["schemas"]["CorpusOwnership"];
type PassageAnchor = components["schemas"]["PassageAnchor"];

/**
 * The five success outcomes, written as a `Record<AskOutcome, true>` so that a
 * new outcome in the contract fails this file's typecheck and forces a
 * deliberate update — the client must never silently treat an unknown outcome as
 * a success.
 *
 * It is a runtime table (not an import) on purpose: `apps/web` resolves
 * `@omnidoc/contracts` values only through Next's tsconfig paths, which the
 * Node-only `web` test runner does not apply, so this port keeps its runtime
 * dependencies to the type level (the F-06 convention).
 */
const ASK_OUTCOME_TABLE: Record<AskOutcome, true> = {
  supported: true,
  partial: true,
  no_supported_answer: true,
  conflict: true,
  refused_policy: true,
};

function asOutcome(value: unknown): AskOutcome | null {
  if (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(ASK_OUTCOME_TABLE, value)
  ) {
    return value as AskOutcome;
  }
  return null;
}

/** The three events that end a stream (`docs/api/ask-sse.md`). */
export function isTerminalAskEvent(
  name: string,
): name is "completed" | "truncated" | "error" {
  return name === "completed" || name === "truncated" || name === "error";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Read an optional `corpusOwnership`.
 *
 * `undefined` means the server did not say which corpus the citation came from
 * (the field is optional). `null` means the server sent a value the contract
 * does not define — the record cannot be trusted, so the caller rejects it
 * rather than guessing a corpus. This mirrors the search port's handling of the
 * same optional field.
 */
function asCorpusOwnership(
  value: unknown,
): CorpusOwnership | undefined | null {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (value === "sample" || value === "mine") {
    return value;
  }
  return null;
}

function asAnchor(value: unknown): PassageAnchor | null {
  if (!isObject(value)) {
    return null;
  }
  const startOffset = value.startOffset;
  const endOffset = value.endOffset;
  if (
    typeof startOffset !== "number" ||
    !Number.isInteger(startOffset) ||
    startOffset < 0 ||
    typeof endOffset !== "number" ||
    !Number.isInteger(endOffset) ||
    endOffset < 0
  ) {
    return null;
  }
  const anchor: PassageAnchor = { startOffset, endOffset };
  if (value.blockId !== undefined) {
    if (!isNonEmptyString(value.blockId)) {
      return null;
    }
    anchor.blockId = value.blockId;
  }
  return anchor;
}

/**
 * Validate one `Citation`. Every required field must be present and typed; a
 * citation the caller cannot open to its passage must not be rendered as if it
 * could (`architecture.md` §4).
 */
export function asCitation(value: unknown): Citation | null {
  if (!isObject(value)) {
    return null;
  }
  const { noteId, versionId, chunkId, preview, updatedAt } = value;
  if (
    !isNonEmptyString(noteId) ||
    !isNonEmptyString(versionId) ||
    !isNonEmptyString(chunkId) ||
    typeof preview !== "string"
  ) {
    return null;
  }
  const anchor = asAnchor(value.anchor);
  if (!anchor) {
    return null;
  }
  if (updatedAt !== undefined && typeof updatedAt !== "string") {
    return null;
  }
  const ownership = asCorpusOwnership(value.corpusOwnership);
  if (ownership === null) {
    return null;
  }

  const citation: Citation = { noteId, versionId, chunkId, anchor, preview };
  if (typeof updatedAt === "string") {
    citation.updatedAt = updatedAt;
  }
  if (ownership !== undefined) {
    citation.corpusOwnership = ownership;
  }
  return citation;
}

function asCitations(value: unknown): Citation[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const citations: Citation[] = [];
  for (const item of value) {
    const citation = asCitation(item);
    if (!citation) {
      return null;
    }
    citations.push(citation);
  }
  return citations;
}

function asClaim(value: Record<string, unknown>): { text: string; citations: Citation[] } | null {
  if (typeof value.text !== "string") {
    return null;
  }
  const citations = asCitations(value.citations);
  return citations ? { text: value.text, citations } : null;
}

function asAnswer(
  value: Record<string, unknown>,
): components["schemas"]["Answer"] | null {
  const outcome = asOutcome(value.outcome);
  if (typeof value.text !== "string" || outcome === null) {
    return null;
  }
  const citations = asCitations(value.citations);
  if (!citations) {
    return null;
  }
  return { outcome, text: value.text, citations };
}

/**
 * Validate an `ErrorBody`.
 *
 * `code` is checked to be a non-empty string and passed through as the contract
 * type; the specific code is interpreted by the stream reducer, so a code the
 * client does not know still becomes an honest "transport-class" failure rather
 * than a fabricated success. `mode` (present on `quota_exhausted`) is kept only
 * when it names one of the contract's runtime modes.
 */
export function asAskErrorBody(value: unknown): ErrorBody | null {
  if (!isObject(value)) {
    return null;
  }
  if (!isNonEmptyString(value.code) || typeof value.detail !== "string") {
    return null;
  }
  const body: ErrorBody = {
    code: value.code as ErrorBody["code"],
    detail: value.detail,
  };
  const mode = asRuntimeMode(value.mode);
  if (mode !== undefined) {
    body.mode = mode;
  }
  return body;
}

function asRuntimeMode(value: unknown): ErrorBody["mode"] | undefined {
  if (value === "mock" || value === "operator_free_tier" || value === "customer_key") {
    return value;
  }
  return undefined;
}

function malformed(detail: string): AskSseParseResult {
  return { type: "malformed", detail };
}

function parseEvent(name: string, dataText: string): AskSseParseResult {
  let data: unknown;
  try {
    data = JSON.parse(dataText);
  } catch {
    return malformed(`SSE event "${name}" carried data that is not valid JSON.`);
  }
  if (!isObject(data)) {
    return malformed(`SSE event "${name}" payload is not a JSON object.`);
  }

  switch (name) {
    case "generating":
      // `AskSseGenerating` is an empty object; nothing to validate beyond the
      // shape already checked.
      return { type: "event", event: { event: "generating", data: {} } };
    case "claim": {
      const claim = asClaim(data);
      return claim
        ? { type: "event", event: { event: "claim", data: claim } }
        : malformed("SSE claim event is missing a valid text or citations.");
    }
    case "completed": {
      const answer = asAnswer(data);
      return answer
        ? { type: "event", event: { event: "completed", data: answer } }
        : malformed(
            "SSE completed event is missing a valid outcome, text, or citations.",
          );
    }
    case "truncated": {
      const body = asAskErrorBody(data);
      return body
        ? { type: "event", event: { event: "truncated", data: body } }
        : malformed("SSE truncated event is missing a valid code or detail.");
    }
    case "error": {
      const body = asAskErrorBody(data);
      return body
        ? { type: "event", event: { event: "error", data: body } }
        : malformed("SSE error event is missing a valid code or detail.");
    }
    default:
      return malformed(`Unknown Ask SSE event "${name}".`);
  }
}

function parseRecord(record: string): AskSseParseResult | null {
  let eventName: string | undefined;
  const dataLines: string[] = [];

  for (const rawLine of record.split("\n")) {
    // A trailing CR is a line terminator (CRLF), never content.
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (line.length === 0 || line.startsWith(":")) {
      // Blank line inside a record (already split) or a comment: ignored.
      continue;
    }
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    // The SSE spec strips exactly one leading space after the colon.
    if (value.startsWith(" ")) {
      value = value.slice(1);
    }
    if (field === "event") {
      eventName = value;
    } else if (field === "data") {
      dataLines.push(value);
    }
    // `id` / `retry` / unknown fields are unused in Phase 1 and ignored.
  }

  if (eventName === undefined && dataLines.length === 0) {
    return null;
  }
  if (eventName === undefined) {
    return malformed("SSE record has no event name.");
  }
  if (dataLines.length === 0) {
    return malformed(`SSE record for event "${eventName}" has no data.`);
  }
  return parseEvent(eventName, dataLines.join("\n"));
}

/**
 * Create a stateful SSE parser.
 *
 * Stateful on purpose: the boundary between two network chunks is not the
 * boundary between two records, so the parser has to remember an incomplete
 * tail. `push` returns only whole records; `flush` handles the final one.
 */
export function createAskSseParser(): AskSseParser {
  let buffer = "";

  function drain(final: boolean): AskSseParseResult[] {
    const results: AskSseParseResult[] = [];

    // Normalise CRLF framing without losing a CR that sits on a chunk boundary:
    // a lone trailing CR stays buffered and pairs with the next chunk's LF.
    buffer = buffer.replace(/\r\n/g, "\n");

    let separator = buffer.indexOf("\n\n");
    while (separator !== -1) {
      const record = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      const result = parseRecord(record);
      if (result) {
        results.push(result);
      }
      separator = buffer.indexOf("\n\n");
    }

    if (final && buffer.trim().length > 0) {
      const result = parseRecord(buffer);
      buffer = "";
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  return {
    push(text: string): AskSseParseResult[] {
      buffer += text;
      return drain(false);
    },
    flush(): AskSseParseResult[] {
      return drain(true);
    },
  };
}

/**
 * Serialize one typed event back to the SSE wire form.
 *
 * Used by the Next route handler that proxies the upstream stream to the
 * browser. Re-serializing (rather than piping bytes) means only events this
 * parser validated ever reach the browser — an invalid upstream record becomes
 * an honest terminal `error`, never a malformed record the client must guess at.
 */
export function serializeAskSseEvent(event: AskSseEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

/**
 * The terminal frame for an unreadable upstream record.
 *
 * `unavailable` is a transport-class `ErrorCode`; the client's reducer maps it
 * to a generic stream failure, which is exactly what happened — the stream could
 * not be read, not that the corpus had no answer.
 */
export function serializeAskSseMalformed(detail: string): string {
  return serializeAskSseEvent({
    event: "error",
    data: { code: "unavailable", detail },
  });
}
