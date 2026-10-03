import { syntaxTree } from "@codemirror/language";
import {
  EditorState,
  StateField,
  type EditorSelection,
  type Extension,
  type Range,
  type Text,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import {
  completedDelimiterRow,
  fenceMarker,
  hasBalancedPipes,
  isTableDelimiterRow,
  parseMarkdownTable,
  serializeMarkdownTable,
  splitTableRow,
  unescapeTableCell,
  type ParsedTable,
} from "../markdown/table";

/**
 * Re-exported: this module was the table text rules' original home. The
 * implementations now live in `../markdown/table` so the live preview and the
 * ProseMirror bridge read and write tables through one shared grammar.
 */
export { parseMarkdownTable, serializeMarkdownTable } from "../markdown/table";

/**
 * CodeMirror 6 live preview for the capture surface's **Markdown** mode.
 *
 * The note keeps its markdown source on screen, but the syntax tokens that
 * only exist for the parser fold away until the caret needs them, and the
 * block constructs the source spells out (`-`, `1.`, `>`, fences, `---`) are
 * drawn as the blocks they mean — the Obsidian "live preview" contract
 * (`docs/planning/implementation-tracks.md`, F-13).
 *
 * ## When a token unfolds
 *
 * The rule is deliberately *not* "the token itself is under the caret":
 *
 * - **Line tokens** (`#`, `>`, a list bullet, a task marker) belong to a whole
 *   line and unfold whenever the selection touches that line.
 * - **Inline tokens** (`**`, `~~`, backticks, link brackets and URLs) belong to
 *   a formatted span and unfold only while the selection touches the
 *   *formatted span* — clicking `world` in `**world!**` reveals the stars,
 *   clicking elsewhere on the line leaves them folded.
 * - **Nothing unfolds while the editor is unfocused or locked.** Opening the
 *   surface puts the caret at position 0; without this gate the first heading
 *   would greet the reader with a visible `#`. A locked note renders fully.
 *
 * Folded tokens are hidden with `Decoration.replace`, which removes them from
 * layout and from the rendered DOM, and marker tokens swallow the space that
 * follows them: `## Hello` renders as `Hello`, not ` Hello` — the space is part
 * of the syntax, not the content.
 *
 * ## What is drawn instead
 *
 * - list items: a bullet (or the source's own number for ordered lists), with
 *   a hanging indent so wrapped lines align under the text
 * - task items: a checkbox glyph instead of the bullet
 * - fenced code: a muted block with the monospace face, fences folded
 * - `---`: a horizontal rule
 * - headings, bold, italic, strikethrough, inline code, links, blockquotes:
 *   the same typography the Normal mode applies to the same content
 *
 * The look lives in theme rules rather than utility classes on purpose:
 * CodeMirror renders its own line DOM, and the modes must not drift into
 * different visual languages.
 */

/** A region that can sit under the selection. */
type RangeLike = { from: number; to: number };

type NodeRange = { name: string; from: number; to: number };

type Helpers = {
  doc: Text;
  /** Nearest enclosing node with one of `names`, or `null`. */
  ancestorOf: (names: readonly string[]) => NodeRange | null;
};

type HideRule = {
  /**
   * The region the selection has to touch for this token to unfold. `null`
   * means "this spelling is not one the preview folds" — leave it visible.
   */
  context: (node: NodeRange, helpers: Helpers) => RangeLike | null;
  /** Also fold the whitespace after the token — it is syntax, not content. */
  swallowTrailingSpace?: boolean;
};

const HIDE_RULES: Record<string, HideRule> = {
  HeaderMark: {
    context: (node, { doc }) => doc.lineAt(node.from),
    swallowTrailingSpace: true,
  },
  QuoteMark: {
    context: (node, { doc }) => doc.lineAt(node.from),
    swallowTrailingSpace: true,
  },
  ListMark: {
    context: (node, { doc }) => doc.lineAt(node.from),
    swallowTrailingSpace: true,
  },
  TaskMarker: {
    context: (node, { doc }) => doc.lineAt(node.from),
    swallowTrailingSpace: true,
  },
  EmphasisMark: {
    context: (_node, { ancestorOf }) =>
      ancestorOf(["Emphasis", "StrongEmphasis"]),
  },
  StrikethroughMark: {
    context: (_node, { ancestorOf }) => ancestorOf(["Strikethrough"]),
  },
  // Inline backticks unfold with their span; a fence unfolds with its own line.
  CodeMark: {
    context: (node, { doc, ancestorOf }) =>
      ancestorOf(["InlineCode"]) ?? doc.lineAt(node.from),
  },
  CodeInfo: { context: (node, { doc }) => doc.lineAt(node.from) },
  LinkMark: { context: (_node, { ancestorOf }) => ancestorOf(["Link"]) },
  URL: { context: (_node, { ancestorOf }) => ancestorOf(["Link"]) },
};

/** A folded token: nothing is rendered in its place. */
const HIDDEN = Decoration.replace({});

/** A token that is currently unfolded — dimmed so it reads as syntax. */
const SYNTAX = Decoration.mark({ class: "cm-live-syntax" });

/**
 * A folded token that is drawn as a glyph. The doc text stays authoritative —
 * the widget is decoration, so it is hidden from assistive technology and
 * ignores pointer events (the line's own rules still handle clicks).
 */
class MarkerWidget extends WidgetType {
  constructor(
    private readonly className: string,
    private readonly text: string,
  ) {
    super();
  }

  eq(other: MarkerWidget) {
    return other.className === this.className && other.text === this.text;
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = this.className;
    span.textContent = this.text;
    span.setAttribute("aria-hidden", "true");
    return span;
  }

  ignoreEvent() {
    return true;
  }
}

const BULLET = Decoration.replace({
  widget: new MarkerWidget("cm-live-bullet", "•"),
});
const TASK_UNCHECKED = Decoration.replace({
  widget: new MarkerWidget("cm-live-task", "☐"),
});
const TASK_CHECKED = Decoration.replace({
  widget: new MarkerWidget("cm-live-task", "☑"),
});
const RULE = Decoration.replace({ widget: new MarkerWidget("cm-live-hr", "") });

/** Ordered markers repeat per item, so they are cached by their source text. */
const orderedMarkers = new Map<string, Decoration>();
function orderedMarker(text: string): Decoration {
  let marker = orderedMarkers.get(text);
  if (!marker) {
    marker = Decoration.replace({
      widget: new MarkerWidget("cm-live-ordered-mark", text),
    });
    orderedMarkers.set(text, marker);
  }
  return marker;
}

const listItemLine = Decoration.line({ class: "cm-live-list-item" });
const quoteLine = Decoration.line({ class: "cm-live-quote" });
const codeBlockLine = Decoration.line({ class: "cm-live-code-block" });
const codeBlockFirstLine = Decoration.line({
  class: "cm-live-code-block cm-live-code-block-first",
});
const codeBlockLastLine = Decoration.line({
  class: "cm-live-code-block cm-live-code-block-last",
});
const codeBlockOnlyLine = Decoration.line({
  class: "cm-live-code-block cm-live-code-block-first cm-live-code-block-last",
});

/**
 * Render a cell's inline markdown into `container`.
 *
 * This is a **renderer only**. A cell's *source text* is the source of truth —
 * that is what the user edits and what gets serialized — so nothing here is
 * ever read back out of the DOM. That is what makes a cell holding `a \| b` or
 * `` `a|b` `` round-trip without loss: the previous implementation rebuilt the
 * source from the rendered nodes, and a rendered `<strong>` cannot represent
 * the escapes or the nesting its source had.
 *
 * Best-effort and deliberately narrow: `**bold**`, `*italic*`, `~~strike~~`,
 * `` `code` `` and `[label](target)`. Anything else stays literal text, which is
 * what a reader would expect from a typo anyway.
 */
export function renderCellMarkdown(
  source: string,
  container: HTMLElement,
): void {
  const text = unescapeTableCell(source);
  const pattern =
    /(`+[^`]*`+|\[[^\]]*\]\([^)\s]*\)|\*\*[\s\S]+?\*\*|~~[\s\S]+?~~|\*[^*\n]+?\*)/g;

  const append = (node: Node) => container.appendChild(node);

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      append(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    const token = match[0];
    let node: HTMLElement | null = null;

    if (token.startsWith("`") && token.endsWith("`")) {
      node = document.createElement("code");
      node.className = "cm-live-code";
      node.textContent = token.replace(/^`+|`+$/g, "");
    } else if (token.startsWith("**") && token.endsWith("**")) {
      node = document.createElement("strong");
      node.className = "cm-live-strong";
      node.textContent = token.slice(2, -2);
    } else if (token.startsWith("~~") && token.endsWith("~~")) {
      node = document.createElement("del");
      node.className = "cm-live-strike";
      node.textContent = token.slice(2, -2);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      node = document.createElement("em");
      node.className = "cm-live-em";
      node.textContent = token.slice(1, -1);
    } else if (token.startsWith("[") && token.includes("](")) {
      const split = token.indexOf("](");
      const target = token.slice(split + 2, -1);
      // Only targets a browser can act on. The note body is user content, and
      // a `javascript:` target is the one scheme that would run on a click.
      if (/^(https?:|mailto:|\/|#|\.)/i.test(target)) {
        const link = document.createElement("a");
        link.className = "cm-live-link";
        link.setAttribute("href", target);
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
        link.textContent = token.slice(1, split);
        node = link;
      }
    }

    append(node ?? document.createTextNode(token));
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    append(document.createTextNode(text.slice(lastIndex)));
  }
}

/** A cell addressed by its row (0 = header) and column. */
type TableCellRef = { row: number; col: number };

/** How long a table waits after the last keystroke before writing back. */
export const TABLE_IDLE_FLUSH_MS = 600;

/** Stroke-only 16×16 icons for the table's helper toolbar. */
const TABLE_TOOL_ICONS = {
  rowBefore: "M3 3h10M8 13.5v-7M5 9.5 8 6.5l3 3",
  rowAfter: "M3 13h10M8 2.5v7M5 6.5 8 9.5l3-3",
  rowRemove: "M3 3.5h10M3 8h10M3 12.5h10",
  colBefore: "M3.5 3v10M13.5 8h-7M9.5 5 6.5 8l3 3",
  colAfter: "M12.5 3v10M2.5 8h7M6.5 5 9.5 8l-3 3",
  colRemove: "M4 4l8 8M12 4l-8 8M8 2.5v11",
  tableRemove: "M3 5h10M6.5 5V3h3v2M4.5 5l.7 8h5.6l.7-8",
} as const;

/**
 * One toolbar control.
 *
 * Pressing it must not blur the cell being edited: the button lives inside the
 * widget, and the commit a blur triggers would rebuild that widget under the
 * pointer, so the button's `click` would never arrive. `mousedown` with
 * `preventDefault` is therefore the trigger, with a `keydown` twin for keyboard
 * users.
 */
function tableToolButton(
  label: string,
  path: string,
  onRun: () => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cm-live-table-tool";
  button.setAttribute("aria-label", label);
  button.title = label;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.5");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "path");
  icon.setAttribute("d", path);
  icon.setAttribute("fill", "none");
  svg.appendChild(icon);
  button.appendChild(svg);

  const run = (event: Event) => {
    event.preventDefault();
    onRun();
  };
  button.addEventListener("mousedown", run);
  button.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      run(event);
    }
  });

  return button;
}

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
class TableInteraction {
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

export class TablePreviewWidget extends WidgetType {
  private interaction: TableInteraction | null = null;

  constructor(
    private readonly markdown: string,
    private readonly from: number,
    private readonly to: number,
    /**
     * Part of the widget's *identity*, not just its rendering.
     *
     * Locking a note replaces the editor's editable facet, and the cells set
     * `contentEditable` on themselves — explicitly, which outranks a
     * non-editable ancestor. So if CM considered a locked table's widget equal
     * to the unlocked one it would keep the old DOM, and its cells stayed
     * typable after the lock until some unrelated change rebuilt the table.
     */
    private readonly editable: boolean,
  ) {
    super();
  }

  eq(other: TablePreviewWidget) {
    return (
      other.markdown === this.markdown &&
      other.from === this.from &&
      other.to === this.to &&
      other.editable === this.editable
    );
  }

  ignoreEvent() {
    return true;
  }

  destroy() {
    this.interaction?.destroy();
    this.interaction = null;
  }

  toDOM(view: EditorView) {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-live-table-wrapper tableWrapper";
    // A wide table must stay scrollable by keyboard, which needs the scroll
    // container itself to be focusable (`ui-qa-checklist.md` §6.4).
    wrapper.tabIndex = 0;
    wrapper.dataset.tableFrom = String(this.from);
    wrapper.setAttribute("role", "group");
    wrapper.setAttribute("aria-label", "Table");

    const parsed = parseMarkdownTable(this.markdown);
    if (!parsed) {
      wrapper.textContent = this.markdown;
      return wrapper;
    }

    const interaction = new TableInteraction(
      view,
      wrapper,
      this.markdown,
      parsed,
      this.from,
      this.to,
      this.editable,
    );
    this.interaction = interaction;
    interaction.mount();
    return wrapper;
  }
}

const headingDecos: Partial<Record<string, Decoration>> = {
  ATXHeading1: Decoration.mark({ class: "cm-live-h1" }),
  ATXHeading2: Decoration.mark({ class: "cm-live-h2" }),
  ATXHeading3: Decoration.mark({ class: "cm-live-h3" }),
};

const strongDeco = Decoration.mark({ class: "cm-live-strong" });
const emphasisDeco = Decoration.mark({ class: "cm-live-em" });
const strikethroughDeco = Decoration.mark({ class: "cm-live-strike" });
const inlineCodeDeco = Decoration.mark({ class: "cm-live-code" });
const linkDeco = Decoration.mark({ class: "cm-live-link" });

function selectionTouches(
  selection: EditorSelection,
  from: number,
  to: number,
): boolean {
  return selection.ranges.some(
    (range: RangeLike) => range.from <= to && range.to >= from,
  );
}

/**
 * The fence character of a code fence line, or `null`.
 *
 * A pipe table inside a fence is code, so the scan below has to know where
 * fences are; the rule is shared with the persistence normalizer.
 */
function fenceChar(line: string): string | null {
  return fenceMarker(line);
}

/**
 * Every table block in `doc`, as document ranges.
 *
 * This scans lines rather than the syntax tree on purpose. GFM's own grammar
 * only makes a `Table` node once the delimiter row has exactly as many cells as
 * the header, and a user typing a table never has that on screen: they write
 * `| Head 1 | Head 2 | Head 3 |`, press Enter, and type `| --- |`. A tree
 * lookup leaves that as raw pipes until they pad the delimiter row by hand,
 * which is the friction this preview exists to remove. The rules here are the
 * ones a reader sees: a header row with pipes, a delimiter row under it, and
 * pipes continuing below.
 */
export function findTableBlocks(
  doc: Text,
): Array<{ from: number; to: number }> {
  const blocks: Array<{ from: number; to: number }> = [];
  let fence: string | null = null;

  for (let lineNumber = 1; lineNumber <= doc.lines; lineNumber += 1) {
    const line = doc.line(lineNumber);
    const marker = fenceChar(line.text);
    if (marker) {
      fence = fence === null ? marker : fence === marker ? null : fence;
      continue;
    }
    if (fence !== null || lineNumber < 2) continue;

    const header = doc.line(lineNumber - 1);
    if (!header.text.includes("|") || !hasBalancedPipes(header.text)) continue;
    if (!isTableDelimiterRow(line.text) || !hasBalancedPipes(line.text)) {
      continue;
    }

    let last = lineNumber;
    let next = lineNumber + 1;
    while (next <= doc.lines && doc.line(next).text.includes("|")) {
      last = next;
      next += 1;
    }
    blocks.push({ from: header.from, to: doc.line(last).to });
    lineNumber = last;
  }

  return blocks;
}

/** How long a just-typed delimiter row waits before it is completed for you. */
export const TABLE_COMPLETE_MS = 500;

/**
 * Should this block render as a table right now?
 *
 * Everything is decidable from the text except one case: a delimiter row that is
 * *narrower* than its header and sits at the very end of the document.
 * `| Head 1 | Head 2 | Head 3 |` + `| --- |` is a finished three-column table,
 * but it is also the first cell of a hand-typed `| --- | --- | --- |`, and nothing
 * in the text tells them apart. So the table waits — but only in that exact
 * situation (`pendingDelimiterCompletion`: the caret is sitting at the end of
 * that row, writing it) and only until the idle timer pads the row, at which
 * point the column counts match and the question is gone.
 */
function tableIsReady(
  state: EditorState,
  block: { from: number; to: number },
  pending: { from: number } | null,
): boolean {
  if (!pending) return true;
  const header = state.doc.lineAt(block.from);
  if (header.number >= state.doc.lines) return false;
  return pending.from !== state.doc.line(header.number + 1).from;
}

/**
 * The completion a just-typed delimiter row needs, or `null`.
 *
 * Only when the caret sits at the end of a valid delimiter row that heads a real
 * table, is narrower than its header, and is the last line: the exact
 * "`| --- |` under a three-column header" moment this preview exists to serve.
 */
function pendingDelimiterCompletion(
  state: EditorState,
): { from: number; to: number; insert: string } | null {
  const { doc, selection } = state;
  if (!selection.main.empty) return null;
  const line = doc.lineAt(selection.main.head);
  if (selection.main.head !== line.to || line.number < 2) return null;
  if (!hasBalancedPipes(line.text)) return null;

  const header = doc.line(line.number - 1);
  if (!header.text.includes("|") || !hasBalancedPipes(header.text)) return null;

  const insert = completedDelimiterRow(
    line.text,
    splitTableRow(header.text).length,
  );
  return insert ? { from: line.from, to: line.to, insert } : null;
}

function buildTablePreviewDecorations(state: EditorState): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const pending = pendingDelimiterCompletion(state);
  // Read once, and hand it to the widget: the value decides both how the table
  // renders and whether CM treats a change to it as a different widget.
  const editable = state.facet(EditorView.editable) && !state.readOnly;

  for (const block of findTableBlocks(state.doc)) {
    if (!tableIsReady(state, block, pending)) continue;
    const text = state.doc.sliceString(block.from, block.to);
    if (!parseMarkdownTable(text)) continue;
    ranges.push(
      Decoration.replace({
        widget: new TablePreviewWidget(text, block.from, block.to, editable),
        block: true,
      }).range(block.from, block.to),
    );
  }

  return Decoration.set(ranges, true);
}

/**
 * Block decorations have to come from a state field, not a view plugin —
 * they change the document's vertical layout, which CodeMirror refuses to let a
 * plugin own ("Block decorations may not be specified via plugins").
 */
const tableDecorations = StateField.define<DecorationSet>({
  create: (state) => buildTablePreviewDecorations(state),
  update(decorations, tr) {
    // `reconfigured` is the lock toggling, which changes whether cells are
    // editable and so has to re-create the widget.
    if (tr.docChanged || tr.selection !== undefined || tr.reconfigured) {
      return buildTablePreviewDecorations(tr.state);
    }
    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

/**
 * Completes a delimiter row the user has stopped typing.
 *
 * A row that is still narrower than its header blocks rendering (see
 * `tableIsReady`), and the natural way to end it — pressing Enter — is one
 * keystroke the user should not have to know about. Padding the row after a
 * short pause turns `| --- |` under a three-column header into a real table the
 * moment they stop typing, while a row still being written never triggers it.
 */
class TableRowFinisher {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private alive = true;

  constructor(private readonly view: EditorView) {
    this.arm();
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.selectionSet || update.focusChanged) {
      this.arm();
    }
  }

  destroy() {
    this.alive = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private arm() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;

    const pending = pendingDelimiterCompletion(this.view.state);
    if (!pending) return;

    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.alive) return;
      const state = this.view.state;
      if (!state.facet(EditorView.editable) || state.readOnly) return;
      const current = pendingDelimiterCompletion(state);
      if (!current || current.from !== pending.from) return;
      this.view.dispatch({ changes: current });
    }, TABLE_COMPLETE_MS);
  }
}

/** The table block rendering, as a CodeMirror extension. */
export const tableLivePreview: Extension = [
  tableDecorations,
  ViewPlugin.fromClass(TableRowFinisher),
];

/** Whitespace that belongs to a marker rather than to the content. */
function markerEnd(doc: Text, from: number): number {
  let end = from;
  while (end < doc.length) {
    const char = doc.sliceString(end, end + 1);
    if (char !== " " && char !== "\t") break;
    end += 1;
  }
  return end;
}

/**
 * List items that begin with a task marker. Their bullet is replaced by the
 * checkbox, so the decision is needed *before* the walk that emits
 * decorations — hence the separate pass.
 */
function taskItems(view: EditorView): Set<number> {
  const items = new Set<number>();
  const ancestors: NodeRange[] = [];

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node: NodeRange) => {
        if (node.name === "TaskMarker") {
          const item = [...ancestors]
            .reverse()
            .find((ancestor) => ancestor.name === "ListItem");
          if (item) items.add(item.from);
        }
        ancestors.push({ name: node.name, from: node.from, to: node.to });
      },
      leave: () => {
        ancestors.pop();
      },
    });
  }

  return items;
}

function buildDecorations(view: EditorView): DecorationSet {
  const { state } = view;
  const { doc, selection } = state;
  const ranges: Range<Decoration>[] = [];

  // A note nobody is editing renders like a finished document: unfolding is
  // gated on focus, and a locked note (`editable` false) never unfolds at all.
  const revealEnabled = view.hasFocus && state.facet(EditorView.editable);

  const ancestors: NodeRange[] = [];
  const tasks = taskItems(view);

  const isRevealed = (context: RangeLike) =>
    revealEnabled && selectionTouches(selection, context.from, context.to);

  const decorate = (node: NodeRange) => {
    const rule = HIDE_RULES[node.name];

    if (rule) {
      const ancestorOf = (names: readonly string[]) => {
        for (let i = ancestors.length - 1; i >= 0; i -= 1) {
          if (names.includes(ancestors[i].name)) return ancestors[i];
        }
        return null;
      };
      const context = rule.context(node, { doc, ancestorOf });

      if (!context) return;

      if (isRevealed(context)) {
        ranges.push(SYNTAX.range(node.from, node.to));
        return;
      }

      const to = rule.swallowTrailingSpace ? markerEnd(doc, node.to) : node.to;
      const text = doc.sliceString(node.from, node.to);
      ranges.push(
        markerDecoration(node, text, { ancestorOf, tasks }).range(
          node.from,
          to,
        ),
      );
      return;
    }

    const heading = headingDecos[node.name];
    if (heading) {
      ranges.push(heading.range(node.from, node.to));
    } else if (node.name === "StrongEmphasis") {
      ranges.push(strongDeco.range(node.from, node.to));
    } else if (node.name === "Emphasis") {
      ranges.push(emphasisDeco.range(node.from, node.to));
    } else if (node.name === "Strikethrough") {
      ranges.push(strikethroughDeco.range(node.from, node.to));
    } else if (node.name === "InlineCode") {
      ranges.push(inlineCodeDeco.range(node.from, node.to));
    } else if (node.name === "Link") {
      ranges.push(linkDeco.range(node.from, node.to));
    } else if (node.name === "ListItem") {
      // Hanging indent: the marker sits in the indent, wrapped lines align
      // under the text (`.cm-live-list-item` in the theme).
      ranges.push(listItemLine.range(doc.lineAt(node.from).from));
    } else if (node.name === "Blockquote") {
      const first = doc.lineAt(node.from);
      const last = doc.lineAt(node.to);
      for (
        let lineNumber = first.number;
        lineNumber <= last.number;
        lineNumber += 1
      ) {
        ranges.push(quoteLine.range(doc.line(lineNumber).from));
      }
    } else if (node.name === "FencedCode") {
      const first = doc.lineAt(node.from);
      const last = doc.lineAt(node.to);
      const only = first.number === last.number;
      for (
        let lineNumber = first.number;
        lineNumber <= last.number;
        lineNumber += 1
      ) {
        const decoration = only
          ? codeBlockOnlyLine
          : lineNumber === first.number
            ? codeBlockFirstLine
            : lineNumber === last.number
              ? codeBlockLastLine
              : codeBlockLine;
        ranges.push(decoration.range(doc.line(lineNumber).from));
      }
    } else if (node.name === "HorizontalRule") {
      const line = doc.lineAt(node.from);
      if (isRevealed(line)) {
        ranges.push(SYNTAX.range(node.from, node.to));
      } else {
        ranges.push(RULE.range(node.from, node.to));
      }
    }
  };

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node: NodeRange) => {
        decorate(node);
        ancestors.push({ name: node.name, from: node.from, to: node.to });
      },
      leave: (node: NodeRange) => {
        if (
          ancestors.length > 0 &&
          ancestors[ancestors.length - 1].name === node.name
        ) {
          ancestors.pop();
        }
      },
    });
  }

  // `Decoration.set(..., true)` sorts (and merges) the collected ranges, so
  // the walk may emit nested ranges — a heading span, then the marks inside
  // it — in any order.
  return Decoration.set(ranges, true);
}

/** What a folded marker is drawn as (bullet, number, checkbox, nothing). */
function markerDecoration(
  node: NodeRange,
  text: string,
  {
    ancestorOf,
    tasks,
  }: {
    ancestorOf: (names: readonly string[]) => NodeRange | null;
    tasks: Set<number>;
  },
): Decoration {
  if (node.name === "TaskMarker") {
    return /[xX]/.test(text) ? TASK_CHECKED : TASK_UNCHECKED;
  }

  if (node.name === "ListMark") {
    const item = ancestorOf(["ListItem"]);
    // The checkbox replaces the bullet, so a task item gets no bullet.
    if (item && tasks.has(item.from)) return HIDDEN;
    const list = ancestorOf(["BulletList", "OrderedList"]);
    return list?.name === "OrderedList" ? orderedMarker(text) : BULLET;
  }

  return HIDDEN;
}

class LivePreviewPlugin {
  decorations: DecorationSet;
  /** Cached so a lock/unlock rebuilds even when no view update flag says so. */
  private revealEnabled: boolean;

  constructor(view: EditorView) {
    this.revealEnabled = view.hasFocus && view.state.facet(EditorView.editable);
    this.decorations = buildDecorations(view);
  }

  update(update: ViewUpdate) {
    const revealEnabled =
      update.view.hasFocus && update.view.state.facet(EditorView.editable);
    if (
      update.docChanged ||
      update.selectionSet ||
      update.viewportChanged ||
      update.focusChanged ||
      revealEnabled !== this.revealEnabled
    ) {
      this.revealEnabled = revealEnabled;
      this.decorations = buildDecorations(update.view);
    }
  }
}

/** The fold/unfold behaviour, as a CodeMirror extension. */
export const markdownLivePreviewPlugin = ViewPlugin.fromClass(
  LivePreviewPlugin,
  {
    decorations: (plugin: LivePreviewPlugin) => plugin.decorations,
  },
);

/**
 * Presentation for the live preview, deliberately kept in step with the
 * typography the capture surface applies to TipTap (Normal). Values are
 * expressed directly rather than as utility classes so the preview's look
 * cannot depend on Tailwind having scanned this folder.
 */
export const markdownLivePreviewTheme = EditorView.theme({
  ".cm-live-syntax": { color: "var(--muted-foreground)" },
  ".cm-live-h1": { fontSize: "1.5rem", lineHeight: "2rem", fontWeight: "500" },
  ".cm-live-h2": {
    fontSize: "1.25rem",
    lineHeight: "1.75rem",
    fontWeight: "500",
  },
  ".cm-live-h3": {
    fontSize: "1.125rem",
    lineHeight: "1.75rem",
    fontWeight: "500",
  },
  ".cm-live-strong": { fontWeight: "700" },
  ".cm-live-em": { fontStyle: "italic" },
  ".cm-live-strike": { textDecoration: "line-through" },
  ".cm-live-code": {
    fontFamily: "var(--font-geist-mono), monospace",
    fontSize: "0.9em",
    backgroundColor: "var(--muted)",
    borderRadius: "0.125rem",
    padding: "0.125rem 0.25rem",
  },
  ".cm-live-link": { color: "var(--primary)", textDecoration: "underline" },
  // These three set padding, which CodeMirror's base theme also sets on
  // `.cm-line` with the shorthand — the compound selector is what makes the
  // preview's insets win (equal-specificity rules are resolved by order, and
  // the base theme is not the loser).
  ".cm-line.cm-live-quote": {
    borderInlineStart: "2px solid var(--border)",
    paddingInlineStart: "1rem",
    color: "var(--muted-foreground)",
  },
  // List items: marker in the indent, wrapped lines aligned under the text.
  ".cm-line.cm-live-list-item": {
    paddingInlineStart: "1.5rem",
    textIndent: "-1.5rem",
  },
  // Markers are inline-blocks inside the list line, which carries the hanging
  // indent as `text-indent` — and `text-indent` inherits, so each marker has to
  // reset it or its own glyph is painted outside its box.
  ".cm-live-bullet": {
    display: "inline-block",
    inlineSize: "1.5rem",
    color: "var(--muted-foreground)",
    textIndent: "0",
  },
  ".cm-live-ordered-mark": {
    display: "inline-block",
    inlineSize: "1.5rem",
    color: "var(--muted-foreground)",
    textIndent: "0",
  },
  ".cm-live-task": {
    display: "inline-block",
    inlineSize: "1.5rem",
    textIndent: "0",
  },
  // `---` renders as the rule it means.
  ".cm-live-hr": {
    display: "inline-block",
    inlineSize: "100%",
    blockSize: "0",
    borderBlockStart: "1px solid var(--border)",
    verticalAlign: "middle",
  },
  // Fenced code: one muted block, monospace, no fence text.
  ".cm-line.cm-live-code-block": {
    backgroundColor: "var(--muted)",
    fontFamily: "var(--font-geist-mono), monospace",
    fontSize: "0.875rem",
    paddingInline: "0.75rem",
  },
  ".cm-live-code-block-first": {
    borderStartStartRadius: "0.375rem",
    borderStartEndRadius: "0.375rem",
  },
  ".cm-live-code-block-last": {
    borderEndStartRadius: "0.375rem",
    borderEndEndRadius: "0.375rem",
  },
  // GFM tables: the table is a block widget, so its look is defined by the
  // widget rules below rather than by `.cm-line` classes — the source lines it
  // replaces are not laid out at all.
  ".cm-live-table-wrapper": {
    position: "relative",
    overflowX: "auto",
    maxWidth: "100%",
    marginBlock: "0.75rem",
    outline: "none",
  },
  // The scroll container is focusable so a wide table can be scrolled by
  // keyboard, which is only discoverable if the focus ring is visible.
  ".cm-live-table-wrapper:focus-visible": {
    outline: "2px solid var(--ring)",
    outlineOffset: "2px",
    borderRadius: "0.375rem",
  },
  ".cm-live-table-toolbar": {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.125rem",
    marginBlockEnd: "0.25rem",
  },
  ".cm-live-table-tool": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "1.5rem",
    blockSize: "1.5rem",
    padding: "0",
    border: "1px solid transparent",
    borderRadius: "0.25rem",
    background: "transparent",
    color: "var(--muted-foreground)",
    cursor: "pointer",
  },
  ".cm-live-table-tool:hover": {
    backgroundColor: "var(--accent)",
    color: "var(--foreground)",
  },
  ".cm-live-table-tool:focus-visible": {
    outline: "2px solid var(--ring)",
    outlineOffset: "1px",
  },
  ".cm-live-table": {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.875rem",
  },
  ".cm-live-th": {
    border: "1px solid var(--border)",
    backgroundColor: "var(--muted)",
    padding: "0.5rem",
    fontWeight: "600",
    textAlign: "start",
  },
  ".cm-live-td": {
    border: "1px solid var(--border)",
    padding: "0.5rem",
    textAlign: "start",
  },
  // An empty cell has no line box, so the row would collapse to its padding —
  // an empty row reads as a thin sliver next to a filled one. An inline-block
  // pseudo-element gives the cell a line box (at the inherited line-height)
  // without adding content the user can select, edit, or delete.
  ".cm-live-th:empty::before, .cm-live-td:empty::before": {
    content: '""',
    display: "inline-block",
  },
  // A cell being edited shows its markdown source; the tint says "this is
  // source, not the rendered result" without moving the layout. The browser's
  // default focus ring is dropped because the tint is the focus affordance.
  ".cm-live-th:focus, .cm-live-td:focus": {
    outline: "none",
  },
  ".cm-live-cell-editing": {
    backgroundColor: "var(--accent)",
    boxShadow: "inset 0 0 0 2px var(--ring)",
    outline: "none",
  },
});
