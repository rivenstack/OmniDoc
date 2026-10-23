// Caret redirection for rendered tables — F-15 Task 3.3 Rev 2, plan Task C.1.
//
// `OBS-1.14.4-TABLE-007` says the table is **always rendered** and a caret that
// lands in its hidden range is redirected **into a cell** — never into raw
// source. The redirect is split in two on purpose:
//
//   * `redirectTableCaret` is a pure document question (source + offset +
//     direction + RTL flag → cell), so every branch is a plain unit test.
//   * the observer in `scan.ts` owns the view side: it must not focus a nested
//     editor from inside a CodeMirror update, so its work is deferred. That is
//     asserted with fake timers below.
//
// The negative is the point of the task: after the redirect the raw table
// source is still hidden, the widget is still rendered, and no decoration
// changed. A redirection that unfolded the table would pass a "focus moved"
// assertion and fail the product requirement.
//
// The file also holds the **pure** half of C.4 (cell-range selection, image S5):
// bounds, containment, whole-table coverage, edge extension and the pointer
// edge test the grid's drag wires together. `@user` directed the behaviour on
// 2026-10-16 (B-7/S5); it is not a parity claim.

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHarness, type EditorHarness } from "../../parity/harness";
import type { TableModel } from "./model";
import { tableLivePreview } from "./scan";
import {
  cellRangeBounds,
  extendRangeToEdge,
  rangeCells,
  rangeContains,
  rangeCoversTable,
  rangePointerEdge,
  redirectTableCaret,
  sameCellRange,
  sameCellRef,
  tableCaretRegion,
  type TableCellRange,
} from "./selection";

const LANGUAGE = markdown({ base: markdownLanguage });

/** The rendered table under test: two columns, two body rows. */
const TABLE = "| Head 1 | Head 2 |\n| --- | --- |\n| a | b |\n| c | d |";

/** A document with a paragraph before the table, so a caret can enter from above. */
const DOC = `intro\n\n${TABLE}\n`;

/** The block's start offset in `DOC` (the `intro` paragraph and blank line). */
const FROM = DOC.indexOf("| Head 1");

let harness: EditorHarness | null = null;

afterEach(() => {
  vi.useRealTimers();
  harness?.destroy();
  harness = null;
});

/** Mount the table extension. `act` because the widget opens a React root. */
function mount(doc: string = DOC): EditorHarness {
  let created: EditorHarness | null = null;
  act(() => {
    created = createHarness({
      doc,
      extensions: [LANGUAGE, tableLivePreview],
    });
  });
  if (!created) throw new Error("the harness did not mount");
  harness = created;
  return harness;
}

/** Let deferred tasks — the redirect timer, React's work — run. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/**
 * Focus and settle the outer editor.
 *
 * CodeMirror notices focus during an update and dispatches the focus effect a
 * turn later in jsdom (the `callout/index.test.ts` quirk), so a caret dispatch
 * has to follow `focus()` — otherwise the redirector sees an unfocused view and
 * stays out of the way.
 */
async function focusSettled(view: EditorHarness): Promise<void> {
  const caret = view.state().selection.main.head;
  await act(async () => {
    view.focus();
    view.placeCaret(caret);
    await new Promise((resolve) => setTimeout(resolve, 0));
    view.placeCaret(caret);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** One cell's nested editor content DOM, found through the public DOM contract. */
function cellContent(view: EditorHarness, row: number, col: number): HTMLElement {
  const host = view.view.contentDOM.querySelector<HTMLElement>(
    `[data-row="${row}"][data-col="${col}"]`,
  );
  const content = host?.querySelector<HTMLElement>(".cm-content");
  if (!content) throw new Error(`no nested editor at ${row}:${col}`);
  return content;
}

/** One cell's nested `EditorView` (public API only). */
function cellEditor(view: EditorHarness, row: number, col: number): EditorView {
  const editor = EditorView.findFromDOM(cellContent(view, row, col));
  if (!editor) throw new Error(`no nested view at ${row}:${col}`);
  return editor;
}

describe("the block boundary is a pure position question (TABLE-007)", () => {
  it("TABLE-007: redirects strictly interior positions and never the block start", () => {
    expect(tableCaretRegion(10, 40, 100, 9)).toBeNull();
    expect(tableCaretRegion(10, 40, 100, 10)).toBe("inside");
    expect(tableCaretRegion(10, 40, 100, 39)).toBe("inside");
  });

  it("TABLE-007: treats the block end as inside while a following line exists", () => {
    // `to` with text after it is where ArrowUp from the line below lands: the
    // caret is at the end of the table's last line and belongs in its last row.
    expect(tableCaretRegion(10, 40, 41, 40)).toBe("inside");
    expect(tableCaretRegion(10, 40, 100, 40)).toBe("inside");
  });

  it("TABLE-007: treats the block end as a leave when the table is the last block", () => {
    // `to === docLength`: clicking below the document's last block has nowhere
    // to put the caret, so the caller creates the trailing line.
    expect(tableCaretRegion(10, 40, 40, 40, { pointer: true })).toBe(
      "leave-after",
    );
    expect(tableCaretRegion(10, 40, 40, 41)).toBeNull();
    // Keyboard motion downwards lands on the same offset and means the table.
    expect(tableCaretRegion(10, 40, 40, 40, { direction: "down" })).toBe(
      "inside",
    );
  });
});

describe("the redirect is a pure document question (OBS-1.14.4-TABLE-007)", () => {
  it("TABLE-007: maps a caret inside a header cell to that cell and decoded offset", () => {
    const source = TABLE;
    const caret = 100 + source.indexOf("Head 2") + 3;

    expect(
      redirectTableCaret({ source, from: 100, caret, direction: "down" }),
    ).toEqual({ row: 0, col: 1, offset: 3 });
  });

  it("TABLE-007: maps a caret inside a body row to that cell", () => {
    const source = TABLE;
    // The `d` of the last body row's second cell.
    const caret = 0 + source.lastIndexOf("d");

    expect(
      redirectTableCaret({ source, from: 0, caret, direction: "down" }),
    ).toEqual({ row: 2, col: 1, offset: 0 });
  });

  it("TABLE-007: maps a caret at the block's start and end to the edge cells", () => {
    const source = TABLE;

    // The endpoints take the direction's fallback target (see the module
    // header): down → the first cell of the first row; up → the first cell of
    // the last row, which is the documented TABLE-007 fallback.
    expect(
      redirectTableCaret({ source, from: 40, caret: 40, direction: "down" }),
    ).toEqual({ row: 0, col: 0, offset: 0 });

    expect(
      redirectTableCaret({
        source,
        from: 40,
        caret: 40 + source.length,
        direction: "up",
      }),
    ).toEqual({ row: 2, col: 0, offset: 0 });
  });

  it("TABLE-007: the travel direction decides the row at both endpoints", () => {
    const source = TABLE;
    const to = source.length;

    // Upward motion reports the block's start; downward motion reports its end,
    // so a position match would name the opposite row.
    expect(
      redirectTableCaret({ source, from: 0, caret: 0, direction: "up" }),
    ).toEqual({ row: 2, col: 0, offset: 0 });
    expect(
      redirectTableCaret({ source, from: 0, caret: to, direction: "down" }),
    ).toEqual({ row: 0, col: 0, offset: 0 });

    // RTL swaps the fallback column for both.
    expect(
      redirectTableCaret({
        source,
        from: 0,
        caret: 0,
        direction: "up",
        rtl: true,
      }),
    ).toEqual({ row: 2, col: 1, offset: 0 });
    expect(
      redirectTableCaret({
        source,
        from: 0,
        caret: to,
        direction: "down",
        rtl: true,
      }),
    ).toEqual({ row: 0, col: 1, offset: 0 });
  });

  it("TABLE-007: a pointer selection at an endpoint keeps the position match", () => {
    const source = TABLE;

    // Clicking the table's bottom edge means the last row, its last cell.
    expect(
      redirectTableCaret({
        source,
        from: 0,
        caret: source.length,
        direction: "down",
        pointer: true,
      }),
    ).toEqual({ row: 2, col: 1, offset: 1 });
    // The header's start is the header either way.
    expect(
      redirectTableCaret({
        source,
        from: 0,
        caret: 0,
        direction: "up",
        pointer: true,
      }),
    ).toEqual({ row: 0, col: 0, offset: 0 });
  });

  it("TABLE-007: falls back to the first row when the caret sits on the delimiter row going down", () => {
    const source = TABLE;
    const caret = source.indexOf("| --- |") + 4;

    expect(
      redirectTableCaret({ source, from: 0, caret, direction: "down" }),
    ).toEqual({ row: 0, col: 0, offset: 0 });
  });

  it("TABLE-007: falls back to the last row when the caret sits on the delimiter row going up", () => {
    const source = TABLE;
    const caret = source.indexOf("| --- |") + 4;

    expect(
      redirectTableCaret({ source, from: 0, caret, direction: "up" }),
    ).toEqual({ row: 2, col: 0, offset: 0 });
  });

  it("TABLE-007: falls back to the header when there are no body rows", () => {
    const source = "| a | b |\n| --- | --- |";
    const caret = source.indexOf("| --- |") + 4;

    expect(
      redirectTableCaret({ source, from: 0, caret, direction: "up" }),
    ).toEqual({ row: 0, col: 0, offset: 0 });
  });

  it("TABLE-007: swaps the fallback column under the RTL flag", () => {
    const source = TABLE;
    const caret = source.indexOf("| --- |") + 4;
    const columns = 2;

    expect(
      redirectTableCaret({
        source,
        from: 0,
        caret,
        direction: "down",
        rtl: true,
      }),
    ).toEqual({ row: 0, col: columns - 1, offset: 0 });

    expect(
      redirectTableCaret({
        source,
        from: 0,
        caret,
        direction: "up",
        rtl: true,
      }),
    ).toEqual({ row: 2, col: columns - 1, offset: 0 });
  });

  it("TABLE-007: treats an escaped pipe and a code-span pipe as cell content", () => {
    const source = "| x \\| y | `p|q` |\n| --- | --- |";
    const escaped = source.indexOf("y");
    const code = source.indexOf("q");

    // Decoded, the cell is `x | y`; the caret before `y` is decoded offset 4.
    expect(
      redirectTableCaret({ source, from: 0, caret: escaped, direction: "down" }),
    ).toEqual({ row: 0, col: 0, offset: 4 });

    expect(
      redirectTableCaret({ source, from: 0, caret: code, direction: "down" }),
    ).toEqual({ row: 0, col: 1, offset: 3 });
  });

  it("TABLE-007: returns null outside the block and for a non-table source", () => {
    expect(
      redirectTableCaret({ source: TABLE, from: 100, caret: 99, direction: "down" }),
    ).toBeNull();
    expect(
      redirectTableCaret({
        source: TABLE,
        from: 100,
        caret: 100 + TABLE.length + 1,
        direction: "down",
      }),
    ).toBeNull();
    expect(
      redirectTableCaret({
        source: "not a table",
        from: 0,
        caret: 3,
        direction: "down",
      }),
    ).toBeNull();
  });
});

describe("the observer redirects the caret into a cell (OBS-1.14.4-TABLE-007)", () => {
  it("TABLE-007: a caret landed in the header row focuses the matching cell", async () => {
    const view = mount();
    await focusSettled(view);

    view.placeCaret(FROM + DOC.slice(FROM).indexOf("Head 2") + 3);
    await settle();

    expect(document.activeElement).toBe(cellContent(view, 0, 1));
    expect(cellEditor(view, 0, 1).state.selection.main.head).toBe(3);
    // The programmatic focus goes through the grid's own handoff: the cell
    // registers itself as active, exactly as a click on it would.
    expect(
      cellContent(view, 0, 1).closest("[data-row]")?.getAttribute("data-active"),
    ).toBe("true");
  });

  it("TABLE-007: a caret landed in a body row focuses the matching cell", async () => {
    const view = mount();
    await focusSettled(view);

    // The `d` of `| c | d |`, the last body cell.
    view.placeCaret(DOC.indexOf("| c | d |") + 6);
    await settle();

    expect(document.activeElement).toBe(cellContent(view, 2, 1));
    expect(cellEditor(view, 2, 1).state.selection.main.head).toBe(0);
  });

  it("TABLE-007: a caret landed on the delimiter row falls back by direction", async () => {
    const view = mount();
    await focusSettled(view);

    // Entering from above: the first cell of the first row.
    view.placeCaret(DOC.indexOf("| --- |") + 4);
    await settle();
    expect(document.activeElement).toBe(cellContent(view, 0, 0));

    // Leave the table (the redirect handed focus to the cell), then come back
    // from below: the first cell of the last row.
    view.placeCaret(DOC.length);
    await focusSettled(view);
    view.placeCaret(DOC.indexOf("| --- |") + 4);
    await settle();
    expect(document.activeElement).toBe(cellContent(view, 2, 0));
  });

  it("TABLE-007: swaps the fallback target in an RTL context", async () => {
    const view = mount();
    await focusSettled(view);
    view.view.dom.setAttribute("dir", "rtl");

    view.placeCaret(DOC.indexOf("| --- |") + 4);
    await settle();

    // "First cell" is the rightmost one under RTL (readiness only).
    expect(document.activeElement).toBe(cellContent(view, 0, 1));
  });

  it("TABLE-007: redirects a caret at the block's end when a following line exists", async () => {
    // Entering from below: ArrowUp on the line after the table yields a caret at
    // the end of the table's last line (`to`) — the direction is what says it
    // came from below, and the endpoint takes the documented fallback target.
    const view = mount();
    await focusSettled(view);

    view.placeCaret(FROM + TABLE.length + 1);
    view.placeCaret(FROM + TABLE.length);
    await settle();

    expect(document.activeElement).toBe(cellContent(view, 2, 0));
    expect(cellEditor(view, 2, 0).state.selection.main.head).toBe(0);
    expect(view.doc()).toBe(DOC);
  });

  it("TABLE-007: ArrowUp from below enters the last row, not the header", async () => {
    // CodeMirror's upward motion over a block replacement reports the block's
    // *start* (it is one visual line), so a position match would land in the
    // header. `@user` (2026-10-23): "hitting arrow up … navigated to top of the
    // table instead of the previous line". Direction must win at the endpoints.
    const view = mount();
    await focusSettled(view);

    view.placeCaret(FROM + TABLE.length + 1);
    view.placeCaret(FROM);
    await settle();

    expect(document.activeElement).toBe(cellContent(view, 2, 0));
  });

  it("TABLE-007: ArrowDown from above enters the header, not the last row", async () => {
    // The mirror case: downward motion reports the block's *end*.
    const view = mount();
    await focusSettled(view);

    view.placeCaret(FROM - 1);
    view.placeCaret(FROM + TABLE.length);
    await settle();

    expect(document.activeElement).toBe(cellContent(view, 0, 0));
  });

  it("TABLE-007: a pointer selection at the block's end still picks the last row", async () => {
    // No direction to give, so the endpoint keeps the position match.
    const view = mount();
    await focusSettled(view);

    view.placeCaret(FROM + TABLE.length, "select.pointer");
    await settle();

    expect(document.activeElement).toBe(cellContent(view, 2, 1));
  });

  it("TABLE-007: a caret at document end after a last-block table creates a trailing line", async () => {
    // `@user` (2026-10-23): "if the table is the latest block, I can not click
    // after the table to write at the bottom". The click lands at `docLength`,
    // which is the block's `to`; there is no line there, so the table grows one.
    // The paragraph prefix keeps the initial caret (offset 0) out of the table.
    const last = `intro\n\n${TABLE}`;
    const view = mount(last);
    await focusSettled(view);

    view.placeCaret(last.length, "select.pointer");
    await settle();

    // The document gains the line, the outer caret sits on it, and the widget
    // is still rendered — no cell took focus and no source was revealed.
    expect(view.doc()).toBe(`${last}\n`);
    expect(view.view.state.selection.main.head).toBe(last.length + 1);
    expect(document.activeElement).toBe(view.view.contentDOM);
    expect(view.view.contentDOM.querySelector("table.cm-live-table")).not.toBeNull();
    expect(
      view.view.contentDOM.querySelector('[data-active="true"]'),
    ).toBeNull();
  });

  it("TABLE-007: still redirects a caret one position inside the block end", async () => {
    const view = mount();
    await focusSettled(view);

    // The closing pipe of the last cell: inside the hidden range, so it belongs
    // in that cell — at the decoded end of `d`.
    view.placeCaret(FROM + TABLE.length - 1);
    await settle();

    expect(document.activeElement).toBe(cellContent(view, 2, 1));
    expect(cellEditor(view, 2, 1).state.selection.main.head).toBe(1);
  });

  it("TABLE-007: never reveals the raw source (negative)", async () => {
    const view = mount();
    await focusSettled(view);

    const before = view
      .decorations()
      .filter((decoration) => decoration.kind === "replace" && decoration.block);
    expect(before).toHaveLength(1);

    view.placeCaret(DOC.indexOf("| --- |") + 4);
    await settle();

    // The widget is still there, and it is still the only block replacement —
    // no unfold, no second decoration, no shifted range.
    expect(view.view.contentDOM.querySelector(".cm-live-table-wrapper")).not.toBeNull();
    expect(view.view.contentDOM.querySelector("table.cm-live-table")).not.toBeNull();
    const blocks = view
      .decorations()
      .filter((decoration) => decoration.kind === "replace" && decoration.block);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].from).toBe(before[0].from);
    expect(blocks[0].to).toBe(before[0].to);

    // No delimiter row, no pipes: the table did not unfold.
    const text = view.view.contentDOM.textContent ?? "";
    expect(text).not.toContain("---");
    expect(text).not.toContain("|");
    // And the redirect never touched the document.
    expect(view.doc()).toBe(DOC);
  });

  it("TABLE-007: defers the focus call outside the CodeMirror update", async () => {
    const view = mount();
    await focusSettled(view);
    vi.useFakeTimers();

    act(() => {
      view.placeCaret(DOC.indexOf("| --- |") + 4);
    });

    // The selection transaction is finished, but no cell has been focused yet —
    // focusing a nested editor from inside the update would dispatch during it.
    expect(document.activeElement).not.toBe(cellContent(view, 0, 0));
    expect(document.activeElement).toBe(view.view.contentDOM);

    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(document.activeElement).toBe(cellContent(view, 0, 0));
  });
});

// ---------------------------------------------------------------------------
// C.4 — cell-range selection (B-7, S5; `@user`, 2026-10-16)
// ---------------------------------------------------------------------------

/** Two columns, two body rows (rows `0..2`, columns `0..1`). */
const RANGE_MODEL: TableModel = {
  headers: ["h0", "h1"],
  alignments: ["left", "left"],
  rows: [
    ["a0", "a1"],
    ["b0", "b1"],
  ],
};

/** One column, no body rows — the smallest rendered grid. */
const SINGLE_COLUMN_MODEL: TableModel = {
  headers: ["only"],
  alignments: ["left"],
  rows: [],
};

function ref(row: number, col: number) {
  return { row, col };
}

function range(anchor: { row: number; col: number }, focus: { row: number; col: number }): TableCellRange {
  return { anchor, focus };
}

describe("the range rectangle is the min/max of anchor and focus (B-7)", () => {
  it("B-7: normalises an anchor above the focus", () => {
    expect(cellRangeBounds(range(ref(0, 1), ref(2, 0)))).toEqual({
      rowFrom: 0,
      rowTo: 2,
      colFrom: 0,
      colTo: 1,
    });
  });

  it("B-7: normalises an anchor below the focus", () => {
    expect(cellRangeBounds(range(ref(2, 1), ref(1, 0)))).toEqual({
      rowFrom: 1,
      rowTo: 2,
      colFrom: 0,
      colTo: 1,
    });
  });

  it("B-7: normalises an anchor left of the focus", () => {
    expect(cellRangeBounds(range(ref(1, 0), ref(2, 1)))).toEqual({
      rowFrom: 1,
      rowTo: 2,
      colFrom: 0,
      colTo: 1,
    });
  });

  it("B-7: normalises an anchor right of the focus", () => {
    expect(cellRangeBounds(range(ref(1, 1), ref(2, 0)))).toEqual({
      rowFrom: 1,
      rowTo: 2,
      colFrom: 0,
      colTo: 1,
    });
  });

  it("B-7: a single-cell range is its own bounds", () => {
    expect(cellRangeBounds(range(ref(1, 1), ref(1, 1)))).toEqual({
      rowFrom: 1,
      rowTo: 1,
      colFrom: 1,
      colTo: 1,
    });
  });
});

describe("range containment and the whole-table state (B-7, S5)", () => {
  it("B-7: contains every cell inside the rectangle and no cell outside it", () => {
    const bounds = cellRangeBounds(range(ref(1, 1), ref(2, 0)));

    expect(rangeContains(bounds, ref(1, 0))).toBe(true);
    expect(rangeContains(bounds, ref(2, 1))).toBe(true);
    expect(rangeContains(bounds, ref(0, 0))).toBe(false);
    expect(rangeContains(bounds, ref(1, 2))).toBe(false);
  });

  it("B-7: only the full rectangle covers a 2x2-body table", () => {
    expect(
      rangeCoversTable(cellRangeBounds(range(ref(0, 0), ref(2, 1))), RANGE_MODEL),
    ).toBe(true);
    // One short on the body rows.
    expect(
      rangeCoversTable(cellRangeBounds(range(ref(0, 0), ref(1, 1))), RANGE_MODEL),
    ).toBe(false);
    // One short on the columns.
    expect(
      rangeCoversTable(cellRangeBounds(range(ref(0, 0), ref(2, 0))), RANGE_MODEL),
    ).toBe(false);
  });

  it("B-7: a one-column, zero-body-row table is covered by its header cell", () => {
    expect(
      rangeCoversTable(
        cellRangeBounds(range(ref(0, 0), ref(0, 0))),
        SINGLE_COLUMN_MODEL,
      ),
    ).toBe(true);
    // A model with no columns cannot happen (one is guaranteed), but the
    // predicate must not claim coverage of a wider table either.
    expect(
      rangeCoversTable(
        cellRangeBounds(range(ref(0, 0), ref(0, 0))),
        RANGE_MODEL,
      ),
    ).toBe(false);
  });

  it("B-7: lists every cell of the rectangle, row-major", () => {
    expect(
      rangeCells({ rowFrom: 1, rowTo: 2, colFrom: 0, colTo: 1 }),
    ).toEqual([ref(1, 0), ref(1, 1), ref(2, 0), ref(2, 1)]);
    expect(rangeCells({ rowFrom: 0, rowTo: 0, colFrom: 0, colTo: 0 })).toEqual([
      ref(0, 0),
    ]);
  });
});

describe("dragging past an edge clamps the focus to that edge (B-7)", () => {
  it("B-7: right reaches the last column", () => {
    expect(
      extendRangeToEdge(range(ref(1, 0), ref(1, 0)), "right", RANGE_MODEL),
    ).toEqual(range(ref(1, 0), ref(1, 1)));
  });

  it("B-7: left reaches the first column", () => {
    expect(
      extendRangeToEdge(range(ref(1, 1), ref(1, 1)), "left", RANGE_MODEL),
    ).toEqual(range(ref(1, 1), ref(1, 0)));
  });

  it("B-7: bottom reaches the last body row", () => {
    expect(
      extendRangeToEdge(range(ref(0, 1), ref(0, 1)), "bottom", RANGE_MODEL),
    ).toEqual(range(ref(0, 1), ref(2, 1)));
  });

  it("B-7: top reaches the header row", () => {
    expect(
      extendRangeToEdge(range(ref(2, 1), ref(2, 1)), "top", RANGE_MODEL),
    ).toEqual(range(ref(2, 1), ref(0, 1)));
  });

  it("B-7: clamps a stale focus before moving it to the edge", () => {
    // The model shrank under a drag: the focus is outside it, and the edge
    // move must use the clamped row/column rather than the stale one.
    expect(
      extendRangeToEdge(range(ref(0, 0), ref(99, 99)), "top", RANGE_MODEL),
    ).toEqual(range(ref(0, 0), ref(0, 1)));
    expect(
      extendRangeToEdge(range(ref(1, 0), ref(99, 99)), "right", RANGE_MODEL),
    ).toEqual(range(ref(1, 0), ref(2, 1)));
  });

  it("B-7: keeps the same range object when the focus is already on the edge", () => {
    const existing = range(ref(0, 0), ref(2, 1));
    expect(extendRangeToEdge(existing, "right", RANGE_MODEL)).toBe(existing);
    expect(extendRangeToEdge(existing, "bottom", RANGE_MODEL)).toBe(existing);
  });
});

describe("range equality and the pointer edge test (B-7)", () => {
  it("B-7: compares refs and ranges by value", () => {
    expect(sameCellRef(ref(1, 1), ref(1, 1))).toBe(true);
    expect(sameCellRef(ref(1, 1), ref(1, 2))).toBe(false);
    expect(sameCellRef(null, undefined)).toBe(true);
    expect(sameCellRef(null, ref(0, 0))).toBe(false);

    expect(sameCellRange(range(ref(0, 0), ref(1, 1)), range(ref(0, 0), ref(1, 1)))).toBe(
      true,
    );
    expect(sameCellRange(range(ref(0, 0), ref(1, 1)), range(ref(0, 0), ref(1, 0)))).toBe(
      false,
    );
    expect(sameCellRange(null, null)).toBe(true);
    expect(sameCellRange(null, range(ref(0, 0), ref(0, 0)))).toBe(false);
  });

  it("B-7: resolves which grid edge a pointer is past", () => {
    const rect = { left: 10, right: 110, top: 20, bottom: 80 };

    expect(rangePointerEdge({ clientX: 200, clientY: 40 }, rect)).toBe("right");
    expect(rangePointerEdge({ clientX: 0, clientY: 40 }, rect)).toBe("left");
    expect(rangePointerEdge({ clientX: 50, clientY: 200 }, rect)).toBe("bottom");
    expect(rangePointerEdge({ clientX: 50, clientY: 0 }, rect)).toBe("top");
    expect(rangePointerEdge({ clientX: 50, clientY: 40 }, rect)).toBeNull();
  });
});
