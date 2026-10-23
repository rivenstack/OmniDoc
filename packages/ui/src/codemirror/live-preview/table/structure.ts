/**
 * Structural navigation for the rendered table
 * (F-15 Task 3.3 Rev 2, plan Task C.2).
 *
 * The grid (`grid.tsx`) owns the DOM and the cell editors, but *where a key
 * goes* is a question about the model, not about a view: "from this cell, which
 * cell does Tab reach?" — and, at an edge, "does the caret leave the table?".
 * Keeping those answers here has two benefits:
 *
 * - every branch of the §4.5 matrix is a plain unit test, with no editor, no
 *   timers and no React; and
 * - the answer can name a **model change** (Tab off the last cell appends a row,
 *   Shift-Tab at `(0,0)` pushes the header down) together with the cell that
 *   must hold focus after the write, so the grid only has to translate one
 *   result into one action.
 *
 * This file holds two pure layers, both free of any view:
 *
 * - **navigation** (C.2) — what Tab / Enter / an arrow key resolves to; and
 * - **structure commands** (C.3) — the mutations the context menu (D.3) and the
 *   hover affordances (D.1/D.2) invoke. Every command answers with a
 *   {@link StructureResult}: either a new model plus the cell that must hold
 *   focus after the write, or "this cannot apply" as an explicit `noop`.
 *
 * Commands never mutate the view. The grid folds uncommitted cell text into the
 * model ({@link TableCommandRun}), runs the command, and hands a `commit` result
 * to the one write pipeline (`widget.ts`). Keeping the decision here is what
 * makes every menu item a plain unit test and lets D.3 *remove* unavailable
 * items — {@link canMoveRow} and friends answer the same question the command
 * will answer, so the menu never offers a command that would noop.
 *
 * No menu, no drag, no cell range lives here.
 *
 * ## Offsets
 *
 * A vertical or backwards move puts the caret at the **end** of the target cell;
 * a forwards **arrow** move (Right) puts it at the **start**. Tab also lands at
 * the end, so typing continues the target cell instead of overwriting it. The
 * end offset is computed from the **decoded** text (`cellText`), which is what
 * the cell editor holds — the model itself stores encoded source (`\|`, `<br>`).
 *
 * ## Row-major order
 *
 * "Next cell" is row-major: the header row first, then body rows top to bottom,
 * left to right within a row. The row index is visual (`0` = header), which is
 * also the address the grid and the model use.
 *
 * Catalogue: `OBS-1.14.4-TABLE-001`.
 */

import {
  bodyRowCount,
  cellText,
  columnCount,
  deleteColumn as deleteColumnIn,
  deleteRow as deleteRowIn,
  duplicateColumn as duplicateColumnIn,
  duplicateRow as duplicateRowIn,
  insertColumn,
  insertRow,
  moveColumn,
  moveRow,
  pushHeaderDown,
  setColumnAlignment,
  sortRows,
  type SortDirection,
  type TableAlignment,
  type TableCellRef,
  type TableModel,
} from "./model";

/** A cell plus the caret offset a focus request should use. */
export type TableFocusTarget = TableCellRef & { readonly offset?: number };

/**
 * What one navigation key resolved to.
 *
 * - `focus` — a plain move between cells; the document and model are untouched.
 * - `commit` — the move needed a structural edit; write this model and focus the
 *   target after the rebuild.
 * - `leave` — the caret stepped past an edge of the table and belongs in the
 *   outer editor, before or after the block.
 */
export type NavigationResult =
  | { readonly kind: "focus"; readonly focus: TableFocusTarget }
  | {
      readonly kind: "commit";
      readonly model: TableModel;
      readonly focus: TableFocusTarget;
    }
  | { readonly kind: "leave"; readonly edge: "before" | "after" };

/** Which way a horizontal arrow points. */
export type HorizontalDirection = "left" | "right";

/** Which way a vertical arrow points. */
export type VerticalDirection = "up" | "down";

function focusStart(
  model: TableModel,
  row: number,
  col: number,
): NavigationResult {
  return { kind: "focus", focus: { row, col, offset: 0 } };
}

/** Focus a cell at the end of its **decoded** text. */
function focusEnd(
  model: TableModel,
  row: number,
  col: number,
): NavigationResult {
  return {
    kind: "focus",
    focus: { row, col, offset: cellText(model, { row, col }).length },
  };
}

/**
 * Left/Right from a cell edge (plan §4.5).
 *
 * Row-major: Right continues at the next row's first cell, Left at the previous
 * row's last cell. Only `(0,0)` leaves on Left and only the last cell leaves on
 * Right.
 */
export function navigateHorizontal(
  model: TableModel,
  ref: TableCellRef,
  direction: HorizontalDirection,
): NavigationResult {
  const { row, col } = ref;
  const columns = columnCount(model);
  const bodyRows = bodyRowCount(model);

  if (direction === "right") {
    if (col < columns - 1) return focusStart(model, row, col + 1);
    if (row < bodyRows) return focusStart(model, row + 1, 0);
    return { kind: "leave", edge: "after" };
  }

  if (col > 0) return focusEnd(model, row, col - 1);
  if (row > 0) return focusEnd(model, row - 1, columns - 1);
  return { kind: "leave", edge: "before" };
}

/**
 * Up/Down from a cell's first/last visual line (plan §4.5).
 *
 * The same column above or below; off the header row Up and off the last body
 * row Down leave the table. A multi-line cell never reaches here — its editor
 * moves the caret between its own lines first (`editor.ts`).
 */
export function navigateVertical(
  model: TableModel,
  ref: TableCellRef,
  direction: VerticalDirection,
): NavigationResult {
  const { row, col } = ref;
  const bodyRows = bodyRowCount(model);

  if (direction === "down") {
    if (row < bodyRows) return focusEnd(model, row + 1, col);
    return { kind: "leave", edge: "after" };
  }

  if (row > 0) return focusEnd(model, row - 1, col);
  return { kind: "leave", edge: "before" };
}

/** Append a body row and focus `col` in it. */
function appendRow(model: TableModel, col: number): NavigationResult {
  const next = insertRow(model, model.rows.length);
  return {
    kind: "commit",
    model: next,
    focus: { row: model.rows.length + 1, col, offset: 0 },
  };
}

/**
 * Tab / Shift-Tab (plan §4.5, J-1).
 *
 * Forward Tab off the last cell appends a body row and focuses its first cell.
 * Backwards Shift-Tab at `(0,0)` performs the **J-1 header push**: the header's
 * content becomes the new first body row, the header is emptied, and the caret
 * stays in the now-empty header cell.
 */
export function navigateTab(
  model: TableModel,
  ref: TableCellRef,
  backwards: boolean,
): NavigationResult {
  const { row, col } = ref;
  const columns = columnCount(model);
  const bodyRows = bodyRowCount(model);

  if (backwards) {
    if (row === 0 && col === 0) {
      return {
        kind: "commit",
        model: pushHeaderDown(model),
        focus: { row: 0, col: 0, offset: 0 },
      };
    }
    if (col > 0) return focusEnd(model, row, col - 1);
    return focusEnd(model, row - 1, columns - 1);
  }

  if (col < columns - 1) return focusEnd(model, row, col + 1);
  if (row < bodyRows) return focusEnd(model, row + 1, 0);
  return appendRow(model, 0);
}

/**
 * Enter (plan §4.5): the same column one row down.
 *
 * On the last row — including a table with no body rows at all — a new row is
 * appended and focus lands in it, so Enter can build a table downward without
 * leaving the keyboard.
 */
export function navigateEnter(
  model: TableModel,
  ref: TableCellRef,
): NavigationResult {
  const { row, col } = ref;
  const bodyRows = bodyRowCount(model);
  if (row < bodyRows) return focusEnd(model, row + 1, col);
  return appendRow(model, col);
}

// ------------------------------------------------------------ command layer

/**
 * What one structure command resolved to.
 *
 * - `commit` — write this model and focus `focus` after the rebuild.
 * - `delete-table` — remove the whole block (the widget owns its range).
 * - `noop` — the command does not apply. Explicit, so a menu item that should
 *   have been removed cannot silently dispatch an unchanged model.
 */
export type StructureResult =
  | {
      readonly kind: "commit";
      readonly model: TableModel;
      readonly focus: TableFocusTarget;
    }
  | { readonly kind: "delete-table" }
  | { readonly kind: "noop" };

/** The shared "cannot apply" answer. */
const NOOP: StructureResult = { kind: "noop" };

/**
 * A result that refuses to claim a commit it did not make.
 *
 * A model operation returns its input unchanged when its guard fails (a move to
 * the same index, a sort by a missing column). The command layer must report
 * that as `noop`, never as `commit` with a referentially identical model — the
 * grid would otherwise rebuild the widget for nothing, and a menu item that
 * cannot apply would look enabled.
 */
function committed(
  model: TableModel,
  next: TableModel,
  focus: TableFocusTarget,
): StructureResult {
  if (next === model) return NOOP;
  return { kind: "commit", model: next, focus };
}

/** Column `col` exists in `model`. */
function hasColumn(model: TableModel, col: number): boolean {
  return col >= 0 && col < columnCount(model);
}

/**
 * `ref` addresses a cell of the table.
 *
 * `row === 0` is the header; `1..bodyRowCount` are the body rows. This is the
 * full grid address, not the model's body-only index.
 */
function isCell(model: TableModel, ref: TableCellRef): boolean {
  return hasColumn(model, ref.col) && ref.row >= 0 && ref.row <= bodyRowCount(model);
}

/** `ref` addresses a **body** row (the header is never a row command target). */
function isBodyRow(model: TableModel, ref: TableCellRef): boolean {
  return hasColumn(model, ref.col) && ref.row >= 1 && ref.row <= bodyRowCount(model);
}

/** The header cell of `col`, at offset 0 — where column commands land. */
function headerFocus(col: number): TableFocusTarget {
  return { row: 0, col, offset: 0 };
}

// ------------------------------------------------------------------ row ops

/**
 * Insert an empty body row **before** the clicked body row (plan §4.6).
 *
 * The header row is not a body row, so there is nothing "above" it: the command
 * is a noop there. The new row takes the clicked visual row's place and the
 * clicked row shifts down, so focus stays in the same column at the same visual
 * row — the user types into the row they asked for.
 */
export function addRowAbove(
  model: TableModel,
  ref: TableCellRef,
): StructureResult {
  if (!isBodyRow(model, ref)) return NOOP;
  const next = insertRow(model, ref.row - 1);
  return committed(model, next, { row: ref.row, col: ref.col, offset: 0 });
}

/**
 * Insert an empty body row **after** the clicked row (plan §4.6).
 *
 * On the header row this inserts the table's first body row, which is the only
 * row command §4.6 offers on a header cell.
 */
export function addRowBelow(
  model: TableModel,
  ref: TableCellRef,
): StructureResult {
  if (!isCell(model, ref)) return NOOP;
  // The header (row 0) inserts at body index 0; a body row inserts at its own
  // body index, which is one past itself. Both put the new row at `ref.row + 1`.
  const next = insertRow(model, ref.row);
  return committed(model, next, { row: ref.row + 1, col: ref.col, offset: 0 });
}

/** Move a body row up one; the first body row and the header cannot move. */
export function moveRowUp(
  model: TableModel,
  ref: TableCellRef,
): StructureResult {
  if (!isBodyRow(model, ref) || ref.row < 2) return NOOP;
  const index = ref.row - 1;
  const next = moveRow(model, index, index - 1);
  return committed(model, next, { row: ref.row - 1, col: ref.col, offset: 0 });
}

/** Move a body row down one; the last body row cannot move. */
export function moveRowDown(
  model: TableModel,
  ref: TableCellRef,
): StructureResult {
  if (!isBodyRow(model, ref) || ref.row >= bodyRowCount(model)) return NOOP;
  const index = ref.row - 1;
  const next = moveRow(model, index, index + 1);
  return committed(model, next, { row: ref.row + 1, col: ref.col, offset: 0 });
}

/** Copy the clicked body row directly below it and focus the copy. */
export function duplicateRow(
  model: TableModel,
  ref: TableCellRef,
): StructureResult {
  if (!isBodyRow(model, ref)) return NOOP;
  const next = duplicateRowIn(model, ref.row - 1);
  return committed(model, next, { row: ref.row + 1, col: ref.col, offset: 0 });
}

/**
 * Delete the clicked body row and keep the caret in the same column.
 *
 * The caret clamps to the same visual row (which now holds the row that was
 * below) or to the last body row when the deleted row was last. When the last
 * body row goes too, the table has no rows left and the closest editable cell is
 * the header — focus it rather than dropping the caret.
 */
export function deleteRow(
  model: TableModel,
  ref: TableCellRef,
): StructureResult {
  if (!isBodyRow(model, ref)) return NOOP;
  const next = deleteRowIn(model, ref.row - 1);
  if (next === model) return NOOP;
  const remaining = bodyRowCount(next);
  const row = remaining === 0 ? 0 : Math.min(ref.row, remaining);
  return { kind: "commit", model: next, focus: { row, col: ref.col, offset: 0 } };
}

// --------------------------------------------------------------- column ops

/** Insert an empty column directly left of the clicked column. */
export function addColumnLeft(
  model: TableModel,
  ref: TableCellRef,
): StructureResult {
  if (!hasColumn(model, ref.col)) return NOOP;
  const next = insertColumn(model, ref.col);
  return committed(model, next, headerFocus(ref.col));
}

/** Insert an empty column directly right of the clicked column. */
export function addColumnRight(
  model: TableModel,
  ref: TableCellRef,
): StructureResult {
  if (!hasColumn(model, ref.col)) return NOOP;
  const next = insertColumn(model, ref.col + 1);
  return committed(model, next, headerFocus(ref.col + 1));
}

/** Move a column one to the left; column 0 cannot move. */
export function moveColumnLeft(
  model: TableModel,
  ref: TableCellRef,
): StructureResult {
  if (!hasColumn(model, ref.col) || ref.col === 0) return NOOP;
  const next = moveColumn(model, ref.col, ref.col - 1);
  return committed(model, next, headerFocus(ref.col - 1));
}

/** Move a column one to the right; the last column cannot move. */
export function moveColumnRight(
  model: TableModel,
  ref: TableCellRef,
): StructureResult {
  if (!hasColumn(model, ref.col) || ref.col >= columnCount(model) - 1) {
    return NOOP;
  }
  const next = moveColumn(model, ref.col, ref.col + 1);
  return committed(model, next, headerFocus(ref.col + 1));
}

/** Set a column's alignment and focus its header (plan §4.6). */
export function alignColumn(
  model: TableModel,
  col: number,
  alignment: TableAlignment,
): StructureResult {
  if (!hasColumn(model, col)) return NOOP;
  // Re-selecting the alignment a column already has is not an edit — and the
  // menu's checked item is the one the user just confirmed.
  if ((model.alignments[col] ?? "left") === alignment) return NOOP;
  const next = setColumnAlignment(model, col, alignment);
  return committed(model, next, headerFocus(col));
}

/** Copy the clicked column directly to its right and focus the copy. */
export function duplicateColumn(
  model: TableModel,
  ref: TableCellRef,
): StructureResult {
  if (!hasColumn(model, ref.col)) return NOOP;
  const next = duplicateColumnIn(model, ref.col);
  return committed(model, next, headerFocus(ref.col + 1));
}

/**
 * Delete the clicked column.
 *
 * A table must keep at least one column (an empty delimiter row is not a table),
 * so the last column's command is a noop — the matching availability helper
 * removes the menu item instead of showing a dead entry.
 */
export function deleteColumn(
  model: TableModel,
  ref: TableCellRef,
): StructureResult {
  if (!hasColumn(model, ref.col) || columnCount(model) <= 1) return NOOP;
  const next = deleteColumnIn(model, ref.col);
  if (next === model) return NOOP;
  return {
    kind: "commit",
    model: next,
    focus: headerFocus(Math.min(ref.col, columnCount(next) - 1)),
  };
}

// -------------------------------------------------------------------- sort

/**
 * Sort the body rows by the clicked cell's column (plan J-2, §4.6).
 *
 * The header never moves (`sortRows` sorts the body only), and focus stays in
 * the cell the user invoked the command from — the row identity may change under
 * it, which is expected: the user asked for a reordering, not a different cell.
 */
export function sortColumn(
  model: TableModel,
  ref: TableCellRef,
  direction: SortDirection,
): StructureResult {
  if (!hasColumn(model, ref.col)) return NOOP;
  const next = sortRows(model, ref.col, direction);
  return committed(model, next, { row: ref.row, col: ref.col, offset: 0 });
}

// ------------------------------------------------------------- whole table

/**
 * Delete the entire table (plan §4.4: whole-table selection → delete).
 *
 * The result carries no model: the widget owns the block's document range, the
 * preceding newline, and the outer caret, so it performs the removal.
 */
export function deleteTable(): StructureResult {
  return { kind: "delete-table" };
}

// ------------------------------------------------------------- availability

/**
 * Which commands the menu may offer for a cell.
 *
 * §4.6 requires direction-unavailable items to be **removed**, not shown and
 * refused, so these helpers answer the same question their command does. They
 * are the single truth for both the menu (D.3) and the command guards above —
 * if the two ever disagreed, a removed item could noop or a present one could
 * do nothing.
 */

export function canAddRowAbove(model: TableModel, ref: TableCellRef): boolean {
  return isBodyRow(model, ref);
}

export function canAddRowBelow(model: TableModel, ref: TableCellRef): boolean {
  return isCell(model, ref);
}

export function canMoveRow(model: TableModel, ref: TableCellRef): boolean {
  return canMoveRowUp(model, ref) || canMoveRowDown(model, ref);
}

export function canMoveRowUp(model: TableModel, ref: TableCellRef): boolean {
  return isBodyRow(model, ref) && ref.row >= 2;
}

export function canMoveRowDown(model: TableModel, ref: TableCellRef): boolean {
  return isBodyRow(model, ref) && ref.row < bodyRowCount(model);
}

export function canDuplicateRow(model: TableModel, ref: TableCellRef): boolean {
  return isBodyRow(model, ref);
}

export function canDeleteRow(model: TableModel, ref: TableCellRef): boolean {
  return isBodyRow(model, ref);
}

export function canAddColumnLeft(model: TableModel, ref: TableCellRef): boolean {
  return hasColumn(model, ref.col);
}

export function canAddColumnRight(model: TableModel, ref: TableCellRef): boolean {
  return hasColumn(model, ref.col);
}

export function canMoveColumnLeft(model: TableModel, ref: TableCellRef): boolean {
  return hasColumn(model, ref.col) && ref.col > 0;
}

export function canMoveColumnRight(model: TableModel, ref: TableCellRef): boolean {
  return hasColumn(model, ref.col) && ref.col < columnCount(model) - 1;
}

export function canDuplicateColumn(model: TableModel, ref: TableCellRef): boolean {
  return hasColumn(model, ref.col);
}

export function canDeleteColumn(model: TableModel, ref: TableCellRef): boolean {
  return hasColumn(model, ref.col) && columnCount(model) > 1;
}

export function canAlignColumn(model: TableModel, ref: TableCellRef): boolean {
  return hasColumn(model, ref.col);
}

export function canSortColumn(model: TableModel, ref: TableCellRef): boolean {
  return hasColumn(model, ref.col);
}
