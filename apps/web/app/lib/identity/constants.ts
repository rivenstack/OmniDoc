/**
 * Identity wire constants — the names the frontend and the Java API must agree on.
 *
 * These mirror `docs/api/openapi.yaml` (the `sessionCookie` security scheme,
 * `CsrfHeader`, and `WorkspaceSelector`) and the API's `application.yml`
 * (Spring Security `spa()` CSRF, default servlet session cookie). Nothing here
 * is a second contract: if the API changes a name, this file is the single
 * place the frontend follows.
 *
 * Dependency-free on purpose — Next middleware imports it, so it must not pull
 * in `next/headers`, `server-only`, or any runtime code.
 */

/** Spring servlet session cookie (`JSESSIONID` until the API renames it). */
export const SESSION_COOKIE_NAME = "JSESSIONID";

/** Readable CSRF cookie written by Spring Security `spa()`. */
export const CSRF_COOKIE_NAME = "XSRF-TOKEN";

/** Header Spring Security expects for state-changing requests. */
export const CSRF_HEADER_NAME = "X-XSRF-TOKEN";

/** Workspace selector header. A selector — never tenant authority. */
export const WORKSPACE_SELECTOR_HEADER = "OmniDoc-Workspace-Id";

/**
 * Cookie the frontend owns: which workspace the *user* last chose.
 *
 * This is a preference, not a grant. The server re-binds membership from the
 * session on every request (`architecture.md` §2), so a forged value can only
 * ever select among workspaces the session is already a member of.
 */
export const WORKSPACE_SELECTOR_COOKIE_NAME = "omnidoc_workspace";

/**
 * Request header set by middleware carrying the path the browser asked for, so
 * a server-side session redirect can return the user there afterwards.
 */
export const REQUESTED_PATH_HEADER = "x-omnidoc-requested-path";

/** Unauthenticated entry point. Lives outside the `(app)` group. */
export const SIGN_IN_PATH = "/sign-in";

/** Where an authenticated user lands when no usable destination was requested. */
export const DEFAULT_AUTHENTICATED_PATH = "/inbox";

/** Build the sign-in URL, optionally remembering where the user was headed. */
export function signInHref(nextPath?: string): string {
  const safe = safeNextPath(nextPath);
  return safe ? `${SIGN_IN_PATH}?next=${encodeURIComponent(safe)}` : SIGN_IN_PATH;
}

/**
 * Accept only same-origin absolute paths as a post-sign-in destination.
 *
 * A `next` value arrives from the URL, so it is attacker-controllable. Without
 * this check `/sign-in?next=https://evil.example` (or the protocol-relative
 * `//evil.example`) turns sign-in into an open redirect.
 */
export function safeNextPath(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  if (!value.startsWith("/") || value.startsWith("//")) {
    return undefined;
  }
  // Backslashes are treated as slashes by some browsers, which would smuggle a
  // protocol-relative target past the check above.
  if (value.includes("\\")) {
    return undefined;
  }
  return value;
}
