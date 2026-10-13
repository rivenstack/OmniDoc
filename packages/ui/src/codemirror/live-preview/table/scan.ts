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
  StateField,
  type Extension,
  type Range,
  type Text,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
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
import { TablePreviewWidget } from "./widget";

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
