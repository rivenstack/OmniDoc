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
import type { EditorState, Range, Text } from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";
import { codeBlockRevealSpan } from "./codeblock";
import { calloutState } from "./callout";
import { scanComments } from "./comment";
import { isRevealed as spanRevealed, revealContext } from "./reveal";
import { scanTags } from "./tags";
import {
  LINK_NODES,
  buildRegionIndex,
  type FootnoteKind,
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
  /** True for the inline-scoped walk a table cell uses (plan Task A.3). */
  inline: boolean;
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
  // Inline backticks unfold with their span; a fence unfolds with the whole
  // code block (`REVEAL-009` + `REVEAL-011`), so one caret touch anywhere inside
  // the block shows all of its raw source rather than token by token.
  //
  // The fence half belongs to the document walk only: `FencedCode` is a
  // block-level construct, so in a cell (`inline: true`) a backtick run that
  // opens a fence is plain source and nothing folds it.
  CodeMark: {
    context: (node, { doc, ancestorOf, inline }) => {
      const code = ancestorOf(["InlineCode"]);
      if (code) return code;
      if (inline) return null;
      return codeBlockRevealSpan(ancestorOf(["FencedCode"])) ?? doc.lineAt(node.from);
    },
  },
  CodeInfo: {
    context: (node, { doc, ancestorOf }) =>
      codeBlockRevealSpan(ancestorOf(["FencedCode"])) ?? doc.lineAt(node.from),
  },
  LinkMark: { context: (_node, { ancestorOf }) => ancestorOf(["Link"]) },
  URL: { context: (_node, { ancestorOf }) => ancestorOf(["Link"]) },
};

/**
 * Node names only the **document** walk decorates.
 *
 * `REVEAL-008` splits the construct vocabulary into the inline and link-like
 * kinds; every block-level construct sits outside both, so a table cell — one
 * line of markdown rendered through the inline walk — leaves these as source.
 * That is the mechanism behind the plan's "block constructs in a cell produce
 * no block widgets": a heading stays `# title`, a quote stays `> text`, a fence
 * stays raw, and a pipe block stays text rather than becoming a nested table.
 */
const DOCUMENT_ONLY_NODES: ReadonlySet<string> = new Set([
  "ATXHeading1",
  "ATXHeading2",
  "ATXHeading3",
  "Blockquote",
  "FencedCode",
  "HeaderMark",
  "HorizontalRule",
  "ListItem",
  "ListMark",
  "QuoteMark",
  "CodeInfo",
]);

/** Which constructs a decoration walk recognises. */
export type DecorationScope = "document" | "inline";

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

/* ----------------------------------------------------------------- footnotes
 * `OBS-1.14.4-FOOT-001`: the editor carries a dedicated inline-footnote flag.
 * `^[` opens one, `]` closes it, and while it is open the span carries the
 * footref marker *and* the inline-footnote marker — which is exactly what keeps
 * it out of the clickable-token set, because that classifier requires footref
 * **without** inline-footnote. So an inline footnote is parsed and styled but
 * never interactive, and a *named* reference (`[^name]`) is the one that
 * classifies link-like (`REVEAL-008`).
 *
 * The grammar mis-reads `[^name]` as a shortcut reference **link**, so the walk
 * suppresses the link treatment inside a footnote span, the same way it does for
 * a task marker. Navigation to the definition, and the hover preview, are both
 * deferred: there is no footnote view to navigate to.
 * ------------------------------------------------------------------------ */

/** The two markers' opening sequences. */
export const FOOTNOTE_NAMED_PATTERN = /\[\^([^\]]+)\]/g;
export const FOOTNOTE_INLINE_OPEN = "^[";

/** One footnote marker the text layer found. */
export type FootnoteSpan = {
  readonly from: number;
  readonly to: number;
  readonly kind: FootnoteKind;
  /** For an inline footnote: the body between `^[` and `]`. */
  readonly bodyFrom?: number;
  readonly bodyTo?: number;
};

/**
 * Every footnote marker in `[from, to)`.
 *
 * Line-based: both markers are inline constructs. **Only code and tables are
 * excluded** — the link region is deliberately *not* an exclusion here, because
 * the grammar classifies a named reference as a link; the footnote layer claims
 * those nodes instead of skipping them.
 */
export function scanFootnotes(
  doc: Text,
  from: number,
  to: number,
  regions: RegionIndex,
): FootnoteSpan[] {
  const spans: FootnoteSpan[] = [];
  const first = doc.lineAt(from).number;
  const last = doc.lineAt(to).number;

  for (let number = first; number <= last; number += 1) {
    const line = doc.line(number);

    // Named references first, so an inline scan cannot re-read their brackets.
    const claimed: Span[] = [];
    for (const match of line.text.matchAll(FOOTNOTE_NAMED_PATTERN)) {
      if (match.index === undefined) continue;
      const start = line.from + match.index;
      const end = start + match[0].length;
      if (start < from || end > to) continue;
      if (regions.isExcluded(start, ["verbatim", "table"])) continue;
      spans.push({ from: start, to: end, kind: "named" });
      claimed.push({ from: start, to: end });
    }

    // Inline footnotes: `^[`, then the `]` that closes it.
    let cursor = 0;
    while (cursor < line.length) {
      const open = line.text.indexOf(FOOTNOTE_INLINE_OPEN, cursor);
      if (open < 0) break;
      const bodyStart = open + FOOTNOTE_INLINE_OPEN.length;
      const close = line.text.indexOf("]", bodyStart);
      if (close < 0) {
        // No closer on this line: the markers stay literal.
        break;
      }
      const start = line.from + open;
      const end = line.from + close + 1;
      cursor = close + 1;

      if (start < from || end > to) continue;
      if (regions.isExcluded(start, ["verbatim", "table"])) continue;
      if (claimed.some((span) => span.from < end && span.to > start)) continue;

      spans.push({
        from: start,
        to: end,
        kind: "inline",
        bodyFrom: line.from + bodyStart,
        bodyTo: line.from + close,
      });
    }
  }

  return spans;
}

/** A named reference — the marker that classifies link-like. */
export const footrefMark = Decoration.mark({ class: "cm-live-footref" });

/** An inline footnote: the whole construct. */
export const inlineFootnoteMark = Decoration.mark({
  class: "cm-live-inline-footnote",
});

/** The `^[` and `]` of an inline footnote — its formatting markers. */
export const footnoteMarkerMark = Decoration.mark({
  class: "cm-live-footnote-marker",
});

/**
 * The classes that make a span a *footref token* (`FOOT-001`).
 *
 * A span is one only when it carries the footref marker **and not** the
 * inline-footnote marker — the artifact's own predicate, as a function so the
 * exclusion is testable rather than implied by which marks a branch emits.
 */
export function isFootrefToken(classes: readonly string[]): boolean {
  return classes.includes("cm-live-footref") && !classes.includes("cm-live-inline-footnote");
}

/**
 * The text of a completed task.
 *
 * Struck through and faint, like the artifact's own checked-task item. It is a
 * *visual* behaviour: `TASK-001` specifies the toggle, not the look, so this is
 * recorded as a `@user`-directed addition rather than a parity claim.
 */
export const taskDoneMark = Decoration.mark({ class: "cm-live-task-done" });

/**
 * The link's **rendered text** — what the mark belongs on.
 *
 * `OBS-1.14.4-REVEAL-005` puts the underline, the `tabindex` and `draggable` on
 * "the rendered link text", and `OBS-1.14.4-LINK-002` turns on that distinction:
 * a plain click follows a link only when it lands on the rendered text, and a
 * click on the raw syntax — the brackets, the URL, an unrendered link on the
 * active line — places the caret. So the mark covers the text between the
 * brackets, not the whole node.
 *
 * An autolink (`<https://example.com>`) has no brackets; there the rendered text
 * *is* the URL, so that is the range.
 */
function renderedLinkRange(state: EditorState, node: NodeRange): Span | null {
  const marks: Span[] = [];
  let url: Span | null = null;

  syntaxTree(state).iterate({
    from: node.from,
    to: node.to,
    enter: (child) => {
      if (child.name === "LinkMark") {
        marks.push({ from: child.from, to: child.to });
      } else if (child.name === "URL" && url === null) {
        url = { from: child.from, to: child.to };
      }
    },
  });

  if (marks.length >= 2) {
    const from = marks[0].to;
    const to = marks[marks.length - 1].from;
    return from < to ? { from, to } : null;
  }
  return url;
}

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

/* ---------------------------------------------------------------------- tags
 * `#tag` is not Markdown, so the grammar models nothing for it — the text layer
 * finds it (`OBS-1.14.4-TAG-001`). The styling is the artifact's **three-part
 * class split** (`TAG-003`): the tag as a whole, its opening hash and its
 * trailing boundary, so a theme can address each independently.
 *
 * Nothing here is interactive: the click (`TAG-004`) and the autocomplete
 * (`TAG-002`) are both deferred behind the `BL-26` collections/tags contract.
 * ------------------------------------------------------------------------ */

/** The whole tag. */
export const tagMark = Decoration.mark({ class: "cm-live-tag" });

/** The opening `#`. */
export const tagBeginMark = Decoration.mark({ class: "cm-live-tag-begin" });

/** The tag's last character — its trailing boundary. */
export const tagEndMark = Decoration.mark({ class: "cm-live-tag-end" });

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
 *
 * `scope` selects the construct vocabulary. `"document"` is the whole preview;
 * `"inline"` is what a table cell gets (plan Task A.3) — the `REVEAL-008`
 * inline kinds only, with every block-level construct (headings, quotes, lists,
 * fences, rules, comments, tags, task markers) left as raw source. Both are the
 * *same walk*, so a cell cannot drift from the document's inline rendering.
 */
export function buildDecorations(
  view: EditorView,
  scope: DecorationScope = "document",
): DecorationSet {
  const inlineOnly = scope === "inline";
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
  // Footnotes run before the walk too: the grammar reads `[^name]` as a
  // shortcut reference link, and the footnote layer is what claims it
  // (`FOOT-001`).
  const footnotes = view.visibleRanges.flatMap(({ from, to }) =>
    scanFootnotes(doc, from, to, buildRegionIndex(state, from, to)),
  );
  const linkNodeNames = new Set(LINK_NODES);
  const inSpan = (node: NodeRange, spans: readonly Span[]) =>
    spans.some((span) => span.from <= node.from && node.to <= span.to);
  const insideTaskMarker = (node: NodeRange) =>
    linkNodeNames.has(node.name) && inSpan(node, taskMarkers);
  const insideFootnote = (node: NodeRange) =>
    linkNodeNames.has(node.name) && inSpan(node, footnotes);

  // Callouts (`OBS-1.14.4-CALLOUT-004`): the grammar reads `[!type]` as a
  // shortcut reference link, exactly as it does `[^name]`, so the marker span is
  // claimed here — otherwise the link rules fold its brackets and the revealed
  // raw source would lose the `[` and `]`. The same state call also answers
  // which callouts are replaced by a widget, so the block filter below and the
  // widget field cannot disagree.
  const { callouts, replaced } = calloutState(state);
  const calloutMarkers: Span[] = callouts.map((callout) => ({
    from: callout.markerFrom,
    to: callout.markerTo,
  }));
  const insideCalloutMarker = (node: NodeRange) =>
    linkNodeNames.has(node.name) && inSpan(node, calloutMarkers);

  const isRevealed = (span: Span) => spanRevealed(reveal, span);

  const decorate = (node: NodeRange) => {
    // `[?]` is a task marker to the artifact and a link to the grammar,
    // `[^name]` is a footnote reference to the artifact and a link to the
    // grammar, and `[!type]` is a callout marker and a link to the grammar.
    // All three layers win over the link reading (plan §7 risk D-5).
    if (insideTaskMarker(node) || insideFootnote(node) || insideCalloutMarker(node)) {
      return;
    }

    // A cell renders the inline vocabulary and nothing else (plan Task A.3).
    if (inlineOnly && DOCUMENT_ONLY_NODES.has(node.name)) return;

    const rule = HIDE_RULES[node.name];

    if (rule) {
      const ancestorOf = (names: readonly string[]) => {
        for (let i = ancestors.length - 1; i >= 0; i -= 1) {
          if (names.includes(ancestors[i].name)) return ancestors[i];
        }
        return null;
      };
      const context = rule.context(node, {
        doc,
        ancestorOf,
        inline: inlineOnly,
      });

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
      const text = renderedLinkRange(state, node);
      if (text) ranges.push(renderedLinkMark.range(text.from, text.to));
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
  //
  // Highlight is one of the eleven `REVEAL-008` kinds, so it runs in both
  // scopes; comments, task checkboxes and tags sit outside the vocabulary and
  // run only in the document walk (`COMMENT-001` says it for comments: a cell
  // shows the raw `%%…%%`).
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

    if (inlineOnly) continue;

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
    // Tags (`TAG-001`): styled text, never interactive — the click and the
    // suggest are deferred behind `BL-26` (decisions 8 and `TAG-002`).
    for (const span of scanTags(doc, from, to, regions)) {
      ranges.push(tagMark.range(span.from, span.to));
      ranges.push(tagBeginMark.range(span.from, span.from + 1));
      ranges.push(tagEndMark.range(span.to - 1, span.to));
    }
  }

  // Footnotes (`FOOT-001`). A named reference is the marker that classifies
  // link-like; an inline footnote is parsed and styled but never interactive,
  // which the two-marker body encodes: a footref token needs the footref mark
  // *without* the inline-footnote one. Both are inline constructs, so they run
  // in a cell too.
  for (const span of footnotes) {
    if (span.kind === "named") {
      ranges.push(footrefMark.range(span.from, span.to));
      continue;
    }
    ranges.push(inlineFootnoteMark.range(span.from, span.to));
    ranges.push(footnoteMarkerMark.range(span.from, span.from + 2));
    ranges.push(footnoteMarkerMark.range(span.to - 1, span.to));
    if (span.bodyFrom !== undefined && span.bodyTo !== undefined) {
      if (span.bodyFrom < span.bodyTo) {
        // The body carries the footref marker *and* the inline-footnote one —
        // the combination the clickable-token classifier rejects.
        ranges.push(footrefMark.range(span.bodyFrom, span.bodyTo));
      }
    }
  }

  // `Decoration.set(..., true)` sorts (and merges) the collected ranges, so the
  // walk may emit nested ranges — a heading span, then the marks inside it — in
  // any order.
  //
  // A callout that is currently replaced by its block widget (`REVEAL-004`'s
  // sibling entry, `CALLOUT-004`) must not also carry inline decorations: a
  // block replace and marks over the same text would overlap. So every range
  // that falls inside a replaced callout is dropped here — the widget renders
  // that content itself.
  const visible =
    replaced.length === 0
      ? ranges
      : ranges.filter(
          (range) =>
            !replaced.some(
              (callout) => callout.from <= range.from && range.to <= callout.to,
            ),
        );
  return Decoration.set(visible, true);
}

/**
 * The inline-scoped walk: the construct set a table cell renders (plan Task A.3).
 *
 * A thin, deliberately named wrapper, so the cell's extension and its tests ask
 * for `REVEAL-008`'s inline half by name rather than by remembering an option
 * value.
 */
export function buildInlineDecorations(view: EditorView): DecorationSet {
  return buildDecorations(view, "inline");
}
