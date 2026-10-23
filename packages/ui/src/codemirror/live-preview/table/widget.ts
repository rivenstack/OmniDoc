"use client";

/**
 * The table block widget (F-15 Task 3.3 Rev 2, plan Task A.4).
 *
 * The widget is thin on purpose: it owns the DOM CodeMirror hands it, the
 * document range, and **the one write to the document**. Everything about how a
 * table *looks and behaves* is React (`grid.tsx`) over the model (`model.ts`).
 *
 * ## Why the DOM comes from React
 *
 * `toDOM` mounts a synchronous React root into the wrapper (the Task 3.2 callout
 * precedent) so the grid can be composed from state — cell editors, the selection
 * overlay, hover affordances, the context menu — instead of being patched by hand.
 * `flushSync` matters: a concurrent render would leave an empty block for a frame,
 * and CodeMirror measures the widget as soon as it exists.
 *
 * ## Why the wrapper isolates events (again)
 *
 * The widget lives inside CodeMirror's own `contenteditable="true"` content DOM.
 * Two facts make that hostile to a nested editor:
 *
 * - CodeMirror's `mousedown` handler on the content DOM starts a mouse selection
 *   and takes focus back; it does not consult `WidgetType.ignoreEvent`.
 * - A nested editing host cannot hold focus inside another one, so the cells need
 *   `contenteditable="false"` on an ancestor to become independent hosts.
 *
 * So the wrapper carries `contenteditable="false"` and stops the bubble for the
 * event types that start inside the table. Every listener inside runs on the
 * event's own target first, so the table's behaviour is unaffected.
 *
 * ## The write
 *
 * A cell edit reaches the document on Escape, on focus leaving the table, after an
 * idle pause, and on every structural edit — always from **outside** a CodeMirror
 * update (`view.updateState` is not idle during a `focusout` the update itself
 * caused, and dispatching then throws). The write rebuilds the widget, so the
 * caret is restored synchronously into the **new** grid, found by the table offset
 * CodeMirror preserves on the wrapper.
 */

import { EditorView, WidgetType } from "@codemirror/view";
import { redo, undo } from "@codemirror/commands";
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { cellEditorFor, type CellHistoryKind } from "./editor";
import {
  TableGrid,
  type TableCommandRun,
  type TableCommit,
} from "./grid";
import {
  bodyRowCount,
  columnCount,
  markdownFromModel,
  tableModelFromMarkdown,
  type TableCellRef,
  type TableModel,
} from "./model";
import type { StructureResult } from "./structure";
import { TableStore } from "./store";

/**
 * The mounted widget for each rendered wrapper element.
 *
 * A selection change rebuilds the decoration set, and CodeMirror keeps the old
 * DOM when the replacement widget is `eq` — so the widget instance stored in the
 * current state may never have been mounted. The wrapper element, not the state
 * entry, is the reliable link back to the instance that owns the live view.
 */
const mountedWidgets = new WeakMap<HTMLElement, TablePreviewWidget>();

/**
 * The event types that must not reach the outer editor.
 *
 * These are the ones CodeMirror acts on from its content DOM (pointer selection,
 * caret placement, key handling, input) *without* consulting the widget, plus the
 * ones the browser would otherwise turn into document-level edits.
 */
const ISOLATED_EVENTS = [
  "mousedown",
  "mouseup",
  "click",
  "dblclick",
  "auxclick",
  "contextmenu",
  "keydown",
  "keypress",
  "keyup",
  "beforeinput",
  "input",
  "paste",
  "cut",
] as const;

/**
 * Is CodeMirror between updates?
 *
 * `view.updateState` is real but not in CodeMirror's public typings, so it is read
 * defensively: a version that stops exposing it reads as "not idle", which only
 * costs one deferred task. `0` is `UpdateState.Idle`.
 */
function viewIsIdle(view: EditorView): boolean {
  return (view as unknown as { updateState?: number }).updateState === 0;
}

export class TablePreviewWidget extends WidgetType {
  private root: Root | null = null;
  private store: TableStore | null = null;
  private view: EditorView | null = null;
  /**
   * The element this widget rendered into, once `toDOM` has run.
   *
   * CodeMirror rebuilds the decoration set on every selection change and keeps
   * the existing DOM when the new widget is `eq`, so the widget *instance* in
   * the current state may never have been mounted. The wrapper element is the
   * stable link to the mounted instance ({@link leaveTableRenderedAfter}).
   */
  private wrapper: HTMLElement | null = null;
  /**
   * Set once this widget has written to the document.
   *
   * A write replaces the widget, so this instance's `from`/`to` are stale from that
   * moment on and it must never write a second time — a queued `focusout` after an
   * Escape would otherwise splice the table out of its own old range.
   */
  private written = false;
  /**
   * The live grid's structure-command executor (C.3).
   *
   * Commands must run over the **collected** model — uncommitted cell text lives
   * in the nested editors, which only the grid can read — so the executor is the
   * grid's, registered through `onCommandHost`. The menu (D.3) will call it
   * directly from inside the grid; the lookup below exists for the same reason
   * `focusTableRenderedCell` does: the mounted widget, not the state's `eq`
   * replacement, is the one with a live grid.
   */
  private commandHost: TableCommandRun | null = null;

  constructor(
    private readonly markdown: string,
    private readonly from: number,
    private readonly to: number,
    /**
     * Part of the widget's *identity*, not just its rendering.
     *
     * A lock changes whether the cells are editable, and each cell editor is built
     * with that flag; if CodeMirror considered a locked table's widget equal to the
     * unlocked one it would keep the old DOM and the cells would stay typable after
     * the lock.
     */
    private readonly editable: boolean,
  ) {
    super();
  }

  eq(other: TablePreviewWidget): boolean {
    return (
      other.markdown === this.markdown &&
      other.from === this.from &&
      other.to === this.to &&
      other.editable === this.editable
    );
  }

  ignoreEvent(): boolean {
    return true;
  }

  destroy(): void {
    this.disposeRoot();
    if (this.wrapper) mountedWidgets.delete(this.wrapper);
    this.wrapper = null;
    this.store = null;
    this.view = null;
    this.commandHost = null;
  }

  /**
   * One element, one root, one widget — so there is deliberately **no**
   * `updateDOM`.
   *
   * CodeMirror calls `updateDOM` on a *new* widget with the *old* element
   * whenever a block widget of the same class is replaced by one that is not
   * `eq` — which is exactly what a write-back is. Inheriting that element looks
   * attractive (the cell editors would survive), but the element already carries
   * the previous widget's React root: a second `createRoot` on it throws
   * "You are calling ReactDOMClient.createRoot() on a container that has already
   * been passed to createRoot() before" and leaves two trees fighting over one
   * element, and reusing the root instead would leave the grid's callbacks — and
   * this widget's own `written` latch — pointing at the write that has already
   * happened. Taking CodeMirror's default (`false`) makes it redraw through
   * {@link toDOM}, so the rebuilt grid is built from the markdown the write just
   * produced and the caret is put back by {@link restoreFocus} (plan §4.7).
   */
  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-live-table-wrapper tableWrapper";
    // A wide table must stay scrollable by keyboard, which needs the scroll
    // container itself to be focusable (`ui-qa-checklist.md` §6.4).
    wrapper.tabIndex = 0;
    wrapper.dataset.tableFrom = String(this.from);
    wrapper.setAttribute("role", "group");
    wrapper.setAttribute("aria-label", "Table");
    // Makes each nested cell editor an independent editing host rather than part of
    // the outer editor's editable region (see the module header).
    wrapper.setAttribute("contenteditable", "false");

    for (const type of ISOLATED_EVENTS) {
      wrapper.addEventListener(type, stopPropagation);
    }

    this.wrapper = wrapper;
    mountedWidgets.set(wrapper, this);
    this.mount(wrapper, view);
    return wrapper;
  }

  /**
   * Drop this widget's React tree, outside React's own work.
   *
   * A note's editor is torn down from a React lifecycle — a mode switch, a route
   * change — so unmounting synchronously throws "Attempted to synchronously
   * unmount a root while React was already rendering". A microtask runs once the
   * current render has finished, which is soon enough for a tree whose DOM is
   * already gone.
   */
  private disposeRoot(): void {
    const root = this.root;
    this.root = null;
    if (!root) return;
    queueMicrotask(() => root.unmount());
  }

  /** Render (or re-render) the React grid for this widget's markdown. */
  private mount(host: HTMLElement, view: EditorView): void {
    this.view = view;
    const model = tableModelFromMarkdown(this.markdown);
    if (!model) {
      // Not a table any more (a mid-transaction render): show the source rather
      // than an empty block, and drop the React tree.
      this.disposeRoot();
      this.store = null;
      host.textContent = this.markdown;
      return;
    }

    if (this.store) this.store.setModel(model);
    else this.store = new TableStore(model);
    const store = this.store;

    this.root ??= createRoot(host);
    // `createElement` rather than JSX so this file can stay a `.ts` (the plan's
    // file list); the grid's own markup lives in `grid.tsx`.
    const grid = createElement(TableGrid, {
      store,
      editable: this.editable,
      onCommit: this.commit,
      onEscape: () => this.view?.focus(),
      onLeaveTable: this.leaveTable,
      onDeleteTable: this.removeTable,
      onCommandHost: this.registerCommandHost,
      onHistory: this.handleHistory,
    });
    // `flushSync` so the grid's DOM exists before CodeMirror measures the
    // widget — a concurrent render would leave an empty block for a frame.
    flushSync(() => {
      this.root?.render(grid);
    });
  }

  /**
   * Write the grid's model back to the document, once.
   *
   * `focus` is the cell the caret should land in: a write rebuilds the widget, so
   * the caret has to be put back synchronously — the user may reach for another
   * control immediately. When nothing actually changed the DOM is still valid and
   * the caret can simply move within it.
   */
  private readonly commit: TableCommit = (model, focus) => {
    const markdown = markdownFromModel(model);
    if (markdown === this.markdown) {
      if (focus) this.restoreFocus(focus);
      return;
    }
    if (this.written) return;
    this.written = true;
    this.writeDoc({ from: this.from, to: this.to, insert: markdown }, focus);
  };

  /**
   * Dispatch the write, never from inside CodeMirror's own update.
   *
   * A `focusout` from the table is the trigger for most writes, and that event
   * arrives *during* a CodeMirror update whenever the update is what moved focus —
   * `EditorView.dispatch` throws "Calls to EditorView.update are not allowed while
   * an update is in progress" and the edit is dropped. Deferring to the next task
   * puts the write safely outside the cycle.
   */
  private writeDoc(
    changes: { from: number; to: number; insert: string },
    focus?: TableCellRef & { offset?: number },
  ): void {
    const run = () => {
      // The view is captured **before** the dispatch: the write replaces this
      // widget, so CodeMirror destroys it as part of the update — clearing
      // `this.view` — and the caret would then have nowhere to go.
      const view = this.view;
      if (!view?.dom.isConnected) return;
      view.dispatch({ changes });
      if (focus) this.restoreFocus(focus, view);
    };
    if (this.view && viewIsIdle(this.view)) run();
    else setTimeout(run, 0);
  }

  /**
   * The caret stepped off the table (plan §4.5, Task C.2).
   *
   * The grid resolves the edge; the **widget** owns the block range, so it
   * computes the outer caret. Nothing is dispatched here: this is called from a
   * keydown inside a nested cell, which is frequently inside a CodeMirror update
   * (a focus handoff), and dispatching the outer view then throws. The whole
   * decision — including the pending cell text — is made in {@link dispatchLeave}
   * on the next task.
   */
  private readonly leaveTable = (edge: "before" | "after"): void => {
    setTimeout(() => this.dispatchLeave(edge), 0);
  };

  /**
   * The `TABLE-007` end-of-document case: a caret landed at the document's end
   * directly below a table that is the last block (a click below it, ArrowDown
   * or End from the outer editor). There is no line there, so the user's intent
   * is "put my caret after the table" and the table has to grow one.
   *
   * `scan.ts` owns the **position** rule (and defers the call outside the
   * CodeMirror update); the widget owns the block range and the `written` latch,
   * so the exit reuses the same path as the keyboard's ArrowDown-off-the-table.
   * `dispatchLeave` refuses when this widget has already written, and this
   * method is a no-op when the view is gone — a redirect that races a rebuild
   * must not dispatch into a detached editor.
   */
  leaveTableAfter(): void {
    this.dispatchLeave("after");
  }

  /** The grid registers its executor on mount; `null` on unmount. */
  private readonly registerCommandHost = (run: TableCommandRun | null): void => {
    this.commandHost = run;
  };

  /**
   * Run one structure command against the live grid (plan C.3).
   *
   * Returns `false` when the grid has not registered — a widget that is being
   * replaced, or one whose React tree never mounted — so a menu activation that
   * races a rebuild does nothing rather than writing a stale model.
   */
  runStructureCommand(
    resolve: (model: TableModel) => StructureResult,
  ): boolean {
    if (!this.commandHost) return false;
    this.commandHost(resolve);
    return true;
  }

  /**
   * Delete the whole table (MENU-002's "Delete table").
   *
   * Deferred for the same reason {@link leaveTable} is: the click that asked for
   * the deletion may arrive during a CodeMirror update, and dispatching then
   * throws. The decision — the block range, the preceding newline, the outer
   * caret — is made in {@link dispatchRemoveTable}.
   */
  private readonly removeTable = (): void => {
    setTimeout(() => this.dispatchRemoveTable(), 0);
  };

  /**
   * B-6's first press: select every cell without touching the document.
   *
   * A range is a **view** selection (C.4), so the markdown is untouched. The
   * grid turns a covering range into the wrapper's `data-table-selected`
   * marker, which is what the outer keymap reads to tell the first press
   * (select) from the second (delete).
   */
  selectWholeTable(): boolean {
    const model = this.store?.get().model;
    if (!model) return false;
    this.store?.setRange({
      anchor: { row: 0, col: 0 },
      focus: { row: bodyRowCount(model), col: columnCount(model) - 1 },
    });
    return true;
  }

  /** The C.5 key path for "delete this table", through {@link removeTable}. */
  deleteTable(): void {
    this.removeTable();
  }

  /**
   * A cell asked for `undo`/`redo` (plan §4.5, policy §11-4).
   *
   * The grid has already folded its editors into the store, so committing here
   * publishes the pending cell text to the document first — which is what makes
   * the following undo revert the **cell edit** rather than the edit before it.
   * The history action is always deferred: a commit may itself be deferred
   * (`writeDoc`), and both are `setTimeout(0)` tasks, so FIFO ordering puts the
   * undo after the write it is meant to revert.
   *
   * The view is captured before the commit because a write replaces this
   * widget — CodeMirror destroys it during the dispatch and clears `this.view`.
   */
  private readonly handleHistory = (
    kind: CellHistoryKind,
    focus?: TableCellRef,
  ): void => {
    const view = this.view;
    if (!view) return;
    const from = this.from;
    const model = this.store?.get().model;
    if (model) this.commit(model);

    setTimeout(() => {
      if (!view.dom.isConnected) return;
      // Focus first: the command dispatches a transaction, and an unfocused
      // view still applies it (the caret simply is not visible yet).
      view.focus();
      if (kind === "undo") undo(view);
      else redo(view);
      // The outer selection was never where the user was looking — a cell held
      // focus — so the history's restored selection lands at the table's start
      // (or worse, the document's). Put the caret back in the cell that asked
      // (`@user`, 2026-10-23: "ctrl+z … moves the caret to the first line").
      if (focus) {
        focusTableRenderedCell(view, from, focus);
      }
    }, 0);
  };

  /**
   * Remove the block and the newline that separated it from the line above.
   *
   * Deleting only `from..to` would leave the table's trailing newline as an
   * empty line where the table used to be; taking the preceding newline instead
   * makes the surrounding text join up, which is the same "the block and its
   * preceding newline" rule the whole-table Backspace follows (§4.4) and the
   * negative the plan asks for. The caret goes to the deletion point in the
   * **outer** editor, which is where the user is looking after the table is
   * gone.
   *
   * Guarded exactly like {@link dispatchLeave}: a widget that already wrote has
   * stale offsets, and a detached view must not be dispatched into.
   */
  private dispatchRemoveTable(): void {
    if (this.written) return;
    const view = this.view;
    if (!view?.dom.isConnected) return;

    const from = this.from > 0 ? this.from - 1 : this.from;
    this.written = true;
    view.dispatch({
      changes: { from, to: this.to, insert: "" },
      selection: { anchor: from },
    });
    view.focus();
    // Re-assert after focusing: CodeMirror's focus transaction can overwrite a
    // selection dispatched while the view was unfocused (the same quirk
    // `CellEditor.focus` handles).
    view.dispatch({ selection: { anchor: from } });
  }

  /**
   * Move the outer caret out of the table, writing any pending cell text first.
   *
   * `before` lands at the end of the previous line; at the document start there
   * is no previous line, so one is inserted. `after` lands at the start of the
   * following line; when the table is the last block, a trailing line is added.
   *
   * The possible write and the caret are one transaction, so the target offset is
   * valid in the post-change document and no second lookup can race the rebuild.
   * The grid has already folded its editors into the store, so an uncommitted
   * keystroke is part of the write rather than lost by the leave.
   */
  private dispatchLeave(edge: "before" | "after"): void {
    if (this.written) return;
    const view = this.view;
    if (!view?.dom.isConnected) return;

    const model = this.store?.get().model;
    const markdown = model ? markdownFromModel(model) : this.markdown;
    const changed = markdown !== this.markdown;
    const { from, to } = this;

    // Where the table ends once the pending edit (if any) has been written, and
    // how long the document will be then. A following line exists while the
    // table's end is still before the document's end.
    const tableEnd = from + markdown.length;
    const docLength = view.state.doc.length - (to - from) + markdown.length;
    const atDocumentStart = from === 0;
    const hasFollowingLine = tableEnd < docLength;

    let insert = markdown;
    let anchor: number;
    if (edge === "before") {
      if (atDocumentStart) {
        // No line above: give the caret one, before the table.
        insert = `\n${markdown}`;
        anchor = 0;
      } else {
        // `from` is a line start, so the character before it is that line's
        // newline — the end of the previous line.
        anchor = from - 1;
      }
    } else if (hasFollowingLine) {
      anchor = tableEnd + 1;
    } else {
      // The table is the last block: add the line the caret is going to.
      insert = `${markdown}\n`;
      anchor = tableEnd + 1;
    }

    const write = changed || insert !== markdown;
    // Only a write that replaces the **table itself** replaces this widget; the
    // trailing line is outside the block, so CodeMirror keeps this instance
    // (`eq` is unchanged) and latching would make the next leave a silent
    // no-op — exactly what `@user` hit after deleting the line and clicking
    // below the table again (2026-10-23).
    if (changed) this.written = true;
    view.dispatch({
      ...(write ? { changes: { from, to, insert } } : {}),
      selection: { anchor },
    });
    view.focus();
    // CodeMirror notices focus during an update, and its focus transaction can
    // overwrite the selection a dispatch made while the view was unfocused
    // (the same quirk `CellEditor.focus` handles). Re-assert it after focusing.
    view.dispatch({ selection: { anchor } });
  }

  /**
   * Put the caret back after a rebuild.
   *
   * The rebuild has already replaced this widget's DOM, so the target is looked up
   * in the **live** widget — found by the table's start offset, which the
   * replacement preserves.
   */
  private restoreFocus(
    focus: TableCellRef & { offset?: number },
    view: EditorView | null = this.view,
  ): void {
    if (!view) return;
    focusTableRenderedCell(view, this.from, focus, focus.offset);
  }
}

/**
 * Focus a cell inside an already-rendered table.
 *
 * The widget's DOM is the only link between the document and the nested editors
 * (`cellEditorFor` is keyed by host element), so both the post-write caret
 * restore and the `TABLE-007` redirector (`scan.ts`) go through this one lookup.
 * It returns `false` when the table or the cell is not rendered — a redirect
 * that races a rebuild must not create a cell or unfold anything.
 *
 * This is a *focus* call, so callers must be outside a CodeMirror update: the
 * nested editor dispatches its selection, which would otherwise throw
 * "Calls to EditorView.update are not allowed while an update is in progress".
 */
export function focusTableRenderedCell(
  view: EditorView,
  tableFrom: number,
  cell: TableCellRef,
  offset?: number,
): boolean {
  const wrapper = view.dom.querySelector<HTMLElement>(
    `.cm-live-table-wrapper[data-table-from="${tableFrom}"]`,
  );
  const host = wrapper?.querySelector<HTMLElement>(
    `[data-row="${cell.row}"][data-col="${cell.col}"]`,
  );
  const editor = host ? cellEditorFor(host) : undefined;
  if (!editor) return false;
  editor.focus(offset);
  return true;
}

/**
 * Create the line after a table that is the document's last block.
 *
 * The `TABLE-007` redirector (`scan.ts`) decides *that* the caret landed at
 * `docLength` below a rendered table; the mounted widget owns the block range, so
 * it performs the write. Resolving the widget through the wrapper matters: the
 * decoration set is rebuilt on every selection change and the state's widget
 * instance may be an `eq` replacement that CodeMirror never mounted.
 *
 * Returns `false` when the table is not mounted any more, so a redirect that
 * races a rebuild does nothing.
 */
export function leaveTableRenderedAfter(
  view: EditorView,
  tableFrom: number,
): boolean {
  const wrapper = view.dom.querySelector<HTMLElement>(
    `.cm-live-table-wrapper[data-table-from="${tableFrom}"]`,
  );
  const widget = wrapper ? mountedWidgets.get(wrapper) : undefined;
  if (!widget) return false;
  widget.leaveTableAfter();
  return true;
}

/**
 * Run a structure command against the table rendered at `tableFrom` (plan C.3).
 *
 * This is the widget-level entry point the C.3 suite drives and the seam the
 * context menu (D.3) can use from outside React. The grid folds uncommitted cell
 * text into the model and the widget writes the result through its one commit
 * pipeline, so a command behaves exactly as it will from a menu item.
 *
 * Returns `false` when the table is not mounted (a rebuild raced the call).
 */
export function runTableStructureCommand(
  view: EditorView,
  tableFrom: number,
  resolve: (model: TableModel) => StructureResult,
): boolean {
  const wrapper = view.dom.querySelector<HTMLElement>(
    `.cm-live-table-wrapper[data-table-from="${tableFrom}"]`,
  );
  const widget = wrapper ? mountedWidgets.get(wrapper) : undefined;
  if (!widget) return false;
  return widget.runStructureCommand(resolve);
}

/**
 * Select every cell of the rendered table at `tableFrom` (B-6, first press).
 *
 * Resolved through the **mounted** widget, like `focusTableRenderedCell`: the
 * decoration set is rebuilt on selection changes, so the widget instance in the
 * state may be an `eq` replacement that never mounted a grid.
 */
export function selectWholeTableRendered(
  view: EditorView,
  tableFrom: number,
): boolean {
  const wrapper = view.dom.querySelector<HTMLElement>(
    `.cm-live-table-wrapper[data-table-from="${tableFrom}"]`,
  );
  const widget = wrapper ? mountedWidgets.get(wrapper) : undefined;
  if (!widget) return false;
  return widget.selectWholeTable();
}

/**
 * Delete the rendered table at `tableFrom` (B-6, second press).
 *
 * The removal itself is the widget's deferred `removeTable` write — the same
 * path MENU-002's "Delete table" uses, so the block, the preceding newline and
 * the outer caret stay in one place.
 */
export function deleteTableRendered(
  view: EditorView,
  tableFrom: number,
): boolean {
  const wrapper = view.dom.querySelector<HTMLElement>(
    `.cm-live-table-wrapper[data-table-from="${tableFrom}"]`,
  );
  const widget = wrapper ? mountedWidgets.get(wrapper) : undefined;
  if (!widget) return false;
  widget.deleteTable();
  return true;
}

function stopPropagation(event: Event): void {
  event.stopPropagation();
}
