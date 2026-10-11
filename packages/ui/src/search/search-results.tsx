import { IconAlertTriangle } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Badge } from "../components/badge";
import { cn } from "../lib/utils";
import { DefaultSearchLink, type SearchLink } from "./search-link";

/**
 * Search block — `SearchResults` (F-06).
 *
 * The server owns hits, snippets, ordering and `degraded`
 * (`docs/design/system-ux.md` §2). This block renders what it receives:
 *
 * - **Snippets are printed verbatim, as text.** B-07 returns a
 *   whitespace-flattened plain-text window with `...` markers and **no**
 *   highlight markup, so any client-side highlighting would be the client
 *   inventing match boundaries. React escapes the text, so a snippet that
 *   contains markup shows as literal characters.
 * - **Snippets are UGC and are `bdi`-isolated.** A mixed-direction excerpt must
 *   not be able to re-order the row (`quality/ui-qa-checklist.md` §6.5, §7.3).
 * - **Long unbroken strings do not widen the page.** `wrap-anywhere` plus
 *   `min-w-0` on every box in the chain keeps a pasted base64 fragment or a long
 *   URL inside the ~390px viewport instead of producing horizontal scroll
 *   (§5.9).
 * - **No score is shown.** `SearchHit.score` travels in the projection so no
 *   contract field is dropped, but a raw fusion score is not a relevance label a
 *   reader can interpret, and inventing one ("best match") would be a claim the
 *   server never made.
 * - **The result count is the one `role="status"`.** It announces the count
 *   once per result update, and when the server says the retrieval was
 *   degraded the incomplete-results notice lives *inside* the same announcement
 *   so the two facts are never separated (§5.7, §5.8).
 *
 * Links are injected (rows open the capture route `/notes/[noteId]`); the block
 * itself owns no routes and no `next/link` dependency.
 */

/** The row shape the list renders — the projection of contract `SearchHit`. */
export type SearchResult = {
  chunkId: string;
  noteId: string;
  versionId: string;
  /** Kept for contract fidelity; deliberately not rendered. */
  score: number;
  snippet: string;
  corpusOwnership?: "sample" | "mine";
};

/** Shown when the server returned an empty excerpt rather than inventing one. */
export const NO_SNIPPET_LABEL = "No excerpt returned for this match.";

export type SearchDegradedNoticeProps = {
  children?: ReactNode;
  className?: string;
};

/**
 * The honest incomplete-results notice for `degraded: true`.
 *
 * This is a statement about the *index*, not about ranking: the server reported
 * a partial/degraded retrieval, so matches may exist that were never considered.
 * It carries an icon and text, never colour alone.
 */
export function SearchDegradedNotice({
  children,
  className,
}: SearchDegradedNoticeProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-start",
        className,
      )}
    >
      <IconAlertTriangle
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
      />
      <div className="flex min-w-0 flex-col gap-0.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          Results may be incomplete
        </span>
        <span className="wrap-anywhere">
          {children ??
            "Part of the index was unavailable, so these are the matches the server could return. They are real results — treat the list as unfinished rather than complete."}
        </span>
      </div>
    </div>
  );
}

export type SearchResultsProps = {
  hits: readonly SearchResult[];
  /** `SearchResults.degraded` from the server. Never inferred client-side. */
  degraded?: boolean;
  /**
   * The bounded `topK` this request used. Only used to say honestly that the
   * list may be capped — the contract returns no total.
   */
  topK?: number;
  /** Route for one hit. The app owns routing. */
  hrefForHit: (hit: SearchResult) => string;
  linkComponent?: SearchLink;
  className?: string;
};

export function SearchResults({
  hits,
  degraded = false,
  topK,
  hrefForHit,
  linkComponent: Link = DefaultSearchLink,
  className,
}: SearchResultsProps) {
  const countLabel = hits.length === 1 ? "1 match" : `${hits.length} matches`;
  const capped = topK !== undefined && hits.length >= topK;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div role="status" className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{countLabel}</p>
        {degraded && <SearchDegradedNotice />}
      </div>
      {capped && (
        <p className="text-xs text-muted-foreground">
          Showing the top {topK}. Add words to narrow the search.
        </p>
      )}
      {/*
        `role="list"` is explicit: the shared Tailwind reset removes list
        markers, and Safari drops list semantics when `list-style` is none.
      */}
      <ul role="list" className="divide-y divide-border border-y border-border">
        {hits.map((hit) => (
          <SearchResultRow
            key={hit.chunkId}
            hit={hit}
            href={hrefForHit(hit)}
            linkComponent={Link}
          />
        ))}
      </ul>
    </div>
  );
}

function SearchResultRow({
  hit,
  href,
  linkComponent: Link,
}: {
  hit: SearchResult;
  href: string;
  linkComponent: SearchLink;
}) {
  const snippet = hit.snippet.trim();

  return (
    <li className="min-w-0">
      <Link
        href={href}
        className="flex min-w-0 flex-col gap-1.5 rounded-lg px-3 py-3 outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span className="block min-w-0 wrap-anywhere text-sm text-foreground">
          {/* Server text, verbatim — no client-side highlighting. */}
          <bdi>{snippet.length > 0 ? snippet : NO_SNIPPET_LABEL}</bdi>
        </span>
        {hit.corpusOwnership === "sample" && (
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            {/*
              Sample vs mine is real data (`system-ux.md` §1), so the row says
              so whenever the server sends `corpusOwnership: sample`.
            */}
            <Badge variant="outline">Sample</Badge>
          </span>
        )}
      </Link>
    </li>
  );
}
