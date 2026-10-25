# Obsidian 1.14.4 parity matrix — F-15 Rev 2

**Generated view — do not edit by hand.** Rendered from the vendored
catalogue plus
`packages/ui/src/codemirror/parity/dispositions.ts` by
`packages/ui/src/codemirror/parity/matrix.test.ts`. Regenerated at each plan
phase close.

| Field | Value |
|---|---|
| Artifact | Obsidian 1.14.4 (desktop, linux, Electron 43) |
| Artifact SHA-256 | `146ef8470d8cbb4a6db209bdc19bf2bad13350444186c0fd93c31087b142b92f` |
| Artifact analysed | 2026-10-13T02:20:00Z |
| Vendored catalogue | `docs/fidelity/obsidian-1.14.4.behaviours.json` |
| Vendored SHA-256 | `4c19f234635186f394cc711154ecf54522da4e7df2bb0bdc9c1b0aff8c1b7fc8` |
| Entries | 114 |
| Totals | 73 adopt · 15 adapt · 1 deviation · 12 defer · 8 gated · 5 out-of-scope |
| Plan of record | `docs/plans/2026-10-13_181100-obsidian-fidelity-editor.md` |
| Dispositions map | `packages/ui/src/codemirror/parity/dispositions.ts` |

Task references are the plan's `<phase>.<task>` numbers; `§4.1` means the
plan's settings table rather than a phase task. A note is normative for
implementation (plan §2).

**Totals:** **73 adopt** · **15 adapt** · **1 deviation** · **12 defer** · **8 gated** · **5 out-of-scope**.

## accessibility (3)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-A11Y-001` | adopt | 5.4 | verified | Fold/unfold announces "Folded/Unfolded lines n to m." via a polite aria-live region. |
| `OBS-1.14.4-A11Y-002` | adapt | 2.10 | partial +unknowns | Rendered (external) link text gets `tabindex="-1"` + `draggable="true"`; internal-link rendering is deferred. |
| `OBS-1.14.4-A11Y-003` | adopt | 2.4, 8.3 | verified +unknowns | Baseline adopted **plus deviation**: OmniDoc QA §1.1 requires a keyboard path for every action — task toggle and fold exist as commands, so no interaction is pointer-only. |

## auto-pair (4)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-INPUT-001` | adopt | 4.1 | verified +unknowns | Union of the bracket group (`(`, `[`, `{`, `'`, `"`) and the markdown group (`*`, `_`, backtick, triple-backtick); both settings default true; extension only when either is on. |
| `OBS-1.14.4-INPUT-002` | adopt | 4.2 | verified | Em-dash at line start after a hyphen → `--` (stateful across two keystrokes). |
| `OBS-1.14.4-INPUT-003` | adopt | 4.1 | verified | No code-span/code-block gate; only the `before` string `)]}'":;>`. |
| `OBS-1.14.4-INPUT-004` | adopt | 4.1 | verified | No Markdown line-start input rules in the CM engine. |

## callouts (10)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-CALLOUT-001` | adapt | 3.2 | verified | 13 canonical types + aliases; `important` is canonical (artifact), not a `tip` alias; icons map to Tabler equivalents; colours to token roles; `quote` uses the literal grey. |
| `OBS-1.14.4-CALLOUT-002` | adopt | 3.2 | verified | Title = type `trim → lowercase → first char upper`, hyphens→spaces. |
| `OBS-1.14.4-CALLOUT-003` | adopt | 3.2 | verified +unknowns | `+`/`-` parsed after the type; the chevron toggles DOM state + animation and **never writes the document**. |
| `OBS-1.14.4-CALLOUT-004` | adopt | 3.2 | verified | Whole block replaced by one widget; inclusive touch predicate; focused-editor only; no partial reveal. |
| `OBS-1.14.4-CALLOUT-005` | adapt | 3.2 | verified | Context-menu type submenu (order info, important, tip, success, question, warning, example, quote) + "None" (drops the marker line, un-quotes the body); adapt to the web menu component. |
| `OBS-1.14.4-CALLOUT-006` | adopt | 3.2 | verified | Insert command literal `> [!NOTE]\n> `, selects offsets 4–8; wraps a selection; refused inside a table cell. |
| `OBS-1.14.4-CALLOUT-007` | adopt | 3.2 | verified | Type normalisation `trim().toLowerCase().replace(/\s+/g,'-')`; the menu checked-state compares the raw slice (case-sensitive) — reproduce. |
| `OBS-1.14.4-CALLOUT-008` | adapt | 3.2 | verified +unknowns | Per-type colour variables → tokens; the dormant inline hex path is not implemented. |
| `OBS-1.14.4-CALLOUT-009` | adapt | 3.2 | verified | Icon resolution from the computed icon; inline-SVG path dormant in stock builds → fixed icon set. |
| `OBS-1.14.4-CALLOUT-010` | adopt | 3.2 | verified | Unbounded nesting; marker only on the innermost quote's first line; every callout gets its own chevron/icon. |

## clipboard (5)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-CLIP-001` | adopt | 7.1 | verified | Dispatch order: custom MIME → HTML with internal sentinel → plain text → uri-list; HTML→markdown gated by `autoConvertHtml`. |
| `OBS-1.14.4-CLIP-002` | adapt | 7.1 | verified | No Electron; `Ctrl/Cmd+Shift+V` is browser-native; a context-menu "Paste as plain text" is offered where a menu exists. |
| `OBS-1.14.4-CLIP-003` | adopt | 7.1 | verified +unknowns | URL paste over a selection wraps the selection as link text. |
| `OBS-1.14.4-CLIP-004` | defer | 3.4 | verified | Attachment naming/embed-set: no attachment storage contract. Re-open with `BL-26`-class storage work. |
| `OBS-1.14.4-CLIP-005` | defer | 7.2 | verified | File-drop link vs embed set + `file:///` modifier: deferred with attachments; the HTML-drop conversion half lands in Task 7.2. |

## commands (5)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-CMD-001` | adapt | 6.1 | verified +unknowns | 67 static command IDs used as a **coverage checklist**; OmniDoc IDs are ours. |
| `OBS-1.14.4-CMD-002` | adopt | 6.1 | verified | Settings control key = config key string. |
| `OBS-1.14.4-CMD-003` | adapt | 6.1 | verified | Generated families (headings ×6, highlight ×6, tables, focus) shape our registry. |
| `OBS-1.14.4-CMD-004` | adopt | 6.2 | verified +unknowns | Default hotkeys live in a separate default-keys map; user overrides win. |
| `OBS-1.14.4-CMD-005` | adopt | 6.2 | verified | Exactly one curated keymap; filter `Alt-ArrowUp/Down`, `Shift-Alt-ArrowUp/Down`, `Alt-l`, `Alt-v`, `Ctrl-m`; never install standard/indent-with-tab/closeBrackets/completion keymaps. |

## comments (4)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-COMMENT-001` | adopt | 2.7 | verified +unknowns | Live Preview styles comments faint and **never hides** them. |
| `OBS-1.14.4-COMMENT-002` | adopt | 2.7 | verified | `%%` toggles a state flag; spans a line break; skipped in code/href; a table row resets it. |
| `OBS-1.14.4-COMMENT-003` | adopt | 2.7 | verified +unknowns | Reading path: inline vs block rules; block requires line start (spaces only, not tabs). |
| `OBS-1.14.4-COMMENT-004` | adopt | 2.7 | verified | Unclosed block hides the rest in the reading path only. |

## context-menus (3)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-MENU-001` | adapt | 6.3 | verified +unknowns | One menu builder, fixed section order (Format / Paragraph / Insert + token-specific entries); web menu component. |
| `OBS-1.14.4-MENU-002` | adopt | 3.3 | verified +unknowns | Table-cell context menu (right-click / ContextMenu / Shift+F10): row/column operations and sort. The pure sections/command model is the Task 6.3 seam; it stays separate from the general editor menu. |
| `OBS-1.14.4-MENU-003` | out-of-scope | — | verified | Note-composer extract-selection; no such product feature. Re-open if note splitting ships. |

## cursor-movement (9)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-CURSOR-001` | adopt | 4.4 | verified +unknowns | Click-adds-range predicate `altKey && !ctrlKey && !metaKey`; multiple selections enabled. |
| `OBS-1.14.4-CURSOR-002` | adopt | 4.4 | verified | Rectangular selection: Shift+Alt+left everywhere; middle-drag except Linux desktop. |
| `OBS-1.14.4-TABLE-001` | adopt | 3.3 | verified +unknowns | One editor per cell holding decoded cell text; pipes/delimiter row unreachable by construction; Tab/Enter navigation; arrows land on the widget line. |
| `OBS-1.14.4-TABLE-002` | adopt | 4.5 | verified | Boundary-motion escape rule: retry without opaque skipping when a motion cannot move. |
| `OBS-1.14.4-TABLE-003` | adopt | 4.5 | verified | Smart-Home regex `^([>\s]*)(([*+-] \|(\d+)([.)] ))(?:\[(.)\] )?)?`; second press reaches column 0. |
| `OBS-1.14.4-TABLE-004` | adopt | 4.6 | verified | Word motion as a syntax-tree walk (waypoint: bracket-prop / length > 2 / char outside `[\s,.;:]` / has children) + bracket matching + `assoc` −1/+1 + segmented path. |
| `OBS-1.14.4-TABLE-005` | adopt | 4.7 | verified | Exactly two atomic providers: folded ranges and image embeds; hidden markers/pipes/callouts are **not** atomic. |
| `OBS-1.14.4-TABLE-006` | adopt | 4.5 | verified | End mirrors Home minus the prefix logic. |
| `OBS-1.14.4-TABLE-007` | adopt | 3.3 | verified | Tables always rendered; caret redirected into a cell (position match, else first cell of first/last row by direction; RTL swaps targets). |

## directionality (2)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-DIR-001` | adopt | 4.10 | partial +unknowns | `perLineTextDirection` on unconditionally; `rightToLeft` from the single locale source. |
| `OBS-1.14.4-DIR-002` | adopt | 4.10 | verified | Note-level direction does not disable per-line handling; RTL-aware corner/cell swaps when those surfaces exist. |

## embeds (5)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-EMBED-001` | defer | 3.4 | verified +unknowns | Image resize corner + double-click reset. Decision 5: deferred with images. |
| `OBS-1.14.4-EMBED-002` | defer | 3.4 | verified | Reveal gap/spacer widgets. |
| `OBS-1.14.4-EMBED-003` | defer | 3.4 | verified | Image tooltip + 250 ms debounce + extension allowlist. |
| `OBS-1.14.4-EMBED-004` | defer | 3.4 | verified +unknowns | Media allowlists (recorded as constants in the design note). |
| `OBS-1.14.4-EMBED-005` | defer | 3.4 | verified | Click-selects-source behaviour (the size pattern is recorded in the design note). |

## folding (8)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-FOLD-001` | adopt | 5.1 | verified | Indent service: blank lines transparent; comparison by visual column (`tabSize`). |
| `OBS-1.14.4-FOLD-002` | adopt | 5.1 | verified | Heading service: `^\s*(#{1,6})(\s+\|$)`; body per the entry's "last greater level" rule; fixture-pinned. |
| `OBS-1.14.4-FOLD-003` | adopt | 5.4 | verified | Localisable announcements via the announcer. |
| `OBS-1.14.4-FOLD-004` | adopt | 5.4 | verified | Folded-code phrase is the empty string. |
| `OBS-1.14.4-FOLD-005` | adopt | 5.2 | verified | Gutter marker per foldable line; collapsed state keeps the marker visible (class state, one element). |
| `OBS-1.14.4-FOLD-006` | adopt | 5.3 | verified +unknowns | Toggle/all/unfold-all/less/more with **outermost**-range semantics over the selection-to-line-end span. |
| `OBS-1.14.4-FOLD-007` | adopt | 5.1 | verified | Three services: indent, heading, frontmatter/preamble block. |
| `OBS-1.14.4-FOLD-008` | adopt | 5.5 | verified | Persistence per note, 0-based ranges + line count, 500 ms debounce, line-count guard. |

## footnotes (1)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-FOOT-001` | adapt | 2.11 | verified +unknowns | Inline footnotes parsed/styled; never interactive; named refs styled and classified link-like; navigation/hover deferred (no footnote view). |

## ime (2)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-IME-001` | adopt | 4.3 | verified | `compositionend` → empty transaction after 100 ms. |
| `OBS-1.14.4-IME-002` | adopt | 4.3 | verified | Input rules suppressed and decorations mapped (not rebuilt) while composing. |

## link-interaction (12)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-LINK-001` | adapt | 2.10 | verified | Modifier set → pane target maps to app navigation; no split/window halves; `focusNewTab` not applicable. |
| `OBS-1.14.4-LINK-002` | adopt | 2.10 | verified | Source mode: plain click = caret. Live Preview: only the rendered text follows; raw syntax places the caret. |
| `OBS-1.14.4-LINK-003` | adopt | 2.10 | verified | Source mode Mod-click downgraded to same-tab unless Shift is held; middle-click exempt. |
| `OBS-1.14.4-LINK-004` | adopt | 2.10 | verified | Live Preview: a non-collapsed DOM selection containing the target blocks navigation. |
| `OBS-1.14.4-LINK-005` | adopt | 2.10 | verified | Alt/Shift plain-click reserved for editor selection gestures. |
| `OBS-1.14.4-LINK-006` | defer | 2.10 | verified | Unresolved-link marking + click-to-create: gated with internal links (wikilinks stay literal in v1). |
| `OBS-1.14.4-LINK-007` | defer | 2.10 | verified +unknowns | Hover preview (300 ms / 2000 ms / per-surface modifiers): no page-preview surface. Re-open with internal links. |
| `OBS-1.14.4-LINK-008` | defer | 2.10 | verified | `[[` suggest sub-modes: wikilinks deferred. Design recorded in the entry. |
| `OBS-1.14.4-LINK-009` | adapt | 2.10 | verified +unknowns | Scheme gating moves into the renderer (architecture §6): `http/https/mailto` inline; anything else → confirm modal + per-session allowlist. |
| `OBS-1.14.4-LINK-010` | adapt | 2.10 | verified | Middle-click: new tab where browser-meaningful; modifiers ignored for the target decision. |
| `OBS-1.14.4-LINK-011` | adopt | 2.10 | verified | Editor link activation deferred 100 ms. |
| `OBS-1.14.4-LINK-012` | out-of-scope | — | verified | `obsidian://` URI parsing. An `omni://` equivalent is a future contract item. |

## math-mermaid (8)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-MATH-001` | gated | 3.5 | verified | Inline-vs-block reveal asymmetry: design recorded. |
| `OBS-1.14.4-MATH-002` | gated | 3.5 | verified | Delimiters extracted by the editor (no delimiter scanning in the renderer). |
| `OBS-1.14.4-MATH-003` | gated | 3.5 | verified | Errors surface as a rendered error node, not a crash. |
| `OBS-1.14.4-MATH-004` | gated | 3.5 | verified | Negative: no copy-as-TeX/SVG/MathML menus. |
| `OBS-1.14.4-MERMAID-001` | gated | 3.5 | verified | Per-note trust prompt before any diagram renders. |
| `OBS-1.14.4-MERMAID-002` | gated | 3.5 | verified | Parse failure renders a visible error block. |
| `OBS-1.14.4-MERMAID-003` | gated | 3.5 | verified | `internal-link` node labels become anchors (routed through the link handler). |
| `OBS-1.14.4-MERMAID-004` | gated | 3.5 | verified | Negative: no fullscreen affordance. |

## properties (3)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-PROP-001` | out-of-scope | — | verified | Properties display gating: no frontmatter model. Re-open if frontmatter becomes a construct. |
| `OBS-1.14.4-PROP-002` | out-of-scope | — | verified | Property keymap. |
| `OBS-1.14.4-PROP-003` | out-of-scope | — | verified | Hidden-properties fallback. |

## reveal (11)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-REVEAL-001` | adopt | 2.2 | verified | Inclusive touch predicate `from <= to && to >= from`. |
| `OBS-1.14.4-REVEAL-002` | adopt | 2.2 | verified | Only the focused editor's ranges participate. |
| `OBS-1.14.4-REVEAL-003` | adopt | 6.5 | verified | An active search highlight overlapping a construct forces reveal. |
| `OBS-1.14.4-REVEAL-004` | adopt | 2.4 | verified +unknowns | Three empty replace singletons. |
| `OBS-1.14.4-REVEAL-005` | adopt | 2.4 | verified | Rendered link text: underlined, `tabindex=-1`, draggable. |
| `OBS-1.14.4-REVEAL-006` | adopt | 2.3 | verified +unknowns | Guard is one ViewPlugin flag; pointer-down / composing / short tree → map-only. |
| `OBS-1.14.4-REVEAL-007` | adopt | 2.6 | verified | Blockquote border widget carries the literal `>` with a transparency class. |
| `OBS-1.14.4-REVEAL-008` | adopt | 2.1, 2.5 | verified +unknowns | 5 inline-formatting + 6 link-like kinds; per-delimiter widths are partial in the catalogue — implement from delimiter length and record. |
| `OBS-1.14.4-REVEAL-009` | adopt | 3.1 | verified | Fence regex: 3+ tildes or backticks; a backtick is forbidden in the info string (literal in Task 3.1). |
| `OBS-1.14.4-REVEAL-010` | adopt | 2.3 | verified | Five deferral delays: focus/blur 10, pointer release 50, composition end 100, mobile drag 700, caret nudge 0; transaction synchronous. |
| `OBS-1.14.4-REVEAL-011` | adopt | 2.2 | verified | Accumulated spans; whole-line spans for heading/quote/escape. |

## settings (2)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-SET-001` | adapt | 1.1 | verified +unknowns | Obsidian's default table adopted per-key; `useTab: true` now matches (decision 3); deviations listed in §4.1. |
| `OBS-1.14.4-SET-002` | adopt | 1.3, 4.9 | verified | The eight live-reconfigured keys: useTab, tabSize, rightToLeft, spellcheck, autoPairBrackets, autoPairMarkdown, smartIndentList, vimMode (vim gated). |

## slash-commands (4)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-SLASH-001` | deviation | 6.4 | verified | OmniDoc default-**on** (decision 7); artifact is off. Recorded deviation. |
| `OBS-1.14.4-SLASH-002` | adopt | 6.4 | verified +unknowns | Trigger `/(^\|\s)\/([^\s\/]*)$/`; a space closes the popup. |
| `OBS-1.14.4-SLASH-003` | adopt | 6.4 | verified | The slash text is deleted, then the command runs. |
| `OBS-1.14.4-SLASH-004` | adapt | 6.4 | verified | Suggestion list = our command registry, fuzzy-matched, hotkey chips. |

## smart-lists (3)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-LIST-001` | adopt | 4.8 | verified | Region test first; ordered = +1 with delimiter preserved; tasks continue unchecked; four empty-item cases; Shift+Enter plain. |
| `OBS-1.14.4-LIST-002` | adopt | 4.8 | verified | Tab/Shift+Tab = indent-more/less; digit-only renumber; no bullet normalisation. |
| `OBS-1.14.4-LIST-003` | adopt | 4.8 | verified | Indent unit = tab when `useTab`, else four spaces. |

## tags (5)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-TAG-001` | adopt | 2.9 | verified +unknowns | Exclusion-class regex (Unicode General Punctuation + listed ASCII + whitespace); longest-prefix match. |
| `OBS-1.14.4-TAG-002` | defer | 2.9 | verified +unknowns | Autocomplete trigger: needs a tag source; waits for `BL-26`. Trigger regex recorded. |
| `OBS-1.14.4-TAG-003` | adopt | 2.9 | partial +unknowns | Three-part class split (`hashtag / begin / end` equivalents). |
| `OBS-1.14.4-TAG-004` | defer | 2.9 | verified | Click → tag search: deferred (decision 8). |
| `OBS-1.14.4-TAG-005` | adopt | 2.9 | verified | One shared regex constant feeds parsing, styling and scanning — no triplication. |

## task-lists (1)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-TASK-001` | adopt | 2.8 | verified +unknowns | Writes `x` on check, space on uncheck; original char not preserved; focus/selection unchanged. |

## undo (2)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-HIST-001` | adopt | 5.6 | verified +unknowns | Undo `Mod-z`; redo `Mod-y` + `Mod-Shift-z`; Linux `Ctrl-Shift-z`. |
| `OBS-1.14.4-HIST-002` | adopt | 5.6 | verified | 500 ms + range-overlap coalescing; no `isolateHistory`; history survives mode switches; 20-entry in-memory LRU. |

## undocumented (2)

| Entry | Disposition | Task | Coverage | Note |
|---|---|---|---|---|
| `OBS-1.14.4-UNDOC-001` | adopt | 6.1 | verified +unknowns | The 23-surface list is a coverage checklist for the registry. |
| `OBS-1.14.4-UNDOC-002` | adopt | §4.1 | verified +unknowns | Defaults recorded; deviations live in §4.1. |

## Recorded deviations and adaptations

Plan §4.2 records the project-level deviations (D-1…D-9). The rows below are
entry-level adaptation reasons — the catalogue behaviour is matched, the
integration point is ours.

| Entry | Disposition | Recorded reason |
|---|---|---|
| `OBS-1.14.4-A11Y-002` | adapt | Internal-link rendering is deferred (wikilinks stay literal in v1), so only external link text is adapted. |
| `OBS-1.14.4-A11Y-003` | adopt | OmniDoc QA 1.1 (D-4) requires a keyboard path for every action; the artifact leaves some fold/tick widgets pointer-only. |
| `OBS-1.14.4-CALLOUT-001` | adapt | Icons map to Tabler equivalents and per-type colours to token roles instead of the artifact's own icon/colour assets. |
| `OBS-1.14.4-CALLOUT-005` | adapt | The type submenu is adapted to OmniDoc's web menu component (no Electron native menu). |
| `OBS-1.14.4-CALLOUT-008` | adapt | Per-type colour variables become semantic token roles; the dormant inline hex path is not implemented. |
| `OBS-1.14.4-CALLOUT-009` | adapt | Icon resolution becomes a fixed icon set (the artifact's inline-SVG path is dormant in stock builds). |
| `OBS-1.14.4-CLIP-002` | adapt | No Electron main process: Ctrl/Cmd+Shift+V stays browser-native and 'Paste as plain text' is offered only where a menu exists. |
| `OBS-1.14.4-CMD-001` | adapt | The 67 static command IDs are a coverage checklist; OmniDoc command IDs are our own. |
| `OBS-1.14.4-CMD-003` | adapt | Generated families (headings x6, highlight x6, tables, focus) shape the registry rather than being ported verbatim. |
| `OBS-1.14.4-MENU-001` | adapt | One menu builder with a fixed section order, rendered with the web menu component. |
| `OBS-1.14.4-FOOT-001` | adapt | Inline/named footnote refs are parsed and styled but never interactive; navigation and hover need a footnote view that does not exist. |
| `OBS-1.14.4-LINK-001` | adapt | Pane targets map to app navigation (current surface / browser tab); no splits or pop-out windows exist. |
| `OBS-1.14.4-LINK-009` | adapt | Scheme gating moves into the renderer (architecture 6, D-2): http/https/mailto inline, everything else behind a confirm modal and a per-session allowlist. |
| `OBS-1.14.4-LINK-010` | adapt | Middle-click opens a browser tab where meaningful; the target decision ignores modifiers. |
| `OBS-1.14.4-SET-001` | adapt | Obsidian's default table is adopted per key; deviations from it are listed in plan 4.1 (e.g. propertiesInDocument and readableLineLength do not apply). |
| `OBS-1.14.4-SLASH-001` | deviation | Decision 7 (D-1): slash commands default ON for discoverability; the artifact defaults them off. |
| `OBS-1.14.4-SLASH-004` | adapt | The suggestion list is OmniDoc's own command registry, fuzzy-matched with hotkey chips, instead of the artifact's fixed insert list. |

## Deferred, gated and out-of-scope

These rows carry **no implementation task**. The re-open condition is the
only way they re-enter the plan (plan §0.4 negatives and §4.4 unknowns are
not upgrades of these rows).

| Entry | Disposition | Plan reference | Re-open condition |
|---|---|---|---|
| `OBS-1.14.4-CLIP-004` | defer | 3.4 | Re-open with BL-26-class attachment/storage work. |
| `OBS-1.14.4-CLIP-005` | defer | 7.2 | Re-open with the attachment storage contract (EMBED-001...005). |
| `OBS-1.14.4-MENU-003` | out-of-scope | — | No note-composer extract-selection feature. Re-open if note splitting ships. |
| `OBS-1.14.4-EMBED-001` | defer | 3.4 | Decision 5: images deferred. Re-open with an attachment storage contract (BL-26-class). |
| `OBS-1.14.4-EMBED-002` | defer | 3.4 | Decision 5: images deferred. Re-open with an attachment storage contract (BL-26-class). |
| `OBS-1.14.4-EMBED-003` | defer | 3.4 | Decision 5: images deferred. Re-open with an attachment storage contract (BL-26-class). |
| `OBS-1.14.4-EMBED-004` | defer | 3.4 | Decision 5: images deferred. Re-open with an attachment storage contract (BL-26-class). |
| `OBS-1.14.4-EMBED-005` | defer | 3.4 | Decision 5: images deferred. Re-open with an attachment storage contract (BL-26-class). |
| `OBS-1.14.4-LINK-006` | defer | 2.10 | Wikilinks/internal links stay literal in v1 (G-2). Re-open when internal links ship. |
| `OBS-1.14.4-LINK-007` | defer | 2.10 | No page-preview surface exists. Re-open with internal links. |
| `OBS-1.14.4-LINK-008` | defer | 2.10 | [[ suggest sub-modes need wikilinks. Re-open with internal links. |
| `OBS-1.14.4-LINK-012` | out-of-scope | — | obsidian:// URI parsing is out of scope; an omni:// equivalent is a future contract item. |
| `OBS-1.14.4-MATH-001` | gated | 3.5 | Decision 9: math stays gated. Re-open with an explicit @user yes plus a version-ledger pin. |
| `OBS-1.14.4-MATH-002` | gated | 3.5 | Decision 9: math stays gated. Re-open with an explicit @user yes plus a version-ledger pin. |
| `OBS-1.14.4-MATH-003` | gated | 3.5 | Decision 9: math stays gated. Re-open with an explicit @user yes plus a version-ledger pin. |
| `OBS-1.14.4-MATH-004` | gated | 3.5 | Decision 9: math stays gated. Re-open with an explicit @user yes plus a version-ledger pin. |
| `OBS-1.14.4-MERMAID-001` | gated | 3.5 | Decision 9: Mermaid stays gated. Re-open with an explicit @user yes plus a version-ledger pin. |
| `OBS-1.14.4-MERMAID-002` | gated | 3.5 | Decision 9: Mermaid stays gated. Re-open with an explicit @user yes plus a version-ledger pin. |
| `OBS-1.14.4-MERMAID-003` | gated | 3.5 | Decision 9: Mermaid stays gated. Re-open with an explicit @user yes plus a version-ledger pin. |
| `OBS-1.14.4-MERMAID-004` | gated | 3.5 | Decision 9: Mermaid stays gated. Re-open with an explicit @user yes plus a version-ledger pin. |
| `OBS-1.14.4-PROP-001` | out-of-scope | — | No frontmatter model. Re-open if frontmatter becomes a construct. |
| `OBS-1.14.4-PROP-002` | out-of-scope | — | No frontmatter model. Re-open if frontmatter becomes a construct. |
| `OBS-1.14.4-PROP-003` | out-of-scope | — | No frontmatter model. Re-open if frontmatter becomes a construct. |
| `OBS-1.14.4-TAG-002` | defer | 2.9 | Needs a tag source: waits for the BL-26 collections/tags contract. |
| `OBS-1.14.4-TAG-004` | defer | 2.9 | Decision 8: tag click waits for the BL-26 collections/tags contract. |

## Catalogue coverage gaps (recorded unknowns)

Catalogue `partial` entries and `unknowns` are implemented to the stated
extent and **stay marked** — they are never silently upgraded (plan §4.4).

| Entry | Coverage | Unknowns |
|---|---|---|
| `OBS-1.14.4-A11Y-002` | partial | The full ARIA surface of the editor (roles, labels, live regions beyond folding) was not enumerated |
| `OBS-1.14.4-A11Y-003` | verified | The four content attribute values were not transcribed |
| `OBS-1.14.4-INPUT-001` | verified | The exact wrap, overtype and pair-delete transaction shapes were located in the close-brackets implementation but not transcribed in detail |
| `OBS-1.14.4-CALLOUT-003` | verified | Whether the collapsed state survives a reload was not established (no persistence writer observed in the fold handlers) |
| `OBS-1.14.4-CALLOUT-008` | verified | Whether a plugin or future parser populates the colour field is out of scope |
| `OBS-1.14.4-CLIP-003` | verified | The exact URL predicate was not read |
| `OBS-1.14.4-CMD-001` | verified | Display names unresolved (coverage.md 6.1); Whether any of these has a default hotkey declared outside the config layer was not exhaustively established |
| `OBS-1.14.4-CMD-004` | verified | Which thirteen commands carry defaults was not enumerated in this pass |
| `OBS-1.14.4-COMMENT-001` | verified | Whether a third-party theme hides comments in Live Preview was not checked; the core stylesheet does not, and the code emits no hiding decoration |
| `OBS-1.14.4-COMMENT-003` | verified | The documentation's 'line begins with' does not mention that only spaces, not tabs, count before the marker |
| `OBS-1.14.4-MENU-001` | verified | The full item list and order were not enumerated item-by-item in this pass |
| `OBS-1.14.4-MENU-002` | verified | The individual item labels were not enumerated |
| `OBS-1.14.4-CURSOR-001` | verified | Whether the documented 'Escape also clears a rectangular selection' holds was not established |
| `OBS-1.14.4-TABLE-001` | verified | The user-visible statement 'arrows enter the table cell at the same column' is inferred from the arrow override plus the selection redirect, not directly observed |
| `OBS-1.14.4-DIR-001` | partial | The mixed LTR/RTL note-level resolution rules were not traced end-to-end |
| `OBS-1.14.4-EMBED-001` | verified | The size-suffix parsing regex itself was not read; only the normaliser's effect was observed |
| `OBS-1.14.4-EMBED-004` | verified | The complete video and PDF lists were not read to the end |
| `OBS-1.14.4-FOLD-006` | verified | The displayed command names are resolved through the localisation layer and could not be read from the renderer bundle |
| `OBS-1.14.4-FOOT-001` | verified | Whether the inline footnote renders as a superscript reference in Live Preview (rather than merely being styled) was not established; only parsing, styling and the interaction exclusion are observed |
| `OBS-1.14.4-LINK-007` | verified | The reading-view popover's dismissal keys are not documented; only mouse-out and click/contextmenu dismissal were observed |
| `OBS-1.14.4-LINK-009` | verified | The exact config key name holding the whitelisted schemes is in the main-process bundle and was read as a literal but not cross-referenced to a settings UI |
| `OBS-1.14.4-REVEAL-004` | verified | Which of the three corresponds to which kind of hidden range was not read end-to-end |
| `OBS-1.14.4-REVEAL-006` | verified | The three effect markers were read as literals but not traced to their producers |
| `OBS-1.14.4-REVEAL-008` | verified | The per-construct delimiter widths (1 vs 2 characters) were not enumerated |
| `OBS-1.14.4-SET-001` | verified | Whether a saved config or a migration overrides any of these defaults in an upgraded vault was not checked |
| `OBS-1.14.4-SLASH-002` | verified | The Escape dismissal path was not located; only the Space mechanism is explained |
| `OBS-1.14.4-TAG-001` | verified | Where the non-numerical-character rule is enforced was not located |
| `OBS-1.14.4-TAG-002` | verified | The suggestion contents and ordering were not read |
| `OBS-1.14.4-TAG-003` | partial | The click handler's exact command and any modifier variant were not traced |
| `OBS-1.14.4-TASK-001` | verified | The reading-view predicate had to be read from the raw minified bundle because it is absent from the recovered module tree — a genuine gap in the recovery, recorded here rather than silently worked around |
| `OBS-1.14.4-HIST-001` | verified | Typing coalescing and the per-widget history annotations were not enumerated |
| `OBS-1.14.4-UNDOC-001` | verified | The list is a first pass, not exhaustive |
| `OBS-1.14.4-UNDOC-002` | verified | Whether a migration path overrides alwaysUpdateLinks on upgrade |

