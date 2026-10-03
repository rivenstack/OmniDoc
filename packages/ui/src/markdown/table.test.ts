import { describe, expect, it } from "vitest";
import {
  completedDelimiterRow,
  escapeTableCell,
  hasBalancedPipes,
  isTableDelimiterRow,
  normalizeMarkdownTables,
  parseMarkdownTable,
  serializeMarkdownTable,
  splitTableRow,
  unescapeTableCell,
  type ParsedTable,
} from "./table";

describe("splitTableRow", () => {
  it("splits on the row's pipes and trims the padding around them", () => {
    expect(splitTableRow("| a | b |")).toEqual(["a", "b"]);
    expect(splitTableRow("|a|b|")).toEqual(["a", "b"]);
    expect(splitTableRow("a | b")).toEqual(["a", "b"]);
  });

  it("keeps an escaped pipe inside the cell, escape included", () => {
    // The escape is part of the cell's source, so it survives a round trip.
    expect(splitTableRow("| a \\| b | c |")).toEqual(["a \\| b", "c"]);
  });

  it("does not split on a pipe inside a code span", () => {
    expect(splitTableRow("| `a|b` | c |")).toEqual(["`a|b`", "c"]);
  });

  it("does not treat an escaped final pipe as the closing pipe", () => {
    expect(splitTableRow("| a \\|")).toEqual(["a \\|"]);
  });
});

describe("isTableDelimiterRow", () => {
  it("accepts the delimiter spellings", () => {
    expect(isTableDelimiterRow("| --- |")).toBe(true);
    expect(isTableDelimiterRow("|---|---|")).toBe(true);
    expect(isTableDelimiterRow("| :-- | --: | :-: |")).toBe(true);
    expect(isTableDelimiterRow("--- | ---")).toBe(true);
  });

  it("rejects anything that is not only dashes, colons and separators", () => {
    expect(isTableDelimiterRow("| abc |")).toBe(false);
    expect(isTableDelimiterRow("---")).toBe(false); // a horizontal rule
    expect(isTableDelimiterRow("| --- | x |")).toBe(false);
    expect(isTableDelimiterRow("")).toBe(false);
  });
});

describe("hasBalancedPipes", () => {
  it("requires a closing pipe only when the row opens with one", () => {
    expect(hasBalancedPipes("| a | b |")).toBe(true);
    expect(hasBalancedPipes("| a | b")).toBe(false);
    expect(hasBalancedPipes("a | b")).toBe(true);
  });
});

describe("parseMarkdownTable", () => {
  it("parses headers, alignments and rows", () => {
    expect(parseMarkdownTable("| a | b |\n| :- | -: |\n| 1 | 2 |")).toEqual({
      headers: ["a", "b"],
      alignments: ["left", "right"],
      rows: [["1", "2"]],
    });
  });

  it("pads a delimiter row that is narrower than the header", () => {
    // The user's case: three headers, one `| --- |` cell.
    expect(
      parseMarkdownTable("| Head 1 | Head 2 | Head 3 |\n| --- |"),
    ).toEqual({
      headers: ["Head 1", "Head 2", "Head 3"],
      alignments: ["left", "left", "left"],
      rows: [],
    });
  });

  it("pads short body rows instead of dropping the columns", () => {
    expect(parseMarkdownTable("| a | b |\n| --- | --- |\n| 1 |")?.rows).toEqual([
      ["1", ""],
    ]);
  });

  it("returns null when there is no delimiter row", () => {
    expect(parseMarkdownTable("| a | b |\n| 1 | 2 |")).toBeNull();
    expect(parseMarkdownTable("| a | b |")).toBeNull();
  });
});

describe("serializeMarkdownTable", () => {
  it("writes a GFM table", () => {
    expect(
      serializeMarkdownTable(["a", "b"], ["left", "right"], [["1", "2"]]),
    ).toBe("| a | b |\n| --- | ---: |\n| 1 | 2 |");
  });

  it("escapes a bare pipe in a cell so it cannot become a separator", () => {
    const markdown = serializeMarkdownTable(["a|b"], ["left"], [["c|d"]]);
    expect(markdown).toBe("| a\\|b |\n| --- |\n| c\\|d |");
    expect(parseMarkdownTable(markdown)?.headers).toEqual(["a\\|b"]);
  });

  it("leaves an already escaped pipe alone and escapes a code span's pipe too", () => {
    expect(escapeTableCell("a \\| b")).toBe("a \\| b");
    // GFM requires the escape even inside another inline span; the reader puts
    // the pipe back, so the cell still shows `a|b`.
    expect(escapeTableCell("`a|b`")).toBe("`a\\|b`");
    expect(escapeTableCell("a | b")).toBe("a \\| b");
  });

  it("pads the delimiter row to the header width", () => {
    expect(serializeMarkdownTable(["a", "b", "c"], ["left"], [])).toBe(
      "| a | b | c |\n| --- | --- | --- |",
    );
  });
});

describe("unescapeTableCell", () => {
  it("drops the escapes that only exist to protect a separator", () => {
    expect(unescapeTableCell("a \\| b")).toBe("a | b");
  });
});

describe("round trips", () => {
  const parseOrThrow = (markdown: string): ParsedTable => {
    const parsed = parseMarkdownTable(markdown);
    if (!parsed) throw new Error(`not a table: ${markdown}`);
    return parsed;
  };

  it("is stable for text that already escaped its pipes", () => {
    const source = "| a | b |\n| --- | --- |\n| x \\| y | `p\\|q` |";
    const parsed = parseOrThrow(source);
    const again = serializeMarkdownTable(
      parsed.headers,
      parsed.alignments,
      parsed.rows,
    );
    expect(again).toBe(source);
    expect(parseMarkdownTable(again)).toEqual(parsed);
  });

  it("repairs a cell whose pipe was left bare", () => {
    const parsed = parseOrThrow("| a | b |\n| --- | --- |\n| `p|q` | z |");
    // The code span is one cell, so `z` is the second cell — nothing is lost.
    expect(parsed.rows).toEqual([["`p|q`", "z"]]);
    expect(
      serializeMarkdownTable(parsed.headers, parsed.alignments, parsed.rows),
    ).toBe("| a | b |\n| --- | --- |\n| `p\\|q` | z |");
  });
});

describe("completedDelimiterRow", () => {
  it("pads a narrow delimiter row to the header width", () => {
    expect(completedDelimiterRow("| --- |", 3)).toBe("| --- | --- | --- |");
  });

  it("keeps the alignment each existing cell spelled", () => {
    // An explicit `:--` and a plain `---` are both left alignment, and left is
    // spelled `---` when written back.
    expect(completedDelimiterRow("| :-- | ---: |", 3)).toBe(
      "| --- | ---: | --- |",
    );
  });

  it("does nothing when the row already matches or is not a delimiter", () => {
    expect(completedDelimiterRow("| --- | --- |", 2)).toBeNull();
    expect(completedDelimiterRow("| abc |", 3)).toBeNull();
  });
});

describe("normalizeMarkdownTables", () => {
  it("pads a narrow delimiter row and short body rows", () => {
    const input = "| a | b |\n| --- |\n| 1 |";
    expect(normalizeMarkdownTables(input)).toBe(
      "| a | b |\n| --- | --- |\n| 1 |  |",
    );
    // The padding is real: the padded rows parse as two columns.
    expect(parseMarkdownTable(normalizeMarkdownTables(input))?.rows).toEqual([
      ["1", ""],
    ]);
  });

  it("leaves a well-formed table untouched", () => {
    const input = "| a | b |\n| --- | --- |\n| 1 | 2 |";
    expect(normalizeMarkdownTables(input)).toBe(input);
  });

  it("escapes a bare pipe inside a cell, including in a code span", () => {
    const input = "| a | b |\n| --- | --- |\n| `p|q` | z |";
    expect(normalizeMarkdownTables(input)).toBe(
      "| a | b |\n| --- | --- |\n| `p\\|q` | z |",
    );
  });

  it("ignores pipes inside fenced code", () => {
    const input = "```\n| a | b |\n| --- |\n```";
    expect(normalizeMarkdownTables(input)).toBe(input);
  });

  it("ignores a row of pipes that has no delimiter row under it", () => {
    const input = "| a | b |\n| 1 | 2 |";
    expect(normalizeMarkdownTables(input)).toBe(input);
  });

  it("does not touch a setext heading", () => {
    const input = "Title\n---\n\nText";
    expect(normalizeMarkdownTables(input)).toBe(input);
  });
});
