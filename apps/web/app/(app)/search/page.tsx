import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { appName } from "@omnidoc/contracts";
import {
  ContentRegion,
  PageHeader,
  SearchAskPivot,
  SearchDenied,
  SearchEmpty,
  SearchIdle,
  SearchResults,
  SearchResultsSkeleton,
  SearchUnavailable,
  SearchValidation,
  type SearchResult,
} from "@omnidoc/ui";
import { loadSearchForRoute } from "../../lib/search/search-loader";
import {
  readSearchParams,
  searchHref,
  type SearchParams,
} from "../../lib/search/search-query";
import { SearchAskLink, SearchHitLink } from "./search-links";
import { SearchControls } from "./search-controls";

export const metadata: Metadata = {
  title: `Search — ${appName}`,
};

const ASK_PATH = "/ask";

/** Rows open the existing capture route; the id is contract-owned, so encode it. */
function hitHref(hit: SearchResult): string {
  return `/notes/${encodeURIComponent(hit.noteId)}`;
}

/** The recovery link for a zero-match answer: drop the corpus filter. */
function clearFilterHref(params: SearchParams): string {
  return searchHref({ query: params.query, corpus: null });
}

/**
 * Search — its own operation, separate from Ask (F-06, `system-ux.md` §1/§2).
 *
 * The screen keeps its state in the URL and lets the **server** answer: the
 * query field below debounces into `?q=`, the chips carry `?corpus=`, and every
 * hit, snippet, and ordering decision comes back from the search port rendered
 * as text. The client re-ranks nothing, re-highlights nothing, and caches no
 * answer.
 *
 * The results region is a Suspense boundary *inside* the page so the field, the
 * chips, and focus survive a search: a route-level `loading.tsx` would replace
 * the whole page body, unmount the focused input, and drop the reader to the top
 * of the document on every debounced keystroke.
 *
 * Honest states are the point of the slice, so each one is its own block: idle
 * (no query), zero matches, degraded index, generic denial, rejected request,
 * and unreachable service. Nothing here renders a plausible list it did not
 * receive.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; corpus?: string | string[] }>;
}) {
  const params = readSearchParams(await searchParams);

  return (
    <ContentRegion>
      <PageHeader
        title="Search"
        description="Search is its own operation, separate from Ask. Matches, excerpts, and their order come from the server."
      />
      <SearchControls query={params.query} corpus={params.corpus}>
        <Suspense fallback={<SearchResultsSkeleton />}>
          <SearchOutcome params={params} />
        </Suspense>
      </SearchControls>
    </ContentRegion>
  );
}

/**
 * The results region. Split out so it can suspend behind the skeleton while the
 * field above it stays interactive.
 */
async function SearchOutcome({ params }: { params: SearchParams }) {
  const outcome = await loadSearchForRoute(params);

  switch (outcome.status) {
    case "idle":
      return <SearchIdle />;
    case "denied":
      return <SearchDenied />;
    case "validation":
      return <SearchValidation />;
    case "unavailable":
      return <SearchUnavailable />;
    case "no_results":
      return (
        <SearchEmpty query={outcome.query}>
          <SearchAskPivot href={ASK_PATH} linkComponent={SearchAskLink} />
          {params.corpus !== null && (
            <Link
              href={clearFilterHref(params)}
              className="rounded-sm text-sm text-muted-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              Clear the corpus filter
            </Link>
          )}
        </SearchEmpty>
      );
    case "results":
      return (
        <div className="flex flex-col gap-6">
          <SearchResults
            hits={outcome.hits}
            degraded={outcome.degraded}
            topK={outcome.topK}
            hrefForHit={hitHref}
            linkComponent={SearchHitLink}
          />
          {/*
            The quiet pivot to Ask. F-07 owns the destination; this slice only
            offers the different operation.
          */}
          <SearchAskPivot href={ASK_PATH} linkComponent={SearchAskLink} />
        </div>
      );
  }
}

