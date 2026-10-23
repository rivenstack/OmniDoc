// Table structure commands, end to end — F-15 Task 3.3 Rev 2, plan Task C.3.
//
// `OBS-1.14.4-MENU-002` is a **separate, `@user`-directed** table-cell context
// menu (plan §4.6, 2026-10-16). It is not a parity claim: the sections, the
// header-cell row subset, the inferred "move column" mirror and the direction
// rules are what `@user` asked for.
//
// The pure command layer lives in `structure.test.ts`; this suite proves the
// **wiring**: a command run over the grid's collected model goes through the
// widget's one write pipeline, the document changes, and the caret lands in the
// cell the command named. `deleteTable` is the exception in the other direction:
// it removes the block *and its preceding newline* and puts the caret in the
// outer editor.
//
// The deferral assertion is the plan's hard rule (§4.7): a write must never be
// dispatched from inside a CodeMirror update. `commit` commands go through
// `writeDoc` (which defers when the view is busy), and `deleteTable` always
// defers its dispatch.

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createHarness,
  type EditorHarness,
} from "../../parity/harness";
import { tableLivePreview } from "./scan";
import {
  addColumnRight,
  addRowAbove,
  addRowBelow,
  deleteColumn,
  deleteTable,
  duplicateColumn,
  sortColumn,
  type StructureResult,
} from "./structure";
import { runTableStructureCommand } from "./widget";

const LANGUAGE = markdown({ base: markdownLanguage });

/** Two columns and two body rows, with a paragraph above the table. */
const TABLE = "| a | b |\n| --- | --- |\n| c | d |\n| e | f |";
const DOC = `intro\n\n${TABLE}\n`;
/** The block's start offset in {@link DOC}. */
const FROM = DOC.indexOf("| a |");

/** Body rows out of order, to make a sort observable. */
const SORT_DOC = "intro\n\n| name | qty |\n| --- | --- |\n| z | 2 |\n| a | 1 |\n";
const SORT_FROM = SORT_DOC.indexOf("| name |");

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

/** Let deferred tasks — the widget's timers, React's work — run. */
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

/**
 * Run a command the way a menu item will: against the live widget, over the
 * grid's collected model.
 */
function run(
  view: EditorHarness,
  resolve: (model: Parameters<typeof addRowBelow>[0]) => StructureResult,
  tableFrom: number = FROM,
): void {
  act(() => {
    const started = runTableStructureCommand(view.view, tableFrom, resolve);
    expect(started).toBe(true);
  });
}

/** The rendered cell that holds focus. */
function focusedCell(): { row: string; col: string } {
  const host = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>(
    "[data-row]",
  );
  expect(host).not.toBeNull();
  return {
    row: host?.getAttribute("data-row") ?? "",
    col: host?.getAttribute("data-col") ?? "",
  };
}

describe("MENU-002: row structure commands through the commit pipeline", () => {
  it("MENU-002: addRowBelow writes the row, folds in the uncommitted text, and focuses it", async () => {
    const view = mount();
    // `@user`'s pipeline rule: the command runs over `collect()`, so a cell typed
    // into but not yet flushed is part of the same write.
    typeInto(view, 1, 0, "typed");
    expect(view.doc()).toBe(DOC);

    run(view, (model) => addRowBelow(model, { row: 1, col: 0 }));
    await settle();

    const lines = view.doc().split("\n");
    expect(lines[4]).toBe("| typed | d |");
    // The new empty row is directly below the clicked row.
    expect(lines[5]).toBe("|  |  |");
    expect(lines[6]).toBe("| e | f |");
    expect(focusedCell()).toEqual({ row: "2", col: "0" });
    expect(cellEditor(view, 2, 0).state.doc.toString()).toBe("");
  });

  it("MENU-002: a command that cannot apply writes nothing", async () => {
    const view = mount();

    run(view, (model) => addRowAbove(model, { row: 0, col: 0 }));
    await settle();

    expect(view.doc()).toBe(DOC);
  });

  it("MENU-002: a commit command defers its write outside a CodeMirror update", async () => {
    const view = mount();
    vi.useFakeTimers();
    try {
      // `viewIsIdle` reads this field; `1` is "an update is in progress", which
      // is exactly the case a menu click can arrive in.
      const cm = view.view as unknown as { updateState: number };
      cm.updateState = 1;
      act(() => {
        runTableStructureCommand(view.view, FROM, (model) =>
          addRowBelow(model, { row: 1, col: 0 }),
        );
      });
      cm.updateState = 0;

      // Nothing dispatched inside the update…
      expect(view.doc()).toBe(DOC);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      // …and the deferred write lands once the update is over.
      expect(view.doc()).toContain("|  |  |");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("MENU-002: column structure commands through the commit pipeline", () => {
  it("MENU-002: addColumnRight inserts a column and focuses its header", async () => {
    const view = mount();

    run(view, (model) => addColumnRight(model, { row: 0, col: 0 }));
    await settle();

    const lines = view.doc().split("\n");
    expect(lines[2]).toBe("| a |  | b |");
    expect(lines[3]).toBe("| --- | --- | --- |");
    expect(lines[4]).toBe("| c |  | d |");
    expect(focusedCell()).toEqual({ row: "0", col: "1" });
    expect(cellEditor(view, 0, 1).state.doc.toString()).toBe("");
  });

  it("MENU-002: duplicateColumn copies to the right and focuses the copy's header", async () => {
    const view = mount();

    run(view, (model) => duplicateColumn(model, { row: 1, col: 1 }));
    await settle();

    const lines = view.doc().split("\n");
    expect(lines[2]).toBe("| a | b | b |");
    expect(lines[4]).toBe("| c | d | d |");
    expect(focusedCell()).toEqual({ row: "0", col: "2" });
    expect(cellEditor(view, 0, 2).state.doc.toString()).toBe("b");
  });

  it("MENU-002: deleteColumn removes the column and focuses the clamped header", async () => {
    const view = mount();

    run(view, (model) => deleteColumn(model, { row: 0, col: 0 }));
    await settle();

    const lines = view.doc().split("\n");
    expect(lines[2]).toBe("| b |");
    expect(lines[4]).toBe("| d |");
    expect(focusedCell()).toEqual({ row: "0", col: "0" });
    expect(cellEditor(view, 0, 0).state.doc.toString()).toBe("b");
  });

  it("MENU-002: sortColumn reorders the body and keeps the caret in the clicked cell", async () => {
    const view = mount(SORT_DOC);

    run(
      view,
      (model) => sortColumn(model, { row: 2, col: 0 }, "asc"),
      SORT_FROM,
    );
    await settle();

    const lines = view.doc().split("\n");
    // The header is fixed; the body is ordered.
    expect(lines[2]).toBe("| name | qty |");
    expect(lines[4]).toBe("| a | 1 |");
    expect(lines[5]).toBe("| z | 2 |");
    expect(focusedCell()).toEqual({ row: "2", col: "0" });
    // Focus stays in the same visual cell; the *row* under it is now `z`, which
    // is the whole point of a sort — the caret is not following the old content.
    expect(cellEditor(view, 2, 0).state.doc.toString()).toBe("z");
  });
});

describe("MENU-002: delete table removes the block and its preceding newline", () => {
  it("MENU-002: deleteTable leaves the surrounding lines joined and focuses the outer editor", async () => {
    const view = mount();

    run(view, () => deleteTable());

    // Deferred like every leave: no dispatch before the timer runs.
    expect(view.doc()).toBe(DOC);

    await settle();

    // `intro\n` + the table's own trailing newline; the table and the newline
    // that separated it from `intro` are gone.
    expect(view.doc()).toBe("intro\n\n");
    expect(view.doc()).not.toContain("|");
    expect(view.view.state.selection.main.head).toBe(FROM - 1);
    expect(document.activeElement).toBe(view.view.contentDOM);
  });
});
