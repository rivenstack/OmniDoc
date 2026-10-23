// Structural navigation — F-15 Task 3.3 Rev 2, plan Task C.2.
//
// `OBS-1.14.4-TABLE-001` is the promise that a table is one editor per cell and
// that Tab/Enter/arrows move between those editors. This suite pins every branch
// of the plan §4.5 matrix as a **pure** question — model + cell + key → result —
// so no editor, timer or React is involved.
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
  navigateEnter,
  navigateHorizontal,
  navigateTab,
  navigateVertical,
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
