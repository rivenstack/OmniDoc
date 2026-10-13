/**
 * The interactive table: model, DOM, cell editing and write-back
 * (F-15 Rev 2, Task 1.4).
 *
 * Moved verbatim out of `markdown-live-preview.ts` — a pure move, no logic
 * change.
 */

import type { EditorView } from "@codemirror/view";
import {
  serializeMarkdownTable,
  unescapeTableCell,
  type ParsedTable,
} from "../../../markdown/table";
import { TABLE_TOOL_ICONS, renderCellMarkdown, tableToolButton } from "./tools";

/** A cell addressed by its row (0 = header) and column. */
export type TableCellRef = { row: number; col: number };

/** How long a table waits after the last keystroke before writing back. */
export const TABLE_IDLE_FLUSH_MS = 600;

/** A cell holds one line of source, so its edited text is collapsed to one. */
function normalizeCellText(text: string): string {
  return text
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Is CodeMirror between updates?
 *
 * `view.updateState` is real but not in CodeMirror's public typings, so it is
 * read defensively: a version that stops exposing it reads as "not idle", which
 * only costs one deferred task. `0` is `UpdateState.Idle`.
 */
function viewIsIdle(view: EditorView): boolean {
  return (view as unknown as { updateState?: number }).updateState === 0;
}

/** The caret's offset inside `cell`'s text, or `null` when it is elsewhere. */
function caretOffset(cell: HTMLElement | undefined): number | null {
  if (!cell) return null;
  const selection =
    typeof window === "undefined" ? null : window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!cell.contains(range.startContainer)) return null;
  return range.startOffset;
}

/** True while the caret sits at the very start (or end) of the cell's text. */
function caretAtEdge(
  cell: HTMLElement | undefined,
  edge: "start" | "end",
): boolean {
  if (!cell) return false;
  const selection =
    typeof window === "undefined" ? null : window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  if (!range.collapsed || !cell.contains(range.startContainer)) return false;
  const length = (cell.textContent ?? "").length;
  return edge === "start"
    ? range.startOffset === 0
    : range.startOffset >= length;
}

/** Put the caret at the end of a cell's contents. */
function placeCaretAtEnd(cell: HTMLElement): void {
  const selection =
    typeof window === "undefined" ? null : window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Put the caret back at `offset` inside a single-text-node cell. */
function placeCaretAtOffset(cell: HTMLElement, offset: number): void {
  const selection =
    typeof window === "undefined" ? null : window.getSelection();
  const node = cell.firstChild;
  if (!selection || !node || node.nodeType !== Node.TEXT_NODE) return;
  const range = document.createRange();
  range.setStart(node, Math.min(offset, (node.textContent ?? "").length));
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * The interactive half of a rendered table: model, DOM, cell editing, the
 * helper toolbar, and the single place that writes back to the document.
 *
 * Markdown mode renders a table as a block widget, so its cells are not
 * document positions — they are ordinary DOM with their own edit state. Two
 * rules make editing feel native:
 *
 * 1. **Editing a cell never touches the document.** The cell's text updates an
 *    in-memory model and re-renders that cell in place, so the widget survives
 *    every keystroke and the caret is never moved out from under the user.
 * 2. **The document is written when the table is left** (focus to outside),
 *    on Escape, on a structural edit, and on a short idle timer — so a note
 *    typed into and then abandoned still reaches autosave, which is driven by
 *    the document's change events.
 *
 * The model stores each cell's *markdown source*, which is what makes
 * `**bold**`, `` `code` `` and `\|` survive a round trip: the format is text the
 * user typed, never a description re-derived from rendered nodes.
 */
export class TableInteraction {
  private readonly model: ParsedTable;
  private readonly table: HTMLTableElement;
  private readonly cells = new Map<string, HTMLElement>();
  private editing: TableCellRef | null = null;
  private pointerEdit = false;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private alive = true;
  /**
   * Set once this interaction has written to the document.
   *
   * A write replaces the widget, which means this instance's cached `from`/`to`
   * are stale from that moment on. It must never write a second time — a queued
   * `focusout` after an Escape, for instance, would otherwise splice the table
   * out of its own old range.
   */
  private written = false;

  constructor(
    private readonly view: EditorView,
    private readonly wrapper: HTMLElement,
    private readonly source: string,
    parsed: ParsedTable,
    private readonly from: number,
    private readonly to: number,
    private readonly editable: boolean,
  ) {
    this.model = {
      headers: [...parsed.headers],
      alignments: [...parsed.alignments],
      rows: parsed.rows.map((row) => [...row]),
    };
    this.table = document.createElement("table");
  }

  mount(): void {
    this.table.className = "cm-live-table";
    // The widget lives inside CodeMirror's own `contenteditable="true"` content
    // DOM, and Chromium refuses to let a nested editing host hold focus inside
    // another one: clicking a cell focuses it and the browser immediately hands
    // focus back to the editor, so the cell's edit never sticks. A
    // `contenteditable="false"` ancestor isolates the cells, making each one an
    // independent editing host that keeps the caret.
    this.table.setAttribute("contenteditable", "false");

    if (this.editable) {
      this.wrapper.appendChild(this.buildToolbar());
    }
    this.wrapper.appendChild(this.table);
    this.render();

    if (this.editable) {
      this.keepTheEditorOut();
      // Focus leaving the table is the commit point. A move *between* cells
      // keeps the caret inside the wrapper, so it updates the model only —
      // which is what stops the widget being rebuilt on every Tab.
      this.wrapper.addEventListener("focusout", (event) => {
        const next = event.relatedTarget as Node | null;
        if (next && this.wrapper.contains(next)) return;
        this.commit();
      });
    }
  }

  /**
   * Stop CodeMirror from handling events that start inside the table.
   *
   * `WidgetType.ignoreEvent` is not enough here. CodeMirror's own `mousedown`
   * handler runs on its content DOM, in the bubble phase, and starts a mouse
   * selection — refocusing the editor when it does not already have focus —
   * without ever consulting `ignoreEvent`. The effect is that clicking a cell
   * blurred it a moment later, the cell's edit never reached the model, and the
   * keystrokes went into the document's hidden source instead.
   *
   * Every listener inside the table is on the cell or the toolbar, i.e. on the
   * event's target, so they run *before* these wrapper listeners and keep
   * working. Stopping the bubble here is what makes the table behave like the
   * ordinary editable DOM it looks like.
   */
  private keepTheEditorOut(): void {
    const stop = (event: Event) => event.stopPropagation();
    for (const type of [
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
    ]) {
      this.wrapper.addEventListener(type, stop);
    }
  }

  // ---------------------------------------------------------------- structure

  private columns(): number {
    return Math.max(this.model.headers.length, 1);
  }

  private cellSource(row: number, col: number): string {
    if (row === 0) return this.model.headers[col] ?? "";
    return this.model.rows[row - 1]?.[col] ?? "";
  }

  private setCell(row: number, col: number, value: string): void {
    if (row === 0) {
      this.model.headers[col] = value;
    } else if (this.model.rows[row - 1]) {
      this.model.rows[row - 1][col] = value;
    }
  }

  private key(row: number, col: number): string {
    return `${row}:${col}`;
  }

  private cellAt(row: number, col: number): HTMLElement | undefined {
    return this.cells.get(this.key(row, col));
  }

  private emptyRow(): string[] {
    return Array.from({ length: this.columns() }, () => "");
  }

  private render(): void {
    this.cells.clear();
    this.table.textContent = "";

    const head = document.createElement("thead");
    head.appendChild(this.buildRow(0, "th"));
    this.table.appendChild(head);

    const body = document.createElement("tbody");
    for (let row = 0; row < this.model.rows.length; row += 1) {
      body.appendChild(this.buildRow(row + 1, "td"));
    }
    this.table.appendChild(body);
  }

  private buildRow(row: number, tag: "th" | "td"): HTMLTableRowElement {
    const tr = document.createElement("tr");

    for (let col = 0; col < this.columns(); col += 1) {
      const cell = document.createElement(tag);
      cell.className = tag === "th" ? "cm-live-th" : "cm-live-td";
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      const alignment = this.model.alignments[col] ?? "left";
      if (alignment !== "left") {
        cell.style.textAlign = alignment;
      }
      this.cells.set(this.key(row, col), cell);

      if (this.editable) {
        cell.contentEditable = "true";
        cell.spellcheck = false;
        cell.tabIndex = 0;
        // `mousedown` converts the cell to its source *before* the browser
        // paints the caret, so a click lands where the user pointed.
        cell.addEventListener("mousedown", () => {
          this.pointerEdit = true;
          this.beginEdit(row, col);
        });
        cell.addEventListener("focus", () => {
          this.beginEdit(row, col);
          if (!this.pointerEdit) {
            placeCaretAtEnd(cell);
          }
          this.pointerEdit = false;
        });
        cell.addEventListener("blur", () => this.endEdit(row, col));
        cell.addEventListener("input", (event) => {
          if (!(event as InputEvent).isComposing) {
            this.scheduleIdleCommit(row, col);
          }
        });
        cell.addEventListener("keydown", (event) =>
          this.onKeyDown(event, row, col),
        );
      }

      this.paintCell(row, col);
      tr.appendChild(cell);
    }

    return tr;
  }

  /** Draw a cell: rendered markdown normally, raw source while it is edited. */
  private paintCell(row: number, col: number): void {
    const cell = this.cellAt(row, col);
    if (!cell) return;
    const editing = this.editing?.row === row && this.editing?.col === col;
    cell.classList.toggle("cm-live-cell-editing", editing);
    cell.textContent = "";
    if (editing) {
      cell.textContent = unescapeTableCell(this.cellSource(row, col));
    } else {
      renderCellMarkdown(this.cellSource(row, col), cell);
    }
  }

  private buildToolbar(): HTMLElement {
    const toolbar = document.createElement("div");
    toolbar.className = "cm-live-table-toolbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "Table actions");

    // Every control acts on the cell the user is in. With no cell focused the
    // first one is claimed first, so the user can see what the action will
    // apply to instead of it landing on an invisible default.
    const on = (action: (row: number, col: number) => void) => () => {
      this.ensureActiveCell();
      const { row, col } = this.editing ?? { row: 0, col: 0 };
      action(row, col);
    };

    toolbar.append(
      tableToolButton(
        "Insert row above",
        TABLE_TOOL_ICONS.rowBefore,
        on((row) => this.insertRow(row)),
      ),
      tableToolButton(
        "Insert row below",
        TABLE_TOOL_ICONS.rowAfter,
        on((row) => this.insertRow(row + 1)),
      ),
      tableToolButton(
        "Delete row",
        TABLE_TOOL_ICONS.rowRemove,
        on((row) => this.deleteRow(row)),
      ),
      tableToolButton(
        "Insert column left",
        TABLE_TOOL_ICONS.colBefore,
        on((_row, col) => this.insertColumn(col)),
      ),
      tableToolButton(
        "Insert column right",
        TABLE_TOOL_ICONS.colAfter,
        on((_row, col) => this.insertColumn(col + 1)),
      ),
      tableToolButton(
        "Delete column",
        TABLE_TOOL_ICONS.colRemove,
        on((_row, col) => this.deleteColumn(col)),
      ),
      tableToolButton("Delete table", TABLE_TOOL_ICONS.tableRemove, () => {
        this.commitEditingCell();
        this.deleteTable();
      }),
    );

    return toolbar;
  }

  /** Give the toolbar a cell to act on when none is focused. */
  private ensureActiveCell(): void {
    if (this.editing) return;
    this.focusCell(0, 0);
  }

  // ------------------------------------------------------------------ editing

  private beginEdit(row: number, col: number): void {
    if (!this.editable) return;
    const previous = this.editing;
    if (previous && previous.row === row && previous.col === col) return;

    this.editing = { row, col };
    const cell = this.cellAt(row, col);
    if (!cell) return;
    cell.classList.add("cm-live-cell-editing");
    cell.textContent = unescapeTableCell(this.cellSource(row, col));
  }

  private endEdit(row: number, col: number): void {
    const cell = this.cellAt(row, col);
    if (!cell || !cell.classList.contains("cm-live-cell-editing")) return;
    if (this.editing?.row === row && this.editing?.col === col) {
      this.editing = null;
    }
    this.setCell(row, col, normalizeCellText(cell.textContent ?? ""));
    this.paintCell(row, col);
  }

  /** Fold the editing cell's DOM text into the model. */
  private commitEditingCell(): TableCellRef | null {
    const editing = this.editing;
    if (!editing) return null;
    const cell = this.cellAt(editing.row, editing.col);
    this.editing = null;
    if (cell) {
      this.setCell(
        editing.row,
        editing.col,
        normalizeCellText(cell.textContent ?? ""),
      );
      this.paintCell(editing.row, editing.col);
    }
    return editing;
  }

  private scheduleIdleCommit(row: number, col: number): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      if (!this.alive) return;
      const active = this.editing;
      if (!active) return;
      const offset = caretOffset(this.cellAt(row, col));
      const hadCell = this.commitEditingCell();
      this.commit(
        hadCell ? { ...active, offset: offset ?? undefined } : undefined,
      );
    }, TABLE_IDLE_FLUSH_MS);
  }

  private onKeyDown(event: KeyboardEvent, row: number, col: number): void {
    const bodyRows = this.model.rows.length;

    if (event.key === "Tab") {
      event.preventDefault();
      if (event.shiftKey) {
        const previous = this.previousCell(row, col);
        if (previous) this.focusCell(previous.row, previous.col);
        return;
      }
      const next = this.nextCell(row, col);
      if (next) {
        this.focusCell(next.row, next.col);
      } else {
        // Tab out of the last cell grows the table, the way a spreadsheet does.
        this.insertRow(bodyRows + 1, 0);
      }
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (row < bodyRows) {
        this.focusCell(row + 1, col);
      } else {
        this.insertRow(bodyRows + 1, col);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      this.commitEditingCell();
      this.commit();
      this.view.focus();
      return;
    }

    if (
      event.key === "ArrowUp" &&
      row > 0 &&
      caretAtEdge(this.cellAt(row, col), "start")
    ) {
      event.preventDefault();
      this.focusCell(row - 1, col);
      return;
    }

    if (
      event.key === "ArrowDown" &&
      row < bodyRows &&
      caretAtEdge(this.cellAt(row, col), "end")
    ) {
      event.preventDefault();
      this.focusCell(row + 1, col);
    }
  }

  private nextCell(row: number, col: number): TableCellRef | null {
    const columns = this.columns();
    const index = row * columns + col;
    const total = (this.model.rows.length + 1) * columns;
    if (index >= total - 1) return null;
    const next = index + 1;
    return { row: Math.floor(next / columns), col: next % columns };
  }

  private previousCell(row: number, col: number): TableCellRef | null {
    const columns = this.columns();
    const index = row * columns + col;
    if (index <= 0) return null;
    const previous = index - 1;
    return { row: Math.floor(previous / columns), col: previous % columns };
  }

  private focusCell(row: number, col: number, offset?: number): void {
    const cell = this.cellAt(row, col);
    if (!cell) return;
    cell.focus();
    this.beginEdit(row, col);
    if (offset !== undefined) {
      placeCaretAtOffset(cell, offset);
    } else {
      placeCaretAtEnd(cell);
    }
  }

  // ------------------------------------------------------------------- writes

  /**
   * Write the model back to the document, if it differs from the source on
   * screen.
   *
   * `target` is the cell the caret should land in. A write rebuilds the widget
   * (its DOM is decoration-owned), so the caret has to be put back
   * synchronously — the user may reach for another control immediately.
   */
  private commit(target?: TableCellRef & { offset?: number }): void {
    const markdown = serializeMarkdownTable(
      this.model.headers,
      this.model.alignments,
      this.model.rows,
    );
    if (markdown === this.source) {
      // Nothing to write, so the DOM is still valid and the caret can simply
      // move within it.
      if (target) this.focusCell(target.row, target.col, target.offset);
      return;
    }
    if (this.written) return;
    this.written = true;

    this.writeDoc(
      { from: this.from, to: this.to, insert: markdown },
      target ? () => this.restoreFocus(target) : undefined,
    );
  }

  /**
   * Write the document, never from inside CodeMirror's own update.
   *
   * A `focusout` from the widget is the trigger for most writes, and that event
   * arrives *during* a CodeMirror update whenever the update is what moved
   * focus — `EditorView.dispatch` throws
   * "Calls to EditorView.update are not allowed while an update is in progress"
   * and the edit is dropped. Deferring to the next task keeps the write and
   * puts it safely outside the cycle; `after` runs once it has landed.
   */
  private writeDoc(
    changes: { from: number; to: number; insert: string },
    after?: () => void,
  ): void {
    const run = () => {
      if (!this.view.dom.isConnected) return;
      this.view.dispatch({ changes });
      after?.();
    };
    if (viewIsIdle(this.view)) {
      run();
    } else {
      setTimeout(run, 0);
    }
  }

  /**
   * Put the caret back after a rebuild.
   *
   * The rebuild has already replaced this interaction's DOM, so the target is
   * looked up in the live widget — found by the table's start offset, which the
   * replacement preserves. Focusing the new cell runs the *new* interaction's
   * own focus handler, which is what makes a burst of toolbar presses act on
   * the cell the user is looking at.
   */
  private restoreFocus(target: TableCellRef & { offset?: number }): void {
    const wrapper = this.view.dom.querySelector<HTMLElement>(
      `.cm-live-table-wrapper[data-table-from="${this.from}"]`,
    );
    const cell = wrapper?.querySelector<HTMLElement>(
      `[data-row="${target.row}"][data-col="${target.col}"]`,
    );
    if (!cell) return;
    cell.focus();
    if (target.offset !== undefined) {
      placeCaretAtOffset(cell, target.offset);
    } else {
      placeCaretAtEnd(cell);
    }
  }

  /**
   * Insert a body row, and say which cell the caret should end up in.
   *
   * `focusCol` exists because the caller knows something this cannot: Tab out of
   * the last cell wants the new row's *first* cell, while a toolbar insertion
   * wants to stay in the column it was in.
   */
  private insertRow(visualRow: number, focusCol?: number): number {
    const active = this.commitEditingCell();
    const at = Math.min(Math.max(visualRow, 1), this.model.rows.length + 1);
    this.model.rows.splice(at - 1, 0, this.emptyRow());
    this.render();

    // The header row is row 0 and cannot be pushed down, so a new row below it
    // is the table's first body row.
    const row = active && active.row >= at ? active.row + 1 : at;
    this.commit({ row, col: focusCol ?? active?.col ?? 0 });
    return at;
  }

  private deleteRow(visualRow: number): void {
    const active = this.commitEditingCell();
    if (visualRow < 1 || visualRow > this.model.rows.length) {
      this.commit(active ? { row: active.row, col: active.col } : undefined);
      return;
    }
    this.model.rows.splice(visualRow - 1, 1);
    this.render();
    const row = Math.min(active?.row ?? 1, this.model.rows.length);
    this.commit({ row, col: active?.col ?? 0 });
  }

  private insertColumn(visualCol: number): void {
    const active = this.commitEditingCell();
    const at = Math.min(Math.max(visualCol, 0), this.columns());
    this.model.headers.splice(at, 0, "");
    this.model.alignments.splice(at, 0, "left");
    for (const row of this.model.rows) {
      row.splice(at, 0, "");
    }
    this.render();

    const col =
      active && active.col >= at
        ? active.col + 1
        : Math.min(at, this.columns() - 1);
    this.commit({ row: active?.row ?? 0, col });
  }

  private deleteColumn(visualCol: number): void {
    const active = this.commitEditingCell();
    if (this.columns() <= 1) {
      this.commit(active ? { row: active.row, col: active.col } : undefined);
      return;
    }
    this.model.headers.splice(visualCol, 1);
    this.model.alignments.splice(visualCol, 1);
    for (const row of this.model.rows) {
      row.splice(visualCol, 1);
    }
    this.render();
    this.commit({
      row: Math.min(active?.row ?? 0, this.model.rows.length),
      col: Math.min(visualCol, this.columns() - 1),
    });
  }

  private deleteTable(): void {
    if (this.written) return;
    this.written = true;
    const doc = this.view.state.doc;
    // Take the preceding newline with the table so deleting it does not leave
    // an empty paragraph behind.
    const start =
      this.from > 0 && doc.sliceString(this.from - 1, this.from) === "\n"
        ? this.from - 1
        : this.from;
    this.writeDoc({ from: start, to: this.to, insert: "" }, () =>
      this.view.focus(),
    );
  }

  /** Tear the interaction down (the widget's DOM is being discarded). */
  destroy(): void {
    this.alive = false;
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }
}
