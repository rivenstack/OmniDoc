import { NextResponse, type NextRequest } from "next/server";

import {
  REQUESTED_PATH_HEADER,
  SESSION_COOKIE_NAME,
  SIGN_IN_PATH,
  signInHref,
} from "./app/lib/identity/constants";

/**
 * Session-aware entry for the authenticated shell.
 *
 * This is Next's `proxy` convention (the renamed `middleware` file, Next 16).
 * Two jobs, both about *entry*, not authorization:
 *
 * 1. A browser with no session cookie at all is sent to sign-in immediately,
 *    with the page it wanted remembered. "No cookie" is the only claim this
 *    layer can make soundly: it is the one cookie state that really does mean
 *    "not signed in". A *present* cookie proves nothing — a `JSESSIONID`
 *    outlives the server-side session it names — so nothing here is decided
 *    from one. The shell layout and the sign-in route ask the API instead.
 * 2. Every other request carries its own path forward as a header, because a
 *    layout does not receive the pathname. Without it, a stale session could
 *    only be redirected to sign-in, never back to where the user was going.
 *
 * Sign-in is deliberately **never** redirected away from here. It used to be
 * ("skip anyone who already has a cookie"), which made a stale cookie an
 * infinite loop: this layer bounced the visitor off sign-in because a cookie
 * existed, the shell layout bounced them back because the API rejected it. The
 * sign-in route now asks the identity port itself and sends a genuinely
 * authenticated visitor on — one source of truth, so the two cannot disagree.
 *
 * `/kit` is deliberately outside the matcher: it is a design-language reference
 * page, not a route in the product.
 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requested = `${pathname}${request.nextUrl.search}`;

  // `/sign-in/` is the same route as `/sign-in` to Next, so it is the same route
  // here. Normalising once keeps the trailing-slash form from falling into the
  // shell branches below (where it has no cookie to send it to sign-in, and the
  // route would then redirect back to this decision).
  const route = pathname.replace(/\/+$/, "") || "/";

  if (route === SIGN_IN_PATH) {
    return NextResponse.next();
  }

  if (!request.cookies.has(SESSION_COOKIE_NAME)) {
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
