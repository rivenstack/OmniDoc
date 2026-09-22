/**
 * User-facing shell copy — F-02.
 *
 * Centralised so the honesty guardrails (REC-18, states/sample-vs-mine §7) are
 * auditable in one place and so a single locale source can later replace these
 * literals. Prohibited phrasings are documented next to the honest ones:
 *
 * - No simulated enterprise scale ("12 organizations", org charts, member
 *   directories, SSO upsell walls).
 * - No accuracy percentages, invented user counts, or testimonials.
 * - No claim that RTL is available, live, or scheduled (a11y §7.5).
 */

/** Architecture §2: a failed workspace selector must not leak existence. */
export const WORKSPACE_FORBIDDEN_COPY =
  "You don't have access to that workspace.";

/** Switcher group label for user-owned workspaces. */
export const MINE_GROUP_LABEL = "Mine";

/** Switcher group label for the public demo corpus. */
export const SAMPLE_GROUP_LABEL = "Sample (public demo notes)";

/** Chip/notes label naming the public demo corpus explicitly (REC-08/17). */
export const SAMPLE_CORPUS_LABEL = "Sample — public demo notes";

/** Badge shown when the principal has exactly one workspace (REC-18). */
export const SOLO_WORKSPACE_BADGE_LABEL = "Solo workspace";

/** Action that removes the sample workspace from this user's view. */
export const HIDE_SAMPLE_ACTION_LABEL = "Hide sample workspace";

/** Creation affordance. Kept honest — no seat/plan upsell (REC-15). */
export const CREATE_WORKSPACE_ACTION_LABEL = "Create workspace…";

/** Members panel — the only state that mentions scale, and it denies it. */
export const MEMBERS_EMPTY_COPY = "You're the only member.";
export const MEMBERS_INVITE_LABEL = "Invite a member";

/** Role chips. Text + icon, never colour-only (a11y §1.6). */
export const ROLE_LABELS = {
  owner: "Owner",
  member: "Member",
} as const;

/** Skip link — must be the first focusable element (a11y §4, shell spec §7.1). */
export const SKIP_LINK_LABEL = "Skip to content";

/** The content region's id. The skip link and route-change focus both target it. */
export const SHELL_CONTENT_ID = "main";

/**
 * The sidebar's scrolling nav region.
 *
 * The rail toggle points `aria-controls` at this id, so the expand/collapse
 * relationship is programmatic rather than merely implied by layout — an
 * `aria-expanded` with no subject is not a disclosure.
 */
export const SHELL_SIDEBAR_NAV_ID = "sidebar-nav";

export const SHELL_PRIMARY_NAV_LABEL = "Primary";
export const SHELL_MOBILE_NAV_LABEL = "Primary";
export const SHELL_TOP_BAR_SEARCH_LABEL = "Search notes and ask a question";

export const PALETTE_TITLE = "Search and commands";
export const PALETTE_DESCRIPTION =
  "Search your notes or jump to a place in OmniDoc.";
export const PALETTE_INPUT_LABEL = "Search";
export const PALETTE_EMPTY_COPY = "No matches.";
export const PALETTE_LOADING_COPY = "Searching…";
export const PALETTE_CLOSE_LABEL = "Close";

export const SIDEBAR_TOGGLE_LABEL_COLLAPSE = "Collapse sidebar";
export const SIDEBAR_TOGGLE_LABEL_EXPAND = "Expand sidebar";

export const THEME_TOGGLE_LABEL = "Switch theme";
export const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;
