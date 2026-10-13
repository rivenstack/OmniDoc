/**
 * The live preview's decoration walk (F-15 Rev 2, Task 1.5).
 *
 * Moved verbatim out of `markdown-live-preview.ts` — a pure move, no logic
 * change. This is the syntax-tree walk that decides, for every token the parser
 * modelled, whether it folds away, is drawn as a glyph, or stays visible
 * because the selection needs it.
 *
 * ## When a token unfolds
 *
 * The rule is deliberately *not* "the token itself is under the caret":
 *
 * - **Line tokens** (`#`, `>`, a list bullet, a task marker) belong to a whole
 *   line and unfold whenever the selection touches that line.
 * - **Inline tokens** (`**`, `~~`, backticks, link brackets and URLs) belong to
 *   a formatted span and unfold only while the selection touches the
 *   *formatted span* — clicking `world` in `**world!**` reveals the stars,
 *   clicking elsewhere on the line leaves them folded.
 * - **Nothing unfolds while the editor is unfocused or locked.** Opening the
 *   surface puts the caret at position 0; without this gate the first heading
 *   would greet the reader with a visible `#`. A locked note renders fully.
 */

import { syntaxTree } from "@codemirror/language";
import type { Range, Text } from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";
import { scanComments } from "./comment";
import { isRevealed as spanRevealed, revealContext } from "./reveal";
import {
  LINK_NODES,
  buildRegionIndex,
  type RegionIndex,
  type Span,
} from "./taxonomy";
import {
  RULE,
  codeBlockFirstLine,
  codeBlockLastLine,
  codeBlockLine,
  codeBlockOnlyLine,
  listItemLine,
  markerDecoration,
  markerEnd,
  quoteLine,
  scanTaskMarkers,
  taskCheckbox,
  type NodeRange,
} from "./widgets";

type Helpers = {
  doc: Text;
  /** Nearest enclosing node with one of `names`, or `null`. */
  ancestorOf: (names: readonly string[]) => NodeRange | null;
};

type HideRule = {
  /**
   * The region the selection has to touch for this token to unfold. `null`
   * means "this spelling is not one the preview folds" — leave it visible.
   */
  context: (node: NodeRange, helpers: Helpers) => Span | null;
  /** Also fold the whitespace after the token — it is syntax, not content. */
  swallowTrailingSpace?: boolean;
};

const HIDE_RULES: Record<string, HideRule> = {
  HeaderMark: {
    context: (node, { doc }) => doc.lineAt(node.from),
    swallowTrailingSpace: true,
  },
  QuoteMark: {
    context: (node, { doc }) => doc.lineAt(node.from),
    swallowTrailingSpace: true,
  },
  ListMark: {
    context: (node, { doc }) => doc.lineAt(node.from),
    swallowTrailingSpace: true,
  },
  EmphasisMark: {
    context: (_node, { ancestorOf }) =>
      ancestorOf(["Emphasis", "StrongEmphasis"]),
  },
  StrikethroughMark: {
    context: (_node, { ancestorOf }) => ancestorOf(["Strikethrough"]),
  },
  // Inline backticks unfold with their span; a fence unfolds with its own line.
  CodeMark: {
    context: (node, { doc, ancestorOf }) =>
      ancestorOf(["InlineCode"]) ?? doc.lineAt(node.from),
  },
  CodeInfo: { context: (node, { doc }) => doc.lineAt(node.from) },
  LinkMark: { context: (_node, { ancestorOf }) => ancestorOf(["Link"]) },
  URL: { context: (_node, { ancestorOf }) => ancestorOf(["Link"]) },
};

/** A token that is currently unfolded — dimmed so it reads as syntax. */
const SYNTAX = Decoration.mark({ class: "cm-live-syntax" });

/**
 * The heading pattern (`OBS-1.14.4-FOLD-002`).
 *
 * Optional indent, **one to six** hashes, then whitespace or end of line. Seven
 * or more hashes is therefore not a heading, and neither is `#hash` — the
 * whitespace-or-EOL requirement is what separates a heading marker from a tag.
 *
 * Landed here as the pattern only: the heading *fold service* is Task 5.1, and
 * the preview's own heading handling comes from the parser's `HeaderMark` node
 * rather than from this regex.
 */
export const HEADING_PATTERN = /^\s*(#{1,6})(\s+|$)/;

/**
 * The three empty replace singletons (`OBS-1.14.4-REVEAL-004`).
 *
 * Replace decorations are compared **by identity** when the range set is
 * diffed, so three separate singletons let the builder distinguish three kinds
 * of hidden range while keeping that diff cheap. The catalogue does not record
 * which of the artifact's three corresponds to which kind, so ours are named by
 * the use this engine makes of them:
 *
 * - {@link HIDDEN_DELIMITER} — an inline delimiter folded away (`**`, `~~`,
 *   a backtick, a link bracket).
 * - {@link HIDDEN_MARKER} — a line marker folded away with no glyph in its
 *   place; defined beside the marker widgets in `widgets.ts` and re-exported
 *   here so the three sit together.
 * - {@link HIDDEN_BLOCK} — a whole block-level range hidden. Reserved for the
 *   block constructs (callouts, embeds); nothing emits it yet.
 */
export const HIDDEN_DELIMITER = Decoration.replace({});
export const HIDDEN_BLOCK = Decoration.replace({});
export { HIDDEN_MARKER } from "./widgets";

/**
 * The text of a completed task.
 *
 * Struck through and faint, like the artifact's own checked-task item. It is a
 * *visual* behaviour: `TASK-001` specifies the toggle, not the look, so this is
 * recorded as a `@user`-directed addition rather than a parity claim.
 */
export const taskDoneMark = Decoration.mark({ class: "cm-live-task-done" });

/**
 * Rendered link text (`OBS-1.14.4-REVEAL-005`, `OBS-1.14.4-A11Y-002`).
 *
 * Carries three things at once, which is why the artifact builds it once: the
 * underline class the theme styles, `tabindex="-1"` so the text is reachable by
 * script and by pointer but deliberately **not** a tab stop, and
 * `draggable="true"` — the same mark is both the accessibility surface and the
 * drag surface.
 */
export const renderedLinkMark = Decoration.mark({
  class: "cm-live-link",
  attributes: { tabindex: "-1", draggable: "true" },
});

/**
 * A range anchor with no presentation of its own.
 *
 * The activation layer attaches behaviour to a rendered span without changing
 * how it looks, so this mark carries no class and no attributes — a test pins
 * that, because a stray class here would restyle link text twice.
 */
export const transparentMark = Decoration.mark({});

/**
 * An unresolved link (`OBS-1.14.4-LINK-006`).
 *
 * Unresolved-link marking is **deferred** with internal links (wikilinks stay
 * literal in v1), so nothing emits this yet: it exists so the re-open has one
 * place to land instead of a second styling vocabulary.
 */
export const unresolvedMark = Decoration.mark({ class: "cm-live-unresolved" });

/* ------------------------------------------------------------------ comments
 * Comments (`%%…%%`) are the one construct with no reveal rule at all
 * (`OBS-1.14.4-COMMENT-001`): they are **styled faint and never hidden**, so
 * these are marks, never replaces, and no caret position changes them. Only the
 * reading path hides them (`markdown/comments.ts`).
 * ------------------------------------------------------------------------ */

/** The comment body and its delimiters: faint, always visible. */
export const commentMark = Decoration.mark({ class: "cm-live-comment" });

/**
 * A `%%` pair itself.
 *
 * The artifact gives the pair the comment class *plus* its formatting markers,
 * which is why the delimiters can be styled apart from the body they open —
 * fainter, so the reader's eye skips them without them disappearing.
 */
export const commentMarkerMark = Decoration.mark({
  class: "cm-live-comment cm-live-comment-marker",
});

/* ------------------------------------------------------------------ inline
 * Highlighting (`==text==`)
 *
 * The GFM grammar has no node for `==`, so this construct — and only this one
 * of the five inline-formatting kinds — is found by the preview's own text
 * layer over prose (`REVEAL-008` names highlight as an inline-formatting kind;
 * plan §7 risk D-5 is the parser divergence it implies).
 *
 * Two rules come from the artifact's documentation rather than from the
 * catalogue (`documentation-map.md`): a colour emoji goes **immediately after**
 * the opening `==`, and without one the highlight uses the theme's default
 * colour. Whether the emoji is stripped from the rendered text was never
 * established, so it is **not** stripped here — the text is left exactly as the
 * user typed it.
 * ------------------------------------------------------------------------ */

/** The artifact's default highlight plus the six colours its emoji select picks. */
export type HighlightColour =
  | "default"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple";

/** All seven highlight colours, default first. */
export const HIGHLIGHT_COLOURS: readonly HighlightColour[] = [
  "default",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
];

/**
 * The six canonical circle emoji and their square synonyms.
 *
 * `OBS-1.14.4-CMD-003` records that six highlight-colour commands are generated
 * from a list; the two emoji per colour are the ones the documentation names
 * ("Add a color emoji immediately after the opening `==`").
 */
export const HIGHLIGHT_EMOJI: Readonly<Record<HighlightColour, readonly string[]>> = {
  default: [],
  red: ["🔴", "🟥"],
  orange: ["🟠", "🟧"],
  yellow: ["🟡", "🟨"],
  green: ["🟢", "🟩"],
  blue: ["🔵", "🟦"],
  purple: ["🟣", "🟪"],
};

/** The highlight delimiter. */
export const HIGHLIGHT_MARKER = "==";

/**
 * The colour a highlight's content selects.
 *
 * The emoji has to be the **first character** of the content — "immediately
 * after the opening `==`". Anything else, or nothing at all, is the default
 * colour.
 */
export function highlightColourOf(content: string): HighlightColour {
  const [first] = Array.from(content);
  if (!first) return "default";
  for (const colour of HIGHLIGHT_COLOURS) {
    if (HIGHLIGHT_EMOJI[colour].includes(first)) return colour;
  }
  return "default";
}

/** One `==…==` span the text layer found. */
export type HighlightSpan = {
  /** The whole construct, delimiters included. */
  readonly from: number;
  readonly to: number;
  /** The content between the delimiters. */
  readonly contentFrom: number;
  readonly contentTo: number;
  readonly colour: HighlightColour;
};

/** Marks are cached per colour so a rebuild reuses decoration identity. */
const highlightMarks = new Map<HighlightColour, Decoration>();

/** The mark for one highlight colour (cached). */
export function highlightMark(colour: HighlightColour): Decoration {
  let mark = highlightMarks.get(colour);
  if (!mark) {
    mark = Decoration.mark({
      class:
        colour === "default"
          ? "cm-live-highlight"
          : `cm-live-highlight cm-live-highlight-${colour}`,
    });
    highlightMarks.set(colour, mark);
  }
  return mark;
}

/**
 * Find every `==…==` span in `[from, to)` that prose may contain.
 *
 * Line by line, because the artifact's highlight is an inline construct: an
 * opener looks for the next `==` on the same line, and an opener with nothing
 * closing it stays literal text. Spans inside code, a table or a link are
 * skipped, so `` `a == b ==` `` and a URL's `==` are not highlights.
 */
export function scanHighlights(
  doc: Text,
  from: number,
  to: number,
  regions: RegionIndex,
): HighlightSpan[] {
  const spans: HighlightSpan[] = [];
  const first = doc.lineAt(from).number;
  const last = doc.lineAt(to).number;

  for (let number = first; number <= last; number += 1) {
    const line = doc.line(number);
    let cursor = 0;
    while (cursor < line.length) {
      const open = line.text.indexOf(HIGHLIGHT_MARKER, cursor);
      if (open < 0) break;
      const contentStart = open + HIGHLIGHT_MARKER.length;
      const close = line.text.indexOf(HIGHLIGHT_MARKER, contentStart);
      // No closer on this line, or nothing between the delimiters: literal.
      if (close < 0 || close === contentStart) {
        cursor = contentStart;
        continue;
      }
      const contentEnd = close;
      const spanFrom = line.from + open;
      const spanTo = line.from + contentEnd + HIGHLIGHT_MARKER.length;
      cursor = contentEnd + HIGHLIGHT_MARKER.length;

      if (spanFrom < from || spanTo > to) continue;
      if (regions.overlaps(["verbatim", "table", "link"], spanFrom, spanTo)) continue;

      const content = line.text.slice(contentStart, contentEnd);
      spans.push({
        from: spanFrom,
        to: spanTo,
        contentFrom: line.from + contentStart,
        contentTo: line.from + contentEnd,
        colour: highlightColourOf(content),
      });
    }
  }

  return spans;
}

const headingDecos: Partial<Record<string, Decoration>> = {
  ATXHeading1: Decoration.mark({ class: "cm-live-h1" }),
  ATXHeading2: Decoration.mark({ class: "cm-live-h2" }),
  ATXHeading3: Decoration.mark({ class: "cm-live-h3" }),
};

const strongDeco = Decoration.mark({ class: "cm-live-strong" });
const emphasisDeco = Decoration.mark({ class: "cm-live-em" });
const strikethroughDeco = Decoration.mark({ class: "cm-live-strike" });
const inlineCodeDeco = Decoration.mark({ class: "cm-live-code" });

/**
 * Build the decoration set for the current view.
 *
 * Exported so the plugin that owns it (and its tests) can call it directly.
 */
export function buildDecorations(view: EditorView): DecorationSet {
  const { state } = view;
  const { doc, selection } = state;
  const ranges: Range<Decoration>[] = [];

  // A note nobody is editing renders like a finished document: unfolding is
  // gated on focus, and a locked note (`editable` false) never unfolds at all.
  const revealEnabled = view.hasFocus && state.facet(EditorView.editable);
  // One reveal context for the whole walk — the predicate, the focus rule and
  // the empty-when-unfocused rule live in `reveal.ts` (Task 2.2).
  const reveal = revealContext(selection, revealEnabled);

  const ancestors: NodeRange[] = [];

  // The task layer runs *before* the walk, for two reasons (`TASK-001`):
  //
  // 1. The grammar reads `[?]` and `[-]` as shortcut reference links, so the
  //    walk has to know which bracketed spans are task markers and leave them
  //    alone — otherwise `[?]` is underlined and bracket-folded as link syntax.
  // 2. A task item gives up its bullet, and that decision is needed before the
  //    walk reaches the `ListMark`.
  const taskMarkers = view.visibleRanges.flatMap(({ from, to }) =>
    scanTaskMarkers(doc, from, to),
  );
  const taskLines = new Set(taskMarkers.map((marker) => marker.lineFrom));
  const linkNodeNames = new Set(LINK_NODES);
  const insideTaskMarker = (node: NodeRange) =>
    linkNodeNames.has(node.name) &&
    taskMarkers.some(
      (marker) => marker.from <= node.from && node.to <= marker.to,
    );

  const isRevealed = (span: Span) => spanRevealed(reveal, span);

  const decorate = (node: NodeRange) => {
    // `[?]` is a task marker to the artifact and a link to the grammar; the
    // task layer wins (plan §7 risk D-5).
    if (insideTaskMarker(node)) return;

    const rule = HIDE_RULES[node.name];

    if (rule) {
      const ancestorOf = (names: readonly string[]) => {
        for (let i = ancestors.length - 1; i >= 0; i -= 1) {
          if (names.includes(ancestors[i].name)) return ancestors[i];
        }
        return null;
      };
      const context = rule.context(node, { doc, ancestorOf });

      if (!context) return;

      if (isRevealed(context)) {
        ranges.push(SYNTAX.range(node.from, node.to));
        return;
      }

      const to = rule.swallowTrailingSpace ? markerEnd(doc, node.to) : node.to;
      const text = doc.sliceString(node.from, node.to);
      ranges.push(
        markerDecoration(
          node,
          text,
          { doc, ancestorOf, tasks: taskLines },
          HIDDEN_DELIMITER,
        ).range(node.from, to),
      );
      return;
    }

    const heading = headingDecos[node.name];
    if (heading) {
      ranges.push(heading.range(node.from, node.to));
    } else if (node.name === "StrongEmphasis") {
      ranges.push(strongDeco.range(node.from, node.to));
    } else if (node.name === "Emphasis") {
      ranges.push(emphasisDeco.range(node.from, node.to));
    } else if (node.name === "Strikethrough") {
      ranges.push(strikethroughDeco.range(node.from, node.to));
    } else if (node.name === "InlineCode") {
      ranges.push(inlineCodeDeco.range(node.from, node.to));
    } else if (node.name === "Link") {
      ranges.push(renderedLinkMark.range(node.from, node.to));
    } else if (node.name === "ListItem") {
      // Hanging indent: the marker sits in the indent, wrapped lines align
      // under the text (`.cm-live-list-item` in the theme).
      ranges.push(listItemLine.range(doc.lineAt(node.from).from));
    } else if (node.name === "Blockquote") {
      const first = doc.lineAt(node.from);
      const last = doc.lineAt(node.to);
      for (
        let lineNumber = first.number;
        lineNumber <= last.number;
        lineNumber += 1
      ) {
        ranges.push(quoteLine.range(doc.line(lineNumber).from));
      }
    } else if (node.name === "FencedCode") {
      const first = doc.lineAt(node.from);
      const last = doc.lineAt(node.to);
      const only = first.number === last.number;
      for (
        let lineNumber = first.number;
        lineNumber <= last.number;
        lineNumber += 1
      ) {
        const decoration = only
          ? codeBlockOnlyLine
          : lineNumber === first.number
            ? codeBlockFirstLine
            : lineNumber === last.number
              ? codeBlockLastLine
              : codeBlockLine;
        ranges.push(decoration.range(doc.line(lineNumber).from));
      }
    } else if (node.name === "HorizontalRule") {
      const line = doc.lineAt(node.from);
      if (isRevealed(line)) {
        ranges.push(SYNTAX.range(node.from, node.to));
      } else {
        ranges.push(RULE.range(node.from, node.to));
      }
    }
  };

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node: NodeRange) => {
        decorate(node);
        ancestors.push({ name: node.name, from: node.from, to: node.to });
      },
      leave: (node: NodeRange) => {
        if (
          ancestors.length > 0 &&
          ancestors[ancestors.length - 1].name === node.name
        ) {
          ancestors.pop();
        }
      },
    });
  }

  // The text layer for constructs the grammar does not model. Highlight is the
  // inline-formatting one, so it is recognised in prose only — the region index
  // answers where prose ends (code, tables and links are excluded).
  const regions = buildRegionIndex(state, view.viewport.from, view.viewport.to);
  for (const { from, to } of view.visibleRanges) {
    for (const span of scanHighlights(doc, from, to, regions)) {
      ranges.push(highlightMark(span.colour).range(span.contentFrom, span.contentTo));
      // The `==` pair folds away, and unfolds like every other inline
      // delimiter — when the selection touches the whole construct.
      const delimiter = isRevealed(span) ? SYNTAX : HIDDEN_DELIMITER;
      ranges.push(delimiter.range(span.from, span.contentFrom));
      ranges.push(delimiter.range(span.contentTo, span.to));
    }

    // Comments: marked, never hidden — and no reveal test, on purpose.
    for (const span of scanComments(doc, from, to, regions)) {
      ranges.push(
        (span.marker ? commentMarkerMark : commentMark).range(span.from, span.to),
      );
    }

    // Task checkboxes (`TASK-001`), from the scan computed above. The marker
    // unfolds with its whole line, like every other line token.
    //
    // **Recorded rule, not a catalogue claim:** the task marker is in neither
    // construct set of `REVEAL-008`, so the catalogue gives it no reveal rule —
    // yet `@user` observed the artifact revealing the raw `[ ]` when the caret is
    // on the line (2026-10-13). The observation wins over the inference, and the
    // rule is recorded here and in the lane handoff so it is never mistaken for
    // parity evidence.
    for (const marker of taskMarkers) {
      const line = doc.lineAt(marker.from);
      const contentFrom = markerEnd(doc, marker.to);
      if (marker.done && contentFrom < line.to) {
        // Only `x` / `X` strikes the text through — `[?]` fills the box but is
        // not struck. The strike is state, so the caret cannot change it.
        ranges.push(taskDoneMark.range(contentFrom, line.to));
      }
      if (isRevealed(line)) {
        ranges.push(SYNTAX.range(marker.from, marker.to));
      } else {
        ranges.push(taskCheckbox(marker).range(marker.from, contentFrom));
      }
    }
  }

  // `Decoration.set(..., true)` sorts (and merges) the collected ranges, so
  // the walk may emit nested ranges — a heading span, then the marks inside
  // it — in any order.
  return Decoration.set(ranges, true);
}
