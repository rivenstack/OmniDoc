/**
 * Session reads for the server-rendered shell.
 *
 * Binds `next/headers` to the identity port: build the cookie jar the port
 * forwards upstream, then decide what the shell should do. Kept separate from
 * `identity-api.ts` so the port stays free of framework imports and testable
 * with a plain mocked `fetch`.
 */
import { cookies, headers } from "next/headers";

import {
  CSRF_COOKIE_NAME,
  REQUESTED_PATH_HEADER,
  SESSION_COOKIE_NAME,
  WORKSPACE_SELECTOR_COOKIE_NAME,
  authenticatedDestination,
} from "./constants";
import {
  readSession,
  readWorkspaces,
  type IdentityJar,
  type Principal,
  type Workspace,
} from "./identity-api";
import { resolveWorkspaceSelection, sampleWorkspaceIds } from "./workspace-selection";

/** The relayed cookies as the browser currently holds them. */
export async function readIdentityJar(): Promise<IdentityJar> {
  const store = await cookies();
  return {
    session: store.get(SESSION_COOKIE_NAME)?.value,
    csrf: store.get(CSRF_COOKIE_NAME)?.value,
  };
}

/**
 * Path the browser originally asked for, set by middleware.
 *
 * Layouts do not receive the pathname, so without this a session redirect could
 * not return the user to the page they wanted.
 */
export async function readRequestedPath(): Promise<string | undefined> {
  const requestHeaders = await headers();
  return requestHeaders.get(REQUESTED_PATH_HEADER) ?? undefined;
}

/** The workspace the user last chose. A preference, never a grant. */
export async function readWorkspacePreference(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(WORKSPACE_SELECTOR_COOKIE_NAME)?.value;
}

export type ShellSession =
  | { status: "unauthenticated" }
  | { status: "unavailable" }
  | {
      status: "authenticated";
      principal: Principal;
      workspaces: Workspace[];
      /** The session is valid but membership could not be read. */
      workspacesUnavailable: boolean;
      currentWorkspaceId: string;
      sampleWorkspaceIds: string[];
    };

/**
 * Everything the authenticated shell needs, in one pass.
 *
 * `unauthenticated` and `unavailable` are kept apart on purpose: a rejected
 * session sends the user to sign-in, but an unreachable identity service must
 * not — that would show a sign-in form that cannot work and imply the user was
 * signed out when nobody ever asked.
 */
export async function getShellSession(): Promise<ShellSession> {
  const jar = await readIdentityJar();
  const session = await readSession(jar);
  if (session.status === "unauthenticated") {
    return { status: "unauthenticated" };
  }
  if (session.status === "unavailable") {
    return { status: "unavailable" };
  }

  const preference = await readWorkspacePreference();
  const lookup = await readWorkspaces(jar, preference);
  if (lookup.status === "unauthenticated") {
    return { status: "unauthenticated" };
  }

  const workspaces = lookup.status === "resolved" ? lookup.workspaces : [];
  const selection = resolveWorkspaceSelection(workspaces, preference);

  return {
    status: "authenticated",
    principal: session.principal,
    workspaces,
    workspacesUnavailable: lookup.status !== "resolved",
    currentWorkspaceId: selection.currentWorkspaceId,
    sampleWorkspaceIds: sampleWorkspaceIds(),
  };
}

/** What the sign-in route should do for the session the browser is holding. */
export type SignInGate =
  | { status: "redirect"; destination: string }
  | { status: "form" };

/**
 * Decide the sign-in route's job: let a genuinely authenticated visitor skip
 * the form, and show the form to everyone else.
 *
 * Cookie *presence* is not evidence of a session. A `JSESSIONID` outlives the
 * server-side session it names — Spring's default idle timeout, or an API
 * restart with in-memory sessions — so a stale cookie is the normal state after
 * any break, and the browser keeps sending it. Only the API can answer whether
 * the session still exists, so only the API is asked.
 *
 * This is the *single* place that decides to skip sign-in. It must stay that
 * way: when the proxy skipped it too, from cookie presence alone, a stale
 * cookie produced an infinite loop (proxy → destination → layout rejects →
 * sign-in → proxy → …) that the user could not escape without clearing
 * cookies. A rejected or unreachable session therefore renders the form, which
 * also makes a dead cookie self-healing: signing in replaces it.
 */
export async function resolveSignInGate(
  requested?: string,
): Promise<SignInGate> {
  const jar = await readIdentityJar();
  const session = await readSession(jar);
  if (session.status !== "authenticated") {
    return { status: "form" };
  }
  return { status: "redirect", destination: authenticatedDestination(requested) };
}
