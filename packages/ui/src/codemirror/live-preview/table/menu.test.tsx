// The table cell context menu, wired — F-15 Task 3.3 Rev 2, plan Task D.3.
//
// `OBS-1.14.4-MENU-002` is a **separate, `@user`-directed** table-cell context
// menu (plan §4.6, S4 capture 2026-10-16). It is not a parity claim: the
// sections/order, the header-cell row subset, the inferred "move column" mirror
// and the sort labels are what `@user` asked for.
//
// What is proven here is the wiring the pure suite cannot reach: the project's
// Base UI `ContextMenu` opens at the pointer with the table as its trigger and
// its popup **portalled to the body**; every item activates through the grid's
// collected-model command pipeline and closes the menu; a dismissed menu returns
// focus to the anchor cell; the context-menu key / Shift+F10 open it; a
// right-click outside a cell never does; and a locked note has no menu at all.
//
// Focus after a command belongs to the structure result (`structure.ts`), not to
// the menu: e.g. add-column focuses the new header, align focuses the column's
// header, sort keeps the clicked cell. The two D.3 hardening rules are proven at
// the bottom: an uncommitted keystroke travels in the one command write, and an
// activation clamps its open-time anchor against the model it runs against.

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHarness, type EditorHarness } from "../../parity/harness";
import { TableContextMenu } from "./menu";
import type { TableCommandRun } from "./grid";
import { tableModelFromMarkdown, type TableCellRef } from "./model";
import { tableLivePreview } from "./scan";
import type { StructureResult } from "./structure";

const LANGUAGE = markdown({ base: markdownLanguage });

/** Three columns, one per alignment, and two body rows. */
const TABLE =
  "| H1 | H2 | H3 |\n| --- | :---: | ---: |\n| a1 | b1 | c1 |\n| a2 | b2 | c2 |";
const DOC = `intro\n\n${TABLE}\n`;

/** One column, mixed case / numbers / an empty cell — the sort fixture. */
const UNSORTED = "| item |\n| --- |\n| item 10 |\n| Item 2 |\n|  |\n| item 1 |";
const UNSORTED_DOC = `intro\n\n${UNSORTED}\n`;

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
  return created;
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

/** Focus a cell (the precondition of every keyboard open). */
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

/** Right-click a cell the way a pointer does. */
async function openMenu(
  view: EditorHarness,
  row: number,
  col: number,
): Promise<void> {
  await act(async () => {
    cellContent(view, row, col).dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 20,
        clientY: 20,
      }),
    );
  });
}

/** The open portalled popup, or `null`. */
function menuPopup(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>(
    '[data-slot="context-menu-content"]',
  );
}

function must<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("expected a value");
  return value;
}

/** One key, dispatched on the focused element (or `target`). */
async function press(
  target: Element | null,
  key: string,
  shift = false,
): Promise<KeyboardEvent> {
  const event = new KeyboardEvent("keydown", {
    key,
    shiftKey: shift,
    bubbles: true,
    cancelable: true,
  });
  await act(async () => {
    target?.dispatchEvent(event);
  });
  return event;
}

/**
 * Open one submenu from the keyboard.
 *
 * Base UI focuses the menu popup on open; the submenu triggers are the first
 * items, so walking down to `Row` (index 0) or `Column` (index 1) and pressing
 * ArrowRight is the menu's own keyboard path — no hover timers in jsdom.
 */
async function openSubmenu(id: "row" | "column"): Promise<void> {
  const popup = must(menuPopup());
  if (document.activeElement !== popup) {
    await act(async () => {
      popup.focus();
    });
  }
  const triggers = [
    ...document.body.querySelectorAll<HTMLElement>(
      '[data-slot="dropdown-menu-sub-trigger"]',
    ),
  ];
  const index = triggers.findIndex(
    (trigger) =>
      trigger.textContent?.trim() === (id === "row" ? "Row" : "Column"),
  );
  expect(index).toBeGreaterThanOrEqual(0);
  for (let step = 0; step <= index; step += 1) {
    await press(document.activeElement, "ArrowDown");
  }
  expect(document.activeElement).toBe(triggers[index]);
  await press(document.activeElement, "ArrowRight");
}

/** The open submenu's items, in order. */
function submenuLabels(): string[] {
  const sub = must(
    document.body.querySelector<HTMLElement>(
      '[data-slot="dropdown-menu-sub-content"]',
    ),
  );
  return [
    ...sub.querySelectorAll<HTMLElement>(
      '[data-menu-command], [data-slot="dropdown-menu-separator"]',
    ),
  ]
    .filter((element) => element.hasAttribute("data-menu-command"))
    .map((element) => element.textContent?.trim() ?? "");
}

/** The top-level entries, in order (submenu triggers included). */
function topLevelLabels(): string[] {
  const popup = must(menuPopup());
  return [
    ...popup.querySelectorAll<HTMLElement>(
      '[data-slot="dropdown-menu-sub-trigger"], [data-slot="dropdown-menu-item"]',
    ),
  ].map((element) => element.textContent?.trim() ?? "");
}

/** Click one command wherever it is rendered (top level or open submenu). */
async function clickCommand(id: string): Promise<void> {
  const item = must(
    document.body.querySelector<HTMLElement>(`[data-menu-command="${id}"]`),
  );
  await act(async () => {
    item.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
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

describe("MENU-002: opening the menu", () => {
  it("MENU-002: right-click in a cell opens a portalled menu with the §4.6 sections", async () => {
    const view = mount();
    await openMenu(view, 1, 1);

    const popup = must(menuPopup());
    // Portalled to the body, not nested in the widget: an editor-scoped menu
    // would grow the editor's scroll container (the callout precedent).
    expect(document.body.contains(popup)).toBe(true);
    expect(
      view.view.contentDOM.querySelector('[data-slot="context-menu-content"]'),
    ).toBeNull();
    expect(topLevelLabels()).toEqual([
      "Row",
      "Column",
      "Sort by column (A to Z)",
      "Sort by column (Z to A)",
    ]);
  });

  it("MENU-002: the table stays one element and keeps the D.2 sibling layout", async () => {
    const view = mount();
    const table = view.view.contentDOM.querySelector<HTMLTableElement>(
      "table.cm-live-table",
    );
    expect(table).not.toBeNull();
    // The table itself is the trigger: Base UI's render prop merges the trigger
    // props onto it, so the DOM still has exactly one table with the same grid.
    expect(table?.getAttribute("data-slot")).toBe("context-menu-trigger");
    expect(
      view.view.contentDOM.querySelectorAll("table.cm-live-table"),
    ).toHaveLength(1);
    expect(table?.querySelectorAll("thead th")).toHaveLength(3);
    expect(table?.querySelectorAll("tbody td")).toHaveLength(6);
    // The D.2 drop indicator and the D.1 column strip are siblings of the table
    // inside its relative-positioned frame; wrapping must not move the table out
    // of that frame.
    const frame = must(table?.parentElement);
    expect(frame.className).toContain("relative");
    expect(frame.querySelector(".cm-live-table-add-column")).not.toBeNull();
    expect(frame.querySelector("table.cm-live-table")).toBe(table);
  });

  it("MENU-002: a header cell's Row submenu offers only `Add row below`", async () => {
    const view = mount();
    await openMenu(view, 0, 0);
    await openSubmenu("row");

    expect(submenuLabels()).toEqual(["Add row below"]);
  });

  it("MENU-002: the Column submenu lists §4.6 in order", async () => {
    const view = mount();
    await openMenu(view, 1, 1);
    await openSubmenu("column");

    expect(submenuLabels()).toEqual([
      "Add column to the left",
      "Add column to the right",
      "Move column left",
      "Move column right",
      "Align left",
      "Align center",
      "Align right",
      "Duplicate column",
      "Delete column",
    ]);

    // The S4 capture separates add / move / align / modify; the pure item list
    // stays flat, so the renderer is what owns these three separators.
    const sub = must(
      document.body.querySelector('[data-slot="dropdown-menu-sub-content"]'),
    );
    expect(
      sub.querySelectorAll('[data-slot="dropdown-menu-separator"]'),
    ).toHaveLength(3);
  });

  it("MENU-002: alignment items carry the clicked column's checked state", async () => {
    const view = mount();
    // Column 1 is centered in the fixture.
    await openMenu(view, 1, 1);
    await openSubmenu("column");

    const radios = [
      ...document.body.querySelectorAll<HTMLElement>(
        '[data-slot="dropdown-menu-radio-item"]',
      ),
    ];
    expect(radios).toHaveLength(3);
    expect(radios.map((radio) => radio.textContent?.trim())).toEqual([
      "Align left",
      "Align center",
      "Align right",
    ]);
    expect(radios.map((radio) => radio.getAttribute("aria-checked"))).toEqual([
      "false",
      "true",
      "false",
    ]);
  });

  it("MENU-002: an unavailable move item is absent from the DOM", async () => {
    const view = mount();
    await openMenu(view, 1, 0);
    await openSubmenu("column");
    expect(
      document.body.querySelector('[data-menu-command="column.move-left"]'),
    ).toBeNull();
    expect(
      document.body.querySelector('[data-menu-command="column.move-right"]'),
    ).not.toBeNull();
  });

  it("MENU-002: the last column offers no `Move column right`", async () => {
    const view = mount();
    await openMenu(view, 1, 2);
    await openSubmenu("column");
    expect(
      document.body.querySelector('[data-menu-command="column.move-right"]'),
    ).toBeNull();
    expect(
      document.body.querySelector('[data-menu-command="column.move-left"]'),
    ).not.toBeNull();
  });

  it("MENU-002: a one-column table offers no `Delete column`", async () => {
    const ONE = "intro\n\n| only |\n| --- |\n| a |\n";
    const view = mount(ONE);
    await openMenu(view, 1, 0);
    await openSubmenu("column");

    expect(
      document.body.querySelector('[data-menu-command="column.delete"]'),
    ).toBeNull();
    expect(
      document.body.querySelector('[data-menu-command="column.duplicate"]'),
    ).not.toBeNull();
    expect(
      document.body.querySelector('[data-menu-command="column.add-right"]'),
    ).not.toBeNull();
  });
});

describe("MENU-002: sorting", () => {
  it("MENU-002: A→Z orders body rows case-insensitively and numerically, empties last", async () => {
    const view = mount(UNSORTED_DOC);
    await openMenu(view, 1, 0);
    await clickCommand("sort.asc");

    const lines = view.doc().split("\n");
    // The header is fixed; the body is ordered and the empty row is last.
    expect(lines[2]).toBe("| item |");
    expect(lines[4]).toBe("| item 1 |");
    expect(lines[5]).toBe("| Item 2 |");
    expect(lines[6]).toBe("| item 10 |");
    expect(lines[7]).toBe("|  |");
    expect(focusedCell()).toEqual({ row: "1", col: "0" });
    expect(menuPopup()).toBeNull();
  });

  it("MENU-002: Z→A mirrors the comparator (empty first) and keeps the header", async () => {
    const view = mount(UNSORTED_DOC);
    await openMenu(view, 1, 0);
    await clickCommand("sort.desc");

    const lines = view.doc().split("\n");
    expect(lines[2]).toBe("| item |");
    expect(lines[4]).toBe("|  |");
    expect(lines[5]).toBe("| item 10 |");
    expect(lines[6]).toBe("| Item 2 |");
    expect(lines[7]).toBe("| item 1 |");
  });
});

describe("MENU-002: every menu item runs its structure command and closes", () => {
  it("MENU-002: Add row below inserts a body row below and focuses it", async () => {
    const view = mount();
    await openMenu(view, 1, 0);
    await openSubmenu("row");
    await clickCommand("row.add-below");

    const lines = view.doc().split("\n");
    expect(lines[4]).toBe("| a1 | b1 | c1 |");
    expect(lines[5]).toBe("|  |  |  |");
    expect(lines[6]).toBe("| a2 | b2 | c2 |");
    expect(focusedCell()).toEqual({ row: "2", col: "0" });
    expect(menuPopup()).toBeNull();
  });

  it("MENU-002: Add row above inserts before the clicked body row and focuses it", async () => {
    const view = mount();
    await openMenu(view, 2, 1);
    await openSubmenu("row");
    await clickCommand("row.add-above");

    const lines = view.doc().split("\n");
    expect(lines[4]).toBe("| a1 | b1 | c1 |");
    expect(lines[5]).toBe("|  |  |  |");
    expect(lines[6]).toBe("| a2 | b2 | c2 |");
    // The clicked row keeps its visual row (the new row took row 1): the caret
    // stays in the row the user asked about, at the clicked column.
    expect(focusedCell()).toEqual({ row: "2", col: "1" });
  });

  it("MENU-002: Add column to the right inserts a column and focuses its header", async () => {
    const view = mount();
    await openMenu(view, 1, 1);
    await openSubmenu("column");
    await clickCommand("column.add-right");

    const lines = view.doc().split("\n");
    expect(lines[2]).toBe("| H1 | H2 |  | H3 |");
    expect(lines[3]).toBe("| --- | :---: | --- | ---: |");
    expect(focusedCell()).toEqual({ row: "0", col: "2" });
  });

  it("MENU-002: Add column to the left inserts a column and focuses its header", async () => {
    const view = mount();
    await openMenu(view, 1, 1);
    await openSubmenu("column");
    await clickCommand("column.add-left");

    const lines = view.doc().split("\n");
    expect(lines[2]).toBe("| H1 |  | H2 | H3 |");
    expect(focusedCell()).toEqual({ row: "0", col: "1" });
  });

  it("MENU-002: Move row up reorders the body and focuses the moved row", async () => {
    const view = mount();
    await openMenu(view, 2, 0);
    await openSubmenu("row");
    await clickCommand("row.move-up");

    const lines = view.doc().split("\n");
    expect(lines[4]).toBe("| a2 | b2 | c2 |");
    expect(lines[5]).toBe("| a1 | b1 | c1 |");
    expect(focusedCell()).toEqual({ row: "1", col: "0" });
  });

  it("MENU-002: Move row down is offered and reorders the body", async () => {
    const view = mount();
    await openMenu(view, 1, 0);
    await openSubmenu("row");
    await clickCommand("row.move-down");

    const lines = view.doc().split("\n");
    expect(lines[4]).toBe("| a2 | b2 | c2 |");
    expect(lines[5]).toBe("| a1 | b1 | c1 |");
    expect(focusedCell()).toEqual({ row: "2", col: "0" });
  });

  it("MENU-002: Move column left reorders the columns and focuses the moved header", async () => {
    const view = mount();
    await openMenu(view, 1, 1);
    await openSubmenu("column");
    await clickCommand("column.move-left");

    const lines = view.doc().split("\n");
    expect(lines[2]).toBe("| H2 | H1 | H3 |");
    // The alignment travels with the column.
    expect(lines[3]).toBe("| :---: | --- | ---: |");
    expect(focusedCell()).toEqual({ row: "0", col: "0" });
  });

  it("MENU-002: Duplicate row copies below and focuses the copy", async () => {
    const view = mount();
    await openMenu(view, 1, 0);
    await openSubmenu("row");
    await clickCommand("row.duplicate");

    const lines = view.doc().split("\n");
    expect(lines[4]).toBe("| a1 | b1 | c1 |");
    expect(lines[5]).toBe("| a1 | b1 | c1 |");
    expect(focusedCell()).toEqual({ row: "2", col: "0" });
  });

  it("MENU-002: Duplicate column copies to the right and focuses the copy's header", async () => {
    const view = mount();
    await openMenu(view, 1, 1);
    await openSubmenu("column");
    await clickCommand("column.duplicate");

    const lines = view.doc().split("\n");
    expect(lines[2]).toBe("| H1 | H2 | H2 | H3 |");
    expect(focusedCell()).toEqual({ row: "0", col: "2" });
  });

  it("MENU-002: Delete row removes it and clamps focus", async () => {
    const view = mount();
    await openMenu(view, 1, 0);
    await openSubmenu("row");
    await clickCommand("row.delete");

    const lines = view.doc().split("\n");
    expect(lines[4]).toBe("| a2 | b2 | c2 |");
    // The deleted first body row leaves the row below in its place.
    expect(focusedCell()).toEqual({ row: "1", col: "0" });
  });

  it("MENU-002: Delete column removes it and clamps focus to the header", async () => {
    const view = mount();
    await openMenu(view, 1, 0);
    await openSubmenu("column");
    await clickCommand("column.delete");

    const lines = view.doc().split("\n");
    expect(lines[2]).toBe("| H2 | H3 |");
    expect(lines[3]).toBe("| :---: | ---: |");
    expect(focusedCell()).toEqual({ row: "0", col: "0" });
  });

  it("MENU-002: Align center writes the delimiter row and focuses the column header", async () => {
    const view = mount();
    await openMenu(view, 1, 0);
    await openSubmenu("column");
    await clickCommand("column.align-center");

    const lines = view.doc().split("\n");
    expect(lines[3]).toBe("| :---: | :---: | ---: |");
    // `alignColumn`'s focus target is the column's header (structure.ts).
    expect(focusedCell()).toEqual({ row: "0", col: "0" });
    expect(menuPopup()).toBeNull();
  });
});

describe("MENU-002: focus", () => {
  it("MENU-002: Escape closes a dismissed menu and returns focus to the anchor cell", async () => {
    const view = mount();
    await focusCell(view, 1, 1);
    await openMenu(view, 1, 1);
    expect(menuPopup()).not.toBeNull();

    const event = await press(document.activeElement, "Escape");
    await settle();

    expect(event.defaultPrevented).toBe(true);
    expect(menuPopup()).toBeNull();
    expect(focusedCell()).toEqual({ row: "1", col: "1" });
    expect(view.doc()).toBe(DOC);
  });

  it("MENU-002: an outside click closes the menu without a command and restores the anchor", async () => {
    const view = mount();
    await focusCell(view, 1, 1);
    await openMenu(view, 1, 1);

    await act(async () => {
      document.body.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
      );
      document.body.dispatchEvent(
        new MouseEvent("mouseup", { bubbles: true, cancelable: true }),
      );
    });
    await settle();

    expect(menuPopup()).toBeNull();
    expect(focusedCell()).toEqual({ row: "1", col: "1" });
  });
});

describe("MENU-002: keyboard open (D-4)", () => {
  it("MENU-002: the context-menu key opens the table menu from a focused cell", async () => {
    const view = mount();
    await focusCell(view, 1, 1);

    const event = await press(cellContent(view, 1, 1), "ContextMenu");

    expect(event.defaultPrevented).toBe(true);
    expect(menuPopup()).not.toBeNull();
    expect(topLevelLabels()).toEqual([
      "Row",
      "Column",
      "Sort by column (A to Z)",
      "Sort by column (Z to A)",
    ]);
  });

  it("MENU-002: Shift+F10 opens the table menu from a focused cell", async () => {
    const view = mount();
    await focusCell(view, 2, 0);

    const event = await press(cellContent(view, 2, 0), "F10", true);

    expect(event.defaultPrevented).toBe(true);
    expect(menuPopup()).not.toBeNull();
    // The anchor is the focused cell, not the header: its Row submenu is the
    // full body-row one (the last row, so `Move row down` is the unavailable one).
    await openSubmenu("row");
    expect(submenuLabels()).toContain("Move row up");
    expect(submenuLabels()).not.toContain("Move row down");
  });

  it("MENU-002: a right-click outside any cell never opens this menu", async () => {
    const view = mount();
    const grid = must(
      view.view.contentDOM.querySelector<HTMLElement>(".cm-live-table-grid"),
    );
    const tail = must(
      view.view.contentDOM.querySelector<HTMLElement>(".cm-live-table-tail"),
    );

    for (const target of [tail, grid]) {
      await act(async () => {
        target.dispatchEvent(
          new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
            clientX: 10,
            clientY: 10,
          }),
        );
      });
      expect(menuPopup()).toBeNull();
    }
  });

  it("MENU-002: a locked note has no menu on right-click or Shift+F10", async () => {
    const view = mount(DOC, [EditorState.readOnly.of(true)]);

    await openMenu(view, 1, 1);
    expect(menuPopup()).toBeNull();
    // No trigger is mounted at all, and the table is still rendered.
    expect(
      view.view.contentDOM.querySelector('[data-slot="context-menu-trigger"]'),
    ).toBeNull();
    expect(
      view.view.contentDOM.querySelectorAll("table.cm-live-table"),
    ).toHaveLength(1);

    const event = await press(
      view.view.contentDOM.querySelector(".cm-live-table-grid"),
      "F10",
      true,
    );
    expect(event.defaultPrevented).toBe(false);
    expect(menuPopup()).toBeNull();
  });
});

describe("MENU-002: hardening", () => {
  it("MENU-002: uncommitted cell text travels in the one command write", async () => {
    const { extension, writes } = countWrites();
    const view = mount(DOC, [extension]);

    typeInto(view, 1, 1, "typed");
    expect(view.doc()).toBe(DOC);

    // Opening the menu moves focus into the portal; that must not be read as
    // leaving the table (no flush, no rebuild under the open menu).
    await openMenu(view, 2, 0);
    expect(writes).toEqual([]);

    await openSubmenu("column");
    await clickCommand("column.add-right");

    expect(writes).toHaveLength(1);
    expect(writes[0]).toBe(
      "intro\n\n| H1 |  | H2 | H3 |\n| --- | --- | :---: | ---: |\n| a1 |  | typed | c1 |\n| a2 |  | b2 | c2 |\n",
    );
    expect(view.doc()).toBe(writes[0]);
    expect(focusedCell()).toEqual({ row: "0", col: "1" });
  });

  it("MENU-002: activation clamps the open-time anchor against the live model", async () => {
    const threeColumns = must(
      tableModelFromMarkdown(
        "| H1 | H2 | H3 |\n| --- | --- | --- |\n| a | b | c |",
      ),
    );
    const oneColumn = must(tableModelFromMarkdown("| only |\n| --- |\n| a |"));
    // The anchor is column 5, which only the three-column model addresses.
    const cell: TableCellRef = { row: 1, col: 5 };

    const host = document.createElement("div");
    document.body.appendChild(host);
    const root: Root = createRoot(host);
    let result: StructureResult | null = null;
    const run: TableCommandRun = (resolve) => {
      // The menu opened on `threeColumns`, but the live model shrank to a single
      // column before the item activated: the resolver must clamp, not index.
      result = resolve(oneColumn);
    };

    flushSync(() => {
      root.render(
        <TableContextMenu model={threeColumns} cell={cell} editable run={run}>
          <thead>
            <tr>
              <th>H1</th>
              <th>H2</th>
              <th>H3</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>a</td>
              <td>b</td>
              <td>c</td>
            </tr>
          </tbody>
        </TableContextMenu>,
      );
    });

    const table = must(
      host.querySelector<HTMLTableElement>("table.cm-live-table"),
    );
    await act(async () => {
      table.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: 5,
          clientY: 5,
        }),
      );
    });
    await openSubmenu("column");
    await clickCommand("column.add-right");

    const committed = result as StructureResult | null;
    if (!committed || committed.kind !== "commit") {
      throw new Error("the command did not clamp into a commit");
    }
    // Clamped to column 0 of the live model, so the copy lands at column 1.
    expect(committed.model.headers).toEqual(["only", ""]);
    expect(committed.focus).toEqual({ row: 0, col: 1, offset: 0 });

    flushSync(() => root.unmount());
    host.remove();
  });
});
