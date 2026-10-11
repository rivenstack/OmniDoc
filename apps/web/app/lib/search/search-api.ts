/**
 * Search port — the only place the frontend talks to search.
 *
 * A typed adapter over `docs/api/openapi.yaml` (S-02, `Search` tag):
 * `POST /api/v1/search/lexical` and `POST /api/v1/search/hybrid`. Everything it
 * returns is a contract type from `@omnidoc/contracts`; no shape is forked here.
 *
 * Three rules from `architecture.md` / `docs/design/system-ux.md` §2 shape it:
 *
 * - **Search and Ask are different ports.** This module never asks a question,
 *   and the browser never reaches the API — the request goes out server-side
 *   through the shared transport, which relays the session cookies.
 * - **A workspace id selects; it does not authorize.** The id travels as the
 *   `OmniDoc-Workspace-Id` selector header and the server re-binds membership
 *   from the session. A mismatch is a generic denial.
 * - **The server owns hits, snippets, ordering, and `degraded`.** The port
 *   validates what came back and reports outcomes; it never invents a hit, never
 *   re-ranks, never rewrites a snippet, and never derives `degraded`.
 *
 * The default path is **hybrid**: B-07's deterministic fusion already includes
 * the lexical pass (`docs/quality/b07-retrieval-evaluation.md`), so a
 * user-facing retrieval-mode toggle would be a distinction the product does not
 * need — and one the contract does not offer.
 *
 * Outcomes are total, like the identity and notes ports: transport problems come
 * back as `unavailable` rather than throwing, so "we could not ask" and "nothing
 * matched" stay different states.
 */
import type { components } from "@omnidoc/contracts";

import { readJson, sendApiRequest, type ApiJar } from "../api/transport";

export type SearchRequest = components["schemas"]["SearchRequest"];
export type SearchHit = components["schemas"]["SearchHit"];
export type SearchResults = components["schemas"]["SearchResults"];
export type CorpusOwnership = components["schemas"]["CorpusOwnership"];

export const LEXICAL_SEARCH_PATH = "/api/v1/search/lexical";
export const HYBRID_SEARCH_PATH = "/api/v1/search/hybrid";

/** Contract default (`SearchRequest.topK`). */
export const SEARCH_TOP_K_DEFAULT = 10;
/** Contract ceiling (`SearchRequest.topK` maximum). */
export const SEARCH_TOP_K_MAX = 100;

/**
 * What the port sends.
 *
 * `filters` is deliberately absent: the only user-facing filter the backend
 * implements is `corpusOwnership`, and the remaining `filters` keys are internal
 * (embedding model/dimensions). Sending an invented key would be a silent
 * contract change.
 */
export type SearchPortRequest = {
  query: string;
  topK?: number;
  corpusOwnership?: CorpusOwnership;
};

export type SearchOutcome =
  | { status: "results"; hits: SearchHit[]; degraded: boolean }
  | { status: "unauthorized" }
  | { status: "forbidden" }
  | { status: "validation" }
  | { status: "unavailable" };

/** Clamp `topK` into the contract's 1…100 window. */
export function boundedTopK(topK: number | undefined): number {
  if (topK === undefined) {
    return SEARCH_TOP_K_DEFAULT;
  }
  return Math.min(Math.max(Math.trunc(topK), 1), SEARCH_TOP_K_MAX);
}

/**
 * Read the optional `corpusOwnership` field.
 *
 * `null` and absence both mean *the server did not say which corpus the row came
 * from* — `corpusOwnership` is optional in the contract, and the API serializes
 * "no value" as an explicit JSON `null` (`SearchController` maps the domain
 * `Optional` with `.orElse(null)`). That is not a corpus value, so the port must
 * neither guess one nor throw away an answer the server did send.
 *
 * A *present but unknown* value is different: the server sent something the
 * contract does not define, so the response cannot be trusted and the caller
 * gets `null` (→ unavailable) rather than a plausible-looking hit.
 */
function asCorpusOwnership(
  value: unknown,
): CorpusOwnership | undefined | null {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (value === "sample" || value === "mine") {
    return value;
  }
  return null;
}

function asSearchHit(value: unknown): SearchHit | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const hit = value as Partial<SearchHit>;
  if (
    typeof hit.chunkId !== "string" ||
    typeof hit.noteId !== "string" ||
    typeof hit.versionId !== "string" ||
    typeof hit.score !== "number" ||
    typeof hit.snippet !== "string"
  ) {
    return null;
  }
  const ownership = asCorpusOwnership(hit.corpusOwnership);
  if (ownership === null) {
    return null;
  }
  return {
    chunkId: hit.chunkId,
    noteId: hit.noteId,
    versionId: hit.versionId,
    score: hit.score,
    snippet: hit.snippet,
    ...(ownership === undefined ? {} : { corpusOwnership: ownership }),
  };
}

function asSearchResults(
  body: unknown,
): { hits: SearchHit[]; degraded: boolean } | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const candidate = body as Partial<SearchResults>;
  if (!Array.isArray(candidate.hits) || typeof candidate.degraded !== "boolean") {
    return null;
  }
  const hits: SearchHit[] = [];
  for (const item of candidate.hits) {
    const hit = asSearchHit(item);
    if (!hit) {
      return null;
    }
    hits.push(hit);
  }
  return { hits, degraded: candidate.degraded };
}

/**
 * Run one search. Defaults to the hybrid endpoint.
 *
 * `path` exists so the lexical endpoint stays reachable without a second
 * function or a user-facing toggle — tests and future slices can name the path
 * they mean.
 */
export async function searchNotes(
  request: SearchPortRequest,
  jar: ApiJar = {},
  workspaceSelector?: string,
  options: { path?: string } = {},
): Promise<SearchOutcome> {
  const body: SearchRequest = {
    query: request.query,
    topK: boundedTopK(request.topK),
  };
  if (request.corpusOwnership !== undefined) {
    body.corpusOwnership = request.corpusOwnership;
  }

  const response = await sendApiRequest(
    options.path ?? HYBRID_SEARCH_PATH,
    {
      method: "POST",
      jar,
      json: body,
      workspaceSelector,
    },
  );
  if (!response) {
    return { status: "unavailable" };
  }
  if (response.status === 400) {
    return { status: "validation" };
  }
  if (response.status === 401) {
    return { status: "unauthorized" };
  }
  if (response.status === 403) {
    return { status: "forbidden" };
  }
  // `503` (unavailable) and `504` (timeout) are the same class here: the product
  // must tell transport failures apart from results, not apart from each other.
  if (!response.ok) {
    return { status: "unavailable" };
  }
  const results = asSearchResults(await readJson(response));
  return results ? { status: "results", ...results } : { status: "unavailable" };
}
