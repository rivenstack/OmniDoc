import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SESSION_ENDPOINT,
  WORKSPACES_ENDPOINT,
  createSession,
  deleteSession,
  readSession,
  readWorkspaces,
} from "./identity-api";

const originalOrigin = process.env.OMNIDOC_API_ORIGIN;

beforeEach(() => {
  process.env.OMNIDOC_API_ORIGIN = "http://api.test";
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalOrigin === undefined) {
    delete process.env.OMNIDOC_API_ORIGIN;
  } else {
    process.env.OMNIDOC_API_ORIGIN = originalOrigin;
  }
});

type FetchCall = { url: string; init: RequestInit | undefined };

function stubFetch(
  respond: (call: FetchCall) => Response | Promise<Response>,
): FetchCall[] {
  const calls: FetchCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown, init?: RequestInit) => {
      const call = { url: String(input), init };
      calls.push(call);
      return respond(call);
    }),
  );
  return calls;
}

function headersOf(call: FetchCall): Headers {
  return new Headers(call.init?.headers);
}

const json = (body: unknown, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...(headers as object) },
  });

describe("readSession", () => {
  it("returns the principal and forwards the session cookie upstream", async () => {
    const calls = stubFetch(() => json({ actorId: "actor_alex" }));

    const result = await readSession({ session: "S1" });

    expect(result).toEqual({
      status: "authenticated",
      principal: { actorId: "actor_alex" },
    });
    expect(calls[0].url).toBe(`http://api.test${SESSION_ENDPOINT}`);
    expect(calls[0].init?.method).toBe("GET");
    expect(headersOf(calls[0]).get("cookie")).toBe("JSESSIONID=S1");
  });

  it("sends both relayed cookies when the CSRF token is held", async () => {
    const calls = stubFetch(() => json({ actorId: "actor_alex" }));

    await readSession({ session: "S1", csrf: "t1" });

    expect(headersOf(calls[0]).get("cookie")).toBe("JSESSIONID=S1; XSRF-TOKEN=t1");
  });

  it("reports a rejected session as unauthenticated, not as an error", async () => {
    stubFetch(() => json({ code: "unauthenticated" }, 401));

    await expect(readSession({})).resolves.toEqual({ status: "unauthenticated" });
  });

  it("reports a transport failure as unavailable rather than throwing", async () => {
    stubFetch(() => {
      throw new TypeError("fetch failed");
    });

    await expect(readSession({ session: "S1" })).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("reports a 5xx as unavailable — an unreachable answer is not a rejection", async () => {
    stubFetch(() => json({ code: "unavailable" }, 503));

    await expect(readSession({ session: "S1" })).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("refuses a body that is not a principal instead of forking the shape", async () => {
    stubFetch(() => json({ name: "not the contract" }));

    await expect(readSession({ session: "S1" })).resolves.toEqual({
      status: "unavailable",
    });
  });
});

describe("readWorkspaces", () => {
  it("returns server-resolved workspaces", async () => {
    stubFetch(() =>
      json({
        workspaces: [
          { id: "w1", tenantId: "t1", name: "My workspace" },
          { id: "s1", tenantId: "t0", name: "Sample — public demo notes" },
        ],
      }),
    );

    const result = await readWorkspaces({ session: "S1" });

    expect(result.status).toBe("resolved");
    expect(result.status === "resolved" && result.workspaces).toHaveLength(2);
  });

  it("sends the workspace selector as a header, never as authority", async () => {
    const calls = stubFetch(() => json({ workspaces: [] }));

    await readWorkspaces({ session: "S1" }, "w1");

    expect(headersOf(calls[0]).get("OmniDoc-Workspace-Id")).toBe("w1");
    expect(calls[0].url).toBe(`http://api.test${WORKSPACES_ENDPOINT}`);
  });

  it("drops a malformed entry rather than trusting it", async () => {
    stubFetch(() =>
      json({ workspaces: [{ id: "w1", tenantId: "t1", name: "ok" }, { id: "bad" }] }),
    );

    const result = await readWorkspaces({ session: "S1" });

    expect(result.status === "resolved" && result.workspaces).toEqual([
      { id: "w1", tenantId: "t1", name: "ok" },
    ]);
  });

  it("reports an expired session as unauthenticated", async () => {
    stubFetch(() => json({ code: "unauthenticated" }, 401));

    await expect(readWorkspaces({})).resolves.toEqual({
      status: "unauthenticated",
    });
  });
});

describe("createSession", () => {
  it("returns the principal and every relaying cookie", async () => {
    stubFetch(
      () =>
        new Response(JSON.stringify({ actorId: "actor_alex" }), {
          status: 200,
          headers: [
            ["content-type", "application/json"],
            ["set-cookie", "JSESSIONID=S1; Path=/; HttpOnly; SameSite=Lax"],
            ["set-cookie", "XSRF-TOKEN=t1; Path=/"],
          ],
        }),
    );

    const outcome = await createSession({
      email: "alex@example.test",
      password: "secret",
    });

    expect(outcome.status).toBe("authenticated");
    expect(outcome.status === "authenticated" && outcome.setCookieHeaders).toEqual([
      "JSESSIONID=S1; Path=/; HttpOnly; SameSite=Lax",
      "XSRF-TOKEN=t1; Path=/",
    ]);
  });

  it("posts JSON to the session endpoint without a CSRF header", async () => {
    const calls = stubFetch(() => json({ actorId: "actor_alex" }));

    await createSession({ email: "alex@example.test", password: "secret" });

    expect(calls[0].url).toBe(`http://api.test${SESSION_ENDPOINT}`);
    expect(calls[0].init?.method).toBe("POST");
    expect(headersOf(calls[0]).get("content-type")).toBe("application/json");
    // Sign-in is exempt from CSRF upstream: no session, therefore no token.
    expect(headersOf(calls[0]).get("X-XSRF-TOKEN")).toBeNull();
    expect(calls[0].init?.body).toBe(
      JSON.stringify({ email: "alex@example.test", password: "secret" }),
    );
  });

  it("tells a rejected credential apart from an unreachable API", async () => {
    stubFetch(() => json({ code: "unauthenticated" }, 401));
    await expect(
      createSession({ email: "a@b.test", password: "x" }),
    ).resolves.toEqual({ status: "invalid_credentials" });

    stubFetch(() => json({ code: "validation" }, 400));
    await expect(
      createSession({ email: "a@b.test", password: "x" }),
    ).resolves.toEqual({ status: "invalid_request" });

    stubFetch(() => json({}, 503));
    await expect(
      createSession({ email: "a@b.test", password: "x" }),
    ).resolves.toEqual({ status: "unavailable" });

    stubFetch(() => {
      throw new TypeError("fetch failed");
    });
    await expect(
      createSession({ email: "a@b.test", password: "x" }),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("reports a missing identity surface as unsupported, not as a bad password", async () => {
    // The identity adapter is profile-gated on a live DataSource, so an API
    // built without it answers 404 here.
    stubFetch(() => json({ code: "not_found" }, 404));

    await expect(
      createSession({ email: "a@b.test", password: "x" }),
    ).resolves.toEqual({ status: "unsupported" });
  });

  it("treats a success without a principal as unavailable", async () => {
    stubFetch(() => json({}, 200));

    await expect(
      createSession({ email: "a@b.test", password: "x" }),
    ).resolves.toEqual({ status: "unavailable" });
  });
});

describe("deleteSession", () => {
  it("sends the CSRF token Spring requires for a state-changing call", async () => {
    const calls = stubFetch(() => new Response(null, { status: 204 }));

    await expect(deleteSession({ session: "S1", csrf: "t1" })).resolves.toBe(
      "revoked",
    );

    expect(calls[0].init?.method).toBe("DELETE");
    expect(headersOf(calls[0]).get("X-XSRF-TOKEN")).toBe("t1");
    expect(headersOf(calls[0]).get("cookie")).toBe("JSESSIONID=S1; XSRF-TOKEN=t1");
  });

  it("treats an already-expired session as signed out", async () => {
    stubFetch(() => json({ code: "unauthenticated" }, 401));

    await expect(deleteSession({ session: "S1" })).resolves.toBe(
      "already_signed_out",
    );
  });

  it("reports a refusal or a dead API as failed, so nothing claims success", async () => {
    stubFetch(() => json({ code: "forbidden" }, 403));
    await expect(deleteSession({ session: "S1" })).resolves.toBe("failed");

    stubFetch(() => {
      throw new TypeError("fetch failed");
    });
    await expect(deleteSession({ session: "S1" })).resolves.toBe("failed");
  });
});
