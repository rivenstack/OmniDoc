// The table model — F-15 Task 3.3 Rev 2, plan Task A.1.
//
// `OBS-1.14.4-TABLE-001` is the catalogue entry that matters here: a cell holds
// **decoded** text (`\|` → `|`, line-break tag → newline) while the document
// holds encoded source. Every structural operation the menus and the keyboard
// matrix will call is a pure function over `TableModel`, so its guards (one
// column minimum, header immovable, alignment follows its column) are asserted
// directly here rather than through an editor.
//
// The `B-*` / `J-1` / `J-2` behaviours are `@user`-directed (plan §1), never
// parity claims: they are recorded as directed in this header.

import { describe, expect, it } from "vitest";
import {
  bodyRowCount,
  cellSource,
  cellText,
  clearCells,
  columnCount,
  compareCellValues,
  decodeCell,
  deleteColumn,
  deleteRow,
  duplicateColumn,
  duplicateRow,
  encodeCell,
  insertColumn,
  insertRow,
  markdownFromModel,
  moveColumn,
  moveRow,
  pushHeaderDown,
  setCellText,
  setColumnAlignment,
  sortRows,
  tableModelFromMarkdown,
  type TableModel,
} from "./model";

function model(markdown: string): TableModel {
  const value = tableModelFromMarkdown(markdown);
  if (!value) throw new Error(`not a table: ${markdown}`);
  return value;
}

const BASE = "| a | b |\n| --- | --- |\n| 1 | 2 |";

describe("cell codec (OBS-1.14.4-TABLE-001)", () => {
  it("TABLE-001: decodes an escaped pipe to a literal one", () => {
    expect(decodeCell("a \\| b")).toBe("a | b");
  });

  it("TABLE-001: leaves a pipe inside a code span alone, and decodes an escaped one", () => {
    expect(decodeCell("`p|q`")).toBe("`p|q`");
    expect(decodeCell("`p\\|q`")).toBe("`p|q`");
  });

  it("TABLE-001: decodes every line-break tag spelling, case-insensitively", () => {
    for (const tag of ["<br>", "<br/>", "<br />", "<BR>", "<Br/>", "<BR />"]) {
      expect(decodeCell(`a${tag}b`)).toBe("a\nb");
    }
  });

  it("decodes a cell with both a pipe and a break", () => {
    expect(decodeCell("a \\| b<br>c")).toBe("a | b\nc");
  });

  it("encodes a pipe and a newline into their GFM-safe spellings", () => {
    expect(encodeCell("a | b")).toBe("a \\| b");
    expect(encodeCell("a\nb")).toBe("a<br>b");
    expect(encodeCell("a\r\nb")).toBe("a<br>b");
  });

  it("records the literal-<br> asymmetry rather than hiding it", () => {
    // A user who *types* `<br>` gets a newline on the next mount: the document
    // has no way to tell the typed tag from the encoded newline. Asserted so the
    // behaviour is pinned and visible, not discovered later.
    expect(encodeCell("a<br>b")).toBe("a<br>b");
    expect(decodeCell(encodeCell("a<br>b"))).toBe("a\nb");
  });

  it("round-trips encode(decode(x)) idempotently", () => {
    const samples = [
      "a | b",
      "a \\| b",
      "`p|q`",
      "line one\nline two",
      "**bold** and a | pipe<br>and a break",
      "",
      "trailing  ",
    ];
    for (const sample of samples) {
      const once = encodeCell(decodeCell(sample));
      const twice = encodeCell(decodeCell(once));
      expect(twice).toBe(once);
    }
  });
});

describe("model ↔ markdown", () => {
  it("wraps the shared parser without copying behaviour", () => {
    const value = model(BASE);
    expect(value.headers).toEqual(["a", "b"]);
    expect(value.alignments).toEqual(["left", "left"]);
    expect(value.rows).toEqual([["1", "2"]]);
    expect(markdownFromModel(value)).toBe(BASE);
  });

  it("returns null for a block that is not a table", () => {
    expect(tableModelFromMarkdown("| a | b |")).toBeNull();
    expect(tableModelFromMarkdown("just prose")).toBeNull();
  });

  it("counts columns and body rows", () => {
    const value = model(
      "| a | b | c |\n| --- | --- | --- |\n| 1 | 2 | 3 |\n| 4 | 5 | 6 |",
    );
    expect(columnCount(value)).toBe(3);
    expect(bodyRowCount(value)).toBe(2);
  });

  it("reads a cell's source and its decoded text by visual row", () => {
    const value = model("| h\\|1 | b |\n| --- | --- |\n| a | b<br>c |");
    expect(cellSource(value, { row: 0, col: 0 })).toBe("h\\|1");
    expect(cellText(value, { row: 0, col: 0 })).toBe("h|1");
    expect(cellText(value, { row: 1, col: 1 })).toBe("b\nc");
  });

  it("returns empty values for an address outside the table", () => {
    const value = model(BASE);
    expect(cellSource(value, { row: 9, col: 0 })).toBe("");
    expect(cellSource(value, { row: 0, col: 9 })).toBe("");
  });
});

describe("setCellText and clearCells", () => {
  it("writes decoded text back as encoded source", () => {
    const value = setCellText(model(BASE), { row: 1, col: 0 }, "x | y");
    expect(value.rows[0][0]).toBe("x \\| y");
    expect(markdownFromModel(value)).toBe(
      "| a | b |\n| --- | --- |\n| x \\| y | 2 |",
    );
  });

  it("writes the header row too", () => {
    const value = setCellText(model(BASE), { row: 0, col: 1 }, "B");
    expect(markdownFromModel(value)).toBe(
      "| a | B |\n| --- | --- |\n| 1 | 2 |",
    );
  });

  it("ignores an address outside the table", () => {
    const value = model(BASE);
    expect(setCellText(value, { row: 5, col: 0 }, "x")).toEqual(value);
    expect(setCellText(value, { row: 0, col: 5 }, "x")).toEqual(value);
  });

  it("clears a set of cells, header included, leaving the cells in place", () => {
    const value = clearCells(model(BASE), [
      { row: 0, col: 0 },
      { row: 1, col: 1 },
    ]);
    expect(markdownFromModel(value)).toBe("|  | b |\n| --- | --- |\n| 1 |  |");
  });

  it("does nothing for an empty cell set", () => {
    const value = model(BASE);
    expect(clearCells(value, [])).toBe(value);
  });
});

describe("row operations", () => {
  it("inserts an empty body row at the requested index", () => {
    const value = insertRow(model(BASE), 0);
    expect(markdownFromModel(value)).toBe(
      "| a | b |\n| --- | --- |\n|  |  |\n| 1 | 2 |",
    );
  });

  it("appends when the index is past the end, and clamps a negative index", () => {
    const value = model(BASE);
    expect(bodyRowCount(insertRow(value, 99))).toBe(2);
    expect(bodyRowCount(insertRow(value, -3))).toBe(2);
  });

  it("deletes a body row", () => {
    const value = model("| a | b |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |");
    expect(markdownFromModel(deleteRow(value, 0))).toBe(
      "| a | b |\n| --- | --- |\n| 3 | 4 |",
    );
  });

  it("never deletes the header row: body index 0 is the first body row", () => {
    const value = model(BASE);
    expect(markdownFromModel(deleteRow(value, 0))).toBe(
      "| a | b |\n| --- | --- |",
    );
  });

  it("refuses an out-of-range delete", () => {
    const value = model(BASE);
    expect(deleteRow(value, 5)).toEqual(value);
    expect(deleteRow(value, -1)).toEqual(value);
  });

  it("moves a body row to its final index", () => {
    const value = model("| a |\n| --- |\n| 1 |\n| 2 |\n| 3 |");
    expect(moveRow(value, 0, 2).rows.map((row) => row[0])).toEqual([
      "2",
      "3",
      "1",
    ]);
    expect(moveRow(value, 2, 0).rows.map((row) => row[0])).toEqual([
      "3",
      "1",
      "2",
    ]);
  });

  it("refuses a move that stays put, or that leaves the body", () => {
    const value = model(BASE);
    expect(moveRow(value, 0, 0)).toEqual(value);
    expect(moveRow(value, 0, 7)).toEqual(value);
    expect(moveRow(value, -1, 0)).toEqual(value);
  });

  it("duplicates a body row directly below itself", () => {
    const value = duplicateRow(model("| a |\n| --- |\n| 1 |\n| 2 |"), 0);
    expect(value.rows.map((row) => row[0])).toEqual(["1", "1", "2"]);
  });

  it("refuses to duplicate a row that does not exist", () => {
    const value = model(BASE);
    expect(duplicateRow(value, 3)).toEqual(value);
  });
});

describe("column operations", () => {
  it("inserts an empty column, with the header, alignments and every row", () => {
    const value = insertColumn(model(BASE), 1);
    expect(markdownFromModel(value)).toBe(
      "| a |  | b |\n| --- | --- | --- |\n| 1 |  | 2 |",
    );
  });

  it("deletes a column and its alignment", () => {
    const value = model("| a | b |\n| :- | -: |\n| 1 | 2 |");
    const next = deleteColumn(value, 0);
    expect(next.alignments).toEqual(["right"]);
    expect(markdownFromModel(next)).toBe("| b |\n| ---: |\n| 2 |");
  });

  it("refuses to delete the last remaining column", () => {
    const value = model("| a |\n| --- |\n| 1 |");
    expect(deleteColumn(value, 0)).toEqual(value);
  });

  it("refuses an out-of-range delete", () => {
    const value = model(BASE);
    expect(deleteColumn(value, 5)).toEqual(value);
    expect(deleteColumn(value, -1)).toEqual(value);
  });

  it("moves a column and its alignment together, everywhere", () => {
    const value = model("| a | b | c |\n| :- | -: | :-: |\n| 1 | 2 | 3 |");
    const next = moveColumn(value, 2, 0);
    expect(next.headers).toEqual(["c", "a", "b"]);
    expect(next.alignments).toEqual(["center", "left", "right"]);
    expect(next.rows[0]).toEqual(["3", "1", "2"]);
    expect(markdownFromModel(next)).toBe(
      "| c | a | b |\n| :---: | --- | ---: |\n| 3 | 1 | 2 |",
    );
  });

  it("refuses a move that stays put, or that leaves the columns", () => {
    const value = model(BASE);
    expect(moveColumn(value, 0, 0)).toEqual(value);
    expect(moveColumn(value, 0, 5)).toEqual(value);
    expect(moveColumn(value, -1, 0)).toEqual(value);
  });

  it("duplicates a column and its alignment to the right", () => {
    const value = model("| a | b |\n| -: | :- |\n| 1 | 2 |");
    const next = duplicateColumn(value, 0);
    expect(next.headers).toEqual(["a", "a", "b"]);
    expect(next.alignments).toEqual(["right", "right", "left"]);
    expect(next.rows[0]).toEqual(["1", "1", "2"]);
  });

  it("sets one column's alignment", () => {
    const value = setColumnAlignment(model(BASE), 1, "center");
    expect(markdownFromModel(value)).toBe(
      "| a | b |\n| --- | :---: |\n| 1 | 2 |",
    );
  });

  it("ignores an alignment for a column that does not exist", () => {
    const value = model(BASE);
    expect(setColumnAlignment(value, 4, "right")).toEqual(value);
  });
});

describe("header push (J-1, @user-directed)", () => {
  it("pushes the header content into a new first body row and empties the header", () => {
    const value = pushHeaderDown(model("| a | b |\n| --- | --- |\n| 1 | 2 |"));
    expect(value.headers).toEqual(["", ""]);
    expect(value.rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(markdownFromModel(value)).toBe(
      "|  |  |\n| --- | --- |\n| a | b |\n| 1 | 2 |",
    );
  });

  it("works on a header-only table", () => {
    const value = pushHeaderDown(model("| a | b |\n| --- | --- |"));
    expect(value.headers).toEqual(["", ""]);
    expect(value.rows).toEqual([["a", "b"]]);
  });

  it("keeps the alignments in place", () => {
    const value = pushHeaderDown(model("| a | b |\n| :- | -: |\n| 1 | 2 |"));
    expect(value.alignments).toEqual(["left", "right"]);
  });
});

describe("sorting (J-2, @user-directed)", () => {
  const TABLE = model(
    [
      "| name | n |",
      "| --- | --- |",
      "| banana | 10 |",
      "| Apple | 2 |",
      "| cherry |  |",
      "| apple | 1 |",
    ].join("\n"),
  );

  it("sorts body rows case-insensitively, keeping the header fixed", () => {
    const value = sortRows(TABLE, 0, "asc");
    expect(value.headers).toEqual(["name", "n"]);
    expect(value.rows.map((row) => row[0])).toEqual([
      "Apple",
      "apple",
      "banana",
      "cherry",
    ]);
  });

  it("sorts numerically, and puts empty cells last ascending", () => {
    expect(sortRows(TABLE, 1, "asc").rows.map((row) => row[1])).toEqual([
      "1",
      "2",
      "10",
      "",
    ]);
  });

  it("mirrors the comparator for descending, so empties come first", () => {
    expect(sortRows(TABLE, 1, "desc").rows.map((row) => row[1])).toEqual([
      "",
      "10",
      "2",
      "1",
    ]);
  });

  it("is stable, so equal cells keep their document order", () => {
    // `Apple` and `apple` compare equal; the document order is preserved.
    const value = sortRows(TABLE, 0, "asc");
    expect(value.rows.map((row) => row[0])).toEqual([
      "Apple",
      "apple",
      "banana",
      "cherry",
    ]);
  });

  it("sorts decoded text, so an escaped pipe compares as a pipe", () => {
    const value = sortRows(
      model("| a | b |\n| --- | --- |\n| z |  |\n| a \\| b |  |"),
      0,
      "asc",
    );
    expect(value.rows.map((row) => row[0])).toEqual(["a \\| b", "z"]);
  });

  it("refuses to sort by a column that does not exist", () => {
    expect(sortRows(TABLE, 5, "asc")).toBe(TABLE);
  });

  it("compares empty values last, and equal empties as equal", () => {
    expect(compareCellValues("", "a")).toBeGreaterThan(0);
    expect(compareCellValues("a", "")).toBeLessThan(0);
    expect(compareCellValues("", "")).toBe(0);
  });
});
