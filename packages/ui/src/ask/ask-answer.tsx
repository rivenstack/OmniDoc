import type { Answer, Citation } from "@omnidoc/contracts";
import { cn } from "../lib/utils";
import { Markdown } from "../markdown";
import { AskCitations } from "./ask-citations";
import { DefaultAskLink, type AskLink } from "./ask-link";
import { AskOutcomeNotice, AskSupportedMarker } from "./ask-states";

/**
 * Ask block — `AskAnswer`, the streaming answer.
 *
 * Three rules from `docs/api/ask-sse.md` / `architecture.md` §4 shape it:
 *
 * - **The server owns the answer text, the claims, the `outcome`, and the
 *   citations.** This block renders what it received and nothing more; it never
 *   invents prose, a claim, an `outcome`, or a citation.
 * - **Answer prose renders through the sanitized `Markdown` block.** The single
 *   F-12 render path is the only place markdown is turned into DOM, so hostile
 *   content in a claim or answer cannot execute (`ui-qa-checklist.md` §6.6).
 * - **Streaming is announced once, not token by token**
 *   (`ui-qa-checklist.md` §2.2): a single `role="status"` region says
 *   "Generating answer" when the stream opens and "Answer ready" when it
 *   completes. Claims appended in between do not change that text, so a screen
 *   reader hears the wait once and the result once.
 *
 * `@user` chose **quiet, no card** (2026-10-12): the answer is prose on the
 * canvas with hairline-separated citations, following the F-05/F-06 conventions.
 * Typography is deliberately minimal — the answer-prose scale is still open
 * (F-12 shipped behaviour-only).
 */

/** One appended claim unit with its citations — the `claim` SSE payload. */
export type AskClaimUnit = {
  text: string;
  citations: Citation[];
};

export type AskAnswerProps = {
  status: "generating" | "streaming" | "completed" | "stopped" | "failed";
  claims: readonly AskClaimUnit[];
  answer: Answer | null;
  /** Route for one citation. The app owns routing. */
  hrefForCitation: (citation: Citation) => string;
  lang?: string;
  linkComponent?: AskLink;
  className?: string;
};

export function AskAnswer({
  status,
  claims,
  answer,
  hrefForCitation,
  lang,
  linkComponent,
  className,
}: AskAnswerProps) {
  // Only two announcements, ever: the wait, then the result (§2.2). Text that
  // does not change is not re-announced, so appending claims stays silent.
  const announcement =
    status === "completed"
      ? "Answer ready"
      : status === "generating" || status === "streaming"
        ? "Answer generating"
        : "";

  const prose = answer
    ? answer.text
    : claims.map((claim) => claim.text).join("\n\n");
  const hasProse = prose.trim().length > 0;

  return (
    <div className={cn("flex min-w-0 flex-col gap-4", className)}>
      {announcement ? (
        <p role="status" className="sr-only">
          {announcement}
        </p>
      ) : null}

      {hasProse ? (
        <Markdown
          source={prose}
          className="wrap-anywhere text-sm leading-relaxed text-foreground"
        />
      ) : status === "generating" || status === "streaming" ? (
        <p className="text-sm text-muted-foreground">
          Generating answer&hellip;
        </p>
      ) : null}

      {answer ? (
        <div className="flex flex-col gap-3">
          {answer.outcome === "supported" ? (
            <AskSupportedMarker />
          ) : (
            <AskOutcomeNotice outcome={answer.outcome} />
          )}
          <AskCitations
            citations={answer.citations}
            hrefForCitation={hrefForCitation}
            lang={lang}
            linkComponent={linkComponent}
          />
        </div>
      ) : claims.length > 0 ? (
        <AskCitations
          citations={claims.flatMap((claim) => claim.citations)}
          hrefForCitation={hrefForCitation}
          lang={lang}
          linkComponent={linkComponent}
        />
      ) : null}
    </div>
  );
}
