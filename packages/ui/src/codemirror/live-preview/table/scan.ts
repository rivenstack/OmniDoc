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
 *
 * ## Why the scan is windowed, and why the window comes from a view
 *
 * `findTableBlocks` reads every line, so the decoration field rebuilt on every
 * keystroke paid the whole document (F-15 C-1, plan Task E.1). The scan is now
 * bounded by line windows held in `tableScanWindowsField`; the decoration
 * builder only walks those. The window itself has to be *observed* from the
 * view — `view.visibleRanges` is the only honest source of "what is on screen".
 *
 * A `ViewPlugin` may observe, but it still may not own block decorations (the
 * rule above), so the split is: the plugin watches the viewport and dispatches
 * `setTableScanWindows`; the state field rebuilds the decorations from the
 * windows the transaction carries. The plugin cannot dispatch from its
 * constructor either (`Calls to EditorView.update are not allowed while an
 * update is in progress` — CodeMirror catches the throw and leaves the field
 * unchanged), and `ViewPlugin.update` is not called at construction. The first
 * window is therefore delivered by a deferred `setTimeout(0)` task. Until that
 * task runs, the state field starts with a bounded bootstrap window (the first
 * `TABLE_SCAN_BOOTSTRAP_LINES` lines), which is also what keeps a short note's
 * first paint identical to the full scan.
 *
 * ## Bounds that are honest
 *
 * - Fence state before a window's first line is reconstructed from at most
 *   `TABLE_FENCE_LOOKBACK_LINES` lines. If the lookback reaches line 1 it is
 *   exact; an opening fence further back is a documented bounded
 *   approximation for that off-window start (the start is treated as unfenced).
 * - A table that straddles a window start is walked back to its header and
 *   consumed whole, so a block is never cut in half. That walk is bounded by
 *   the contiguous pipe-bearing run it sits in — the table itself for any real
 *   table. A pathological document made entirely of pipe-bearing prose is the
 *   one case where the run is longer than the table; even there the walk is a
 *   run, not an unconditional full-document scan.
 */

import {
  EditorState,
  Facet,
  Prec,
  StateEffect,
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
  deleteTableRendered,
  focusTableRenderedCell,
  leaveTableRenderedAfter,
  selectWholeTableRendered,
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
  // One window over the whole document is the same line loop the scanner has
  // always run, so this public result is unchanged (E.1). Callers that need
  // every table — `callout/commands.ts` — keep getting every table; only the
  // preview's decoration field uses the bounded windows.
  return findTableBlocksInWindows(doc, [{ fromLine: 1, toLine: doc.lines }]);
}

// ------------------------------------------------------ E.1 viewport windows

/** A 1-based, inclusive line window the scanner may examine. */
export type TableScanWindow = {
  readonly fromLine: number;
  readonly toLine: number;
};

/** How far beyond the viewport a window reaches, in lines. */
export const TABLE_SCAN_MARGIN_LINES = 200;

/**
 * The window the decoration field starts with, before the viewport observer's
 * first deferred task runs.
 *
 * Deliberate deviation, recorded for E.1: a note longer than this initially
 * renders tables only in these lines; the observer widens the window to the real
 * viewport on its next task. A note at or under this size is fully covered, and
 * because the margin is at least as large, the observer computes the same
 * window and dispatches nothing — which is what keeps the existing "mount and
 * assert the widget" tests byte-identical.
 */
export const TABLE_SCAN_BOOTSTRAP_LINES = 200;

/**
 * How far back a window may look to reconstruct fence state.
 *
 * Exact when the lookback reaches line 1. Past that the window start is treated
 * as unfenced: a code fence opened further than this above the window is a
 * documented bounded approximation, not a claim of correctness. No silent
 * full-document walk hides here.
 */
export const TABLE_FENCE_LOOKBACK_LINES = 200;

/**
 * Turn document ranges into margin-expanded, clamped, merged line windows.
 *
 * Pure on purpose: jsdom has no layout, so its `visibleRanges` cannot stand in
 * for a small browser viewport (it reports a default top window or the whole
 * document, depending on when it is read). The planner is unit-tested directly
 * and the browser path feeds it the same `view.visibleRanges` shape.
 */
export function tableScanWindows(
  doc: Text,
  ranges: readonly { readonly from: number; readonly to: number }[],
  marginLines = TABLE_SCAN_MARGIN_LINES,
): TableScanWindow[] {
  const margin = Math.max(0, Math.trunc(marginLines));
  const windows: TableScanWindow[] = [];

  for (const range of ranges) {
    const from = Math.max(0, Math.min(range.from, doc.length));
    const to = Math.max(from, Math.min(range.to, doc.length));
    const fromLine = doc.lineAt(from).number;
    const toLine = doc.lineAt(to).number;
    windows.push({
      fromLine: Math.max(1, fromLine - margin),
      toLine: Math.min(doc.lines, toLine + margin),
    });
  }

  return mergeTableScanWindows(windows);
}

/** Sort and merge overlapping or adjacent windows. */
function mergeTableScanWindows(
  windows: readonly TableScanWindow[],
): TableScanWindow[] {
  const sorted = windows
    .map((window) => ({
      fromLine: Math.trunc(window.fromLine),
      toLine: Math.trunc(window.toLine),
    }))
    .filter((window) => window.toLine >= window.fromLine)
    .sort((a, b) => a.fromLine - b.fromLine || a.toLine - b.toLine);

  const merged: TableScanWindow[] = [];
  for (const window of sorted) {
    const previous = merged[merged.length - 1];
    if (previous && window.fromLine <= previous.toLine + 1) {
      merged[merged.length - 1] = {
        fromLine: previous.fromLine,
        toLine: Math.max(previous.toLine, window.toLine),
      };
    } else {
      merged.push(window);
    }
  }
  return merged;
}

/** Clamp effect-provided windows to a (possibly edited) document. */
function clampTableScanWindows(
  doc: Text,
  windows: readonly TableScanWindow[],
): TableScanWindow[] {
  return mergeTableScanWindows(
    windows.map((window) => ({
      fromLine: Math.min(Math.max(1, Math.trunc(window.fromLine)), doc.lines),
      toLine: Math.min(Math.max(1, Math.trunc(window.toLine)), doc.lines),
    })),
  );
}

/** The bounded first window, before the viewport observer has spoken. */
function bootstrapTableScanWindows(doc: Text): TableScanWindow[] {
  return [
    { fromLine: 1, toLine: Math.min(doc.lines, TABLE_SCAN_BOOTSTRAP_LINES) },
  ];
}

/** One table block: header start through the last pipe-bearing body line end. */
type TableBlock = { from: number; to: number };

type VisitLine = (lineNumber: number) => void;

/** A visitor that never reports the same line twice within one scan. */
function uniqueVisitor(onVisit?: VisitLine): VisitLine {
  const seen = new Set<number>();
  return (lineNumber) => {
    if (seen.has(lineNumber)) return;
    seen.add(lineNumber);
    onVisit?.(lineNumber);
  };
}

/**
 * Fence state immediately before `lineNumber`, looking back at most
 * `TABLE_FENCE_LOOKBACK_LINES` lines.
 *
 * `visit` sees every line read, the lookback included: the E.1 counter bounds
 * the whole scan, not just its forward loop.
 */
function fenceStateBefore(
  doc: Text,
  lineNumber: number,
  visit: VisitLine,
): string | null {
  const start = Math.max(1, lineNumber - TABLE_FENCE_LOOKBACK_LINES);
  let fence: string | null = null;
  for (let n = start; n < lineNumber; n += 1) {
    visit(n);
    const marker = fenceChar(doc.line(n).text);
    if (marker) {
      fence = fence === null ? marker : fence === marker ? null : fence;
    }
  }
  return fence;
}

/**
 * The table that contains a window's first line, if the window starts inside a
 * table body.
 *
 * A window may begin at any line — two merged viewports can leave a gap in the
 * middle of a long table. Walking back over the contiguous pipe-bearing run and
 * choosing the *first* header/delimiter pair finds the same block a full scan
 * would, then the caller consumes its entire body: a table is never cut in
 * half. The walk is bounded by the contiguous pipe-bearing run — the table
 * itself for a real table — not the document, because it stops at the first
 * line that carries no pipe.
 */
function tableStraddlingWindowStart(
  doc: Text,
  fromLine: number,
  fence: string | null,
  visit: VisitLine,
): { block: TableBlock; endLine: number } | null {
  if (fromLine <= 1 || fence !== null) return null;
  if (!doc.line(fromLine).text.includes("|")) return null;

  let runStart = fromLine;
  while (runStart > 1 && doc.line(runStart - 1).text.includes("|")) {
    runStart -= 1;
    visit(runStart);
  }
  if (runStart === fromLine) return null;

  // The first valid header is the one the full scan would have used: it
  // consumes every later pipe line as body, so a later candidate cannot be a
  // second table.
  for (let headerLine = runStart; headerLine < fromLine; headerLine += 1) {
    visit(headerLine);
    const header = doc.line(headerLine);
    if (!header.text.includes("|") || !hasBalancedPipes(header.text)) continue;

    const delimiter = doc.line(headerLine + 1);
    if (
      !isTableDelimiterRow(delimiter.text) ||
      !hasBalancedPipes(delimiter.text)
    ) {
      continue;
    }

    let last = headerLine + 1;
    let next = headerLine + 2;
    while (next <= doc.lines) {
      visit(next);
      if (!doc.line(next).text.includes("|")) break;
      last = next;
      next += 1;
    }
    if (last < fromLine) continue;

    return {
      block: { from: header.from, to: doc.line(last).to },
      endLine: last,
    };
  }
  return null;
}

/**
 * Every table block that intersects one of `windows`, in document order.
 *
 * Extension-internal seam for E.1's structural tests; `findTableBlocks` is the
 * public full-document entry point. `onVisit` sees every line the scanner reads
 * — forward lines, fence lookback, and straddle walk — at most once per line.
 */
export function findTableBlocksInWindows(
  doc: Text,
  windows: readonly TableScanWindow[],
  onVisit?: VisitLine,
): Array<{ from: number; to: number }> {
  const blocks: TableBlock[] = [];
  const visit = uniqueVisitor(onVisit);
  const ordered = [...windows].sort(
    (a, b) => a.fromLine - b.fromLine || a.toLine - b.toLine,
  );
  // A table found beyond a window's `toLine` (the body of a straddling block)
  // must not be emitted again when the next window reaches it.
  let lastBlockTo = -1;

  for (const window of ordered) {
    const fromLine = Math.min(
      Math.max(1, Math.trunc(window.fromLine)),
      doc.lines,
    );
    const toLine = Math.min(Math.max(1, Math.trunc(window.toLine)), doc.lines);
    if (toLine < fromLine) continue;

    let fence = fenceStateBefore(doc, fromLine, visit);
    let lineNumber = fromLine;

    const straddle = tableStraddlingWindowStart(doc, fromLine, fence, visit);
    if (straddle) {
      if (straddle.block.from > lastBlockTo) {
        blocks.push(straddle.block);
        lastBlockTo = straddle.block.to;
      }
      lineNumber = straddle.endLine + 1;
    }

    for (; lineNumber <= toLine; lineNumber += 1) {
      visit(lineNumber);
      const line = doc.line(lineNumber);
      const marker = fenceChar(line.text);
      if (marker) {
        fence = fence === null ? marker : fence === marker ? null : fence;
        continue;
      }
      if (fence !== null || lineNumber < 2) continue;

      const headerLine = lineNumber - 1;
      visit(headerLine);
      const header = doc.line(headerLine);
      if (!header.text.includes("|") || !hasBalancedPipes(header.text)) {
        continue;
      }
      if (!isTableDelimiterRow(line.text) || !hasBalancedPipes(line.text)) {
        continue;
      }

      let last = lineNumber;
      let next = lineNumber + 1;
      while (next <= doc.lines) {
        visit(next);
        if (!doc.line(next).text.includes("|")) break;
        last = next;
        next += 1;
      }

      const block = { from: header.from, to: doc.line(last).to };
      if (block.from > lastBlockTo) {
        blocks.push(block);
        lastBlockTo = block.to;
      }
      lineNumber = last;
    }
  }

  return blocks;
}

/**
 * Structural instrumentation for E.1's tests.
 *
 * The decoration builder reads this facet and hands the combined observer to the
 * scanner. Production installs nothing, so the observer is a no-op there; the
 * tests count visited lines without a wall-clock assertion.
 */
export const tableScanObserver = Facet.define<
  (lineNumber: number) => void,
  (lineNumber: number) => void
>({
  combine: (observers) => (lineNumber) => {
    for (const observer of observers) observer(lineNumber);
  },
});

/**
 * Replace the set of line windows the decoration field scans.
 *
 * The viewport observer below is the only production dispatcher; tests use the
 * effect directly to drive a window, because jsdom's layout does not model a
 * real small viewport.
 */
export const setTableScanWindows =
  StateEffect.define<readonly TableScanWindow[]>();

/**
 * The windows the table scanner may examine.
 *
 * Declared before `tableDecorations` in `tableLivePreview` so the decoration
 * field's update can read the effect's value from `tr.state`; that ordering is
 * part of the contract, not an accident.
 */
export const tableScanWindowsField = StateField.define<
  readonly TableScanWindow[]
>({
  create: (state) => bootstrapTableScanWindows(state.doc),
  update(windows, transaction) {
    let requested: readonly TableScanWindow[] | null = null;
    for (const effect of transaction.effects) {
      if (effect.is(setTableScanWindows)) requested = effect.value;
    }
    if (requested === null && !transaction.docChanged) return windows;
    // Windows are line numbers, not document positions, so an edit above the
    // viewport is not mapped here. The clamp keeps the scan inside the document
    // until the viewport observer re-plans on its next task; the intervening
    // rebuild may briefly cover a neighbouring line, but never the whole
    // document.
    return clampTableScanWindows(transaction.state.doc, requested ?? windows);
  },
});

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
  const windows =
    state.field(tableScanWindowsField, false) ??
    bootstrapTableScanWindows(state.doc);

  for (const block of findTableBlocksInWindows(
    state.doc,
    windows,
    state.facet(tableScanObserver),
  )) {
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
    // A window effect is the viewport observer speaking (E.1): it changes which
    // blocks are in scope, so the set must be rebuilt even though the document
    // did not change. `reconfigured` is the lock toggling, which changes whether
    // cells are editable and so has to re-create the widget.
    const windowsChanged = tr.effects.some((effect) =>
      effect.is(setTableScanWindows),
    );
    if (
      tr.docChanged ||
      tr.selection !== undefined ||
      tr.reconfigured ||
      windowsChanged
    ) {
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
  | {
      readonly kind: "leave-after";
      readonly from: number;
      readonly to: number;
    };

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

    const region = tableCaretRegion(
      iter.from,
      iter.to,
      docLength,
      pos,
      arrival,
    );
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
    {
      // B-6. The bare key has no modifiers, so a `Shift-Backspace` or a
      // `Mod-Backspace` never reaches this binding (CodeMirror matches the
      // modifier set exactly) and keeps its native meaning.
      key: "Backspace",
      run: (view) => tableBackspaceAfterTable(view),
    },
  ]),
);

/**
 * B-6: Backspace at the start of the line immediately after a rendered table.
 *
 * Two presses, one binding:
 *
 * 1. the table has no whole-table range yet → **select** every cell (a view
 *    selection; the document is not touched, so there is nothing to write);
 * 2. the grid has marked the wrapper `data-table-selected` → **delete** the
 *    table through the widget's own removal path (block + preceding newline,
 *    caret in the outer editor).
 *
 * Any other Backspace returns `false` so CodeMirror's default applies: the
 * binding is a narrow answer to one position, not an override of the key. That
 * includes a non-empty selection, a caret anywhere but offset 0 of that line,
 * and the line above the table.
 */
function tableBackspaceAfterTable(view: EditorView): boolean {
  const state = view.state;
  // A locked note renders the table but has nothing to select or delete.
  if (state.readOnly || !state.facet(EditorView.editable)) return false;

  const selection = state.selection.main;
  if (!selection.empty) return false;

  const line = state.doc.lineAt(selection.head);
  if (selection.head !== line.from) return false;

  const block = renderedTableAbove(state, line);
  if (!block) return false;

  const wrapper = view.dom.querySelector<HTMLElement>(
    `.cm-live-table-wrapper[data-table-from="${block.from}"]`,
  );
  if (!wrapper) return false;

  if (wrapper.dataset.tableSelected === "true") {
    return deleteTableRendered(view, block.from);
  }
  return selectWholeTableRendered(view, block.from);
}

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
 * The viewport half of E.1.
 *
 * `view.visibleRanges` is the only honest source of "what is on screen", and a
 * state field cannot read a view. This plugin therefore observes the viewport
 * and hands the planned windows to `tableScanWindowsField`; the field keeps
 * owning the block decorations (the CodeMirror rule at the top of the file).
 *
 * ## Why the first task is deferred
 *
 * A `ViewPlugin` may not dispatch from its constructor: CodeMirror is mid-update
 * (`Calls to EditorView.update are not allowed while an update is in progress`),
 * catches the throw and leaves the field unchanged. `ViewPlugin.update` is also
 * not called at construction. So construction — and every later viewport or
 * document change — only schedules one `setTimeout(0)`; the task reads the
 * settled view, compares content, and dispatches only when the window really
 * changed.
 *
 * Identical windows (every note at or under the bootstrap size, and any
 * unchanged viewport) are a no-op, which is what keeps the observer from
 * rebuilding in a loop.
 */
class TableViewportScanner {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private alive = true;

  constructor(private readonly view: EditorView) {
    this.schedule();
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) this.schedule();
  }

  destroy() {
    this.alive = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private schedule() {
    if (this.timer !== null) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.sync();
    }, 0);
  }

  private sync() {
    if (!this.alive) return;
    const view = this.view;
    // An unmeasured view can report no ranges; keeping the bootstrap window is
    // the safe answer, not an empty set that would blank every table.
    if (view.visibleRanges.length === 0) return;

    const next = tableScanWindows(view.state.doc, view.visibleRanges);
    const current = view.state.field(tableScanWindowsField, false);
    if (current && sameTableScanWindows(current, next)) return;

    view.dispatch({ effects: setTableScanWindows.of(next) });
  }
}

/** Content equality: the planner builds fresh objects on every call. */
function sameTableScanWindows(
  a: readonly TableScanWindow[],
  b: readonly TableScanWindow[],
): boolean {
  return (
    a.length === b.length &&
    a.every(
      (window, index) =>
        window.fromLine === b[index].fromLine &&
        window.toLine === b[index].toLine,
    )
  );
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
  // The windows field first: `tableDecorations` reads it during its own update
  // on a `setTableScanWindows` transaction (E.1).
  tableScanWindowsField,
  tableDecorations,
  ViewPlugin.fromClass(TableRowFinisher),
  ViewPlugin.fromClass(TableCaretRedirector),
  ViewPlugin.fromClass(TableViewportScanner),
  tableAdjacentKeys,
];
