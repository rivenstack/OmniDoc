/**
 * The table's cell codec and its pure structural model
 * (F-15 Task 3.3 Rev 2 — table rebuild, plan Task A.1).
 *
 * ## Two spellings of every cell
 *
 * A cell exists in two forms, and this module is the only place that converts
 * between them:
 *
 * - **encoded source** — what the document holds: a literal pipe is `\|` and a
 *   line break is `<br>`. The model stores this (`TableModel`), and it is what
 *   `markdown/table.ts` parses and serializes.
 * - **decoded text** — what the user edits: `\|` is `|` and `<br>` is a newline.
 *   Every cell editor's document (`editor.ts`) is decoded text.
 *
 * `markdown/table.ts` is the shared parser/serializer (the reading view and the
 * ProseMirror bridge use it too) and is **not** touched here: the model wraps it
 * — `tableModelFromMarkdown` / `markdownFromModel`. Decoding reuses that module's
 * `unescapeTableCell` so the two readers of `\|` cannot drift apart.
 *
 * ## The one recorded asymmetry
 *
 * A user who types a literal `<br>` into a cell gets a newline back the next time
 * the cell mounts, because `<br>` is also the encoded spelling of a newline and
 * the document cannot tell the two apart. That is recorded and tested, not
 * "fixed": the document is the source of truth.
 *
 * ## What lives here
 *
 * The codec, the model type, and **every** structural operation — add / delete /
 * move / duplicate for rows and columns, alignment, sorting, the header push and
 * clearing cells. They are pure functions over `TableModel`, so the command layer
 * (`structure.ts`) and the menus can compose them without touching an editor, and
 * the plan's guards (one-column minimum, header immovable, alignment follows its
 * column) are asserted as plain unit tests.
 *
 * Catalogue: `OBS-1.14.4-TABLE-001` (one editor per cell holding **decoded** cell
 * text).
 */

import {
  parseMarkdownTable,
  serializeMarkdownTable,
  type ParsedTable,
  type TableAlignment,
} from "../../../markdown/table";
import { unescapeTableCell } from "../../../markdown/table";

export type { TableAlignment };

/** A cell addressed by its visual row (`0` = the header row) and column. */
export type TableCellRef = { readonly row: number; readonly col: number };

/** Sort direction for `sortRows`. */
export type SortDirection = "asc" | "desc";

/**
 * A table's cells, in **encoded source** form.
 *
 * `headers` and every `rows[i]` are padded to the same length (the parser
 * guarantees it), so a column index is always valid.
 */
export type TableModel = {
  headers: string[];
  alignments: TableAlignment[];
  rows: string[][];
};

/** The encoded spelling of a line break inside a cell. */
const ENCODED_LINE_BREAK = "<br>";

/** Any line-break tag a cell can carry, however it was spelled. */
const LINE_BREAK_TAG = /<br\s*\/?>/gi;

/** A bare pipe — one that is not already escaped. */
const BARE_PIPE = /\|/g;

/** Any newline, in either the LF or the CRLF spelling. */
const NEWLINE = /\r\n|\r|\n/g;

// ----------------------------------------------------------------------- codec

/**
 * Turn a cell's encoded source into the text its editor holds.
 *
 * `\|` becomes `|` and a line-break tag becomes a newline; everything else —
 * including a pipe that was already inside a code span — is left alone. A pipe
 * inside a code span is content to GFM, so `MARK-001`'s rule ("a bare pipe is
 * escaped on write") never leaves one behind in a fresh document, but a note
 * written by another tool can still carry one and it must read as typed.
 */
export function decodeCell(source: string): string {
  return unescapeTableCell(source).replace(LINE_BREAK_TAG, "\n");
}

/**
 * Turn a cell's editor text into the document's encoded spelling.
 *
 * Every pipe is escaped — code spans included, which is what GFM requires — and
 * every newline becomes `ENCODED_LINE_BREAK`. Whitespace is **not** trimmed here;
 * the shared serializer (`markdown/table.ts`) trims at the document boundary, and
 * keeping the codec character-preserving makes it directly testable.
 */
export function encodeCell(text: string): string {
  return text.replace(BARE_PIPE, "\\|").replace(NEWLINE, ENCODED_LINE_BREAK);
}

// ------------------------------------------------------------- model ↔ markdown

/** Wrap a parsed table in the model, copying so the caller's value is untouched. */
export function tableModelFromParsed(parsed: ParsedTable): TableModel {
  return {
    headers: [...parsed.headers],
    alignments: [...parsed.alignments],
    rows: parsed.rows.map((row) => [...row]),
  };
}

/** Parse a table block into the model, or `null` when it is not a table. */
export function tableModelFromMarkdown(markdown: string): TableModel | null {
  const parsed = parseMarkdownTable(markdown);
  return parsed ? tableModelFromParsed(parsed) : null;
}

/** Serialize the model back to GFM markdown (the exact text the document gets). */
export function markdownFromModel(model: TableModel): string {
  return serializeMarkdownTable(model.headers, model.alignments, model.rows);
}

// ------------------------------------------------------------------ accessors

/** The column count — the header's width, never less than one. */
export function columnCount(model: TableModel): number {
  return Math.max(model.headers.length, 1);
}

/** The number of **body** rows (the header row is not counted). */
export function bodyRowCount(model: TableModel): number {
  return model.rows.length;
}

/** One cell's encoded source, or `""` when the address is outside the table. */
export function cellSource(model: TableModel, ref: TableCellRef): string {
  const { row, col } = ref;
  if (col < 0 || col >= columnCount(model)) return "";
  if (row === 0) return model.headers[col] ?? "";
  const body = model.rows[row - 1];
  return body?.[col] ?? "";
}

/** One cell's decoded text — what its editor holds. */
export function cellText(model: TableModel, ref: TableCellRef): string {
  return decodeCell(cellSource(model, ref));
}

/** A body-row array of empty cells. */
export function emptyRow(columns: number): string[] {
  return Array.from({ length: columns }, () => "");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function cloneRows(rows: string[][]): string[][] {
  return rows.map((row) => [...row]);
}

function normalizeRow(row: string[], columns: number): string[] {
  return Array.from({ length: columns }, (_, index) => row[index] ?? "");
}

/** A copy of the model with `value` written at `ref`. Address-checked. */
export function setCellText(
  model: TableModel,
  ref: TableCellRef,
  text: string,
): TableModel {
  const { row, col } = ref;
  if (col < 0 || col >= columnCount(model)) return model;
  const value = encodeCell(text);

  if (row === 0) {
    if (col >= model.headers.length) return model;
    const headers = [...model.headers];
    headers[col] = value;
    return { ...model, headers };
  }

  const index = row - 1;
  if (index < 0 || index >= model.rows.length) return model;
  const rows = cloneRows(model.rows);
  rows[index][col] = value;
  return { ...model, rows };
}

/** A copy of the model with every addressed cell emptied. */
export function clearCells(
  model: TableModel,
  refs: readonly TableCellRef[],
): TableModel {
  if (refs.length === 0) return model;
  const columns = columnCount(model);
  const headers = [...model.headers];
  const rows = cloneRows(model.rows);

  for (const { row, col } of refs) {
    if (col < 0 || col >= columns) continue;
    if (row === 0) {
      if (col < headers.length) headers[col] = "";
      continue;
    }
    const index = row - 1;
    if (index < 0 || index >= rows.length) continue;
    rows[index][col] = "";
  }

  return { headers, alignments: [...model.alignments], rows };
}

// ----------------------------------------------------------------- row ops

/**
 * Insert an empty body row before body index `index` (clamped to the ends).
 *
 * The header row is not addressable here, which is what makes "the header cannot
 * be inserted above, moved or deleted" true by construction rather than by a
 * runtime guard.
 */
export function insertRow(model: TableModel, index: number): TableModel {
  const at = clamp(index, 0, model.rows.length);
  const rows = cloneRows(model.rows);
  rows.splice(at, 0, emptyRow(columnCount(model)));
  return { ...model, rows };
}

/** Delete body row `index`; out-of-range and empty tables are left alone. */
export function deleteRow(model: TableModel, index: number): TableModel {
  if (index < 0 || index >= model.rows.length) return model;
  const rows = cloneRows(model.rows);
  rows.splice(index, 1);
  return { ...model, rows };
}

/** Move body row `from` to its final position `to`. */
export function moveRow(
  model: TableModel,
  from: number,
  to: number,
): TableModel {
  const last = model.rows.length - 1;
  if (from < 0 || from > last || to < 0 || to > last || from === to) {
    return model;
  }
  const rows = cloneRows(model.rows);
  const [row] = rows.splice(from, 1);
  rows.splice(to, 0, row);
  return { ...model, rows };
}

/** Copy body row `index` into a new row directly below it. */
export function duplicateRow(model: TableModel, index: number): TableModel {
  if (index < 0 || index >= model.rows.length) return model;
  const rows = cloneRows(model.rows);
  rows.splice(index + 1, 0, [...rows[index]]);
  return { ...model, rows };
}

// -------------------------------------------------------------- column ops

/** Insert an empty column before column `index` (clamped to the ends). */
export function insertColumn(model: TableModel, index: number): TableModel {
  const columns = columnCount(model);
  const at = clamp(index, 0, columns);

  const headers = [...model.headers];
  headers.splice(at, 0, "");
  const alignments = [...model.alignments];
  alignments.splice(at, 0, "left");
  const rows = model.rows.map((row) => {
    const next = [...row];
    next.splice(at, 0, "");
    return next;
  });

  return { headers, alignments, rows };
}

/**
 * Delete column `index`.
 *
 * **Refused when it is the last column**: a table with no columns is not
 * representable in GFM (the delimiter row would be empty), so the guard lives
 * here rather than in the menu that offers the command.
 */
export function deleteColumn(model: TableModel, index: number): TableModel {
  const columns = columnCount(model);
  if (columns <= 1) return model;
  if (index < 0 || index >= columns) return model;

  const headers = [...model.headers];
  headers.splice(index, 1);
  const alignments = [...model.alignments];
  alignments.splice(index, 1);
  const rows = model.rows.map((row) => {
    const next = [...row];
    next.splice(index, 1);
    return next;
  });

  return { headers, alignments, rows };
}

/**
 * Move column `from` to its final position `to`.
 *
 * The alignment travels with the column — it is a property of the column, not of
 * its position — so moving a right-aligned column keeps it right-aligned.
 */
export function moveColumn(
  model: TableModel,
  from: number,
  to: number,
): TableModel {
  const columns = columnCount(model);
  if (from < 0 || from >= columns || to < 0 || to >= columns || from === to) {
    return model;
  }

  const headers = [...model.headers];
  const [header] = headers.splice(from, 1);
  headers.splice(to, 0, header);

  const alignments = [...model.alignments];
  const [alignment] = alignments.splice(from, 1);
  alignments.splice(to, 0, alignment);

  const rows = model.rows.map((row) => {
    const next = [...row];
    const [cell] = next.splice(from, 1);
    next.splice(to, 0, cell);
    return next;
  });

  return { headers, alignments, rows };
}

/** Copy column `index` into a new column directly to its right. */
export function duplicateColumn(model: TableModel, index: number): TableModel {
  const columns = columnCount(model);
  if (index < 0 || index >= columns) return model;

  const at = index + 1;
  const headers = [...model.headers];
  headers.splice(at, 0, headers[index] ?? "");
  const alignments = [...model.alignments];
  alignments.splice(at, 0, alignments[index] ?? "left");
  const rows = model.rows.map((row) => {
    const next = [...row];
    next.splice(at, 0, next[index] ?? "");
    return next;
  });

  return { headers, alignments, rows };
}

/** Set one column's alignment. */
export function setColumnAlignment(
  model: TableModel,
  index: number,
  alignment: TableAlignment,
): TableModel {
  if (index < 0 || index >= columnCount(model)) return model;
  const alignments = [...model.alignments];
  alignments[index] = alignment;
  return { ...model, alignments };
}

// ---------------------------------------------------------------- header push

/**
 * The Shift-Tab-at-(0,0) header push (plan J-1).
 *
 * The current header **content** becomes a new first body row, the existing body
 * rows follow it, and the header row is left empty. Columns, alignments and
 * column count are untouched — only the row band moves down.
 */
export function pushHeaderDown(model: TableModel): TableModel {
  const columns = columnCount(model);
  const rows = cloneRows(model.rows);
  rows.unshift(normalizeRow([...model.headers], columns));
  return {
    headers: Array.from({ length: columns }, () => ""),
    alignments: [...model.alignments],
    rows,
  };
}

// -------------------------------------------------------------------- sorting

/**
 * Compare two decoded cell values.
 *
 * Case-insensitive and digit-aware (`item 2` before `item 10`), with empty cells
 * sorting **after** everything else. The comparator is ascending only; the
 * caller mirrors it for descending.
 */
export function compareCellValues(left: string, right: string): number {
  const leftEmpty = left === "";
  const rightEmpty = right === "";
  if (leftEmpty || rightEmpty) {
    if (leftEmpty && rightEmpty) return 0;
    return leftEmpty ? 1 : -1;
  }
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * Sort the **body** rows by one column (plan J-2, §4.6).
 *
 * The header row is part of the model, not a row, so it can never move. The sort
 * is stable, so rows that compare equal keep their document order. Empty cells
 * are last when ascending; descending mirrors the comparator exactly, which puts
 * them first.
 */
export function sortRows(
  model: TableModel,
  column: number,
  direction: SortDirection,
): TableModel {
  if (column < 0 || column >= columnCount(model)) return model;
  const rows = cloneRows(model.rows).sort((a, b) => {
    const comparison = compareCellValues(
      decodeCell(a[column] ?? ""),
      decodeCell(b[column] ?? ""),
    );
    return direction === "asc" ? comparison : -comparison;
  });
  return { ...model, rows };
}
