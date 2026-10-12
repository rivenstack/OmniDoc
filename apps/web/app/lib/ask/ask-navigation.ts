/**
 * Ask navigation and presentation decisions — pure logic, no React, no fetch.
 *
 * The interactive half of `/ask` is a client component, and the `web` suite is
 * intentionally Node-only, so the decisions that actually matter live here where
 * they can be tested directly:
 *
 * - **what makes a submittable question** — a trimmed, nonempty draft, and no
 *   request already in flight, so Enter on whitespace or a double submit cannot
 *   spend a request;
 * - **which status the answer block renders** — a total mapping from the session
 *   state to the streaming block's status, so the two cannot disagree;
 * - **where a citation opens** — `/notes/[noteId]`, built from the contract id
 *   (encoded, because a note id is data, not a template literal).
 *
 * It deliberately owns no `next/*` import, so it is usable from a server
 * component, a client component, and a test alike.
 */
import type { Citation } from "@omnidoc/contracts";
import { isAskBusy, type AskSessionStatus } from "./ask-stream";

/** The same-origin endpoint the browser streams the answer from. */
export const ASK_STREAM_PATH = "/ask/stream";

/** The status the `AskAnswer` block understands. */
export type AskAnswerStatus =
  | "generating"
  | "streaming"
  | "completed"
  | "stopped"
  | "failed";

/** The trimmed question a draft represents. */
export function askQuestionFromDraft(draft: string): string {
  return draft.trim();
}

/** Whether the current draft may be submitted from this state. */
export function canSubmitAsk(params: {
  draft: string;
  status: AskSessionStatus;
}): boolean {
  return (
    askQuestionFromDraft(params.draft).length > 0 &&
    !isAskBusy(params.status)
  );
}

/**
 * Map a session status onto the answer block's status, or `null` when there is
 * nothing to render (the idle screen shows its own invitation instead).
 */
export function answerStatus(
  status: AskSessionStatus,
): AskAnswerStatus | null {
  switch (status) {
    case "idle":
      return null;
    case "starting":
    case "generating":
      return "generating";
    case "streaming":
      return "streaming";
    case "completed":
      return "completed";
    case "stopped":
      return "stopped";
    case "failed":
      return "failed";
  }
}

/** The capture route for a cited note. The app owns this mapping. */
export function citationHref(citation: Citation): string {
  return `/notes/${encodeURIComponent(citation.noteId)}`;
}

/**
 * The request body the browser sends to the Ask proxy.
 *
 * Only the question and the workspace **selector** travel; the server re-binds
 * membership and ignores anything it did not ask for. No `mode` is sent, so
 * there is no silent mode switch (`system-ux.md` §2).
 */
export function askRequestBody(params: {
  question: string;
  workspaceId: string;
}): { question: string; workspaceId: string } {
  return { question: params.question, workspaceId: params.workspaceId };
}
