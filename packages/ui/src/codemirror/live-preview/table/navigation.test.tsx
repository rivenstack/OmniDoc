// Table keyboard navigation, end to end — F-15 Task 3.3 Rev 2, plan Task C.2.
//
// `OBS-1.14.4-TABLE-001` says Tab and Enter move between the per-cell editors,
// and that arrows leave the table from its edges. The pure matrix lives in
// `structure.test.ts`; this suite proves the **wiring**: a real `keydown` on a
// focused cell's content DOM reaches the cell keymap, the grid translates the
// result into focus or a write, and the widget places the outer caret when the
// caret steps off the table.
//
// The `@user`-directed behaviours in play (plan §1, 2026-10-16) are recorded as
// directed, never parity claims:
//
// - J-1: Shift-Tab at `(0,0)` pushes the header down and leaves it empty;
// - Tab off the last cell appends a body row;
// - arrows past an edge put the caret on the line before/after the table, and
//   the document gains a line when the table is the document's last block.
//
// `@user` defect 3 (2026-10-23, "can not go to the next line") is the reason the
// after-edge caret is `to + 1`: a caret that legitimately stepped off the table
// must not be yanked back into a cell. `to` itself is still a redirect point
// while a line follows (that is how ArrowUp re-enters the last row), and when
// the table is the document's last block `to === docLength` creates the line
// instead (`scan.ts` + `selection.test.ts`, `@user` 2026-10-23: "I can not click
// after the table").

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorView, keymap } from "@codemirror/view";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createHarness,
  keyEvent,
  type EditorHarness,
} from "../../parity/harness";
import { TABLE_IDLE_FLUSH_MS } from "./editor";
import { tableLivePreview } from "./scan";

const LANGUAGE = markdown({ base: markdownLanguage });

/**
 * The caret motion the outer editor's vertical arrows have, minus layout.
 *
 * The app installs `defaultKeymap` (`codemirror/keymap.ts`), but its vertical
 * motion measures the DOM (`getClientRects`), which jsdom does not implement.
 * The entering tests still press **real** keys on the outer content DOM — the
 * event runs CodeMirror's own DOM/keymap path and dispatches a real selection
 * transaction — with a minimal binding that reproduces the one effect under
 * test: the caret moves to the neighbouring line.
 */
function moveToAdjacentLine(view: EditorView, delta: number): boolean {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  const target = line.number + delta;
  if (target < 1 || target > view.state.doc.lines) return false;
  const next = view.state.doc.line(target);
  // A caret arriving from another line lands at that line's end for the line
  // length this fixture uses; the exact column is not what these tests assert.
  view.dispatch({ selection: { anchor: next.to } });
  return true;
}

const OUTER_KEYS = keymap.of([
  { key: "ArrowUp", run: (view: EditorView) => moveToAdjacentLine(view, -1) },
  { key: "ArrowDown", run: (view: EditorView) => moveToAdjacentLine(view, 1) },
]);

/** Two columns and two body rows, with a line above so `before` has a target. */
const DOC = "intro\n\n| a | b |\n| --- | --- |\n| c | d |\n| e | f |\n";

/** The block's start offset in {@link DOC}. */
const FROM = DOC.indexOf("| a |");

/** A table at the very end of the document: no trailing newline. */
const LAST = "intro\n\n| a | b |\n| --- | --- |\n| c | d |\n| e | f |";

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
      extensions: [LANGUAGE, OUTER_KEYS, tableLivePreview],
    });
  });
  if (!created) throw new Error("the harness did not mount");
  harness = created;
  return harness;
}

/** Let deferred tasks — the widget's leave timer, React's work — run. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** One cell's nested editor content DOM, through the public DOM contract. */
function cellContent(
  view: EditorHarness,
  row: number,
  col: number,
): HTMLElement {
  const host = view.view.contentDOM.querySelector<HTMLElement>(
    `[data-row="${row}"][data-col="${col}"]`,
  );
  const content = host?.querySelector<HTMLElement>(".cm-content");
  if (!content) throw new Error(`no nested editor at ${row}:${col}`);
  return content;
}

/** One cell's nested `EditorView` (public API only). */
function cellEditor(
  view: EditorHarness,
  row: number,
  col: number,
): EditorView {
  const editor = EditorView.findFromDOM(cellContent(view, row, col));
  if (!editor) throw new Error(`no nested view at ${row}:${col}`);
  return editor;
}

/**
 * Focus a cell at a decoded offset — the precondition of every key press.
 *
 * The caret is set **after** a flush: a nested editor's focus transaction can
 * overwrite a selection dispatched in the same tick (the repo's
 * `focusSettled` lesson), and an ArrowDown test that thinks the caret is at the
 * cell's end would silently test the mid-cell path instead.
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

/** Replace a cell's text as user input (arms the idle flush). */
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

/**
 * Press a key on a focused cell the way a browser does.
 *
 * A real `keydown` on the nested editor's content DOM is what runs the cell
 * keymap and lets CodeMirror call `preventDefault()` — which is the signal the
 * outer editor uses to ignore the key.
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
 * Focus the **outer** editor and put its caret at `pos`.
 *
 * CodeMirror notices focus during an update and dispatches the focus effect a
 * turn later in jsdom, so the caret is placed after `focus()` and re-asserted
 * once more (the `selection.test.ts` `focusSettled` lesson). Without this the
 * redirector sees an unfocused view and stays out of the way.
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

describe("TABLE-001: Tab moves between cells and appends a row at the end", () => {
  it("TABLE-001: Tab focuses the next cell and prevents the browser default", async () => {
    const view = mount();
    await focusCell(view, 0, 0, 0);

    const event = pressCell(view, 0, 0, "Tab");
    await settle();

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(cellContent(view, 0, 1));
    expect(cellEditor(view, 0, 1).state.selection.main.head).toBe(1);
    // A move between cells is not a document edit.
    expect(view.doc()).toBe(DOC);
  });

  it("TABLE-001: Tab off the last cell appends a body row and focuses it", async () => {
    const view = mount();
    const lines = view.state().doc.lines;
    await focusCell(view, 2, 1, 1);

    const event = pressCell(view, 2, 1, "Tab");
    await settle();

    expect(event.defaultPrevented).toBe(true);
    expect(view.state().doc.lines).toBe(lines + 1);
    const rendered = view.doc().split("\n");
    // The appended row is the last table line (the document's own trailing
    // newline is the final, empty entry).
    expect(rendered[rendered.length - 2]).toBe("|  |  |");
    expect(document.activeElement).toBe(cellContent(view, 3, 0));
    // The header and existing rows are untouched.
    expect(rendered[2]).toBe("| a | b |");
  });

  it("TABLE-001: Shift-Tab at (0,0) pushes the header down (J-1, @user-directed)", async () => {
    const view = mount();
    await focusCell(view, 0, 0, 0);

    const event = pressCell(view, 0, 0, "Shift-Tab");
    await settle();

    expect(event.defaultPrevented).toBe(true);
    const lines = view.doc().split("\n");
    // `intro` and the blank line above the table are untouched.
    expect(lines[0]).toBe("intro");
    expect(lines[2]).toBe("|  |  |");
    expect(lines[3]).toBe("| --- | --- |");
    expect(lines[4]).toBe("| a | b |");
    expect(lines[5]).toBe("| c | d |");
    expect(lines[6]).toBe("| e | f |");
    // The caret stays in the now-empty header cell.
    expect(document.activeElement).toBe(cellContent(view, 0, 0));
    expect(cellEditor(view, 0, 0).state.doc.toString()).toBe("");
  });
});

describe("TABLE-001: arrows leave the table, before and after", () => {
  it("TABLE-001: ArrowDown on the last row adds a trailing line when the table is last", async () => {
    const view = mount(LAST);
    await focusCell(view, 2, 0, 1);

    const event = pressCell(view, 2, 0, "ArrowDown");
    await settle();

    expect(event.defaultPrevented).toBe(true);
    // The table was the last block: it gains the line the caret goes to.
    expect(view.doc()).toBe(`${LAST}\n`);
    expect(view.view.state.selection.main.head).toBe(view.doc().length);
    expect(document.activeElement).toBe(view.view.contentDOM);
  });

  it("TABLE-001: ArrowDown on the last row moves to an existing following line", async () => {
    const view = mount(DOC);
    await focusCell(view, 2, 0, 1);

    pressCell(view, 2, 0, "ArrowDown");
    await settle();

    // `DOC` already ends in a newline, so the caret is placed on that line.
    expect(view.doc()).toBe(DOC);
    expect(view.view.state.selection.main.head).toBe(DOC.length);
    expect(document.activeElement).toBe(view.view.contentDOM);
  });

  it("TABLE-001: ArrowUp on the header places the caret before the table", async () => {
    const view = mount(DOC);
    await focusCell(view, 0, 1, 0);

    const event = pressCell(view, 0, 1, "ArrowUp");
    await settle();

    expect(event.defaultPrevented).toBe(true);
    expect(view.doc()).toBe(DOC);
    // `from` is a line start, so `from - 1` is the end of the previous line.
    expect(view.view.state.selection.main.head).toBe(FROM - 1);
    expect(document.activeElement).toBe(view.view.contentDOM);
  });

  it("TABLE-001: ArrowUp on the header adds the line before a first-block table", async () => {
    // The table is the whole document, so there is no line above it: `before`
    // has to create one (the mirror of the `LAST` case below).
    const view = mount(LAST.slice(LAST.indexOf("| a |")));
    await focusCell(view, 0, 1, 0);

    pressCell(view, 0, 1, "ArrowUp");
    await settle();

    expect(view.doc()).toBe(`\n${LAST.slice(LAST.indexOf("| a |"))}`);
    expect(view.view.state.selection.main.head).toBe(0);
    expect(document.activeElement).toBe(view.view.contentDOM);
  });

  it("TABLE-001: the tail strip creates the line after a last-block table", async () => {
    // A click below the table is the `@user` case: with no line there is no
    // document position to click, so the grid renders a strip under the table.
    const view = mount(LAST);
    await focusOuter(view, LAST.length);

    const strip = view.view.contentDOM.querySelector<HTMLElement>(
      ".cm-live-table-tail",
    );
    expect(strip).not.toBeNull();
    act(() => {
      strip?.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
      );
    });
    await settle();

    expect(view.doc()).toBe(`${LAST}\n`);
    expect(view.view.state.selection.main.head).toBe(view.doc().length);
    expect(document.activeElement).toBe(view.view.contentDOM);
  });

  it("TABLE-001: ArrowDown at the end of a last-block table creates the line", async () => {
    // After the trailing line is deleted the caret is already at the document's
    // end, so no selection change can trigger the redirector; the key itself has
    // to ask for the line.
    const view = mount(LAST);
    await focusOuter(view, LAST.length);

    pressOuter(view, "ArrowDown");
    await settle();

    expect(view.doc()).toBe(`${LAST}\n`);
    expect(view.view.state.selection.main.head).toBe(view.doc().length);
  });

  it("TABLE-001: the tail strip works again after the line is deleted", async () => {
    // `@user` (2026-10-23): delete the auto-added line with Backspace and the
    // table became unreachable below. The leave must not latch the widget off:
    // adding the line does not replace the table, so this instance stays alive.
    const view = mount(LAST);
    await focusOuter(view, LAST.length);

    const clickTail = async () => {
      const strip = view.view.contentDOM.querySelector<HTMLElement>(
        ".cm-live-table-tail",
      );
      act(() => {
        strip?.dispatchEvent(
          new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
        );
      });
      await settle();
    };

    await clickTail();
    expect(view.doc()).toBe(`${LAST}\n`);

    // Backspace at the start of the trailing line deletes it (B-6 is C.5).
    act(() => {
      view.view.dispatch({
        changes: { from: LAST.length, to: LAST.length + 1, insert: "" },
      });
    });
    expect(view.doc()).toBe(LAST);

    await clickTail();
    expect(view.doc()).toBe(`${LAST}\n`);
    expect(view.view.state.selection.main.head).toBe(view.doc().length);
  });
});

describe("TABLE-007: entering the table from outside", () => {
  it("TABLE-007: ArrowUp anywhere on the line after the table enters the last row", async () => {
    // CodeMirror's vertical motion treats a block widget as zero lines, so the
    // caret would jump from the line after the table to the line *above* it.
    // The key is answered before that motion, from any column on the line.
    const view = mount(DOC);
    await focusOuter(view, DOC.length);

    const event = pressOuter(view, "ArrowUp");
    await settle();

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(cellContent(view, 2, 0));
    expect(view.doc()).toBe(DOC);
  });

  it("TABLE-007: ArrowDown on the line before the table enters the header row", async () => {
    const view = mount(DOC);
    await focusOuter(view, FROM - 1);

    const event = pressOuter(view, "ArrowDown");
    await settle();

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(cellContent(view, 0, 0));
  });

  it("TABLE-007: vertical arrows two lines away do not enter the table", async () => {
    // Only the *adjacent* line is intercepted; prose motion is untouched.
    const table = LAST.slice(LAST.indexOf("| a |"));
    const view = mount(`one\n\nintro\n\n${table}\n\nbelow\n`);
    await focusOuter(view, view.doc().indexOf("below"));

    const event = pressOuter(view, "ArrowUp");
    await settle();

    // The document keymap still owns the key (its motion runs); what matters
    // is that the table did not take the caret.
    void event;
    expect(document.activeElement).toBe(view.view.contentDOM);
    expect(
      view.view.contentDOM.querySelector('[data-active="true"]'),
    ).toBeNull();
  });

  it("TABLE-007: ArrowUp from the line after the table focuses the last row", async () => {
    const view = mount(DOC);
    // The last line is the empty one after the table's trailing newline.
    await focusOuter(view, DOC.length);

    pressOuter(view, "ArrowUp");
    await settle();

    // A **real** nested editor took focus: the last row's cell is the active
    // element, registers itself as active through the grid, and the document
    // did not unfold.
    const active = document.activeElement as HTMLElement | null;
    expect(active).not.toBeNull();
    expect(EditorView.findFromDOM(active as HTMLElement)).not.toBeNull();
    const host = active?.closest<HTMLElement>("[data-row]");
    expect(host?.getAttribute("data-row")).toBe("2");
    expect(host?.getAttribute("data-active")).toBe("true");
    expect(view.doc()).toBe(DOC);
  });

  it("TABLE-007: ArrowDown from the line before the table focuses the header row", async () => {
    const view = mount(DOC);
    // `FROM - 1` is the end of the blank line between `intro` and the table.
    await focusOuter(view, FROM - 1);

    pressOuter(view, "ArrowDown");
    await settle();

    const active = document.activeElement as HTMLElement | null;
    expect(active).not.toBeNull();
    expect(EditorView.findFromDOM(active as HTMLElement)).not.toBeNull();
    const host = active?.closest<HTMLElement>("[data-row]");
    expect(host?.getAttribute("data-row")).toBe("0");
    expect(host?.getAttribute("data-active")).toBe("true");
    expect(view.doc()).toBe(DOC);
  });
});

describe("TABLE-001: leaving does not lose the last keystroke", () => {
  it("TABLE-001: ArrowDown writes uncommitted cell text before moving out", async () => {
    const view = mount(LAST);
    await focusCell(view, 1, 0, 0);
    typeInto(view, 1, 0, "typed");
    // The document is untouched until a commit point.
    expect(view.doc()).toBe(LAST);

    await focusCell(view, 2, 0, 1);
    pressCell(view, 2, 0, "ArrowDown");
    await settle();

    expect(view.doc()).toBe(`${LAST.replace("| c |", "| typed |")}\n`);
  });
});

describe("the idle write rebuilds without stealing focus (@user, 2026-10-23)", () => {
  it("keeps the caret in the cell that has focus when the idle flush lands", async () => {
    const view = mount(LAST);
    await focusCell(view, 1, 0, 0);

    vi.useFakeTimers();
    try {
      typeInto(view, 1, 0, "typed");

      // Move on before the timer fires: the timer must resolve focus from the
      // live store, not from the cell that armed it (`@user` reported the caret
      // jumping back to the previous cell after a pause).
      act(() => {
        cellEditor(view, 1, 1).focus();
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      cellEditor(view, 1, 1).dispatch({ selection: { anchor: 0 } });
      expect(document.activeElement).toBe(cellContent(view, 1, 1));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(TABLE_IDLE_FLUSH_MS + 10);
      });

      // The write happened…
      expect(view.doc()).toContain("| typed |");
      // …and after the rebuild the focused cell is still the one the user is in.
      expect(document.activeElement).toBe(cellContent(view, 1, 1));
    } finally {
      vi.useRealTimers();
    }
  });
});
