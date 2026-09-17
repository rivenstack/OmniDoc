// Keep this export: apps/web still imports appName (outside S-02 write path).
export const appName = "OmniDoc";

export type { components, paths } from "./generated/openapi";
export {
  ASK_SSE_EVENT_NAMES,
  ASK_SUCCESS_OUTCOMES,
  TERMINAL_ASK_SSE_EVENTS,
} from "./ask-sse";
export type {
  Answer,
  AskOutcome,
  AskSseClaim,
  AskSseCompleted,
  AskSseError,
  AskSseEvent,
  AskSseEventName,
  AskSseGenerating,
  AskSseTruncated,
  Citation,
  ErrorBody,
} from "./ask-sse";
