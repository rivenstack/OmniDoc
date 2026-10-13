/**
 * The capture surface's editor settings (F-15 Rev 2, plan Task 1.1).
 *
 * One typed object holds the editor-relevant keys the artifact exposes, and
 * the defaults below are the artifact's own (`SET-001`, `UNDOC-002`). The plan
 * records the full table because Obsidian's help pages omit most of it; this
 * module is that table in code, so a default can never drift from the plan
 * unnoticed.
 *
 * ## Scope
 *
 * - **Keys the artifact has but OmniDoc does not model** are listed in
 *   `UNMODELLED_ARTIFACT_KEYS` with the reason. They are not silently dropped:
 *   a future parity audit can see exactly which rows were considered.
 * - **`vimMode`** is part of the artifact's live-reconfigure set (`SET-002`)
 *   but the vim extension is gated out of this plan (decision 9). The key
 *   exists and defaults to `false`; nothing installs or reads a vim extension.
 *
 * ## Persistence (recorded deviation, plan §4.1)
 *
 * Settings live in component/prop state only. There is **no** server or
 * `localStorage` persistence for them — the artifact persists per vault, and
 * OmniDoc has no vault. Do not add a storage layer here.
 *
 * Catalogue: `SET-001` (defaults), `SET-002` (live-reconfigured keys),
 * `UNDOC-002` (undocumented defaults recorded).
 */

/** The editor's settings, as a plain immutable value. */
export type EditorSettings = {
  /** Indent with a tab character instead of spaces (`SET-001`, decision 3). */
  readonly useTab: boolean;
  /** Visual tab width. The artifact's slider range is {@link TAB_SIZE_MIN}–{@link TAB_SIZE_MAX}. */
  readonly tabSize: number;
  /**
   * Lay out each line right-to-left. Supplied by the single locale source,
   * never a user toggle in v1 (plan §4.1); `en` (LTR) is the only shipping
   * locale, so this is `false` until a locale says otherwise.
   */
  readonly rightToLeft: boolean;
  /** Let the browser spellcheck the editor's content. */
  readonly spellcheck: boolean;
  /** Auto-pair the bracket group: `(`, `[`, `{`, `'`, `"` (`INPUT-001`). */
  readonly autoPairBrackets: boolean;
  /** Auto-pair the markdown group: `*`, `_`, `` ` ``, ` ``` ` (`INPUT-001`). */
  readonly autoPairMarkdown: boolean;
  /** Continue lists with the artifact's indentation rules (`LIST-001`). */
  readonly smartIndentList: boolean;
  /** Fold heading sections by default (`FOLD-002`). */
  readonly foldHeading: boolean;
  /** Fold indented blocks by default (`FOLD-001`). */
  readonly foldIndent: boolean;
  /** Show line numbers in the gutter. Off per `SET-001`. */
  readonly showLineNumber: boolean;
  /** Show indentation guides. On per `SET-001`. */
  readonly showIndentGuide: boolean;
  /** Render Markdown mode as the live preview rather than raw source. */
  readonly livePreview: boolean;
  /**
   * Vim keybindings. Inert: the vim extension stays gated out of this plan
   * (decision 9). Present because `SET-002` names it as a live-reconfigured key.
   */
  readonly vimMode: boolean;
};

/** Lowest `tabSize` the artifact's slider offers. */
export const TAB_SIZE_MIN = 2;

/** Highest `tabSize` the artifact's slider offers. */
export const TAB_SIZE_MAX = 8;

/**
 * The artifact's editor defaults (`SET-001`), as recorded in plan §4.1.
 *
 * Frozen: a settings change is a **new** object handed to the extension
 * factory (Task 1.3), never a mutation of this one. Mutation would make the
 * compartment's equality check decide "nothing changed" and the editor would
 * keep the stale configuration.
 */
export const DEFAULT_EDITOR_SETTINGS: EditorSettings = Object.freeze({
  // Decision 3 (2026-10-13): tabs match the artifact.
  useTab: true,
  tabSize: 4,
  rightToLeft: false,
  spellcheck: true,
  autoPairBrackets: true,
  autoPairMarkdown: true,
  smartIndentList: true,
  foldHeading: true,
  foldIndent: true,
  showLineNumber: false,
  showIndentGuide: true,
  livePreview: true,
  vimMode: false,
});

/**
 * The keys the artifact reconfigures live, without rebuilding the view
 * (`SET-002`).
 *
 * Task 1.3 puts these behind `Compartment`s so a change reconfigures the
 * running `EditorState` instead of recreating it. Every name here must be a
 * real key of {@link EditorSettings} — the test asserts that, so this list
 * cannot rot into a comment.
 */
export const LIVE_RECONFIGURED_KEYS = [
  "useTab",
  "tabSize",
  "rightToLeft",
  "spellcheck",
  "autoPairBrackets",
  "autoPairMarkdown",
  "smartIndentList",
  "vimMode",
] as const satisfies readonly (keyof EditorSettings)[];

/**
 * Artifact settings keys OmniDoc deliberately does **not** model (`SET-001`,
 * `UNDOC-002`). Recorded so the omission is a decision, not an oversight.
 */
export const UNMODELLED_ARTIFACT_KEYS = [
  {
    key: "propertiesInDocument",
    reason: "No frontmatter model exists (PROP-001…003 are out of scope).",
  },
  {
    key: "readableLineLength",
    reason: "Not implemented; no reading-width cap is promised by OmniDoc.",
  },
  {
    key: "strictLineBreaks",
    reason:
      "Not a v1 editor setting — the TipTap ↔ markdown bridge governs newline semantics.",
  },
] as const;

/**
 * Clamp `tabSize` into the artifact's slider range.
 *
 * The range is part of the setting's contract, not a UI nicety: a `tabSize` of
 * `0` or `1` makes CodeMirror's indent arithmetic and the fold service's
 * visual-column comparison disagree.
 */
export function normalizeTabSize(tabSize: number): number {
  if (!Number.isFinite(tabSize)) return DEFAULT_EDITOR_SETTINGS.tabSize;
  return Math.min(
    TAB_SIZE_MAX,
    Math.max(TAB_SIZE_MIN, Math.round(tabSize)),
  );
}

/**
 * Apply a partial change to the defaults, clamping the ranged values.
 *
 * The single way to build a non-default settings object, so a caller cannot
 * skip the clamping that `normalizeTabSize` provides.
 */
export function editorSettings(
  overrides: Partial<EditorSettings> = {},
): EditorSettings {
  const merged = { ...DEFAULT_EDITOR_SETTINGS, ...overrides };
  return Object.freeze({
    ...merged,
    tabSize: normalizeTabSize(merged.tabSize),
  });
}
