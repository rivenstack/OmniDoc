/**
 * The table cell context menu's **pure** model (F-15 Task 3.3 Rev 2, plan Task
 * D.3).
 *
 * `OBS-1.14.4-MENU-002` is a **separate, `@user`-directed** table-cell context
 * menu: right-clicking inside a cell offers row and column operations plus
 * sorting, and right-clicking anywhere else is not this menu's business (the
 * general editor menu, Task 6.3, owns that). The section/order contract is plan
 * §4.6 and the S4 capture (2026-10-16); it is recorded as directed, never as a
 * parity claim.
 *
 * ## Why the sections are data, not JSX
 *
 * The plan's **Task 6.3 seam** is explicit: the general editor items will later
 * be appended to this menu. So the menu is described here as a plain
 * `TableMenuSection[]` — submenus, separators and items in order — and
 * `menu.tsx` only *renders* that array. Appending a section is additive; no
 * renderer branch has to know about it.
 *
 * ## Why the commands are dispatched here
 *
 * Every id maps onto an existing `structure.ts` command, so the menu adds no
 * mutation logic of its own: the same guards that decide whether an item exists
 * (`canMoveRowUp`, `canDeleteColumn`, …) are the guards the command applies, and
 * the same `StructureResult` drives the one write pipeline. A menu item and the
 * keyboard path therefore cannot disagree.
 *
 * Nothing here imports React or touches the DOM: the model is a plain unit test,
 * and the DOM suite only proves the wiring.
 */

import {
  type TableAlignment,
  type TableCellRef,
  type TableModel,
} from "./model";
import {
  addColumnLeft,
  addColumnRight,
  addRowAbove,
  addRowBelow,
  alignColumn,
  canAddRowAbove,
  canAddRowBelow,
  canDeleteColumn,
  canDeleteRow,
  canDuplicateColumn,
  canDuplicateRow,
  canMoveColumnLeft,
  canMoveColumnRight,
  canMoveRowDown,
  canMoveRowUp,
  deleteColumn,
  deleteRow,
  duplicateColumn,
  duplicateRow,
  moveColumnLeft,
  moveColumnRight,
  moveRowDown,
  moveRowUp,
  sortColumn,
  type StructureResult,
} from "./structure";

/** The commands the table menu can dispatch (plan §4.6, exact order). */
export type TableMenuCommandId =
  | "row.add-above"
  | "row.add-below"
  | "row.move-up"
  | "row.move-down"
  | "row.duplicate"
  | "row.delete"
  | "column.add-left"
  | "column.add-right"
  | "column.move-left"
  | "column.move-right"
  | "column.align-left"
  | "column.align-center"
  | "column.align-right"
  | "column.duplicate"
  | "column.delete"
  | "sort.asc"
  | "sort.desc";

/** One rendered command: its id, its exact label, and its checked state. */
export type TableMenuItemSpec = {
  readonly id: TableMenuCommandId;
  readonly label: string;
  /** Alignment items only: the clicked column's current alignment. */
  readonly checked?: boolean;
};

/**
 * One top-level section (the Task 6.3 seam).
 *
 * A submenu carries its **flat** item list; the separators *inside* a submenu
 * are a presentation detail (the S4 capture groups add / move / align / modify)
 * and `menu.tsx` renders them from item ids, so this array stays data-only.
 */
export type TableMenuSection =
  | {
      readonly kind: "submenu";
      readonly id: "row" | "column";
      readonly label: "Row" | "Column";
      readonly items: readonly TableMenuItemSpec[];
    }
  | { readonly kind: "separator" }
  | { readonly kind: "item"; readonly item: TableMenuItemSpec };

/**
 * The column-add label.
 *
 * Kept as a literal rather than imported from `affordances.tsx`: this module is
 * intentionally React-free. The string is the one `ADD_COLUMN_LABEL` pins
 * (`"Add column to the right"`, plan §4.3/S3) and a test asserts the match.
 */
const ADD_COLUMN_RIGHT_LABEL = "Add column to the right";

const SORT_ASC_LABEL = "Sort by column (A to Z)";
const SORT_DESC_LABEL = "Sort by column (Z to A)";

function item(
  id: TableMenuCommandId,
  label: string,
  checked?: boolean,
): TableMenuItemSpec {
  return checked === undefined ? { id, label } : { id, label, checked };
}

/** The three alignment labels/ids, in the S4 order. */
const ALIGNMENTS: readonly {
  readonly id: TableMenuCommandId;
  readonly label: string;
  readonly alignment: TableAlignment;
}[] = [
  { id: "column.align-left", label: "Align left", alignment: "left" },
  { id: "column.align-center", label: "Align center", alignment: "center" },
  { id: "column.align-right", label: "Align right", alignment: "right" },
];

/**
 * The Row submenu (§4.6).
 *
 * A header cell (`row === 0`) cannot be moved, duplicated or deleted, so only
 * "Add row below" is offered there — the new row becomes the table's first body
 * row. A body row offers the full set, minus the direction-unavailable moves
 * (the first body row cannot move up, the last cannot move down).
 */
function rowItems(model: TableModel, cell: TableCellRef): TableMenuItemSpec[] {
  if (cell.row === 0) {
    return canAddRowBelow(model, cell)
      ? [item("row.add-below", "Add row below")]
      : [];
  }

  const items: TableMenuItemSpec[] = [];
  if (canAddRowAbove(model, cell))
    items.push(item("row.add-above", "Add row above"));
  if (canAddRowBelow(model, cell))
    items.push(item("row.add-below", "Add row below"));
  if (canMoveRowUp(model, cell)) items.push(item("row.move-up", "Move row up"));
  if (canMoveRowDown(model, cell))
    items.push(item("row.move-down", "Move row down"));
  if (canDuplicateRow(model, cell))
    items.push(item("row.duplicate", "Duplicate row"));
  if (canDeleteRow(model, cell)) items.push(item("row.delete", "Delete row"));
  return items;
}

/**
 * The Column submenu (§4.6, S4).
 *
 * Add and align are always offered for an existing column; move and modify
 * follow the direction/one-column guards. Exactly one alignment item is
 * `checked`, and a missing alignment reads as `left` (the grid's default).
 */
function columnItems(
  model: TableModel,
  cell: TableCellRef,
): TableMenuItemSpec[] {
  const items: TableMenuItemSpec[] = [];
  // Add and align are always offered for an existing column (plan §4.6).
  items.push(item("column.add-left", "Add column to the left"));
  items.push(item("column.add-right", ADD_COLUMN_RIGHT_LABEL));
  if (canMoveColumnLeft(model, cell)) {
    items.push(item("column.move-left", "Move column left"));
  }
  if (canMoveColumnRight(model, cell)) {
    items.push(item("column.move-right", "Move column right"));
  }
  const current = model.alignments[cell.col] ?? "left";
  for (const { id, label, alignment } of ALIGNMENTS) {
    items.push(item(id, label, current === alignment));
  }
  if (canDuplicateColumn(model, cell)) {
    items.push(item("column.duplicate", "Duplicate column"));
  }
  if (canDeleteColumn(model, cell)) {
    items.push(item("column.delete", "Delete column"));
  }
  return items;
}

/**
 * Build the menu for one cell, in render order (plan §4.6).
 *
 * `cell` is the anchor captured when the menu opened; the caller clamps it
 * against the live model before use, so a model that shrank under an open menu
 * cannot index past the table (`@user` hardening, Task 3.2 lesson).
 */
export function menuSections(
  model: TableModel,
  cell: TableCellRef,
): TableMenuSection[] {
  const sections: TableMenuSection[] = [];

  const rows = rowItems(model, cell);
  if (rows.length > 0) {
    sections.push({ kind: "submenu", id: "row", label: "Row", items: rows });
  }

  const columns = columnItems(model, cell);
  if (columns.length > 0) {
    sections.push({
      kind: "submenu",
      id: "column",
      label: "Column",
      items: columns,
    });
  }

  sections.push({ kind: "separator" });
  sections.push({ kind: "item", item: item("sort.asc", SORT_ASC_LABEL) });
  sections.push({ kind: "item", item: item("sort.desc", SORT_DESC_LABEL) });
  return sections;
}

/**
 * Dispatch one menu command against `model` and `cell`.
 *
 * Every branch delegates to `structure.ts` — no mutation lives here — so a menu
 * item behaves exactly like the C.3 command it names, including its `noop` and
 * focus answers. `cell` must already be clamped by the caller.
 */
export function runMenuCommand(
  id: TableMenuCommandId,
  model: TableModel,
  cell: TableCellRef,
): StructureResult {
  switch (id) {
    case "row.add-above":
      return addRowAbove(model, cell);
    case "row.add-below":
      return addRowBelow(model, cell);
    case "row.move-up":
      return moveRowUp(model, cell);
    case "row.move-down":
      return moveRowDown(model, cell);
    case "row.duplicate":
      return duplicateRow(model, cell);
    case "row.delete":
      return deleteRow(model, cell);

    case "column.add-left":
      return addColumnLeft(model, cell);
    case "column.add-right":
      return addColumnRight(model, cell);
    case "column.move-left":
      return moveColumnLeft(model, cell);
    case "column.move-right":
      return moveColumnRight(model, cell);
    case "column.align-left":
      return alignColumn(model, cell.col, "left");
    case "column.align-center":
      return alignColumn(model, cell.col, "center");
    case "column.align-right":
      return alignColumn(model, cell.col, "right");
    case "column.duplicate":
      return duplicateColumn(model, cell);
    case "column.delete":
      return deleteColumn(model, cell);

    case "sort.asc":
      return sortColumn(model, cell, "asc");
    case "sort.desc":
      return sortColumn(model, cell, "desc");
    default: {
      // Exhaustiveness: adding a command id above without a dispatch branch is a
      // compile error rather than a silent activation that does nothing.
      const unreachable: never = id;
      return unreachable;
    }
  }
}
