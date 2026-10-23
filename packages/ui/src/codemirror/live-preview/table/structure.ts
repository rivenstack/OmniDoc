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
 * The plan reserves this file for the full command layer (`C.3`: menu and
 * affordance commands, sorting, duplicate/move/delete). This task adds **only**
 * the navigation half: pure model operations that already exist in `model.ts`
 * plus the focus targets the keyboard needs. No menu, no drag, no cell range.
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
  insertRow,
  pushHeaderDown,
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
