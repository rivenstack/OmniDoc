import { createRef } from "react";
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CodeMirrorEditor, type CodeMirrorEditorHandle } from "./cm-editor";
import {
  TABLE_COMPLETE_MS,
  TABLE_IDLE_FLUSH_MS,
} from "./markdown-live-preview";

/**
 * Markdown-mode table behaviour.
 *
 * The table is a block widget, so its cells are ordinary DOM rather than
 * document positions. These tests drive that DOM directly — the gestures are
 * exactly the ones the widget's own listeners implement, so they exercise the
 * real path from a keystroke to the source the document ends up holding.
 */

type View = NonNullable<ReturnType<CodeMirrorEditorHandle["getEditorView"]>>;

function mount(markdown: string, readOnly = false) {
  const handleRef = createRef<CodeMirrorEditorHandle>();
  const onChange = vi.fn();
  const utils = render(
    <CodeMirrorEditor
      ref={handleRef}
      value={markdown}
      onChange={onChange}
      mode="markdown"
      readOnly={readOnly}
    />,
  );
  const view = handleRef.current?.getEditorView();
  if (!view) throw new Error("CodeMirror view did not mount");
  return { view, utils, onChange };
}

function dom(view: View): HTMLElement {
  return view.contentDOM;
}

function table(view: View): HTMLTableElement {
  const element = dom(view).querySelector("table.cm-live-table");
  if (!element) throw new Error("no rendered table");
  return element as HTMLTableElement;
}

function cellAt(view: View, row: number, col: number): HTMLElement {
  const cell = dom(view).querySelector(
    `[data-row="${row}"][data-col="${col}"]`,
  );
  if (!cell) throw new Error(`no cell at ${row}:${col}`);
  return cell as HTMLElement;
}

function tools(view: View): HTMLButtonElement[] {
  return Array.from(
    dom(view).querySelectorAll<HTMLButtonElement>(".cm-live-table-tool"),
  );
}

/** Press a helper-toolbar control the way the widget listens for it. */
function pressTool(view: View, label: string) {
  const button = tools(view).find(
    (candidate) => candidate.getAttribute("aria-label") === label,
  );
  if (!button) throw new Error(`no "${label}" tool`);
  act(() => {
    button.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
    );
  });
}

/** Put the caret at the end of the document (the last line's end). */
function caretToEnd(view: View) {
  act(() => {
    view.dispatch({ selection: { anchor: view.state.doc.length } });
  });
}

function press(view: View, target: HTMLElement, key: string) {
  act(() => target.focus());
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    );
  });
}

/** Focus a cell and replace its raw source. */
function typeInto(view: View, row: number, col: number, text: string) {
  const cell = cellAt(view, row, col);
  act(() => cell.focus());
  act(() => {
    cell.textContent = text;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("markdown mode tables", () => {
  it("renders a table whose delimiter row is narrower than its header", () => {
    // The exact case: three headers, then a bare `| --- |`.
    const { view } = mount("| Head 1 | Head 2 | Head 3 |\n| --- |");

    expect(dom(view).querySelector("table.cm-live-table")).not.toBeNull();
    expect(dom(view).querySelectorAll("th.cm-live-th")).toHaveLength(3);
  });

  it("still renders the table with the caret at the start of the document", () => {
    // A note that opens with a table must not greet the reader with raw pipes.
    const { view } = mount("| a | b |\n| --- |\n| 1 | 2 |");
    expect(view.state.selection.main.head).toBe(0);
    expect(dom(view).querySelector("table.cm-live-table")).not.toBeNull();
  });

  it("does not render a pipe block inside a fenced code block", () => {
    const { view } = mount(
      "intro\n\n```\n| a | b |\n| --- |\n```\n\n```\n| c | d |\n| --- |\n```",
    );
    expect(dom(view).querySelector("table.cm-live-table")).toBeNull();
  });

  it("holds the render while the delimiter row is still being typed", () => {
    const { view } = mount("| Head 1 | Head 2 | Head 3 |\n| --- |");
    expect(dom(view).querySelector("table.cm-live-table")).not.toBeNull();

    // Caret at the end of the last line: the user is writing that row, and it
    // may be the first cell of a wider one.
    caretToEnd(view);
    expect(dom(view).querySelector("table.cm-live-table")).toBeNull();

    // Moving the caret off the row settles it.
    act(() => {
      view.dispatch({ selection: { anchor: 0 } });
    });
    expect(dom(view).querySelector("table.cm-live-table")).not.toBeNull();
  });

  it("completes a paused delimiter row so the stored markdown is valid GFM", async () => {
    vi.useFakeTimers();
    try {
      const { view } = mount("| Head 1 | Head 2 | Head 3 |\n| --- |");
      caretToEnd(view);

      await act(async () => {
        vi.advanceTimersByTime(TABLE_COMPLETE_MS + 10);
      });

      expect(view.state.doc.toString()).toBe(
        "| Head 1 | Head 2 | Head 3 |\n| --- | --- | --- |",
      );
      expect(dom(view).querySelectorAll("th.cm-live-th")).toHaveLength(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("leaves a table alone in a locked note", () => {
    const { view } = mount("| a | b |\n| --- | --- |\n| 1 | 2 |", true);

    expect(table(view)).not.toBeNull();
    expect(dom(view).querySelector(".cm-live-table-toolbar")).toBeNull();
    for (const cell of dom(view).querySelectorAll<HTMLElement>(
      ".cm-live-th, .cm-live-td",
    )) {
      expect(cell.contentEditable).not.toBe("true");
    }
  });

  it("renders cell markdown, and reveals the source while the cell is edited", () => {
    const { view } = mount("| a | b |\n| --- | --- |\n| **bold** | `code` |");

    expect(dom(view).querySelector("strong.cm-live-strong")?.textContent).toBe(
      "bold",
    );
    const cell = cellAt(view, 1, 0);

    act(() => cell.focus());
    // The source, not the rendered form: this is what the user edits.
    expect(cell.textContent).toBe("**bold**");
    expect(cell.classList.contains("cm-live-cell-editing")).toBe(true);

    act(() => cell.blur());
    expect(dom(view).querySelector("strong.cm-live-strong")?.textContent).toBe(
      "bold",
    );
  });

  it("writes an edited cell back as markdown when the table is left", () => {
    const { view } = mount("| a | b |\n| --- | --- |\n| 1 | 2 |");

    typeInto(view, 1, 1, "**two**");
    act(() => cellAt(view, 1, 1).blur());

    expect(view.state.doc.toString()).toBe(
      "| a | b |\n| --- | --- |\n| 1 | **two** |",
    );
  });

  it("escapes a pipe typed into a cell so it stays one cell", () => {
    const { view } = mount("| a | b |\n| --- | --- |\n| 1 | 2 |");

    typeInto(view, 1, 0, "x | y");
    act(() => cellAt(view, 1, 0).blur());

    expect(view.state.doc.toString()).toBe(
      "| a | b |\n| --- | --- |\n| x \\| y | 2 |",
    );
    // Two columns, not three.
    expect(dom(view).querySelectorAll("td.cm-live-td")).toHaveLength(2);
  });

  it("keeps an existing escape, and escapes a bare pipe left in a code span", () => {
    const { view } = mount("| a | b |\n| --- | --- |\n| x \\| y | `p|q` |");

    expect(cellAt(view, 1, 0).textContent).toBe("x | y");
    expect(dom(view).querySelectorAll("code.cm-live-code")).toHaveLength(1);
    expect(dom(view).querySelector("code.cm-live-code")?.textContent).toBe(
      "p|q",
    );

    // Touching the cell writes it back, which escapes the bare pipe in the code
    // span. The reader still sees `p|q`; the source is now GFM-valid.
    act(() => cellAt(view, 1, 0).focus());
    act(() => cellAt(view, 1, 0).blur());
    expect(view.state.doc.toString()).toBe(
      "| a | b |\n| --- | --- |\n| x \\| y | `p\\|q` |",
    );
    expect(dom(view).querySelector("code.cm-live-code")?.textContent).toBe(
      "p|q",
    );
  });

  it("writes an edited cell back after a pause, and keeps the caret", async () => {
    vi.useFakeTimers();
    try {
      const { view } = mount("| a | b |\n| --- | --- |\n| 1 | 2 |");
      const cell = cellAt(view, 1, 0);

      act(() => cell.focus());
      act(() => {
        cell.textContent = "typed";
        cell.dispatchEvent(new Event("input", { bubbles: true }));
      });

      // Typing alone must not touch the document — that is what keeps the DOM
      // (and the caret) alive across a keystroke.
      expect(view.state.doc.toString()).toBe(
        "| a | b |\n| --- | --- |\n| 1 | 2 |",
      );

      await act(async () => {
        vi.advanceTimersByTime(TABLE_IDLE_FLUSH_MS + 10);
      });

      // The pause writes it out, so a note typed into and then abandoned still
      // reaches autosave — and the caret is put back in the rebuilt widget.
      expect(view.state.doc.toString()).toBe(
        "| a | b |\n| --- | --- |\n| typed | 2 |",
      );
      expect(document.activeElement?.textContent).toBe("typed");
    } finally {
      vi.useRealTimers();
    }
  });

  it("applies the alignment the delimiter row spells", () => {
    const { view } = mount("| a | b |\n| :- | -: |\n| 1 | 2 |");
    expect(cellAt(view, 0, 0).style.textAlign).toBe("");
    expect(cellAt(view, 0, 1).style.textAlign).toBe("right");
  });

  it("offers the row and column helper tools with accessible names", () => {
    const { view } = mount("| a | b |\n| --- | --- |\n| 1 | 2 |");
    expect(tools(view).map((tool) => tool.getAttribute("aria-label"))).toEqual([
      "Insert row above",
      "Insert row below",
      "Delete row",
      "Insert column left",
      "Insert column right",
      "Delete column",
      "Delete table",
    ]);
    expect(
      dom(view).querySelector('[role="toolbar"][aria-label="Table actions"]'),
    ).not.toBeNull();
  });

  it("inserts and deletes rows from the helper tools", () => {
    const { view } = mount("| a | b |\n| --- | --- |\n| 1 | 2 |");

    // No cell focused yet, so the tool claims the first one and inserts below
    // the header it is in.
    pressTool(view, "Insert row below");
    expect(view.state.doc.toString()).toBe(
      "| a | b |\n| --- | --- |\n|  |  |\n| 1 | 2 |",
    );
    expect(dom(view).querySelectorAll("td.cm-live-td")).toHaveLength(4);

    // The new row is now the focused one, so deleting removes it again.
    pressTool(view, "Delete row");
    expect(view.state.doc.toString()).toBe(
      "| a | b |\n| --- | --- |\n| 1 | 2 |",
    );
  });

  it("inserts and deletes columns from the helper tools", () => {
    const { view } = mount("| a | b |\n| --- | --- |\n| 1 | 2 |");

    // Active cell is column 0, so the new column lands between a and b.
    pressTool(view, "Insert column right");
    expect(view.state.doc.toString()).toBe(
      "| a |  | b |\n| --- | --- | --- |\n| 1 |  | 2 |",
    );

    pressTool(view, "Delete column");
    expect(view.state.doc.toString()).toBe(
      "| a | b |\n| --- | --- |\n| 1 | 2 |",
    );
  });

  it("deletes the whole table and the line it occupied", () => {
    const { view } = mount("intro\n\n| a | b |\n| --- | --- |\n| 1 | 2 |");

    pressTool(view, "Delete table");
    expect(view.state.doc.toString()).toBe("intro\n");
    expect(dom(view).querySelector("table.cm-live-table")).toBeNull();
  });

  it("adds a row when Tab leaves the last cell", () => {
    const { view } = mount("| a | b |\n| --- | --- |\n| 1 | 2 |");

    press(view, cellAt(view, 1, 1), "Tab");

    expect(view.state.doc.toString()).toBe(
      "| a | b |\n| --- | --- |\n| 1 | 2 |\n|  |  |",
    );
  });

  it("moves between cells on Tab without touching the document", () => {
    const { view } = mount("| a | b |\n| --- | --- |\n| 1 | 2 |");

    press(view, cellAt(view, 0, 0), "Tab");

    expect(view.state.doc.toString()).toBe(
      "| a | b |\n| --- | --- |\n| 1 | 2 |",
    );
    expect(document.activeElement?.getAttribute("data-col")).toBe("1");
  });

  it("renders a table that has no body rows", () => {
    const { view } = mount("| a | b |\n| --- | --- |");
    expect(dom(view).querySelectorAll("td.cm-live-td")).toHaveLength(0);
    expect(dom(view).querySelectorAll("th.cm-live-th")).toHaveLength(2);
  });

  it("isolates its cells from the editor's editing host", () => {
    // The table sits inside CodeMirror's `contenteditable="true"` content DOM.
    // A nested editing host cannot hold focus inside another one in Chromium —
    // clicking a cell focused it only for the browser to hand focus straight
    // back to the editor. `contenteditable="false"` on the table makes each
    // cell an independent editing host.
    const { view } = mount("| a | b |\n| --- | --- |\n| 1 | 2 |");
    expect(table(view).getAttribute("contenteditable")).toBe("false");
    expect(cellAt(view, 1, 0).contentEditable).toBe("true");
  });
  it("keeps pointer and key events inside the table away from the editor", () => {
    // CodeMirror's own `mousedown` handler starts a mouse selection and takes
    // focus back; it does not consult `WidgetType.ignoreEvent`, so a click on a
    // cell used to blur it and swallow the edit. Events from inside the table
    // must therefore never reach the editor's content DOM.
    const { view } = mount("| a | b |\n| --- | --- |\n| 1 | 2 |");
    const seen: string[] = [];
    for (const type of ["mousedown", "click", "keydown", "beforeinput"]) {
      dom(view).addEventListener(type, () => seen.push(type));
    }

    const cell = cellAt(view, 1, 0);
    for (const type of ["mousedown", "click", "keydown", "beforeinput"]) {
      act(() => {
        cell.dispatchEvent(
          new Event(type, { bubbles: true, cancelable: true }),
        );
      });
    }

    expect(seen).toEqual([]);
    // The cell's own handlers still ran, so the event was stopped at the
    // wrapper — not swallowed before it reached the cell.
    expect(cell.classList.contains("cm-live-cell-editing")).toBe(true);
  });

  it("lets a cell hold focus while the editor is focused", () => {
    // The companion guard to the test above: with the editor focused, focusing
    // a cell must leave the cell as the active element.
    const { view } = mount("| a | b |\n| --- | --- |\n| 1 | 2 |");
    act(() => view.focus());

    const cell = cellAt(view, 1, 0);
    act(() => cell.focus());

    expect(document.activeElement).toBe(cell);
  });

  it("stops the table being editable as soon as the note is locked", () => {
    const markdown = "| a | b |\n| --- | --- |\n| 1 | 2 |";
    const handleRef = createRef<CodeMirrorEditorHandle>();
    const onChange = vi.fn();
    const props = {
      ref: handleRef,
      value: markdown,
      onChange,
      mode: "markdown" as const,
    };
    const utils = render(<CodeMirrorEditor {...props} />);
    const view = handleRef.current?.getEditorView();
    if (!view) throw new Error("CodeMirror view did not mount");

    expect(cellAt(view, 1, 0).contentEditable).toBe("true");
    expect(dom(view).querySelector(".cm-live-table-toolbar")).not.toBeNull();

    utils.rerender(<CodeMirrorEditor {...props} readOnly />);

    // A cell sets `contentEditable` on itself, which outranks a non-editable
    // ancestor — so the widget has to be rebuilt, not merely relabelled.
    expect(cellAt(view, 1, 0).contentEditable).not.toBe("true");
    expect(dom(view).querySelector(".cm-live-table-toolbar")).toBeNull();
    // The table itself keeps rendering: a locked note reads as a document.
    expect(dom(view).querySelector("table.cm-live-table")).not.toBeNull();
    expect(dom(view).querySelectorAll("th.cm-live-th")).toHaveLength(2);
  });

  it("makes the table editable again when the note is unlocked", () => {
    const markdown = "| a | b |\n| --- | --- |\n| 1 | 2 |";
    const handleRef = createRef<CodeMirrorEditorHandle>();
    const props = {
      ref: handleRef,
      value: markdown,
      onChange: vi.fn(),
      mode: "markdown" as const,
    };
    const utils = render(<CodeMirrorEditor {...props} readOnly />);
    const view = handleRef.current?.getEditorView();
    if (!view) throw new Error("CodeMirror view did not mount");
    expect(cellAt(view, 1, 0).contentEditable).not.toBe("true");

    utils.rerender(<CodeMirrorEditor {...props} />);

    expect(cellAt(view, 1, 0).contentEditable).toBe("true");
    expect(dom(view).querySelector(".cm-live-table-toolbar")).not.toBeNull();
  });
});
