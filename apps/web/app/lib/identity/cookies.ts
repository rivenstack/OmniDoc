/**
 * Set-Cookie relay helpers.
 *
 * The API sets its session and CSRF cookies, but the browser only ever talks to
 * Next — the port calls the API server-side. So the `Set-Cookie` headers from
 * the API response have to be re-issued on the Next response, and the browser
 * then hands the same cookie names back, which the port forwards upstream.
 *
 * Only the two identity cookies are relayed, by name. Anything else the API
 * sets stays where it was set.
 */
import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from "./constants";

export type RelayedCookieOptions = {
  httpOnly: boolean;
  sameSite: "lax";
  path: string;
  secure: boolean;
};

export type RelayedCookie = {
  name: string;
  value: string;
  options: RelayedCookieOptions;
};

/** Cookie names this app owns a relay for. */
export function relayedCookieNames(): string[] {
  return [SESSION_COOKIE_NAME, CSRF_COOKIE_NAME];
}

/**
 * `JSESSIONID=abc123` → `{ name: "JSESSIONID", value: "abc123" }`.
 *
 * Only the leading name/value pair is read. Attributes (`Path`, `HttpOnly`,
 * `Secure`, `SameSite`, `Max-Age`, `Expires`) are re-derived below rather than
 * copied, so a change in the API's attribute policy cannot silently produce a
 * cookie the browser refuses to send.
 */
export function parseCookiePair(header: string): { name: string; value: string } | null {
  const pair = header.split(";", 1)[0]?.trim() ?? "";
  const separator = pair.indexOf("=");
  if (separator <= 0) {
    return null;
  }
  const name = pair.slice(0, separator).trim();
  const value = pair.slice(separator + 1).trim();
  if (!name) {
    return null;
  }
  return { name, value };
}

/**
 * Translate the API's `Set-Cookie` headers into cookies Next can write.
 *
 * `secure` follows the API origin: Spring only marks the session cookie
 * `Secure` in the deploy profile, and a `Secure` cookie is dropped by the
 * browser over plain-http local development.
 */
export function relayedIdentityCookies(
  setCookieHeaders: readonly string[],
  apiOrigin: string,
): RelayedCookie[] {
  const secure = apiOrigin.startsWith("https://");
  const allowed = new Set(relayedCookieNames());
  const relayed: RelayedCookie[] = [];

  for (const header of setCookieHeaders) {
    const pair = parseCookiePair(header);
    if (!pair || !allowed.has(pair.name)) {
      continue;
    }
    relayed.push({
      name: pair.name,
      value: pair.value,
      options: {
        // The session cookie is the tenant authority, so it is never readable
        // from the browser. The CSRF token is deliberately not httpOnly — it is
        // a token, not a credential, and the API sets it readable.
        httpOnly: pair.name === SESSION_COOKIE_NAME,
        sameSite: "lax",
        path: "/",
        secure,
      },
    });
  }

  return relayed;
}
