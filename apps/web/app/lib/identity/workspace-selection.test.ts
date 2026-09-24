import { describe, expect, it } from "vitest";

import type { Workspace } from "./identity-api";
import {
  isSelectableWorkspace,
  resolveWorkspaceSelection,
  sampleWorkspaceIds,
} from "./workspace-selection";

const workspaces: Workspace[] = [
  { id: "w1", tenantId: "t1", name: "My workspace" },
  { id: "w2", tenantId: "t1", name: "Second workspace" },
];

describe("resolveWorkspaceSelection", () => {
  it("uses the stored preference when the server still lists it", () => {
    expect(resolveWorkspaceSelection(workspaces, "w2")).toEqual({
      currentWorkspaceId: "w2",
      stalePreference: false,
    });
  });

  it("falls back to a real workspace when the preference no longer resolves", () => {
    // A stale preference must not dead-end the user, and must not reveal
    // whether the workspace still exists (system-ux.md §2, Tenancy).
    expect(resolveWorkspaceSelection(workspaces, "gone")).toEqual({
      currentWorkspaceId: "w1",
      stalePreference: true,
    });
  });

  it("selects the first server-resolved workspace when nothing is stored", () => {
    expect(resolveWorkspaceSelection(workspaces, undefined)).toEqual({
      currentWorkspaceId: "w1",
      stalePreference: false,
    });
  });

  it("selects nothing when membership resolved to an empty list", () => {
    expect(resolveWorkspaceSelection([], "w1")).toEqual({
      currentWorkspaceId: "",
      stalePreference: true,
    });
    expect(resolveWorkspaceSelection([], undefined)).toEqual({
      currentWorkspaceId: "",
      stalePreference: false,
    });
  });
});

describe("isSelectableWorkspace", () => {
  it("allows only workspaces the server said the session may select", () => {
    expect(isSelectableWorkspace(workspaces, "w1")).toBe(true);
    expect(isSelectableWorkspace(workspaces, "other-tenant")).toBe(false);
    expect(isSelectableWorkspace([], "w1")).toBe(false);
  });
});

describe("sampleWorkspaceIds", () => {
  it("separates nothing until the contract can mark the sample corpus", () => {
    // `Workspace` carries id/tenantId/name only. Deriving the sample from the
    // display name would be inventing data, so the shell separates nothing and
    // the gap is recorded for F-09 (sample path) in docs/design/now.md.
    expect(sampleWorkspaceIds()).toEqual([]);
  });
});
