import type { Metadata } from "next";
import { appName } from "@omnidoc/contracts";
import { AskFailureState, ContentRegion, PageHeader } from "@omnidoc/ui";
import { loadAskForRoute } from "../../lib/ask/ask-loader";
import { AskClient } from "./ask-client";

export const metadata: Metadata = {
  title: `Ask — ${appName}`,
};

/**
 * Ask — its own operation, separate from Search (F-07, `system-ux.md` §1/§2).
 *
 * The page is a server component: it resolves the current workspace from session
 * membership and hands the id to the client stream. The question itself never
 * carries workspace authority — the same-origin proxy (`/ask/stream`)
 * re-authorizes the selector against the session before it opens the upstream
 * stream.
 *
 * When there is no workspace to ask against, the page renders the honest failure
 * in place of the composer rather than a box that cannot work.
 */
export default async function AskPage() {
  const outcome = await loadAskForRoute();

  return (
    <ContentRegion>
      <PageHeader
        title="Ask"
        description="Ask your notes and get an answer cited to passages in your own sources. Refusal, partial support, and conflict are honest results, not errors."
      />
      {outcome.status === "failure" ? (
        <AskFailureState failure={outcome.failure} />
      ) : (
        <>
          {/*
            Ask streams a cited answer, so it is one of the few surfaces that
            genuinely needs JavaScript. Say so instead of leaving a form that
            silently does nothing.
          */}
          <noscript>
            <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              Ask streams its answer, so it needs JavaScript enabled. Search
              works without it.
            </p>
          </noscript>
          <AskClient workspaceId={outcome.workspaceId} />
        </>
      )}
    </ContentRegion>
  );
}
