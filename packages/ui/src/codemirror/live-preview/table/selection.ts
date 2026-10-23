/**
 * Caret redirection for the rendered table (F-15 Task 3.3 Rev 2, plan Task C.1).
 *
 * `OBS-1.14.4-TABLE-007` is the promise that the table is **always rendered**:
 * there is no state in which the user is looking at `| Head 1 | --- |` because
 * the caret wandered onto it. A block replacement still has document positions
 * underneath it, though, and a caret can land there — an ArrowDown from the
 * paragraph above, an ArrowUp from the line below, a selection set by a test or
 * a future navigation command. When it does, the caret is redirected **into the
 * cell it was pointing at** instead of the table unfolding.
 *
 * ## Why this is a pure function
 *
 * The redirect is a document question, not a view question: "given this block's
 * source, this offset, and the direction the caret came from, which cell?" The
 * observer in `scan.ts` owns the timing and the DOM (focusing a nested editor
 * must not happen inside a CodeMirror update); this module owns only the answer,
 * so every branch — the position match, the delimiter-row fallback, the RTL
 * swap, the negatives — is testable without a view.
 *
 * ## Position match
 *
 * The caret's source offset is mapped to a line and then to a cell by
 * **character span**, using the same pipe rules as `splitTableRow` (an escaped
 * `\|` and a pipe inside a code span are content, not separators). A caret on
 * the delimiter row has no editable cell — it is not part of the grid — so it
 * falls through to the direction rule.
 *
 * ## Direction fallback
 *
 * With no position match, entering from above (`direction: "down"`) targets the
 * **first cell of the first row**; entering from below (`"up"`) targets the
 * **first cell of the last row**. "First" is a *logical* start here: under RTL
 * the first cell of a row is the rightmost one, so the fallback's column swaps
 * (`rtl`). That is readiness only — OmniDoc ships `en`/LTR and makes no RTL
 * locale claim (plan §4.8); the code is written so the later resolution is a
 * flag, not a rewrite.
 *
 * ## The decoded offset
 *
 * A cell editor holds **decoded** text (`\|` → `|`, a line-break tag → newline),
 * so the redirect reports the caret as a decoded offset inside the target cell —
 * `decodeCell(cellSource.slice(0, localOffset)).length` is exactly the prefix
 * the user saw. The caller clamps it against the editor's length when focusing.
 */

import { parseMarkdownTable } from "../../../markdown/table";
import { decodeCell, type TableCellRef } from "./model";

/** Which edge of the table the caret came from. */
export type CaretTravelDirection = "down" | "up";

/**
 * The cell a redirected caret belongs in.
 *
 * `offset` is a **decoded** offset inside that cell's editor (see the module
 * header); callers clamp it to the editor's current length.
 */
export type TableCaretTarget = TableCellRef & { readonly offset: number };

/** Everything the redirect needs to answer, and nothing from a view. */
export type TableCaretRedirectInput = {
  /** The rendered block's markdown source, exactly as the widget received it. */
  readonly source: string;
  /** The block's start offset in the document. */
  readonly from: number;
  /** The caret's **document** offset (absolute). */
  readonly caret: number;
  /** Direction of travel; defaults to `"down"` (e.g. a programmatic selection). */
  readonly direction?: CaretTravelDirection;
  /** RTL readiness: swap the direction fallback's column (see the header). */
  readonly rtl?: boolean;
};

/**
 * A cell's content span in one source line.
 *
 * `from` is the first content character and `to` is **one past** the last, so a
 * caret sits inside the cell when `from <= caret <= to` — the inclusive end is
 * what puts "just after the last character" in that cell rather than in the
 * padding before the next pipe.
 */
type CellSpan = { readonly from: number; readonly to: number };

/** Trim a line's whitespace from a span, the way `splitTableRow` trims a cell. */
function trimSpan(line: string, from: number, to: number): CellSpan {
  let start = from;
  let end = to;
  while (start < end && /\s/.test(line[start])) start += 1;
  while (end > start && /\s/.test(line[end - 1])) end -= 1;
  return { from: start, to: end };
}

/**
 * The content spans of one table row's cells.
 *
 * This deliberately mirrors `splitTableRow` in `markdown/table.ts` — the same
 * leading/trailing pipe rules, the same `\|` escape and the same backtick
 * tracking — but records **source offsets** instead of values. The two must not
 * drift: a cell boundary the parser honours but this misses would send the
 * caret to the wrong column, and the mirror is cheap to keep aligned because
 * the rules are only these three.
 */
function cellSpans(line: string): CellSpan[] {
  const contentFrom = line.length - line.trimStart().length;
  let contentTo = line.length - (line.length - line.trimEnd().length);

  let start = contentFrom;
  if (line[start] === "|") start += 1;
  // A trailing pipe is the row's closing pipe only when it is not escaped.
  if (contentTo > start && line[contentTo - 1] === "|" && line[contentTo - 2] !== "\\") {
    contentTo -= 1;
  }

  const spans: CellSpan[] = [];
  let cellFrom = start;
  let codeRun = 0;

  for (let index = start; index < contentTo; index += 1) {
    const char = line[index];

    if (char === "\\" && line[index + 1] === "|") {
      index += 1;
      continue;
    }

    if (char === "`") {
      let run = 1;
      while (line[index + run] === "`") run += 1;
      if (codeRun === 0) codeRun = run;
      else if (run === codeRun) codeRun = 0;
      index += run - 1;
      continue;
    }

    if (char === "|" && codeRun === 0) {
      spans.push(trimSpan(line, cellFrom, index));
      cellFrom = index + 1;
    }
  }

  spans.push(trimSpan(line, cellFrom, contentTo));
  return spans;
}

/** The cell a source caret position falls in, or the nearest one on a pipe. */
function nearestCell(spans: readonly CellSpan[], caret: number): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < spans.length; index += 1) {
    const span = spans[index];
    if (caret >= span.from && caret <= span.to) return index;
    const distance =
      caret < span.from ? span.from - caret : caret - span.to;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
}

/** The line containing a source offset, with the caret's offset inside it. */
function locateLine(
  source: string,
  offset: number,
): { lineIndex: number; column: number; line: string } {
  const lines = source.split("\n");
  let lineFrom = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    // `<=` puts a caret at the line's end on that line, not on the next one.
    if (offset <= lineFrom + line.length) {
      return { lineIndex: index, column: offset - lineFrom, line };
    }
    lineFrom += line.length + 1;
  }
  const last = lines.length - 1;
  return { lineIndex: last, column: lines[last].length, line: lines[last] };
}

/**
 * The target when the caret's position names no cell.
 *
 * The delimiter row is the only reachable such position in a rendered table
 * (the parser guarantees every line above and below it is a content row), so
 * the direction decides: down → the first row, up → the last row. Under RTL
 * "first" is the rightmost cell of that row.
 */
function fallbackTarget(
  direction: CaretTravelDirection,
  bodyRows: number,
  columns: number,
  rtl: boolean,
): TableCaretTarget {
  const row = direction === "up" && bodyRows > 0 ? bodyRows : 0;
  const col = rtl ? columns - 1 : 0;
  return { row, col, offset: 0 };
}

/**
 * Resolve a caret that landed in a rendered table's hidden range.
 *
 * Returns `null` when the source is not a table or the caret is outside the
 * block. Never touches the document: the caller focuses the returned cell.
 */
export function redirectTableCaret({
  source,
  from,
  caret,
  direction = "down",
  rtl = false,
}: TableCaretRedirectInput): TableCaretTarget | null {
  const parsed = parseMarkdownTable(source);
  if (!parsed) return null;
  if (caret < from || caret > from + source.length) return null;

  const columns = Math.max(parsed.headers.length, 1);
  const bodyRows = parsed.rows.length;
  const local = Math.min(Math.max(caret - from, 0), source.length);
  const { lineIndex, column, line } = locateLine(source, local);

  // The delimiter row (`| --- |`) is table syntax, not content: no cell exists
  // for it, so the caret has to go to the row it entered from.
  if (lineIndex === 1) return fallbackTarget(direction, bodyRows, columns, rtl);

  const row = lineIndex === 0 ? 0 : Math.min(lineIndex - 1, bodyRows);
  const spans = cellSpans(line);
  // A row may carry more cells than the header; the grid only renders `columns`,
  // and a caret in the overflow belongs at the table's last column.
  const col = Math.min(nearestCell(spans, column), columns - 1);

  const span = spans[col] ?? { from: column, to: column };
  const sourceEnd = Math.min(Math.max(column, span.from), span.to);
  return {
    row,
    col,
    offset: decodeCell(line.slice(span.from, sourceEnd)).length,
  };
}
