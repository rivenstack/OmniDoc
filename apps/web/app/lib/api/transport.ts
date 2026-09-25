/**
 * Server-side HTTP transport shared by the frontend's project-owned ports.
 *
 * The ports (`lib/identity`, `lib/notes`) are the only place `apps/web` talks
 * to the Java API. They all need the same three things, so this module owns
 * them once instead of per port:
 *
 * 1. **The API origin.** Server-side only (`OMNIDOC_API_ORIGIN`). The browser
 *    never learns it, which is also why there is no `NEXT_PUBLIC_*` variant.
 * 2. **The cookie relay.** Spring Security sessions are HTTP-only, so the
 *    browser holds `JSESSIONID` / `XSRF-TOKEN` and Next forwards them
 *    explicitly:
 *
 *    ```text
 *    browser ── cookies ──▶ Next (port) ── Cookie ──▶ Java API
 *    ```
 *
 * 3. **Total results.** Transport problems come back as `null` rather than
 *    throwing, because "we could not ask" and "the answer is no" are different
 *    states the UI must not conflate (`docs/design/system-ux.md` §2). Each port
 *    maps `null` onto its own `unavailable` outcome.
 *
 * The wire names live in `lib/identity/constants.ts` — the single place the
 * frontend follows `docs/api/openapi.yaml`. This module does not introduce a
 * second set.
 */
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  SESSION_COOKIE_NAME,
  WORKSPACE_SELECTOR_HEADER,
} from "../identity/constants";

const DEFAULT_API_ORIGIN = "http://localhost:8080";

/**
 * How long a port waits before calling a request unreachable.
 *
 * A port that hangs is worse than a port that fails: the UI would show a
 * permanent "saving…" and the user could not tell it apart from progress.
 */
const REQUEST_TIMEOUT_MS = 8_000;

/** The cookies a port relays between the browser and the API. */
export type ApiJar = {
  session?: string;
  csrf?: string;
};

/** Where the API lives. Server-side only. */
export function apiOrigin(): string {
  const configured = process.env.OMNIDOC_API_ORIGIN?.trim();
  return configured ? configured.replace(/\/+$/, "") : DEFAULT_API_ORIGIN;
}

export function cookieHeader(jar: ApiJar): string | undefined {
  const parts: string[] = [];
  if (jar.session) {
    parts.push(`${SESSION_COOKIE_NAME}=${jar.session}`);
  }
  if (jar.csrf) {
    parts.push(`${CSRF_COOKIE_NAME}=${jar.csrf}`);
  }
  return parts.length > 0 ? parts.join("; ") : undefined;
}

type SendOptions = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  jar?: ApiJar;
  json?: unknown;
  workspaceSelector?: string;
  /** Overrides `json` — used by the multipart import path. */
  body?: BodyInit;
  /** Set only when the body is not self-describing (see the note below). */
  contentType?: string;
};

/**
 * Send one request. Returns `null` when no response was ever produced
 * (connection refused, DNS failure, timeout, abort).
 */
export async function sendApiRequest(
  path: string,
  options: SendOptions,
): Promise<Response | null> {
  const headers = new Headers({ Accept: "application/json" });
  const cookie = cookieHeader(options.jar ?? {});
  if (cookie) {
    headers.set("Cookie", cookie);
  }
  if (options.workspaceSelector) {
    headers.set(WORKSPACE_SELECTOR_HEADER, options.workspaceSelector);
  }
  // Spring's `spa()` CSRF requires the cookie's token back in the header for
  // state-changing calls. POST /session is exempt upstream (no session exists
  // yet), so the header is only sent when a token is actually held.
  if (options.method !== "GET" && options.jar?.csrf) {
    headers.set(CSRF_HEADER_NAME, options.jar.csrf);
  }
  if (options.body !== undefined) {
    // Only set a type when the caller names one. A `FormData` body must set its
    // own `multipart/form-data; boundary=…`, and hardcoding a type here would
    // strip the boundary and make the API unable to parse the request.
    if (options.contentType) {
      headers.set("Content-Type", options.contentType);
    }
  } else if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  try {
    return await fetch(`${apiOrigin()}${path}`, {
      method: options.method,
      headers,
      body:
        options.body ??
        (options.json === undefined ? undefined : JSON.stringify(options.json)),
      // Session-bound data must never be served from a cache.
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
}

/** Parse a JSON body, tolerating an empty or non-JSON response. */
export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/** Percent-encode a path segment that came from data, not from a template. */
export function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}
