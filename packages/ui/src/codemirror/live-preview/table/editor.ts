/**
 * One table cell's editor (F-15 Task 3.3 Rev 2, plan Task A.2).
 *
 * `OBS-1.14.4-TABLE-001` is the model: a table is **one editor per cell**, and
 * each of those editors holds the cell's **decoded** text (`\|` → `|`, a
 * line-break tag → a newline) rather than the source the document stores. This
 * class is that editor.
 *
 * ## Why a real `EditorView` and not `contenteditable`
 *
 * The previous implementation made each cell a `contenteditable` element and
 * hand-rolled caret placement, key handling and text extraction. That worked, but
 * a cell's content is markdown — `**bold**`, `` `code` ``, `[a](b)` — so the cell
 * wants the same inline rendering the document has, the same caret movement over
 * wrapped lines, and the same IME/composition handling. A nested `EditorView`
 * gives all three from one implementation, and `A.3` scopes its live preview to
 * the **inline** constructs so a cell never grows a block widget of its own.
 *
 * ## What it deliberately does not have
 *
 * - **No history.** Cells install no `history()` extension, so `undo` is a no-op
 *   inside a cell and `Mod-z` is refused locally and delegated through
 *   `onHistory`. Undo belongs to the document — one stack, the artifact's rule
 *   (`HIST-002`) — and the plan's chosen policy is that a `Mod-z` in a cell
 *   commits the cell edit and then undoes the write-back on the **outer** editor.
 * - **No default keymap.** `Tab`, `Enter` and the arrow keys are handled here, so
 *   binding CM's defaults as well would only give `Shift-Enter`, `Ctrl-A` and the
 *   rest a second, unowned meaning inside a cell.
 *
 * ## Event isolation
 *
 * The cell's DOM sits inside the outer editor's content DOM. Consuming a key here
 * (returning `true` from a `keymap` binding) is what keeps the outer editor from
 * seeing it — CodeMirror skips an event whose `defaultPrevented` is already set
 * (`eventBelongsToEditor`). The wrapper adds its own `stopPropagation` belt for
 * pointer and input events (`grid.tsx`), because those are not keymap-mediated.
 */

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState, type Extension } from "@codemirror/state";
import {
  EditorView,
  ViewPlugin,
  keymap,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import {
  cursorCharLeft,
  cursorCharRight,
  cursorLineDown,
  cursorLineUp,
} from "@codemirror/commands";
import { buildInlineDecorations } from "../decorations";

/** The direction a caret left the cell's edge. */
export type CellLeaveDirection = "left" | "right" | "up" | "down";

/** The kind of history action a cell delegates to the document. */
export type CellHistoryKind = "undo" | "redo";

/** What a cell editor tells its owner. Every handler is optional. */
export type CellEditorHandlers = {
  /** The cell's text changed. Fired once per document change, never per keystroke policy. */
  readonly onInput?: () => void;
  /** Tab (`backwards: false`) or Shift-Tab (`true`) was pressed. */
  readonly onTab?: (backwards: boolean) => void;
  /** Enter (without Shift) was pressed. */
  readonly onEnter?: () => void;
  /** Escape was pressed: the caller commits and hands focus back to the editor. */
  readonly onEscape?: () => void;
  /**
   * The caret reached a boundary and tried to move past it. Only fires when the
   * caret really sits at the edge — mid-cell arrows stay native, so a multi-line
   * cell scrolls its own lines before the selection leaves.
   */
  readonly onLeave?: (direction: CellLeaveDirection) => void;
  /**
   * `Mod-z` / `Mod-Shift-z` / `Mod-y`. The cell has no history of its own, so it
   * reports the request instead of acting on it.
   */
  readonly onHistory?: (kind: CellHistoryKind) => void;
};

/** The class the cell host carries, so the theme can reach the nested editor. */
export const CELL_EDITOR_CLASS = "cm-live-cell-editor";

/**
 * How long a cell waits after the last keystroke before the table is written.
 *
 * Editing a cell never touches the document per keystroke — that is what keeps
 * the widget (and the caret) alive. The write happens when the table is left, on
 * Escape, on a structural edit, and after this much idle time, so a note typed
 * into and then abandoned still reaches autosave.
 */
export const TABLE_IDLE_FLUSH_MS = 600;

/**
 * The editor mounted in each cell host.
 *
 * A write rebuilds the widget, which means the *new* grid owns the cell editors
 * and the old one is gone — yet the caret has to land back in the same cell. The
 * rebuilt DOM is reachable from the document, but its `CellEditor` instances are
 * not, so the host element itself carries the link.
 */
const editorsByHost = new WeakMap<HTMLElement, CellEditor>();

/** The cell editor mounted in `host`, if any (a rebuilt widget keeps the caret). */
export function cellEditorFor(host: HTMLElement): CellEditor | undefined {
  return editorsByHost.get(host);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * The cell's inline live preview (plan Task A.3).
 *
 * A cell is markdown, so `**bold**` and `` `code` `` should look the way they do
 * in the document — and unfold the same way when the caret touches them
 * (`REVEAL-001`/`-002`). What a cell must **not** get is the document's
 * block-level behaviour: a `#`, a `>`, a fence or a pipe block has to stay raw
 * source rather than becoming a widget inside a table cell. `buildInlineDecorations`
 * is the same walk scoped to `REVEAL-008`'s inline half, so the two can never
 * disagree about how `**bold**` looks.
 *
 * Mark decorations are fine from a plugin; only *block* decorations are refused
 * (which is why the document's preview keeps its block widgets in a `StateField`).
 * A cell has none, so a plain `ViewPlugin` is enough — and unlike the document's
 * preview it needs no pointer/composition deferral, because nothing it emits can
 * move text under the cursor.
 */
const inlineLivePreview: Extension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildInlineDecorations(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.focusChanged ||
        update.viewportChanged ||
        update.transactions.some((transaction) => transaction.reconfigured)
      ) {
        this.decorations = buildInlineDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

/**
 * The visual line around `pos`.
 *
 * `EditorView.lineBlockAt` answers with the line **block**, which is a visual
 * line: a wrapped line is several blocks. Before the view has measured (jsdom
 * never does) it can throw, and there the logical line is the visual line — so
 * the fallback is exact rather than approximate.
 */
function visualLineAt(
  view: EditorView,
  pos: number,
): { from: number; to: number } {
  try {
    const block = view.lineBlockAt(pos);
    if (block.to >= block.from) return { from: block.from, to: block.to };
  } catch {
    // Not measured yet: fall through to the logical line.
  }
  const line = view.state.doc.lineAt(pos);
  return { from: line.from, to: line.to };
}

/** One cell's editor: a scoped `EditorView` over the cell's decoded text. */
export class CellEditor {
  readonly view: EditorView;

  constructor(
    private readonly host: HTMLElement,
    text: string,
    private readonly handlers: CellEditorHandlers = {},
    editable = true,
  ) {
    host.classList.add(CELL_EDITOR_CLASS);
    this.view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: text,
        extensions: this.extensions(editable),
      }),
    });
    editorsByHost.set(host, this);
  }

  /** The cell's decoded text — what a commit encodes and writes to the model. */
  text(): string {
    return this.view.state.doc.toString();
  }

  /**
   * Replace the cell's text without touching any history.
   *
   * Only used when the model changed underneath the editor (a structural edit, or
   * a rebuild that reused the host). A no-op when the text already matches, so a
   * re-render cannot disturb a caret.
   */
  setText(text: string): void {
    if (text === this.text()) return;
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: text },
    });
  }

  /**
   * Focus the cell and put the caret at `offset` (the end by default).
   *
   * The selection is set before *and* after `focus()`: CodeMirror notices focus
   * during an update, so a single dispatch before focusing can be overwritten by
   * the focus transaction (the same jsdom quirk `callout/index.test.ts` records).
   */
  focus(offset?: number): void {
    const length = this.view.state.doc.length;
    const position = clamp(offset ?? length, 0, length);
    this.view.dispatch({ selection: { anchor: position } });
    this.view.focus();
    this.view.dispatch({ selection: { anchor: position } });
  }

  /** Tear the nested editor down. */
  destroy(): void {
    editorsByHost.delete(this.host);
    this.view.destroy();
  }

  // ------------------------------------------------------------- internals

  private extensions(editable: boolean): Extension[] {
    return [
      // The same GFM base the document uses (`editor-extensions.ts`): plain
      // `markdown()` defaults to **CommonMark**, which has no strikethrough and
      // no tables — so a cell would render `~~x~~` and a pipe block differently
      // from the document it sits in.
      markdown({ base: markdownLanguage }),
      inlineLivePreview,
      EditorView.lineWrapping,
      EditorView.editable.of(editable),
      keymap.of([
        { key: "Tab", run: () => this.runTab(false) },
        { key: "Shift-Tab", run: () => this.runTab(true) },
        { key: "Enter", run: () => this.run(this.handlers.onEnter) },
        { key: "Escape", run: () => this.run(this.handlers.onEscape) },
        {
          key: "ArrowLeft",
          run: () => this.runLeave("left"),
        },
        {
          key: "ArrowRight",
          run: () => this.runLeave("right"),
        },
        { key: "ArrowUp", run: () => this.runLeave("up") },
        { key: "ArrowDown", run: () => this.runLeave("down") },
        { key: "Mod-z", run: () => this.runHistory("undo") },
        { key: "Mod-Shift-z", run: () => this.runHistory("redo") },
        { key: "Mod-y", run: () => this.runHistory("redo") },
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) this.handlers.onInput?.();
      }),
    ];
  }

  /** Run a zero-argument handler, reporting whether it consumed the key. */
  private run(handler: (() => void) | undefined): boolean {
    if (!handler) return false;
    handler();
    return true;
  }

  private runTab(backwards: boolean): boolean {
    const handler = this.handlers.onTab;
    if (!handler) return false;
    handler(backwards);
    return true;
  }

  private runHistory(kind: CellHistoryKind): boolean {
    const handler = this.handlers.onHistory;
    if (!handler) return false;
    handler(kind);
    return true;
  }

  /**
   * Leave the cell only from the edge the arrow points past; otherwise move
   * the caret inside the cell.
   *
   * ## Why the in-cell half is handled here too
   *
   * A cell is a `contenteditable`, and an unhandled arrow key is the
   * **browser's** to perform — its motion walks out of the editing host into
   * the next cell's host, so `ArrowDown` in a header cell moved focus sideways
   * across the row and then out of the table (`@user`, 2026-10-23: "hitting
   * arrow down will jump over the table to bottom"). The motion commands from
   * `@codemirror/commands` keep it inside this editor, and returning `true`
   * stops the browser from doing anything else.
   *
   * A non-empty selection is still a move inside the cell: the command
   * collapses it by direction, exactly like the document editor.
   */
  private runLeave(direction: CellLeaveDirection): boolean {
    if (this.atEdge(direction) && this.handlers.onLeave) {
      this.handlers.onLeave(direction);
      return true;
    }
    return this.moveWithin(direction);
  }

  private moveWithin(direction: CellLeaveDirection): boolean {
    // An unmeasured view throws from inside the motion command's coordinate
    // lookup instead of answering `false`; both mean "the commands could not
    // move this caret".
    let moved: boolean;
    try {
      moved =
        direction === "left"
          ? cursorCharLeft(this.view)
          : direction === "right"
            ? cursorCharRight(this.view)
            : direction === "up"
              ? cursorLineUp(this.view)
              : cursorLineDown(this.view);
    } catch {
      moved = false;
    }
    if (moved) return true;
    // Before the view has measured — jsdom never does — the motion commands
    // cannot resolve a visual line. The cell's *logical* lines are the right
    // fallback there: a cell is a handful of lines, and an unmeasured one has
    // no wrapping to account for.
    return direction === "up" || direction === "down"
      ? this.moveLine(direction)
      : false;
  }

  /** Move to the previous/next logical line, keeping the column. */
  private moveLine(direction: "up" | "down"): boolean {
    const { doc, selection } = this.view.state;
    const head = selection.main.head;
    const line = doc.lineAt(head);
    const target = direction === "up" ? line.number - 1 : line.number + 1;
    if (target < 1 || target > doc.lines) return false;
    const column = head - line.from;
    const next = doc.line(target);
    this.view.dispatch({
      selection: { anchor: Math.min(next.from + column, next.to) },
    });
    return true;
  }

  /**
   * Does the caret sit on the edge the arrow points past?
   *
   * Left/Right are decoded offsets `0` and `length`. Up/Down ask whether the
   * caret's **visual line** is the cell's first or last one — not whether the
   * caret is at that line's boundary. A single-line cell is both its first and
   * its last visual line, so a vertical arrow leaves from anywhere in it (the
   * cell has nowhere else to move); a multi-line cell only leaves from its
   * outermost lines, which is what makes an interior arrow move inside it.
   */
  private atEdge(direction: CellLeaveDirection): boolean {
    const { doc, selection } = this.view.state;
    const range = selection.main;
    if (!range.empty) return false;
    const position = range.head;

    if (direction === "left") return position === 0;
    if (direction === "right") return position === doc.length;

    const line = visualLineAt(this.view, position);
    return direction === "up" ? line.from === 0 : line.to === doc.length;
  }
}
