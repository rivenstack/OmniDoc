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
  navigateEnter,
  navigateHorizontal,
  navigateTab,
  navigateVertical,
  type NavigationResult,
  type TableFocusTarget,
} from "./structure";

/** Ask the widget to write `model` back to the document. */
export type TableCommit = (
  model: TableModel,
  focus?: TableCellRef & { offset?: number },
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
};

export function TableGrid({
  store,
  editable,
  onCommit,
  onEscape,
  onLeaveTable,
}: TableGridProps) {
  const { model, active } = useSyncExternalStore(store.subscribe, store.get);
  const editors = React.useRef(new Map<string, CellEditor>());
  const idleTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const columns = columnCount(model);
  const bodyRows = bodyRowCount(model);

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

  const handlersFor = React.useCallback(
    (ref: TableCellRef): CellEditorHandlers => ({
      onInput: () => {
        store.setActive(ref);
        scheduleIdleFlush();
      },
      onEscape: escape,
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
          handlers={handlersFor}
          register={register}
          onFocus={store.setActive}
        />,
      );
    }
    bodyRowNodes.push(<tr key={index}>{cells}</tr>);
  }

  return (
    <div className="cm-live-table-grid" onBlur={handleBlur}>
      <table className="cm-live-table">
        <thead>
          <tr>{headerCells}</tr>
        </thead>
        <tbody>{bodyRowNodes}</tbody>
      </table>
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
      // The delimiter row's alignment is a column property; `left` is the
      // default, and the old markup left the style off for it.
      style={alignment === "left" ? undefined : { textAlign: alignment }}
      onFocus={() => onFocus(cell)}
    />
  );
}
