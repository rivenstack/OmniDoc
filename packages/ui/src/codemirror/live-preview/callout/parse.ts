/**
 * Callout parsing (F-15 Rev 2, plan Task 3.2).
 *
 * The GFM grammar models a callout as nothing but a **blockquote**: `> [!note]`
 * is a `QuoteMark`, a paragraph, and the literal text `[!note]`. Everything that
 * makes it a callout is the artifact's own text layer, reproduced here:
 *
 * - the marker pattern (`OBS-1.14.4-CALLOUT-003`, `foldRegex`),
 * - type normalisation (`-007`),
 * - the default title derivation (`-002`),
 * - the block range: starts at the marker line and extends while consecutive
 *   quote lines continue (`-004`),
 * - and the nesting rule: the marker is only detected on the **first line of the
 *   innermost quote**, so a doubly-quoted marker yields an outer plain quote
 *   containing a nested callout (`-010`).
 *
 * A plain blockquote (`> Ordinary quote`) matches none of this and stays a
 * blockquote.
 */

import type { Text } from "@codemirror/state";

/** The fold marker's three values (`OBS-1.14.4-CALLOUT-003`). */
export type CalloutFold = "" | "+" | "-";

/**
 * The marker pattern, verbatim (`OBS-1.14.4-CALLOUT-003`, `foldRegex`).
 *
 * `[!type]`, then an optional `+` or `-`, then whitespace or end of line. The
 * whitespace requirement is what keeps `[!note]suffix` from being a marker with
 * a fold of nothing. (The entry escapes the hyphen inside the class; a trailing
 * `-` is already literal there, so the escape is dropped to satisfy
 * `no-useless-escape` — the pattern is unchanged.)
 */
export const CALLOUT_MARKER_PATTERN = /^\[!([^\]]+)\]([+-]?)(?:\s|$)/;

/** A `>`-prefix run at the start of a line (`> `, `>>`, `> > `, with indentation). */
const QUOTE_PREFIX_PATTERN = /^(?:[ \t]*>[ \t]*)+/;

/** One callout the scanner found. */
export type Callout = {
  /** The whole block: marker line start → last quote line end. */
  readonly from: number;
  readonly to: number;
  /** How many `>` markers the marker line carries (1-based). */
  readonly depth: number;
  /** The line the marker sits on. */
  readonly markerLine: { readonly from: number; readonly to: number };
  /** The type text between `[!` and `]`, exactly as written (`-007`). */
  readonly rawType: string;
  /** The normalised type id (`-007`). */
  readonly type: string;
  /** `+`, `-`, or the empty string (`-003`). */
  readonly fold: CalloutFold;
  /** The literal text after the marker on the marker line, trimmed. */
  readonly titleText: string;
  /** Absolute range of the raw type text — what the type menu rewrites (`-005`). */
  readonly typeFrom: number;
  readonly typeTo: number;
  /**
   * Absolute range of the **whole** `[!type]` marker.
   *
   * The grammar reads `[!note]` as a shortcut reference link, exactly as it does
   * `[^name]`, so the decoration walk claims this range to stop the link rules
   * folding the brackets (`REVEAL-008`'s construct sets do not include the marker).
   */
  readonly markerFrom: number;
  readonly markerTo: number;
};

/**
 * Normalise a callout type id (`OBS-1.14.4-CALLOUT-007`).
 *
 * `trim()`, lower-case, then each **run** of whitespace becomes one hyphen.
 * Hyphens and underscores are preserved (not collapsed) — a `my--type` stays as
 * written.
 */
export function normalizeCalloutType(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

/**
 * The synthetic title for a callout with no title text
 * (`OBS-1.14.4-CALLOUT-002`).
 *
 * Hyphens become spaces, the whole string is lower-cased, and only the first
 * character is upper-cased: `tldr → Tldr`, `my-type → My type`, `MY-TYPE → My
 * type`. Underscores are untouched.
 */
export function defaultCalloutTitle(type: string): string {
  const spaced = type.trim().replace(/-/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** The `>`-prefix run at the start of `text` (possibly empty). */
export function quotePrefix(text: string): string {
  return QUOTE_PREFIX_PATTERN.exec(text)?.[0] ?? "";
}

/** How many `>` markers the line's prefix carries. */
export function quoteDepth(text: string): number {
  return (quotePrefix(text).match(/>/g) ?? []).length;
}

/** True when the line is a blockquote line (carries at least one `>`). */
export function isQuoteLine(text: string): boolean {
  return quotePrefix(text).length > 0;
}

/** The line's text with its `>`-prefix run removed. */
export function stripQuotePrefix(text: string): string {
  return text.slice(quotePrefix(text).length);
}

/**
 * Remove the first `depth` quote markers (and their following whitespace) from a
 * line, which is what "un-quote the body" means for a nested callout (`-005`).
 */
export function stripQuoteDepth(text: string, depth: number): string {
  let rest = text;
  for (let level = 0; level < depth; level += 1) {
    const match = /^[ \t]*>[ \t]?/.exec(rest);
    if (!match) break;
    rest = rest.slice(match[0].length);
  }
  return rest;
}

/**
 * Parse one line's marker, or `null`.
 *
 * `lineText` is the whole line; the prefix is stripped first. Returns the raw and
 * normalised type, the fold marker, the title text, and the absolute range of the
 * raw type text.
 */
export function parseCalloutMarker(
  lineText: string,
  lineFrom: number,
): Pick<
  Callout,
  "rawType" | "type" | "fold" | "titleText" | "typeFrom" | "typeTo" | "markerFrom" | "markerTo"
> | null {
  const prefixLength = quotePrefix(lineText).length;
  if (prefixLength === 0) return null;
  const content = lineText.slice(prefixLength);
  const match = CALLOUT_MARKER_PATTERN.exec(content);
  if (!match) return null;

  const rawType = match[1] ?? "";
  const fold = (match[2] ?? "") as CalloutFold;
  const titleText = content.slice(match[0].length).trim();
  const typeFrom = lineFrom + prefixLength + 2;
  return {
    rawType,
    type: normalizeCalloutType(rawType),
    fold,
    titleText,
    typeFrom,
    typeTo: typeFrom + rawType.length,
    markerFrom: typeFrom - 2,
    markerTo: typeFrom + rawType.length + 1,
  };
}

/**
 * Every callout in `doc`, nested ones included.
 *
 * Nested callouts are returned because the renderer draws them recursively; the
 * decoration layer filters to the outermost ones, since two overlapping replace
 * decorations are not allowed.
 */
export function scanCallouts(doc: Text): Callout[] {
  const callouts: Callout[] = [];

  for (let number = 1; number <= doc.lines; number += 1) {
    const line = doc.line(number);
    const marker = parseCalloutMarker(line.text, line.from);
    if (!marker) continue;

    const depth = quoteDepth(line.text);

    // `OBS-1.14.4-CALLOUT-010`: the marker is only detected on the **first** line
    // of the innermost quote. A marker under a quote at the same or greater depth
    // is a second line of that quote, not a new callout.
    if (number > 1 && quoteDepth(doc.line(number - 1).text) >= depth) continue;

    // `OBS-1.14.4-CALLOUT-004`: the range extends while consecutive quote lines
    // continue. A blank or non-quoted line ends it.
    let last = number;
    while (last < doc.lines && isQuoteLine(doc.line(last + 1).text)) last += 1;

    callouts.push({
      from: line.from,
      to: doc.line(last).to,
      depth,
      markerLine: { from: line.from, to: line.to },
      ...marker,
    });
  }

  return callouts;
}

/**
 * The callouts that are not contained in another callout.
 *
 * Only these may become widgets: a nested callout lives *inside* its parent's
 * replaced range, so the parent's renderer draws it — two overlapping block
 * replaces would be a CodeMirror error.
 */
export function outermostCallouts(callouts: readonly Callout[]): Callout[] {
  return callouts.filter(
    (candidate) =>
      !callouts.some(
        (other) =>
          other !== candidate && other.from <= candidate.from && candidate.to <= other.to,
      ),
  );
}

/** The rendered title: the marker line's own text, else the type-derived one. */
export function calloutTitle(callout: Callout): string {
  return callout.titleText.length > 0
    ? callout.titleText
    : defaultCalloutTitle(callout.type);
}
