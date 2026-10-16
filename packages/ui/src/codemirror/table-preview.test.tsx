// Markdown-mode table behaviour — F-15 Task 3.3 Rev 2, plan Task A.4.
//
// The table is a block widget whose DOM is React and whose cells are nested
// CodeMirror editors (plan §1 decision B-8: the old `contenteditable`-cell
// implementation was replaced, not patched). These tests drive the real path end
// to end: mount the editor, reach a cell's nested `EditorView` through the DOM,
// type into it, and read the markdown the document ends up holding.
//
// The entries in play are `OBS-1.14.4-TABLE-001` (one editor per cell holding
// decoded text, always rendered) and `TABLE-007` (the table never unfolds). The
// `B-*` behaviours (no toolbar, cells as their own editing hosts) are
// `@user`-directed (plan §1), recorded as directed — never parity claims.

import { createRef } from "react";
import { act, render } from "@testing-library/react";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CodeMirrorEditor, type CodeMirrorEditorHandle } from "./cm-editor";
import { TABLE_COMPLETE_MS, TABLE_IDLE_FLUSH_MS } from "./live-preview/table";

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

/** The nested editor's content DOM inside one cell. */
function cellContent(view: View, row: number, col: number): HTMLElement {
  const content = cellAt(view, row, col).querySelector<HTMLElement>(
    ".cm-content",
  );
  if (!content) throw new Error(`no nested editor at ${row}:${col}`);
  return content;
}

/** One cell's nested `EditorView`, found through the DOM (public API only). */
function cellEditor(view: View, row: number, col: number): EditorView {
  const editor = EditorView.findFromDOM(cellContent(view, row, col));
  if (!editor) throw new Error(`no nested view at ${row}:${col}`);
  return editor;
}

/** The decoded text one cell currently holds. */
function cellText(view: View, row: number, col: number): string {
  return cellEditor(view, row, col).state.doc.toString();
}

/** Replace a cell's whole text as a user input event. */
function typeInto(view: View, row: number, col: number, text: string): void {
  const editor = cellEditor(view, row, col);
  act(() => {
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: text },
      userEvent: "input.type",
    });
  });
}

/** Focus a cell's nested editor. */
function focusCell(view: View, row: number, col: number): void {
  const editor = cellEditor(view, row, col);
  act(() => {
    editor.focus();
  });
}

/** Blur a cell's nested editor — the focus-out commit point. */
async function blurCell(view: View, row: number, col: number): Promise<void> {
  const content = cellContent(view, row, col);
  await act(async () => {
    content.blur();
    await Promise.resolve();
  });
}

/** Let any deferred task (CodeMirror's deferral, React's scheduling) run. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function caretToEnd(view: View): void {
  act(() => {
    view.dispatch({ selection: { anchor: view.state.doc.length } });
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("markdown mode tables", () => {
  it("TABLE-001: renders a table whose delimiter row is narrower than its header", () => {
    const { view } = mount("| Head 1 | Head 2 | Head 3 |\n| --- |");

    expect(dom(view).querySelector("table.cm-live-table")).not.toBeNull();
    expect(dom(view).querySelectorAll("th.cm-live-th")).toHaveLength(3);
    // One nested editor per cell — that is the model (`TABLE-001`).
    expect(dom(view).querySelectorAll(".cm-live-th .cm-editor")).toHaveLength(
      3,
    );
  });

  it("TABLE-007: still renders the table with the caret at the start of the document", () => {
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

  it("has no helper toolbar (B-3, @user-directed)", () => {
    const { view } = mount("| a | b |\n| --- | --- |\n| 1 | 2 |");
    expect(dom(view).querySelector(".cm-live-table-toolbar")).toBeNull();
    expect(dom(view).querySelector(".cm-live-table-tool")).toBeNull();
    expect(dom(view).querySelector('[role="toolbar"]')).toBeNull();
  });

  it("reads a cell's decoded text, with an escaped pipe and a code-span pipe", () => {
    const { view } = mount("| a | b |\n| --- | --- |\n| x \\| y | `p|q` |");
    expect(cellText(view, 1, 0)).toBe("x | y");
    expect(cellText(view, 1, 1)).toBe("`p|q`");
    // The inline preview already renders the code span inside the cell.
    expect(cellAt(view, 1, 1).querySelector(".cm-live-code")?.textContent).toBe(
      "p|q",
    );
  });

  it("writes an edited cell back as markdown when the table is left", async () => {
    const { view } = mount("| a | b |\n| --- | --- |\n| 1 | 2 |");

    focusCell(view, 1, 1);
    typeInto(view, 1, 1, "**two**");
    await blurCell(view, 1, 1);
    await settle();

    expect(view.state.doc.toString()).toBe(
      "| a | b |\n| --- | --- |\n| 1 | **two** |",
    );
  });

  it("escapes a pipe typed into a cell so it stays one cell", async () => {
    const { view } = mount("| a | b |\n| --- | --- |\n| 1 | 2 |");

    focusCell(view, 1, 0);
    typeInto(view, 1, 0, "x | y");
    await blurCell(view, 1, 0);
    await settle();

    expect(view.state.doc.toString()).toBe(
      "| a | b |\n| --- | --- |\n| x \\| y | 2 |",
    );
    // Two columns, not three.
    expect(dom(view).querySelectorAll("td.cm-live-td")).toHaveLength(2);
  });

  it("keeps an existing escape, and escapes a bare pipe left in a code span", async () => {
    const { view } = mount("| a | b |\n| --- | --- |\n| x \\| y | `p|q` |");

    focusCell(view, 1, 0);
    await blurCell(view, 1, 0);
    await settle();

    // Touching the cell writes it back, which escapes the bare pipe in the code
    // span. The reader still sees `p|q`; the source is now GFM-valid.
    expect(view.state.doc.toString()).toBe(
      "| a | b |\n| --- | --- |\n| x \\| y | `p\\|q` |",
    );
    expect(cellAt(view, 1, 1).querySelector(".cm-live-code")?.textContent).toBe(
      "p|q",
    );
  });

  it("writes an edited cell back after a pause, and keeps the caret", async () => {
    vi.useFakeTimers();
    try {
      const { view } = mount("| a | b |\n| --- | --- |\n| 1 | 2 |");

      focusCell(view, 1, 0);
      typeInto(view, 1, 0, "typed");

      // Typing alone must not touch the document — that is what keeps the DOM
      // (and the caret) alive across a keystroke.
      expect(view.state.doc.toString()).toBe(
        "| a | b |\n| --- | --- |\n| 1 | 2 |",
      );

      await act(async () => {
        vi.advanceTimersByTime(TABLE_IDLE_FLUSH_MS + 10);
      });

      // The pause writes it out, so a note typed into and then abandoned still
      // reaches autosave — and the caret is back in the rebuilt widget.
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

  it("renders a table that has no body rows", () => {
    const { view } = mount("| a | b |\n| --- | --- |");
    expect(dom(view).querySelectorAll("td.cm-live-td")).toHaveLength(0);
    expect(dom(view).querySelectorAll("th.cm-live-th")).toHaveLength(2);
  });

  it("makes each cell its own editing host", () => {
    // The wrapper is `contenteditable="false"` so the nested editors are
    // independent editing hosts rather than part of the outer editor's editable
    // region — which is what lets a cell hold the caret at all.
    const { view } = mount("| a | b |\n| --- | --- |\n| 1 | 2 |");
    expect(
      dom(view)
        .querySelector(".cm-live-table-wrapper")
        ?.getAttribute("contenteditable"),
    ).toBe("false");
    expect(cellContent(view, 1, 0).getAttribute("contenteditable")).toBe(
      "true",
    );
  });

  it("keeps pointer and key events inside the table away from the editor", () => {
    // CodeMirror's own `mousedown` handler starts a mouse selection and takes
    // focus back; it does not consult `WidgetType.ignoreEvent`. Events from
    // inside the table must therefore never reach the editor's content DOM —
    // while still reaching the cell they started in.
    const { view } = mount("| a | b |\n| --- | --- |\n| 1 | 2 |");
    const types = ["mousedown", "click", "keydown", "beforeinput"];
    const outer: string[] = [];
    const inner: string[] = [];
    for (const type of types) {
      dom(view).addEventListener(type, () => outer.push(type));
    }
    const content = cellContent(view, 1, 0);
    for (const type of types) {
      content.addEventListener(type, () => inner.push(type));
    }

    for (const type of types) {
      act(() => {
        content.dispatchEvent(
          new Event(type, { bubbles: true, cancelable: true }),
        );
      });
    }

    expect(outer).toEqual([]);
    // Stopped at the wrapper, not swallowed before it reached the cell.
    expect(inner).toEqual(types);
  });

  it("lets a cell hold focus while the editor is focused", () => {
    // The companion guard to the test above: with the editor focused, focusing a
    // cell must leave the cell as the active element.
    const { view } = mount("| a | b |\n| --- | --- |\n| 1 | 2 |");
    act(() => view.focus());

    focusCell(view, 1, 0);

    expect(document.activeElement).toBe(cellContent(view, 1, 0));
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

    expect(cellContent(view, 1, 0).getAttribute("contenteditable")).toBe(
      "true",
    );

    utils.rerender(<CodeMirrorEditor {...props} readOnly />);

    // Each cell editor is built with the editable flag, so the widget has to be
    // rebuilt, not merely relabelled.
    expect(cellContent(view, 1, 0).getAttribute("contenteditable")).toBe(
      "false",
    );
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
    expect(cellContent(view, 1, 0).getAttribute("contenteditable")).toBe(
      "false",
    );

    utils.rerender(<CodeMirrorEditor {...props} />);

    expect(cellContent(view, 1, 0).getAttribute("contenteditable")).toBe(
      "true",
    );
  });

  it("rebuilds the cell editors when the note is locked", () => {
    const markdown = "| a | b |\n| --- | --- |\n| 1 | 2 |";
    const handleRef = createRef<CodeMirrorEditorHandle>();
    const props = {
      ref: handleRef,
      value: markdown,
      onChange: vi.fn(),
      mode: "markdown" as const,
    };
    const utils = render(<CodeMirrorEditor {...props} />);
    const view = handleRef.current?.getEditorView();
    if (!view) throw new Error("CodeMirror view did not mount");
    const before = cellEditor(view, 1, 0);

    utils.rerender(<CodeMirrorEditor {...props} readOnly />);

    expect(cellEditor(view, 1, 0)).not.toBe(before);
    expect(dom(view).querySelectorAll("table.cm-live-table")).toHaveLength(1);
    expect(dom(view).querySelectorAll(".cm-live-td .cm-editor")).toHaveLength(
      2,
    );
  });

  it("leaves a locked table with no affordances at all", () => {
    const { view } = mount("| a | b |\n| --- | --- |\n| 1 | 2 |", true);

    expect(table(view)).not.toBeNull();
    expect(dom(view).querySelector(".cm-live-table-toolbar")).toBeNull();
    for (const cell of dom(view).querySelectorAll<HTMLElement>(
      ".cm-live-th, .cm-live-td",
    )) {
      expect(
        cell.querySelector(".cm-content")?.getAttribute("contenteditable"),
      ).not.toBe("true");
    }
  });
});
