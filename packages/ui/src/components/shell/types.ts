import type { ReactNode } from "react";
import type { components } from "@omnidoc/contracts";

/**
 * Shell + workspace types — D-01 component inventory §1–§2 (F-02).
 *
 * Every wire-shaped type here is **derived from the S-02 canonical contract**
 * (`@omnidoc/contracts`, generated from `docs/api/openapi.yaml`). Nothing in
 * this file re-declares a contract field: a local fork of a contract shape
 * would silently drift from the Java/OpenAPI source of truth (handoff
 * constraint, inventory §13).
 */

/** `components.schemas.Workspace` — server-resolved tenant label + name. */
export type Workspace = components["schemas"]["Workspace"];

/** `components.schemas.WorkspaceList` — the `GET /api/v1/workspaces` payload. */
export type WorkspaceList = components["schemas"]["WorkspaceList"];

/** `sample` | `mine` — first-class corpus ownership label (architecture §9). */
export type CorpusOwnership = components["schemas"]["CorpusOwnership"];

/**
 * One entry in the workspace switcher.
 *
 * The S-02 `Workspace` schema carries **no corpus-ownership field yet**, so the
 * sample/mine label cannot be read off the wire shape. Rather than invent a
 * contract field, the shell composes it: the caller (an S-03 MSW handler, or a
 * later contract revision) supplies the label alongside the server workspace.
 * The component never infers corpus ownership from a name (states/sample-vs-mine
 * §1: "driven by the API response — never inferred by the client").
 */
export type WorkspaceEntry = {
  workspace: Workspace;
  corpusOwnership: CorpusOwnership;
};

export type WorkspaceEntries = readonly WorkspaceEntry[];

/**
 * Adapt a raw `WorkspaceList` (exactly the shape the API returns) into the
 * switcher's entry list, labelling each workspace from the server-side corpus
 * value. Keeping this as an explicit adapter is what lets the switcher consume
 * the generated contract type without forking it.
 */
export function toWorkspaceEntries(
  list: WorkspaceList,
  corpusOwnershipOf: (workspace: Workspace) => CorpusOwnership,
): WorkspaceEntry[] {
  return list.workspaces.map((workspace) => ({
    workspace,
    corpusOwnership: corpusOwnershipOf(workspace),
  }));
}

/**
 * Workspace membership role shown as a chip in the Members panel.
 *
 * There is no member-list schema in S-02 yet, so this is a presentation type
 * whose values must come from the server (architecture §2: "the client never
 * invents membership"). The shell renders a chip **only** when the caller
 * supplies a role.
 */
export type MembershipRole = "owner" | "member";

export type MemberView = {
  id: string;
  /** Display name. Rendered inside `<bdi>` — it is user-generated text. */
  name: string;
  /** Optional identifier; rendered inside `<bdi>` next to the name. */
  email?: string;
  role: MembershipRole;
};

/** One primary-navigation entry (sidebar, mobile tab bar, command palette). */
export type ShellNavItem = {
  /** Stable key; must not be derived from the label (labels are localizable). */
  id: string;
  label: string;
  href: string;
  /** Decorative icon. Never the only label — the text is always rendered. */
  icon?: ReactNode;
  /** Marks the current route (`aria-current="page"`). */
  active?: boolean;
  /** A real gate exists. A disabled item must explain itself in text. */
  disabled?: boolean;
  disabledReason?: string;
};

/** One actionable row in the command palette. */
export type CommandPaletteItem = {
  id: string;
  label: string;
  description?: string;
  href?: string;
  onSelect?: () => void;
};
