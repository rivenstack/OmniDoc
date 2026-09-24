/**
 * Workspace selection — pure logic, no Next or fetch dependency.
 *
 * `docs/design/system-ux.md` §2 (Tenancy): *workspace id selects, it does not
 * authorize*. The selection here is a **preference** over a list the server
 * already resolved from session membership, so this module can only ever pick
 * among workspaces the session is a member of.
 */
import type { Workspace } from "./identity-api";

export type WorkspaceSelection = {
  /** Workspace the shell renders. Empty string when the list is empty. */
  currentWorkspaceId: string;
  /**
   * True when a stored preference is no longer in the server-resolved list.
   *
   * The shell falls back to a real workspace rather than dead-ending the user
   * on a stale value. A workspace the *server refuses* is a different case: it
   * renders the generic denial and never reveals whether it exists.
   */
  stalePreference: boolean;
};

export function resolveWorkspaceSelection(
  workspaces: readonly Workspace[],
  preferredId: string | undefined,
): WorkspaceSelection {
  const fallback = workspaces[0]?.id ?? "";
  if (!preferredId) {
    return { currentWorkspaceId: fallback, stalePreference: false };
  }
  const match = workspaces.some((workspace) => workspace.id === preferredId);
  return match
    ? { currentWorkspaceId: preferredId, stalePreference: false }
    : { currentWorkspaceId: fallback, stalePreference: true };
}

/**
 * Whether a requested workspace id may be remembered as a preference.
 *
 * Checked against the server's list, so the frontend never manufactures a
 * selection the session has no membership for.
 */
export function isSelectableWorkspace(
  workspaces: readonly Workspace[],
  workspaceId: string,
): boolean {
  return workspaces.some((workspace) => workspace.id === workspaceId);
}

/**
 * Ids the server marks as the public sample corpus.
 *
 * `@omnidoc/contracts` `Workspace` carries `id`/`tenantId`/`name` only — there
 * is no sample marker yet, and deriving one from the display name would be
 * inventing data. So the shell separates nothing until the contract can say so
 * (F-09 owns the sample path). Recorded as a gap in `docs/design/now.md`.
 */
export function sampleWorkspaceIds(): string[] {
  return [];
}
