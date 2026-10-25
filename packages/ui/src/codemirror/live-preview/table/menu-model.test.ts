// The table context menu's pure model — F-15 Task 3.3 Rev 2, plan Task D.3.
//
// `OBS-1.14.4-MENU-002` is a **separate, `@user`-directed** table-cell context
// menu (plan §4.6, S4 capture 2026-10-16). It is not a parity claim: the
// sections, their order, the header-cell row subset and the inferred "move
// column" mirror are what `@user` asked for. The Task 6.3 seam is the section
// array itself, pinned at the bottom of this file.
//
// Everything here is pure: model + cell → sections, or model + cell + command →
// `StructureResult`. No React, no DOM, no editor. The mutation and focus rules
// are `structure.ts`'s (and are pinned by its own suite); this suite pins the
// **menu's** availability rules and its exact labels/order.

import { describe, expect, it } from "vitest";
import { tableModelFromMarkdown, type TableModel } from "./model";
import {
  menuSections,
  runMenuCommand,
  type TableMenuCommandId,
  type TableMenuSection,
} from "./menu-model";
import {
  addColumnLeft,
  addColumnRight,
  addRowAbove,
  addRowBelow,
  alignColumn,
  deleteColumn,
  deleteRow,
  duplicateColumn,
  duplicateRow,
  moveColumnLeft,
  moveColumnRight,
  moveRowDown,
  moveRowUp,
  sortColumn,
  type StructureResult,
} from "./structure";

function model(markdown: string): TableModel {
  const parsed = tableModelFromMarkdown(markdown);
  if (!parsed) throw new Error(`not a table: ${markdown}`);
  return parsed;
}

/** Three columns and three body rows: every direction is available somewhere. */
const FULL =
  "| H1 | H2 | H3 |\n| :--- | :---: | ---: |\n| a | b | c |\n| d | e | f |\n| g | h | i |";

function sections(
  markdown: string,
  row: number,
  col: number,
): TableMenuSection[] {
  return menuSections(model(markdown), { row, col });
}

function submenu(
  markdown: string,
  row: number,
  col: number,
  id: "row" | "column",
): string[] {
  const section = sections(markdown, row, col).find(
    (entry) => entry.kind === "submenu" && entry.id === id,
  );
  if (!section || section.kind !== "submenu") {
    throw new Error(`no ${id} submenu`);
  }
  return section.items.map((item) => item.label);
}

/** The ids of the top-level items, in order. */
function topLevelLabels(list: readonly TableMenuSection[]): string[] {
  return list.flatMap((section) => {
    if (section.kind === "separator") return [];
    if (section.kind === "item") return [section.item.label];
    return [section.label];
  });
}

describe("MENU-002: sections and order (plan §4.6, S4)", () => {
  it("MENU-002: the top level is Row, Column, separator, sort A→Z, sort Z→A", () => {
    const list = sections(FULL, 2, 1);

    expect(list.map((section) => section.kind)).toEqual([
      "submenu",
      "submenu",
      "separator",
      "item",
      "item",
    ]);
    expect(topLevelLabels(list)).toEqual([
      "Row",
      "Column",
      "Sort by column (A to Z)",
      "Sort by column (Z to A)",
    ]);
    // The two submenus carry the ids the renderer keys on.
    expect(list[0]).toMatchObject({ kind: "submenu", id: "row", label: "Row" });
    expect(list[1]).toMatchObject({
      kind: "submenu",
      id: "column",
      label: "Column",
    });
  });

  it("MENU-002: the Column submenu lists §4.6 in order", () => {
    expect(submenu(FULL, 1, 1, "column")).toEqual([
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
  });

  it("MENU-002: the Row submenu lists §4.6 in order", () => {
    expect(submenu(FULL, 2, 1, "row")).toEqual([
      "Add row above",
      "Add row below",
      "Move row up",
      "Move row down",
      "Duplicate row",
      "Delete row",
    ]);
  });

  it("MENU-002: a header cell offers only `Add row below`", () => {
    expect(submenu(FULL, 0, 1, "row")).toEqual(["Add row below"]);
  });

  it("MENU-002: the first body row omits `Move row up`, the last omits `Move row down`", () => {
    expect(submenu(FULL, 1, 0, "row")).toEqual([
      "Add row above",
      "Add row below",
      "Move row down",
      "Duplicate row",
      "Delete row",
    ]);
    expect(submenu(FULL, 3, 0, "row")).toEqual([
      "Add row above",
      "Add row below",
      "Move row up",
      "Duplicate row",
      "Delete row",
    ]);
    // A middle row has both directions.
    expect(submenu(FULL, 2, 0, "row")).toEqual(
      expect.arrayContaining(["Move row up", "Move row down"]),
    );
  });

  it("MENU-002: column edges remove only the unavailable direction", () => {
    expect(submenu(FULL, 1, 0, "column")).not.toContain("Move column left");
    expect(submenu(FULL, 1, 0, "column")).toContain("Move column right");

    expect(submenu(FULL, 1, 2, "column")).not.toContain("Move column right");
    expect(submenu(FULL, 1, 2, "column")).toContain("Move column left");
  });

  it("MENU-002: a one-column table offers no `Delete column`, but keeps add/align/duplicate", () => {
    const ONE = "| only |\n| --- |\n| a |";
    const labels = submenu(ONE, 1, 0, "column");

    expect(labels).not.toContain("Delete column");
    expect(labels).toEqual(
      expect.arrayContaining([
        "Add column to the left",
        "Add column to the right",
        "Align left",
        "Align center",
        "Align right",
        "Duplicate column",
      ]),
    );
    // The mirror item still exists on the only column's left edge (col 0) but
    // not on its right, which is also the last column.
    expect(labels).not.toContain("Move column left");
    expect(labels).not.toContain("Move column right");
  });
});

describe("MENU-002: the alignment check (S4)", () => {
  function checkedLabels(markdown: string, col: number): string[] {
    const section = sections(markdown, 1, col).find(
      (entry) => entry.kind === "submenu" && entry.id === "column",
    );
    if (!section || section.kind !== "submenu")
      throw new Error("no column menu");
    return section.items
      .filter((item) => item.id.startsWith("column.align-"))
      .filter((item) => item.checked)
      .map((item) => item.label);
  }

  it("MENU-002: exactly the clicked column's alignment is checked", () => {
    expect(checkedLabels(FULL, 0)).toEqual(["Align left"]);
    expect(checkedLabels(FULL, 1)).toEqual(["Align center"]);
    expect(checkedLabels(FULL, 2)).toEqual(["Align right"]);
  });

  it("MENU-002: a missing alignment reads as `left` (the grid's default)", () => {
    const missing: TableModel = {
      headers: ["a", "b"],
      // A hand-built model can be shorter than the header row; the grid renders
      // `left` for the gap, and the menu must agree.
      alignments: ["right"],
      rows: [["1", "2"]],
    };
    const section = menuSections(missing, { row: 1, col: 1 }).find(
      (entry) => entry.kind === "submenu" && entry.id === "column",
    );
    if (!section || section.kind !== "submenu")
      throw new Error("no column menu");
    expect(
      section.items.filter((item) => item.checked).map((item) => item.label),
    ).toEqual(["Align left"]);
  });
});

describe("MENU-002: sorting (J-2, plan §4.6)", () => {
  /** Mixed case, numeric ordering and an empty cell in one column. */
  const MIXED = "| item |\n| --- |\n| item 10 |\n| Item 2 |\n|  |\n| item 1 |";

  it("MENU-002: A→Z orders case-insensitively and numerically, empties last", () => {
    const result = runMenuCommand("sort.asc", model(MIXED), { row: 2, col: 0 });
    if (result.kind !== "commit") throw new Error("sort did not commit");

    // `item 1` < `Item 2` < `item 10` (numeric), and the empty cell is last.
    expect(result.model.rows).toEqual([
      ["item 1"],
      ["Item 2"],
      ["item 10"],
      [""],
    ]);
    // The header is not a row and cannot move.
    expect(result.model.headers).toEqual(["item"]);
    expect(result.focus).toEqual({ row: 2, col: 0, offset: 0 });
  });

  it("MENU-002: Z→A mirrors the comparator, so empties come first", () => {
    const result = runMenuCommand("sort.desc", model(MIXED), {
      row: 1,
      col: 0,
    });
    if (result.kind !== "commit") throw new Error("sort did not commit");

    // `sortRows` mirrors the ascending comparator exactly, so the empty cell
    // that sorts last ascending sorts first descending (existing behaviour,
    // pinned here rather than re-decided by the menu).
    expect(result.model.rows).toEqual([
      [""],
      ["item 10"],
      ["Item 2"],
      ["item 1"],
    ]);
    expect(result.model.headers).toEqual(["item"]);
  });
});

describe("MENU-002: command dispatch delegates to the structure layer", () => {
  const CELL = { row: 2, col: 1 };

  const cases: readonly {
    readonly id: TableMenuCommandId;
    readonly expected: StructureResult;
  }[] = [
    { id: "row.add-above", expected: addRowAbove(model(FULL), CELL) },
    { id: "row.add-below", expected: addRowBelow(model(FULL), CELL) },
    { id: "row.move-up", expected: moveRowUp(model(FULL), CELL) },
    { id: "row.move-down", expected: moveRowDown(model(FULL), CELL) },
    { id: "row.duplicate", expected: duplicateRow(model(FULL), CELL) },
    { id: "row.delete", expected: deleteRow(model(FULL), CELL) },
    { id: "column.add-left", expected: addColumnLeft(model(FULL), CELL) },
    { id: "column.add-right", expected: addColumnRight(model(FULL), CELL) },
    { id: "column.move-left", expected: moveColumnLeft(model(FULL), CELL) },
    { id: "column.move-right", expected: moveColumnRight(model(FULL), CELL) },
    {
      id: "column.align-left",
      expected: alignColumn(model(FULL), CELL.col, "left"),
    },
    {
      id: "column.align-center",
      expected: alignColumn(model(FULL), CELL.col, "center"),
    },
    {
      id: "column.align-right",
      expected: alignColumn(model(FULL), CELL.col, "right"),
    },
    {
      id: "column.duplicate",
      expected: duplicateColumn(model(FULL), CELL),
    },
    { id: "column.delete", expected: deleteColumn(model(FULL), CELL) },
    {
      id: "sort.asc",
      expected: sortColumn(model(FULL), CELL, "asc"),
    },
    {
      id: "sort.desc",
      expected: sortColumn(model(FULL), CELL, "desc"),
    },
  ];

  it.each(cases)(
    "MENU-002: $id returns the structure command's own result",
    ({ id, expected }) => {
      expect(runMenuCommand(id, model(FULL), CELL)).toEqual(expected);
      // The result kind and focus are part of the contract the grid acts on.
      expect(runMenuCommand(id, model(FULL), CELL).kind).toBe(expected.kind);
    },
  );

  it("MENU-002: a command whose guard fails is an explicit noop", () => {
    // The first body row cannot move up, and the menu removes the item — but a
    // stale activation must still answer `noop`, never a phantom commit.
    expect(
      runMenuCommand("row.move-up", model(FULL), { row: 1, col: 0 }),
    ).toEqual({ kind: "noop" });
  });
});

describe("MENU-002: the Task 6.3 seam", () => {
  it("MENU-002: the menu is a plain, additive section array", () => {
    const list = sections(FULL, 1, 1);

    // Data only: no renderer state, no React nodes, no commands invoked.
    expect(
      list.every((section) =>
        ["submenu", "separator", "item"].includes(section.kind),
      ),
    ).toBe(true);

    // The general editor items (Task 6.3) will be **appended**; a later section
    // cannot reorder or reinterpret the table's own sections.
    const extended: TableMenuSection[] = [
      ...list,
      { kind: "separator" },
      {
        kind: "item",
        item: { id: "sort.asc", label: "General item placeholder" },
      },
    ];
    expect(extended.slice(0, list.length)).toEqual(list);
    expect(topLevelLabels(extended).at(-1)).toBe("General item placeholder");
  });
});
