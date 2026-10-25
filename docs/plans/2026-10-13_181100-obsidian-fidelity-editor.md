# Obsidian-Fidelity Editor — Implementation Plan (F-15, Revision 2)

> **Status:** plan of record for the editor redesign on acceptance. **Supersedes**
> [`2026-10-10_104547-obsidian-parity-editor-redesign.md`](2026-10-10_104547-obsidian-parity-editor-redesign.md)
> (F-15 Rev 1), which remains historical. Rev 2 keeps Rev 1's prepared governance
> outcomes (G-1…G-4, 2026-10-10) as already-decided inputs and rebuilds the A–H
> task set on the **finished** reverse-engineering catalogue.
>
> **Execution note:** implement task-by-task, one bite-sized task per commit.
> Do not batch. Every task ends green — `npx vitest run` (cwd `packages/ui`)
> and `npx nx typecheck ui` (repo root) — before the next begins. Tests are
> named by catalogue entry ID (`OBS-1.14.4-…`) so the parity matrix stays
> greppable.
>
> **Decisions locked 2026-10-13 (`@user`):**
>
> 1. This plan is the successor revision of F-15 (Rev 2).
> 2. Comments follow the artifact: **visible and faint in Live Preview**, hidden
>    only by the reading render path.
> 3. `useTab` default matches the artifact: **tabs** (`true`).
> 4. Task checkbox toggle matches the artifact: writes exactly `x` / space and
>    does **not** preserve the original character.
> 5. **Images are deferred** (`EMBED-001…005`, design recorded in Task 3.4).
> 6. **Fold persistence is implemented** — see §4.3 for the risk assessment.
> 7. **Slash commands are default-ON** (deliberate deviation from the artifact's
>    `defaultOn: false`; recorded in §4.2).
> 8. **Tag click is deferred** (parsing/styling land; the click action waits for
>    the `BL-26` collections/tags contract).
> 9. Math, Mermaid and Vim **stay gated out** of this plan (designs recorded,
>    not scheduled).
> 10. Link-target adaptation confirmed (no splits/windows; `Mod`-click maps to
>     browser/app navigation).

---

## 0. Evidence and current state

### 0.1 RE-Obsidian catalogue (the spec)

The editor's behaviour is specified by the reverse-engineering deliverables in
`/home/morty/Develop/riven-stack/RE-Obsidian/docs/research/reverse-engineering/obsidian-editor-1.14.4/`:

| Item | Value |
|---|---|
| Target artifact | Obsidian 1.14.4 desktop (Linux, Electron 43) |
| Artifact SHA-256 | `146ef8470d8cbb4a6db209bdc19bf2bad13350444186c0fd93c31087b142b92f` |
| Canonical catalogue | `behaviours.json` — **114 entries**; `OBS-1.14.4-<AREA>-<NNN>` |
| Supporting docs | `behaviours.md`, `documentation-map.md` (37 pages swept), `coverage.md`, `reconciliation.md` (8 conflicts, 12 corrections), `UNVERIFIED-HYPOTHESES.md` |
| Reference implementations | `code/` (7 files) — **illustrative only**; where one disagrees with the catalogue, the catalogue wins |
| Artifact evidence IDs | `ev_c7f5023c…`, `ev_b24f07bb…`, `ev_d1679989…`, `ev_8d38e920…` |

Two rules from the catalogue's own evidence model carry into this plan:

- **Docs discover, artifact proves.** No behaviour is implemented from a help
  page alone; every parity claim cites an entry ID.
- **Fail loud.** Catalogue `partial` entries and `unknowns` are implemented to
  the stated extent and marked; the plan never upgrades them silently.

### 0.2 OmniDoc today (the target)

| File | Lines | Role today |
|---|---|---|
| `packages/ui/src/codemirror/cm-editor.tsx` | 272 | React wrapper; extensions built inline in a `useEffect`; mode `"text" \| "markdown"` |
| `packages/ui/src/codemirror/markdown-live-preview.ts` | 1,722 | Live-preview plugin **and** GFM table widget/editor **and** table tools in one module |
| `packages/ui/src/capture/capture-surface.tsx` | 689 | Three-mode surface (`normal`/`markdown`/`text`) + lock |
| `packages/ui/src/capture/formatting-toolbar.tsx` | 876 | **Two** parallel toolbars (TipTap + CodeMirror) |
| `packages/ui/src/capture/markdown-bridge.ts` | 194 | Headless TipTap JSON ↔ markdown converter |
| `packages/ui/src/markdown/**` | — | F-12 sanitized render path (`react-markdown` + `remark-gfm` + `rehype-sanitize`) |

Installed editor deps: `codemirror` 6.0.2, `@codemirror/lang-markdown` 6.5.2,
`@codemirror/state` 6.7.6, `@codemirror/view` 6.43.13, `@codemirror/language`
6.12.4, `@codemirror/commands` 6.11.1, TipTap 3.31.3 + tables, `tiptap-markdown`
0.9.0. Candidate pins not yet direct: `@codemirror/autocomplete` 6.20.3,
`@codemirror/search` 6.7.2 (`docs/research/version-ledger.md`).

**Governance already done (do not re-open):** G-1 editor pins recorded, G-2
wikilinks deferred, G-3 F-13/F-14 reconciled, G-4 capture-mode contract synced.
The contract this plan implements is `docs/design/system-ux.md` §2: three modes
+ lock, Obsidian-like editing behaviour, ProseMirror JSON as the durable SoT,
one formatting surface, lossless construct round-trip through the bridge.

### 0.3 What Rev 2 changes against Rev 1

Twelve corrections from the completed catalogue invalidate or extend Rev 1
assumptions:

| # | Correction (entry) | Consequence for this plan |
|---|---|---|
| 1 | **No pipe-skipping rule.** A Live-Preview table is one block widget with **one editor per cell**; pipes and the delimiter row are *not in the editable document*. The caret is **redirected into a cell**, not gated. (`TABLE-001`, `-007`) | Table model task (Task 3.3) replaces Rev 1's "caret-reveal rules" assumption |
| 2 | **Tables are never caret-gated** (`TABLE-007`) | Any "unfold raw table on touch" behaviour is forbidden |
| 3 | Pairing has **no verbatim gate**; suppression is only a `before` string `)]}'":;>` (`INPUT-003`). The char set is the bracket group (`(`, `[`, `{`, `'`, `"`) ∪ the markdown group (`*`, `_`, backtick, triple-backtick) from **two** settings (`INPUT-001`) | Auto-pair task pins the exact sets; do **not** add a code-span gate |
| 4 | **No Markdown line-start input rules exist** in the CM editor (`INPUT-004`) | Do not build heading/bullet/quote typing rules; smart-Home is recognition only |
| 5 | Fold state **is persisted** per note, 0-based, 500 ms debounce, **line-count guard** (`FOLD-008`); **three** fold services incl. frontmatter (`FOLD-007`); Fold less/more are **outermost**-range ops over `selection.start → end of line containing selection.end` (`FOLD-006`) | New folding tasks (Tasks 5.1–5.5) |
| 6 | Task checkbox writes exactly `x`/space and loses the original character (`TASK-001`) | New task-toggle task (Task 2.8) |
| 7 | Comments are **never hidden** in Live Preview — styled faint, no reveal rule (`COMMENT-001`); the `%%` toggle is stateful across lines, skipped in code/link-href, reset by a table row (`COMMENT-002`) | Rev 1 C-3's "hide comments" is a parity bug; corrected (Task 2.7) |
| 8 | The reveal guard is a **single ViewPlugin-hosted flag**; **five deferral delays** (10 / 50 / 100 / 700 ms + 0 ms nudge) and three rebuild guards (pointer-down, composing, short tree) (`REVEAL-006`, `-010`) | New reveal-policy task (Task 2.3) |
| 9 | Exactly **two atomic-range providers**: folded ranges and image embeds (`TABLE-005`) | Atomic task (Task 4.7); never make markers/pipes atomic |
| 10 | Indent unit is a plain **tab-or-4-spaces** string; visual columns belong to the fold service (`LIST-003`). Renumbering rewrites **digits only** (`LIST-002`) | Smart-list task (Task 4.8) |
| 11 | 98 editor commands (67 static + generated families); **13 ship default hotkeys outside the config map**; exactly **one curated keymap**, seven filtered bindings, four stock keymaps deliberately not installed (`CMD-003`, `-004`, `-005`) | Keymap/registry tasks (Tasks 6.1–6.2) |
| 12 | Undo coalesces at **500 ms + range overlap**, `isolateHistory` is never used, history **survives mode switches** (`HIST-002`) | History task (Task 5.6); mode switches must not rebuild the view |

### 0.4 The explicit negatives (do-not-build list)

These are behaviours a plausible port adds that the artifact provably does not
have. Each is a **negative acceptance test** in the phase named:

1. No pipe-skipping rule and no delimiter-row addressability in Live Preview
   tables (Task 3.3; `TABLE-001`).
2. No Markdown line-start input rules in the CM engine (Task 4.1; `INPUT-004`).
3. No code-span/code-block suppression in pairing (Task 4.1; `INPUT-003`).
4. No caret-gating for tables (Task 3.3; `TABLE-007`).
5. No partial reveal of a callout — whole block or raw (Task 3.2; `CALLOUT-004`).
6. No comment hiding in Live Preview (Task 2.7; `COMMENT-001`).
7. Fold less/more are **outermost**-range, not innermost walks (Task 5.3;
   `FOLD-006`).
8. Bullet characters are never normalised; only ordered digits are rewritten
   (Task 4.8; `LIST-002`).
9. No copy-as-TeX/SVG/MathML menus, no Mermaid fullscreen (Task 3.5; `MATH-004`,
   `MERMAID-004` — design-recorded only while gated).
10. The `%%` comment toggle's code/href exclusions and table-row reset are
    reproduced, not smoothed over (Task 2.7; `COMMENT-002`).

### 0.5 Reference-code caveat

`code/` was authored mid-extraction. Known divergences from the corrected
catalogue (audit before reuse):

| File | Divergence |
|---|---|
| `code/folding.ts` | Implements **innermost** Fold more/less; catalogue FOLD-006 corrected to **outermost**. Also omits the frontmatter service (FOLD-007) and the persistence/line-count guard (FOLD-008). |
| `code/auto-pair.ts` | Implements a **verbatim-region gate** (INPUT-007, phantom ID); the catalogue's INPUT-003 states **no gate exists**. |
| `code/smart-lists.ts` | References phantom IDs `LIST-005/-008/-009`; list content otherwise consistent with LIST-001…003. |
| `code/reveal-engine.ts` | References a phantom `REVEAL-009` for unresolved links (real: REVEAL-005; unresolved is LINK-006). |
| Any file | Header comment entry-ID lists must be validated against `behaviours.json` before use; implement code from the entries, not the file. |

---

## 1. Goal, principles and the parity model

**Goal.** Make the CM6 editing engine (Markdown + Text modes) behave like the
Obsidian 1.14.4 editing surface within OmniDoc's constraints, keep TipTap
Normal mode and the JSON ↔ markdown bridge in lockstep through **one command
surface**, and make every parity claim traceable to an entry ID and a test.

**Principles**

1. **Catalogue is the spec; the artifact is the authority; docs supply naming.**
2. **Parity matrix or it didn't happen.** Every one of the 114 entries has a
   disposition (`adopt / adapt / deviation / defer / gated / out-of-scope`) and,
   where adopted or adapted, a task and at least one test named by its ID.
3. **Behaviour parity, OmniDoc skin.** No Obsidian code/CSS/assets; visuals
   stay in the Mintlify token layer (`packages/ui/src/styles/tokens.css`).
   Where OmniDoc's own gates (a11y, sanitization, tenancy) conflict with the
   artifact, OmniDoc wins and the deviation is recorded in §4.
4. **Small tasks, each green.** One commit per task; the existing suites
   (`cm-editor.test.tsx`, `table-preview.test.tsx`, `capture-modes.test.tsx`,
   `blocks.test.tsx`, `markdown-bridge.test.ts`) are the regression net.
5. **Product-model adaptations are declared, not silent.** No vault paths, no
   OS file drops-to-attachments, no tabs/windows, no frontmatter — each maps to
   an explicit adaptation or deferral with a re-open trigger.

### 1.1 The parity matrix (deliverable and CI rule)

New artifacts:

- `docs/fidelity/obsidian-1.14.4.behaviours.json` — vendored copy of the
  canonical catalogue (data only).
- `packages/ui/src/codemirror/parity/dispositions.ts` — typed map
  `OBS-1.14.4-… → { disposition, task, deviation?, reOpen? }`.
- `packages/ui/src/codemirror/parity/matrix.test.ts` — fails when: an entry ID
  is missing or duplicated; a disposition is unknown; an `adopt`/`adapt` entry
  has no task; a `deviation`/`adapt` entry has no recorded reason.
- `docs/fidelity/obsidian-parity-matrix.md` — generated human view (small script
  or test-time snapshot); regenerated at each phase close.

---

## 2. Dispositions — all 114 entries

Entry IDs below are `OBS-1.14.4-<ID>` in full. Task references use the
`<phase>.<task>` form (e.g. `3.4`), matching the task headings in §5.
Where a row carries a note, that note is normative for implementation.

**Totals:** 73 adopt · 15 adapt · 1 deviation (SLASH-001) · 12 defer · 8 gated
· 5 out-of-scope. (A11Y-003 is adopt-with-recorded-deviation; counted adopt.)
Machine-verified against `behaviours.json`: 114 rows, no duplicates, no gaps.

### accessibility (3)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| A11Y-001 | adopt | 5.4 | Fold/unfold announces "Folded/Unfolded lines n to m." via a polite aria-live region. |
| A11Y-002 | adapt | 2.10 | Rendered (external) link text gets `tabindex="-1"` + `draggable="true"`; internal-link rendering is deferred. |
| A11Y-003 | adopt | 2.4, 8.3 | Baseline adopted **plus deviation**: OmniDoc QA §1.1 requires a keyboard path for every action — task toggle and fold exist as commands, so no interaction is pointer-only. |

### auto-pair (4)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| INPUT-001 | adopt | 4.1 | Union of the bracket group (`(`, `[`, `{`, `'`, `"`) and the markdown group (`*`, `_`, backtick, triple-backtick); both settings default true; extension only when either is on. |
| INPUT-002 | adopt | 4.2 | Em-dash at line start after a hyphen → `--` (stateful across two keystrokes). |
| INPUT-003 | adopt (negative) | 4.1 | No code-span/code-block gate; only the `before` string `)]}'":;>`. |
| INPUT-004 | adopt (negative) | 4.1 | No Markdown line-start input rules in the CM engine. |

### callouts (10)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| CALLOUT-001 | adapt | 3.2 | 13 canonical types + aliases; `important` is canonical (artifact), not a `tip` alias; icons map to Tabler equivalents; colours to token roles; `quote` uses the literal grey. |
| CALLOUT-002 | adopt | 3.2 | Title = type `trim → lowercase → first char upper`, hyphens→spaces. |
| CALLOUT-003 | adopt | 3.2 | `+`/`-` parsed after the type; the chevron toggles DOM state + animation and **never writes the document**. |
| CALLOUT-004 | adopt | 3.2 | Whole block replaced by one widget; inclusive touch predicate; focused-editor only; no partial reveal. |
| CALLOUT-005 | adapt | 3.2 | Context-menu type submenu (order info, important, tip, success, question, warning, example, quote) + "None" (drops the marker line, un-quotes the body); adapt to the web menu component. |
| CALLOUT-006 | adopt | 3.2 | Insert command literal `> [!NOTE]\n> `, selects offsets 4–8; wraps a selection; refused inside a table cell. |
| CALLOUT-007 | adopt | 3.2 | Type normalisation `trim().toLowerCase().replace(/\s+/g,'-')`; the menu checked-state compares the raw slice (case-sensitive) — reproduce. |
| CALLOUT-008 | adapt | 3.2 | Per-type colour variables → tokens; the dormant inline hex path is not implemented. |
| CALLOUT-009 | adapt | 3.2 | Icon resolution from the computed icon; inline-SVG path dormant in stock builds → fixed icon set. |
| CALLOUT-010 | adopt | 3.2 | Unbounded nesting; marker only on the innermost quote's first line; every callout gets its own chevron/icon. |

### clipboard (5)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| CLIP-001 | adopt | 7.1 | Dispatch order: custom MIME → HTML with internal sentinel → plain text → uri-list; HTML→markdown gated by `autoConvertHtml`. |
| CLIP-002 | adapt | 7.1 | No Electron; `Ctrl/Cmd+Shift+V` is browser-native; a context-menu "Paste as plain text" is offered where a menu exists. |
| CLIP-003 | adopt | 7.1 | URL paste over a selection wraps the selection as link text. |
| CLIP-004 | defer | Task 3.4 | Attachment naming/embed-set: no attachment storage contract. Re-open with `BL-26`-class storage work. |
| CLIP-005 | defer | Task 7.2 | File-drop link vs embed set + `file:///` modifier: deferred with attachments; the HTML-drop conversion half lands in Task 7.2. |

### commands (5)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| CMD-001 | adapt | 6.1 | 67 static command IDs used as a **coverage checklist**; OmniDoc IDs are ours. |
| CMD-002 | adopt | 6.1 | Settings control key = config key string. |
| CMD-003 | adapt | 6.1 | Generated families (headings ×6, highlight ×6, tables, focus) shape our registry. |
| CMD-004 | adopt | 6.2 | Default hotkeys live in a separate default-keys map; user overrides win. |
| CMD-005 | adopt | 6.2 | Exactly one curated keymap; filter `Alt-ArrowUp/Down`, `Shift-Alt-ArrowUp/Down`, `Alt-l`, `Alt-v`, `Ctrl-m`; never install standard/indent-with-tab/closeBrackets/completion keymaps. |

### comments (4)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| COMMENT-001 | adopt | 2.7 | Live Preview styles comments faint and **never hides** them. |
| COMMENT-002 | adopt | 2.7 | `%%` toggles a state flag; spans a line break; skipped in code/href; a table row resets it. |
| COMMENT-003 | adopt | 2.7 | Reading path: inline vs block rules; block requires line start (spaces only, not tabs). |
| COMMENT-004 | adopt | 2.7 | Unclosed block hides the rest in the reading path only. |

### context-menus (3)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| MENU-001 | adapt | 6.3 | One menu builder, fixed section order (Format / Paragraph / Insert + token-specific entries); web menu component. |
| MENU-002 | adopt | 3.3 | Table-cell menu: row/column ops + sort. Extends the F-14 bubble. |
| MENU-003 | out-of-scope | — | Note-composer extract-selection; no such product feature. Re-open if note splitting ships. |

### cursor-movement (9)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| CURSOR-001 | adopt | 4.4 | Click-adds-range predicate `altKey && !ctrlKey && !metaKey`; multiple selections enabled. |
| CURSOR-002 | adopt | 4.4 | Rectangular selection: Shift+Alt+left everywhere; middle-drag except Linux desktop. |
| TABLE-001 | adopt | 3.3 | One editor per cell holding decoded cell text; pipes/delimiter row unreachable by construction; Tab/Enter navigation; arrows land on the widget line. |
| TABLE-002 | adopt | 4.5 | Boundary-motion escape rule: retry without opaque skipping when a motion cannot move. |
| TABLE-003 | adopt | 4.5 | Smart-Home regex `^([>\s]*)(([*+-] \|(\d+)([.)] ))(?:\[(.)\] )?)?`; second press reaches column 0. |
| TABLE-004 | adopt | 4.6 | Word motion as a syntax-tree walk (waypoint: bracket-prop / length > 2 / char outside `[\s,.;:]` / has children) + bracket matching + `assoc` −1/+1 + segmented path. |
| TABLE-005 | adopt | 4.7 | Exactly two atomic providers: folded ranges and image embeds; hidden markers/pipes/callouts are **not** atomic. |
| TABLE-006 | adopt | 4.5 | End mirrors Home minus the prefix logic. |
| TABLE-007 | adopt | 3.3 | Tables always rendered; caret redirected into a cell (position match, else first cell of first/last row by direction; RTL swaps targets). |

### directionality (2)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| DIR-001 | adopt | 4.10 | `perLineTextDirection` on unconditionally; `rightToLeft` from the single locale source. |
| DIR-002 | adopt | 4.10 | Note-level direction does not disable per-line handling; RTL-aware corner/cell swaps when those surfaces exist. |

### embeds (5)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| EMBED-001 | defer | Task 3.4 | Image resize corner + double-click reset. Decision 5: deferred with images. |
| EMBED-002 | defer | Task 3.4 | Reveal gap/spacer widgets. |
| EMBED-003 | defer | Task 3.4 | Image tooltip + 250 ms debounce + extension allowlist. |
| EMBED-004 | defer | Task 3.4 | Media allowlists (recorded as constants in the design note). |
| EMBED-005 | defer | Task 3.4 | Click-selects-source behaviour (the size pattern is recorded in the design note). |

### folding (8)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| FOLD-001 | adopt | 5.1 | Indent service: blank lines transparent; comparison by visual column (`tabSize`). |
| FOLD-002 | adopt | 5.1 | Heading service: `^\s*(#{1,6})(\s+\|$)`; body per the entry's "last greater level" rule; fixture-pinned. |
| FOLD-003 | adopt | 5.4 | Localisable announcements via the announcer. |
| FOLD-004 | adopt | 5.4 | Folded-code phrase is the empty string. |
| FOLD-005 | adopt | 5.2 | Gutter marker per foldable line; collapsed state keeps the marker visible (class state, one element). |
| FOLD-006 | adopt | 5.3 | Toggle/all/unfold-all/less/more with **outermost**-range semantics over the selection-to-line-end span. |
| FOLD-007 | adopt | 5.1 | Three services: indent, heading, frontmatter/preamble block. |
| FOLD-008 | adopt | 5.5 | Persistence per note, 0-based ranges + line count, 500 ms debounce, line-count guard. |

### footnotes (1)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| FOOT-001 | adapt | 2.11 | Inline footnotes parsed/styled; never interactive; named refs styled and classified link-like; navigation/hover deferred (no footnote view). |

### ime (2)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| IME-001 | adopt | 4.3 | `compositionend` → empty transaction after 100 ms. |
| IME-002 | adopt | 4.3 | Input rules suppressed and decorations mapped (not rebuilt) while composing. |

### link-interaction (12)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| LINK-001 | adapt | 2.10 | Modifier set → pane target maps to app navigation; no split/window halves; `focusNewTab` not applicable. |
| LINK-002 | adopt | 2.10 | Source mode: plain click = caret. Live Preview: only the rendered text follows; raw syntax places the caret. |
| LINK-003 | adopt | 2.10 | Source mode Mod-click downgraded to same-tab unless Shift is held; middle-click exempt. |
| LINK-004 | adopt | 2.10 | Live Preview: a non-collapsed DOM selection containing the target blocks navigation. |
| LINK-005 | adopt | 2.10 | Alt/Shift plain-click reserved for editor selection gestures. |
| LINK-006 | defer | Task 2.10 | Unresolved-link marking + click-to-create: gated with internal links (wikilinks stay literal in v1). |
| LINK-007 | defer | Task 2.10 | Hover preview (300 ms / 2000 ms / per-surface modifiers): no page-preview surface. Re-open with internal links. |
| LINK-008 | defer | Task 2.10 | `[[` suggest sub-modes: wikilinks deferred. Design recorded in the entry. |
| LINK-009 | adapt | 2.10 | Scheme gating moves into the renderer (architecture §6): `http/https/mailto` inline; anything else → confirm modal + per-session allowlist. |
| LINK-010 | adapt | 2.10 | Middle-click: new tab where browser-meaningful; modifiers ignored for the target decision. |
| LINK-011 | adopt | 2.10 | Editor link activation deferred 100 ms. |
| LINK-012 | out-of-scope | — | `obsidian://` URI parsing. An `omni://` equivalent is a future contract item. |

### math-mermaid (8)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| MATH-001 | gated | Task 3.5 | Inline-vs-block reveal asymmetry: design recorded. |
| MATH-002 | gated | Task 3.5 | Delimiters extracted by the editor (no delimiter scanning in the renderer). |
| MATH-003 | gated | Task 3.5 | Errors surface as a rendered error node, not a crash. |
| MATH-004 | gated | Task 3.5 | Negative: no copy-as-TeX/SVG/MathML menus. |
| MERMAID-001 | gated | Task 3.5 | Per-note trust prompt before any diagram renders. |
| MERMAID-002 | gated | Task 3.5 | Parse failure renders a visible error block. |
| MERMAID-003 | gated | Task 3.5 | `internal-link` node labels become anchors (routed through the link handler). |
| MERMAID-004 | gated | Task 3.5 | Negative: no fullscreen affordance. |

### properties (3)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| PROP-001 | out-of-scope | — | Properties display gating: no frontmatter model. Re-open if frontmatter becomes a construct. |
| PROP-002 | out-of-scope | — | Property keymap. |
| PROP-003 | out-of-scope | — | Hidden-properties fallback. |

### reveal (11)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| REVEAL-001 | adopt | 2.2 | Inclusive touch predicate `from <= to && to >= from`. |
| REVEAL-002 | adopt | 2.2 | Only the focused editor's ranges participate. |
| REVEAL-003 | adopt | 6.5 | An active search highlight overlapping a construct forces reveal. |
| REVEAL-004 | adopt | 2.4 | Three empty replace singletons. |
| REVEAL-005 | adopt | 2.4 | Rendered link text: underlined, `tabindex=-1`, draggable. |
| REVEAL-006 | adopt | 2.3 | Guard is one ViewPlugin flag; pointer-down / composing / short tree → map-only. |
| REVEAL-007 | adopt | 2.6 | Blockquote border widget carries the literal `>` with a transparency class. |
| REVEAL-008 | adopt (partial) | 2.1, 2.5 | 5 inline-formatting + 6 link-like kinds; per-delimiter widths are partial in the catalogue — implement from delimiter length and record. |
| REVEAL-009 | adopt | 3.1 | Fence regex: 3+ tildes or backticks; a backtick is forbidden in the info string (literal in Task 3.1). |
| REVEAL-010 | adopt | 2.3 | Five deferral delays: focus/blur 10, pointer release 50, composition end 100, mobile drag 700, caret nudge 0; transaction synchronous. |
| REVEAL-011 | adopt | 2.2 | Accumulated spans; whole-line spans for heading/quote/escape. |

### settings (2)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| SET-001 | adapt | 1.1 | Obsidian's default table adopted per-key; `useTab: true` now matches (decision 3); deviations listed in §4.1. |
| SET-002 | adopt | 1.3, 4.9 | The eight live-reconfigured keys: useTab, tabSize, rightToLeft, spellcheck, autoPairBrackets, autoPairMarkdown, smartIndentList, vimMode (vim gated). |

### slash-commands (4)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| SLASH-001 | deviation | 6.4 | OmniDoc default-**on** (decision 7); artifact is off. Recorded deviation. |
| SLASH-002 | adopt | 6.4 | Trigger `/(^\|\s)\/([^\s\/]*)$/`; a space closes the popup. |
| SLASH-003 | adopt | 6.4 | The slash text is deleted, then the command runs. |
| SLASH-004 | adapt | 6.4 | Suggestion list = our command registry, fuzzy-matched, hotkey chips. |

### smart-lists (3)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| LIST-001 | adopt | 4.8 | Region test first; ordered = +1 with delimiter preserved; tasks continue unchecked; four empty-item cases; Shift+Enter plain. |
| LIST-002 | adopt | 4.8 | Tab/Shift+Tab = indent-more/less; digit-only renumber; no bullet normalisation. |
| LIST-003 | adopt | 4.8 | Indent unit = tab when `useTab`, else four spaces. |

### tags (5)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| TAG-001 | adopt | 2.9 | Exclusion-class regex (Unicode General Punctuation + listed ASCII + whitespace); longest-prefix match. |
| TAG-002 | defer | 2.9 | Autocomplete trigger: needs a tag source; waits for `BL-26`. Trigger regex recorded. |
| TAG-003 | adopt | 2.9 | Three-part class split (`hashtag / begin / end` equivalents). |
| TAG-004 | defer | 2.9 | Click → tag search: deferred (decision 8). |
| TAG-005 | adopt | 2.9 | One shared regex constant feeds parsing, styling and scanning — no triplication. |

### task-lists (1)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| TASK-001 | adopt | 2.8 | Writes `x` on check, space on uncheck; original char not preserved; focus/selection unchanged. |

### undo (2)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| HIST-001 | adopt | 5.6 | Undo `Mod-z`; redo `Mod-y` + `Mod-Shift-z`; Linux `Ctrl-Shift-z`. |
| HIST-002 | adopt | 5.6 | 500 ms + range-overlap coalescing; no `isolateHistory`; history survives mode switches; 20-entry in-memory LRU. |

### undocumented (2)

| Entry | Disposition | Task | Note |
|---|---|---|---|
| UNDOC-001 | adopt | 6.1 | The 23-surface list is a coverage checklist for the registry. |
| UNDOC-002 | adopt | §4.1 | Defaults recorded; deviations live in §4.1. |

---

## 3. Target architecture

Keep the F-15 direction (stable public exports from `codemirror/index.ts`) and
grow it:

```text
packages/ui/src/codemirror/                 ← engine home (public exports unchanged)
  cm-editor.tsx                             thin React wrapper
  editor-settings.ts                        EditorSettings + defaults + deviation markers
  editor-extensions.ts                      factory + Compartments (live reconfigure)
  keymap.ts                                 the ONE curated keymap (+ filtered bindings)
  history.ts                                500 ms coalescing, mode-switch survival, LRU
  gutters.ts                                fold gutter, optional line numbers/indent guides
  parity/                                   dispositions.ts + matrix.test.ts + data/
  live-preview/
    taxonomy.ts                             construct sets; prose|table|verbatim regions
    reveal.ts                               touch predicate, focused ranges, search highlights
    policy.ts                               rebuild guards + five deferral delays
    decorations.ts                          marks + 3 replace singletons + widgets
    theme.ts                                body typography projection
    callout/  codeblock/  table/  footnote/  comment/  highlight/
  input/      auto-pair.ts  em-dash.ts  ime.ts
  motion/     boundary.ts  smart-home.ts  word.ts  atomic.ts
  lists/      continuation.ts  indent.ts  renumber.ts
  folding/    services.ts  commands.ts  persistence.ts
  tags/  links/  clipboard/  commands/
packages/ui/src/capture/
  formatting/{commands.ts, tiptap-adapter.ts, codemirror-adapter.ts}   ← from F-15 Rev 1 B
  body-typography.ts
  capture-surface.tsx, markdown-bridge.ts   contracts unchanged
docs/fidelity/
  obsidian-1.14.4.behaviours.json           vendored catalogue (data only)
  obsidian-parity-matrix.md                 generated human view
```

**Invariants kept:** ProseMirror JSON is the durable SoT; markdown is derived;
the block never calls the API (link/search/tag actions arrive as props/ports);
direction from one locale source; body typography defined once; TipTap and CM6
implement the same command IDs.

---

## 4. Locked decisions, deviations and recorded unknowns

### 4.1 Settings defaults (SET-001 adaptation, decision 3)

Adopt the artifact's editor-relevant defaults; the full table is recorded here
because the help pages omit most of them (`UNDOC-002`):

| Key | Default | Note |
|---|---|---|
| `useTab` | **true** | Decision 3: tabs match the artifact. |
| `tabSize` | 4 | Slider 2–8. |
| `rightToLeft` | false | Supplied by the locale source, never a user toggle in v1. |
| `spellcheck` | true | Browser spelling; part of the live-reconfigure set. |
| `autoPairBrackets` / `autoPairMarkdown` | true / true | |
| `smartIndentList` | true | |
| `foldHeading` / `foldIndent` | true / true | Folding on by default. |
| `showLineNumber` | false | |
| `showIndentGuide` | true | |
| `livePreview` | true | Markdown mode on by default. |
| `propertiesInDocument` | n/a | No frontmatter model. |
| `strictLineBreaks` | false | Not a v1 editor setting; bridge governs. |
| `readableLineLength` | n/a | Not implemented (no width cap promised). |

**Deviation:** editor-settings *persistence* stays prop/component-state only
(F-15 Rev 1 decision, 2026-10-10, unchanged). No server or localStorage
persistence for settings.

### 4.2 Recorded deviations

| # | Deviation | Reason |
|---|---|---|
| D-1 | Slash commands default **on** | Decision 7 (discoverability); artifact is off. |
| D-2 | External-URL scheme gate runs in the renderer with a confirm modal + per-session allowlist | Architecture §6 requires the trust gate in our boundary; the artifact gates in the Electron main process. |
| D-3 | Link pane targets map to app navigation (current surface / browser tab) — no splits or pop-out windows | No such app model; `LINK-001` adapted. |
| D-4 | a11y: every action has a keyboard path (commands exist for tick/fold); artifact leaves some widgets pointer-only | OmniDoc QA §1.1; recorded against A11Y-003. |
| D-5 | Parser: Lezer `@codemirror/lang-markdown` (not the artifact's CM5 `hypermd` bridge) | Better-modelled and already pinned; accepted in Rev 1; fidelity guarded by the construct matrix. |
| D-6 | Visual skin: Mintlify tokens; icons: Tabler | Project design language; behaviour only is matched. |
| D-7 | Fold persistence keyed by **note id** (not vault path) | No vault; same shape otherwise. See 4.3. |
| D-8 | Reading view is the F-12 render path, not a fourth capture mode | `system-ux.md` §2 contract (G-4). |
| D-9 | No Prism/tree-sitter highlighting in Markdown/Text modes | Matches the artifact (LP/Source do not Prism); render-path highlighting is an F-12 topic. |

### 4.3 Fold persistence — risk assessment and design (decision 6)

**Verdict: implement.** Fold state is pure client-side UI state — which ranges
are collapsed. It never touches note content, never flows to or from the
server, and has no server-side counterpart, so it cannot conflict with note
data or with server availability. The only staleness risk is a note edited
elsewhere between sessions, which the artifact's own guard handles coarsely
(line-count mismatch → ignore).

Design:

- Key `omnidoc:fold:<noteId>`; value `{ folds: [{from,to}], lines }`, 0-based
  (FOLD-008).
- Unsaved drafts (no note id) do not persist; persistence begins after first save.
- Save debounced 500 ms; load ignores stored folds when `lines` differs from
  the current document's line count.
- localStorage only; no cross-device sync; no server writes.
- Best-effort: stale keys are tolerated (tiny); a purge hook may be added later.

### 4.4 Recorded catalogue unknowns (stay marked)

| Area | Unknown | Handling |
|---|---|---|
| REVEAL-008 | Per-construct delimiter widths (1 vs 2) | Implement from delimiter length; tests pin observed behaviour; entry remains `partial`. |
| A11Y-002 | Full ARIA surface beyond folding | We implement the announcement + link attributes; no further claims. |
| DIR-001 | Mixed LTR/RTL resolution rules | Per-line facet on; locale-driven default; no claims beyond. |
| FOLD-005 | Gutter visibility rule (theme CSS) | Class-state split implemented; theming is ours. |
| CMD-004 | Which 13 commands carry default hotkeys | The artifact list is unknown; we define our own equivalent set and record it. |
| COMMAND NAMES | Display names unresolvable from the bundle | We choose our own display names; IDs are ours. |

---

## 5. Phases and tasks

Format per task: **Goal · Catalogue · Files · Tests/Acceptance · Commit.**
Every task must leave both gates green.

### Phase 0 — Baseline & traceability

#### Task 0.1 — Vendored catalogue + parity matrix
**Goal.** Make parity machine-checkable.
**Catalogue.** All 114 (coverage only).
**Files.** Create `docs/fidelity/obsidian-1.14.4.behaviours.json` (byte copy),
`packages/ui/src/codemirror/parity/dispositions.ts`,
`packages/ui/src/codemirror/parity/matrix.test.ts`,
`docs/fidelity/obsidian-parity-matrix.md` (generated view).
**Tests.** Matrix test: every ID present exactly once; dispositions valid;
adopt/adapt rows have tasks; deviation/adapt rows have reasons. Snapshot the
generated md in the same commit.
**Commit.** `docs(fidelity): vendor Obsidian 1.14.4 catalogue and parity matrix`

#### Task 0.2 — Decision record in the living docs
**Goal.** Record the ten locked decisions and §4 deviations where the project
keeps its decisions.
**Files.** Modify `docs/design/now.md` (decision-log entries),
`docs/planning/implementation-tracks.md` (F-15 row → Rev 2 pointer; status
remains whatever Commander sets — this task only points at the plan).
**Acceptance.** The F-15 row links to this file; the decision log carries the
lock date.
**Commit.** `docs(design): record F-15 Rev 2 decisions`

#### Task 0.3 — Test harness + fixture corpus
**Goal.** A reusable way to drive an `EditorView` in jsdom and enough fixtures
to pin every construct.
**Files.** Create `packages/ui/src/codemirror/parity/harness.ts` (build view
from factory; press keys; read decorations/atomic ranges),
`packages/ui/src/codemirror/__fixtures__/constructs/*.md` (one per construct +
the catalogue's edge cases), `harness.test.ts`.
**Acceptance.** Harness builds a view, types into it, and reads a decoration
set in a test.
**Commit.** `test(editor): EditorView harness and construct fixtures`

#### Task 0.4 — Pin activation
**Goal.** Make the two remaining packages direct dependencies.
**Files.** Modify `packages/ui/package.json`; `docs/research/version-ledger.md`
(final rows). Versions re-verified at execution.
**Acceptance.** `@codemirror/autocomplete` + `@codemirror/search` importable
from `packages/ui`; frozen-lockfile install green. Vim/math/mermaid stay
uninstalled.
**Commit.** `chore(ui): pin codemirror autocomplete and search`

### Phase 1 — Engine foundation

*(Rev 1's Phase A, carried forward unchanged in substance; its A-1 defaults
are superseded by §4.1.)*

#### Task 1.1 — `EditorSettings` + defaults
**Goal.** One typed settings object with the Obsidian key set.
**Catalogue.** SET-001, SET-002, UNDOC-002.
**Files.** Create `codemirror/editor-settings.ts` (+ test). Defaults per §4.1.
**Tests.** Defaults table matches §4.1; `useTab === true`.
**Commit.** `feat(editor): EditorSettings with artifact-parity defaults`

#### Task 1.2 — Body typography single source
**Goal.** TipTap classes and the CM6 theme consume one scale.
**Catalogue.** — (visual only).
**Files.** Create `capture/body-typography.ts`; modify
`capture-surface.tsx`, `live-preview/theme.ts`.
**Tests.** Class string and theme rules pinned to the same scale values.
**Commit.** `refactor(capture): single source for body typography`

#### Task 1.3 — Extension factory + Compartments
**Goal.** Settings reconfiguration without rebuilding the view.
**Catalogue.** SET-002.
**Files.** Create `codemirror/editor-extensions.ts` (+ test); modify
`cm-editor.tsx`. Compartments: `editing | settings | livePreview | keymap | language`.
**Tests.** State constructs; reconfiguring settings keeps caret + scroll.
**Commit.** `refactor(editor): extension factory and compartments`

#### Task 1.4 — Split the table machinery
**Goal.** Move the table half out of the 1,722-line module with no logic change.
**Files.** Create `live-preview/table/{index,interaction,widget,tools,scan}.ts`;
modify `codemirror/index.ts` (paths only). Block decorations must stay in a
`StateField` — comment why when moving.
**Tests.** `table-preview.test.tsx` unchanged and green after each move.
**Commit.** `refactor(editor): split live-preview table into its own folder`

#### Task 1.5 — Split the live-preview core + extract the keymap
**Goal.** Finish the module split; move keymap construction out of `cm-editor.tsx`.
**Files.** Create `live-preview/{index,decorations,widgets,theme}.ts`,
`codemirror/keymap.ts`; delete `markdown-live-preview.ts`; re-export the same
public names from `codemirror/index.ts`.
**Tests.** `cm-editor.test.tsx` + `table-preview.test.tsx` green.
**Commit.** `refactor(editor): split live-preview core and extract keymap`

### Phase 2 — Reveal engine + inline constructs

#### Task 2.1 — Construct taxonomy + region classification
**Goal.** One vocabulary for constructs and regions.
**Catalogue.** REVEAL-008, TABLE-005.
**Files.** Create `live-preview/taxonomy.ts` (+ test). Sets: 5 inline-formatting
kinds (`em, strong, inline-code, strikethrough, highlight`); 6 link-like kinds
(`link, image, internal-link, embed, formatting-link, footref`); regions
`prose | table | verbatim` from node marks.
**Acceptance.** Every region classified from a fixture; sets exported.
**Commit.** `feat(editor): construct taxonomy and region classification`

#### Task 2.2 — Touch predicate, focused ranges, accumulated spans
**Catalogue.** REVEAL-001, -002, -011.
**Files.** Create `live-preview/reveal.ts` (+ test).
**Tests.** Inclusive predicate: caret inside, partial overlap both sides, caret
outside; unfocused editor reveals nothing; a multi-token construct is one
accumulated span; heading/quote/escape use the whole line.
**Commit.** `feat(editor): reveal predicate and accumulated construct spans`

#### Task 2.3 — Rebuild policy (guards + delays)
**Catalogue.** REVEAL-006, -010; IME-002.
**Files.** Create `live-preview/policy.ts` (+ test with fake timers).
**Tests.** Pointer-down / composing / short-tree → map-only; transaction →
synchronous; focus/blur 10 ms; pointer release 50 ms; composition end 100 ms;
mobile drag end 700 ms; caret nudge 0 ms.
**Commit.** `feat(editor): reveal rebuild guards and deferral delays`

#### Task 2.4 — Decoration primitives
**Catalogue.** REVEAL-004, -005; A11Y-002; A11Y-003 (deviation note).
**Files.** Create `live-preview/decorations.ts` (+ test). Three empty replace
singletons; rendered-link mark (`tabindex="-1"`, `draggable="true"`,
underline); transparent mark; unresolved mark (wired when links promote).
**Tests.** Three singletons are identity-distinct; link attributes present.
**Commit.** `feat(editor): reveal decoration primitives`

#### Task 2.5 — Inline formatting
**Catalogue.** REVEAL-008 (partial), REVEAL-011.
**Files.** Modify `live-preview/decorations.ts`, `theme.ts`.
**Tests.** `**bold**`, `*em*`, `` `code` ``, `~~strike~~`, `==highlight==`
each render folded with the caret away and raw on touch; delimiter hiding is
unaffected by source text; highlight colour emoji parsed when present (six
canonical + square synonyms), default highlight otherwise.
**Commit.** `feat(editor): inline formatting live preview`

#### Task 2.6 — Headings, HR, blockquote border widget
**Catalogue.** REVEAL-007, -011; FOLD-002 (regex only).
**Files.** Modify `live-preview/{decorations,widgets,theme}.ts`.
**Tests.** Heading marker hidden with the line rendered; caret anywhere on the
line reveals; HR renders as a rule; blockquote border glyph is a widget with
the literal `>` and a transparency class.
**Commit.** `feat(editor): headings, rules and quote borders in live preview`

#### Task 2.7 — Comments (Live Preview + render path)
**Catalogue.** COMMENT-001, -002, -003, -004.
**Files.** Create `live-preview/comment.ts` (+ test); create a render-path
plugin under `packages/ui/src/markdown/` (owner: F-12) for COMMENT-003/004.
**Tests.** LP: `%%x%%` visible and faint with the caret inside and outside —
never hidden; the pair toggle spans a line break; inside code/href it is
literal; a table row resets it. Reading path: inline/block rules; block
requires a line start (spaces only, not tabs); unclosed block hides the rest.
**Commit.** `feat(editor): comment styling in live preview and reading path`

#### Task 2.8 — Task checkbox widget + toggle
**Catalogue.** TASK-001.
**Files.** Modify `live-preview/widgets.ts` (+ test).
**Tests.** Click writes `x` from space and space from any other char; the
original char is lost (decision 4); focus/selection unchanged; the LP predicate
is case-insensitive.
**Commit.** `feat(editor): task checkbox live preview`

#### Task 2.9 — Tags: parse, style, (click/autocomplete deferred)
**Catalogue.** TAG-001, -003, -005 (adopt); TAG-002, -004 (defer).
**Files.** Create `tags/regex.ts` (one shared exclusion-class constant),
`live-preview/tags.ts` (+ tests).
**Tests.** Longest-prefix match; a numeric-only tag does not match; three-part
class split emitted; the single constant is used by parser and scanner
(grep-level test).
**Commit.** `feat(editor): tag parsing and styling`

#### Task 2.10 — External links: mark, gate chain, scheme gate
**Catalogue.** LINK-002, -003, -004, -005, -009, -010, -011; A11Y-002; REVEAL-005.
**Files.** Create `links/activation.ts` (+ tests), modify
`live-preview/{decorations,widgets}.ts`.
**Tests.** Source-mode plain click places the caret; LP plain click follows only
on rendered text; a selection containing the target blocks; Alt/Shift reserved;
Mod-click in source downgraded unless Shift; middle-click exempt; activation
deferred 100 ms; `javascript:`/`data:`-class schemes route to the confirm modal;
`http/https/mailto` open directly.
**Commit.** `feat(editor): external link activation gate chain`

#### Task 2.11 — Footnotes
**Catalogue.** FOOT-001.
**Files.** Modify `live-preview/{decorations,taxonomy}.ts` (+ test).
**Tests.** Named refs styled and classified link-like; inline footnotes parsed
and styled but never interactive; definition navigation/hover deferred.
**Commit.** `feat(editor): footnote references in live preview`

### Phase 3 — Block constructs

#### Task 3.1 — Fenced code blocks
**Catalogue.** REVEAL-009, FOLD-004.
**Literal.** Fence opener (REVEAL-009):

````text
^\s*(~~~+|```+)[ \t]*([\w/+#-]*)[^\n`]*$
````

**Files.** Create `live-preview/codeblock/*` (+ tests).
**Tests.** Fence regex accepts tilde/backtick ≥3 and forbids a backtick in the
info string; whole-block widget while untouched; raw source on touch; collapsed
code block renders no placeholder text; no token highlighting in LP/Source (D-9).
**Commit.** `feat(editor): code block live preview`

#### Task 3.2 — Callouts
**Catalogue.** CALLOUT-001…010.
**Files.** Create `live-preview/callout/{parse,render,menu,commands}.ts` (+ tests).
**Tests.** Type normalisation; title derivation (`tldr → Tldr`, `my-type → My
type`); 13 canonical types with `important` canonical; fold markers `+`/`-`
and chevron toggles DOM only (document unchanged — asserted); whole-block
reveal with inclusive predicate; no partial reveal; insert command literal and
selection 4–8; wrap selection; refused in a table cell; type menu mutations
incl. "None"; nesting.
**Commit.** `feat(editor): callouts in live preview`

#### Task 3.3 — Tables: per-cell model, redirect, navigation, menu
> **Superseded for the table slice** by
> [`2026-10-16_172806-table-rebuild-obsidian-ux.md`](2026-10-16_172806-table-rebuild-obsidian-ux.md)
> (Rev 2, 2026-10-16). Its catalogue contract and gates carry over unchanged.
**Catalogue.** TABLE-001, -007; MENU-002; F-15 C-1 (perf).
**Files.** Modify `live-preview/table/*`.
**Tests.** Cell document is decoded text (escaped pipe → pipe, `<br>` →
newline); the delimiter row is never addressable; left/right leave the cell
only at offsets 0/length; up/down only at the first/last visual line; Tab
grows a row at the end, Shift-Tab at the start; Enter moves down or inserts;
a caret landing in the hidden range is redirected (position match else first
cell of first/last row by direction); RTL swaps targets; **no** caret gate
(negative test); the table scanner visits only viewport ± margin on a
5,000-line document.
**Commit.** `feat(editor): per-cell table editing with caret redirection`

#### Task 3.4 — Images: deferred (design recorded)
**Catalogue.** EMBED-001…005; CLIP-004 (deferral note).
**Action.** No code. Record the design (resize corner, gap/spacer reveal,
tooltip with 250 ms debounce, allowlists, size pattern
`^\s*(\d+)\s*(?:x\s*(\d+)\s*)?$`) in the design note so promotion is ready.
**Acceptance.** The parity matrix rows stay `defer` with re-open triggers; no
image code lands.
**Commit.** `docs(editor): record deferred image design`

#### Task 3.5 — Math / Mermaid: gated (design recorded)
**Catalogue.** MATH-001…004, MERMAID-001…004.
**Action.** No code, no installs. Record the designs (reveal asymmetry, error
nodes, trust gate, anchor rewriting, negatives) in the design note.
**Acceptance.** Matrix rows stay `gated`; package.json untouched.
**Commit.** `docs(editor): record gated math and mermaid designs`

### Phase 4 — Input, motion, lists

#### Task 4.1 — Auto-pair
**Catalogue.** INPUT-001, -002, -003, -004; CMD-005 (no closeBrackets keymap).
**Files.** Create `input/auto-pair.ts`; modify `editor-extensions.ts`.
**Tests.** Char unions per setting combination; both off → extension absent;
`before` string suppresses after `)]}'":;>`; typing `**` inside a code span
still pairs (negative); no Markdown line-start transformation for `# `, `- `,
`1. `, `> `, `- [ ]`; wrap-selection/overtype/pair-delete transactions.
**Commit.** `feat(editor): artifact-parity auto-pairing`

#### Task 4.2 — Em-dash collapse
**Catalogue.** INPUT-002.
**Files.** Create `input/em-dash.ts` (+ test).
**Tests.** `-` then `—` at line start → `--`; not at line start → untouched;
previous char not `-` → untouched; composing/read-only → untouched.
**Commit.** `feat(editor): line-start em-dash collapse`

#### Task 4.3 — IME guards
**Catalogue.** IME-001, -002.
**Files.** Create `input/ime.ts`; modify `live-preview/policy.ts`.
**Tests.** Rules and rebuilds suppressed while composing; decorations mapped;
`compositionend` dispatches an empty transaction after 100 ms (fake timers).
**Commit.** `feat(editor): IME composition guards`

#### Task 4.4 — Multiple selections + rectangular carve-out
**Catalogue.** CURSOR-001, -002.
**Files.** Modify `editor-extensions.ts` (+ test).
**Tests.** Alt+click adds a range; Ctrl+Alt/Meta+Alt does not; Shift+Alt+drag
rectangular everywhere; middle-drag rectangular except Linux desktop.
**Commit.** `feat(editor): multiple selections and rectangular selection`

#### Task 4.5 — Boundary motion (Home/End, escape rule, smart-Home)
**Catalogue.** TABLE-002, -003, -006.
**Files.** Create `motion/boundary.ts`, `motion/smart-home.ts` (+ tests).
**Tests.** Escape rule retries without skipping; smart-Home regex cases
(blockquote, list, task, ordered, second press → column 0); End has no prefix
logic; table-aware opacity only.
**Commit.** `feat(editor): boundary motion with smart-Home and escape rule`

#### Task 4.6 — Word motion
**Catalogue.** TABLE-004.
**Files.** Create `motion/word.ts` (+ test).
**Tests.** Tree-walk waypoints; bracket-matching jump; assoc −1/+1; segmented
path (CJK/emoji) — fixture per case.
**Commit.** `feat(editor): syntax-aware word motion`

#### Task 4.7 — Atomic ranges
**Catalogue.** TABLE-005.
**Files.** Create `motion/atomic.ts` (+ test).
**Tests.** Folded ranges atomic when folding is on; image-embed provider present
by design but no-op while images are deferred; hidden markers/pipes/callouts
are NOT atomic (negative); motion snap to the nearer edge; Backspace/Delete
deletes a whole folded range.
**Commit.** `feat(editor): atomic ranges for folds and embeds`

#### Task 4.8 — Smart lists
**Catalogue.** LIST-001, -002, -003.
**Files.** Create `lists/{continuation,indent,renumber}.ts` (+ tests).
**Tests.** Region test short-circuit (table/code/math → plain newline);
ordered +1 with delimiter preserved; task always continues unchecked; four
empty-item removal cases; Shift+Enter plain; Tab/Shift+Tab use the fixed unit
(`\t` with `useTab`, else four spaces); renumber rewrites digits only; bullets
never normalised (negative).
**Commit.** `feat(editor): smart lists and list indentation`

#### Task 4.9 — Indent, line numbers, indent guides
**Catalogue.** SET-002 (live keys), D-5 decision in Rev 1.
**Files.** Create `gutters.ts`; modify `editor-extensions.ts` (+ tests).
**Tests.** Live reconfigure for `useTab`/`tabSize` reloads the indent unit;
line numbers off by default; indent guides on per §4.1. Reuse check:
`@replit/codemirror-indentation-markers` vs a small plugin — decide and record.
**Commit.** `feat(editor): settings-driven indentation and gutters`

#### Task 4.10 — Per-line direction + RTL readiness
**Catalogue.** DIR-001, -002; architecture §8.
**Files.** Modify `editor-extensions.ts`, `theme.ts`; audit new classes.
**Tests.** `perLineTextDirection` on; `rightToLeft` comes from the locale prop
only; logical properties only (no physical padding/text-align in generated
theme objects); `bdi` isolation of identifiers/code where introduced.
**Commit.** `feat(editor): per-line direction and RTL readiness`

### Phase 5 — Folding & history

#### Task 5.1 — Three fold services
**Catalogue.** FOLD-001, -002, -007.
**Files.** Create `folding/services.ts` (+ test).
**Tests.** Indent: blank lines transparent; visual-column compare (a tab child
deeper than a space parent); heading regex ceiling of six; heading body rule
fixtures (including the entry's "last greater level" wording); frontmatter
block folds as a unit; heading wins ties.
**Commit.** `feat(editor): fold services (indent, heading, frontmatter)`

#### Task 5.2 — Fold gutter
**Catalogue.** FOLD-005.
**Files.** Modify `gutters.ts` (+ test).
**Tests.** A marker renders per foldable line; the collapsed state keeps the
marker visible; one element split by class state.
**Commit.** `feat(editor): fold gutter with collapsed-state markers`

#### Task 5.3 — Fold commands
**Catalogue.** FOLD-006.
**Files.** Create `folding/commands.ts` (+ test).
**Tests.** Span = selection start → end of the line containing selection end;
Fold more takes the **outermost** not-yet-folded range intersecting the span;
Fold less takes the outermost folded one; toggle/all/unfold-all; repeated
presses walk outward (not inward — negative to Rev 1's assumption).
**Commit.** `feat(editor): fold commands with outermost-range semantics`

#### Task 5.4 — Fold announcements + empty phrase
**Catalogue.** A11Y-001, FOLD-003, FOLD-004.
**Files.** Modify `folding/*`; add announcer to `cm-editor.tsx` (+ test).
**Tests.** Fold/unfold dispatches "Folded/Unfolded lines n to m." to a polite
live region with localisable parts; a collapsed code block announces as folded
with the empty phrase.
**Commit.** `feat(editor): fold announcements`

#### Task 5.5 — Fold persistence
**Catalogue.** FOLD-008; §4.3.
**Files.** Create `folding/persistence.ts` (+ test).
**Tests.** Store/load round-trip 0-based; 500 ms debounce (fake timers);
line-count mismatch ignores stored folds; drafts without an id do not persist;
malformed storage is discarded safely.
**Commit.** `feat(editor): per-note fold persistence`

#### Task 5.6 — History
**Catalogue.** HIST-001, -002.
**Files.** Create `history.ts`; modify `editor-extensions.ts`,
`capture-surface.tsx` (mode switching).
**Tests.** Typing within 500 ms at adjacent ranges coalesces; apart → new step;
a mode switch preserves undo/redo; redo bindings per platform incl. Linux
`Ctrl-Shift-z`; the 20-entry LRU evicts least-recently-used.
**Commit.** `feat(editor): history coalescing and mode-switch survival`

### Phase 6 — Command surface

#### Task 6.1 — Command registry coverage
**Catalogue.** CMD-001, -002, -003; UNDOC-001.
**Files.** Create `capture/formatting/{commands.ts,tiptap-adapter.ts,codemirror-adapter.ts}`
(+ tests). Extend Rev 1's list to the behaviour families: headings 1–6;
highlight colours; paragraph (quote, code block, HR); lists (bullet, ordered,
checklist, cycle, indent/unindent); format (bold/italic/strike/code/highlight/
clear); insert (table, callout, footnote, link, tag); fold family; history;
focus; add-cursor above/below; swap-line; delete-paragraph; search/replace;
toggle source. Both adapters implement every ID.
**Tests.** Unique IDs; registry test fails when an ID lacks an adapter; settings
key strings match `EditorSettings`.
**Commit.** `feat(capture): command registry with dual adapters`

#### Task 6.2 — The curated keymap
**Catalogue.** CMD-004, -005.
**Files.** Modify `keymap.ts` (+ tests).
**Tests.** One keymap; the seven filtered bindings removed; standard /
indent-with-tab / closeBrackets / completion keymaps absent (negative);
default-hotkeys map populates the toolbar chips; user overrides win.
**Commit.** `feat(editor): single curated keymap and default hotkeys`

#### Task 6.3 — Context menu
**Catalogue.** MENU-001, -002.
**Files.** Create `commands/context-menu.tsx` (+ test).
**Tests.** Fixed section order Format / Paragraph / Insert; token-specific
entries appear only on their tokens; table cell menu appears only inside a
cell; every item is keyboard reachable (QA §1.1).
**Commit.** `feat(editor): editor context menu`

#### Task 6.4 — Slash commands
**Catalogue.** SLASH-001 (deviation: default-on), -002, -003, -004.
**Files.** Create `commands/slash.ts` (+ test).
**Tests.** Trigger regex fires at line start and after whitespace only; a space
after the query closes it; accepting deletes the slash range then runs the
command; list is fuzzy over the registry with hotkey chips.
**Commit.** `feat(editor): slash commands`

#### Task 6.5 — Find/replace + reveal integration
**Catalogue.** REVEAL-003; F-15 F-1.
**Files.** Modify `editor-extensions.ts`, `live-preview/reveal.ts` (+ tests).
**Tests.** `Ctrl+F` search bar; matches listed; active highlights feed the
reveal engine (a match inside a construct reveals it); Find all selects every
match; replace/replace-all.
**Commit.** `feat(editor): find and replace with reveal integration`

#### Task 6.6 — One formatting toolbar
**Catalogue.** CMD-001 (coverage); F-15 B-4.
**Files.** Rebuild `capture/formatting-toolbar.tsx` on the registry; delete the
two parallel view functions.
**Tests.** The identical button set in all three modes; no command is mouse-only
(QA §1.1); keyboard reachability preserved; the bubble stays Normal-mode.
**Commit.** `refactor(capture): one formatting toolbar for both engines`

### Phase 7 — Clipboard & drops

#### Task 7.1 — Paste
**Catalogue.** CLIP-001, -002, -003.
**Files.** Create `clipboard/paste.ts` (+ tests); modify `cm-editor.tsx`.
**Tests.** Dispatch order (custom MIME → sentinel HTML → plain → uri-list);
HTML→markdown only when `autoConvertHtml`; a URL over a selection wraps it as
link text; plain text inserts verbatim; paste-as-plain via the context menu.
**Commit.** `feat(editor): paste dispatch and URL wrapping`

#### Task 7.2 — HTML drop
**Catalogue.** CLIP-005 (HTML half only).
**Files.** Modify `clipboard/paste.ts` (+ test).
**Tests.** An HTML drop converts under the same gate; file drops stay with the
existing import path; the link-vs-embed set stays deferred (Task 3.4).
**Commit.** `feat(editor): HTML drop conversion`

### Phase 8 — Hardening & acceptance

#### Task 8.1 — Construct fidelity matrix
**Catalogue.** Every adopted entry (one test per ID).
**Files.** Create `live-preview/fidelity.test.ts` + extensions to
per-construct suites.
**Tests.** Every construct has both folded and unfolded assertions; a document
round-trips `view.state.doc` unchanged after decoration; each adopted entry ID
appears in at least one test name.
**Commit.** `test(editor): construct fidelity matrix by entry ID`

#### Task 8.2 — Interaction regression suite
**Files.** Create `codemirror/interaction.test.tsx`; extend
`capture/capture-modes.test.tsx`.
**Tests.** Caret motion matrix (Home/End smart cases, word, escape, atomic);
Tab/Enter through lists and tables; undo across folds and a mode switch; paste;
slash; find.
**Commit.** `test(editor): interaction regression suite`

#### Task 8.3 — Accessibility pass
**Catalogue.** A11Y-001…003; QA §1, §3, §6.1.
**Files.** Create `codemirror/a11y.test.tsx`; fix findings.
**Tests.** Focus order; every toolbar/menu command keyboard-reachable;
code/table overflow keyboard-scrollable; announcements polite and not
token-level; reduced-motion honoured; the recorded deviation (D-4) verified as
an improvement.
**Commit.** `fix(editor): accessibility findings from checklist pass`

#### Task 8.4 — Performance budget
**Files.** Create `codemirror/perf.test.ts`.
**Tests.** Structural: the scanner visits only viewport-bounded ranges; a
keystroke does not dispatch a whole-document rebuild (instrumented counters);
5,000-line fixtures stay linear-ish; no wall-clock assertions thinner than a
generous median budget.
**Commit.** `perf(editor): guard decoration build cost`

#### Task 8.5 — Visual/mobile pass
**Action.** Await `@user` (no browser in the implementer session, as
established in prior slices). Check mode-switch look agreement, sticky toolbar,
mobile capture.
**Commit.** none (verification task).

#### Task 8.6 — Close-out
**Files.** Regenerate `docs/fidelity/obsidian-parity-matrix.md`; update
`docs/design/now.md`; update the lane/tracks pointers.
**Acceptance.** Matrix statuses final; deviations final; all gates green
(`pnpm nx run-many -t typecheck lint test build`).
**Commit.** `docs(tracks): close F-15 Rev 2`

### Rev 1 → Rev 2 task map

| Rev 1 | Rev 2 |
|---|---|
| A-1…A-5 | 1.1…1.5 (A-1 defaults superseded by §4.1) |
| B-1…B-4 | 6.1, 6.6 (+ adapters) |
| C-1 | 3.3 (viewport half) |
| C-2 | 4.7 |
| C-3 | 2.5, 2.7 (corrected: comments visible) |
| C-4 | 3.2 |
| C-5 | 2.11 |
| C-6 | gated (Task 3.5) |
| C-7 | deferred (3.4) |
| D-1…D-6 | 4.1, 4.4, 4.8, 4.9, 1.3 |
| E-1/E-2 | deferred (wikilinks) |
| F-1…F-3 | 6.5, 5.1–5.3 (F-2), gated (F-3) |
| G-R1/G-R2 | 4.10 |
| H-1…H-5 | 8.1…8.6 |
| — | new: 0.\*, 2.1–2.4, 2.6, 2.8–2.10, 3.1, 3.3, 4.2–4.3, 4.5–4.7, 5.4–5.6, 6.2–6.4, 7.1–7.2 |

---

## 6. Tests and validation

| Gate | Command | Where |
|---|---|---|
| Unit | `npx vitest run` | `packages/ui` |
| Single file | `npx vitest run src/codemirror/<file>.test.ts` | `packages/ui` |
| Typecheck | `npx nx typecheck ui` | repo root |
| Lint | `npx nx lint ui` | repo root |
| Full gate | `pnpm nx run-many -t typecheck lint test build` | repo root |
| Parity | the matrix test above, in `packages/ui` | repo root |

Rules: tests are named by entry ID for adopted/adapted behaviours; both the
folded and unfolded state of every construct is asserted; negatives from §0.4
have explicit tests; catalogue `partial` entries carry a "recorded unknown"
comment pointing at §4.4.

---

## 7. Risks and guardrails

- **Parser divergence (D-5).** Lezer vs `hypermd`: constructs the Lezer grammar
  does not model (comments, callouts, highlights, footnote refs) get a custom
  layer over the syntax tree; the construct matrix and the bridge round-trip are
  the guards. Any construct that cannot round-trip stays a recorded deviation.
- **Two-engine drift.** Every command is implemented twice (TipTap + CM6); the
  registry test fails on a missing adapter, and mode-switch tests assert the
  same markdown survives.
- **Scope.** Phases 0–3 deliver the core parity win; 4–8 harden. If the slice
  must shrink, cut at phase boundaries — never partial tasks.
- **Performance.** The table scanner and any whole-document decoration pass are
  the cost drivers; viewport scoping (3.3) and 8.4 are the mitigations.
- **Parity honesty.** The catalogue's partials and unknowns (§4.4) are never
  upgraded; where we choose behaviour the artifact does not have, it is a
  recorded deviation, not a parity claim.
- **Fold persistence staleness.** Guarded by the line-count rule; stale keys are
  tolerated (tiny); no server coupling exists to conflict with (§4.3).
- **a11y conflict.** OmniDoc's gate wins over the artifact's pointer-only
  widgets (D-4); recorded so future parity audits do not "fix" it back.

---

## 8. Provenance

- Spec: RE-Obsidian catalogue, Obsidian 1.14.4, artifact SHA-256
  `146ef8470d8cbb4a6db209bdc19bf2bad13350444186c0fd93c31087b142b92f`; evidence
  IDs `ev_c7f5023c…`, `ev_b24f07bb…`, `ev_d1679989…`, `ev_8d38e920…`.
- Contract: `docs/design/system-ux.md` §2 (three modes + lock; Obsidian-like
  behaviour; one formatting surface; JSON SoT; lossless construct round-trip).
- Predecessor: `docs/plans/2026-10-10_104547-obsidian-parity-editor-redesign.md`
  (F-15 Rev 1, historical).
- Decisions: §"Decisions locked 2026-10-13" above, recorded in
  `docs/design/now.md` by Task 0.2.
