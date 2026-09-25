import { describe, expect, it } from "vitest";

import { authenticatedDestination, safeNextPath, signInHref } from "./constants";

describe("safeNextPath", () => {
  it("accepts a same-origin path with query and hash", () => {
    expect(safeNextPath("/notes/new?from=inbox#body")).toBe(
      "/notes/new?from=inbox#body",
    );
  });

  it("rejects absolute URLs, so sign-in cannot become an open redirect", () => {
    expect(safeNextPath("https://evil.example/steal")).toBeUndefined();
    expect(safeNextPath("http://evil.example")).toBeUndefined();
  });

  it("rejects protocol-relative and backslash-escaped targets", () => {
    // `//host` is a URL with a different origin, and some browsers read a
    // backslash as a slash — both would smuggle an off-site destination.
    expect(safeNextPath("//evil.example")).toBeUndefined();
    expect(safeNextPath("/\\evil.example")).toBeUndefined();
    expect(safeNextPath("\\\\evil.example")).toBeUndefined();
  });

  it("rejects relative and empty values", () => {
    expect(safeNextPath("notes")).toBeUndefined();
    expect(safeNextPath("")).toBeUndefined();
    expect(safeNextPath(undefined)).toBeUndefined();
    expect(safeNextPath(null)).toBeUndefined();
  });
});

describe("signInHref", () => {
  it("points at sign-in with no query when no destination is requested", () => {
    expect(signInHref()).toBe("/sign-in");
    expect(signInHref("https://evil.example")).toBe("/sign-in");
  });

  it("encodes a safe destination so a nested query survives the round trip", () => {
    expect(signInHref("/search?q=hello world&corpus=mine")).toBe(
      `/sign-in?next=${encodeURIComponent("/search?q=hello world&corpus=mine")}`,
    );
  });
});

describe("authenticatedDestination", () => {
  it("keeps a safe requested page", () => {
    expect(authenticatedDestination("/notes/new?from=inbox")).toBe(
      "/notes/new?from=inbox",
    );
  });

  it("falls back to the default landing page", () => {
    expect(authenticatedDestination(undefined)).toBe("/inbox");
    expect(authenticatedDestination("https://evil.example")).toBe("/inbox");
  });

  it("refuses a destination that is sign-in itself, which would bounce back", () => {
    // Every spelling of the sign-in route: a bare path, a query, a hash, and
    // the trailing-slash form Next redirects to it.
    expect(authenticatedDestination("/sign-in")).toBe("/inbox");
    expect(authenticatedDestination("/sign-in?next=/notes/new")).toBe("/inbox");
    expect(authenticatedDestination("/sign-in#form")).toBe("/inbox");
    expect(authenticatedDestination("/sign-in/")).toBe("/inbox");
  });

  it("keeps the root, which the shell itself forwards to the inbox", () => {
    expect(authenticatedDestination("/")).toBe("/");
  });
});
