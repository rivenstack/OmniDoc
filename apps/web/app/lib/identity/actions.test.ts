import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SignInOutcome } from "./identity-api";

const harness = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  written: [] as { name: string; value: string; options: unknown }[],
  deleted: [] as string[],
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  readWorkspaces: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      harness.cookies.has(name)
        ? { name, value: harness.cookies.get(name) }
        : undefined,
    set: (name: string, value: string, options: unknown) => {
      harness.written.push({ name, value, options });
    },
    delete: (name: string) => {
      harness.deleted.push(name);
    },
  }),
  headers: async () => new Headers(),
}));

/** `redirect()` throws in Next, so the tests assert on the thrown destination. */
class RedirectError extends Error {
  constructor(readonly destination: string) {
    super(`redirect:${destination}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (destination: string) => {
    throw new RedirectError(destination);
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

vi.mock("./identity-api", () => ({
  apiOrigin: () => "http://api.test",
  createSession: (...args: unknown[]) => harness.createSession(...args),
  deleteSession: (...args: unknown[]) => harness.deleteSession(...args),
  readWorkspaces: (...args: unknown[]) => harness.readWorkspaces(...args),
}));

const { selectWorkspaceAction, signInAction, signOutAction } = await import(
  "./actions"
);

function formData(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.append(key, value);
  }
  return data;
}

const credentials = { email: "alex@example.test", password: "s3cret" };

const authenticated: SignInOutcome = {
  status: "authenticated",
  principal: { actorId: "actor_alex" },
  setCookieHeaders: [
    "JSESSIONID=S1; Path=/; HttpOnly; SameSite=Lax",
    "XSRF-TOKEN=t1; Path=/",
  ],
};

beforeEach(() => {
  harness.cookies.clear();
  harness.written.length = 0;
  harness.deleted.length = 0;
  harness.createSession.mockReset();
  harness.deleteSession.mockReset();
  harness.readWorkspaces.mockReset();
});

describe("signInAction", () => {
  it("does not ask the API when a field is empty", async () => {
    const result = await signInAction(null, formData({ email: "", password: "" }));

    expect(result).toBe("invalid_request");
    expect(harness.createSession).not.toHaveBeenCalled();
  });

  it("keeps a bad password, a bad request and a missing service distinct", async () => {
    const cases: [SignInOutcome, string][] = [
      [{ status: "invalid_credentials" }, "invalid_credentials"],
      [{ status: "invalid_request" }, "invalid_request"],
      // The identity controllers are profile-gated on a live database, so a
      // bare API answers 404 here. Reporting that as a bad password would blame
      // the user for our misconfiguration.
      [{ status: "unsupported" }, "unsupported"],
      [{ status: "unavailable" }, "unavailable"],
    ];

    for (const [outcome, expected] of cases) {
      harness.createSession.mockResolvedValueOnce(outcome);
      await expect(signInAction(null, formData(credentials))).resolves.toBe(
        expected,
      );
    }
  });

  it("never reports success when the API returns no session cookie", async () => {
    harness.createSession.mockResolvedValueOnce({
      status: "authenticated",
      principal: { actorId: "actor_alex" },
      setCookieHeaders: [],
    } satisfies SignInOutcome);

    await expect(signInAction(null, formData(credentials))).resolves.toBe(
      "unavailable",
    );
  });

  it("relays the session cookie and returns the user where they were going", async () => {
    harness.createSession.mockResolvedValueOnce(authenticated);

    await expect(
      signInAction(null, formData({ ...credentials, next: "/notes/new?from=inbox" })),
    ).rejects.toThrow(new RedirectError("/notes/new?from=inbox"));

    const session = harness.written.find((cookie) => cookie.name === "JSESSIONID");
    expect(session?.value).toBe("S1");
    // The session cookie is the tenant authority, so it is never script-readable.
    expect((session?.options as { httpOnly?: boolean }).httpOnly).toBe(true);
    expect(
      harness.written.find((cookie) => cookie.name === "XSRF-TOKEN")?.value,
    ).toBe("t1");
  });

  it("refuses an off-site destination, so sign-in cannot become an open redirect", async () => {
    // `mockResolvedValue`, not `...Once`: the loop makes one call per hostile
    // value, and the later iterations would otherwise get `undefined`.
    harness.createSession.mockResolvedValue(authenticated);

    for (const hostile of [
      "https://evil.example/steal",
      "//evil.example",
      "/\\evil.example",
      "notes",
    ]) {
      await expect(
        signInAction(null, formData({ ...credentials, next: hostile })),
      ).rejects.toThrow(new RedirectError("/inbox"));
    }
  });
});

describe("signOutAction", () => {
  it("clears the relayed cookies and returns to sign-in", async () => {
    harness.cookies.set("JSESSIONID", "S1");
    harness.cookies.set("XSRF-TOKEN", "t1");
    harness.deleteSession.mockResolvedValueOnce("revoked");

    await expect(signOutAction()).rejects.toThrow(
      new RedirectError("/sign-in"),
    );

    expect(harness.deleted).toEqual([
      "JSESSIONID",
      "XSRF-TOKEN",
      "omnidoc_workspace",
    ]);
  });

  it("still clears local session state when the API cannot revoke", async () => {
    harness.cookies.set("JSESSIONID", "S1");
    harness.deleteSession.mockResolvedValueOnce("failed");

    // The user asked to leave: keeping a cookie the browser already handed over
    // would be worse than a server-side session outliving the click.
    await expect(signOutAction()).rejects.toThrow(
      new RedirectError("/sign-in"),
    );
    expect(harness.deleted).toContain("JSESSIONID");
  });
});

describe("selectWorkspaceAction", () => {
  it("remembers an id the server actually listed", async () => {
    harness.cookies.set("JSESSIONID", "S1");
    harness.readWorkspaces.mockResolvedValueOnce({
      status: "resolved",
      workspaces: [{ id: "w1", tenantId: "t1", name: "My workspace" }],
    });

    await selectWorkspaceAction("w1");

    expect(harness.written).toEqual([
      {
        name: "omnidoc_workspace",
        value: "w1",
        options: { httpOnly: true, sameSite: "lax", path: "/" },
      },
    ]);
  });

  it("refuses an id outside the server-resolved membership", async () => {
    harness.cookies.set("JSESSIONID", "S1");
    harness.readWorkspaces.mockResolvedValueOnce({
      status: "resolved",
      workspaces: [{ id: "w1", tenantId: "t1", name: "My workspace" }],
    });

    // A workspace id selects; it never authorizes. Inventing a selection the
    // session has no membership for is what this refuses.
    await selectWorkspaceAction("someone-elses-workspace");

    expect(harness.written).toEqual([]);
  });

  it("refuses while membership cannot be resolved", async () => {
    harness.cookies.set("JSESSIONID", "S1");
    harness.readWorkspaces.mockResolvedValueOnce({ status: "unavailable" });

    await selectWorkspaceAction("w1");

    expect(harness.written).toEqual([]);
  });
});
