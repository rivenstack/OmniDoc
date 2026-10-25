"use client";

/**
 * The table grid (F-15 Task 3.3 Rev 2, plan Task A.4).
 *
 * ## Why the DOM is React's and the text is CodeMirror's
 *
 * A rendered table needs three things a hand-built DOM cannot give it cheaply: a
 * **cell-range selection overlay** (C.4), **hover affordances** (D.1, D.2) and a
 * **context menu** (D.3) — all compositions of *state* rather than of strings. So
 * React owns the table's structure, and each cell hosts its own nested
 * `CellEditor` (Task A.2), which owns the one thing React must not touch: a live
 * editing surface.
 *
 * Two rules keep them from fighting:
 *
 * 1. **A cell's editor is created once per cell identity.** It lives in a
 *    `useEffect` with an empty dependency list, keyed `row:col`, so a keystroke
 *    can never recreate it — that is what keeps the caret alive.
 * 2. **The model flows to an editor only when the model object changed** — a
 *    command, a structural edit, a rebuild. The compare in the sync effect makes
 *    an ordinary re-render (focus, hover) a no-op, so a re-render can never
 *    overwrite what the user just typed.
 *
 * ## The commit pipeline
 *
 * Editing never touches the document. {@link TableGrid} folds every editor's text
 * into the model and asks the widget to write it — on **Escape**, on **focus
 * leaving the table**, and after {@link TABLE_IDLE_FLUSH_MS} of quiet. The write
 * itself (the `written` latch, the dispatch, the caret restore) belongs to the
 * widget, which owns the document range; `onCommit` is the request.
 *
 * The idle timer is re-armed on every keystroke, so it only fires once typing
 * stops.
 */

import * as React from "react";
import { useSyncExternalStore } from "react";
import {
  AddColumnAffordance,
  AddRowAffordance,
  ColumnGrip,
} from "./affordances";
import {
  CellEditor,
  TABLE_IDLE_FLUSH_MS,
  type CellEditorHandlers,
  type CellHistoryKind,
} from "./editor";
import {
  bodyRowCount,
  cellText,
  clearCells,
  columnCount,
  deleteColumn,
  deleteRow,
  moveColumn,
  setCellText,
  type TableCellRef,
  type TableModel,
} from "./model";
import {
  columnAtOffset,
  dragOffset,
  dragTo,
  dropIndicator,
  type ColumnDragState,
  type ColumnSpan,
} from "./drag";
import { cellKey, cellRef, type TableStore } from "./store";
import {
  cellRangeBounds,
  clampCellRef,
  extendRangeToEdge,
  rangeCells,
  rangeContains,
  rangeCoversAllColumns,
  rangeCoversAllRows,
  rangeCoversTable,
  rangePointerEdge,
  sameCellRef,
} from "./selection";
import { TableContextMenu } from "./menu";
import {
  addColumnRight,
  addRowBelow,
  navigateEnter,
  navigateHorizontal,
  navigateTab,
  navigateVertical,
  type NavigationResult,
  type StructureResult,
  type TableFocusTarget,
} from "./structure";

/** Ask the widget to write `model` back to the document. */
export type TableCommit = (
  model: TableModel,
  focus?: TableCellRef & { offset?: number },
) => void;

/**
 * The cell a DOM target sits in, through the grid's public `data-*` contract.
 *
 * Pointer events land on whatever is under the pointer — a `<th>`, its nested
 * editor's content, a mark inside it — so the ref is read from the nearest
 * cell host rather than from the event target itself. Returning `null` for a
 * target outside the table (the grid padding, the tail strip, the document) is
 * what lets the caller treat "outside" as an edge question rather than a cell.
 */
function cellFromTarget(target: EventTarget | null): TableCellRef | null {
  if (!(target instanceof Element)) return null;
  const host = target.closest<HTMLElement>("[data-cell]");
  if (!host) return null;
  const row = Number(host.dataset.row);
  const col = Number(host.dataset.col);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
  return { row, col };
}

/**
 * The table's column geometry, measured in the table's own coordinate space
 * (D.2, `@user` 2026-10-25).
 *
 * `spans` is in **inline** coordinates, ascending, indexed by column: each
 * header box's distance from the table's inline-start edge. Under RTL that edge
 * is the physical right one and the visual order is the reverse of the column
 * order, so the list is reversed on the way out — the caller then works in
 * column indices and `inset-inline-start` px with no further mapping. Measured
 * against the table (`base`) rather than the viewport, so a scroll of the
 * wrapper cancels out of every subtraction.
 *
 * `null` when there is no table or no header row to measure (a stale model, or
 * jsdom, where every box is zero — callers then get no answer rather than a
 * wrong one).
 */
type ColumnMetrics = {
  readonly base: DOMRect;
  readonly rtl: boolean;
  readonly spans: readonly ColumnSpan[];
};

function columnMetrics(table: HTMLElement | null): ColumnMetrics | null {
  if (!table) return null;
  const headers = Array.from(
    table.querySelectorAll<HTMLElement>('thead [data-row="0"]'),
  );
  if (headers.length === 0) return null;
  const base = table.getBoundingClientRect();
  const rtl = getComputedStyle(table).direction === "rtl";
  const spans = headers.map((header) => {
    const box = header.getBoundingClientRect();
    return rtl
      ? { start: base.right - box.right, end: base.right - box.left }
      : { start: box.left - base.left, end: box.right - base.left };
  });
  return { base, rtl, spans: rtl ? [...spans].reverse() : spans };
}

/**
 * The column whose box contains the pointer (D.2).
 *
 * A drag's pointer is not always over a cell: the grip sits in the block gutter
 * *above* the table, and moving it sideways keeps the pointer in that gutter.
 * Reading the header cells' measured boxes is what makes the drag follow the
 * pointer there. {@link columnMetrics} answers in inline coordinates already, so
 * the pointer only has to be converted once: from the inline-start edge, which
 * is the physical left under LTR and the physical right under RTL.
 */
function columnUnderPointer(
  table: HTMLElement | null,
  clientX: number,
): number | null {
  const metrics = columnMetrics(table);
  if (!metrics) return null;
  const offset = metrics.rtl
    ? metrics.base.right - clientX
    : clientX - metrics.base.left;
  return columnAtOffset(metrics.spans, offset);
}

/**
 * Run a structure command over the **collected** model (C.3).
 *
 * The grid folds every cell editor's text into the model first, so an
 * uncommitted keystroke is part of the command rather than lost by it. The
 * executor is registered with the widget so the menu (D.3) and the hover
 * affordances act on the live table, and so the C.3 suite can exercise the same
 * commit pipeline the menu will use.
 */
export type TableCommandRun = (
  resolve: (model: TableModel) => StructureResult,
) => void;

export type TableGridProps = {
  readonly store: TableStore;
  /** A locked note renders the table but wires no editing. */
  readonly editable: boolean;
  readonly onCommit: TableCommit;
  /** Escape: the caller commits and hands focus back to the outer editor. */
  readonly onEscape: () => void;
  /**
   * The caret stepped past the table's edge (plan §4.5, B/C). The widget owns
   * the block's document range, so it — not the grid — decides where the outer
   * caret goes and dispatches it.
   */
  readonly onLeaveTable: (edge: "before" | "after") => void;
  /**
   * Delete the whole table (MENU-002's "Delete table"). The widget owns the
   * block range and the preceding newline, so the removal is its write.
   */
  readonly onDeleteTable: () => void;
  /**
   * Register the command executor for the widget, and unregister on unmount.
   * Optional so a future non-widget host (a story, a test) can mount the grid
   * without one.
   */
  readonly onCommandHost?: (run: TableCommandRun | null) => void;
  /**
   * Forward a `Mod-z` / `Mod-Shift-z` / `Mod-y` from a cell to the **outer**
   * editor (plan §4.5, policy §11-4). A cell installs no history, so undo is
   * the document's; the widget owns the outer view and dispatches it there.
   */
  readonly onHistory: (kind: CellHistoryKind, focus: TableCellRef) => void;
};

export function TableGrid({
  store,
  editable,
  onCommit,
  onEscape,
  onLeaveTable,
  onDeleteTable,
  onCommandHost,
  onHistory,
}: TableGridProps) {
  const { model, active, range } = useSyncExternalStore(
    store.subscribe,
    store.get,
  );
  const editors = React.useRef(new Map<string, CellEditor>());
  const idleTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridRef = React.useRef<HTMLDivElement | null>(null);
  /**
   * The context menu's anchor (D.3).
   *
   * A right-click inside a cell records the cell here; the menu itself is the
   * project's Base UI `ContextMenu`, whose trigger is the `<table>` (so the
   * pointer position is the menu's, not ours). The anchor is what decides the
   * header guard, the checked alignment item and where a dismissed menu returns
   * focus. It is deliberately **not** the active cell: opening the menu must not
   * move the caret.
   */
  const [menuCell, setMenuCell] = React.useState<TableCellRef | null>(null);
  /** The anchor captured at the last open — activation reads this, not a prop. */
  const menuAnchorRef = React.useRef<TableCellRef | null>(null);
  /**
   * The caret offset of the anchor cell at open time, restored when the menu is
   * dismissed. `undefined` when the anchor was not the focused cell (a
   * right-click on another cell): the cell's end is the sensible target then.
   */
  const menuOffsetRef = React.useRef<number | undefined>(undefined);
  /**
   * The live range drag (S5).
   *
   * `started` is the whole distinction between "dragging inside the cell"
   * (native text selection, which must not be interrupted) and "dragging a
   * cell rectangle". It flips only once the pointer has named a different cell
   * or left the grid's edge, and never flips back — once the table has taken
   * the selection, returning to the anchor means a one-cell rectangle, not a
   * text selection again.
   */
  const rangeDrag = React.useRef<{
    pointerId: number;
    anchor: TableCellRef;
    started: boolean;
  } | null>(null);
  const rangeOverlay = React.useRef<HTMLDivElement | null>(null);
  /**
   * The table's own wrapper — the element that hugs the table (D.1).
   *
   * The grid is larger than the table now that the affordance strips sit along
   * its edges, so a drag's "past the edge" question has to be asked of the
   * table's box, not the grid's: a pointer over the row strip is below the
   * table and extends a cell selection even though it is still inside the grid.
   */
  const tableRef = React.useRef<HTMLDivElement | null>(null);
  /**
   * The live column drag (D.2).
   *
   * State for rendering (the lifted source column, the grip that follows the
   * pointer, the drop line) **and** a ref for the document listeners:
   * `pointermove` can outrun React's commit, and the drop must read the target
   * the pointer last named, not the last one React painted.
   */
  const [columnDrag, setColumnDrag] = React.useState<ColumnDragState | null>(
    null,
  );
  const columnDragRef = React.useRef<ColumnDragState | null>(null);
  /**
   * The drag's measured origin and column geometry (D.2, `@user` 2026-10-25).
   *
   * `x` is the pointer's `clientX` at the press: the grip's offset is
   * `clientX - x`, so the grip keeps the grab point under the pointer instead of
   * snapping its centre onto it. `spans` is measured **once**, at the press, in
   * inline coordinates indexed by column ({@link columnMetrics}), which is what
   * the drop line is positioned from without re-reading layout on every move.
   *
   * A ref, not state: it is written in the same handler that publishes the drag
   * state, before that state renders, so the render below always sees the spans
   * of the drag it is drawing. It is cleared with the drag.
   */
  const columnDragOriginRef = React.useRef<{
    readonly x: number;
    readonly spans: readonly ColumnSpan[];
  } | null>(null);

  const columns = columnCount(model);
  const bodyRows = bodyRowCount(model);
  const bounds = range ? cellRangeBounds(range) : null;
  /**
   * The drop line's geometry for the live drag (D.2).
   *
   * `dropIndicator` marks the edge the lifted column would cross — the target's
   * inline-end edge moving towards the end, its inline-start edge moving towards
   * the start — and returns `null` over the source column, so a drag that has
   * not left its own column draws nothing. The spans come from the origin ref
   * (measured at the press), which is why they are still valid when the pointer
   * is in the gutter above the table.
   */
  const dropMark =
    columnDrag && columnDragOriginRef.current
      ? dropIndicator(
          columnDragOriginRef.current.spans,
          columnDrag.from,
          columnDrag.to,
        )
      : null;

  const cancelIdleFlush = React.useCallback(() => {
    if (idleTimer.current !== null) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  }, []);

  // A widget that goes away must not write after it is gone.
  React.useEffect(() => cancelIdleFlush, [cancelIdleFlush]);

  /** Fold every editor's text into the model — the one place the two meet. */
  const collect = React.useCallback((): TableModel => {
    let next = store.get().model;
    for (const [key, editor] of editors.current) {
      const ref = cellRef(key);
      const text = editor.text();
      if (cellText(next, ref) === text) continue;
      next = setCellText(next, ref, text);
    }
    return next;
  }, [store]);

  /**
   * Publish the editors' text: update the store, then ask for the write.
   *
   * A write rebuilds the widget, so `focus` is where the caret belongs after the
   * rebuild.
   */
  const flush = React.useCallback(
    (focus?: TableCellRef & { offset?: number }) => {
      const next = collect();
      store.setModel(next);
      onCommit(next, focus);
    },
    [collect, onCommit, store],
  );

  /**
   * Arm the idle write: it fires once the user stops typing.
   *
   * The focus target is resolved **at fire time** from the live state, not from
   * the cell that happened to arm the timer. `@user` reported the caret jumping
   * back to the previous cell after a pause (`2026-10-23`): the timer used to
   * capture the typing cell, so the write's rebuild restored focus there even
   * though the user had already moved on. The store knows which cell holds
   * focus now, and its editor knows where the caret is now; when no cell is
   * active the focus stays where it is (the table was left, or the cell no
   * longer exists — a structural edit rebuilt the grid).
   */
  const scheduleIdleFlush = React.useCallback(() => {
    cancelIdleFlush();
    idleTimer.current = setTimeout(() => {
      idleTimer.current = null;
      const live = store.get().active;
      const editor = live ? editors.current.get(cellKey(live)) : undefined;
      if (!live || !editor) {
        flush();
        return;
      }
      const offset = editor.view.state.selection.main.head;
      flush({ ...live, offset });
    }, TABLE_IDLE_FLUSH_MS);
  }, [cancelIdleFlush, flush, store]);

  const register = React.useCallback(
    (ref: TableCellRef, editor: CellEditor | null) => {
      if (editor) editors.current.set(cellKey(ref), editor);
      else editors.current.delete(cellKey(ref));
    },
    [],
  );

  /** Escape: write what is there, then hand the caret to the outer editor. */
  const escape = React.useCallback(() => {
    cancelIdleFlush();
    // A range is a view selection; leaving the table drops it, like a click
    // elsewhere would. The commit below rebuilds the widget anyway, but the
    // store is cleared here so nothing can render it in between.
    store.setRange(null);
    const next = collect();
    store.setModel(next);
    onCommit(next);
    onEscape();
  }, [cancelIdleFlush, collect, onCommit, onEscape, store]);

  /**
   * Focus leaving the table is a commit point.
   *
   * A move *between* two cells keeps the caret inside the grid, so it only
   * records which cell is active — that is what stops the widget being rebuilt on
   * every Tab.
   */
  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    // Focus moving into the table menu's portal is not the user leaving the
    // table: committing here would rebuild the widget and destroy the open
    // menu (and lose the cell text to an extra write) — the D.3 hardening rule.
    if (next instanceof Element && next.closest("[data-table-menu]")) return;
    cancelIdleFlush();
    store.setActive(null);
    flush();
  };

  /** Put the caret in an existing cell; no document write is involved. */
  const focusEditor = React.useCallback((target: TableFocusTarget) => {
    editors.current.get(cellKey(target))?.focus(target.offset);
  }, []);

  /**
   * Execute one navigation result.
   *
   * A structural move (Tab off the last cell, Shift-Tab at `(0,0)`, Enter on the
   * last row) is written through the commit pipeline, and the write's rebuild
   * puts the caret in `focus`. The model is collected first so an uncommitted
   * cell edit is part of the operation rather than lost by it.
   */
  const navigate = React.useCallback(
    (resolve: (model: TableModel) => NavigationResult) => {
      const model = collect();
      const result = resolve(model);
      if (result.kind === "focus") {
        focusEditor(result.focus);
        return;
      }
      cancelIdleFlush();
      if (result.kind === "leave") {
        // A leave must not lose the last keystrokes: the collected model is
        // published first, and the widget's leave handler writes it (if it
        // differs from the document) before it moves the caret out.
        store.setModel(model);
        onLeaveTable(result.edge);
        return;
      }
      store.setModel(result.model);
      onCommit(result.model, result.focus);
    },
    [cancelIdleFlush, collect, focusEditor, onCommit, onLeaveTable, store],
  );

  /**
   * Execute one structure command (MENU-002, plan C.3).
   *
   * The model is collected first, always: a menu item activates after a
   * right-click, and the cell the click left may still hold uncommitted text.
   * `noop` is a real answer — nothing is written, nothing is rebuilt, and the
   * idle flush stays armed so the user's pending text is not lost.
   *
   * A `commit` goes through the same `onCommit` pipeline as Escape and the idle
   * flush. The widget decides *when* to dispatch (it defers while CodeMirror is
   * mid-update), so this function never touches the document itself.
   */
  const runCommand = React.useCallback<TableCommandRun>(
    (resolve) => {
      const model = collect();
      const result = resolve(model);
      if (result.kind === "noop") return;
      cancelIdleFlush();
      if (result.kind === "delete-table") {
        onDeleteTable();
        return;
      }
      store.setModel(result.model);
      onCommit(result.model, result.focus);
    },
    [cancelIdleFlush, collect, onCommit, onDeleteTable, store],
  );

  /**
   * Record the menu's anchor and the caret position to restore (D.3).
   *
   * Called from the **capture** phase of a real right-click and from the
   * keyboard opener, so both paths agree on the cell. It does not move the
   * caret: the click leaves the cell's caret where the user left it, and the
   * menu only reads the cell to answer "header?" and "which alignment?".
   */
  const rememberMenuAnchor = React.useCallback(
    (cell: TableCellRef) => {
      // The menu will run a command (or be dismissed and refocus the anchor), so
      // a pending idle flush must not fire while the menu is open: it would
      // rebuild the widget and destroy the menu under the pointer. The close
      // handler re-arms it for a dismissed menu.
      cancelIdleFlush();
      const anchor = clampCellRef(cell, store.get().model);
      const editor = editors.current.get(cellKey(anchor));
      menuOffsetRef.current = editor?.view.state.selection.main.head;
      menuAnchorRef.current = anchor;
      setMenuCell(anchor);
    },
    [cancelIdleFlush, store],
  );

  /**
   * The menu closed.
   *
   * A command already named its focus target and the write pipeline restores it
   * (or removed the table), so only a **dismissed** menu returns focus to the
   * anchor. The editor is checked for connection first: a structural command
   * can have rebuilt the grid and destroyed the old cell editors, and focusing
   * a detached editor would throw.
   */
  const handleMenuClose = React.useCallback(
    (commandRan: boolean) => {
      const anchor = menuAnchorRef.current;
      const offset = menuOffsetRef.current;
      menuAnchorRef.current = null;
      menuOffsetRef.current = undefined;
      if (commandRan || !anchor) return;
      // A dismissed menu leaves the table's pending text uncommitted; re-arm
      // the idle write so abandoning the note still reaches autosave.
      scheduleIdleFlush();
      const editor = editors.current.get(cellKey(anchor));
      if (!editor || !editor.view.dom.isConnected) return;
      editor.focus(offset);
    },
    [scheduleIdleFlush],
  );

  /**
   * Open the menu for `cell` from the keyboard (D-4).
   *
   * The menu component owns the trigger, so the keyboard path **forwards a
   * synthetic `contextmenu`** to the table element rather than duplicating the
   * open logic. The event is dispatched at the anchor cell's centre so Base UI
   * anchors the portal where a pointer would have.
   */
  const openMenuAt = React.useCallback(
    (cell: TableCellRef) => {
      const anchor = clampCellRef(cell, store.get().model);
      rememberMenuAnchor(anchor);

      const grid = gridRef.current;
      const table = grid?.querySelector<HTMLTableElement>(
        "table.cm-live-table",
      );
      if (!table) return;
      const host = grid?.querySelector<HTMLElement>(
        `[data-row="${anchor.row}"][data-col="${anchor.col}"]`,
      );
      const rect = host?.getBoundingClientRect();
      table.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: rect ? rect.left + rect.width / 2 : 0,
          clientY: rect ? rect.top + rect.height / 2 : 0,
        }),
      );
    },
    [rememberMenuAnchor, store],
  );

  /**
   * Capture the anchor of a real right-click.
   *
   * A target outside any cell (the tail strip, the grid gutter) is **not** this
   * menu's business — the general editor menu (Task 6.3) will own it — so the
   * event is left alone. Focus is likewise untouched: the right-click's own
   * `mousedown` is ignored by {@link beginRangeDrag} (button 2), and the
   * trigger opens the menu at the pointer.
   */
  const captureMenuAnchor = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!editable) return;
    const cell = cellFromTarget(event.target);
    if (!cell) return;
    rememberMenuAnchor(cell);
  };

  /**
   * The context-menu key / Shift+F10 (plan §4.6, D-4).
   *
   * The active cell wins; a focus that the store has not seen yet falls back to
   * the DOM's `activeElement`. `preventDefault` is asserted by the suite: the
   * key must not also reach the cell editor, whose browser default would be a
   * native context menu.
   */
  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!editable) return;
    if (
      event.key !== "ContextMenu" &&
      !(event.shiftKey && event.key === "F10")
    ) {
      return;
    }
    const cell = store.get().active ?? cellFromTarget(document.activeElement);
    if (!cell) return;
    event.preventDefault();
    event.stopPropagation();
    openMenuAt(cell);
  };

  /**
   * The hover `+` (plan §4.3 S3, Task D.1): append one column at the inline end
   * and focus its header.
   *
   * Routed through {@link runCommand}, not straight to the model, so the
   * command acts on the **collected** model (an uncommitted keystroke in a cell
   * is part of the same write) and the widget's own deferral/focus rules apply.
   * The column is addressed from the live model, so a column added earlier in
   * the same table is counted.
   */
  const addColumnAtEnd = React.useCallback(() => {
    runCommand((model) =>
      addColumnRight(model, { row: 0, col: columnCount(model) - 1 }),
    );
  }, [runCommand]);

  /**
   * The row strip's command (`@user`-directed, 2026-10-23): append one empty
   * body row below the last row and focus its **first** cell.
   *
   * `addRowBelow` takes a cell and inserts the new row one past it; the last
   * visual row is `bodyRowCount(model)`, so passing it with `col: 0` appends at
   * the bottom and lands the caret in the new row's first cell. A table with no
   * body rows passes the header (`row: 0`), which is the same "first body row"
   * answer. Same collected-model/one-write pipeline as the column strip.
   */
  const addRowAtEnd = React.useCallback(() => {
    runCommand((model) =>
      addRowBelow(model, { row: bodyRowCount(model), col: 0 }),
    );
  }, [runCommand]);

  /**
   * Publish a column drag to React (for the accent render) **and** to the ref
   * the document listeners read (D.2).
   *
   * The ref is the source of truth: `pointermove` can outrun a React commit, and
   * a drop must land where the pointer last was.
   */
  const publishColumnDrag = React.useCallback(
    (next: ColumnDragState | null) => {
      columnDragRef.current = next;
      setColumnDrag(next);
    },
    [],
  );

  /**
   * Pointer-down on the grip: lift the column (S2). Nothing is written yet.
   *
   * `preventDefault` keeps the press from moving focus out of the cell, so a
   * half-typed cell is not committed (and the widget rebuilt) before the drag
   * even starts — the same press discipline the D.1 strips use. A pending
   * cell-range selection is dropped, like a press elsewhere would.
   *
   * The pointer's own `clientX` and the measured header spans are recorded here
   * (D.2, `@user` 2026-10-25): the grip is translated by `clientX - x` on every
   * move, and the drop line is positioned from the spans, so neither path needs
   * a measurement per frame.
   */
  const beginColumnDrag = React.useCallback(
    (column: number, event: React.PointerEvent<HTMLButtonElement>) => {
      if (!editable || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      if (store.get().range) store.setRange(null);
      const metrics = columnMetrics(tableRef.current);
      columnDragOriginRef.current = {
        x: event.clientX,
        spans: metrics?.spans ?? [],
      };
      publishColumnDrag({
        // A `MouseEvent` in jsdom has no `pointerId`; the primary pointer's `0`
        // is the same fallback the cell-range drag uses.
        pointerId: (event.nativeEvent as PointerEvent).pointerId ?? 0,
        from: column,
        to: column,
        offset: 0,
      });
    },
    [editable, publishColumnDrag, store],
  );

  /**
   * C.5's clear: empty the selected cells and put the caret in the anchor.
   *
   * The **editors** are emptied as well as the model, and that is not
   * duplication: `collect()` folds their text back into the model on the very
   * next commit, so a clear that touched only the model would be undone by the
   * next keystroke's flush. Everything is published in one `onCommit`, so the
   * table is written once and the rebuild puts the caret in the anchor.
   *
   * A range that covers **every** cell is B-6's whole-table state: there the
   * clear means "delete the table" (block plus preceding newline), which the
   * widget owns.
   */
  const clearRange = React.useCallback((): boolean => {
    const live = store.get();
    const range = live.range;
    if (!range) return false;

    const bounds = cellRangeBounds(range);
    if (rangeCoversTable(bounds, live.model)) {
      cancelIdleFlush();
      // Drop the view selection first, so nothing repaints it while the
      // deferred removal runs.
      store.setRange(null);
      onDeleteTable();
      return true;
    }

    /** Publish a structural deletion and put the caret at `focus`. */
    const commitDelete = (next: TableModel, focus: TableCellRef): true => {
      cancelIdleFlush();
      store.setModel(next);
      onCommit(next, { ...focus, offset: 0 });
      return true;
    };

    // A band that spans the whole table is a row or column selection, not a
    // block of cells: `@user` (2026-10-23) expects Backspace/Delete there to
    // **remove the rows or columns**, not to empty their contents. The header
    // row cannot be deleted (it is the table's shape), so a band that includes
    // it deletes the body rows inside the band and clears the header cells.
    const collected = collect();
    if (rangeCoversAllColumns(bounds, collected)) {
      const columns = columnCount(collected);
      let next = collected;
      const firstBody = Math.max(bounds.rowFrom, 1);
      const lastBody = Math.min(bounds.rowTo, bodyRowCount(collected));
      for (let row = lastBody; row >= firstBody; row -= 1) {
        next = deleteRow(next, row - 1);
      }
      if (bounds.rowFrom === 0) {
        const headerCells = Array.from({ length: columns }, (_, col) => ({
          row: 0,
          col,
        })).filter((cell) => rangeContains(bounds, cell));
        next = clearCells(next, headerCells);
      }
      // Focus the first row of the band (clamped to what is left), same column.
      return commitDelete(next, {
        row: Math.min(bounds.rowFrom || 1, bodyRowCount(next)),
        col: range.anchor.col,
      });
    }

    if (rangeCoversAllRows(bounds, collected)) {
      let next = collected;
      const count = bounds.colTo - bounds.colFrom + 1;
      // The last column cannot be deleted (GFM needs one); a band covering
      // everything is the whole-table state handled above.
      if (columnCount(next) - count >= 1) {
        for (let col = bounds.colTo; col >= bounds.colFrom; col -= 1) {
          next = deleteColumn(next, col);
        }
        return commitDelete(next, {
          row: 0,
          col: Math.min(bounds.colFrom, columnCount(next) - 1),
        });
      }
    }

    const cells = rangeCells(bounds);
    const cleared = clearCells(collected, cells);
    for (const cell of cells) {
      editors.current.get(cellKey(cell))?.setText("");
    }
    // `setText` fires each cell's `onInput`, which re-arms the idle flush; the
    // commit below replaces it, so cancel the last arming.
    cancelIdleFlush();
    store.setModel(cleared);
    onCommit(cleared, { ...range.anchor, offset: 0 });
    return true;
  }, [cancelIdleFlush, collect, onCommit, onDeleteTable, store]);

  /**
   * Type over a range: clear the rectangle and put the character in the anchor
   * (chosen policy §11-3).
   *
   * Same shape as {@link clearRange} — the editors are brought in step with the
   * model, then **one** write carries both the clear and the character. The
   * range is not merely painted over: a commit rebuilds the widget, which drops
   * it.
   */
  const typeOverRange = React.useCallback(
    (text: string): boolean => {
      const live = store.get();
      const range = live.range;
      if (!range) return false;

      const bounds = cellRangeBounds(range);
      const cells = rangeCells(bounds);
      const anchor = range.anchor;
      let model = clearCells(collect(), cells);
      model = setCellText(model, anchor, text);

      for (const cell of cells) {
        editors.current
          .get(cellKey(cell))
          ?.setText(sameCellRef(cell, anchor) ? text : "");
      }
      cancelIdleFlush();
      store.setModel(model);
      onCommit(model, { ...anchor, offset: text.length });
      return true;
    },
    [cancelIdleFlush, collect, onCommit, store],
  );

  /**
   * C.5's key entry point while a cell range exists.
   *
   * **Capture phase**: the nested cell editor is a descendant of this div, so a
   * bubble handler would run after the cell's own keymap. A range selection
   * outranks the cell's text editing — Backspace/Delete clear it and a
   * printable character replaces it — while every other key is left alone so
   * the cell keeps its native behaviour. Escape stays on the cell keymap, where
   * C.4 wired "clear the rectangle and stay in the table".
   */
  const handleRangeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!editable) return;
    if (!store.get().range) return;

    if (event.key === "Backspace" || event.key === "Delete") {
      if (!clearRange()) return;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // One printable character, with no command modifier and no IME composition.
    // Anything longer is a named key (`ArrowLeft`, `Enter`, …) and belongs to
    // the cell.
    const native = event.nativeEvent as KeyboardEvent;
    if (
      event.key.length !== 1 ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      native.isComposing
    ) {
      return;
    }
    if (!typeOverRange(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
  };

  /**
   * The grid's one key capture: the menu keys first, then a live cell range.
   *
   * Both have to run **before** the nested cell editor's own keymap (the cell is
   * a descendant of this div), and the menu key is consumed outright: a
   * `contextmenu` key would otherwise be offered to the browser's native menu.
   * A range key handler that declined a key (`defaultPrevented` false) leaves
   * it for the cell, exactly as before.
   */
  const handleKeyDownCapture = (event: React.KeyboardEvent<HTMLDivElement>) => {
    handleMenuKeyDown(event);
    if (event.defaultPrevented) return;
    handleRangeKeyDown(event);
  };

  /**
   * Is the whole table selected (B-6)?
   *
   * The wrapper belongs to the widget, not to React, so the marker is written
   * as an attribute rather than rendered as a prop — and it is what the outer
   * keymap reads to tell the first Backspace (select) from the second (delete).
   */
  const coversTable = bounds !== null && rangeCoversTable(bounds, model);
  React.useEffect(() => {
    const wrapper = gridRef.current?.closest<HTMLElement>(
      ".cm-live-table-wrapper",
    );
    if (!wrapper) return;
    if (coversTable) wrapper.dataset.tableSelected = "true";
    else delete wrapper.dataset.tableSelected;
  }, [coversTable]);

  // Hand the executor to the widget; a rebuilt grid registers again, and an
  // unmounted one clears it so a late menu activation cannot act on dead cells.
  React.useEffect(() => {
    onCommandHost?.(runCommand);
    return () => onCommandHost?.(null);
  }, [onCommandHost, runCommand]);

  const handlersFor = React.useCallback(
    (ref: TableCellRef): CellEditorHandlers => ({
      onInput: () => {
        store.setActive(ref);
        scheduleIdleFlush();
      },
      onEscape: () => {
        // S5's first Escape clears the rectangle and **stays** in the table; a
        // second Escape is the existing "commit and leave" path. Leaving on the
        // first press would make a mis-drag end the editing session.
        if (store.get().range) {
          store.setRange(null);
          return;
        }
        escape();
      },
      onTab: (backwards) =>
        navigate((model) => navigateTab(model, ref, backwards)),
      onEnter: () => navigate((model) => navigateEnter(model, ref)),
      onLeave: (direction) =>
        navigate((model) =>
          direction === "left" || direction === "right"
            ? navigateHorizontal(model, ref, direction)
            : navigateVertical(model, ref, direction),
        ),
      // Cells install no history (HIST-002: one stack, the document's). The
      // grid publishes the pending cell text first, then the widget commits it
      // and forwards `undo`/`redo` to the outer editor — so the undo reverts the
      // cell write, not whatever came before it.
      onHistory: (kind) => {
        cancelIdleFlush();
        store.setModel(collect());
        // The ref travels with the request: the outer view's own caret is stale
        // while a cell has focus, so an unqualified undo would drop the caret at
        // the top of the document (`@user`, 2026-10-23).
        onHistory(kind, ref);
      },
    }),
    [
      cancelIdleFlush,
      collect,
      escape,
      navigate,
      onHistory,
      scheduleIdleFlush,
      store,
    ],
  );

  /**
   * `mousedown` inside a cell: remember the anchor, then **get out of the way**.
   *
   * The native path must keep running — a click has to place the caret and a
   * drag inside one cell has to select its text (B-7). So this handler neither
   * prevents the default nor captures the pointer; it only records the cell and
   * the button. Capturing here is exactly the bug the plan warns about: the
   * next click would be delivered to the invisible capture target instead of
   * the cell the user aimed at.
   *
   * A new press also drops any previous rectangle — clicking a cell is how a
   * selection is normally dismissed.
   */
  const beginRangeDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!editable || event.button !== 0) return;
    // The grip owns its own press (D.2).
    if ((event.target as Element | null)?.closest(".cm-live-table-column-grip"))
      return;
    const anchor = cellFromTarget(event.target);
    if (!anchor) return;
    if (store.get().range) store.setRange(null);
    rangeDrag.current = {
      // React's synthetic event keeps the native one; a `MouseEvent` in jsdom
      // has no `pointerId`, so the fallback is the primary button's `0`.
      pointerId: (event.nativeEvent as PointerEvent).pointerId ?? 0,
      anchor: clampCellRef(anchor, store.get().model),
      started: false,
    };
  };

  /**
   * The drag state machine, driven from the **document**.
   *
   * Pointer moves leave the grid constantly — past its right edge, over the
   * note below it, out of the window — and the events stop targeting the grid
   * the moment they do. Listening on the document while a drag is live is what
   * lets the rectangle follow the pointer and lets an edge sweep clamp to the
   * last/first row or column (`extendRangeToEdge`). `mouseup` on the document
   * ends the drag even when the button was released outside the table; the
   * range itself stays (S5), and only a later press or Escape clears it.
   *
   * The listener is installed once per editable grid, not per drag: attaching
   * it from `mousedown` would race the very `mousemove` that starts the
   * selection, and the ref makes the "is a drag live?" test cheap.
   */
  React.useEffect(() => {
    if (!editable) return;

    const onMove = (event: MouseEvent) => {
      const drag = rangeDrag.current;
      if (!drag) return;
      // The release can be swallowed by the widget's event isolation (it stops
      // `mouseup` from reaching the document), so the button state is the
      // authority: a hover with no button down is never a range drag. Without
      // this, a plain click left the drag armed and the next idle mouse move
      // painted a selection (`@user`, 2026-10-23).
      if ((event.buttons & 1) === 0) {
        rangeDrag.current = null;
        return;
      }
      const live = store.get();
      const hovered = cellFromTarget(event.target);
      const rect = tableRef.current?.getBoundingClientRect();
      const edge = rect ? rangePointerEdge(event, rect) : null;

      // Still inside the anchor cell and over no edge: leave the native text
      // selection alone. This is B-7's first half, and the reason a plain click
      // (or a small drag) never produces a table rectangle.
      if (
        !drag.started &&
        (!hovered || sameCellRef(hovered, drag.anchor)) &&
        !edge
      ) {
        return;
      }

      let focus: TableCellRef | null = null;
      if (hovered && !sameCellRef(hovered, drag.anchor)) {
        // The pointer named a real cell: that cell is the corner, regardless
        // of whether the pointer is also (numerically) past an edge.
        focus = clampCellRef(hovered, live.model);
      } else if (edge) {
        // Outside the grid: keep the axis the pointer already reached and push
        // the other one to the edge, so a diagonal sweep ends in the corner.
        focus = extendRangeToEdge(
          { anchor: drag.anchor, focus: live.range?.focus ?? drag.anchor },
          edge,
          live.model,
        ).focus;
      } else if (live.range) {
        focus = live.range.focus;
      }

      if (!focus) return;
      drag.started = true;
      store.setRange({
        anchor: drag.anchor,
        focus: clampCellRef(focus, live.model),
      });
    };

    const onUp = () => {
      // Ends the drag, not the selection: S5's block stays tinted until Escape
      // or a new press. Clearing `rangeDrag` is enough — the next move is idle.
      rangeDrag.current = null;
    };

    // Capture phase: the widget stops `mouseup`/`mousemove` from bubbling to
    // the document (event isolation), and a release inside the table must still
    // end the drag.
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("mouseup", onUp, true);
    return () => {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("mouseup", onUp, true);
      rangeDrag.current = null;
    };
  }, [editable, store]);

  /**
   * The column drag's state machine, driven from the **document** (D.2).
   *
   * Pointer moves leave the grip immediately — it is 24px wide in a gutter — so
   * a listener on the grip itself would only ever see the press. Like the
   * cell-range drag, this listens in the capture phase on the document, which
   * also survives the widget's own event isolation.
   *
   * A move carries **two** answers, and one publish (D.2, `@user` 2026-10-25:
   * the grip "should really move with my pointer"):
   *
   * - `to`, through {@link dragTo} — which final column the drop would use; and
   * - `offset`, through {@link dragOffset} — how far the grip has travelled, so
   *   the **grip** follows the pointer 1:1 while the columns stay put (the
   *   Obsidian `createDragHandle` model, and the reason the source column is the
   *   one painted as lifted).
   *
   * Both helpers return the same state object when nothing changed, so one
   * identity check is the "either changed" test.
   *
   * Drop is `moveColumn` through {@link runCommand}: the command runs on the
   * **collected** model (uncommitted cell text travels with the reorder), the
   * widget owns when the write is dispatched, and the rebuilt table focuses the
   * moved column's header. Escape and `pointercancel` clear the drag without a
   * command, so the document is untouched. Dropping on the source column is a
   * no-op by construction, not a commit of an unchanged model.
   */
  React.useEffect(() => {
    if (!editable) return;

    const finish = (commit: boolean) => {
      const drag = columnDragRef.current;
      if (!drag) return;
      // One clear drops the lift, the grip's transform and the drop line: all
      // three render from this state, so nothing can outlive the drag.
      columnDragOriginRef.current = null;
      publishColumnDrag(null);
      if (!commit || drag.from === drag.to) return;
      const from = drag.from;
      const to = drag.to;
      runCommand((model) => {
        const next = moveColumn(model, from, to);
        if (next === model) return { kind: "noop" };
        return {
          kind: "commit",
          model: next,
          focus: { row: 0, col: to, offset: 0 },
        };
      });
    };

    const onPointerMove = (event: PointerEvent) => {
      const drag = columnDragRef.current;
      if (!drag) return;
      // A cell under the pointer names its column directly. The gutter above
      // the table has no cell under it, so the header boxes answer instead.
      const cell = cellFromTarget(event.target);
      const over =
        cell?.col ?? columnUnderPointer(tableRef.current, event.clientX);
      if (over === null) return;
      const origin = columnDragOriginRef.current;
      const next = dragOffset(
        dragTo(drag, over, columnCount(store.get().model)),
        event.clientX - (origin?.x ?? event.clientX),
      );
      if (next !== drag) publishColumnDrag(next);
    };

    const onPointerUp = () => finish(true);
    const onPointerCancel = () => finish(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !columnDragRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      finish(false);
    };

    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("pointercancel", onPointerCancel, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("pointercancel", onPointerCancel, true);
      document.removeEventListener("keydown", onKeyDown, true);
      columnDragRef.current = null;
      columnDragOriginRef.current = null;
    };
  }, [editable, publishColumnDrag, runCommand, store]);

  /**
   * Measure the rectangle for the S5 overlay.
   *
   * The browser has already laid the cells out, so the overlay is positioned
   * from the **selected cells' own boxes** relative to the grid (its
   * positioning context) rather than from a row/column arithmetic that would
   * have to guess at borders. Logical properties are set directly: they are
   * what an RTL resolution would need, and there is no physical
   * `left`/`top` reset to fight. In jsdom every box is zero, which yields a
   * zero-sized overlay — harmless, and the `data-range-*` attributes carry the
   * contract the tests assert.
   */
  React.useLayoutEffect(() => {
    const overlay = rangeOverlay.current;
    const grid = gridRef.current;
    if (!overlay || !grid) return;

    const selected = grid.querySelectorAll<HTMLElement>('[data-range="true"]');
    if (selected.length === 0) return;

    const base = grid.getBoundingClientRect();
    let left = Number.POSITIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;
    selected.forEach((cell) => {
      const box = cell.getBoundingClientRect();
      left = Math.min(left, box.left);
      top = Math.min(top, box.top);
      right = Math.max(right, box.right);
      bottom = Math.max(bottom, box.bottom);
    });
    if (!Number.isFinite(left) || !Number.isFinite(top)) return;

    overlay.style.setProperty("inset-inline-start", `${left - base.left}px`);
    overlay.style.setProperty("inset-block-start", `${top - base.top}px`);
    overlay.style.setProperty("inline-size", `${right - left}px`);
    overlay.style.setProperty("block-size", `${bottom - top}px`);
  }, [range, model]);

  const headerCells: React.ReactNode[] = [];
  for (let col = 0; col < columns; col += 1) {
    headerCells.push(
      <TableCell
        key={cellKey({ row: 0, col })}
        model={model}
        cell={{ row: 0, col }}
        tag="th"
        editable={editable}
        active={active}
        inRange={bounds !== null && rangeContains(bounds, { row: 0, col })}
        dragging={columnDrag !== null && columnDrag.from === col}
        handlers={handlersFor}
        register={register}
        onFocus={store.setActive}
        // D.2: the grip is a child of **its own** header cell, so the cell's
        // box (position: relative, `theme.ts`) anchors it with CSS — no offset
        // is measured, and it cannot desync while a column resizes. During a
        // drag the **source** grip is the revealed one (`@user` 2026-10-25: it
        // follows the pointer) and it alone carries the travel offset.
        grip={
          editable ? (
            <ColumnGrip
              column={col}
              visible={columnDrag ? columnDrag.from === col : undefined}
              offset={columnDrag?.from === col ? columnDrag.offset : undefined}
              onPointerDown={(event) => beginColumnDrag(col, event)}
            />
          ) : undefined
        }
      />,
    );
  }

  const bodyRowNodes: React.ReactNode[] = [];
  for (let index = 0; index < bodyRows; index += 1) {
    const cells: React.ReactNode[] = [];
    for (let col = 0; col < columns; col += 1) {
      cells.push(
        <TableCell
          key={cellKey({ row: index + 1, col })}
          model={model}
          cell={{ row: index + 1, col }}
          tag="td"
          editable={editable}
          active={active}
          inRange={
            bounds !== null && rangeContains(bounds, { row: index + 1, col })
          }
          dragging={columnDrag !== null && columnDrag.from === col}
          handlers={handlersFor}
          register={register}
          onFocus={store.setActive}
        />,
      );
    }
    bodyRowNodes.push(<tr key={index}>{cells}</tr>);
  }

  /*
    `onKeyDownCapture` is load-bearing: the range's Backspace/Delete/typing
    must be answered **before** the nested cell editor's own keymap sees the
    key, and the cell editor is a descendant of this div.
  */
  return (
    <div
      ref={gridRef}
      className={editable ? "cm-live-table-grid pt-5" : "cm-live-table-grid"}
      onBlur={handleBlur}
      onMouseDown={beginRangeDrag}
      onContextMenuCapture={captureMenuAnchor}
      onKeyDownCapture={handleKeyDownCapture}
    >
      {/*
        The affordance frame (D.1, `@user` 2026-10-23).

        It exists to reserve the column strip's gutter: the strip is a
        full-height ghost sliver *outside* the table's inline-end edge, and the
        wrapper is `overflow-x: auto`, so without a gutter a table as wide as
        the note would clip it. `pe-6` is that gutter and the strip is `w-6`, so
        the strip always has exactly its own width of room and never overlaps a
        cell. The gutter is only reserved while the affordances exist — a locked
        note keeps the table's full width.

        Its child is the table's own box (`tableRef`): that is what the column
        strip measures its height against, and what a cell-range drag asks
        "past the edge?" of.
      */}
      <div className={editable ? "pe-6" : undefined}>
        <div ref={tableRef} className="relative">
          {/*
            The table is the context-menu trigger (plan D.3, MENU-002). The menu
            lives in `menu.tsx`; the grid only supplies the anchor and the
            executor. It is mounted even before any right-click so Base UI owns
            the trigger, and it renders a plain table in a locked note.
          */}
          <TableContextMenu
            model={model}
            cell={menuCell}
            editable={editable}
            run={runCommand}
            onClose={handleMenuClose}
          >
            <thead>
              <tr>{headerCells}</tr>
            </thead>
            <tbody>{bodyRowNodes}</tbody>
          </TableContextMenu>
          {/*
            The drop line (D.2, `@user` 2026-10-25: "it should really move with
            my pointer"). Obsidian's `createDragHandle` moves only the handle and
            marks where the column would land; the columns themselves never
            translate. The line is positioned from the spans measured at the
            press, in inline coordinates, so it sits on the edge the column would
            cross and slides between target columns (`theme.ts` transitions
            `inset-inline-start` only). Absent while the source is its own
            target: there is nothing to mark.
          */}
          {dropMark && columnDrag ? (
            <div
              className="cm-live-table-drop-indicator"
              data-table-drop-indicator="true"
              data-drop-column={columnDrag.to}
              data-drop-edge={dropMark.edge}
              aria-hidden="true"
              style={{ insetInlineStart: `${dropMark.inlineStart}px` }}
            />
          ) : null}
          {/*
            The column `+` sits in the gutter, beside the table's full height,
            and the row `+` sits directly below the table. Neither is a
            circular button and neither is revealed by the table's own hover:
            each strip reveals **itself** (D.1). Both are absent in a locked
            note (§4.3), so the frame has no gutter there either.
          */}
          {editable ? (
            <AddColumnAffordance onAddColumn={addColumnAtEnd} />
          ) : null}
        </div>
        {editable ? <AddRowAffordance onAddRow={addRowAtEnd} /> : null}
        {/*
          A clickable strip under the table (plan C.2, `@user` 2026-10-23: "I can
          not click after the table").

          A block widget is as tall as its table, so when the table is the
          document's last block there is no document position below it to click:
          the user is stuck in the cells. The strip gives that click a target, and
          `mousedown` + `preventDefault` keeps focus from moving anywhere before
          the widget adds the line (the same press the `+` strips use, D.1).
          It stays **below the row strip**, so the row `+` never steals this
          click. The widget owns the block range, so the caret is placed there.
        */}
        <div
          className="cm-live-table-tail"
          aria-hidden="true"
          onMouseDown={(event) => {
            event.preventDefault();
            onLeaveTable("after");
          }}
        />
      </div>
      {/*
        The S5 tint, drawn as **one** element over the rectangle rather than a
        border per cell: a per-cell outline would draw internal lines through
        the block, and the captured look is a single rounded wash. It is
        measured in a layout effect from the selected cells' boxes, so the
        browser's own table layout decides the geometry (no widths are
        computed here). jsdom has no layout, so the boxes are zero: the
        `data-range-rows`/`data-range-cols` attributes are the contract a test
        can assert, and they are present either way.

        `pointer-events: none` keeps the overlay from swallowing the drag that
        created it; `aria-hidden` because the cells already carry the meaning
        and a range selection has no text to announce.
      */}
      {bounds ? (
        <div
          ref={rangeOverlay}
          className="cm-live-table-range"
          data-range-rows={`${bounds.rowFrom}-${bounds.rowTo}`}
          data-range-cols={`${bounds.colFrom}-${bounds.colTo}`}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

type TableCellProps = {
  readonly model: TableModel;
  readonly cell: TableCellRef;
  readonly tag: "th" | "td";
  readonly editable: boolean;
  readonly active: TableCellRef | null;
  /** Inside the current cell-range rectangle (S5). */
  readonly inRange: boolean;
  /** This column is the **lifted source** of a live drag (D.2, S2): accent fill. */
  readonly dragging: boolean;
  readonly handlers: (ref: TableCellRef) => CellEditorHandlers;
  readonly register: (ref: TableCellRef, editor: CellEditor | null) => void;
  readonly onFocus: (ref: TableCellRef) => void;
  /**
   * An affordance rendered **inside** the cell host (D.2's column grip in a
   * header). React renders it; the nested editor is appended beside it, so this
   * must stay a leaf node the editor can coexist with.
   */
  readonly grip?: React.ReactNode;
};

/**
 * One cell: a `<th>`/`<td>` whose child is a nested editor's DOM (and, for a
 * header, its D.2 grip).
 *
 * React owns the element and any declarative child (the grip); the `CellEditor`
 * appends the CodeMirror tree into that same node and React reconciles nothing
 * about it, which is why the element carries no other React children.
 */
function TableCell({
  model,
  cell,
  tag,
  editable,
  active,
  inRange,
  dragging,
  handlers,
  register,
  onFocus,
  grip,
}: TableCellProps) {
  const hostRef = React.useRef<HTMLTableCellElement | null>(null);
  const editorRef = React.useRef<CellEditor | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const editor = new CellEditor(
      host,
      cellText(model, cell),
      handlers(cell),
      editable,
    );
    editorRef.current = editor;
    register(cell, editor);
    return () => {
      register(cell, null);
      editorRef.current = null;
      editor.destroy();
    };
    // Mount once per cell identity: a keystroke must never recreate an editor.
    // `model`, `handlers` and `editable` are read at mount; the effect below keeps
    // the *content* in step, and an `editable` change rebuilds the whole widget
    // (`TablePreviewWidget.eq`).
  }, []);

  // Model → editor, and only when the **model** changed.
  //
  // The dependency list is deliberately made of primitives: `cell` is a fresh
  // object on every render, so depending on it re-runs this effect after *any*
  // re-render — and the model lags the editor until a commit, so the effect would
  // then fold the committed value back over what the user is typing. Moving the
  // caret to another cell is enough to trigger it (`@user` lost a cell's text to
  // exactly that on 2026-10-16).
  const { row, col } = cell;
  React.useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const text = cellText(model, { row, col });
    if (editor.text() !== text) editor.setText(text);
  }, [model, row, col]);

  const focused =
    active !== null && active.row === cell.row && active.col === cell.col;
  const alignment = model.alignments[cell.col] ?? "left";
  const Tag = tag;

  return (
    <Tag
      ref={hostRef}
      className={tag === "th" ? "cm-live-th" : "cm-live-td"}
      data-row={cell.row}
      data-col={cell.col}
      data-cell={cellKey(cell)}
      data-active={focused ? "true" : undefined}
      data-range={inRange ? "true" : undefined}
      // D.2's lifted state (S2): the **source** column, header and body, while
      // its grip follows the pointer. Hovering a cell paints nothing — `@user`
      // rejected a column hover edge on 2026-10-24.
      data-column-drag={dragging ? "true" : undefined}
      // The delimiter row's alignment is a column property; `left` is the
      // default, and the old markup left the style off for it.
      style={alignment === "left" ? undefined : { textAlign: alignment }}
      onFocus={() => onFocus(cell)}
    >
      {grip}
    </Tag>
  );
}
