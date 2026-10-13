// Parity dispositions for the RE-Obsidian 1.14.4 catalogue (F-15 Rev 2, plan section 2).
//
// SOURCE OF TRUTH: docs/plans/2026-10-13_181100-obsidian-fidelity-editor.md section 2.
// These rows are **not** re-decided here: the plan's disposition, task and normative
// note are transcribed one-to-one, and `matrix.test.ts` cross-checks them against the
// vendored catalogue (docs/fidelity/obsidian-1.14.4.behaviours.json). Change a
// disposition only by amending the plan first.

/** The six dispositions the plan allows (section 2). */
export type Disposition =
  | "adopt"
  | "adapt"
  | "deviation"
  | "defer"
  | "gated"
  | "out-of-scope";

export type EntryDisposition = {
  readonly disposition: Disposition;
  /**
   * Plan task number(s) that implement this entry, in `<phase>.<task>` form
   * (e.g. "2.7", "2.4, 8.3"). Required for `adopt` and `adapt`.
   */
  readonly task?: string;
  /** Normative note from plan section 2 (coverage marker, scope, re-open condition). */
  readonly note: string;
  /**
   * Recorded deviation / adaptation reason. Required for `adapt` and
   * `deviation`, and for the adopt-with-deviation rows (A11Y-003).
   */
  readonly deviation?: string;
  /** Condition that re-opens a `defer` / `gated` / `out-of-scope` entry. */
  readonly reOpen?: string;
};

/**
 * SHA-256 of the vendored catalogue `docs/fidelity/obsidian-1.14.4.behaviours.json`.
 * Pinned so a silent edit to the vendored copy fails the matrix test.
 */
export const VENDORED_CATALOGUE_SHA256 =
  "4c19f234635186f394cc711154ecf54522da4e7df2bb0bdc9c1b0aff8c1b7fc8";

/** The catalogue version this map is written against. */
export const CATALOGUE_VERSION = "1.14.4";

/** Number of catalogue entries the plan dispositions (machine-verified). */
export const EXPECTED_ENTRY_COUNT = 114;

/**
 * Every catalogue entry keyed by its short ID (the `OBS-1.14.4-` prefix is implied).
 * Order follows the plan's section 2 tables, grouped by area.
 */
export const DISPOSITIONS: Readonly<Record<string, EntryDisposition>> = {
  // ---- accessibility ----
  "A11Y-001": {
    disposition: "adopt",
    task: "5.4",
    note: "Fold/unfold announces \"Folded/Unfolded lines n to m.\" via a polite aria-live region.",
  },
  "A11Y-002": {
    disposition: "adapt",
    task: "2.10",
    note: "Rendered (external) link text gets `tabindex=\"-1\"` + `draggable=\"true\"`; internal-link rendering is deferred.",
    deviation: "Internal-link rendering is deferred (wikilinks stay literal in v1), so only external link text is adapted.",
  },
  "A11Y-003": {
    disposition: "adopt",
    task: "2.4, 8.3",
    note: "Baseline adopted **plus deviation**: OmniDoc QA §1.1 requires a keyboard path for every action — task toggle and fold exist as commands, so no interaction is pointer-only.",
    deviation: "OmniDoc QA 1.1 (D-4) requires a keyboard path for every action; the artifact leaves some fold/tick widgets pointer-only.",
  },
  // ---- auto-pair ----
  "INPUT-001": {
    disposition: "adopt",
    task: "4.1",
    note: "Union of the bracket group (`(`, `[`, `{`, `'`, `\"`) and the markdown group (`*`, `_`, backtick, triple-backtick); both settings default true; extension only when either is on.",
  },
  "INPUT-002": {
    disposition: "adopt",
    task: "4.2",
    note: "Em-dash at line start after a hyphen → `--` (stateful across two keystrokes).",
  },
  "INPUT-003": {
    disposition: "adopt",
    task: "4.1",
    note: "No code-span/code-block gate; only the `before` string `)]}'\":;>`.",
  },
  "INPUT-004": {
    disposition: "adopt",
    task: "4.1",
    note: "No Markdown line-start input rules in the CM engine.",
  },
  // ---- callouts ----
  "CALLOUT-001": {
    disposition: "adapt",
    task: "3.2",
    note: "13 canonical types + aliases; `important` is canonical (artifact), not a `tip` alias; icons map to Tabler equivalents; colours to token roles; `quote` uses the literal grey.",
    deviation: "Icons map to Tabler equivalents and per-type colours to token roles instead of the artifact's own icon/colour assets.",
  },
  "CALLOUT-002": {
    disposition: "adopt",
    task: "3.2",
    note: "Title = type `trim → lowercase → first char upper`, hyphens→spaces.",
  },
  "CALLOUT-003": {
    disposition: "adopt",
    task: "3.2",
    note: "`+`/`-` parsed after the type; the chevron toggles DOM state + animation and **never writes the document**.",
  },
  "CALLOUT-004": {
    disposition: "adopt",
    task: "3.2",
    note: "Whole block replaced by one widget; inclusive touch predicate; focused-editor only; no partial reveal.",
  },
  "CALLOUT-005": {
    disposition: "adapt",
    task: "3.2",
    note: "Context-menu type submenu (order info, important, tip, success, question, warning, example, quote) + \"None\" (drops the marker line, un-quotes the body); adapt to the web menu component.",
    deviation: "The type submenu is adapted to OmniDoc's web menu component (no Electron native menu).",
  },
  "CALLOUT-006": {
    disposition: "adopt",
    task: "3.2",
    note: "Insert command literal `> [!NOTE]\\n> `, selects offsets 4–8; wraps a selection; refused inside a table cell.",
  },
  "CALLOUT-007": {
    disposition: "adopt",
    task: "3.2",
    note: "Type normalisation `trim().toLowerCase().replace(/\\s+/g,'-')`; the menu checked-state compares the raw slice (case-sensitive) — reproduce.",
  },
  "CALLOUT-008": {
    disposition: "adapt",
    task: "3.2",
    note: "Per-type colour variables → tokens; the dormant inline hex path is not implemented.",
    deviation: "Per-type colour variables become semantic token roles; the dormant inline hex path is not implemented.",
  },
  "CALLOUT-009": {
    disposition: "adapt",
    task: "3.2",
    note: "Icon resolution from the computed icon; inline-SVG path dormant in stock builds → fixed icon set.",
    deviation: "Icon resolution becomes a fixed icon set (the artifact's inline-SVG path is dormant in stock builds).",
  },
  "CALLOUT-010": {
    disposition: "adopt",
    task: "3.2",
    note: "Unbounded nesting; marker only on the innermost quote's first line; every callout gets its own chevron/icon.",
  },
  // ---- clipboard ----
  "CLIP-001": {
    disposition: "adopt",
    task: "7.1",
    note: "Dispatch order: custom MIME → HTML with internal sentinel → plain text → uri-list; HTML→markdown gated by `autoConvertHtml`.",
  },
  "CLIP-002": {
    disposition: "adapt",
    task: "7.1",
    note: "No Electron; `Ctrl/Cmd+Shift+V` is browser-native; a context-menu \"Paste as plain text\" is offered where a menu exists.",
    deviation: "No Electron main process: Ctrl/Cmd+Shift+V stays browser-native and 'Paste as plain text' is offered only where a menu exists.",
  },
  "CLIP-003": {
    disposition: "adopt",
    task: "7.1",
    note: "URL paste over a selection wraps the selection as link text.",
  },
  "CLIP-004": {
    disposition: "defer",
    task: "3.4",
    note: "Attachment naming/embed-set: no attachment storage contract. Re-open with `BL-26`-class storage work.",
    reOpen: "Re-open with BL-26-class attachment/storage work.",
  },
  "CLIP-005": {
    disposition: "defer",
    task: "7.2",
    note: "File-drop link vs embed set + `file:///` modifier: deferred with attachments; the HTML-drop conversion half lands in Task 7.2.",
    reOpen: "Re-open with the attachment storage contract (EMBED-001...005).",
  },
  // ---- commands ----
  "CMD-001": {
    disposition: "adapt",
    task: "6.1",
    note: "67 static command IDs used as a **coverage checklist**; OmniDoc IDs are ours.",
    deviation: "The 67 static command IDs are a coverage checklist; OmniDoc command IDs are our own.",
  },
  "CMD-002": {
    disposition: "adopt",
    task: "6.1",
    note: "Settings control key = config key string.",
  },
  "CMD-003": {
    disposition: "adapt",
    task: "6.1",
    note: "Generated families (headings ×6, highlight ×6, tables, focus) shape our registry.",
    deviation: "Generated families (headings x6, highlight x6, tables, focus) shape the registry rather than being ported verbatim.",
  },
  "CMD-004": {
    disposition: "adopt",
    task: "6.2",
    note: "Default hotkeys live in a separate default-keys map; user overrides win.",
  },
  "CMD-005": {
    disposition: "adopt",
    task: "6.2",
    note: "Exactly one curated keymap; filter `Alt-ArrowUp/Down`, `Shift-Alt-ArrowUp/Down`, `Alt-l`, `Alt-v`, `Ctrl-m`; never install standard/indent-with-tab/closeBrackets/completion keymaps.",
  },
  // ---- comments ----
  "COMMENT-001": {
    disposition: "adopt",
    task: "2.7",
    note: "Live Preview styles comments faint and **never hides** them.",
  },
  "COMMENT-002": {
    disposition: "adopt",
    task: "2.7",
    note: "`%%` toggles a state flag; spans a line break; skipped in code/href; a table row resets it.",
  },
  "COMMENT-003": {
    disposition: "adopt",
    task: "2.7",
    note: "Reading path: inline vs block rules; block requires line start (spaces only, not tabs).",
  },
  "COMMENT-004": {
    disposition: "adopt",
    task: "2.7",
    note: "Unclosed block hides the rest in the reading path only.",
  },
  // ---- context-menus ----
  "MENU-001": {
    disposition: "adapt",
    task: "6.3",
    note: "One menu builder, fixed section order (Format / Paragraph / Insert + token-specific entries); web menu component.",
    deviation: "One menu builder with a fixed section order, rendered with the web menu component.",
  },
  "MENU-002": {
    disposition: "adopt",
    task: "3.3",
    note: "Table-cell menu: row/column ops + sort. Extends the F-14 bubble.",
  },
  "MENU-003": {
    disposition: "out-of-scope",
    note: "Note-composer extract-selection; no such product feature. Re-open if note splitting ships.",
    reOpen: "No note-composer extract-selection feature. Re-open if note splitting ships.",
  },
  // ---- cursor-movement ----
  "CURSOR-001": {
    disposition: "adopt",
    task: "4.4",
    note: "Click-adds-range predicate `altKey && !ctrlKey && !metaKey`; multiple selections enabled.",
  },
  "CURSOR-002": {
    disposition: "adopt",
    task: "4.4",
    note: "Rectangular selection: Shift+Alt+left everywhere; middle-drag except Linux desktop.",
  },
  "TABLE-001": {
    disposition: "adopt",
    task: "3.3",
    note: "One editor per cell holding decoded cell text; pipes/delimiter row unreachable by construction; Tab/Enter navigation; arrows land on the widget line.",
  },
  "TABLE-002": {
    disposition: "adopt",
    task: "4.5",
    note: "Boundary-motion escape rule: retry without opaque skipping when a motion cannot move.",
  },
  "TABLE-003": {
    disposition: "adopt",
    task: "4.5",
    note: "Smart-Home regex `^([>\\s]*)(([*+-] |(\\d+)([.)] ))(?:\\[(.)\\] )?)?`; second press reaches column 0.",
  },
  "TABLE-004": {
    disposition: "adopt",
    task: "4.6",
    note: "Word motion as a syntax-tree walk (waypoint: bracket-prop / length > 2 / char outside `[\\s,.;:]` / has children) + bracket matching + `assoc` −1/+1 + segmented path.",
  },
  "TABLE-005": {
    disposition: "adopt",
    task: "4.7",
    note: "Exactly two atomic providers: folded ranges and image embeds; hidden markers/pipes/callouts are **not** atomic.",
  },
  "TABLE-006": {
    disposition: "adopt",
    task: "4.5",
    note: "End mirrors Home minus the prefix logic.",
  },
  "TABLE-007": {
    disposition: "adopt",
    task: "3.3",
    note: "Tables always rendered; caret redirected into a cell (position match, else first cell of first/last row by direction; RTL swaps targets).",
  },
  // ---- directionality ----
  "DIR-001": {
    disposition: "adopt",
    task: "4.10",
    note: "`perLineTextDirection` on unconditionally; `rightToLeft` from the single locale source.",
  },
  "DIR-002": {
    disposition: "adopt",
    task: "4.10",
    note: "Note-level direction does not disable per-line handling; RTL-aware corner/cell swaps when those surfaces exist.",
  },
  // ---- embeds ----
  "EMBED-001": {
    disposition: "defer",
    task: "3.4",
    note: "Image resize corner + double-click reset. Decision 5: deferred with images.",
    reOpen: "Decision 5: images deferred. Re-open with an attachment storage contract (BL-26-class).",
  },
  "EMBED-002": {
    disposition: "defer",
    task: "3.4",
    note: "Reveal gap/spacer widgets.",
    reOpen: "Decision 5: images deferred. Re-open with an attachment storage contract (BL-26-class).",
  },
  "EMBED-003": {
    disposition: "defer",
    task: "3.4",
    note: "Image tooltip + 250 ms debounce + extension allowlist.",
    reOpen: "Decision 5: images deferred. Re-open with an attachment storage contract (BL-26-class).",
  },
  "EMBED-004": {
    disposition: "defer",
    task: "3.4",
    note: "Media allowlists (recorded as constants in the design note).",
    reOpen: "Decision 5: images deferred. Re-open with an attachment storage contract (BL-26-class).",
  },
  "EMBED-005": {
    disposition: "defer",
    task: "3.4",
    note: "Click-selects-source behaviour (the size pattern is recorded in the design note).",
    reOpen: "Decision 5: images deferred. Re-open with an attachment storage contract (BL-26-class).",
  },
  // ---- folding ----
  "FOLD-001": {
    disposition: "adopt",
    task: "5.1",
    note: "Indent service: blank lines transparent; comparison by visual column (`tabSize`).",
  },
  "FOLD-002": {
    disposition: "adopt",
    task: "5.1",
    note: "Heading service: `^\\s*(#{1,6})(\\s+|$)`; body per the entry's \"last greater level\" rule; fixture-pinned.",
  },
  "FOLD-003": {
    disposition: "adopt",
    task: "5.4",
    note: "Localisable announcements via the announcer.",
  },
  "FOLD-004": {
    disposition: "adopt",
    task: "5.4",
    note: "Folded-code phrase is the empty string.",
  },
  "FOLD-005": {
    disposition: "adopt",
    task: "5.2",
    note: "Gutter marker per foldable line; collapsed state keeps the marker visible (class state, one element).",
  },
  "FOLD-006": {
    disposition: "adopt",
    task: "5.3",
    note: "Toggle/all/unfold-all/less/more with **outermost**-range semantics over the selection-to-line-end span.",
  },
  "FOLD-007": {
    disposition: "adopt",
    task: "5.1",
    note: "Three services: indent, heading, frontmatter/preamble block.",
  },
  "FOLD-008": {
    disposition: "adopt",
    task: "5.5",
    note: "Persistence per note, 0-based ranges + line count, 500 ms debounce, line-count guard.",
  },
  // ---- footnotes ----
  "FOOT-001": {
    disposition: "adapt",
    task: "2.11",
    note: "Inline footnotes parsed/styled; never interactive; named refs styled and classified link-like; navigation/hover deferred (no footnote view).",
    deviation: "Inline/named footnote refs are parsed and styled but never interactive; navigation and hover need a footnote view that does not exist.",
  },
  // ---- ime ----
  "IME-001": {
    disposition: "adopt",
    task: "4.3",
    note: "`compositionend` → empty transaction after 100 ms.",
  },
  "IME-002": {
    disposition: "adopt",
    task: "4.3",
    note: "Input rules suppressed and decorations mapped (not rebuilt) while composing.",
  },
  // ---- link-interaction ----
  "LINK-001": {
    disposition: "adapt",
    task: "2.10",
    note: "Modifier set → pane target maps to app navigation; no split/window halves; `focusNewTab` not applicable.",
    deviation: "Pane targets map to app navigation (current surface / browser tab); no splits or pop-out windows exist.",
  },
  "LINK-002": {
    disposition: "adopt",
    task: "2.10",
    note: "Source mode: plain click = caret. Live Preview: only the rendered text follows; raw syntax places the caret.",
  },
  "LINK-003": {
    disposition: "adopt",
    task: "2.10",
    note: "Source mode Mod-click downgraded to same-tab unless Shift is held; middle-click exempt.",
  },
  "LINK-004": {
    disposition: "adopt",
    task: "2.10",
    note: "Live Preview: a non-collapsed DOM selection containing the target blocks navigation.",
  },
  "LINK-005": {
    disposition: "adopt",
    task: "2.10",
    note: "Alt/Shift plain-click reserved for editor selection gestures.",
  },
  "LINK-006": {
    disposition: "defer",
    task: "2.10",
    note: "Unresolved-link marking + click-to-create: gated with internal links (wikilinks stay literal in v1).",
    reOpen: "Wikilinks/internal links stay literal in v1 (G-2). Re-open when internal links ship.",
  },
  "LINK-007": {
    disposition: "defer",
    task: "2.10",
    note: "Hover preview (300 ms / 2000 ms / per-surface modifiers): no page-preview surface. Re-open with internal links.",
    reOpen: "No page-preview surface exists. Re-open with internal links.",
  },
  "LINK-008": {
    disposition: "defer",
    task: "2.10",
    note: "`[[` suggest sub-modes: wikilinks deferred. Design recorded in the entry.",
    reOpen: "[[ suggest sub-modes need wikilinks. Re-open with internal links.",
  },
  "LINK-009": {
    disposition: "adapt",
    task: "2.10",
    note: "Scheme gating moves into the renderer (architecture §6): `http/https/mailto` inline; anything else → confirm modal + per-session allowlist.",
    deviation: "Scheme gating moves into the renderer (architecture 6, D-2): http/https/mailto inline, everything else behind a confirm modal and a per-session allowlist.",
  },
  "LINK-010": {
    disposition: "adapt",
    task: "2.10",
    note: "Middle-click: new tab where browser-meaningful; modifiers ignored for the target decision.",
    deviation: "Middle-click opens a browser tab where meaningful; the target decision ignores modifiers.",
  },
  "LINK-011": {
    disposition: "adopt",
    task: "2.10",
    note: "Editor link activation deferred 100 ms.",
  },
  "LINK-012": {
    disposition: "out-of-scope",
    note: "`obsidian://` URI parsing. An `omni://` equivalent is a future contract item.",
    reOpen: "obsidian:// URI parsing is out of scope; an omni:// equivalent is a future contract item.",
  },
  // ---- math-mermaid ----
  "MATH-001": {
    disposition: "gated",
    task: "3.5",
    note: "Inline-vs-block reveal asymmetry: design recorded.",
    reOpen: "Decision 9: math stays gated. Re-open with an explicit @user yes plus a version-ledger pin.",
  },
  "MATH-002": {
    disposition: "gated",
    task: "3.5",
    note: "Delimiters extracted by the editor (no delimiter scanning in the renderer).",
    reOpen: "Decision 9: math stays gated. Re-open with an explicit @user yes plus a version-ledger pin.",
  },
  "MATH-003": {
    disposition: "gated",
    task: "3.5",
    note: "Errors surface as a rendered error node, not a crash.",
    reOpen: "Decision 9: math stays gated. Re-open with an explicit @user yes plus a version-ledger pin.",
  },
  "MATH-004": {
    disposition: "gated",
    task: "3.5",
    note: "Negative: no copy-as-TeX/SVG/MathML menus.",
    reOpen: "Decision 9: math stays gated. Re-open with an explicit @user yes plus a version-ledger pin.",
  },
  "MERMAID-001": {
    disposition: "gated",
    task: "3.5",
    note: "Per-note trust prompt before any diagram renders.",
    reOpen: "Decision 9: Mermaid stays gated. Re-open with an explicit @user yes plus a version-ledger pin.",
  },
  "MERMAID-002": {
    disposition: "gated",
    task: "3.5",
    note: "Parse failure renders a visible error block.",
    reOpen: "Decision 9: Mermaid stays gated. Re-open with an explicit @user yes plus a version-ledger pin.",
  },
  "MERMAID-003": {
    disposition: "gated",
    task: "3.5",
    note: "`internal-link` node labels become anchors (routed through the link handler).",
    reOpen: "Decision 9: Mermaid stays gated. Re-open with an explicit @user yes plus a version-ledger pin.",
  },
  "MERMAID-004": {
    disposition: "gated",
    task: "3.5",
    note: "Negative: no fullscreen affordance.",
    reOpen: "Decision 9: Mermaid stays gated. Re-open with an explicit @user yes plus a version-ledger pin.",
  },
  // ---- properties ----
  "PROP-001": {
    disposition: "out-of-scope",
    note: "Properties display gating: no frontmatter model. Re-open if frontmatter becomes a construct.",
    reOpen: "No frontmatter model. Re-open if frontmatter becomes a construct.",
  },
  "PROP-002": {
    disposition: "out-of-scope",
    note: "Property keymap.",
    reOpen: "No frontmatter model. Re-open if frontmatter becomes a construct.",
  },
  "PROP-003": {
    disposition: "out-of-scope",
    note: "Hidden-properties fallback.",
    reOpen: "No frontmatter model. Re-open if frontmatter becomes a construct.",
  },
  // ---- reveal ----
  "REVEAL-001": {
    disposition: "adopt",
    task: "2.2",
    note: "Inclusive touch predicate `from <= to && to >= from`.",
  },
  "REVEAL-002": {
    disposition: "adopt",
    task: "2.2",
    note: "Only the focused editor's ranges participate.",
  },
  "REVEAL-003": {
    disposition: "adopt",
    task: "6.5",
    note: "An active search highlight overlapping a construct forces reveal.",
  },
  "REVEAL-004": {
    disposition: "adopt",
    task: "2.4",
    note: "Three empty replace singletons.",
  },
  "REVEAL-005": {
    disposition: "adopt",
    task: "2.4",
    note: "Rendered link text: underlined, `tabindex=-1`, draggable.",
  },
  "REVEAL-006": {
    disposition: "adopt",
    task: "2.3",
    note: "Guard is one ViewPlugin flag; pointer-down / composing / short tree → map-only.",
  },
  "REVEAL-007": {
    disposition: "adopt",
    task: "2.6",
    note: "Blockquote border widget carries the literal `>` with a transparency class.",
  },
  "REVEAL-008": {
    disposition: "adopt",
    task: "2.1, 2.5",
    note: "5 inline-formatting + 6 link-like kinds; per-delimiter widths are partial in the catalogue — implement from delimiter length and record.",
  },
  "REVEAL-009": {
    disposition: "adopt",
    task: "3.1",
    note: "Fence regex: 3+ tildes or backticks; a backtick is forbidden in the info string (literal in Task 3.1).",
  },
  "REVEAL-010": {
    disposition: "adopt",
    task: "2.3",
    note: "Five deferral delays: focus/blur 10, pointer release 50, composition end 100, mobile drag 700, caret nudge 0; transaction synchronous.",
  },
  "REVEAL-011": {
    disposition: "adopt",
    task: "2.2",
    note: "Accumulated spans; whole-line spans for heading/quote/escape.",
  },
  // ---- settings ----
  "SET-001": {
    disposition: "adapt",
    task: "1.1",
    note: "Obsidian's default table adopted per-key; `useTab: true` now matches (decision 3); deviations listed in §4.1.",
    deviation: "Obsidian's default table is adopted per key; deviations from it are listed in plan 4.1 (e.g. propertiesInDocument and readableLineLength do not apply).",
  },
  "SET-002": {
    disposition: "adopt",
    task: "1.3, 4.9",
    note: "The eight live-reconfigured keys: useTab, tabSize, rightToLeft, spellcheck, autoPairBrackets, autoPairMarkdown, smartIndentList, vimMode (vim gated).",
  },
  // ---- slash-commands ----
  "SLASH-001": {
    disposition: "deviation",
    task: "6.4",
    note: "OmniDoc default-**on** (decision 7); artifact is off. Recorded deviation.",
    deviation: "Decision 7 (D-1): slash commands default ON for discoverability; the artifact defaults them off.",
  },
  "SLASH-002": {
    disposition: "adopt",
    task: "6.4",
    note: "Trigger `/(^|\\s)\\/([^\\s\\/]*)$/`; a space closes the popup.",
  },
  "SLASH-003": {
    disposition: "adopt",
    task: "6.4",
    note: "The slash text is deleted, then the command runs.",
  },
  "SLASH-004": {
    disposition: "adapt",
    task: "6.4",
    note: "Suggestion list = our command registry, fuzzy-matched, hotkey chips.",
    deviation: "The suggestion list is OmniDoc's own command registry, fuzzy-matched with hotkey chips, instead of the artifact's fixed insert list.",
  },
  // ---- smart-lists ----
  "LIST-001": {
    disposition: "adopt",
    task: "4.8",
    note: "Region test first; ordered = +1 with delimiter preserved; tasks continue unchecked; four empty-item cases; Shift+Enter plain.",
  },
  "LIST-002": {
    disposition: "adopt",
    task: "4.8",
    note: "Tab/Shift+Tab = indent-more/less; digit-only renumber; no bullet normalisation.",
  },
  "LIST-003": {
    disposition: "adopt",
    task: "4.8",
    note: "Indent unit = tab when `useTab`, else four spaces.",
  },
  // ---- tags ----
  "TAG-001": {
    disposition: "adopt",
    task: "2.9",
    note: "Exclusion-class regex (Unicode General Punctuation + listed ASCII + whitespace); longest-prefix match.",
  },
  "TAG-002": {
    disposition: "defer",
    task: "2.9",
    note: "Autocomplete trigger: needs a tag source; waits for `BL-26`. Trigger regex recorded.",
    reOpen: "Needs a tag source: waits for the BL-26 collections/tags contract.",
  },
  "TAG-003": {
    disposition: "adopt",
    task: "2.9",
    note: "Three-part class split (`hashtag / begin / end` equivalents).",
  },
  "TAG-004": {
    disposition: "defer",
    task: "2.9",
    note: "Click → tag search: deferred (decision 8).",
    reOpen: "Decision 8: tag click waits for the BL-26 collections/tags contract.",
  },
  "TAG-005": {
    disposition: "adopt",
    task: "2.9",
    note: "One shared regex constant feeds parsing, styling and scanning — no triplication.",
  },
  // ---- task-lists ----
  "TASK-001": {
    disposition: "adopt",
    task: "2.8",
    note: "Writes `x` on check, space on uncheck; original char not preserved; focus/selection unchanged.",
  },
  // ---- undo ----
  "HIST-001": {
    disposition: "adopt",
    task: "5.6",
    note: "Undo `Mod-z`; redo `Mod-y` + `Mod-Shift-z`; Linux `Ctrl-Shift-z`.",
  },
  "HIST-002": {
    disposition: "adopt",
    task: "5.6",
    note: "500 ms + range-overlap coalescing; no `isolateHistory`; history survives mode switches; 20-entry in-memory LRU.",
  },
  // ---- undocumented ----
  "UNDOC-001": {
    disposition: "adopt",
    task: "6.1",
    note: "The 23-surface list is a coverage checklist for the registry.",
  },
  "UNDOC-002": {
    disposition: "adopt",
    task: "§4.1",
    note: "Defaults recorded; deviations live in §4.1.",
  },
};

/** Every entry ID in the map, in plan order. */
export const DISPOSITION_IDS: readonly string[] = Object.keys(DISPOSITIONS);

