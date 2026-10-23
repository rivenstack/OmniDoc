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
  CellEditor,
  TABLE_IDLE_FLUSH_MS,
  type CellEditorHandlers,
} from "./editor";
import {
  bodyRowCount,
  cellText,
  columnCount,
  setCellText,
  type TableCellRef,
  type TableModel,
} from "./model";
import { cellKey, cellRef, type TableStore } from "./store";
import {
  cellRangeBounds,
  clampCellRef,
  extendRangeToEdge,
  rangeContains,
  rangePointerEdge,
  sameCellRef,
} from "./selection";
import {
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
};

export function TableGrid({
  store,
  editable,
  onCommit,
  onEscape,
  onLeaveTable,
  onDeleteTable,
  onCommandHost,
}: TableGridProps) {
  const { model, active, range } = useSyncExternalStore(
    store.subscribe,
    store.get,
  );
  const editors = React.useRef(new Map<string, CellEditor>());
  const idleTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridRef = React.useRef<HTMLDivElement | null>(null);
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

  const columns = columnCount(model);
  const bodyRows = bodyRowCount(model);
  const bounds = range ? cellRangeBounds(range) : null;

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
    [
      cancelIdleFlush,
      collect,
      focusEditor,
      onCommit,
      onLeaveTable,
      store,
    ],
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
    }),
    [escape, navigate, scheduleIdleFlush, store],
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
      const rect = gridRef.current?.getBoundingClientRect();
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
      store.setRange({ anchor: drag.anchor, focus: clampCellRef(focus, live.model) });
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
        handlers={handlersFor}
        register={register}
        onFocus={store.setActive}
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
            bounds !== null &&
            rangeContains(bounds, { row: index + 1, col })
          }
          handlers={handlersFor}
          register={register}
          onFocus={store.setActive}
        />,
      );
    }
    bodyRowNodes.push(<tr key={index}>{cells}</tr>);
  }

  return (
    <div
      ref={gridRef}
      className="cm-live-table-grid"
      onBlur={handleBlur}
      onMouseDown={beginRangeDrag}
    >
      <table className="cm-live-table">
        <thead>
          <tr>{headerCells}</tr>
        </thead>
        <tbody>{bodyRowNodes}</tbody>
      </table>
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
      {/*
        A clickable strip under the table (plan C.2, `@user` 2026-10-23: "I can
        not click after the table").

        A block widget is as tall as its table, so when the table is the
        document's last block there is no document position below it to click:
        the user is stuck in the cells. The strip gives that click a target, and
        `mousedown` + `preventDefault` keeps focus from moving anywhere before
        the widget adds the line (the same trigger the hover `+` uses, D.1).
        The widget owns the block range, so the caret is placed there.
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
  readonly handlers: (ref: TableCellRef) => CellEditorHandlers;
  readonly register: (ref: TableCellRef, editor: CellEditor | null) => void;
  readonly onFocus: (ref: TableCellRef) => void;
};

/**
 * One cell: a `<th>`/`<td>` whose only child is a nested editor's DOM.
 *
 * React owns the element but never its children — the `CellEditor` appends the
 * CodeMirror tree into that node and React reconciles nothing, which is why the
 * element carries no React children at all.
 */
function TableCell({
  model,
  cell,
  tag,
  editable,
  active,
  inRange,
  handlers,
  register,
  onFocus,
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
      // The delimiter row's alignment is a column property; `left` is the
      // default, and the old markup left the style off for it.
      style={alignment === "left" ? undefined : { textAlign: alignment }}
      onFocus={() => onFocus(cell)}
    />
  );
}
