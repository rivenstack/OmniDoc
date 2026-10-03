/**
 * GFM table text handling, shared by the Markdown-mode live preview and the
 * ProseMirror ↔ Markdown bridge.
 *
 * ## Why this is not just `line.split("|")`
 *
 * A table cell is markdown source, so a literal `|` inside it has to survive the
 * round trip. Two spellings do that in GFM:
 *
 * - **escaped**: `a \| b` — the backslash is part of the source and comes back
 *   unchanged;
 * - **inside a code span**: `` `a|b` `` — GFM is lenient here and most editors
 *   (Obsidian included) treat a pipe inside backticks as content, not as a cell
 *   boundary.
 *
 * A naive split breaks both: it turns one cell into two, and re-serializing
 * then writes a table with more cells than columns — losing the tail of the row
 * the moment the note is saved and reloaded. This module keeps a cell's source
 * verbatim (escapes included) and escapes any *bare* pipe it saw untracked, so
 * `parse → serialize` is lossless.
 *
 * ## Lenient rows, strict delimiters
 *
 * The delimiter row is the only thing that decides whether a block of pipes is a
 * table, so it is matched strictly (only `-`, `:` and cell separators). The
 * header and body rows are *not* required to match its column count: a table
 * whose delimiter row is shorter than its header is padded to the header's
 * width, which is what lets `| Head 1 | Head 2 | Head 3 |` + `| --- |` render as
 * a three-column table while the user is still typing it.
 */

/** Per-column alignment, as spelled by the delimiter row. */
export type TableAlignment = "left" | "center" | "right";

/** A table's parsed cells, in source form (`\|` still escaped). */
export type ParsedTable = {
  headers: string[];
  alignments: TableAlignment[];
  rows: string[][];
};

/** A line made only of pipes, dashes, colons and whitespace. */
const DELIMITER_SHAPE = /^\|?[\s:|-]*\|?$/;

/** One delimiter cell: `---`, `:--`, `--:`, `:-:`. */
const DELIMITER_CELL = /^:?-+:?$/;

/** A fence line, with an optional info string. */
const FENCE_LINE = /^\s*(`{3,}|~{3,})/;

/**
 * The fence character a line opens/closes (`` ` `` or `~`), or `null` when the
 * line is not a code fence.
 */
export function fenceMarker(line: string): string | null {
  const match = FENCE_LINE.exec(line);
  return match ? match[1][0] : null;
}

/**
 * True when a line's outer pipes are balanced — it either has none, or it both
 * opens and closes with one.
 *
 * This is what stops a half-typed delimiter row from being read as a finished
 * one: `| --- ` is a row the user is still writing, `| --- |` is a row they have
 * closed. Without it the table would convert (and pull the caret out of the
 * line) after the first column of a multi-column delimiter row.
 */
export function hasBalancedPipes(line: string): boolean {
  const text = line.trim();
  if (!text.startsWith("|")) {
    return true;
  }
  return text.endsWith("|");
}

/**
 * Split a table row into its cells, keeping each cell's source verbatim.
 *
 * Splits on `|` that are neither escaped (`\|`) nor inside a code span, then
 * trims only the padding the author used around the cell separators.
 */
export function splitTableRow(line: string): string[] {
  let content = line.trim();
  if (content.startsWith("|")) content = content.slice(1);
  // A trailing `|` is only the row's closing pipe when it is not escaped.
  if (content.endsWith("|") && !content.endsWith("\\|")) {
    content = content.slice(0, -1);
  }

  const cells: string[] = [];
  let current = "";
  let codeFence = 0; // run length of the backticks currently open, 0 = outside

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];

    if (char === "\\" && content[i + 1] === "|") {
      // Keep the escape: it is part of the cell's source.
      current += "\\|";
      i += 1;
      continue;
    }

    if (char === "`") {
      let run = 1;
      while (content[i + run] === "`") run += 1;
      if (codeFence === 0) {
        codeFence = run;
      } else if (run === codeFence) {
        codeFence = 0;
      }
      current += "`".repeat(run);
      i += run - 1;
      continue;
    }

    if (char === "|" && codeFence === 0) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

/** True when `line` is a table's delimiter row (the `| --- |` line). */
export function isTableDelimiterRow(line: string): boolean {
  const text = line.trim();
  if (!text.includes("|") || !text.includes("-")) {
    return false;
  }
  if (!DELIMITER_SHAPE.test(text)) {
    return false;
  }
  const cells = splitTableRow(text);
  if (cells.length === 0) {
    return false;
  }
  return cells.every((cell) => DELIMITER_CELL.test(cell.replace(/\s+/g, "")));
}

/** The alignment a delimiter cell spells, defaulting to left. */
function alignmentOf(cell: string): TableAlignment {
  const text = cell.replace(/\s+/g, "");
  const left = text.startsWith(":");
  const right = text.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  return "left";
}

/**
 * Parse a GFM table block.
 *
 * Returns `null` when the block is not a table (no header pipe, or no delimiter
 * row). Rows are padded to the header's width and extra cells are kept, so a
 * hand-written row with one cell too many does not silently lose its tail.
 */
export function parseMarkdownTable(text: string): ParsedTable | null {
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  if (lines.length < 2) return null;
  if (!lines[0].includes("|")) return null;
  if (!isTableDelimiterRow(lines[1])) return null;

  const rawHeaders = splitTableRow(lines[0]);
  const columns = Math.max(rawHeaders.length, 1, splitTableRow(lines[1]).length);
  const rawAlignments = splitTableRow(lines[1]).map(alignmentOf);

  const headers = Array.from({ length: columns }, (_, i) => rawHeaders[i] ?? "");
  const alignments = Array.from(
    { length: columns },
    (_, i) => rawAlignments[i] ?? "left",
  );
  const rows = lines.slice(2).map((line) => {
    const cells = splitTableRow(line);
    return Array.from({ length: columns }, (_, i) => cells[i] ?? "");
  });

  return { headers, alignments, rows };
}

/**
 * Escape a cell's source so a bare `|` cannot be read as a cell boundary.
 *
 * Pipes are escaped **everywhere** in the cell, code spans included. GFM
 * requires that (`a table cell's content cannot contain an unescaped pipe, even
 * inside another inline span`), and the readers this note passes through agree:
 * the editor's own row splitter honours `\|`, and `tiptap-markdown`'s table rule
 * splits on it too. Leaving a pipe inside a code span bare would look right in
 * the editor and silently break the row the first time the note is saved and
 * reloaded — the tail of the row becomes extra cells.
 *
 * The escape is display-only: `unescapeTableCell` puts the pipe back for
 * rendering, so the reader sees `` `a|b` ``, not `` `a\|b` ``.
 *
 * Idempotent: an already-escaped `\|` is left alone.
 */
export function escapeTableCell(source: string): string {
  return source.replace(/(^|[^\\])\|/g, "$1\\|").trim();
}

/** The delimiter cell spelling for an alignment. */
export function delimiterFor(alignment: TableAlignment): string {
  if (alignment === "center") return ":---:";
  if (alignment === "right") return "---:";
  return "---";
}

/**
 * The row a table's delimiter line should be, when the line the user wrote is a
 * valid delimiter row but is still narrower than the header above it.
 *
 * This is the one-place fix for the "finish the delimiter row for me" step:
 * `| Head 1 | Head 2 | Head 3 |` + `| --- |` is a complete table to a reader, and
 * padding the row is what makes it one to GFM as well. Returns `null` when the
 * line is not a delimiter row, or when it already has at least `columns` cells —
 * callers use that `null` to mean "nothing to do".
 */
export function completedDelimiterRow(
  line: string,
  columns: number,
): string | null {
  if (!isTableDelimiterRow(line)) return null;
  const cells = splitTableRow(line);
  if (cells.length >= columns) return null;
  const alignments = cells.map(alignmentOf);
  return serializeRow(
    Array.from(
      { length: columns },
      (_, i) => delimiterFor(alignments[i] ?? "left"),
    ),
    columns,
  );
}

/** Serialize a row of cell sources, padding/trimming to `columns`. */
function serializeRow(cells: string[], columns: number): string {
  const padded = Array.from({ length: columns }, (_, i) =>
    escapeTableCell(cells[i] ?? ""),
  );
  return `| ${padded.join(" | ")} |`;
}

/** Serialize a parsed table back to GFM markdown. */
export function serializeMarkdownTable(
  headers: string[],
  alignments: TableAlignment[],
  rows: string[][],
): string {
  const columns = Math.max(headers.length, 1);
  const delimiter = Array.from({ length: columns }, (_, i) =>
    delimiterFor(alignments[i] ?? "left"),
  );
  return [
    serializeRow(headers, columns),
    serializeRow(delimiter, columns),
    ...rows.map((row) => serializeRow(row, columns)),
  ].join("\n");
}

/**
 * Pad every table in a markdown document so its delimiter row (and its body
 * rows) match its header's column count.
 *
 * The editor's live preview renders a table with a short delimiter row as
 * heading + auto-padded columns, but the stored markdown is what the
 * ProseMirror bridge reads back. `tiptap-markdown` follows GFM strictly: a
 * delimiter row with fewer cells than the header is *not* a table, it is a
 * paragraph — so a note saved with `| --- |` under a three-column header would
 * come back as plain text. Normalizing at the bridge boundary keeps the two
 * readers agreeing without touching the source the user is typing in.
 *
 * Lines inside fenced code blocks are left alone.
 */
export function normalizeMarkdownTables(markdown: string): string {
  if (!markdown.includes("|")) {
    return markdown;
  }

  const lines = markdown.split("\n");
  let fence: string | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const marker = fenceMarker(lines[i]);
    if (marker) {
      // A closing fence repeats the opening marker's character; a different
      // character opens a new block rather than closing this one.
      if (fence === null) {
        fence = marker;
      } else if (marker === fence) {
        fence = null;
      }
      continue;
    }
    if (fence !== null) {
      continue;
    }

    const header = lines[i - 1];
    if (i === 0 || !header.includes("|") || !hasBalancedPipes(header)) {
      continue;
    }
    if (!isTableDelimiterRow(lines[i]) || !hasBalancedPipes(lines[i])) {
      continue;
    }

    const columns = Math.max(splitTableRow(header).length, 1);
    // Re-emit every row through the serializer: it is what pads a short row and
    // what escapes a bare pipe in a cell, including one inside a code span.
    lines[i - 1] = serializeRow(splitTableRow(header), columns);
    lines[i] =
      completedDelimiterRow(lines[i], columns) ??
      serializeRow(splitTableRow(lines[i]), columns);

    let row = i + 1;
    while (row < lines.length && lines[row].includes("|")) {
      lines[row] = serializeRow(splitTableRow(lines[row]), columns);
      row += 1;
    }
    i = row - 1;
  }

  return lines.join("\n");
}

/**
 * Turn a cell's source into the text a reader should see: the escapes that only
 * exist to keep a pipe out of the cell separator are dropped.
 */
export function unescapeTableCell(source: string): string {
  return source.replace(/\\\|/g, "|");
}
