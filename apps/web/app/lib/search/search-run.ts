/**
 * Search screen data path — the route-facing run, with the port injected.
 *
 * `apps/web/app/lib/notes/notes-pages.ts` walks the note pages; this module does
 * the same job for retrieve: turn the URL parameters plus a resolved workspace
 * into exactly one screen outcome, and project the contract hits onto what the
 * blocks render.
 *
 * The port arrives as a **parameter** (defaulting to the real `searchNotes`) for
 * two reasons:
 *
 * - the route's data path is testable without a running API, so every outcome —
 *   results, degraded, empty, denial, validation, unavailable, idle — is covered
 *   by a test rather than by reading the code;
 * - there is one place that decides what is asked for, so the constraint holds
 *   mechanically: an empty query never reaches the API (the contract requires
 *   `minLength: 1`), and `corpusOwnership` is only sent when the filter is
 *   actually active.
 *
 * `unauthorized` collapses into `unavailable` here, exactly as the note loaders
 * do: an expired session is "we could not ask", and the authenticated shell has
 * already resolved the session before this route renders.
 */
import type { SearchResult } from "@omnidoc/ui";

import type { ApiJar } from "../api/transport";
import { SEARCH_TOP_K_DEFAULT, searchNotes, type SearchHit } from "./search-api";
import type { SearchParams } from "./search-query";

export type SearchScreenOutcome =
  | { status: "idle" }
  | {
      status: "results";
      hits: SearchResult[];
      degraded: boolean;
      topK: number;
    }
  | { status: "no_results"; query: string }
  | { status: "denied" }
  | { status: "validation" }
  | { status: "unavailable" };

/** The injectable port. */
export type SearchPort = typeof searchNotes;

/**
 * Project a contract `SearchHit` onto what a row renders.
 *
 * Every contract field is kept — including `score`, which is deliberately not
 * displayed (a fusion score is not a relevance label, and the client must not
 * invent one). Nothing is added: the contract carries no note title, so the row
 * is snippet-led.
 */
export function toSearchResult(hit: SearchHit): SearchResult {
  const result: SearchResult = {
    chunkId: hit.chunkId,
    noteId: hit.noteId,
    versionId: hit.versionId,
    score: hit.score,
    snippet: hit.snippet,
  };
  if (hit.corpusOwnership !== undefined) {
    result.corpusOwnership = hit.corpusOwnership;
  }
  return result;
}

export async function runSearch(
  workspaceId: string,
  jar: ApiJar,
  params: SearchParams,
  port: SearchPort = searchNotes,
): Promise<SearchScreenOutcome> {
  if (params.query.length === 0) {
    return { status: "idle" };
  }

  const topK = SEARCH_TOP_K_DEFAULT;
  const outcome = await port(
    {
      query: params.query,
      topK,
      ...(params.corpus ? { corpusOwnership: params.corpus } : {}),
    },
    jar,
    workspaceId,
  );

  switch (outcome.status) {
    case "results":
      return outcome.hits.length === 0
        ? { status: "no_results", query: params.query }
        : {
            status: "results",
            hits: outcome.hits.map(toSearchResult),
            degraded: outcome.degraded,
            topK,
          };
    case "forbidden":
      return { status: "denied" };
    case "validation":
      return { status: "validation" };
    case "unauthorized":
    case "unavailable":
      return { status: "unavailable" };
  }
}
