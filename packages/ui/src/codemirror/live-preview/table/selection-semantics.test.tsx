// Selection semantics end to end — F-15 Task 3.3 Rev 2, plan Task C.5.
//
// `@user` directed this behaviour on 2026-10-16 (B-6, B-7; §4.4/§4.5):
//
//   * Backspace at offset 0 of the line immediately after the table selects the
//     whole table on the first press and deletes it on the second (B-6);
//   * Backspace/Delete over a **partial** cell range clears those cells' content
//     (the cells stay), over the whole-table range it deletes the table;
//   * a printable character over a range clears it and lands in the anchor
//     (chosen policy §11-3);
//   * `Mod-z` in a cell commits the cell edit, then forwards undo/redo to the
//     **outer** editor (chosen policy §11-4).
//
// This suite is **not** a parity claim. It drives a real rendered table (the
// widget's React root plus per-cell `EditorView`s) and real `keydown` events,
// because the two entry points are split across a CodeMirror keymap
// (`scan.ts`) and React's capture phase (`grid.tsx`) and neither can be proven
// by the pure tests in `selection.test.ts`.
//
// jsdom has no layout, so "past the right edge" is any positive `clientX` (the
// `rangePointerEdge` contract the C.4 suite documents) and the selection is
// asserted through `data-range` / `data-table-selected`.

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { history } from "@codemirror/commands";
import { EditorView } from "@codemirror/view";
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
/** The block's start offset in {@link DOC}. */
const FROM = DOC.indexOf("| a |");

/** The same table with a real line after it, for the mid-line negatives. */
const AFTER_DOC = `intro\n\n${TABLE}\nafter\n`;
/** The line after the table in {@link AFTER_DOC} (1-based line number). */
const AFTER_LINE = 7;

/**
 * jsdom has no layout. CodeMirror measures an empty line through
 * `Range#getClientRects`, which jsdom answers during a normal run but not for a
 * measurement frame that outlives the environment (the method is gone by then).
 * The shim reports no rects — the same answer jsdom gives — so a stray frame
 * cannot fail the run after teardown.
 */
if (typeof Range !== "undefined") {
  Object.defineProperty(Range.prototype, "getClientRects", {
    configurable: true,
    value: () => [] as unknown as DOMRectList,
  });
}

let harness: EditorHarness | null = null;

afterEach(() => {
  vi.useRealTimers();
  harness?.destroy();
  harness = null;
});

/**
 * Mount the table extension over a **history** — the outer editor is where the
 * undo stack lives (a cell installs none), so the C.5 history test needs it.
 * `act` because the widget opens a React root.
 */
function mount(doc: string = DOC): EditorHarness {
  let created: EditorHarness | null = null;
  act(() => {
    created = createHarness({
      doc,
      extensions: [LANGUAGE, history(), tableLivePreview],
    });
  });
  if (!created) throw new Error("the harness did not mount");
  harness = created;
  return harness;
}

/** Let deferred tasks — the widget's timers, React's work — run. */
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

/** The cell's nested editor content DOM, for a real key event. */
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

/** One cell's nested `EditorView` (public API only). */
function cellEditor(view: EditorHarness, row: number, col: number): EditorView {
  const editor = EditorView.findFromDOM(cellContent(view, row, col));
  if (!editor) throw new Error(`no nested view at ${row}:${col}`);
  return editor;
}

function wrapper(view: EditorHarness): HTMLElement | null {
  return view.view.contentDOM.querySelector<HTMLElement>(
    ".cm-live-table-wrapper",
  );
}

function selectedCells(view: EditorHarness): HTMLElement[] {
  return Array.from(
    view.view.contentDOM.querySelectorAll<HTMLElement>('[data-range="true"]'),
  );
}

function overlay(view: EditorHarness): HTMLElement | null {
  return view.view.contentDOM.querySelector<HTMLElement>(
    ".cm-live-table-range",
  );
}

/** The rendered cell that holds focus, through `data-row`/`data-col`. */
function focusedCell(): { row: string; col: string } {
  const host = (
    document.activeElement as HTMLElement | null
  )?.closest<HTMLElement>("[data-row]");
  expect(host).not.toBeNull();
  return {
    row: host?.getAttribute("data-row") ?? "",
    col: host?.getAttribute("data-col") ?? "",
  };
}

// ---------------------------------------------------------------- pointer

function mouse(type: string, init: MouseEventInit = {}): MouseEvent {
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

async function release(): Promise<void> {
  await act(async () => {
    document.dispatchEvent(mouse("mouseup"));
  });
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

// ----------------------------------------------------------------- keys

/**
 * Focus a cell at a decoded offset — the precondition of a real key event.
 *
 * The caret is set **after** a tick so the editor's focus transaction cannot
 * overwrite it (the repo's `focusSettled` lesson).
 */
async function focusCell(
  view: EditorHarness,
  row: number,
  col: number,
  offset = 0,
): Promise<void> {
  const editor = cellEditor(view, row, col);
  await act(async () => {
    editor.focus();
    await new Promise((resolve) => setTimeout(resolve, 0));
    editor.dispatch({ selection: { anchor: offset } });
  });
}

/**
 * Press a key on a focused cell the way a browser does: a real `keydown` on the
 * nested editor's content DOM, so React's capture handler and the cell keymap
 * both see the same event a user produces.
 */
function pressCell(
  view: EditorHarness,
  row: number,
  col: number,
  key: string,
): KeyboardEvent {
  const event = keyEvent(key);
  act(() => {
    cellContent(view, row, col).dispatchEvent(event);
  });
  return event;
}

/**
 * `Mod-Shift-z` as a browser reports it.
 *
 * A real browser gives a shifted letter its **shifted** name (`"Z"`) and a
 * physical `keyCode`; CodeMirror resolves `Mod-Shift-z` (normalized to
 * `Ctrl-Shift-z`) through its `base[keyCode]` lowercase fallback. jsdom's
 * synthetic event has `keyCode: 0` and the harness reports `key: "z"`, which
 * would make CodeMirror match the plain `Mod-z` binding first — a harness
 * artifact, not the app's behaviour. The two fields below restore the browser's
 * shape.
 */
function redoKeyEvent(): KeyboardEvent {
  const event = keyEvent("Mod-Shift-z");
  Object.defineProperty(event, "key", { value: "Z" });
  Object.defineProperty(event, "keyCode", { value: 90 });
  return event;
}

function pressRedo(
  view: EditorHarness,
  row: number,
  col: number,
): KeyboardEvent {
  const event = redoKeyEvent();
  act(() => {
    cellContent(view, row, col).dispatchEvent(event);
  });
  return event;
}

/**
 * Focus the **outer** editor and put its caret at `pos`.
 *
 * CodeMirror notices focus during an update and dispatches the focus effect a
 * turn later in jsdom, so the caret is placed after `focus()` and re-asserted
 * once more (`selection.test.ts`'s `focusSettled` lesson).
 */
async function focusOuter(view: EditorHarness, pos: number): Promise<void> {
  await act(async () => {
    view.focus();
    view.placeCaret(pos);
    await new Promise((resolve) => setTimeout(resolve, 0));
    view.placeCaret(pos);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Press a key on the outer content DOM the way a browser does. */
function pressOuter(view: EditorHarness, key: string): KeyboardEvent {
  const event = keyEvent(key);
  act(() => {
    view.view.contentDOM.dispatchEvent(event);
  });
  return event;
}

/** Replace a cell's text as user input, leaving it uncommitted. */
function typeInto(
  view: EditorHarness,
  row: number,
  col: number,
  text: string,
): void {
  const editor = cellEditor(view, row, col);
  act(() => {
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: text },
      userEvent: "input.type",
    });
  });
}

describe("B-6: Backspace after the table selects, then deletes", () => {
  it("B-6: the first Backspace selects the whole table without changing the document", async () => {
    const view = mount();
    const line = view.state().doc.line(view.state().doc.lines);

    await focusOuter(view, line.from);
    pressOuter(view, "Backspace");
    await settle();

    expect(view.doc()).toBe(DOC);
    expect(selectedCells(view)).toHaveLength(9);
    expect(wrapper(view)?.dataset.tableSelected).toBe("true");
    expect(overlay(view)?.dataset.rangeRows).toBe("0-2");
    expect(overlay(view)?.dataset.rangeCols).toBe("0-2");
  });

  it("B-6: the second Backspace deletes the block and its preceding newline", async () => {
    const view = mount();
    const line = view.state().doc.line(view.state().doc.lines);

    await focusOuter(view, line.from);
    pressOuter(view, "Backspace");
    await settle();
    expect(view.doc()).toBe(DOC);

    pressOuter(view, "Backspace");
    await settle();

    // The table and the newline that separated it from `intro` are gone; the
    // caret sits at the start of what is now the blank line below `intro`.
    expect(view.doc()).toBe("intro\n\n");
    expect(view.doc()).not.toContain("|");
    expect(view.state().selection.main.head).toBe(FROM - 1);
    expect(view.state().doc.lineAt(FROM - 1).from).toBe(FROM - 1);
  });

  it("B-6: Backspace mid-line after the table is left to the default", async () => {
    const view = mount(AFTER_DOC);
    const line = view.state().doc.line(AFTER_LINE);

    await focusOuter(view, line.from + 1);
    const event = pressOuter(view, "Backspace");
    await settle();

    expect(event.defaultPrevented).toBe(false);
    expect(view.doc()).toBe(AFTER_DOC);
    expect(selectedCells(view)).toHaveLength(0);
    expect(wrapper(view)?.dataset.tableSelected).toBeUndefined();
  });

  it("B-6: Backspace with a non-empty selection after the table is left to the default", async () => {
    const view = mount(AFTER_DOC);
    const line = view.state().doc.line(AFTER_LINE);

    await act(async () => {
      view.focus();
      view.select(line.from, line.from + 2);
    });
    const event = pressOuter(view, "Backspace");
    await settle();

    expect(event.defaultPrevented).toBe(false);
    expect(view.doc()).toBe(AFTER_DOC);
    expect(selectedCells(view)).toHaveLength(0);
  });

  it("B-6: Backspace at the start of the line above the table is left to the default", async () => {
    const view = mount();
    // Line 2 is the empty line between `intro` and the table: the table is
    // *below* it, and `renderedTableAbove` answers that relation only for the
    // line after a table.
    const line = view.state().doc.line(2);

    await focusOuter(view, line.from);
    const event = pressOuter(view, "Backspace");
    await settle();

    expect(event.defaultPrevented).toBe(false);
    expect(view.doc()).toBe(DOC);
    expect(selectedCells(view)).toHaveLength(0);
  });
});

describe("B-7: a range clear empties cells and keeps the grid", () => {
  it("B-7: Backspace over a partial range clears exactly those cells", async () => {
    const view = mount();

    await drag(view, { row: 1, col: 1 }, { row: 2, col: 2 });
    expect(selectedCells(view)).toHaveLength(4);

    await focusCell(view, 1, 1);
    pressCell(view, 1, 1, "Backspace");
    await settle();

    const lines = view.doc().split("\n");
    expect(lines[2]).toBe("| a | b | c |");
    expect(lines[4]).toBe("| d |  |  |");
    expect(lines[5]).toBe("| g |  |  |");
    // The cells are still there: this was a content clear, not a row delete.
    expect(view.doc()).toContain("| --- | --- | --- |");
    // The range is gone and the caret is in the anchor.
    expect(overlay(view)).toBeNull();
    expect(selectedCells(view)).toHaveLength(0);
    expect(focusedCell()).toEqual({ row: "1", col: "1" });
  });

  it("B-7: Delete over a partial range behaves like Backspace", async () => {
    const view = mount();

    await drag(view, { row: 1, col: 1 }, { row: 2, col: 2 });
    await focusCell(view, 1, 1);
    pressCell(view, 1, 1, "Delete");
    await settle();

    const lines = view.doc().split("\n");
    expect(lines[4]).toBe("| d |  |  |");
    expect(lines[5]).toBe("| g |  |  |");
    expect(focusedCell()).toEqual({ row: "1", col: "1" });
  });

  it("B-7: Backspace over the whole-table range deletes the table", async () => {
    const view = mount();

    await drag(view, { row: 0, col: 0 }, { row: 2, col: 2 });
    expect(selectedCells(view)).toHaveLength(9);

    pressCell(view, 0, 0, "Backspace");
    await settle();

    expect(view.doc()).toBe("intro\n\n");
    expect(view.doc()).not.toContain("|");
    expect(document.activeElement).toBe(view.view.contentDOM);
  });

  it("B-7: Backspace over a whole row band deletes the rows", async () => {
    // `@user` (2026-10-23): a row selection must remove the row, not empty it.
    const view = mount();

    await drag(view, { row: 1, col: 0 }, { row: 1, col: 2 });
    await focusCell(view, 1, 0);
    pressCell(view, 1, 0, "Backspace");
    await settle();

    const lines = view.doc().split("\n");
    expect(lines[2]).toBe("| a | b | c |");
    expect(lines[3]).toBe("| --- | --- | --- |");
    expect(lines[4]).toBe("| g | h | i |");
    expect(lines).toHaveLength(6);
  });

  it("B-7: Delete over a whole column band deletes the column", async () => {
    const view = mount();

    await drag(view, { row: 0, col: 1 }, { row: 2, col: 1 });
    await focusCell(view, 0, 1);
    pressCell(view, 0, 1, "Delete");
    await settle();

    expect(view.doc()).toBe(
      "intro\n\n| a | c |\n| --- | --- |\n| d | f |\n| g | i |\n",
    );
  });

  it("B-7: Escape still clears a range without touching the document", async () => {
    const view = mount();

    await drag(view, { row: 1, col: 1 }, { row: 2, col: 2 });
    expect(overlay(view)).not.toBeNull();

    pressCell(view, 1, 1, "Escape");
    await settle();

    expect(overlay(view)).toBeNull();
    expect(selectedCells(view)).toHaveLength(0);
    expect(view.doc()).toBe(DOC);
  });
});

describe("B-7: typing over a range (policy §11-3)", () => {
  it("B-7: a printable character clears the range and lands in the anchor", async () => {
    const view = mount();

    await drag(view, { row: 1, col: 1 }, { row: 2, col: 2 });
    await focusCell(view, 1, 1);

    const event = pressCell(view, 1, 1, "x");
    await settle();

    // One write: the rectangle is empty and only the anchor has the character.
    const lines = view.doc().split("\n");
    expect(lines[4]).toBe("| d | x |  |");
    expect(lines[5]).toBe("| g |  |  |");
    expect(event.defaultPrevented).toBe(true);
    expect(overlay(view)).toBeNull();
    expect(selectedCells(view)).toHaveLength(0);
    // The caret sits after the character it just typed.
    expect(focusedCell()).toEqual({ row: "1", col: "1" });
    expect(cellEditor(view, 1, 1).state.selection.main.head).toBe(1);
  });
});

describe("B-7: history in a cell (policy §11-4)", () => {
  it("B-7: Mod-z writes the cell edit to the document, then the outer history undoes it", async () => {
    const view = mount();
    typeInto(view, 1, 1, "typed");
    expect(view.doc()).toBe(DOC);

    await focusCell(view, 1, 1);
    pressCell(view, 1, 1, "Mod-z");

    // The commit is synchronous while the outer view is idle, so the pending
    // cell text has already reached the document…
    expect(view.doc()).toContain("| d | typed | f |");

    await settle();
    // …and the deferred forward reverts exactly that write.
    expect(view.doc()).toBe(DOC);
    // The caret stays in the cell that asked for the undo, not at the first
    // line of the document (`@user`, 2026-10-23).
    expect(focusedCell()).toEqual({ row: "1", col: "1" });

    await focusCell(view, 1, 1);
    pressRedo(view, 1, 1);
    // A redo commits nothing new (the model matches the document) and is
    // deferred like every history action.
    expect(view.doc()).toBe(DOC);

    await settle();
    expect(view.doc()).toContain("| d | typed | f |");
  });
});

describe("B-7: range semantics never dispatch inside a CodeMirror update", () => {
  it("B-7: a clear defers its write until the outer view is idle", async () => {
    const view = mount();

    await drag(view, { row: 1, col: 1 }, { row: 2, col: 2 });
    await focusCell(view, 1, 1);

    // Only the widget's `setTimeout(0)` is faked. `requestAnimationFrame` stays
    // real: CodeMirror schedules its measurement on a frame, and a *faked*
    // frame queued here would be dropped with the fake clock and surface after
    // the environment tears down (jsdom's `Range#getClientRects` is gone then).
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      // `viewIsIdle` reads this field; `1` is "an update is in progress", the
      // state a key event can arrive in during a focus handoff.
      const cm = view.view as unknown as { updateState: number };
      cm.updateState = 1;
      pressCell(view, 1, 1, "Backspace");
      cm.updateState = 0;

      // Nothing dispatched inside the update…
      expect(view.doc()).toBe(DOC);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      // …and the write lands once the update is over.
      expect(view.doc()).toContain("| d |  |  |");
    } finally {
      vi.useRealTimers();
    }
  });
});
