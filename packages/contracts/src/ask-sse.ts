import type { components } from "./generated/openapi";

/**
 * Ask SSE event names. Canonical prose: docs/api/ask-sse.md.
 * JSON payloads are OpenAPI components AskSse*.
 */
export const ASK_SSE_EVENT_NAMES = [
  "generating",
  "claim",
  "completed",
  "truncated",
  "error",
] as const;

export type AskSseEventName = (typeof ASK_SSE_EVENT_NAMES)[number];

export type AskSseGenerating = components["schemas"]["AskSseGenerating"];
export type AskSseClaim = components["schemas"]["AskSseClaim"];
export type AskSseCompleted = components["schemas"]["AskSseCompleted"];
export type AskSseTruncated = components["schemas"]["AskSseTruncated"];
export type AskSseError = components["schemas"]["AskSseError"];
export type AskOutcome = components["schemas"]["AskOutcome"];
export type Citation = components["schemas"]["Citation"];
export type Answer = components["schemas"]["Answer"];
export type ErrorBody = components["schemas"]["ErrorBody"];

export type AskSseEvent =
  | { event: "generating"; data: AskSseGenerating }
  | { event: "claim"; data: AskSseClaim }
  | { event: "completed"; data: AskSseCompleted }
  | { event: "truncated"; data: AskSseTruncated }
  | { event: "error"; data: AskSseError };

export const ASK_SUCCESS_OUTCOMES = [
  "supported",
  "partial",
  "no_supported_answer",
  "conflict",
  "refused_policy",
] as const satisfies readonly AskOutcome[];

export const TERMINAL_ASK_SSE_EVENTS = [
  "completed",
  "truncated",
  "error",
] as const satisfies readonly AskSseEventName[];
