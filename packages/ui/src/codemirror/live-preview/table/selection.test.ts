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

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHarness, type EditorHarness } from "../../parity/harness";
import { tableLivePreview } from "./scan";
import { redirectTableCaret } from "./selection";

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
    ).toEqual({ row: 2, col: 1, offset: 1 });
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
