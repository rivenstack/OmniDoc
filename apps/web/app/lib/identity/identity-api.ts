/**
 * Identity port — the only place the frontend talks to session identity.
 *
 * ADR-0001 §6 keeps the identity **port**; ADR-0005 makes the implementation
 * Spring Security HTTP-only session cookies in the Java API. There is no client
 * auth library, and there must not be one: this module is a typed adapter over
 * `docs/api/openapi.yaml`, and everything it returns is a contract type from
 * `@omnidoc/contracts` (no locally forked shapes).
 *
 * Every call is server-side, so the browser never needs CORS, and the cookies
 * are relayed explicitly:
 *
 * ```text
 * browser ── JSESSIONID/XSRF-TOKEN ──▶ Next (this port) ── Cookie ──▶ Java API
 * ```
 *
 * The functions are total: transport problems come back as `unavailable`
 * rather than throwing, because "we could not ask" and "the answer is no" are
 * different states the UI must not conflate (`docs/design/system-ux.md` §2).
 */
import type { components } from "@omnidoc/contracts";

import {
  apiOrigin,
  cookieHeader,
  readJson,
  sendApiRequest,
  type ApiJar,
} from "../api/transport";

export type Principal = components["schemas"]["Principal"];
export type Workspace = components["schemas"]["Workspace"];
export type CreateSessionRequest = components["schemas"]["CreateSessionRequest"];

export const SESSION_ENDPOINT = "/api/v1/session";
export const WORKSPACES_ENDPOINT = "/api/v1/workspaces";

/**
 * The cookies the port relays between the browser and the API.
 *
 * Alias of the shared `ApiJar` (`../api/transport`) so this port keeps its
 * domain name and callers keep one import.
 */
export type IdentityJar = ApiJar;

// Re-exported for callers that reach the origin/cookie helpers through the
// identity port. The implementations live in the shared transport.
export { apiOrigin, cookieHeader };

export type SessionLookup =
  | { status: "authenticated"; principal: Principal }
  | { status: "unauthenticated" }
  | { status: "unavailable" };

export type WorkspaceLookup =
  | { status: "resolved"; workspaces: Workspace[] }
  | { status: "unauthenticated" }
  | { status: "unavailable" };

/**
 * Sign-in outcomes, kept distinguishable on purpose:
 *
 * - `invalid_credentials` — the API rejected the email/password (401)
 * - `invalid_request` — the API rejected the body (400)
 * - `unsupported` — this API build has no identity endpoints (404); the
 *   identity adapter is profile-gated on a live DataSource, so a bare API
 *   answers 404 here rather than pretending the password was wrong
 * - `unavailable` — transport failure or 5xx: we never reached an answer
 */
export type SignInOutcome =
  | { status: "authenticated"; principal: Principal; setCookieHeaders: string[] }
  | { status: "invalid_credentials" }
  | { status: "invalid_request" }
  | { status: "unsupported" }
  | { status: "unavailable" };

export type SignOutOutcome = "revoked" | "already_signed_out" | "failed";

/**
 * Every `Set-Cookie` header on the response.
 *
 * `getSetCookie()` is the only safe way to read them: `Headers.get("set-cookie")`
 * comma-joins multiple cookies, and a cookie with an `Expires` date contains a
 * comma, so splitting that string mangles the values.
 */
function setCookieHeaders(response: Response): string[] {
  const all = response.headers.getSetCookie?.();
  if (all && all.length > 0) {
    return all;
  }
  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}

function asPrincipal(body: unknown): Principal | null {
  if (
    typeof body === "object" &&
    body !== null &&
    typeof (body as { actorId?: unknown }).actorId === "string"
  ) {
    return { actorId: (body as { actorId: string }).actorId };
  }
  return null;
}

function asWorkspaces(body: unknown): Workspace[] | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const list = (body as { workspaces?: unknown }).workspaces;
  if (!Array.isArray(list)) {
    return null;
  }
  const workspaces: Workspace[] = [];
  for (const entry of list) {
    if (
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as Workspace).id === "string" &&
      typeof (entry as Workspace).tenantId === "string" &&
      typeof (entry as Workspace).name === "string"
    ) {
      workspaces.push(entry as Workspace);
    }
  }
  return workspaces;
}

/** Current principal for the relayed session, if any. */
export async function readSession(jar: IdentityJar = {}): Promise<SessionLookup> {
  const response = await sendApiRequest(SESSION_ENDPOINT, { method: "GET", jar });
  if (!response) {
    return { status: "unavailable" };
  }
  if (response.status === 401) {
    return { status: "unauthenticated" };
  }
  if (!response.ok) {
    return { status: "unavailable" };
  }
  const principal = asPrincipal(await readJson(response));
  return principal ? { status: "authenticated", principal } : { status: "unavailable" };
}

/** Workspaces the session principal may select — server-resolved membership. */
export async function readWorkspaces(
  jar: IdentityJar = {},
  workspaceSelector?: string,
): Promise<WorkspaceLookup> {
  const response = await sendApiRequest(WORKSPACES_ENDPOINT, {
    method: "GET",
    jar,
    workspaceSelector,
  });
  if (!response) {
    return { status: "unavailable" };
  }
  if (response.status === 401) {
    return { status: "unauthenticated" };
  }
  if (!response.ok) {
    return { status: "unavailable" };
  }
  const workspaces = asWorkspaces(await readJson(response));
  return workspaces ? { status: "resolved", workspaces } : { status: "unavailable" };
}

/** Authenticate and hand back the cookies the API wants the browser to hold. */
export async function createSession(body: CreateSessionRequest): Promise<SignInOutcome> {
  const response = await sendApiRequest(SESSION_ENDPOINT, { method: "POST", json: body });
  if (!response) {
    return { status: "unavailable" };
  }
  if (response.status === 401) {
    return { status: "invalid_credentials" };
  }
  if (response.status === 400) {
    return { status: "invalid_request" };
  }
  if (response.status === 404) {
    return { status: "unsupported" };
  }
  if (!response.ok) {
    return { status: "unavailable" };
  }
  const principal = asPrincipal(await readJson(response));
  if (!principal) {
    return { status: "unavailable" };
  }
  return {
    status: "authenticated",
    principal,
    setCookieHeaders: setCookieHeaders(response),
  };
}

/** End the server-side session. */
export async function deleteSession(jar: IdentityJar): Promise<SignOutOutcome> {
  const response = await sendApiRequest(SESSION_ENDPOINT, { method: "DELETE", jar });
  if (!response) {
    return "failed";
  }
  if (response.status === 204) {
    return "revoked";
  }
  if (response.status === 401) {
    return "already_signed_out";
  }
  return "failed";
}
