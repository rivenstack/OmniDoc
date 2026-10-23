// The table's hover `+` affordances, end to end — F-15 Task 3.3 Rev 2, plan
// Task D.1, amended by `@user` on 2026-10-23.
//
// The first D.1 reading was a single circular `+` revealed by hovering the
// **table**. `@user` directed a different capture: two full-size ghost strips —
// one hugging the table's inline-end edge ("Add column to the right") and one
// hugging its bottom edge ("Add row below") — each invisible until the pointer
// or keyboard focus is on **that strip**. Neither is a circular icon button,
// and the table's own hover reveals nothing.
//
// The row `+` is `@user`-directed (2026-10-23) and overrides the plan's §9
// out-of-scope line for it; like every other case in this suite it is **not** a
// parity claim.
//
// This suite proves the wiring inside the rendered widget: per-strip reveal
// (`data-visible`), the tooltip texts, the `mousedown` + `preventDefault` press
// (one commit, never a pre-add blur write), activation via click and via Enter,
// and the absent-in-a-locked-note rule. jsdom has no layout, so positions are
// the theme's concern; what is asserted is the structural contract a browser
// acts on.

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createHarness,
  keyEvent,
  type EditorHarness,
} from "../../parity/harness";
import { ADD_COLUMN_LABEL, ADD_ROW_LABEL } from "./affordances";
import { tableLivePreview } from "./scan";

const LANGUAGE = markdown({ base: markdownLanguage });

/** Two columns and two body rows, with a paragraph above the table. */
const TABLE = "| a | b |\n| --- | --- |\n| c | d |\n| e | f |";
const DOC = `intro\n\n${TABLE}\n`;

let harness: EditorHarness | null = null;

afterEach(() => {
  vi.useRealTimers();
  harness?.destroy();
  harness = null;
});

/** Mount the table extension. `act` because the widget opens a React root. */
function mount(
  doc: string = DOC,
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
  return harness;
}

/** Let deferred tasks — the widget's timers, React's work — run. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function strip(view: EditorHarness, direction: "column" | "row"): HTMLElement {
  const element = view.view.contentDOM.querySelector<HTMLElement>(
    direction === "column"
      ? ".cm-live-table-add-column"
      : ".cm-live-table-add-row",
  );
  if (!element) throw new Error(`no ${direction} strip`);
  return element;
}

function optionalStrip(
  view: EditorHarness,
  direction: "column" | "row",
): HTMLElement | null {
  return view.view.contentDOM.querySelector<HTMLElement>(
    direction === "column"
      ? ".cm-live-table-add-column"
      : ".cm-live-table-add-row",
  );
}

/** The structural reveal contract. */
function visible(element: HTMLElement): string | null {
  return element.getAttribute("data-visible");
}

/** Hover one element the way a pointer does (React synthesises enter/leave). */
async function hover(element: HTMLElement): Promise<void> {
  await act(async () => {
    element.dispatchEvent(
      new MouseEvent("mouseover", { bubbles: true, cancelable: true }),
    );
  });
}

/** Move the pointer off one element. */
async function leave(element: HTMLElement): Promise<void> {
  await act(async () => {
    element.dispatchEvent(
      new MouseEvent("mouseout", { bubbles: true, cancelable: true }),
    );
  });
}

/** One mouse event on a strip. */
function mouse(type: "mousedown" | "click"): MouseEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
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
function cellEditor(view: EditorHarness, row: number, col: number): EditorView {
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

/** The rendered cell that holds focus. */
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

/** Count the widget's document writes, in order. */
function countWrites(): {
  extension: Extension;
  writes: string[];
} {
  const writes: string[] = [];
  const extension = EditorView.updateListener.of((update) => {
    if (update.docChanged) writes.push(update.state.doc.toString());
  });
  return { extension, writes };
}

describe("D.1 (@user-directed, 2026-10-23): the two strips exist, hidden", () => {
  it("D.1: both strips are mounted, hidden by default, and in the tab order", () => {
    const view = mount();

    const column = strip(view, "column");
    const row = strip(view, "row");

    // Neither is revealed until its own strip is hovered or focused.
    expect(visible(column)).toBe("false");
    expect(visible(row)).toBe("false");

    // Labelled buttons, not bare glyphs, and keyboard reachable even while
    // invisible (this is what closes the earlier hover-only gap).
    for (const [element, label] of [
      [column, ADD_COLUMN_LABEL],
      [row, ADD_ROW_LABEL],
    ] as const) {
      expect(element.tagName).toBe("BUTTON");
      expect(element.getAttribute("type")).toBe("button");
      expect(element.getAttribute("aria-label")).toBe(label);
      expect(element.tabIndex).toBe(0);
    }

    // Both are descendants of the grid, so their presses reach its handlers.
    const grid = view.view.contentDOM.querySelector(".cm-live-table-grid");
    expect(grid?.contains(column)).toBe(true);
    expect(grid?.contains(row)).toBe(true);
  });

  it("D.1: hovering the table itself reveals neither strip", async () => {
    const view = mount();
    const column = strip(view, "column");
    const row = strip(view, "row");

    // The removed table-wide reveal: a pointer moving across cells is not an
    // affordance.
    await hover(cellContent(view, 1, 1));

    expect(visible(column)).toBe("false");
    expect(visible(row)).toBe("false");
  });

  it("D.1: hovering the column strip reveals only the column strip", async () => {
    const view = mount();
    const column = strip(view, "column");
    const row = strip(view, "row");

    await hover(column);

    expect(visible(column)).toBe("true");
    expect(visible(row)).toBe("false");

    await leave(column);

    expect(visible(column)).toBe("false");
    expect(visible(row)).toBe("false");
  });

  it("D.1: hovering the row strip reveals only the row strip", async () => {
    const view = mount();
    const column = strip(view, "column");
    const row = strip(view, "row");

    await hover(row);

    expect(visible(row)).toBe("true");
    expect(visible(column)).toBe("false");

    await leave(row);

    expect(visible(row)).toBe("false");
    expect(visible(column)).toBe("false");
  });

  it("D.1: keyboard focus reveals the focused strip", async () => {
    const view = mount();
    const column = strip(view, "column");
    const row = strip(view, "row");

    await act(async () => {
      column.focus();
    });
    expect(document.activeElement).toBe(column);
    expect(visible(column)).toBe("true");
    expect(visible(row)).toBe("false");

    // Moving focus to the other strip hides the first one and reveals the
    // second — again, no table-wide state.
    await act(async () => {
      row.focus();
    });
    expect(document.activeElement).toBe(row);
    expect(visible(column)).toBe("false");
    expect(visible(row)).toBe("true");
  });

  it("D.1: neither strip is rendered in a locked note, even on hover", async () => {
    const view = mount(DOC, [EditorState.readOnly.of(true)]);
    // The fixture is a real rendered table, not a failed mount.
    expect(cellContent(view, 0, 0)).not.toBeNull();

    expect(optionalStrip(view, "column")).toBeNull();
    expect(optionalStrip(view, "row")).toBeNull();

    await hover(cellContent(view, 1, 1));

    expect(optionalStrip(view, "column")).toBeNull();
    expect(optionalStrip(view, "row")).toBeNull();
  });
});

describe("S3: the tooltips", () => {
  it("S3: the column strip's tooltip text is exactly 'Add column to the right'", async () => {
    const view = mount();

    await act(async () => {
      strip(view, "column").focus();
    });
    await settle();

    const tooltip = document.body.querySelector<HTMLElement>(
      '[data-slot="tooltip-content"]',
    );
    expect(tooltip).not.toBeNull();
    expect(tooltip?.textContent).toBe("Add column to the right");
    expect(tooltip?.textContent).toBe(ADD_COLUMN_LABEL);
  });

  it("S3: the row strip's tooltip text is exactly 'Add row below'", async () => {
    const view = mount();

    await act(async () => {
      strip(view, "row").focus();
    });
    await settle();

    const tooltip = document.body.querySelector<HTMLElement>(
      '[data-slot="tooltip-content"]',
    );
    expect(tooltip).not.toBeNull();
    expect(tooltip?.textContent).toBe("Add row below");
    expect(tooltip?.textContent).toBe(ADD_ROW_LABEL);
  });
});

describe("S3: activation", () => {
  it("S3: the column strip appends an empty column on the right and focuses its header", async () => {
    const view = mount();

    await act(async () => {
      const column = strip(view, "column");
      column.dispatchEvent(mouse("mousedown"));
      column.dispatchEvent(mouse("click"));
    });
    await settle();

    const lines = view.doc().split("\n");
    // Every row gains an empty cell at the end; existing cells are untouched.
    expect(lines[2]).toBe("| a | b |  |");
    expect(lines[3]).toBe("| --- | --- | --- |");
    expect(lines[4]).toBe("| c | d |  |");
    expect(lines[5]).toBe("| e | f |  |");
    // The caret is in the new column's header cell, which is empty.
    expect(focusedCell()).toEqual({ row: "0", col: "2" });
    expect(cellEditor(view, 0, 2).state.doc.toString()).toBe("");
  });

  it("S3: the row strip appends an empty body row at the bottom and focuses its first cell", async () => {
    const view = mount();

    await act(async () => {
      const row = strip(view, "row");
      row.dispatchEvent(mouse("mousedown"));
      row.dispatchEvent(mouse("click"));
    });
    await settle();

    const lines = view.doc().split("\n");
    // The existing rows are untouched…
    expect(lines[2]).toBe("| a | b |");
    expect(lines[3]).toBe("| --- | --- |");
    expect(lines[4]).toBe("| c | d |");
    expect(lines[5]).toBe("| e | f |");
    // …and exactly one empty row is appended below the last one.
    expect(lines[6]).toBe("|  |  |");
    expect(lines).toHaveLength(8);
    // The caret is in the new row's **first** cell, which is empty.
    expect(focusedCell()).toEqual({ row: "3", col: "0" });
    expect(cellEditor(view, 3, 0).state.doc.toString()).toBe("");
  });
});

describe("S3: the mousedown trigger does not commit the pre-add model", () => {
  it("D.1: a press on the column strip writes nothing; the click writes once", async () => {
    const { extension, writes } = countWrites();
    const view = mount(DOC, [extension]);

    // Uncommitted cell text is the case the trigger has to protect: a blur here
    // would commit **this** model and rebuild the widget under the pointer.
    typeInto(view, 1, 1, "typed");
    act(() => {
      cellEditor(view, 1, 1).focus();
    });
    expect(document.activeElement).toBe(cellContent(view, 1, 1));
    expect(view.doc()).toBe(DOC);
    expect(writes).toEqual([]);

    const column = strip(view, "column");
    await act(async () => {
      column.dispatchEvent(mouse("mousedown"));
    });
    // `preventDefault` on the press kept focus in the cell: no `focusout`, no
    // pre-add write, and the strip is ready for the click without a rebuild.
    expect(view.doc()).toBe(DOC);
    expect(document.activeElement).toBe(cellContent(view, 1, 1));
    expect(writes).toEqual([]);
    expect(column.isConnected).toBe(true);

    await act(async () => {
      column.dispatchEvent(mouse("click"));
    });
    await settle();

    // Exactly one commit, and it is the model **with** both the typed cell and
    // the new column — never the pre-add model followed by a second write.
    expect(writes).toHaveLength(1);
    expect(writes[0]).toBe(
      "intro\n\n| a | b |  |\n| --- | --- | --- |\n| c | typed |  |\n| e | f |  |\n",
    );
    expect(view.doc()).toBe(writes[0]);
    expect(focusedCell()).toEqual({ row: "0", col: "2" });
  });

  it("D.1: a press on the row strip writes nothing; the click writes once", async () => {
    const { extension, writes } = countWrites();
    const view = mount(DOC, [extension]);

    typeInto(view, 1, 0, "typed");
    act(() => {
      cellEditor(view, 1, 0).focus();
    });
    expect(view.doc()).toBe(DOC);
    expect(writes).toEqual([]);

    const row = strip(view, "row");
    await act(async () => {
      row.dispatchEvent(mouse("mousedown"));
    });
    expect(view.doc()).toBe(DOC);
    expect(document.activeElement).toBe(cellContent(view, 1, 0));
    expect(writes).toEqual([]);

    await act(async () => {
      row.dispatchEvent(mouse("click"));
    });
    await settle();

    // One write: the typed cell and the appended row travel together.
    expect(writes).toHaveLength(1);
    expect(writes[0]).toBe(
      "intro\n\n| a | b |\n| --- | --- |\n| typed | d |\n| e | f |\n|  |  |\n",
    );
    expect(view.doc()).toBe(writes[0]);
    expect(focusedCell()).toEqual({ row: "3", col: "0" });
  });
});

describe("S3: keyboard activation", () => {
  it("D.1: Enter on the focused column strip adds the column", async () => {
    const view = mount();
    const column = strip(view, "column");

    await act(async () => {
      column.focus();
    });
    expect(document.activeElement).toBe(column);

    const event = keyEvent("Enter");
    await act(async () => {
      column.dispatchEvent(event);
    });
    await settle();

    expect(event.defaultPrevented).toBe(true);
    const lines = view.doc().split("\n");
    expect(lines[2]).toBe("| a | b |  |");
    expect(lines[3]).toBe("| --- | --- | --- |");
    expect(focusedCell()).toEqual({ row: "0", col: "2" });
    expect(cellEditor(view, 0, 2).state.doc.toString()).toBe("");
  });

  it("D.1: Enter on the focused row strip adds the row", async () => {
    const view = mount();
    const row = strip(view, "row");

    await act(async () => {
      row.focus();
    });
    expect(document.activeElement).toBe(row);

    const event = keyEvent("Enter");
    await act(async () => {
      row.dispatchEvent(event);
    });
    await settle();

    expect(event.defaultPrevented).toBe(true);
    const lines = view.doc().split("\n");
    expect(lines[6]).toBe("|  |  |");
    expect(focusedCell()).toEqual({ row: "3", col: "0" });
    expect(cellEditor(view, 3, 0).state.doc.toString()).toBe("");
  });
});
