/**
 * The reveal predicate, focused ranges and accumulated construct spans
 * (F-15 Rev 2, plan Task 2.2).
 *
 * The reveal engine answers exactly one question — *is this construct's syntax
 * visible right now?* — and the artifact answers it in three steps that this
 * module keeps separate, because each has its own catalogue entry:
 *
 * 1. **Which ranges may reveal anything?** Only the focused editor's selection
 *    ranges; an unfocused pane has an empty list and reveals nothing
 *    (`OBS-1.14.4-REVEAL-002`).
 * 2. **What span is tested?** Not a single delimiter token: a construct's span
 *    is *accumulated* from its tokens, so `[text](url)` reveals as a unit, while
 *    a heading, a quote or an escape uses the **whole line**
 *    (`OBS-1.14.4-REVEAL-011`).
 * 3. **How is it tested?** Inclusively — `from <= span.to && to >= span.from` —
 *    so a zero-length caret anywhere inside the span reveals it, and a partial
 *    overlap from either side reveals it too (`OBS-1.14.4-REVEAL-001`).
 *
 * The predicate is deliberately *not* "the span contains the selection".
 */

import type { EditorSelection, Text } from "@codemirror/state";
import type { Span } from "./taxonomy";

// The module's whole surface is expressed in spans, so the span shape is
// re-exported here rather than making every caller import `taxonomy` too.
export type { Span };

/**
 * Constructs whose reveal span is the whole line rather than their tokens
 * (`OBS-1.14.4-REVEAL-011`): a caret anywhere on a heading line reveals its
 * marker, and the same is true for a quote marker and an escape sequence.
 */
export const WHOLE_LINE_CONSTRUCTS: readonly string[] = [
  "heading",
  "quote",
  "escape",
];

/** True for the constructs whose span is the whole line (`REVEAL-011`). */
export function isWholeLineConstruct(construct: string): boolean {
  return WHOLE_LINE_CONSTRUCTS.includes(construct);
}

/**
 * The inclusive touch predicate (`OBS-1.14.4-REVEAL-001`).
 *
 * A zero-length caret at either end of the span counts as inside it, and any
 * partial overlap counts as touching. This is the artifact's own comparison
 * order; swapping the operands would make an end-of-span caret stop revealing.
 */
export function touches(span: Span, from: number, to: number): boolean {
  return from <= span.to && to >= span.from;
}

/** True when any of `ranges` touches `span`. */
export function touchesAny(ranges: readonly Span[], span: Span): boolean {
  return ranges.some((range) => touches(span, range.from, range.to));
}

/**
 * The ranges that may reveal a construct (`OBS-1.14.4-REVEAL-002`).
 *
 * An unfocused editor contributes nothing, which is what keeps a note nobody is
 * editing rendered: opening a surface parks the caret at position 0, and
 * without this gate the first heading would greet the reader with a visible `#`.
 */
export function focusedRanges(
  selection: EditorSelection,
  focused: boolean,
): readonly Span[] {
  if (!focused) return [];
  return selection.ranges.map((range) => ({ from: range.from, to: range.to }));
}

/** Everything the predicate needs: whether the editor is focused, and where. */
export type RevealContext = {
  readonly focused: boolean;
  /** Empty unless the editor is focused (`REVEAL-002`). */
  readonly ranges: readonly Span[];
};

/** Build the reveal context for one editor state. */
export function revealContext(
  selection: EditorSelection,
  focused: boolean,
): RevealContext {
  return { focused, ranges: focusedRanges(selection, focused) };
}

/** True when `span` should show its raw syntax in this context. */
export function isRevealed(context: RevealContext, span: Span): boolean {
  return context.focused && touchesAny(context.ranges, span);
}

/**
 * The accumulated span of a construct's tokens (`OBS-1.14.4-REVEAL-011`).
 *
 * The builder accumulates a construct's span as it walks the syntax tree and
 * tests *that*, so a link — whose brackets, text and URL are distinct tokens —
 * reveals as a unit instead of token by token. `null` when there is nothing to
 * accumulate.
 */
export function accumulateSpan(tokens: readonly Span[]): Span | null {
  if (tokens.length === 0) return null;
  let from = Number.POSITIVE_INFINITY;
  let to = Number.NEGATIVE_INFINITY;
  for (const token of tokens) {
    if (token.from < from) from = token.from;
    if (token.to > to) to = token.to;
  }
  return { from, to };
}

/** The whole line containing `pos` (`REVEAL-011`). */
export function wholeLineSpan(doc: Text, pos: number): Span {
  const line = doc.lineAt(pos);
  return { from: line.from, to: line.to };
}

/**
 * The span to test for one construct: the whole line for the constructs
 * `REVEAL-011` names, the accumulated token span for everything else.
 *
 * `null` means "there is nothing to reveal here" — an empty token list for a
 * non-line construct.
 */
export function constructSpan(
  doc: Text,
  construct: string,
  tokens: readonly Span[],
): Span | null {
  if (isWholeLineConstruct(construct)) {
    const first = tokens[0];
    return wholeLineSpan(doc, first ? first.from : 0);
  }
  return accumulateSpan(tokens);
}

/**
 * The selection-based form of the predicate, kept for the decoration walk.
 *
 * Same comparison as {@link touches}; this overload exists because the walk
 * holds an `EditorSelection`, not a range list.
 */
export function selectionTouches(
  selection: EditorSelection,
  from: number,
  to: number,
): boolean {
  return selection.ranges.some((range) => touches({ from, to }, range.from, range.to));
}
