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
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { cellEditorFor } from "./editor";
import { TableGrid, type TableCommit } from "./grid";
import {
  markdownFromModel,
  tableModelFromMarkdown,
  type TableCellRef,
} from "./model";
import { TableStore } from "./store";

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
   * Set once this widget has written to the document.
   *
   * A write replaces the widget, so this instance's `from`/`to` are stale from that
   * moment on and it must never write a second time — a queued `focusout` after an
   * Escape would otherwise splice the table out of its own old range.
   */
  private written = false;

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
    this.store = null;
    this.view = null;
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
    const wrapper = view.dom.querySelector<HTMLElement>(
      `.cm-live-table-wrapper[data-table-from="${this.from}"]`,
    );
    const cell = wrapper?.querySelector<HTMLElement>(
      `[data-row="${focus.row}"][data-col="${focus.col}"]`,
    );
    if (!cell) return;
    cellEditorFor(cell)?.focus(focus.offset);
  }
}

function stopPropagation(event: Event): void {
  event.stopPropagation();
}
