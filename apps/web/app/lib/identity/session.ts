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
