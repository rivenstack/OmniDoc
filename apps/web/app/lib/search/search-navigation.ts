/**
 * When typing should commit a search — pure logic, no React, no router.
 *
 * The interactive half of `/search` is a client component, which this project
 * tests without a DOM (the `web` suite is intentionally Node-only). So the one
 * decision that actually matters lives here instead: *does the draft in the
 * field differ from the query the URL already represents?*
 *
 * It has to be answered exactly this way, or the screen breaks in two familiar
 * ways:
 *
 * - committing on every keystroke (or on an unchanged value) re-runs the same
 *   server search and floods the API with requests nobody asked for;
 * - comparing against the raw draft rather than its trimmed form makes trailing
 *   whitespace look like a new query.
 */
import { searchHref, type SearchCorpus } from "./search-query";

export type PendingSearch = {
  /** The trimmed query to commit. */
  query: string;
  /** The URL the commit should land on. */
  href: string;
};

/**
 * The next search to commit, or `null` when the draft changes nothing.
 *
 * `committedQuery` is the query the URL currently represents; `draftQuery` is
 * what the field holds right now.
 */
export function pendingSearch(params: {
  committedQuery: string;
  draftQuery: string;
  corpus: SearchCorpus | null;
}): PendingSearch | null {
  const query = params.draftQuery.trim();
  if (query === params.committedQuery.trim()) {
    return null;
  }
  return { query, href: searchHref({ query, corpus: params.corpus }) };
}
