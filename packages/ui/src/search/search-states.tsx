import type { ReactNode } from "react";
import { IconAlertTriangle, IconMessageChatbot, IconSearch } from "@tabler/icons-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../components/empty";
import { Skeleton } from "../components/skeleton";
import { cn } from "../lib/utils";
import { WORKSPACE_FORBIDDEN_MESSAGE } from "../shell/denials";
import { DefaultSearchLink, type SearchLink } from "./search-link";

/**
 * Search block — the screen's non-result states (F-06).
 *
 * These are the F-05 state conventions (`organize/note-list-states.tsx`) applied
 * to retrieve: the same `Empty` / `Skeleton` primitives, the same structure, the
 * same rule that the action is supplied by the caller (because `@omnidoc/ui`
 * owns no routes). Search needs its own sentences, because a search that failed
 * is not a note list that failed.
 *
 * `quality/ui-qa-checklist.md` §5.6 and §5.8 drive the split:
 *
 * - **`SearchIdle`** is the first visit, before a query: not an empty result and
 *   not a failure.
 * - **`SearchEmpty`** is a real zero-match answer. It restates the query (UGC,
 *   `bdi`-isolated) and offers a next step — never a bare "no results".
 * - **`SearchDenied`** is the generic denial, using the shell's single denial
 *   sentence so "not yours" and "does not exist" stay indistinguishable
 *   (`architecture.md` §2).
 * - **`SearchUnavailable`** is a transport-class failure: "we could not ask",
 *   never "nothing matched".
 * - **`SearchValidation`** is the server rejecting the request itself — a third,
 *   distinct class, so a bad request can never be rendered as a broken index.
 * - **`SearchResultsSkeleton`** announces loading exactly once through
 *   `role="status"`; the placeholder rows are `aria-hidden` and the shimmer
 *   collapses under `prefers-reduced-motion` via the global token rule.
 */

export type SearchStateProps = {
  children?: ReactNode;
  className?: string;
};

/** First visit: no query yet. Not an empty result set. */
export function SearchIdle({ children, className }: SearchStateProps) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconSearch aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>Search your notes</EmptyTitle>
        <EmptyDescription>
          Type a query to search this workspace. Matches, excerpts, and their
          order all come from the server — they are shown here as returned.
        </EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}

export type SearchEmptyProps = SearchStateProps & {
  /** The query the server answered zero matches for. UGC — isolated here. */
  query: string;
};

/**
 * A real zero-match answer.
 *
 * The query is restated in `bdi` so a mixed-direction query cannot re-order the
 * sentence, and the caller supplies the recovery action (clear the filter, ask
 * instead, capture a note).
 */
export function SearchEmpty({ query, children, className }: SearchEmptyProps) {
  const trimmed = query.trim();

  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconSearch aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>
          No matches for <bdi>&ldquo;{trimmed}&rdquo;</bdi>
        </EmptyTitle>
        <EmptyDescription>
          Nothing in this workspace matched that query. Try different words,
          clear the corpus filter, or ask a question instead.
        </EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}

/**
 * "We could not ask."
 *
 * Distinct from empty (a real zero-match answer) and from denied (no access) on
 * purpose; reload is the whole recovery, because nothing was searched and
 * nothing was changed.
 */
export function SearchUnavailable({ children, className }: SearchStateProps) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyTitle>Search is unavailable right now</EmptyTitle>
        <EmptyDescription>
          The search service could not be reached, so no results were returned
          and nothing was changed. Reload the page to try again.
        </EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}

/**
 * The generic denial for a workspace this session cannot search.
 *
 * Same sentence as the note list and the shell: the difference between "no such
 * workspace" and "not yours" would let a probe map which ids are real.
 */
export function SearchDenied({ children, className }: SearchStateProps) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyTitle>{WORKSPACE_FORBIDDEN_MESSAGE}</EmptyTitle>
        <EmptyDescription>
          It may not exist, or it may not be shared with you.
        </EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}

/**
 * The server rejected the request (`400`).
 *
 * A third class on purpose: rendering a rejected request as "no results" would
 * tell the reader the corpus is empty when only the request was wrong.
 */
export function SearchValidation({ children, className }: SearchStateProps) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconAlertTriangle aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>That search could not be run</EmptyTitle>
        <EmptyDescription>
          The server rejected the request as invalid, so nothing was searched and
          nothing was changed. Adjust the query and try again.
        </EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}

export type SearchResultsSkeletonProps = {
  rows?: number;
  /** Announced once. Keep it a sentence a screen reader can say on its own. */
  label?: string;
  className?: string;
};

/** Loading state while the server answers the first query for this URL. */
export function SearchResultsSkeleton({
  rows = 5,
  label = "Searching your notes",
  className,
}: SearchResultsSkeletonProps) {
  return (
    <div role="status" className={cn("flex flex-col gap-4", className)}>
      <span className="sr-only">{label}</span>
      <ul
        role="list"
        aria-hidden="true"
        className="divide-y divide-border border-y border-border"
      >
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex min-w-0 flex-col gap-2 px-3 py-3.5">
            <Skeleton className="h-4 w-full max-w-96" />
            <Skeleton className="h-4 w-2/5 max-w-64" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export type SearchingNoticeProps = {
  label?: string;
  className?: string;
};

/**
 * In-flight notice for a debounced as-you-type search.
 *
 * `role="status"` so the wait is announced once; the sentence is deliberately
 * plain, because the previous results are still on screen and the honest thing
 * to say is that a new search is running.
 */
export function SearchingNotice({
  label = "Searching\u2026",
  className,
}: SearchingNoticeProps) {
  return (
    <p
      role="status"
      className={cn("text-sm text-muted-foreground", className)}
    >
      {label}
    </p>
  );
}

/**
 * The quiet pivot to Ask (`/ask`, owned by F-07).
 *
 * Search and Ask are different operations (`system-ux.md` §1), so the pivot is
 * a link and nothing more — this slice never runs an answer. The link component
 * is injected like every other search link, so the app keeps `next/link`.
 */
export type SearchAskPivotProps = {
  href: string;
  linkComponent?: SearchLink;
  className?: string;
};

export function SearchAskPivot({
  href,
  linkComponent: Link = DefaultSearchLink,
  className,
}: SearchAskPivotProps) {
  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground",
        className,
      )}
    >
      <IconMessageChatbot aria-hidden="true" className="size-4 shrink-0" />
      <span>Looking for an answer instead of matches?</span>
      <Link
        href={href}
        className="rounded-sm font-medium text-foreground underline underline-offset-4 outline-none hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring"
      >
        Ask your notes
      </Link>
    </p>
  );
}
