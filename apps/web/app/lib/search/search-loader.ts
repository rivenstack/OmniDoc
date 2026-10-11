/**
 * Search route loader (server-only, not a Server Action).
 *
 * The `next/headers` half of retrieve, kept separate from `search-run.ts` so the
 * data path stays testable without the framework — the same split the F-05
 * lists use (`notes-pages.ts` + `note-list-loader.ts`).
 *
 * Workspace selection is a preference over the list the server returned
 * (`architecture.md` §2), so the id that reaches search is always one the
 * session is a member of, and a refusal would be a generic denial rather than a
 * hint about which workspaces exist.
 *
 * An empty query returns `idle` **before** any identity call: the idle screen
 * searches nothing, so there is no reason to spend a session round trip on it.
 */
import { readWorkspaces } from "../identity/identity-api";
import { readIdentityJar, readWorkspacePreference } from "../identity/session";
import { resolveWorkspaceSelection } from "../identity/workspace-selection";
import type { SearchParams } from "./search-query";
import { runSearch, type SearchScreenOutcome } from "./search-run";

export type { SearchScreenOutcome } from "./search-run";

export async function loadSearchForRoute(
  params: SearchParams,
): Promise<SearchScreenOutcome> {
  if (params.query.length === 0) {
    return { status: "idle" };
  }

  const jar = await readIdentityJar();
  const preference = await readWorkspacePreference();
  const lookup = await readWorkspaces(jar, preference);
  if (lookup.status !== "resolved") {
    return { status: "unavailable" };
  }

  const { currentWorkspaceId } = resolveWorkspaceSelection(
    lookup.workspaces,
    preference,
  );
  if (!currentWorkspaceId) {
    // No membership at all: there is nothing to search, and that is not "no
    // matches".
    return { status: "unavailable" };
  }

  return runSearch(currentWorkspaceId, jar, params);
}
