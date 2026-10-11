/**
 * Search URL state — pure logic, no Next and no fetch.
 *
 * The search screen keeps its state in the URL, the way the F-05 lists keep
 * their cursor chain there: the view is shareable, reloadable, operable with
 * JavaScript off, and there is no second, client-side authority for what is
 * being searched.
 *
 * Only two parameters exist, and both are contract fields:
 *
 * | Parameter | Contract field | Notes |
 * | --- | --- | --- |
 * | `q` | `SearchRequest.query` | trimmed; an empty query is the idle screen |
 * | `corpus` | `SearchRequest.corpusOwnership` | `sample` \| `mine`; absent means "all" |
 *
 * Anything else in the URL is ignored rather than forwarded — an unknown corpus
 * value must never reach the API as a filter, because the contract would reject
 * it and the user would see a validation failure they did not cause.
 */
import type { components } from "@omnidoc/contracts";

export type CorpusOwnership = components["schemas"]["CorpusOwnership"];

export const SEARCH_BASE_PATH = "/search";
export const SEARCH_QUERY_PARAM = "q";
export const SEARCH_CORPUS_PARAM = "corpus";

/** The corpus filter values the UI offers — exactly the contract's enum. */
export const SEARCH_CORPUS_VALUES = ["sample", "mine"] as const;
export type SearchCorpus = (typeof SEARCH_CORPUS_VALUES)[number];

export type SearchParams = {
  /** Trimmed query. Empty string is the idle state, not a request. */
  query: string;
  /** `null` means "all" — the parameter is not sent at all. */
  corpus: SearchCorpus | null;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}

export function isSearchCorpus(value: string | undefined): value is SearchCorpus {
  return (
    value !== undefined &&
    (SEARCH_CORPUS_VALUES as readonly string[]).includes(value)
  );
}

/** Read the Next `searchParams` object into the two parameters this screen owns. */
export function readSearchParams(
  params: { q?: string | string[]; corpus?: string | string[] } = {},
): SearchParams {
  const query = firstValue(params.q)?.trim() ?? "";
  const corpus = firstValue(params.corpus)?.trim();
  return { query, corpus: isSearchCorpus(corpus) ? corpus : null };
}

/**
 * The `href` for a search state.
 *
 * Used for the no-JS submit target, the filter chips, and the debounced
 * as-you-type navigation — one builder, so the three can never disagree about
 * which fields are sent.
 */
export function searchHref(params: {
  query: string;
  corpus?: SearchCorpus | null;
}): string {
  const query = params.query.trim();
  const search = new URLSearchParams();
  if (query.length > 0) {
    search.set(SEARCH_QUERY_PARAM, query);
  }
  if (params.corpus) {
    search.set(SEARCH_CORPUS_PARAM, params.corpus);
  }
  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return `${SEARCH_BASE_PATH}${suffix}`;
}
