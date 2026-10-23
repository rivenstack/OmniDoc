/**
 * The grid widget's observable state (F-15 Task 3.3 Rev 2, plan Task A.4).
 *
 * A rendered table is a React island inside a CodeMirror widget, and three
 * separate things need to read and write the same table: the grid that draws the
 * cells, the affordances around it, and the widget that writes the result back
 * to the document. They cannot share React state (the widget is outside the
 * tree), so the state lives here and React subscribes through
 * `useSyncExternalStore`.
 *
 * ## Deliberately small
 *
 * The state is the **model**, the **active cell** and the **cell range** — what
 * A.4 and C.4 need. The later tasks in this plan extend the same object rather
 * than adding a second source of truth: `affordances.tsx` adds the hovered
 * column (D.1), and `drag.ts` adds the drag state (D.2).
 *
 * ## Identity rules
 *
 * `get()` hands back the *same* object until something actually changes, which is
 * what makes it a legal `useSyncExternalStore` snapshot (React compares snapshots
 * by identity and would loop on a fresh object every read). `setModel`,
 * `setActive` and `setRange` are the only mutators, and all three no-op when the
 * value is unchanged — so re-rendering from a keystroke's `setActive` cannot
 * churn the cell editors, and a pointer move within one cell cannot re-render on
 * every move.
 */

import type { TableCellRef, TableModel } from "./model";
import { sameCellRange, type TableCellRange } from "./selection";

/** Everything the grid's DOM is a function of. */
export type TableWidgetState = {
  /** The table's cells, in encoded source form. */
  readonly model: TableModel;
  /** The cell whose editor holds focus, or `null` when none does. */
  readonly active: TableCellRef | null;
  /**
   * The drag-selected rectangle (S5), or `null` when nothing is selected.
   *
   * A range is a **view** selection, not a document one: it never changes the
   * model and task C.5 owns what a clear/delete does with it. `active` is kept
   * alongside it because S5 leaves the anchor's caret visible.
   */
  readonly range: TableCellRange | null;
};

export type TableStoreListener = (state: TableWidgetState) => void;

/** The stable key of one cell, for maps and React element keys. */
export function cellKey(ref: TableCellRef): string {
  return `${ref.row}:${ref.col}`;
}

/** The cell a key came from — the inverse of {@link cellKey}. */
export function cellRef(key: string): TableCellRef {
  const [row, col] = key.split(":");
  return { row: Number(row), col: Number(col) };
}

function sameCell(
  left: TableCellRef | null,
  right: TableCellRef | null,
): boolean {
  if (left === null || right === null) return left === right;
  return left.row === right.row && left.col === right.col;
}

/** The widget's state, with a subscribe/notify surface React can read. */
export class TableStore {
  private state: TableWidgetState;
  private readonly listeners = new Set<TableStoreListener>();

  constructor(model: TableModel) {
    this.state = { model, active: null, range: null };
  }

  /** The current state. Referentially stable until a mutator changes it. */
  get = (): TableWidgetState => this.state;

  /** Subscribe (for `useSyncExternalStore`). Returns the unsubscribe. */
  subscribe = (listener: TableStoreListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Replace the model (a command, or a flush that folded editor text in).
   *
   * The range is **always** dropped with the old model. A model change here
   * means a structural commit or a flush, and either one rebuilds the widget
   * from the markdown — keeping a rectangle that addressed the previous grid
   * would point at cells the user is no longer looking at (and might not exist,
   * after a column deletion). The honest state after a commit is "nothing is
   * range-selected"; a drag in the new grid starts its own range.
   */
  setModel = (model: TableModel): void => {
    if (model === this.state.model) return;
    this.state = { ...this.state, model, range: null };
    this.notify();
  };

  /** Record which cell holds focus. */
  setActive = (active: TableCellRef | null): void => {
    if (sameCell(active, this.state.active)) return;
    this.state = { ...this.state, active };
    this.notify();
  };

  /**
   * Record the drag-selected rectangle (S5), or clear it with `null`.
   *
   * The compare is by **value**, not identity: a pointer move builds a fresh
   * `{ anchor, focus }` on every event, and re-rendering the grid (and every
   * cell) for a move that did not cross a cell boundary would make the drag
   * stutter. Coordinates are all a range is, so equal coordinates are the
   * same range.
   */
  setRange = (range: TableCellRange | null): void => {
    if (sameCellRange(range, this.state.range)) return;
    this.state = { ...this.state, range };
    this.notify();
  };

  private notify(): void {
    // Copied: a listener may unsubscribe while it runs.
    for (const listener of [...this.listeners]) listener(this.state);
  }
}
