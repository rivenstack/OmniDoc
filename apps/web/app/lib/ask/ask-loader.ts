/**
 * Ask route loader (server-only, not a Server Action).
 *
 * The `next/headers` half of Ask, kept separate from `ask-run.ts` so the
 * decision logic stays testable without the framework — the same split the
 * search and note-list slices use.
 *
 * It produces the two things the Ask surface needs and nothing more:
 *
 * - the **session input** the route handler reasons about (authenticated /
 *   unavailable / resolved memberships) plus the cookie jar the port relays;
 * - the **page outcome** — the resolved current workspace id, or the honest
 *   failure to render in place of the composer.
 *
 * The browser never receives the jar or the workspace selector: the selector is
 * resolved here and passed on the server, and the client's own request is
 * re-authorized in the route handler (`architecture.md` §2).
 */
import type { ApiJar } from "../api/transport";
import { readSession, readWorkspaces } from "../identity/identity-api";
import { readIdentityJar, readWorkspacePreference } from "../identity/session";
import { resolveAskTarget, type AskSessionInput } from "./ask-run";
import type { AskFailure } from "./ask-stream";

export type AskRouteContext = {
  jar: ApiJar;
  session: AskSessionInput;
};

/** Read the session, the memberships, and the workspace preference in one pass. */
export async function readAskRouteContext(): Promise<AskRouteContext> {
  const jar = await readIdentityJar();
  const session = await readSession(jar);
  if (session.status === "unauthenticated") {
    return { jar, session: { status: "unauthenticated" } };
  }
  if (session.status === "unavailable") {
    return { jar, session: { status: "unavailable" } };
  }

  const preference = await readWorkspacePreference();
  const lookup = await readWorkspaces(jar, preference);
  if (lookup.status === "unauthenticated") {
    return { jar, session: { status: "unauthenticated" } };
  }
  if (lookup.status !== "resolved") {
    return { jar, session: { status: "unavailable" } };
  }

  return {
    jar,
    session: {
      status: "resolved",
      workspaces: lookup.workspaces,
      ...(preference ? { preference } : {}),
    },
  };
}

export type AskPageOutcome =
  | { status: "ready"; workspaceId: string }
  | { status: "failure"; failure: AskFailure };

/**
 * Resolve the `/ask` page's composition target.
 *
 * No selector is supplied by the page: the server picks the current workspace
 * from session membership, so the composer is only offered when there is a
 * workspace to ask against. The client is told only the resolved id — never the
 * jar, the membership list, or a selector to send back.
 */
export async function loadAskForRoute(): Promise<AskPageOutcome> {
  const { session } = await readAskRouteContext();
  const target = resolveAskTarget(session, undefined);
  if (target.status === "failure") {
    return { status: "failure", failure: target.failure };
  }
  return { status: "ready", workspaceId: target.workspaceId };
}
