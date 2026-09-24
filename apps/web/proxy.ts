import { NextResponse, type NextRequest } from "next/server";

import {
  DEFAULT_AUTHENTICATED_PATH,
  REQUESTED_PATH_HEADER,
  SESSION_COOKIE_NAME,
  SIGN_IN_PATH,
  safeNextPath,
  signInHref,
} from "./app/lib/identity/constants";

/**
 * Session-aware entry for the authenticated shell.
 *
 * This is Next's `proxy` convention (the renamed `middleware` file, Next 16).
 * Three jobs, all about *entry*, not authorization:
 *
 * 1. A browser with no session cookie at all is sent to sign-in immediately,
 *    with the page it wanted remembered. This is the cheap optimistic check
 *    Next documents for this layer — a present-but-stale cookie still has to
 *    pass the shell layout, which re-verifies the session against the API on
 *    every render. No access decision is made here.
 * 2. Every other request carries its own path forward as a header, because a
 *    layout does not receive the pathname. Without it, a stale session could
 *    only be redirected to sign-in, never back to where the user was going.
 * 3. Sign-in itself: reachable without a session, and skipped by anyone who
 *    already has one — they are sent on to their destination instead of being
 *    asked to sign in again.
 *
 * `/kit` is deliberately outside the matcher: it is a design-language reference
 * page, not a route in the product.
 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requested = `${pathname}${request.nextUrl.search}`;
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  if (pathname === SIGN_IN_PATH) {
    if (!hasSession) {
      return NextResponse.next();
    }
    const destination =
      safeNextPath(request.nextUrl.searchParams.get("next")) ??
      DEFAULT_AUTHENTICATED_PATH;
    return NextResponse.redirect(new URL(destination, request.nextUrl.origin));
  }

  if (!hasSession) {
    return NextResponse.redirect(
      new URL(signInHref(requested), request.nextUrl.origin),
    );
  }

  const headers = new Headers(request.headers);
  headers.set(REQUESTED_PATH_HEADER, requested);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/",
    "/inbox/:path*",
    "/notes/:path*",
    "/collections/:path*",
    "/search/:path*",
    "/ask/:path*",
    "/sign-in",
  ],
};
