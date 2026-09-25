import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { SESSION_COOKIE_NAME, signInHref } from "./app/lib/identity/constants";
import { proxy } from "./proxy";

const ORIGIN = "http://localhost:3311";

/** A browser request. `session` sets a `JSESSIONID` of that (opaque) value. */
function visit(path: string, session?: string): NextRequest {
  const request = new NextRequest(new URL(path, ORIGIN));
  if (session) {
    request.cookies.set(SESSION_COOKIE_NAME, session);
  }
  return request;
}

/** The `location` the browser would follow, as a same-origin path. */
function redirectTarget(response: Response): string | null {
  const location = response.headers.get("location");
  if (!location) {
    return null;
  }
  const url = new URL(location);
  return `${url.pathname}${url.search}`;
}

describe("proxy / sign-in", () => {
  it("never redirects away from sign-in, even when a session cookie is present", () => {
    // The regression. This layer used to skip sign-in for anyone holding a
    // cookie, which — because a cookie outlives the session it names — made a
    // stale cookie an infinite loop: this bounce sent the visitor to the shell,
    // the shell's layout asked the API, was rejected, and sent them back here.
    // Only the sign-in route may skip the form, and only after asking the API.
    const response = proxy(visit("/sign-in?next=%2Fnotes%2Fnew", "stale"));

    expect(redirectTarget(response)).toBeNull();
  });

  it("treats the trailing-slash form as the same route, so it cannot loop either", () => {
    expect(redirectTarget(proxy(visit("/sign-in/", "stale")))).toBeNull();
    expect(redirectTarget(proxy(visit("/sign-in/")))).toBeNull();
  });
});

describe("proxy / cookie-less entry", () => {
  it("sends a cookie-less visitor to sign-in, remembering the page", () => {
    const response = proxy(visit("/notes/new"));

    expect(response.status).toBe(307);
    expect(redirectTarget(response)).toBe(signInHref("/notes/new"));
  });

  it("keeps the query string of the requested page", () => {
    // A browser sends the request line already percent-encoded, so the check is
    // that `next` decodes back to exactly the path that was asked for.
    const target = redirectTarget(proxy(visit("/search?q=hello%20world&corpus=mine")));

    expect(target).not.toBeNull();
    expect(new URL(target as string, ORIGIN).searchParams.get("next")).toBe(
      "/search?q=hello%20world&corpus=mine",
    );
  });
});

describe("proxy / cookie-carrying entry", () => {
  it("forwards the request with its own path as a header", () => {
    const response = proxy(visit("/notes/abc", "S1"));

    expect(redirectTarget(response)).toBeNull();
    // A layout never receives the pathname, so this header is the only way a
    // rejected session can be returned to the page the user actually asked for.
    // `NextResponse.next({ request: { headers } })` publishes it as an override.
    const overridden = response.headers.get("x-middleware-override-headers") ?? "";
    expect(overridden).toContain("x-omnidoc-requested-path");
    expect(response.headers.get("x-middleware-request-x-omnidoc-requested-path")).toBe(
      "/notes/abc",
    );
  });
});
