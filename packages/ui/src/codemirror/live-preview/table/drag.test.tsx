// Column drag-and-drop inside the rendered table — F-15 Task 3.3 Rev 2, plan
// Task D.2 (`@user`-directed S1/S2; **not** parity claims).
//
// `@user` reviewed the first cut on 2026-10-24 and corrected the reveal model:
// hovering a column's cells must paint nothing and must not show a grip. Each
// column now has its own always-mounted ghost grip that reveals **only itself**
// on its own hover/focus — the D.1 strip model.
//
// `@user` amended it again on 2026-10-25: "make it animated when I'm dragging a
// column, it should really move with my pointer". The directed model is
// Obsidian's `createDragHandle`: the **grip** follows the pointer 1:1, the
// **source** column is the one lifted/tinted, and the drop target is marked by a
// separate line at the edge the column would cross. The columns themselves never
// translate.
//
// What is proven here is the wiring a browser acts on: one grip per column
// (`data-column`, `data-visible`), no hover effect on cells, the lift on the
// source (`data-column-drag`), the grip's travel (`data-drag-source` + inline
// `transform`), the drop line (`data-table-drop-indicator`), the drop through the
// structure-command pipeline (`moveColumn`, alignment travels with the column,
// focus lands on the moved header), and the two aborts (Escape,
// `pointercancel`) that must leave the document untouched. jsdom has no layout,
// so the measured spans are zero: the drop line's *offsets* are the pure suite's
// business (`drag.test.ts`), and this suite asserts the attributes. The visual
// pass (§11-7) owns how it looks.

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHarness, type EditorHarness } from "../../parity/harness";
import { COLUMN_GRIP_LABEL } from "./affordances";
import { tableLivePreview } from "./scan";

const LANGUAGE = markdown({ base: markdownLanguage });

/** Three columns, each with a different alignment — a move must carry it. */
const TABLE = "| a | b | c |\n| --- | :---: | ---: |\n| a1 | b1 | c1 |";
const DOC = `intro\n\n${TABLE}\n`;

let harness: EditorHarness | null = null;

afterEach(() => {
  vi.useRealTimers();
  harness?.destroy();
  harness = null;
});

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

/** Every mounted grip (one per column, always mounted when editable). */
function grips(view: EditorHarness): HTMLElement[] {
  return Array.from(
    view.view.contentDOM.querySelectorAll<HTMLElement>(
      ".cm-live-table-column-grip",
    ),
  );
}

/** The grip over one column. */
function gripFor(view: EditorHarness, column: number): HTMLElement {
  const element = view.view.contentDOM.querySelector<HTMLElement>(
    `.cm-live-table-column-grip[data-column="${column}"]`,
  );
  if (!element) throw new Error(`no column grip for column ${column}`);
  return element;
}

/** The D.1-style reveal contract. */
function visible(element: HTMLElement): string | null {
  return element.getAttribute("data-visible");
}

/** Hover one element the way a pointer does. */
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

/**
 * One pointer event. `clientX` matters now (`@user` 2026-10-25): the grip's
 * travel is `clientX - the press's clientX`, so a move without one is a move
 * that does not move the grip.
 */
function pointer(type: string, init: MouseEventInit = {}): MouseEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...init,
  });
}

/** Lift one column through its grip; the grip need not be visible first. */
async function liftGrip(
  view: EditorHarness,
  column: number,
  clientX = 0,
): Promise<void> {
  await act(async () => {
    gripFor(view, column).dispatchEvent(pointer("pointerdown", { clientX }));
  });
}

/** Drag the pointer over a cell (the document listener reads its column). */
async function dragOver(
  view: EditorHarness,
  row: number,
  col: number,
  clientX = 0,
): Promise<void> {
  await act(async () => {
    cellContent(view, row, col).dispatchEvent(
      pointer("pointermove", { clientX }),
    );
  });
}

/** The drop line, if one is drawn (D.2). */
function dropLine(view: EditorHarness): HTMLElement | null {
  return view.view.contentDOM.querySelector<HTMLElement>(
    "[data-table-drop-indicator]",
  );
}

async function pointerUp(): Promise<void> {
  await act(async () => {
    document.dispatchEvent(pointer("pointerup"));
  });
  await settle();
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
function countWrites(): { extension: Extension; writes: string[] } {
  const writes: string[] = [];
  const extension = EditorView.updateListener.of((update) => {
    if (update.docChanged) writes.push(update.state.doc.toString());
  });
  return { extension, writes };
}

/** Which columns carry the lifted **source** (`data-column-drag`) state, if any. */
function draggedColumns(view: EditorHarness): string[] {
  return Array.from(
    view.view.contentDOM.querySelectorAll<HTMLElement>(
      '[data-column-drag="true"]',
    ),
  ).map((cell) => cell.getAttribute("data-col") ?? "");
}

describe("D.2: one grip per column, hidden until hovered", () => {
  it("D.2: every editable column has a grip, all hidden by default", () => {
    const view = mount();

    const handles = grips(view);
    expect(handles).toHaveLength(3);
    expect(handles.map((handle) => handle.getAttribute("data-column"))).toEqual(
      ["0", "1", "2"],
    );
    for (const handle of handles) {
      expect(handle.getAttribute("data-visible")).toBe("false");
      expect(handle.getAttribute("aria-label")).toBe(COLUMN_GRIP_LABEL);
      expect(handle.tagName).toBe("BUTTON");
      // Invisible but still in the tab order (the D.1 reveal model).
      expect(handle.tabIndex).toBe(0);
    }
  });

  it("D.2: each grip is anchored inside its own header cell, not a measured offset", () => {
    const view = mount();

    const handles = grips(view);
    expect(handles).toHaveLength(3);
    for (const handle of handles) {
      const header = handle.closest<HTMLElement>("[data-row][data-col]");
      // The grip is a child of the header, so CSS anchors it: nothing to
      // measure, and nothing that can go stale while a column resizes.
      expect(header).not.toBeNull();
      expect(header?.getAttribute("data-row")).toBe("0");
      expect(header?.getAttribute("data-col")).toBe(
        handle.getAttribute("data-column"),
      );
      expect(handle.parentElement).toBe(header);
      // The old mechanism wrote an inline `inset-inline-start` here.
      expect(handle.hasAttribute("style")).toBe(false);
    }
  });

  it("D.2: hovering a cell reveals no grip and paints no column edge", async () => {
    const view = mount();

    await hover(cellContent(view, 1, 1));

    for (const handle of grips(view)) {
      expect(visible(handle)).toBe("false");
    }
    // `@user` 2026-10-24: hovering a cell must not change any cell's borders
    // or outline. The attribute that painted them is gone entirely.
    expect(
      view.view.contentDOM.querySelectorAll("[data-column-hover]"),
    ).toHaveLength(0);
  });

  it("D.2: hovering grip N reveals only grip N", async () => {
    const view = mount();

    await hover(gripFor(view, 1));

    expect(visible(gripFor(view, 1))).toBe("true");
    expect(visible(gripFor(view, 0))).toBe("false");
    expect(visible(gripFor(view, 2))).toBe("false");

    await leave(gripFor(view, 1));
    await hover(gripFor(view, 2));

    expect(visible(gripFor(view, 1))).toBe("false");
    expect(visible(gripFor(view, 2))).toBe("true");
    expect(visible(gripFor(view, 0))).toBe("false");
  });

  it("D.2: keyboard focus reveals only the focused grip", async () => {
    const view = mount();

    await act(async () => {
      gripFor(view, 0).focus();
    });
    expect(document.activeElement).toBe(gripFor(view, 0));
    expect(visible(gripFor(view, 0))).toBe("true");
    expect(visible(gripFor(view, 1))).toBe("false");
    expect(visible(gripFor(view, 2))).toBe("false");

    await act(async () => {
      gripFor(view, 2).focus();
    });
    expect(visible(gripFor(view, 0))).toBe("false");
    expect(visible(gripFor(view, 2))).toBe("true");
  });

  it("D.2: a locked note has no grips at all", async () => {
    const view = mount(DOC, [EditorState.readOnly.of(true)]);
    // The fixture is a real rendered table, not a failed mount.
    expect(cellContent(view, 0, 0)).not.toBeNull();

    await hover(cellContent(view, 1, 1));

    expect(grips(view)).toHaveLength(0);
    expect(draggedColumns(view)).toEqual([]);
  });
});

describe("D.2: lifting the column", () => {
  it("D.2: pointerdown lifts the whole column into the accent state", async () => {
    const view = mount();

    await liftGrip(view, 1);

    // Header and body of column 1, and nothing else. The lifted column is the
    // **source** (`@user` 2026-10-25: it is the one the grip came from).
    expect(draggedColumns(view)).toEqual(["1", "1"]);
  });

  it("D.2: the lifted grip follows the pointer", async () => {
    const view = mount();

    await liftGrip(view, 0);
    // The press alone moves nothing: the grab point is where the grip is.
    expect(gripFor(view, 0).getAttribute("data-drag-source")).toBe("true");
    expect(gripFor(view, 0).style.transform).toBe("translateX(0px)");

    await dragOver(view, 1, 2, 120);

    // One-to-one: 120px of pointer travel is 120px of grip travel.
    expect(gripFor(view, 0).style.transform).toBe("translateX(120px)");
    // Only the dragged grip moves and is marked as the source.
    expect(gripFor(view, 1).style.transform).toBe("");
    expect(gripFor(view, 2).style.transform).toBe("");
    expect(gripFor(view, 1).hasAttribute("data-drag-source")).toBe(false);
    expect(gripFor(view, 2).hasAttribute("data-drag-source")).toBe(false);
  });

  it("D.2: the drop indicator marks the target edge", async () => {
    const view = mount();

    await liftGrip(view, 0);
    // Over its own column there is nothing to mark: the drop would be a no-op.
    expect(dropLine(view)).toBeNull();

    await dragOver(view, 1, 2, 120);

    // Moving towards the end: the line sits on the target's inline-end edge.
    expect(dropLine(view)?.getAttribute("data-drop-column")).toBe("2");
    expect(dropLine(view)?.getAttribute("data-drop-edge")).toBe("end");
  });

  it("D.2: dragging towards the start marks the target's start edge", async () => {
    const view = mount();

    await liftGrip(view, 2, 300);
    await dragOver(view, 1, 0, 80);

    expect(dropLine(view)?.getAttribute("data-drop-column")).toBe("0");
    expect(dropLine(view)?.getAttribute("data-drop-edge")).toBe("start");
  });

  it("D.2: dropping on the same column writes nothing", async () => {
    const { extension, writes } = countWrites();
    const view = mount(DOC, [extension]);

    await liftGrip(view, 1);
    await pointerUp();

    expect(view.doc()).toBe(DOC);
    expect(writes).toEqual([]);
    expect(draggedColumns(view)).toEqual([]);
  });
});

describe("D.2: dropping reorders the document", () => {
  it("D.2: dragging a column right reorders it, keeps alignment, focuses its header", async () => {
    const view = mount();

    // Lift column 0 (left-aligned) and drop it after column 2.
    await liftGrip(view, 0);
    await dragOver(view, 1, 2, 240);
    // The **source** grip is the revealed one and the only one that moves; the
    // target's grip stays hidden even though the pointer is over its column.
    expect(visible(gripFor(view, 0))).toBe("true");
    expect(visible(gripFor(view, 1))).toBe("false");
    expect(visible(gripFor(view, 2))).toBe("false");
    expect(gripFor(view, 0).style.transform).toBe("translateX(240px)");
    // The lift stays on the column the grip came from.
    expect(draggedColumns(view)).toEqual(["0", "0"]);
    // The drop would land on column 2, marked on its inline-end edge.
    expect(dropLine(view)?.getAttribute("data-drop-column")).toBe("2");
    expect(dropLine(view)?.getAttribute("data-drop-edge")).toBe("end");

    await pointerUp();

    expect(view.doc()).toBe(
      "intro\n\n| b | c | a |\n| :---: | ---: | --- |\n| b1 | c1 | a1 |\n",
    );
    // The alignment travelled with the column; the delimiter row proves it.
    expect(view.doc().split("\n")[3]).toBe("| :---: | ---: | --- |");
    expect(focusedCell()).toEqual({ row: "0", col: "2" });
    // One clear ends the whole drag presentation (lift, travel, drop line).
    expect(draggedColumns(view)).toEqual([]);
    expect(dropLine(view)).toBeNull();
    expect(gripFor(view, 0).style.transform).toBe("");
    expect(gripFor(view, 0).hasAttribute("data-drag-source")).toBe(false);
  });

  it("D.2: uncommitted cell text travels with the reorder in one write", async () => {
    const { extension, writes } = countWrites();
    const view = mount(DOC, [extension]);

    typeInto(view, 1, 1, "typed");
    expect(view.doc()).toBe(DOC);
    expect(writes).toEqual([]);

    await liftGrip(view, 1);
    await dragOver(view, 1, 0);
    await pointerUp();

    expect(writes).toHaveLength(1);
    expect(writes[0]).toBe(
      "intro\n\n| b | a | c |\n| :---: | --- | ---: |\n| typed | a1 | c1 |\n",
    );
    expect(view.doc()).toBe(writes[0]);
    expect(focusedCell()).toEqual({ row: "0", col: "0" });
  });
});

describe("D.2: aborting", () => {
  it("D.2: Escape aborts the lift with no document change", async () => {
    const { extension, writes } = countWrites();
    const view = mount(DOC, [extension]);

    await liftGrip(view, 0);
    await dragOver(view, 1, 2, 240);
    // The source is lifted and travelling; the drop line marks the target.
    expect(draggedColumns(view)).toEqual(["0", "0"]);
    expect(dropLine(view)).not.toBeNull();

    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      document.dispatchEvent(escape);
    });
    await settle();

    expect(escape.defaultPrevented).toBe(true);
    expect(view.doc()).toBe(DOC);
    expect(writes).toEqual([]);
    expect(draggedColumns(view)).toEqual([]);
    // Abort clears the travel and the drop line with the lift.
    expect(dropLine(view)).toBeNull();
    expect(gripFor(view, 0).style.transform).toBe("");
  });

  it("D.2: pointercancel aborts the lift with no document change", async () => {
    const { extension, writes } = countWrites();
    const view = mount(DOC, [extension]);

    await liftGrip(view, 0);
    await dragOver(view, 1, 1);

    await act(async () => {
      document.dispatchEvent(pointer("pointercancel"));
    });
    await settle();

    expect(view.doc()).toBe(DOC);
    expect(writes).toEqual([]);
    expect(draggedColumns(view)).toEqual([]);
  });
});
