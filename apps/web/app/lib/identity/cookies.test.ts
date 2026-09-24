import { describe, expect, it } from "vitest";

import { parseCookiePair, relayedCookieNames, relayedIdentityCookies } from "./cookies";

describe("parseCookiePair", () => {
  it("reads the leading name/value pair", () => {
    expect(parseCookiePair("JSESSIONID=ABC123; Path=/; HttpOnly")).toEqual({
      name: "JSESSIONID",
      value: "ABC123",
    });
  });

  it("keeps an '=' inside the value intact", () => {
    expect(parseCookiePair("SESSION=a=b; Path=/")?.value).toBe("a=b");
  });

  it("parses a pair that only looks like an attribute", () => {
    // Nothing distinguishes `Path=/` from a real cookie syntactically — an
    // attribute-looking name is dropped by the name allowlist in
    // `relayedIdentityCookies`, not guessed at here.
    expect(parseCookiePair("Path=/")).toEqual({ name: "Path", value: "/" });
  });

  it("rejects a header with no usable pair", () => {
    expect(parseCookiePair("=novalue")).toBeNull();
    expect(parseCookiePair("")).toBeNull();
  });
});

describe("relayedIdentityCookies", () => {
  it("relays only the two identity cookies", () => {
    const relayed = relayedIdentityCookies(
      [
        "JSESSIONID=S1; Path=/; HttpOnly",
        "XSRF-TOKEN=t1; Path=/",
        "analytics=zzz; Path=/",
      ],
      "http://api.test",
    );

    expect(relayed.map((cookie) => cookie.name)).toEqual([
      "JSESSIONID",
      "XSRF-TOKEN",
    ]);
    expect(relayedCookieNames()).toEqual(["JSESSIONID", "XSRF-TOKEN"]);
  });

  it("keeps the session cookie unreadable to scripts and the CSRF token readable", () => {
    const [session, csrf] = relayedIdentityCookies(
      ["JSESSIONID=S1; Path=/; HttpOnly", "XSRF-TOKEN=t1; Path=/"],
      "http://api.test",
    );

    // The session cookie is the tenant authority, so it is never script-readable.
    expect(session.options.httpOnly).toBe(true);
    // The CSRF token is a token, not a credential — upstream sets it readable.
    expect(csrf.options.httpOnly).toBe(false);
    expect(session.options.path).toBe("/");
    expect(session.options.sameSite).toBe("lax");
  });

  it("marks cookies Secure only when the API itself is https", () => {
    const [overHttp] = relayedIdentityCookies(["JSESSIONID=S1"], "http://api.test");
    const [overHttps] = relayedIdentityCookies(
      ["JSESSIONID=S1"],
      "https://api.example.test",
    );

    // A Secure cookie would simply be dropped by the browser on http localhost.
    expect(overHttp.options.secure).toBe(false);
    expect(overHttps.options.secure).toBe(true);
  });

  it("ignores headers it cannot parse", () => {
    expect(relayedIdentityCookies(["nonsense", "=x"], "http://api.test")).toEqual([]);
  });
});
