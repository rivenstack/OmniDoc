// Cell-range selection, end to end — F-15 Task 3.3 Rev 2, plan Task C.4.
//
// `@user` directed this behaviour on 2026-10-16 (B-7; screenshot S5): a drag
// that starts inside a cell selects its **text** natively, and only a drag that
// **leaves** that cell turns into a rectangular cell selection. The block is
// tinted, its anchor keeps the caret, dragging past an edge extends to the
// last/first row or column, and the whole-table state is simply a range that
// covers every cell.
//
// This suite is **not** a parity claim. It drives a real rendered table (the
// widget's React root plus per-cell `EditorView`s) with synthetic pointer
// events, because the state machine lives in `grid.tsx` and cannot be proven by
// the pure tests in `selection.test.ts`. jsdom has no layout: every
// `getBoundingClientRect` is zero, so "past the right edge" is any positive
// `clientX` (the same contract `rangePointerEdge` documents), and the overlay's
// geometry is asserted through its `data-range-*` attributes rather than pixels.

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createHarness,
  keyEvent,
  type EditorHarness,
} from "../../parity/harness";
import { tableLivePreview } from "./scan";

const LANGUAGE = markdown({ base: markdownLanguage });

/** Three columns, two body rows: rows `0..2`, columns `0..2`. */
const TABLE =
  "| a | b | c |\n| --- | --- | --- |\n| d | e | f |\n| g | h | i |";
const DOC = `intro\n\n${TABLE}\n`;

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

/** Let React's work from a pointer event flush. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** The cell host (`<th>`/`<td>`) for one ref, through the public DOM contract. */
function cellHost(view: EditorHarness, row: number, col: number): HTMLElement {
  const host = view.view.contentDOM.querySelector<HTMLElement>(
    `[data-row="${row}"][data-col="${col}"]`,
  );
  if (!host) throw new Error(`no cell host at ${row}:${col}`);
  return host;
}

/** The cell's nested editor content DOM, for the Escape key. */
function cellContent(
  view: EditorHarness,
  row: number,
  col: number,
): HTMLElement {
  const content = cellHost(view, row, col).querySelector<HTMLElement>(
    ".cm-content",
  );
  if (!content) throw new Error(`no nested editor at ${row}:${col}`);
  return content;
}

function mouse(
  type: string,
  init: MouseEventInit = {},
): MouseEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...init,
  });
}

async function pressDown(
  view: EditorHarness,
  row: number,
  col: number,
): Promise<void> {
  await act(async () => {
    cellHost(view, row, col).dispatchEvent(mouse("mousedown"));
  });
}

async function moveOver(
  view: EditorHarness,
  row: number,
  col: number,
): Promise<void> {
  await act(async () => {
    // `buttons` is the button state during the move — the drag machine trusts
    // it over the event stream, because the widget's event isolation can
    // swallow a `mouseup`.
    cellHost(view, row, col).dispatchEvent(mouse("mousemove", { buttons: 1 }));
  });
}

/** Move the pointer over the document, so the event has no cell target. */
async function moveTo(clientX: number, clientY: number): Promise<void> {
  await act(async () => {
    document.dispatchEvent(
      mouse("mousemove", { clientX, clientY, buttons: 1 }),
    );
  });
}

async function release(): Promise<void> {
  await act(async () => {
    document.dispatchEvent(mouse("mouseup"));
  });
}

function selectedCells(view: EditorHarness): HTMLElement[] {
  return Array.from(
    view.view.contentDOM.querySelectorAll<HTMLElement>('[data-range="true"]'),
  );
}

function overlay(view: EditorHarness): HTMLElement | null {
  return view.view.contentDOM.querySelector<HTMLElement>(".cm-live-table-range");
}

async function drag(
  view: EditorHarness,
  from: { row: number; col: number },
  to: { row: number; col: number },
): Promise<void> {
  await pressDown(view, from.row, from.col);
  await moveOver(view, to.row, to.col);
  await release();
  await settle();
}

describe("a drag out of the anchor cell draws the S5 rectangle (B-7)", () => {
  it("B-7: starts with no overlay and no selected cell", () => {
    const view = mount();

    expect(overlay(view)).toBeNull();
    expect(selectedCells(view)).toHaveLength(0);
  });

  it("B-7: a click followed by an idle mouse move draws nothing", async () => {
    // `@user` (2026-10-23): the rectangle appeared by clicking a cell and then
    // moving the pointer, with no drag. A release inside the table can be
    // stopped from reaching the document, so the button state has to decide.
    const view = mount();

    await pressDown(view, 1, 1);
    await release();

    await act(async () => {
      cellHost(view, 2, 2).dispatchEvent(mouse("mousemove", { buttons: 0 }));
    });
    await settle();

    expect(overlay(view)).toBeNull();
    expect(selectedCells(view)).toHaveLength(0);
  });

  it("B-7: a drag from (1,1) to (2,2) selects exactly the 2x2 block", async () => {
    const view = mount();

    await drag(view, { row: 1, col: 1 }, { row: 2, col: 2 });

    const cells = selectedCells(view);
    expect(cells).toHaveLength(4);
    expect(cells.map((cell) => cell.dataset.cell).sort()).toEqual([
      "1:1",
      "1:2",
      "2:1",
      "2:2",
    ]);

    const tint = overlay(view);
    expect(tint).not.toBeNull();
    expect(tint?.dataset.rangeRows).toBe("1-2");
    expect(tint?.dataset.rangeCols).toBe("1-2");
    expect(tint?.getAttribute("aria-hidden")).toBe("true");
  });

  it("B-7: a plain click leaves no range", async () => {
    const view = mount();

    await pressDown(view, 1, 1);
    await release();
    await settle();

    expect(overlay(view)).toBeNull();
    expect(selectedCells(view)).toHaveLength(0);
  });

  it("B-7: dragging inside the anchor cell stays a native text selection", async () => {
    const view = mount();

    await pressDown(view, 1, 1);
    await moveOver(view, 1, 1);
    await release();
    await settle();

    expect(overlay(view)).toBeNull();
    expect(selectedCells(view)).toHaveLength(0);
  });
});

describe("dragging past the grid extends to the edge (B-7, S5)", () => {
  it("B-7: past the right edge reaches the last column", async () => {
    const view = mount();

    await pressDown(view, 1, 0);
    await moveTo(500, 0);
    await release();
    await settle();

    const tint = overlay(view);
    expect(tint?.dataset.rangeRows).toBe("1-1");
    expect(tint?.dataset.rangeCols).toBe("0-2");
    expect(selectedCells(view)).toHaveLength(3);
  });

  it("B-7: past the bottom edge reaches the last row", async () => {
    const view = mount();

    await pressDown(view, 0, 0);
    await moveTo(0, 500);
    await release();
    await settle();

    const tint = overlay(view);
    expect(tint?.dataset.rangeRows).toBe("0-2");
    expect(tint?.dataset.rangeCols).toBe("0-0");
    expect(selectedCells(view)).toHaveLength(3);
  });

  it("B-7: a sweep over every cell is the whole-table range", async () => {
    const view = mount();

    await drag(view, { row: 0, col: 0 }, { row: 2, col: 2 });

    // Three header cells plus two body rows of three: every rendered cell.
    expect(selectedCells(view)).toHaveLength(9);
    expect(overlay(view)?.dataset.rangeRows).toBe("0-2");
    expect(overlay(view)?.dataset.rangeCols).toBe("0-2");
  });
});

describe("the range is cleared without touching the document (B-7)", () => {
  it("B-7: Escape clears the range and stays in the table", async () => {
    const view = mount();
    const before = view.doc();

    await drag(view, { row: 1, col: 1 }, { row: 2, col: 2 });
    expect(overlay(view)).not.toBeNull();

    await act(async () => {
      cellContent(view, 1, 1).dispatchEvent(keyEvent("Escape"));
    });
    await settle();

    expect(overlay(view)).toBeNull();
    expect(selectedCells(view)).toHaveLength(0);
    // Clearing a view selection must not rewrite the note.
    expect(view.doc()).toBe(before);
  });

  it("B-7: a commit (Tab appending a row) rebuilds the grid without a range", async () => {
    const view = mount();

    await drag(view, { row: 1, col: 1 }, { row: 2, col: 2 });
    expect(overlay(view)).not.toBeNull();

    await act(async () => {
      cellContent(view, 2, 2).dispatchEvent(keyEvent("Tab"));
    });
    await settle();

    expect(overlay(view)).toBeNull();
    expect(selectedCells(view)).toHaveLength(0);
    // The structural write happened, so the rebuilt grid is a *new* table.
    expect(view.doc()).toContain("|  |  |  |");
  });
});
