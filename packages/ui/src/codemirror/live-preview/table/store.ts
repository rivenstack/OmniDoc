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
 * The state is the **model** and the **active cell** — what A.4 needs. The later
 * tasks in this plan extend the same object rather than adding a second source of
 * truth: `selection.ts` adds the cell-range/table selection (C.4), `affordances.tsx`
 * adds the hovered column (D.1), and `drag.ts` adds the drag state (D.2).
 *
 * ## Identity rules
 *
 * `get()` hands back the *same* object until something actually changes, which is
 * what makes it a legal `useSyncExternalStore` snapshot (React compares snapshots
 * by identity and would loop on a fresh object every read). `setModel` and
 * `setActive` are the only mutators, and both no-op when the value is unchanged —
 * so re-rendering from a keystroke's `setActive` cannot churn the cell editors.
 */

import type { TableCellRef, TableModel } from "./model";

/** Everything the grid's DOM is a function of. */
export type TableWidgetState = {
  /** The table's cells, in encoded source form. */
  readonly model: TableModel;
  /** The cell whose editor holds focus, or `null` when none does. */
  readonly active: TableCellRef | null;
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
    this.state = { model, active: null };
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

  /** Replace the model (a command, or a flush that folded editor text in). */
  setModel = (model: TableModel): void => {
    if (model === this.state.model) return;
    this.state = { ...this.state, model };
    this.notify();
  };

  /** Record which cell holds focus. */
  setActive = (active: TableCellRef | null): void => {
    if (sameCell(active, this.state.active)) return;
    this.state = { ...this.state, active };
    this.notify();
  };

  private notify(): void {
    // Copied: a listener may unsubscribe while it runs.
    for (const listener of [...this.listeners]) listener(this.state);
  }
}
