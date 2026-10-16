# F-15 Task 3.3 (Rev 2) — Table rebuild: per-cell model, Obsidian column UX, context menu

> **Execution note:** implement this plan **task-by-task, one commit per task**, and
> get **both gates green before the next task begins** — `npx vitest run` (cwd
> `packages/ui`) and `npx nx typecheck ui --skip-nx-cache` (repo root). This plan
> **supersedes Task 3.3 of the F-15 Rev 2 plan for the table slice**: its file
> list ("Modify `live-preview/table/*`"), its test list, and its commit name are
> replaced by this document; everything else in that plan (catalogue contract,
> gates, lane rules) still applies.

| Field | Value |
|---|---|
| Task | F-15 Task 3.3 (Rev 2) |
| Lane | frontend (`docs/handoffs/active/lane-frontend.md`) |
| Branch | `F15-obsidian-fidelity-editor` |
| Plan of record | [`2026-10-13_181100-obsidian-fidelity-editor.md`](2026-10-13_181100-obsidian-fidelity-editor.md) — Task 3.3 superseded by this file |
| Authority | `@user` decisions, 2026-10-16 (§1); catalogue `behaviours.json` (TABLE-001, -007; MENU-002); F-15 §0.4 negatives 1 & 4 |
| Scope | **Rewrite from scratch**: `packages/ui/src/codemirror/live-preview/table/**` + the table section of `live-preview/theme.ts` + the table suites |

## Start Command

```text
/implementer Read docs/plans/2026-10-16_172806-table-rebuild-obsidian-ux.md and execute it
exactly. This plan supersedes Task 3.3 of the F-15 Rev 2 plan for the table slice.
One plan task per commit; both gates green (`npx vitest run` in packages/ui;
`npx nx typecheck ui --skip-nx-cache` at the repo root) before the next task begins.
Begin at Task A.1. Keep docs/handoffs/active/lane-frontend.md current.
```

---

## 1. Locked decisions (`@user`, 2026-10-16) — do not re-decide

**Notes (verbatim intent):**

- **B-1** The table has **no focus outline**.
- **B-2** The table is **not full width**; it has a **minimum cell width** and
  **extends with its content**.
- **B-3** The table has **no toolbar above it** (the `.cm-live-table-toolbar` is
  removed; image S3's hover `+`, image S1/S2's column grip, and image S4's
  context menu replace every toolbar action).
- **B-4** Column **drag-and-drop**, the hover **`+` add-column** control, and the
  **context menu** look and behave as captured in §2.
- **B-5** Right-click inside a cell shows the **table menu now**, and will later
  also carry the **general editor context-menu items** (Task 6.3 — *not this
  plan*; this plan leaves the section seam).
- **B-6** With the caret at the start of the line **immediately after** the
  table, the first **Backspace selects the whole table**, the second deletes it.
  A mouse drag can also select the whole table; Backspace then deletes it.
- **B-7** Dragging inside a cell selects its **text**; continuing the drag
  **outside the cell** starts a **cell-range selection** (image S5).
- **B-8** **Rewrite the whole table logic from scratch** — the current
  `interaction.ts` / `tools.ts` / contenteditable-cell approach is replaced, not
  patched. The look changed, and some styles affect behaviour and UX.

**Judgments (answers to the two open items):**

- **J-1** Shift-Tab on the **first cell** (header row, column 0) **pushes the
  current header content down into the first body row** and leaves the **header
  empty** (new first body row receives the old header content; existing body
  rows follow).
- **J-2** Sort semantics as captured: **Sort by column (A to Z) / (Z to A)** on
  the clicked column — fine as specified in §4.6.

**Inherited, still in force:** the ten Rev 2 locked decisions (plan header,
2026-10-13) except where B-1…B-8 amend them; D-4 (every action keeps a keyboard
path); D-6 (Mintlify tokens + Tabler icons); no new `tokens.css` entries — the
new look consumes **existing token roles only**. Literal Obsidian CSS/assets are
still forbidden (behaviour parity, OmniDoc skin).

## 2. Evidence: captured artifact references (`@user` screenshots, 2026-10-16)

The screenshots are **not** in the repo; these transcriptions are the evidence.
Where a requirement is marked **[inferred]**, it was not directly captured and
must be verified in the `@user` visual pass (§11).

- **S1 — hover grip.** 3×3 table (`Head 1/2/3`; `Salam/Hola/Hello`; `Hey/Hee/Hoo`),
  dark UI. Above the **hovered column's** top edge sits a **six-dot grip handle**
  (⠿, 2 rows × 3 columns of dots) with a **grab cursor**; the hovered column
  shows a **subtle accent edge**. Headers are **bold, same background tone as the
  body** (no filled header bar). Cells are bordered with a hairline grid.
- **S2 — active column drag.** The grip is lifted (hand cursor beside it); the
  **dragged column is highlighted** — its header cell carries an accent-tinted
  fill and the column's edges carry accent lines.
- **S3 — hover `+` and reordered columns.** Columns reordered (`Head 3 | Head 1 |
  Head 2` — proof the drag rewrites the document). A **`+` button sits at the
  table's right edge**, vertically around the upper rows, with a **tooltip below
  it reading "Add column to the right"**. An editor caret sits on the empty line
  below the table.
- **S4 — context menu.** Top-level menu: **`Row ▸`, `Column ▸`**, separator,
  **`Sort by column (A to Z)`**, **`Sort by column (Z to A)`**. The expanded
  **Column** submenu (captured): **`Add column to the left`**, **`Add column to
  the right`**, separator, **`Move column left`**, separator, **`Align left`**,
  **`Align center`**, **`Align right`**, separator, **`Duplicate column`**,
  **`Delete column`**. The menu is a dark rounded panel with icons; one column is
  the rightmost, which is consistent with **`Move column right` being absent
  there** **[inferred: the mirror item exists and is hidden when
  unavailable]**. The **Row submenu's items were not captured** **[inferred: by
  symmetry — `Add row above`, `Add row below`, `Move row up`, `Move row down`,
  `Duplicate row`, `Delete row`]**.
- **S5 — cell-range selection.** A **2×2 block of cells** (cols 2–3 of rows
  1–2) is highlighted with a **rounded accent outline and tint**; the anchor
  cell keeps the **text caret** visible inside it. The surrounding cells are not
  tinted.

## 3. Catalogue contract that does NOT change

These are `adopt` rows in `docs/fidelity/obsidian-parity-matrix.md`; the tests
that carry their IDs must continue to exist after the rewrite:

- **`OBS-1.14.4-TABLE-001`** — one editor per cell holding **decoded** cell text
  (`\|` → `|`, line-break tag → newline); pipes and the delimiter row are
  **unreachable by construction**; Tab/Enter navigation; arrows from outside land
  **on** the widget line.
- **`OBS-1.14.4-TABLE-007`** — the table is **always rendered**; a caret landing
  in the hidden range is **redirected into a cell** (position match; else the
  first cell of the first/last row by direction of travel; RTL swaps the
  fallback targets).
- **`OBS-1.14.4-MENU-002`** — a **separate** table-cell context menu with
  row/column operations **plus sorting**, only when the click lands in a cell.
- **F-15 §0.4 negative 1** — no pipe-skipping rule and no delimiter-row
  addressability (by construction — assert it).
- **F-15 §0.4 negative 4** — **no caret-gating**: nothing ever reveals the raw
  table markdown in Live Preview.
- **F-15 C-1 (perf half)** — on a 5,000-line document the table scanner visits
  **only the viewport ± margin**; structural test.

Test-naming convention (repo): entry IDs appear in `describe`/`it` names or file
headers, e.g. `it("TABLE-001: …")` — the image S3/S4 behaviours are
**`@user`-directed, never parity claims**, and are recorded as such in file
headers (precedent: Task 2.8/3.2).

## 4. Target behaviour specification

### 4.1 Model

- The model stores each cell as **encoded source** (GFM-safe: `\|`, `<br>`); the
  **cell editor's document is the decoded text** (`|`, newline).
- `decodeCell(source)`: `\|` → `|`; `<br>`, `<br/>`, `<br />` (case-insensitive)
  → newline; everything else untouched. `encodeCell(text)`: every `|` → `\|`;
  newline → `<br>`. Round-trip `encode(decode(x))` is **idempotent** (tested).
  A user who types a literal `<br>` in a cell gets it decoded to a newline on
  the next mount — recorded, tested, not "fixed".
- `markdown/table.ts` (parser/serializer, shared with the bridge) is
  **untouched**; the model wraps it.
- Structural operations are **pure** functions over the model (add/delete/
  move/duplicate row & column, alignment, sort, header push, clear-cells).
  Guards: one-column minimum (delete refused), header row not deletable/movable,
  body-row ops only on body rows, alignment moves with its column.

### 4.2 Layout and look (S1)

- **No focus outline** on the wrapper (B-1). The wrapper stays focusable
  (`tabindex=0`, `role=group`, `aria-label="Table"`) so a wide table remains
  keyboard-scrollable (QA §6.4); the caret and the selection highlight are the
  focus affordances.
- **Not full width** (B-2): the table sizes to content
  (`width: max-content; max-width: 100%`), the wrapper keeps
  `overflow-x: auto` for genuinely wide tables. Each column gets a **measured
  width** (B.2); every cell has a **minimum inline size** so an empty column
  stays visible. Long content wraps inside its measured column.
- Header cells: **bold text, no filled background** (change from today's
  `--muted` fill — S1). Hairline borders between cells (`--border`), same tone
  as the rest of the editor.
- Row height is consistent for empty cells (the old `:empty::before` trick is
  replaced by a min-height rule for the cell editor's content).
- All values are **existing token roles** (no new tokens). Exact token mapping
  is a visual-pass item (§11).

### 4.3 Affordances (S1–S4)

- **Hover grip**: hovering over a column (header or body cells) reveals a
  six-dot **grip** above that column's top edge; the column shows a subtle
  accent edge. Dragging the grip **lifts** the column (accent header fill +
  edges, S2) and reorders on drop; Escape/pointer-cancel aborts with no doc
  change. The keyboard alternative is the menu's `Move column left/right`
  (D-4 satisfied).
- **Hover `+`** (S3): a bordered round **`+`** button pinned to the **right edge**
  of the table appears while the table is hovered; tooltip **"Add column to the
  right"** (project Tooltip); activating it appends a column and focuses its
  header cell. It must use the **`mousedown` + `preventDefault`** trigger (a
  plain click would blur the cell, commit, and rebuild the widget under the
  pointer — the proven failure mode from the old toolbar). **[inferred,
  §11-1]**: left-edge mirror is not captured — do not build it.
- All affordances are `aria`-labelled buttons and keyboard reachable; they are
  **absent in a locked note**.

### 4.4 Selection model (S5)

Three selection kinds, mutually exclusive:

1. **Text selection** — inside one cell editor; native CM selection.
2. **Cell-range selection** — drag leaves the anchor cell with the primary
   button down: a **rectangle** from anchor cell to the hovered cell is tinted
   (accent outline + fill, S5), the anchor keeps its caret. Dragging beyond the
   right/left edge extends to the last/first column; beyond the bottom/top edge
   extends rows. Sweeping **every cell** = the whole-table state.
3. **Table selection** (B-6) — whole table highlighted; entered by the first
   **Backspace** at offset 0 of the line immediately after the table, or by a
   drag that covers every cell.

Semantics: Backspace/Delete over a **partial** cell range **clears those cells'
content** (cells stay); over the **whole-table** state it **deletes the table**
(the existing delete semantics: the block and its preceding newline). Typing
over a cell range clears the range and types into the anchor cell **[chosen
policy — §11-3]**. Escape clears any selection.

### 4.5 Keyboard matrix

| Key | Condition | Action |
|---|---|---|
| Left/Right | caret at decoded offset 0 / length | leave cell (previous/next cell, row-major) |
| Left/Right | mid-cell, or selection | native (boundary key → cell start/end by direction) |
| Up/Down | first/last **visual line** of the cell | leave to the same column's cell above/below |
| Up/Down | multi-line cell | native — the cell scrolls its own lines first |
| Tab | anywhere | next cell; **off the last cell: append a body row** |
| Shift-Tab | not the first cell | previous cell |
| **Shift-Tab** | **first cell (0,0)** | **J-1 header push**: header content → new first body row; header emptied; caret stays in the (now empty) header cell |
| Enter | body row | move down; on the last row: append one |
| Escape | cell focused | commit, focus the outer editor |
| Arrows from outside | caret arrives on the widget line | TABLE-007 redirect (C.1) then land in the same-column cell |
| Backspace | caret at offset 0 of the line after the table | 1st: select whole table; 2nd: delete it |
| Backspace / Delete | cell-range selection | clear the selected cells (whole table → delete) |
| Ctrl/Cmd-Z, Ctrl/Cmd-Shift-Z | cell focused | commit the cell edit, then forward `undo`/`redo` to the **outer** editor (cells install no history) **[chosen policy — §11-4]** |

### 4.6 Context menu (S4, MENU-002)

- Sections, in order:
  1. **Row** submenu — `Add row above`, `Add row below`, `Move row up`, `Move
     row down`, `Duplicate row`, `Delete row`. On a **header** cell only `Add
     row below` is offered (the header cannot be moved, duplicated or deleted)
     **[inferred — §11-2]**.
  2. **Column** submenu — `Add column to the left`, `Add column to the
     right`, `Move column left`, `Move column right` **[inferred mirror]**,
     `Align left`, `Align center`, `Align right` (checked state = the clicked
     column's alignment), `Duplicate column`, `Delete column`. Direction-
     unavailable items (`Move column left` on column 0, `Move column right` on
     the last column, `Delete column` with one column) are **removed**.
  3. Separator, then **`Sort by column (A to Z)`**, **`Sort by column (Z to
     A)`** — sorts **body rows** by the clicked column; comparison is
     case-insensitive, `numeric: true`, empty cells last when ascending; header
     row unaffected (J-2).
- Appears **only** right-clicking inside a cell (MENU-002 states); elsewhere the
  (future) general menu applies.
- The menu is the project's **Base UI `ContextMenu`** (the component Task 3.2
  added at `packages/ui/src/components/context-menu.tsx`), rendered as a React
  island inside the widget (precedent: the Task 3.2 callout). **Section seam for
  Task 6.3:** the item model is a `sections: MenuSection[]` array built by a pure
  function; Task 6.3 appends the general sections. Do **not** build general
  items now.
- Item activation must **not** be lost to the widget rebuild: handlers resolve
  the target cell/column against the **live** model and document at activation
  time (the Task 3.2 hardening lesson), and the anchor cell is captured at
  open time.
- Keyboard: the menu opens with the **context-menu key / Shift+F10** from a
  focused cell (forward the event to the trigger) — D-4; arrows/Enter/Escape are
  provided by the menu component.

### 4.7 Write-back and rebuild

Unchanged in spirit from the proven pipeline, reimplemented in the new widget:

- Editing a cell never touches the document per keystroke; the document is
  written on **focus leaving the table**, **Escape**, **idle flush**
  (`TABLE_IDLE_FLUSH_MS` = 600 ms), and **every structural edit**.
- Writes are dispatched **outside** a CM update (defer to the next task when
  `view.updateState !== Idle`) — the F-14 defect recorded in `docs/design/now.md`.
- A write rebuilds the widget; the caret is restored synchronously into the
  rebuilt widget by table offset (`data-table-from`) **[`written` latch, as
  today]**.
- The delimiter completion timer (`TABLE_COMPLETE_MS` = 500 ms) is retained.

### 4.8 Caret redirection (TABLE-007) and negatives

- Leaving/landing the outer caret inside a rendered table's hidden range
  focuses the matching cell instead (C.1); nothing ever unfolds the raw source
  (**negative test**).
- Pipes and the delimiter row never exist in any editable document (**negative
  test**, by construction).
- RTL **readiness**: the redirect fallback targets swap under a RTL locale
  resolution; all new CSS uses logical properties; no RTL locale support is
  claimed (`en`/LTR is the only shipping locale).

## 5. Architecture (the rewrite)

New layout under `packages/ui/src/codemirror/live-preview/table/`:

| File | Role |
|---|---|
| `index.ts` | public surface — **same names** as today |
| `model.ts` | decoded-cell codec + all pure structural operations |
| `store.ts` | widget state (model, selection, hover, drag); subscribe/notify |
| `scan.ts` | viewport-bounded scanner, delimiter completion, `tableLivePreview`, the "table selected" outer state field + Backspace keymap |
| `widget.ts` | `TablePreviewWidget` — `toDOM` mounts a React root (`createRoot` + `flushSync`, unmount in `destroy`, re-render in `updateDOM`) |
| `grid.tsx` | React grid: rows/cells, cell-editor hosts, selection overlay, affordance composition |
| `editor.ts` | one nested CM6 `EditorView` per cell (decoded doc, minimal extensions, cell keymap, no history) |
| `selection.ts` | cell-range math, pointer drag state machine, TABLE-007 redirect functions |
| `structure.ts` | command layer: every menu/affordance/keyboard mutation + focus target |
| `affordances.tsx` | hover grip, hover `+`, tooltips |
| `drag.ts` | column drag pointer logic + pure drop-index function |
| `menu.tsx` | the context menu (sections model + Base UI) + Task 6.3 seam |
| `measure.ts` | content-based column sizing (pure core + injectable text measurer) |

**Deleted:** `interaction.ts`, `tools.ts` (toolbar icons/buttons and
`renderCellMarkdown` — cells render markdown through the inline live preview
instead, A.3).

**Public surface preserved** (imported by `live-preview/index.ts` and
`codemirror/index.ts`, and `callout/commands.ts` imports `findTableBlocks`):
`TABLE_COMPLETE_MS`, `TABLE_IDLE_FLUSH_MS`, `TablePreviewWidget`,
`findTableBlocks`, `parseMarkdownTable`, `serializeMarkdownTable`,
`tableLivePreview`.

**Key architecture decisions:**

1. **React owns the grid DOM; CM owns the text.** The React root renders the
   table structure, overlay and affordances (Task 3.2 precedent). Cell editors
   mount once per cell identity via refs and are **never remounted by
   keystrokes** — content flows model → editor doc on commit only.
2. **One nested `EditorView` per cell** (TABLE-001's model). Cells get a
   minimal extension set: `markdown()` language, the **inline-scoped** live
   preview (A.3), `lineWrapping`, and a cell keymap. **No history** in cells.
3. **Event isolation stays**: the wrapper keeps the proven
   `stopPropagation` list so the outer CodeMirror never sees events that start
   inside the table.
4. **No new dependencies.** Base UI `ContextMenu`, Tooltip, Tabler icons and
   the existing tokens cover everything.

## 6. Tasks

### Phase A — foundation

#### Task A.1 — Cell codec and structural model
**Catalogue.** TABLE-001 (decoded cell text).
**Files.** Create `table/model.ts`; test `table/model.test.ts`.
**Tests.** `decodeCell`/`encodeCell`: escaped pipe, code-span pipe, `<br>` /
`<br/>` / `<br />` / case variants, literal `<br>` text typed by a user,
newline re-encode, round-trip idempotence; all structural ops incl. guards
(one-column minimum, header immovable/undeletable, alignment follows column
moves/duplicates), sort comparator (case-insensitive, numeric, empties last),
header push (J-1), clear-cells.
**Commit.** `feat(editor): table model with decoded cell text and structural ops`

#### Task A.2 — The per-cell editor
**Catalogue.** TABLE-001 (one editor per cell; cell-document keymap).
**Files.** Create `table/editor.ts`; test `table/editor.test.ts`.
**Tests.** A cell `EditorView` mounts into a host div, holds decoded text,
receives typed input, and reports it back on read; cell keymap intercepts
Tab/Shift-Tab/Enter/Escape/arrows-out and calls the navigation callbacks
(preventDefault asserted); Ctrl-Z is **not** handled inside the cell and is
forwarded; no history extension installed (negative); the editor survives being
nested inside an outer CM content DOM (mount inside the real `cm-editor`
harness).
**Commit.** `feat(editor): per-cell table editor instance`

#### Task A.3 — Inline-scoped live preview for cells
**Catalogue.** REVEAL-008 (inline constructs), COMMENT-001 (cells excluded —
source shown).
**Files.** Modify `live-preview/decorations.ts` (scope option on the decoration
builder), `live-preview/index.ts` (export the scoped variant); wire in
`table/editor.ts`; tests extend `table/editor.test.ts`.
**Tests.** Cell docs render inline constructs (bold/italic/strike/inline
code/link/highlight) with the same classes as the document preview
(`cm-live-strong` …) and reveal source on touch (REVEAL-001/002 semantics);
block constructs in a cell (`#`, `>`, fences, a pipe block) produce **no**
block widgets — in particular **no nested table widget** (negative); the
document path is byte-identical (existing LP suites green, one negative test
that scope `"document"` still renders block constructs).
**Commit.** `feat(editor): inline-scoped live preview for table cells`

#### Task A.4 — Grid widget, commit pipeline, lock
**Catalogue.** TABLE-001, TABLE-007 (always rendered), MENU-002 (no toolbar state).
**Files.** Create `table/store.ts`, rewrite `table/widget.ts`, create
`table/grid.tsx`; update `table/index.ts`; **delete** `table/interaction.ts`,
`table/tools.ts`; rewrite `table-preview.test.tsx`; update the table test in
`cm-editor.test.tsx` (item 3: `contentEditable` assertion → inner
`.cm-editor`/cell-host assertion; the `.cm-live-table-wrapper` and
`table.cm-live-table` assertions stay).
**Tests (ported from the old suite, retargeted).** Renders with a short
delimiter row; no render inside fences; hold-while-typing; delimiter completion
timer; locked note: cells not editable, no affordances; `\|` round-trip; bare
pipe in a code span escaped on write; idle flush writes + caret kept; alignment
applied; table with no body rows; event isolation (no pointer/key events reach
the outer content DOM); a cell keeps focus while the editor is focused; **no
`.cm-live-table-toolbar`** in the DOM (negative); lock/unlock rebuilds
editors.
**Commit.** `feat(editor): table grid widget with per-cell editors`

### Phase B — look

#### Task B.1 — Obsidian-style look from tokens
**Catalogue.** B-1…B-3 (@user-directed).
**Files.** Modify `live-preview/theme.ts` (the `.cm-live-table-*` block).
**Tests.** `table/theme.test.ts` (new, structural): wrapper has no
`outline`/`:focus-visible` rule; the table rule has no `width: "100%"`; no
toolbar rules remain; header cell has no background fill; a min-inline-size
exists on cells; every colour literal in the table rules is a `var(--…)` token
reference (grep-level assertion over the rule object).
**Commit.** `style(editor): content-width table look with no focus ring`

#### Task B.2 — Content-based column sizing
**Catalogue.** B-2 (@user-directed).
**Files.** Create `table/measure.ts`; wire `table/grid.tsx`.
**Tests.** Pure sizing function: per-column width = max over column cells,
floored at the minimum, capped by the max; header included; empty column keeps
the minimum; DOM: a `colgroup` with per-column widths is applied; in jsdom the
injectable measurer fallback keeps the minimum (no layout available); recompute
is triggered on commit, not per keystroke (counter).
**Commit.** `feat(editor): content-sized table columns`

### Phase C — navigation, selection, structure

#### Task C.1 — Caret redirection (TABLE-007)
**Catalogue.** TABLE-007.
**Files.** `table/selection.ts` (pure redirect), `table/scan.ts` (outer
observer), `table/grid.tsx` (focus handoff).
**Tests.** `it("TABLE-007: …")` — caret dispatched into the header row / a
body row / the delimiter row of a rendered table focuses the matching cell
(position match) or the first cell of the first/last row by direction;
fallback targets swap under RTL; **negative**: the raw table source is never
revealed (no decoration change, the widget stays rendered); nothing is
dispatched from inside a CM update (deferral asserted with fake timers).
**Commit.** `feat(editor): table caret redirection`

#### Task C.2 — Navigation matrix
**Catalogue.** TABLE-001.
**Files.** `table/editor.ts`, `table/structure.ts` (header push wiring),
`table/grid.tsx`.
**Tests.** `it("TABLE-001: …")` — the §4.5 matrix: left/right leave only at
decoded offsets 0/length; up/down only at the first/last visual line of a
multi-line cell; Tab appends off the last cell; Shift-Tab moves back and, at
(0,0), performs the **J-1 header push** (doc asserted: empty header, old header
now first body row, focus in the header); Enter moves/inserts; Escape commits
and focuses the outer editor; arrows from outside land in the same-column cell;
**negative**: no motion path ever exposes a pipe or the delimiter row.
**Commit.** `feat(editor): table navigation matrix with header push`

#### Task C.3 — Structure commands
**Catalogue.** MENU-002 (row/column ops + sort — the command layer).
**Files.** Create `table/structure.ts`; test `table/structure.test.ts`.
**Tests.** Every command: doc result + focus target (add row/column keeps or
moves focus per §4.3/§4.6; delete clamps like today; duplicate focuses the
copy; move focuses the moved column's header; sort keeps focus; align keeps
focus; delete table removes block + preceding newline and focuses the outer
editor); guards (removed menu items never dispatch; delete refused at one
column); all through the commit pipeline (no dispatch inside a CM update).
**Commit.** `feat(editor): table structure commands`

#### Task C.4 — Cell-range selection
**Catalogue.** B-7 (@user-directed; S5).
**Files.** `table/selection.ts`, `table/grid.tsx`.
**Tests.** Drag from a text position leaving the anchor cell starts a
rectangle selection (S5: tinted block, anchor caret retained); dragging beyond
the right/left/bottom edge extends to the last/first column / last row; a
sweep covering every cell enters the whole-table state; Escape clears; the
overlay covers exactly the selected rect (structural DOM assertion); clearing
happens on commit/rebuild.
**Commit.** `feat(editor): table cell-range selection`

#### Task C.5 — Selection semantics: clear, delete, table-level Backspace
**Catalogue.** B-6, B-7 (@user-directed).
**Files.** `table/scan.ts` (outer keymap + selected-table state field),
`table/selection.ts`, `table/structure.ts`.
**Tests.** First Backspace at the start of the line right after the table
selects the whole table (no doc change); second deletes it (caret ends at the
line's start); a partial cell selection + Backspace/Delete clears only those
cells' content (cells remain, focus in anchor); the whole-table state +
Backspace deletes the table; typing over a cell selection clears it and types
into the anchor cell; any other Backspace is untouched (negative); Ctrl-Z in a
cell commits then undoes the write-back on the outer history.
**Commit.** `feat(editor): table selection deletion semantics`

### Phase D — affordances

#### Task D.1 — Hover `+` add column
**Catalogue.** B-4 (@user-directed; S3).
**Files.** `table/affordances.tsx`, `table/grid.tsx`.
**Tests.** The button appears on table hover and is absent otherwise and in a
locked note; tooltip text is exactly "Add column to the right"; activation adds
an empty column on the right and focuses its header cell; `mousedown` +
`preventDefault` means no blur/commit fires before the action (asserted: no
focusout write on press); keyboard reachable (focusable button, Enter runs it).
**Commit.** `feat(editor): hover add-column affordance`

#### Task D.2 — Column drag-and-drop
**Catalogue.** B-4 (@user-directed; S1, S2).
**Files.** Create `table/drag.ts`; `table/affordances.tsx` (grip render).
**Tests.** Pure drop-index function: dragging left/right across column
boundaries yields the right target index; same-index is a no-op; DOM flow:
hovering a column shows the grip over that column; pointer-down on the grip
lifts the column (accent state classes asserted); drop reorders the document
(alignment follows) and focuses the dragged column's header; Escape and
`pointercancel` abort with **no doc change** (negative); in a locked note the
grip never appears.
**Commit.** `feat(editor): column drag-and-drop reorder`

#### Task D.3 — Context menu (MENU-002)
**Catalogue.** MENU-002; B-5 seam.
**Files.** Create `table/menu.tsx` (+ pure `menuSections()` in the same file or
`table/menu-model.ts`); test `table/menu.test.tsx`.
**Tests.** `it("MENU-002: …")` — right-click in a cell opens the menu with the
§4.6 sections/items in order; header-cell Row submenu offers only "Add row
below" (guarded items absent); alignment items show the clicked column's
checked state; unavailable move/delete items are absent; sort A→Z / Z→A order
body rows (header fixed, empties last ascending); every item dispatches its
structure command and closes the menu; focus returns to the anchor cell;
keyboard open via the context-menu key / Shift+F10 from a focused cell;
right-click outside any cell never opens **this** menu (negative); the
`sections` model is the Task 6.3 seam (a test pins the array shape).
**Commit.** `feat(editor): table cell context menu`

### Phase E — performance and close-out

#### Task E.1 — Viewport-bounded scanner (F-15 C-1)
**Files.** `table/scan.ts`, `table/perf.test.ts` (new).
**Tests.** On a 5,000-line fixture (tables far outside a small viewport) the
scanner visits only viewport ± margin lines (instrumented counter — structural,
no wall-clock); a keystroke inside a visible table does not re-scan the whole
document (counter); viewport change re-scans the new window; delimiter
completion still fires (TABLE_COMPLETE_MS) and `findTableBlocks`' public
behaviour is unchanged for in-window blocks.
**Commit.** `perf(editor): viewport-bounded table scanning`

#### Task E.2 — Close-out
**Files.** `parity/dispositions.ts` (refresh the `MENU-002` note: table-cell
menu with the Task 6.3 seam; keep it `adopt`; no disposition change), regenerate
`docs/fidelity/obsidian-parity-matrix.md` (byte-diff expected — commit the
regenerated copy), `docs/design/now.md` (one decision row: 2026-10-16 table
rebuild — look + UX per `@user`, existing tokens only), the F-15 plan's Task 3.3
heading (one "Superseded for the table slice by …" pointer line),
`docs/handoffs/active/lane-frontend.md` (next-task pointer → Plan Task 3.4;
progress log entry for this plan).
**Gates.** `npx vitest run` (packages/ui), `npx nx typecheck ui --skip-nx-cache`,
`npx nx lint ui --skip-nx-cache`, `npx nx build web --skip-nx-cache` (revert
`apps/web/next-env.d.ts` afterwards), `pnpm nx run-many -t typecheck lint test
build --exclude api`.
**Then soft-stop:** request the `@user` visual pass (§11) — do not claim it.
**Commit.** `docs(editor): table rebuild close-out`

## 7. Gates

| Gate | Command | Where |
|---|---|---|
| Unit (per task) | `npx vitest run` | `packages/ui` |
| Typecheck (per task) | `npx nx typecheck ui --skip-nx-cache` | repo root |
| Lint (phase close) | `npx nx lint ui --skip-nx-cache` | repo root |
| Build (phase close) | `npx nx build web --skip-nx-cache` | repo root |
| Full (phase close) | `pnpm nx run-many -t typecheck lint test build --exclude api` | repo root |

`--skip-nx-cache` on both per-task gates is mandatory (a cached pass can report
the previous task's success). `api:test` may stay red only for the documented
`Connection to localhost:5432 refused` environmental failure.

## 8. Acceptance criteria

- All §4 behaviours implemented; every §6 task committed alone with both gates
  green.
- Tests carry the IDs `TABLE-001`, `TABLE-007`, `MENU-002` in their names;
  both §0.4 negatives (no pipe skipping/delimiter addressability, no
  caret-gating) have explicit tests; `@user`-directed behaviours (B-1…B-8,
  J-1/J-2) are recorded as directed in file headers, **never as parity claims**.
- The ported behavioural suite (A.4) keeps every still-valid F-14 guarantee
  (escape round-trip, idle flush, lock, event isolation, delimiter
  completion); no toolbar remains; the public surface in §5 is unchanged.
- A11y: every new affordance and menu item is keyboard reachable (D-4); the
  menu opens from the keyboard; a locked note has no affordances.
- RTL: readiness only — logical properties, locale-driven direction, no RTL
  locale claim.
- E.1's structural perf test proves the viewport bound; the parity matrix is
  regenerated and green.

## 9. Out of scope (forbidden)

- The **general editor context menu items** (Task 6.3) — seam only.
- Row hover `+`, row drag, left-edge `+` mirror (§11-1) — not directed.
- Normal-mode (TipTap) table UI — untouched; `formatting-toolbar.tsx` and the
  F-14 selection bubble stay as they are.
- Images (3.4), math/Mermaid (3.5), tag click (BL-26), wikilinks.
- New dependencies, new `tokens.css` entries, Obsidian CSS/assets.
- `markdown/table.ts` parser/serializer changes; `apps/api/**`;
  `packages/contracts/**`; the S-02 contract.

## 10. Risks and soft-stops

- **Nested editor integration** (an `EditorView` inside a widget inside an
  `EditorView`): focus loops, event storms, jsdom quirks. Mitigated by A.2
  proving the primitive alone and A.4's event-isolation tests. If A.2 proves
  the approach unworkable, **soft-stop and return to Commander** — do not
  silently fall back to contenteditable cells.
- **Block decorations and the viewport** (E.1): block decorations cannot come
  from a `ViewPlugin`; the design is a viewport observer feeding the state
  field. If the bound cannot be met structurally, record the deviation in E.1
  and continue — do not drop the test.
- **Focus/commit races** around menu and affordances: the Task 3.2 hardening
  pattern (live resolution, `mousedown` + `preventDefault`, `updateDOM`) is the
  mitigation; regression tests are mandatory in D.1/D.3.
- **Sizing without layout in jsdom**: the measurer is injectable; the pure
  function carries the tests; the visual pass owns the real values.
- **Scope**: if the slice must shrink, cut at phase boundaries — never partial
  tasks. Any gate red after one bounded fix attempt → soft-stop back to
  Commander.

## 11. Open items — verify in the `@user` visual pass (do not block on them)

1. Left-edge `+` mirror — not captured; **not built** unless `@user` asks.
2. Row submenu labels/order and header-cell Row guards — inferred by symmetry.
3. Typing over a cell-range selection — chosen: clear + type into the anchor.
4. Undo inside a cell — chosen: cells have no history; Ctrl-Z commits then
   delegates to the outer editor.
5. Grip trigger geometry (hover target, offset above the top edge).
6. Max column width / wrap threshold; minimum cell width value.
7. Selection tint/outline token mapping; dragged-column accent treatment.
8. Empty-row height rule (replaces the old `:empty::before` trick).
9. `Move column right` visibility rule (last column) — inferred.
10. Shift+Enter (newline inside a cell) — not directed; nothing built.

**Visual-pass checklist for `@user`:** no focus ring on the table; table hugs
its content; hover grip + drag reorder; hover `+` with tooltip; cell context
menu with Row/Column/Sort; Backspace-after-table select → delete; cell-range
selection look (S5); empty cells and rows look right; long content wraps
sensibly; locked note shows no affordances.

## 12. Supersedence

- Task 3.3 of
  [`2026-10-13_181100-obsidian-fidelity-editor.md`](2026-10-13_181100-obsidian-fidelity-editor.md)
  is superseded **for the table slice** by this plan (file list, tests, commit
  name). Its catalogue contract and gates carry over unchanged; Tasks 3.4 and
  3.5 follow this plan in the lane, unchanged.
- On close-out (E.2), the lane head's next-task pointer moves to **Plan Task
  3.4 — Images (design record only)**.
