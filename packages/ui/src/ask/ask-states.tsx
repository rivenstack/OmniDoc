import type { ReactNode } from "react";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
  IconMessageChatbot,
  IconPlayerStopFilled,
} from "@tabler/icons-react";
import type { AskOutcome } from "@omnidoc/contracts";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../components/empty";
import { cn } from "../lib/utils";
import { WORKSPACE_FORBIDDEN_MESSAGE } from "../shell/denials";

/**
 * Ask block — the screen's outcome and failure states.
 *
 * Ask splits the world into three classes, and `docs/api/ask-sse.md` is blunt
 * that they must never be conflated (`quality/ui-qa-checklist.md` §5.3, §5.8):
 *
 * 1. **Success outcomes** — `supported`, `partial`, `no_supported_answer`,
 *    `conflict`, `refused_policy`. All five are *successful* answers delivered
 *    on a 200 stream (`architecture.md` §4). Refusal is honest, not an error, so
 *    it is never styled as a broken page.
 * 2. **Terminal stream errors** — `truncated` (cut early) and `error` (transport
 *    or policy failure after the stream opened). Error + retry.
 * 3. **Pre-stream failures** — the request never produced a stream (denied,
 *    validation, unavailable, `mode_forbidden`, quota, session). Error + retry.
 *
 * `@user` chose **one honest block set with distinct copy** (2026-10-12), so the
 * structure is shared and only the sentence changes; refusal and
 * partial-support use neutral/info treatment, never danger styling.
 */

/**
 * The failure vocabulary the Ask state machine produces.
 *
 * This is the *view* vocabulary (owned here, like `SearchResult`), so the app's
 * state machine imports the type instead of redefining it.
 */
export type AskFailureClass =
  | "denied"
  | "mode_forbidden"
  | "validation"
  | "quota_exhausted"
  | "unavailable"
  | "unauthenticated"
  | "truncated"
  | "stream_error"
  | "malformed";

export type AskFailure = {
  class: AskFailureClass;
  /** Server detail text. Rendered as text — never invented. */
  detail?: string;
  /** Present for `mode_forbidden` / `quota_exhausted`. */
  mode?: string;
};

const MODE_LABELS: Record<string, string> = {
  mock: "the sample (mock) mode",
  operator_free_tier: "the operator-funded live demo",
  customer_key: "your own key",
};

/** Friendly name for a runtime mode, or `undefined` when the server did not say. */
export function askModeLabel(mode: string | undefined): string | undefined {
  return mode ? MODE_LABELS[mode] : undefined;
}

type FailureCopy = {
  title: string;
  description: string;
  /** `retry` = a truthful "try again"; `session` = sign in again. */
  recovery: "retry" | "session";
};

/**
 * The one sentence per failure class.
 *
 * `mode_forbidden` and `quota_exhausted` name the mode and say that mock answers
 * still work (`ui-qa-checklist.md` §9.4): production AI stays dark, and a gated
 * live mode must never look like Ask as a whole is broken.
 */
export function askFailureCopy(failure: AskFailure): FailureCopy {
  const mode = askModeLabel(failure.mode);

  switch (failure.class) {
    case "denied":
      return {
        title: WORKSPACE_FORBIDDEN_MESSAGE,
        description: "It may not exist, or it may not be shared with you.",
        recovery: "retry",
      };
    case "mode_forbidden":
      return {
        title: "Ask is not available in that mode",
        description: `${mode ? `Ask cannot run in ${mode} right now. ` : "That runtime mode is unavailable right now. "}This is the honest, fail-closed state — Ask never falls back to another mode silently. The sample (mock) mode still answers.`,
        recovery: "retry",
      };
    case "quota_exhausted":
      return {
        title: "The answer quota is used up",
        description: `${mode ? `The ${mode} budget is exhausted. ` : "The live quota is exhausted. "}Wait for it to reset, or switch to the sample (mock) mode, which still answers.`,
        recovery: "retry",
      };
    case "validation":
      return {
        title: "That question could not be asked",
        description:
          "The server rejected the request as invalid, so nothing was searched and nothing was changed. Reword the question and try again.",
        recovery: "retry",
      };
    case "unauthenticated":
      return {
        title: "Your session ended",
        description:
          "Ask needs an active session. Sign in again to keep asking your notes.",
        recovery: "session",
      };
    case "truncated":
      return {
        title: "The answer was cut off",
        description:
          "The stream ended before a complete answer arrived. The partial text above is not a finished answer. Try again.",
        recovery: "retry",
      };
    case "stream_error":
      return {
        title: "The answer stream failed",
        description:
          "The connection broke after the answer started, so no complete answer was delivered. Nothing was written to your notes. Try again.",
        recovery: "retry",
      };
    case "malformed":
      return {
        title: "The answer could not be read",
        description:
          "The server sent a frame this client could not trust, so it was not shown as an answer. Try again.",
        recovery: "retry",
      };
    case "unavailable":
      return {
        title: "Ask is unavailable right now",
        description:
          "The answer service could not be reached, so no answer was produced and nothing was changed. Try again in a moment.",
        recovery: "retry",
      };
  }
}

export type AskStateProps = {
  children?: ReactNode;
  className?: string;
};

/**
 * First visit: nothing asked yet. Not an error and not an empty answer.
 */
export function AskIdle({ children, className }: AskStateProps) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconMessageChatbot aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>Ask your notes</EmptyTitle>
        <EmptyDescription>
          Ask a question and get an answer cited to passages in your own notes.
          An honest &ldquo;no supported answer&rdquo; is a real result, not an
          error — Ask never invents prose the corpus cannot back.
        </EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}

/**
 * The failure block: one honest sentence per class, with the caller's recovery
 * action. `detail` (a server string) is shown as text when present, so the
 * server's own words are never hidden behind the client's.
 */
export type AskFailureStateProps = AskStateProps & {
  failure: AskFailure;
  /** Omit the server detail line (used by the page-level shell state). */
  showDetail?: boolean;
};

export function AskFailureState({
  failure,
  showDetail = true,
  children,
  className,
}: AskFailureStateProps) {
  const copy = askFailureCopy(failure);
  const detail = failure.detail?.trim();

  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconAlertTriangle aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{copy.title}</EmptyTitle>
        <EmptyDescription>{copy.description}</EmptyDescription>
        {showDetail && detail ? (
          <EmptyDescription>
            <bdi className="wrap-anywhere">{detail}</bdi>
          </EmptyDescription>
        ) : null}
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}

/**
 * "Stopped." The user closed the stream, so the text on screen is partial.
 *
 * `docs/api/ask-sse.md` is explicit: partial UI text after cancel is a client
 * state, **not** a `completed` outcome. The copy says so rather than presenting
 * a half-answer as a finished one.
 */
export function AskStopped({ children, className }: AskStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-start",
        className,
      )}
    >
      <IconPlayerStopFilled
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
      />
      <div className="flex min-w-0 flex-col gap-0.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Stopped</span>
        <span className="wrap-anywhere">
          You stopped this answer. The text above is partial and is not a
          finished, cited answer.
        </span>
      </div>
      {children}
    </div>
  );
}

/**
 * The success-outcome notice for the four outcomes that need a word of context.
 *
 * `supported` renders nothing here — a fully cited answer speaks for itself. The
 * other four use a neutral/info treatment (never danger): refusal, partial
 * support, and conflict are successful answers
 * (`architecture.md` §4, `ui-qa-checklist.md` §5.3, §9.3).
 */
export type AskOutcomeNoticeProps = AskStateProps & {
  outcome: AskOutcome;
};

const OUTCOME_COPY: Partial<Record<AskOutcome, string>> = {
  partial:
    "Partial support: some parts of this answer are not backed by a cited passage. The cited parts are listed below.",
  no_supported_answer:
    "No supported answer: your notes do not contain enough to answer this. That is an honest result, not an error.",
  conflict:
    "Your sources disagree on this. Both sides are shown in the citations — Ask does not silently pick a winner.",
  refused_policy:
    "The model declined this request under its safety policy. Nothing was answered and nothing was changed.",
};

export function AskOutcomeNotice({
  outcome,
  children,
  className,
}: AskOutcomeNoticeProps) {
  if (outcome === "supported") {
    return null;
  }
  const copy = OUTCOME_COPY[outcome];
  if (!copy) {
    return null;
  }
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-start",
        className,
      )}
    >
      <IconInfoCircle
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
      />
      <div className="flex min-w-0 flex-col gap-0.5 text-xs text-muted-foreground">
        <span className="wrap-anywhere">{copy}</span>
        {children}
      </div>
    </div>
  );
}

/**
 * The quiet "cited" marker for a fully supported answer.
 *
 * A `supported` outcome is the ordinary case, so it gets a one-line confirmation
 * rather than a notice box — the citations themselves are the evidence.
 */
export function AskSupportedMarker({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <IconCircleCheck aria-hidden="true" className="size-4 shrink-0" />
      Cited to your notes
    </p>
  );
}
