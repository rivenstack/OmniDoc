// Viewport-bounded table scanning — F-15 C-1, plan Task E.1.
//
// The claim under test is **structural**, not temporal: the scanner may only
// read the lines in the planned window (plus its fence lookback and any table
// that straddles the window start), never the whole 5,000-line document. No
// test here asserts a wall-clock duration.
//
// jsdom has no layout, so `view.visibleRanges` cannot stand in for a small
// viewport (it reports a default top window or the whole document, depending on
// when it is read). The pure planner (`tableScanWindows`) is therefore
// unit-tested directly, and the view tests drive `setTableScanWindows` to
// simulate a viewport change. The observer plugin's own 0 ms task is left
// un-advanced (fake timers) so it cannot masquerade as the keystroke's scan.

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState, Text, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHarness, type EditorHarness } from "../../parity/harness";
import {
  TABLE_COMPLETE_MS,
  TABLE_FENCE_LOOKBACK_LINES,
  TABLE_SCAN_BOOTSTRAP_LINES,
  TABLE_SCAN_MARGIN_LINES,
  findTableBlocks,
  findTableBlocksInWindows,
  setTableScanWindows,
  tableLivePreview,
  tableScanObserver,
  tableScanWindows,
  tableScanWindowsField,
} from "./scan";

const LANGUAGE = markdown({ base: markdownLanguage });

/** Filler that cannot be mistaken for a table, a fence, or a delimiter. */
const FILLER = "Filler prose with no table syntax at all.";

/** Header, delimiter and one body row: the block's three source lines. */
const TABLE_ROWS = ["| Head A | Head B |", "| --- | --- |", "| one | two |"];

/** The near table plus two far ones, outside any small window. */
const FIXTURE_TABLES = [1, 2500, 4900] as const;
const FIXTURE_LINES = 5000;

let harness: EditorHarness | null = null;

afterEach(() => {
  vi.useRealTimers();
  harness?.destroy();
  harness = null;
});

/** Mount the real table extension; `act` because the widget opens React. */
function mountTable(
  doc: string,
  extra: readonly Extension[] = [],
): EditorHarness {
  let created: EditorHarness | null = null;
  act(() => {
    created = createHarness({
      doc,
      extensions: [LANGUAGE, ...extra, tableLivePreview],
    });
  });
  if (!created) throw new Error("the harness did not mount");
  harness = created;
  return created;
}

/** A visitor that records every line the scanner reads. */
function scanCounter(): { lines: number[]; visit: (line: number) => void } {
  const lines: number[] = [];
  return {
    lines,
    visit: (lineNumber) => lines.push(lineNumber),
  };
}

/** The three lines of the fixture table whose header is `headerLine`. */
function fixtureBlock(
  doc: Text,
  headerLine: number,
): { from: number; to: number } {
  return {
    from: doc.line(headerLine).from,
    to: doc.line(headerLine + TABLE_ROWS.length - 1).to,
  };
}

/** The 5,000-line document: prose with three pipe tables far apart. */
function fixture(): Text {
  const lines = Array.from(
    { length: FIXTURE_LINES },
    (_, index) => `${FILLER} ${index + 1}`,
  );
  for (const lineNumber of FIXTURE_TABLES) {
    TABLE_ROWS.forEach((row, offset) => {
      lines[lineNumber - 1 + offset] = row;
    });
  }
  return Text.of(lines);
}

/** Every rendered table wrapper, in document order. */
function wrappers(view: EditorHarness): HTMLElement[] {
  return [
    ...view.view.contentDOM.querySelectorAll<HTMLElement>(
      ".cm-live-table-wrapper",
    ),
  ];
}

/**
 * The block replacements (the table widgets) in the decoration set.
 *
 * A table is a block `Decoration.replace` with a widget, which the harness
 * classifies as `replace`, not `widget` — and jsdom only materialises a block's
 * DOM when it falls in the measured viewport, so a far table is asserted here
 * rather than in `contentDOM`.
 */
function blockDecorations(view: EditorHarness) {
  return view.decorations().filter((range) => range.block);
}

/** One cell's decoded text through the nested editor's public DOM link. */
function cellText(view: EditorHarness, row: number, col: number): string {
  const content = view.view.contentDOM.querySelector<HTMLElement>(
    `[data-row="${row}"][data-col="${col}"] .cm-content`,
  );
  if (!content) throw new Error(`no nested editor at ${row}:${col}`);
  const editor = EditorView.findFromDOM(content);
  if (!editor) throw new Error(`no nested view at ${row}:${col}`);
  return editor.state.doc.toString();
}

describe("E.1: viewport-bounded scanning", () => {
  it("E.1: expands a visible range by the margin and clamps it to the document", () => {
    const doc = Text.of(
      Array.from({ length: 1000 }, (_, index) => `line ${index + 1}`),
    );

    expect(TABLE_SCAN_MARGIN_LINES).toBe(200);
    expect(
      tableScanWindows(
        doc,
        [{ from: doc.line(500).from, to: doc.line(510).to }],
        10,
      ),
    ).toEqual([{ fromLine: 490, toLine: 520 }]);
    // Both edges clamp, not overflow.
    expect(
      tableScanWindows(
        doc,
        [{ from: doc.line(2).from, to: doc.line(3).to }],
        10,
      ),
    ).toEqual([{ fromLine: 1, toLine: 13 }]);
    expect(
      tableScanWindows(
        doc,
        [{ from: doc.line(995).from, to: doc.line(1000).to }],
        10,
      ),
    ).toEqual([{ fromLine: 985, toLine: 1000 }]);
  });

  it("E.1: merges overlapping and adjacent windows so no line is scanned twice", () => {
    const doc = Text.of(
      Array.from({ length: 1000 }, (_, index) => `line ${index + 1}`),
    );

    expect(
      tableScanWindows(
        doc,
        [
          { from: doc.line(100).from, to: doc.line(110).to },
          { from: doc.line(120).from, to: doc.line(130).to },
          { from: doc.line(400).from, to: doc.line(410).to },
        ],
        20,
      ),
    ).toEqual([
      { fromLine: 80, toLine: 150 },
      { fromLine: 380, toLine: 430 },
    ]);
  });

  it("E.1: no visible ranges plans no windows", () => {
    expect(tableScanWindows(Text.of(["one line"]), [])).toEqual([]);
  });

  it("E.1: the field starts at a bounded bootstrap and clamps effect windows", () => {
    const doc = fixture();
    const state = EditorState.create({
      doc,
      extensions: [tableScanWindowsField],
    });
    expect(state.field(tableScanWindowsField)).toEqual([
      { fromLine: 1, toLine: TABLE_SCAN_BOOTSTRAP_LINES },
    ]);

    // A window requested past the end of an edited document is clamped to it.
    const short = EditorState.create({
      doc: "a\nb",
      extensions: [tableScanWindowsField],
    });
    const next = short.update({
      effects: setTableScanWindows.of([{ fromLine: 10, toLine: 40 }]),
    }).state;
    expect(next.field(tableScanWindowsField)).toEqual([
      { fromLine: 2, toLine: 2 },
    ]);
  });

  it("E.1: a small viewport scans only its window plus margin, not 5,000 lines", () => {
    const doc = fixture();
    const windows = tableScanWindows(doc, [
      { from: doc.line(20).from, to: doc.line(60).to },
    ]);
    // 20 - 200 clamps to line 1; 60 + 200 is the far edge.
    expect(windows).toEqual([{ fromLine: 1, toLine: 260 }]);

    const counter = scanCounter();
    const blocks = findTableBlocksInWindows(doc, windows, counter.visit);

    // Only the near table is in scope; the far ones were never read.
    expect(blocks).toEqual([fixtureBlock(doc, 1)]);
    expect(blocks.some((block) => block.from === doc.line(2500).from)).toBe(
      false,
    );
    expect(blocks.some((block) => block.from === doc.line(4900).from)).toBe(
      false,
    );

    expect(Math.min(...counter.lines)).toBe(1);
    expect(Math.max(...counter.lines)).toBeLessThanOrEqual(260);
    // 260 forward lines is the whole budget (the near table's own lines are
    // inside it); 5,000 would be the unbounded scan this task removes.
    expect(counter.lines.length).toBeLessThanOrEqual(260);
    expect(counter.lines.length).toBeLessThan(500);
  });

  it("E.1: findTableBlocks keeps its full-document result byte for byte", () => {
    const doc = fixture();
    const full = findTableBlocks(doc);
    expect(full).toEqual([
      fixtureBlock(doc, 1),
      fixtureBlock(doc, 2500),
      fixtureBlock(doc, 4900),
    ]);

    // The public function is the same loop over one whole-document window.
    expect(
      findTableBlocksInWindows(doc, [{ fromLine: 1, toLine: doc.lines }]),
    ).toEqual(full);

    // The in-window block is byte-identical to the full scan's block.
    expect(
      findTableBlocksInWindows(doc, [{ fromLine: 1, toLine: 260 }]),
    ).toEqual([full[0]]);
  });

  it("E.1: a window starting inside a table still finds the whole block once", () => {
    const doc = fixture();
    // Start on the body row: header and delimiter are behind the window.
    const windows = tableScanWindows(
      doc,
      [{ from: doc.line(3).from, to: doc.line(3).to }],
      0,
    );
    expect(windows).toEqual([{ fromLine: 3, toLine: 3 }]);

    const counter = scanCounter();
    const blocks = findTableBlocksInWindows(doc, windows, counter.visit);

    expect(blocks).toEqual([fixtureBlock(doc, 1)]);
    // The backward walk read the header (1) and delimiter (2), then the whole
    // body; the block is not cut in half at the window.
    expect(counter.lines).toContain(1);
    expect(counter.lines).toContain(2);
  });

  it("E.1: fence lookback keeps a table inside an enclosing fence hidden", () => {
    const doc = Text.of([
      "```",
      "| a | b |",
      "| --- | --- |",
      "| 1 | 2 |",
      "```",
      "after",
    ]);

    // The window starts inside the fence: the opening marker is a lookback
    // line, and the scanner must not mistake the pipe block for a table.
    expect(findTableBlocksInWindows(doc, [{ fromLine: 3, toLine: 4 }])).toEqual(
      [],
    );
    expect(findTableBlocks(doc)).toEqual([]);
  });

  it("E.1: a keystroke inside a visible table scans its window, not 5,000 lines", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const doc = fixture();
    const counter = scanCounter();
    const view = mountTable(doc.toString(), [
      tableScanObserver.of(counter.visit),
    ]);

    // The bounded bootstrap covers the near table, so the fixture's first paint
    // does not depend on a timer.
    expect(wrappers(view)).toHaveLength(1);

    act(() => {
      view.view.dispatch({
        effects: setTableScanWindows.of([{ fromLine: 1, toLine: 12 }]),
      });
    });
    counter.lines.length = 0;

    // One document change inside the rendered table's source.
    const body = view.state().doc.line(3);
    act(() => {
      view.view.dispatch({
        changes: { from: body.from + 2, to: body.from + 5, insert: "Zed" },
      });
    });

    // The observer's own 0 ms task is still queued under fake timers, so this
    // count is the decoration rebuild alone.
    expect(counter.lines.length).toBeGreaterThan(0);
    expect(counter.lines.length).toBeLessThanOrEqual(12);
    expect(Math.max(...counter.lines)).toBeLessThanOrEqual(12);
    expect(counter.lines.length).toBeLessThan(FIXTURE_LINES);

    // The widget still rebuilt from the new source.
    expect(wrappers(view)).toHaveLength(1);
    expect(cellText(view, 1, 0)).toBe("Zed");
  });

  it("E.1: a viewport change re-scans the new window and swaps the rendered table", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const doc = fixture();
    const counter = scanCounter();
    const view = mountTable(doc.toString(), [
      tableScanObserver.of(counter.visit),
    ]);
    const before = blockDecorations(view);
    expect(before).toHaveLength(1);
    expect(before[0].from).toBe(doc.line(1).from);

    counter.lines.length = 0;
    await act(async () => {
      view.view.dispatch({
        effects: setTableScanWindows.of([{ fromLine: 2480, toLine: 2520 }]),
      });
      // The old widget's React root unmounts on a microtask (`widget.ts`).
      await Promise.resolve();
    });

    // The lookback is the only read before the window; the forward scan stops
    // at the window's end. Nothing near line 4900 was touched.
    expect(Math.min(...counter.lines)).toBeGreaterThanOrEqual(
      2480 - TABLE_FENCE_LOOKBACK_LINES,
    );
    expect(Math.max(...counter.lines)).toBeLessThanOrEqual(2521);
    expect(counter.lines.length).toBeLessThan(500);

    // jsdom does not lay out a block at line 2500, so "appears" is asserted on
    // the decoration set; the near table's widget is gone from the same set.
    const after = blockDecorations(view);
    expect(after).toHaveLength(1);
    expect(after[0].from).toBe(doc.line(2500).from);
    expect(view.state().field(tableScanWindowsField)).toEqual([
      { fromLine: 2480, toLine: 2520 },
    ]);
  });

  it("E.1: delimiter completion still fires inside the window after TABLE_COMPLETE_MS", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const lines = Array.from(
      { length: FIXTURE_LINES },
      (_, index) => `${FILLER} ${index + 1}`,
    );
    lines[FIXTURE_LINES - 2] = "| Head 1 | Head 2 | Head 3 |";
    lines[FIXTURE_LINES - 1] = "| --- |";
    const doc = lines.join("\n");
    const view = mountTable(doc);

    // Flush the observer's construction task first (jsdom's default top
    // window), so the completion below runs against the explicit window.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    act(() => {
      view.view.dispatch({
        effects: setTableScanWindows.of([
          { fromLine: FIXTURE_LINES - 20, toLine: FIXTURE_LINES },
        ]),
      });
    });
    act(() => {
      view.view.dispatch({ selection: { anchor: view.state().doc.length } });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TABLE_COMPLETE_MS + 10);
    });

    expect(view.state().doc.line(FIXTURE_LINES).text).toBe(
      "| --- | --- | --- |",
    );

    // jsdom measured a viewport at the top of the document, so the observer's
    // 0 ms task has just narrowed the window back towards the top. A browser
    // scrolled to the end would report the end; re-assert the window the user
    // was looking at and check that the completed table now renders through it.
    act(() => {
      view.view.dispatch({
        effects: setTableScanWindows.of([
          { fromLine: FIXTURE_LINES - 20, toLine: FIXTURE_LINES },
        ]),
      });
    });
    const rendered = blockDecorations(view);
    expect(rendered).toHaveLength(1);
    expect(rendered[0].from).toBe(
      view.state().doc.line(FIXTURE_LINES - 1).from,
    );
  });

  it("E.1: a note shorter than the bootstrap plans the same window as the viewport", () => {
    const doc = Text.of(["intro", "", ...TABLE_ROWS, ""]);
    // A whole-document range in a short note expands to the full note, exactly
    // like the bootstrap field; the observer therefore has nothing to dispatch.
    const windows = tableScanWindows(doc, [{ from: 0, to: doc.length }]);
    expect(windows).toEqual([
      { fromLine: 1, toLine: Math.min(doc.lines, TABLE_SCAN_BOOTSTRAP_LINES) },
    ]);
  });
});
