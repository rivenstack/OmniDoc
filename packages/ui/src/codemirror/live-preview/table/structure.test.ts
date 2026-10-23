// Structural navigation — F-15 Task 3.3 Rev 2, plan Task C.2.
// Structure commands — F-15 Task 3.3 Rev 2, plan Task C.3 / MENU-002.
//
// `OBS-1.14.4-TABLE-001` is the promise that a table is one editor per cell and
// that Tab/Enter/arrows move between those editors. This suite pins every branch
// of the plan §4.5 matrix as a **pure** question — model + cell + key → result —
// so no editor, timer or React is involved.
//
// The second half pins the **command layer** the context menu (D.3) invokes.
// `OBS-1.14.4-MENU-002` is a separate, `@user`-directed table-cell menu (§4.6),
// never a parity claim: every item's mutation and its post-command focus are
// asserted here, and the availability helpers are asserted to agree with the
// commands so an unavailable item can be *removed* rather than refused.
//
// The Shift-Tab-at-`(0,0)` **J-1 header push** is `@user`-directed (plan §1,
// 2026-10-16), never a parity claim: the header is emptied and its content
// becomes the first body row. The append-row behaviour on Tab/Enter is likewise
// the keyboard path `@user` needs (D-4).
//
// Offsets are **decoded** offsets (`cellText(...).length`), because that is what
// a cell editor holds.

import { describe, expect, it } from "vitest";
import { cellText, tableModelFromMarkdown } from "./model";
import {
  addColumnLeft,
  addColumnRight,
  addRowAbove,
  addRowBelow,
  alignColumn,
  canAddColumnLeft,
  canAddRowAbove,
  canAddRowBelow,
  canAlignColumn,
  canDeleteColumn,
  canDeleteRow,
  canDuplicateColumn,
  canDuplicateRow,
  canMoveColumnLeft,
  canMoveColumnRight,
  canMoveRow,
  canMoveRowDown,
  canMoveRowUp,
  canSortColumn,
  deleteColumn,
  deleteRow,
  deleteTable,
  duplicateColumn,
  duplicateRow,
  moveColumnLeft,
  moveColumnRight,
  moveRowDown,
  moveRowUp,
  navigateEnter,
  navigateHorizontal,
  navigateTab,
  navigateVertical,
  sortColumn,
  type StructureResult,
} from "./structure";

/** Two columns, a header and two body rows. */
const TABLE =
  "| H1 | H2 |\n| --- | --- |\n| a | b |\n| c | d |";

/** A table with no body rows at all. */
const HEADER_ONLY = "| H1 | H2 |\n| --- | --- |";

/** An escaped pipe in the header, to prove offsets are decoded. */
const ESCAPED = "| x \\| y | b |\n| --- | --- |\n| a | c |";

function model(markdown: string = TABLE) {
  const parsed = tableModelFromMarkdown(markdown);
  if (!parsed) throw new Error("fixture is not a table");
  return parsed;
}

describe("TABLE-001: Left/Right leave only at the row edges", () => {
  it("TABLE-001: Right moves to the next cell at its start", () => {
    expect(navigateHorizontal(model(), { row: 0, col: 0 }, "right")).toEqual({
      kind: "focus",
      focus: { row: 0, col: 1, offset: 0 },
    });
  });

  it("TABLE-001: Right continues on the next row's first cell", () => {
    expect(navigateHorizontal(model(), { row: 0, col: 1 }, "right")).toEqual({
      kind: "focus",
      focus: { row: 1, col: 0, offset: 0 },
    });
  });

  it("TABLE-001: Right on the last cell leaves after the table", () => {
    expect(navigateHorizontal(model(), { row: 2, col: 1 }, "right")).toEqual({
      kind: "leave",
      edge: "after",
    });
  });

  it("TABLE-001: Left moves to the previous cell at its decoded end", () => {
    expect(navigateHorizontal(model(), { row: 1, col: 1 }, "left")).toEqual({
      kind: "focus",
      focus: { row: 1, col: 0, offset: "a".length },
    });
  });

  it("TABLE-001: Left continues on the previous row's last cell", () => {
    expect(navigateHorizontal(model(), { row: 1, col: 0 }, "left")).toEqual({
      kind: "focus",
      focus: { row: 0, col: 1, offset: "H2".length },
    });
  });

  it("TABLE-001: Left on the first cell leaves before the table", () => {
    expect(navigateHorizontal(model(), { row: 0, col: 0 }, "left")).toEqual({
      kind: "leave",
      edge: "before",
    });
  });
});

describe("TABLE-001: Up/Down keep the column and leave at the header/last row", () => {
  it("TABLE-001: Down moves to the same column below", () => {
    expect(navigateVertical(model(), { row: 0, col: 0 }, "down")).toEqual({
      kind: "focus",
      focus: { row: 1, col: 0, offset: "a".length },
    });
  });

  it("TABLE-001: Up moves to the same column above", () => {
    expect(navigateVertical(model(), { row: 1, col: 1 }, "up")).toEqual({
      kind: "focus",
      focus: { row: 0, col: 1, offset: "H2".length },
    });
  });

  it("TABLE-001: Down on the last body row leaves after the table", () => {
    expect(navigateVertical(model(), { row: 2, col: 0 }, "down")).toEqual({
      kind: "leave",
      edge: "after",
    });
  });

  it("TABLE-001: Up on the header row leaves before the table", () => {
    expect(navigateVertical(model(), { row: 0, col: 1 }, "up")).toEqual({
      kind: "leave",
      edge: "before",
    });
  });

  it("TABLE-001: a vertical target offset is the decoded cell length", () => {
    const escaped = model(ESCAPED);
    const decodedEnd = cellText(escaped, { row: 0, col: 0 }).length;

    expect(decodedEnd).toBe("x | y".length);
    expect(navigateVertical(escaped, { row: 1, col: 0 }, "up")).toEqual({
      kind: "focus",
      focus: { row: 0, col: 0, offset: decodedEnd },
    });
  });
});

describe("TABLE-001: Tab / Shift-Tab (J-1 @user-directed header push)", () => {
  it("TABLE-001: Tab moves forward within a row", () => {
    expect(navigateTab(model(), { row: 0, col: 0 }, false)).toEqual({
      kind: "focus",
      focus: { row: 0, col: 1, offset: "H2".length },
    });
  });

  it("TABLE-001: Tab continues on the next row's first cell", () => {
    expect(navigateTab(model(), { row: 0, col: 1 }, false)).toEqual({
      kind: "focus",
      focus: { row: 1, col: 0, offset: "a".length },
    });
  });

  it("TABLE-001: Tab off the last cell appends a body row and focuses it", () => {
    const result = navigateTab(model(), { row: 2, col: 1 }, false);

    expect(result.kind).toBe("commit");
    if (result.kind !== "commit") return;
    expect(result.focus).toEqual({ row: 3, col: 0, offset: 0 });
    expect(result.model.rows).toHaveLength(3);
    expect(result.model.rows[2]).toEqual(["", ""]);
    // The old content is untouched: Tab appends, it does not move the header.
    expect(result.model.headers).toEqual(["H1", "H2"]);
    expect(result.model.rows[0]).toEqual(["a", "b"]);
  });

  it("TABLE-001: Shift-Tab moves backwards to the decoded end", () => {
    expect(navigateTab(model(), { row: 1, col: 0 }, true)).toEqual({
      kind: "focus",
      focus: { row: 0, col: 1, offset: "H2".length },
    });
  });

  it("TABLE-001: Shift-Tab within a row goes to the previous cell", () => {
    expect(navigateTab(model(), { row: 2, col: 1 }, true)).toEqual({
      kind: "focus",
      focus: { row: 2, col: 0, offset: "c".length },
    });
  });

  it("TABLE-001: a backward target offset is the decoded cell length", () => {
    const escaped = model(ESCAPED);

    expect(navigateTab(escaped, { row: 0, col: 1 }, true)).toEqual({
      kind: "focus",
      focus: {
        row: 0,
        col: 0,
        offset: cellText(escaped, { row: 0, col: 0 }).length,
      },
    });
  });

  it("TABLE-001: Shift-Tab at (0,0) pushes the header down (J-1, @user-directed)", () => {
    const result = navigateTab(model(), { row: 0, col: 0 }, true);

    expect(result.kind).toBe("commit");
    if (result.kind !== "commit") return;
    // The caret stays in the now-empty header cell.
    expect(result.focus).toEqual({ row: 0, col: 0, offset: 0 });
    // Header emptied; the old header is now the first body row; existing body
    // rows follow in order.
    expect(result.model.headers).toEqual(["", ""]);
    expect(result.model.rows[0]).toEqual(["H1", "H2"]);
    expect(result.model.rows[1]).toEqual(["a", "b"]);
    expect(result.model.rows[2]).toEqual(["c", "d"]);
    // Columns and alignments do not move.
    expect(result.model.alignments).toEqual(["left", "left"]);
  });

  it("TABLE-001: Shift-Tab at (0,0) on a header-only table still pushes", () => {
    const result = navigateTab(model(HEADER_ONLY), { row: 0, col: 0 }, true);

    expect(result.kind).toBe("commit");
    if (result.kind !== "commit") return;
    expect(result.model.headers).toEqual(["", ""]);
    expect(result.model.rows).toEqual([["H1", "H2"]]);
    expect(result.focus).toEqual({ row: 0, col: 0, offset: 0 });
  });
});

describe("TABLE-001: Enter moves down and builds a row at the end", () => {
  it("TABLE-001: Enter moves down in the same column", () => {
    expect(navigateEnter(model(), { row: 1, col: 0 })).toEqual({
      kind: "focus",
      focus: { row: 2, col: 0, offset: "c".length },
    });
  });

  it("TABLE-001: Enter on the last body row appends one and focuses it", () => {
    const result = navigateEnter(model(), { row: 2, col: 1 });

    expect(result.kind).toBe("commit");
    if (result.kind !== "commit") return;
    expect(result.focus).toEqual({ row: 3, col: 1, offset: 0 });
    expect(result.model.rows[2]).toEqual(["", ""]);
  });

  it("TABLE-001: Enter on the header of a body-less table appends the first row", () => {
    const result = navigateEnter(model(HEADER_ONLY), { row: 0, col: 0 });

    expect(result.kind).toBe("commit");
    if (result.kind !== "commit") return;
    expect(result.focus).toEqual({ row: 1, col: 0, offset: 0 });
    expect(result.model.rows).toEqual([["", ""]]);
  });
});

// ------------------------------------------------------------ command layer
//
// `MENU-002` is the `@user`-directed table-cell context menu (plan §4.6). These
// tests pin every command's **mutation and focus target**, and the availability
// helpers that let D.3 remove items rather than render dead ones.

/** A single-column table with two body rows. */
const SINGLE = "| H |\n| --- |\n| a |\n| b |";

/** One body row, so deleteRow has a "only row" case to pin. */
const ONE_ROW = "| H1 | H2 |\n| --- | --- |\n| a | b |";

/** Body rows out of order, with an empty cell, to pin the sort rules. */
const UNORDERED = "| H |\n| --- |\n| b |\n|  |\n| a |";

/** Assert a `commit` result and return it, so the test reads as one flow. */
function expectCommit(result: StructureResult) {
  if (result.kind !== "commit") {
    throw new Error(`expected a commit result, got ${result.kind}`);
  }
  return result;
}

describe("MENU-002: row commands", () => {
  it("MENU-002: addRowAbove inserts before the clicked body row and focuses it", () => {
    const { model: next, focus } = expectCommit(
      addRowAbove(model(), { row: 2, col: 1 }),
    );

    expect(focus).toEqual({ row: 2, col: 1, offset: 0 });
    expect(next.rows).toEqual([
      ["a", "b"],
      ["", ""],
      ["c", "d"],
    ]);
    // The header is untouched: it is not a row.
    expect(next.headers).toEqual(["H1", "H2"]);
  });

  it("MENU-002: addRowAbove is a noop on the header row", () => {
    expect(addRowAbove(model(), { row: 0, col: 0 })).toEqual({ kind: "noop" });
  });

  it("MENU-002: addRowBelow on the header inserts the first body row", () => {
    const { model: next, focus } = expectCommit(
      addRowBelow(model(), { row: 0, col: 1 }),
    );

    expect(focus).toEqual({ row: 1, col: 1, offset: 0 });
    expect(next.rows[0]).toEqual(["", ""]);
    expect(next.rows[1]).toEqual(["a", "b"]);
  });

  it("MENU-002: addRowBelow inserts after the clicked row and focuses the new one", () => {
    const { model: next, focus } = expectCommit(
      addRowBelow(model(), { row: 1, col: 0 }),
    );

    expect(focus).toEqual({ row: 2, col: 0, offset: 0 });
    expect(next.rows).toEqual([
      ["a", "b"],
      ["", ""],
      ["c", "d"],
    ]);
  });

  it("MENU-002: addRowBelow on the last row appends", () => {
    const { model: next, focus } = expectCommit(
      addRowBelow(model(), { row: 2, col: 0 }),
    );

    expect(focus).toEqual({ row: 3, col: 0, offset: 0 });
    expect(next.rows[2]).toEqual(["", ""]);
  });

  it("MENU-002: addRowBelow refuses an out-of-range address", () => {
    expect(addRowBelow(model(), { row: 3, col: 0 })).toEqual({ kind: "noop" });
    expect(addRowBelow(model(), { row: 1, col: 2 })).toEqual({ kind: "noop" });
  });

  it("MENU-002: moveRowUp refuses the header and the first body row", () => {
    expect(moveRowUp(model(), { row: 0, col: 0 })).toEqual({ kind: "noop" });
    expect(moveRowUp(model(), { row: 1, col: 0 })).toEqual({ kind: "noop" });
  });

  it("MENU-002: moveRowUp swaps with the row above and follows the row", () => {
    const { model: next, focus } = expectCommit(
      moveRowUp(model(), { row: 2, col: 1 }),
    );

    expect(focus).toEqual({ row: 1, col: 1, offset: 0 });
    expect(next.rows).toEqual([
      ["c", "d"],
      ["a", "b"],
    ]);
  });

  it("MENU-002: moveRowDown refuses the last body row", () => {
    expect(moveRowDown(model(), { row: 2, col: 0 })).toEqual({ kind: "noop" });
  });

  it("MENU-002: moveRowDown swaps with the row below and follows the row", () => {
    const { model: next, focus } = expectCommit(
      moveRowDown(model(), { row: 1, col: 0 }),
    );

    expect(focus).toEqual({ row: 2, col: 0, offset: 0 });
    expect(next.rows).toEqual([
      ["c", "d"],
      ["a", "b"],
    ]);
  });

  it("MENU-002: duplicateRow copies directly below and focuses the copy", () => {
    const { model: next, focus } = expectCommit(
      duplicateRow(model(), { row: 1, col: 0 }),
    );

    expect(focus).toEqual({ row: 2, col: 0, offset: 0 });
    expect(next.rows).toEqual([
      ["a", "b"],
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("MENU-002: duplicateRow refuses the header", () => {
    expect(duplicateRow(model(), { row: 0, col: 0 })).toEqual({ kind: "noop" });
  });

  it("MENU-002: deleteRow clamps focus to the same visual row", () => {
    const { model: next, focus } = expectCommit(
      deleteRow(model(), { row: 1, col: 1 }),
    );

    // The row that was below moved up into the deleted row's place.
    expect(focus).toEqual({ row: 1, col: 1, offset: 0 });
    expect(next.rows).toEqual([["c", "d"]]);
  });

  it("MENU-002: deleteRow on the last row clamps to the new last row", () => {
    const { model: next, focus } = expectCommit(
      deleteRow(model(), { row: 2, col: 0 }),
    );

    expect(focus).toEqual({ row: 1, col: 0, offset: 0 });
    expect(next.rows).toEqual([["a", "b"]]);
  });

  it("MENU-002: deleteRow on the only row focuses the header", () => {
    const { model: next, focus } = expectCommit(
      deleteRow(model(ONE_ROW), { row: 1, col: 1 }),
    );

    expect(focus).toEqual({ row: 0, col: 1, offset: 0 });
    expect(next.rows).toEqual([]);
  });

  it("MENU-002: deleteRow refuses the header", () => {
    expect(deleteRow(model(), { row: 0, col: 0 })).toEqual({ kind: "noop" });
  });
});

describe("MENU-002: column commands", () => {
  it("MENU-002: addColumnLeft inserts at the clicked column and focuses its header", () => {
    const { model: next, focus } = expectCommit(
      addColumnLeft(model(), { row: 0, col: 0 }),
    );

    expect(focus).toEqual({ row: 0, col: 0, offset: 0 });
    expect(next.headers).toEqual(["", "H1", "H2"]);
    expect(next.rows[0]).toEqual(["", "a", "b"]);
    // A new column starts left-aligned.
    expect(next.alignments).toEqual(["left", "left", "left"]);
  });

  it("MENU-002: addColumnRight inserts to the right and focuses the new header", () => {
    const { model: next, focus } = expectCommit(
      addColumnRight(model(), { row: 0, col: 1 }),
    );

    expect(focus).toEqual({ row: 0, col: 2, offset: 0 });
    expect(next.headers).toEqual(["H1", "H2", ""]);
    expect(next.rows[1]).toEqual(["c", "d", ""]);
  });

  it("MENU-002: add column refuses a missing column", () => {
    expect(addColumnLeft(model(), { row: 0, col: 5 })).toEqual({ kind: "noop" });
    expect(addColumnRight(model(), { row: 0, col: -1 })).toEqual({
      kind: "noop",
    });
  });

  it("MENU-002: moveColumnLeft refuses column 0", () => {
    expect(moveColumnLeft(model(), { row: 0, col: 0 })).toEqual({ kind: "noop" });
  });

  it("MENU-002: moveColumnLeft moves the column and follows its header", () => {
    const { model: next, focus } = expectCommit(
      moveColumnLeft(model(), { row: 0, col: 1 }),
    );

    expect(focus).toEqual({ row: 0, col: 0, offset: 0 });
    expect(next.headers).toEqual(["H2", "H1"]);
    expect(next.rows).toEqual([
      ["b", "a"],
      ["d", "c"],
    ]);
  });

  it("MENU-002: moveColumnRight refuses the last column", () => {
    expect(moveColumnRight(model(), { row: 0, col: 1 })).toEqual({
      kind: "noop",
    });
  });

  it("MENU-002: moveColumnRight moves the column and follows its header", () => {
    const { model: next, focus } = expectCommit(
      moveColumnRight(model(), { row: 0, col: 0 }),
    );

    expect(focus).toEqual({ row: 0, col: 1, offset: 0 });
    expect(next.headers).toEqual(["H2", "H1"]);
  });

  it("MENU-002: alignColumn sets the alignment and focuses the header", () => {
    const { model: next, focus } = expectCommit(
      alignColumn(model(), 1, "right"),
    );

    expect(focus).toEqual({ row: 0, col: 1, offset: 0 });
    expect(next.alignments).toEqual(["left", "right"]);
    // Aligning is not a content edit.
    expect(next.headers).toEqual(["H1", "H2"]);
  });

  it("MENU-002: alignColumn re-selecting the current alignment is a noop", () => {
    expect(alignColumn(model(), 0, "left")).toEqual({ kind: "noop" });
  });

  it("MENU-002: duplicateColumn copies to the right and focuses the copy", () => {
    const { model: next, focus } = expectCommit(
      duplicateColumn(model(), { row: 1, col: 0 }),
    );

    expect(focus).toEqual({ row: 0, col: 1, offset: 0 });
    expect(next.headers).toEqual(["H1", "H1", "H2"]);
    expect(next.rows[0]).toEqual(["a", "a", "b"]);
  });

  it("MENU-002: deleteColumn removes it and focuses the clamped header", () => {
    const { model: next, focus } = expectCommit(
      deleteColumn(model(), { row: 1, col: 0 }),
    );

    expect(focus).toEqual({ row: 0, col: 0, offset: 0 });
    expect(next.headers).toEqual(["H2"]);
    expect(next.rows).toEqual([["b"], ["d"]]);
  });

  it("MENU-002: deleteColumn on the last column clamps focus left", () => {
    const { model: next, focus } = expectCommit(
      deleteColumn(model(), { row: 0, col: 1 }),
    );

    expect(focus).toEqual({ row: 0, col: 0, offset: 0 });
    expect(next.headers).toEqual(["H1"]);
  });

  it("MENU-002: deleteColumn refuses the only column", () => {
    expect(deleteColumn(model(SINGLE), { row: 0, col: 0 })).toEqual({
      kind: "noop",
    });
  });

  it("MENU-002: deleteColumn refuses an out-of-range column", () => {
    expect(deleteColumn(model(), { row: 0, col: 9 })).toEqual({ kind: "noop" });
  });
});

describe("MENU-002: sort by column", () => {
  it("MENU-002: sort ascending keeps the header and puts empty cells last", () => {
    const { model: next, focus } = expectCommit(
      sortColumn(model(UNORDERED), { row: 1, col: 0 }, "asc"),
    );

    expect(focus).toEqual({ row: 1, col: 0, offset: 0 });
    expect(next.headers).toEqual(["H"]);
    expect(next.rows).toEqual([["a"], ["b"], [""]]);
  });

  it("MENU-002: sort descending mirrors the comparator, empty first", () => {
    const { model: next } = expectCommit(
      sortColumn(model(UNORDERED), { row: 1, col: 0 }, "desc"),
    );

    expect(next.rows).toEqual([[""], ["b"], ["a"]]);
  });

  it("MENU-002: sort refuses a missing column", () => {
    expect(sortColumn(model(), { row: 0, col: 4 }, "asc")).toEqual({
      kind: "noop",
    });
  });
});

describe("MENU-002: delete table", () => {
  it("MENU-002: deleteTable asks the widget to remove the block", () => {
    expect(deleteTable()).toEqual({ kind: "delete-table" });
  });
});

describe("MENU-002: availability helpers agree with the commands", () => {
  it("MENU-002: row availability follows the same guards", () => {
    const table = model();

    expect(canAddRowAbove(table, { row: 0, col: 0 })).toBe(false);
    expect(canAddRowAbove(table, { row: 1, col: 0 })).toBe(true);
    expect(canAddRowBelow(table, { row: 0, col: 0 })).toBe(true);
    expect(canAddRowBelow(table, { row: 2, col: 1 })).toBe(true);

    expect(canMoveRow(table, { row: 0, col: 0 })).toBe(false);
    expect(canMoveRowUp(table, { row: 1, col: 0 })).toBe(false);
    expect(canMoveRowUp(table, { row: 2, col: 0 })).toBe(true);
    expect(canMoveRowDown(table, { row: 1, col: 0 })).toBe(true);
    expect(canMoveRowDown(table, { row: 2, col: 0 })).toBe(false);

    expect(canDuplicateRow(table, { row: 0, col: 0 })).toBe(false);
    expect(canDuplicateRow(table, { row: 1, col: 0 })).toBe(true);
    expect(canDeleteRow(table, { row: 0, col: 0 })).toBe(false);
    expect(canDeleteRow(table, { row: 2, col: 0 })).toBe(true);
  });

  it("MENU-002: column availability follows the same guards", () => {
    const table = model();
    const single = model(SINGLE);

    expect(canAddColumnLeft(table, { row: 0, col: 0 })).toBe(true);
    expect(canAddColumnLeft(table, { row: 0, col: 9 })).toBe(false);

    expect(canMoveColumnLeft(table, { row: 0, col: 0 })).toBe(false);
    expect(canMoveColumnLeft(table, { row: 0, col: 1 })).toBe(true);
    expect(canMoveColumnRight(table, { row: 0, col: 0 })).toBe(true);
    expect(canMoveColumnRight(table, { row: 0, col: 1 })).toBe(false);

    expect(canDuplicateColumn(table, { row: 0, col: 1 })).toBe(true);
    expect(canDeleteColumn(table, { row: 0, col: 0 })).toBe(true);
    expect(canDeleteColumn(single, { row: 0, col: 0 })).toBe(false);

    expect(canAlignColumn(table, { row: 0, col: 0 })).toBe(true);
    expect(canSortColumn(table, { row: 0, col: 1 })).toBe(true);
    expect(canSortColumn(table, { row: 0, col: 2 })).toBe(false);
  });

  it("MENU-002: a helper never says yes when its command says noop", () => {
    const table = model();
    const cases: Array<[boolean, StructureResult]> = [
      [
        canAddRowAbove(table, { row: 0, col: 0 }),
        addRowAbove(table, { row: 0, col: 0 }),
      ],
      [
        canMoveRowUp(table, { row: 1, col: 0 }),
        moveRowUp(table, { row: 1, col: 0 }),
      ],
      [
        canMoveRowDown(table, { row: 2, col: 0 }),
        moveRowDown(table, { row: 2, col: 0 }),
      ],
      [
        canDuplicateRow(table, { row: 0, col: 0 }),
        duplicateRow(table, { row: 0, col: 0 }),
      ],
      [
        canDeleteRow(table, { row: 0, col: 0 }),
        deleteRow(table, { row: 0, col: 0 }),
      ],
      [
        canMoveColumnLeft(table, { row: 0, col: 0 }),
        moveColumnLeft(table, { row: 0, col: 0 }),
      ],
      [
        canMoveColumnRight(table, { row: 0, col: 1 }),
        moveColumnRight(table, { row: 0, col: 1 }),
      ],
    ];

    for (const [available, result] of cases) {
      expect(available).toBe(result.kind !== "noop");
    }
  });
});
