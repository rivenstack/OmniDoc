import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_COOKIE_NAME } from "./constants";
import { resolveSignInGate } from "./session";

const { cookieStore } = vi.hoisted(() => ({
  cookieStore: new Map<string, string>(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieStore.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
  headers: async () => new Headers(),
}));

const originalOrigin = process.env.OMNIDOC_API_ORIGIN;

beforeEach(() => {
  process.env.OMNIDOC_API_ORIGIN = "http://api.test";
  cookieStore.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalOrigin === undefined) {
    delete process.env.OMNIDOC_API_ORIGIN;
  } else {
    process.env.OMNIDOC_API_ORIGIN = originalOrigin;
  }
});

function stubSession(respond: () => Response | Promise<Response>): void {
  vi.stubGlobal("fetch", vi.fn(async () => respond()));
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("resolveSignInGate", () => {
  it("shows the form for a session the API rejects, however the cookie looks", () => {
    // The other half of the infinite loop: with the cookie present but the
    // session gone (idle timeout, or an API restart with in-memory sessions),
    // the route must render the form rather than redirect to the page that
    // just rejected it. Rendering also makes the dead cookie self-healing —
    // signing in overwrites it.
    cookieStore.set(SESSION_COOKIE_NAME, "stale-session");

    stubSession(() => json({}, 401));

    return expect(resolveSignInGate("/notes/new")).resolves.toEqual({
      status: "form",
    });
  });

  it("sends a confirmed session on to the requested page", async () => {
    cookieStore.set(SESSION_COOKIE_NAME, "S1");

    stubSession(() => json({ actorId: "actor-a" }));

    await expect(resolveSignInGate("/notes/new?from=inbox")).resolves.toEqual({
      status: "redirect",
      destination: "/notes/new?from=inbox",
    });
  });

  it("falls back to the default landing page when nothing was requested", async () => {
    cookieStore.set(SESSION_COOKIE_NAME, "S1");

    stubSession(() => json({ actorId: "actor-a" }));

    await expect(resolveSignInGate(undefined)).resolves.toEqual({
      status: "redirect",
      destination: "/inbox",
    });
  });

  it("never redirects a confirmed session back to sign-in", async () => {
    // `?next=/sign-in` is a safe same-origin path but a self-referential
    // destination: honouring it would bounce between the two forever.
    cookieStore.set(SESSION_COOKIE_NAME, "S1");

    stubSession(() => json({ actorId: "actor-a" }));

    await expect(resolveSignInGate("/sign-in/")).resolves.toEqual({
      status: "redirect",
      destination: "/inbox",
    });
  });

  it("shows the form when identity cannot be reached, without claiming a sign-out", async () => {
    cookieStore.set(SESSION_COOKIE_NAME, "S1");

    stubSession(() => {
      throw new Error("connection refused");
    });

    await expect(resolveSignInGate("/inbox")).resolves.toEqual({
      status: "form",
    });
  });

  it("shows the form to a visitor with no cookie at all", async () => {
    stubSession(() => json({}, 401));

    await expect(resolveSignInGate("/inbox")).resolves.toEqual({
      status: "form",
    });
  });
});
