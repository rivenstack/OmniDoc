/**
 * The table scanner, the completion timer and the table extension
 * (F-15 Rev 2, Task 1.4).
 *
 * Moved verbatim out of `markdown-live-preview.ts` — a pure move, no logic
 * change.
 *
 * ## Why the block decorations stay in a `StateField`
 *
 * The widget replaces a *block* of the document, which changes the document's
 * vertical layout. CodeMirror refuses to let a `ViewPlugin` own block
 * decorations ("Block decorations may not be specified via plugins"), so
 * `tableDecorations` is a `StateField` provided through
 * `EditorView.decorations.from(field)`. That is a CodeMirror rule, not a
 * preference: moving this into a plugin throws at runtime.
 */

import {
  EditorState,
  Prec,
  StateField,
  type Extension,
  type Range,
  type Text,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  keymap,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import {
  completedDelimiterRow,
  fenceMarker,
  hasBalancedPipes,
  isTableDelimiterRow,
  parseMarkdownTable,
  splitTableRow,
} from "../../../markdown/table";
import {
  TablePreviewWidget,
  focusTableRenderedCell,
  leaveTableRenderedAfter,
} from "./widget";
import {
  redirectTableCaret,
  tableCaretRegion,
  type CaretTravelDirection,
  type TableCaretArrival,
} from "./selection";

/**
 * The fence character of a code fence line, or `null`.
 *
 * A pipe table inside a fence is code, so the scan below has to know where
 * fences are; the rule is shared with the persistence normalizer.
 */
export function fenceChar(line: string): string | null {
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
 * What a caret position means for one rendered table block.
 *
 * `"cell"` redirects into the grid; `"leave-after"` creates the trailing line a
 * last-block table needs (see `tableCaretRegion`).
 */
type RenderedTable =
  | { readonly kind: "cell"; readonly from: number; readonly to: number }
  | { readonly kind: "leave-after"; readonly from: number; readonly to: number };

/**
 * The rendered table block that covers `pos`, if any.
 *
 * Read from the decoration field rather than from `findTableBlocks`: a block
 * that is deliberately *not* rendered (the half-typed delimiter row, a block
 * that no longer parses) must not redirect the caret, because there is no grid
 * to redirect into. Reading the field is also what guarantees the observer and
 * the widget agree about which tables are on screen.
 *
 * The boundary itself is `tableCaretRegion` (pure, unit-tested): interior
 * positions redirect into a cell, and `pos === to` redirects when a following
 * line exists but asks for a trailing line when the table is the document's last
 * block. Matching `to` unconditionally is what broke entering the table from
 * below; matching `to` never is what broke clicking after a last-block table
 * (`@user`, 2026-10-23).
 */
function renderedTableAt(
  state: EditorState,
  pos: number,
  arrival: TableCaretArrival,
): RenderedTable | null {
  const decorations = state.field(tableDecorations, false);
  if (!decorations) return null;
  const docLength = state.doc.length;

  for (let iter = decorations.iter(); iter.value; iter.next()) {
    if (!(iter.value.spec.widget instanceof TablePreviewWidget)) continue;

    const region = tableCaretRegion(iter.from, iter.to, docLength, pos, arrival);
    if (region === null) continue;
    if (region === "leave-after") {
      return { kind: "leave-after", from: iter.from, to: iter.to };
    }
    return { kind: "cell", from: iter.from, to: iter.to };
  }
  return null;
}

/**
 * RTL readiness for the redirect's fallback column.
 *
 * The locale resolution is not built yet (plan §4.8: `en`/LTR is the only
 * shipping locale), so this reads the direction the DOM already carries — a
 * computed `direction: rtl` or a `dir="rtl"` ancestor — instead of inventing a
 * second locale authority. When the locale layer lands, it sets `dir` and this
 * becomes correct without a change.
 */
function isRtlContext(view: EditorView): boolean {
  if (typeof getComputedStyle === "function") {
    if (getComputedStyle(view.dom).direction === "rtl") return true;
  }
  return view.dom.closest('[dir="rtl"]') !== null;
}

/**
 * The rendered table block that ends on the line just above `line`, or `null`.
 *
 * A block replacement has no document positions of its own, so CodeMirror's
 * vertical motion treats it as **zero lines**: ArrowUp from the line below the
 * table jumps straight to the line *above* it, and ArrowDown from above jumps
 * below — the caret never lands in the hidden range, so the selection observer
 * never sees it (`@user`, 2026-10-23: entering the table only worked with
 * Left/Right). The two keys have to be answered before CodeMirror moves.
 */
function renderedTableAbove(
  state: EditorState,
  line: { from: number; to: number; number: number },
): { from: number; to: number } | null {
  if (line.number <= 1) return null;
  const previous = state.doc.line(line.number - 1);
  const decorations = state.field(tableDecorations, false);
  if (!decorations) return null;
  for (let iter = decorations.iter(); iter.value; iter.next()) {
    if (!(iter.value.spec.widget instanceof TablePreviewWidget)) continue;
    if (iter.to === previous.to) return { from: iter.from, to: iter.to };
  }
  return null;
}

/** The rendered table block that starts on the line just below `line`. */
function renderedTableBelow(
  state: EditorState,
  line: { from: number; to: number; number: number },
): { from: number; to: number } | null {
  if (line.number >= state.doc.lines) return null;
  const next = state.doc.line(line.number + 1);
  const decorations = state.field(tableDecorations, false);
  if (!decorations) return null;
  for (let iter = decorations.iter(); iter.value; iter.next()) {
    if (!(iter.value.spec.widget instanceof TablePreviewWidget)) continue;
    if (iter.from === next.from) return { from: iter.from, to: iter.to };
  }
  return null;
}

/**
 * `TABLE-007`: a caret that landed in a rendered table's hidden range goes into
 * a cell instead of unfolding the source.
 *
 * ## Why the work is deferred
 *
 * Focusing a cell means focusing a **nested** `EditorView`, which dispatches a
 * selection transaction. Doing that from `update()` would throw
 * "Calls to EditorView.update are not allowed while an update is in progress" —
 * the same rule the widget's write-back follows (`widget.ts`). So the observer
 * only records the intent here and hands it to a `setTimeout(0)` task; the timer
 * re-checks the caret because the document may have changed in between. The one
 * document write it can cause — the trailing line a last-block table needs — is
 * delegated to the widget, which owns the block range, and also happens on this
 * deferred task.
 *
 * The observer also requires the outer view to have focus: a programmatic
 * selection change from somewhere else (opening a note, restoring a draft) must
 * not steal the caret into a table cell. The direction is read from the
 * transaction's own start state, so no extra bookkeeping is needed.
 */
class TableCaretRedirector {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: {
    table: RenderedTable;
    head: number;
    direction: CaretTravelDirection;
    pointer: boolean;
  } | null = null;
  private alive = true;

  constructor(private readonly view: EditorView) {}

  update(update: ViewUpdate) {
    if (!update.selectionSet) return;
    const selection = update.state.selection.main;
    if (!selection.empty) return;
    if (!update.view.hasFocus) return;

    // A caret that moved backwards came from below; anything else (a click, a
    // fresh selection) is treated as entering from above.
    const direction: CaretTravelDirection =
      selection.head < update.startState.selection.main.head ? "up" : "down";
    // A pointer selection has no direction to give — see `redirectTableCaret`.
    const pointer = update.transactions.some((tr) =>
      tr.isUserEvent("select.pointer"),
    );

    const table = renderedTableAt(update.state, selection.head, {
      direction,
      pointer,
    });
    if (!table) return;

    this.pending = { table, head: selection.head, direction, pointer };
    this.schedule();
  }

  destroy() {
    this.alive = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pending = null;
  }

  private schedule() {
    if (this.timer !== null) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.run();
    }, 0);
  }

  /** Focus the cell (or create the trailing line) the deferred caret resolved to. */
  private run() {
    const pending = this.pending;
    this.pending = null;
    if (!this.alive || !pending) return;

    const view = this.view;
    const selection = view.state.selection.main;
    // The caret moved again, or a rebuild happened, while the task waited: the
    // intent is stale and must not yank focus out of wherever it is now.
    if (!selection.empty || selection.head !== pending.head) return;

    // Below a last-block table there is no line to put the caret on. The widget
    // owns the block's range and the `written` latch, so the write stays in one
    // place; this call already runs outside a CodeMirror update (the timer).
    if (pending.table.kind === "leave-after") {
      leaveTableRenderedAfter(view, pending.table.from);
      return;
    }

    const { from, to } = pending.table;
    const target = redirectTableCaret({
      source: view.state.doc.sliceString(from, to),
      from,
      caret: pending.head,
      direction: pending.direction,
      rtl: isRtlContext(view),
      pointer: pending.pointer,
    });
    if (!target) return;

    focusTableRenderedCell(view, from, target, target.offset);
  }
}

/**
 * The rendered table that ends exactly at `pos`, when that is the document's
 * end, or `null`.
 *
 * After the trailing line is deleted — or on a note saved with a table as its
 * last block — the caret sits at the block's `to`, which is the document's end.
 * There is no line below, no document position to move to, and the caret cannot
 * change, so the selection observer never runs. This is the keyboard half of the
 * click target the grid's tail strip provides (C.2, `@user` 2026-10-23).
 */
function renderedTableEndingAt(state: EditorState, pos: number): number | null {
  if (pos !== state.doc.length) return null;
  const decorations = state.field(tableDecorations, false);
  if (!decorations) return null;

  for (let iter = decorations.iter(); iter.value; iter.next()) {
    if (!(iter.value.spec.widget instanceof TablePreviewWidget)) continue;
    if (iter.to === pos) return iter.from;
  }
  return null;
}

/**
 * The table-crossing keys, at high precedence so they run **before** the
 * document keymap's own motion.
 *
 * Three cases, all of them positions the selection observer can never see
 * because no selection transaction with a caret *inside* the block is ever
 * produced:
 *
 * - `ArrowUp` on the line below a rendered table → the last row;
 * - `ArrowDown` on the line above a rendered table → the header row;
 * - `ArrowDown` / `ArrowRight` at the document's end after a last-block table →
 *   the trailing line (there is nowhere else for the caret to go).
 *
 * This has to be a keymap binding rather than a `domEventHandlers` entry: the
 * default keymap still runs after a DOM handler has called `preventDefault`,
 * and its vertical motion would move the caret to the table's last line end,
 * which a position match then resolves to the *last column* (`@user` saw
 * `ArrowDown` land in the wrong cell). `Prec.high` makes this answer first.
 */
const tableAdjacentKeys: Extension = Prec.high(
  keymap.of([
    {
      key: "ArrowUp",
      run: (view) => enterAdjacentTable(view, "up"),
    },
    {
      key: "ArrowDown",
      run: (view) => enterAdjacentTable(view, "down") || leaveTableAtEnd(view),
    },
    {
      key: "ArrowRight",
      run: (view) => leaveTableAtEnd(view),
    },
  ]),
);

/** `ArrowDown` / `ArrowRight` when the caret already sits at the document end. */
function leaveTableAtEnd(view: EditorView): boolean {
  const selection = view.state.selection.main;
  if (!selection.empty) return false;
  const from = renderedTableEndingAt(view.state, selection.head);
  if (from === null) return false;
  leaveTableRenderedAfter(view, from);
  return true;
}

/** `ArrowUp` / `ArrowDown` on the line just outside a rendered table. */
function enterAdjacentTable(
  view: EditorView,
  direction: CaretTravelDirection,
): boolean {
  const selection = view.state.selection.main;
  if (!selection.empty) return false;
  const line = view.state.doc.lineAt(selection.head);
  const block =
    direction === "up"
      ? renderedTableAbove(view.state, line)
      : renderedTableBelow(view.state, line);
  if (!block) return false;

  const cell = redirectTableCaret({
    source: view.state.doc.sliceString(block.from, block.to),
    from: block.from,
    // The endpoint the key is aiming for; the direction then picks the row.
    caret: direction === "up" ? block.to : block.from,
    direction,
    rtl: isRtlContext(view),
  });
  if (!cell) return false;

  focusTableRenderedCell(view, block.from, cell, cell.offset);
  return true;
}

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
  ViewPlugin.fromClass(TableCaretRedirector),
  tableAdjacentKeys,
];
