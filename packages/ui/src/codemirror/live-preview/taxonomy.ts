/**
 * Construct taxonomy and region classification (F-15 Rev 2, plan Task 2.1).
 *
 * One vocabulary for the whole reveal engine. Two jobs, one module:
 *
 * 1. **Construct kinds.** The catalogue groups constructs into exactly two sets
 *    (`OBS-1.14.4-REVEAL-008`): five *inline formatting* kinds whose delimiters
 *    hide while their text stays, and six *link-like* kinds that render as a
 *    link and take part in hover/activation. Naming them once stops each task
 *    from inventing its own spelling.
 * 2. **Regions.** A construct may only be recognised in prose. The parser's own
 *    nodes mark the two places where a scanner must not look: inside a table
 *    (its source becomes one block widget — `OBS-1.14.4-TABLE-001`) and inside
 *    verbatim code (`FencedCode` / `InlineCode`). Link-like spans are a third
 *    exclusion, because the artifact skips `%%` inside a link *href* and `#tag`
 *    inside a link (`OBS-1.14.4-COMMENT-002`, `OBS-1.14.4-TAG-001`).
 *
 * ## Why a scanner needs this
 *
 * Several constructs the catalogue specifies are **not modelled by the Lezer
 * grammar** — `==highlight==`, `%%comment%%`, `#tag` produce no syntax node at
 * all (verified against the parser; see `taxonomy.test.ts`). Those get a custom
 * text layer (plan §7, risk D-5), and that layer has to know where prose ends.
 * {@link buildRegionIndex} answers that with containment tests over the ranges
 * the parser *does* model, so every scanner reads one shared answer instead of
 * re-deriving it from the tree.
 *
 * Regions are `prose | table | verbatim`; the innermost marking wins, so code
 * inside a table cell is verbatim, not table.
 */

import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";

/** A construct that hides delimiters and keeps its text (`REVEAL-008`). */
export type InlineFormattingKind =
  | "em"
  | "strong"
  | "inline-code"
  | "strikethrough"
  | "highlight";

/** The five inline-formatting kinds, in catalogue order (`REVEAL-008`). */
export const INLINE_FORMATTING_KINDS: readonly InlineFormattingKind[] = [
  "em",
  "strong",
  "inline-code",
  "strikethrough",
  "highlight",
];

/** A construct that renders as a link (`REVEAL-008`). */
export type LinkLikeKind =
  | "link"
  | "image"
  | "internal-link"
  | "embed"
  | "formatting-link"
  | "footref";

/** The six link-like kinds, in catalogue order (`REVEAL-008`). */
export const LINK_LIKE_KINDS: readonly LinkLikeKind[] = [
  "link",
  "image",
  "internal-link",
  "embed",
  "formatting-link",
  "footref",
];

/** The three regions a position can be in. */
export type ConstructRegion = "prose" | "table" | "verbatim";

/** All three regions, outermost first. */
export const CONSTRUCT_REGIONS: readonly ConstructRegion[] = [
  "prose",
  "table",
  "verbatim",
];

/** The two regions the parser itself marks (prose is the absence of both). */
export type MarkedRegion = Exclude<ConstructRegion, "prose">;

/**
 * Parser node names that mark a region.
 *
 * Ground-truthed against `@codemirror/lang-markdown` 6.5.2 with
 * `markdownLanguage` (GFM): a table yields `Table / TableHeader / TableRow /
 * TableCell / TableDelimiter`, and code yields `FencedCode / CodeText /
 * InlineCode / CodeMark / CodeInfo`. `taxonomy.test.ts` asserts each name is
 * really produced by the parser, so this table cannot drift into fiction.
 */
export const REGION_NODES: Readonly<Record<string, MarkedRegion>> = {
  FencedCode: "verbatim",
  CodeText: "verbatim",
  InlineCode: "verbatim",
  CodeMark: "verbatim",
  CodeInfo: "verbatim",
  Table: "table",
  TableHeader: "table",
  TableRow: "table",
  TableCell: "table",
  TableDelimiter: "table",
};

/**
 * Parser node names whose whole range is a link-like span.
 *
 * `Link` covers the bracket text and the destination, which is the span the
 * artifact skips `%%` and `#` inside. `LinkReference` / `LinkLabel` are the
 * footnote-definition shape the GFM grammar produces for `[^note]: …`.
 */
export const LINK_NODES: readonly string[] = [
  "Link",
  "LinkReference",
  "LinkLabel",
  "URL",
  "LinkTitle",
];

/** The region a single node name marks, or `null` for prose nodes. */
export function regionOfNode(name: string): MarkedRegion | null {
  return REGION_NODES[name] ?? null;
}

/**
 * The region an ancestor chain is in: the innermost marking node wins, and a
 * chain with no marking node is prose.
 */
export function classifyRegion(ancestors: readonly string[]): ConstructRegion {
  for (let i = ancestors.length - 1; i >= 0; i -= 1) {
    const region = regionOfNode(ancestors[i]);
    if (region) return region;
  }
  return "prose";
}

/** A half-open `[from, to)` of one region. */
export type RegionRange = {
  readonly from: number;
  readonly to: number;
  readonly region: MarkedRegion;
};

/** The exclusion kinds a scanner can ask about. */
export type ExclusionKind = MarkedRegion | "link";

/** A half-open `[from, to)` span with no region attached. */
export type Span = { readonly from: number; readonly to: number };

/**
 * The region answer for one visible range, computed once per rebuild.
 *
 * Scanners ask this instead of walking the tree themselves, so a construct
 * cannot be recognised in one place and skipped in another.
 */
export type RegionIndex = {
  /** Region-marking ranges, in tree order. */
  readonly ranges: readonly RegionRange[];
  /** Link-like ranges (see {@link LINK_NODES}). */
  readonly links: readonly Span[];
  /** `verbatim` if inside code, else `table` if inside one, else `prose`. */
  regionAt(pos: number): ConstructRegion;
  /** True when `pos` is inside a range of any of `kinds`. */
  isExcluded(pos: number, kinds: readonly ExclusionKind[]): boolean;
  /** True when `[from, to)` overlaps a range of any of `kinds`. */
  overlaps(kinds: readonly ExclusionKind[], from: number, to: number): boolean;
};

function contains(span: Span, pos: number): boolean {
  // Half-open, like every other span in this package: a position at the range's
  // end is outside it. That is what makes `%%` immediately after a code span a
  // real comment rather than a skipped one.
  return span.from <= pos && pos < span.to;
}

/**
 * Build the region index for `[from, to)` — by default the whole document.
 *
 * Callers pass the viewport when they have one; the scanner tasks do that once
 * viewport scoping lands (plan Task 3.3), which is why the range is a
 * parameter rather than read from the view here.
 */
export function buildRegionIndex(
  state: EditorState,
  from = 0,
  to = state.doc.length,
): RegionIndex {
  const ranges: RegionRange[] = [];
  const links: Span[] = [];

  syntaxTree(state).iterate({
    from,
    to,
    enter: (node) => {
      const region = regionOfNode(node.name);
      if (region) {
        ranges.push({ from: node.from, to: node.to, region });
        return;
      }
      if (LINK_NODES.includes(node.name)) {
        links.push({ from: node.from, to: node.to });
      }
    },
  });

  const spansFor = (kind: ExclusionKind): readonly Span[] =>
    kind === "link"
      ? links
      : ranges.filter((range) => range.region === kind);

  const index: RegionIndex = {
    ranges,
    links,
    regionAt(pos) {
      // Innermost wins: code inside a table cell is verbatim.
      if (spansFor("verbatim").some((span) => contains(span, pos))) {
        return "verbatim";
      }
      if (spansFor("table").some((span) => contains(span, pos))) return "table";
      return "prose";
    },
    isExcluded(pos, kinds) {
      return kinds.some((kind) =>
        spansFor(kind).some((span) => contains(span, pos)),
      );
    },
    overlaps(kinds, start, end) {
      return kinds.some((kind) =>
        spansFor(kind).some((span) => span.from < end && span.to > start),
      );
    },
  };

  return index;
}
