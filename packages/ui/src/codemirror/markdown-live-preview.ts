import { syntaxTree } from "@codemirror/language";
import {
  type EditorSelection,
  type Range,
  type Text,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import {
  LIVE_PREVIEW_CODE_TYPE,
  LIVE_PREVIEW_TYPE_RULES,
} from "../capture/body-typography";

/**
 * Re-exported: this module was the table text rules' original home. The
 * implementations now live in `../markdown/table` so the live preview and the
 * ProseMirror bridge read and write tables through one shared grammar.
 */
export { parseMarkdownTable, serializeMarkdownTable } from "../markdown/table";

/**
 * Re-exported for API stability (F-15 Rev 2, Task 1.4): the table machinery now
 * lives in `./live-preview/table/**`. The names are unchanged, so the split is
 * invisible to callers.
 */
export {
  TABLE_COMPLETE_MS,
  TABLE_IDLE_FLUSH_MS,
  TablePreviewWidget,
  findTableBlocks,
  renderCellMarkdown,
  tableLivePreview,
} from "./live-preview/table";

/**
 * CodeMirror 6 live preview for the capture surface's **Markdown** mode.
 *
 * The note keeps its markdown source on screen, but the syntax tokens that
 * only exist for the parser fold away until the caret needs them, and the
 * block constructs the source spells out (`-`, `1.`, `>`, fences, `---`) are
 * drawn as the blocks they mean — the Obsidian "live preview" contract
 * (`docs/planning/implementation-tracks.md`, F-13).
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
 *
 * Folded tokens are hidden with `Decoration.replace`, which removes them from
 * layout and from the rendered DOM, and marker tokens swallow the space that
 * follows them: `## Hello` renders as `Hello`, not ` Hello` — the space is part
 * of the syntax, not the content.
 *
 * ## What is drawn instead
 *
 * - list items: a bullet (or the source's own number for ordered lists), with
 *   a hanging indent so wrapped lines align under the text
 * - task items: a checkbox glyph instead of the bullet
 * - fenced code: a muted block with the monospace face, fences folded
 * - `---`: a horizontal rule
 * - headings, bold, italic, strikethrough, inline code, links, blockquotes:
 *   the same typography the Normal mode applies to the same content
 *
 * The look lives in theme rules rather than utility classes on purpose:
 * CodeMirror renders its own line DOM, and the modes must not drift into
 * different visual languages.
 */

/** A region that can sit under the selection. */
type RangeLike = { from: number; to: number };

type NodeRange = { name: string; from: number; to: number };

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
  context: (node: NodeRange, helpers: Helpers) => RangeLike | null;
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
  TaskMarker: {
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

/** A folded token: nothing is rendered in its place. */
const HIDDEN = Decoration.replace({});

/** A token that is currently unfolded — dimmed so it reads as syntax. */
const SYNTAX = Decoration.mark({ class: "cm-live-syntax" });

/**
 * A folded token that is drawn as a glyph. The doc text stays authoritative —
 * the widget is decoration, so it is hidden from assistive technology and
 * ignores pointer events (the line's own rules still handle clicks).
 */
class MarkerWidget extends WidgetType {
  constructor(
    private readonly className: string,
    private readonly text: string,
  ) {
    super();
  }

  eq(other: MarkerWidget) {
    return other.className === this.className && other.text === this.text;
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = this.className;
    span.textContent = this.text;
    span.setAttribute("aria-hidden", "true");
    return span;
  }

  ignoreEvent() {
    return true;
  }
}

const BULLET = Decoration.replace({
  widget: new MarkerWidget("cm-live-bullet", "•"),
});
const TASK_UNCHECKED = Decoration.replace({
  widget: new MarkerWidget("cm-live-task", "☐"),
});
const TASK_CHECKED = Decoration.replace({
  widget: new MarkerWidget("cm-live-task", "☑"),
});
const RULE = Decoration.replace({ widget: new MarkerWidget("cm-live-hr", "") });

/** Ordered markers repeat per item, so they are cached by their source text. */
const orderedMarkers = new Map<string, Decoration>();
function orderedMarker(text: string): Decoration {
  let marker = orderedMarkers.get(text);
  if (!marker) {
    marker = Decoration.replace({
      widget: new MarkerWidget("cm-live-ordered-mark", text),
    });
    orderedMarkers.set(text, marker);
  }
  return marker;
}

const listItemLine = Decoration.line({ class: "cm-live-list-item" });
const quoteLine = Decoration.line({ class: "cm-live-quote" });
const codeBlockLine = Decoration.line({ class: "cm-live-code-block" });
const codeBlockFirstLine = Decoration.line({
  class: "cm-live-code-block cm-live-code-block-first",
});
const codeBlockLastLine = Decoration.line({
  class: "cm-live-code-block cm-live-code-block-last",
});
const codeBlockOnlyLine = Decoration.line({
  class: "cm-live-code-block cm-live-code-block-first cm-live-code-block-last",
});

const headingDecos: Partial<Record<string, Decoration>> = {
  ATXHeading1: Decoration.mark({ class: "cm-live-h1" }),
  ATXHeading2: Decoration.mark({ class: "cm-live-h2" }),
  ATXHeading3: Decoration.mark({ class: "cm-live-h3" }),
};

const strongDeco = Decoration.mark({ class: "cm-live-strong" });
const emphasisDeco = Decoration.mark({ class: "cm-live-em" });
const strikethroughDeco = Decoration.mark({ class: "cm-live-strike" });
const inlineCodeDeco = Decoration.mark({ class: "cm-live-code" });
const linkDeco = Decoration.mark({ class: "cm-live-link" });

function selectionTouches(
  selection: EditorSelection,
  from: number,
  to: number,
): boolean {
  return selection.ranges.some(
    (range: RangeLike) => range.from <= to && range.to >= from,
  );
}

/** Whitespace that belongs to a marker rather than to the content. */
function markerEnd(doc: Text, from: number): number {
  let end = from;
  while (end < doc.length) {
    const char = doc.sliceString(end, end + 1);
    if (char !== " " && char !== "\t") break;
    end += 1;
  }
  return end;
}

/**
 * List items that begin with a task marker. Their bullet is replaced by the
 * checkbox, so the decision is needed *before* the walk that emits
 * decorations — hence the separate pass.
 */
function taskItems(view: EditorView): Set<number> {
  const items = new Set<number>();
  const ancestors: NodeRange[] = [];

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node: NodeRange) => {
        if (node.name === "TaskMarker") {
          const item = [...ancestors]
            .reverse()
            .find((ancestor) => ancestor.name === "ListItem");
          if (item) items.add(item.from);
        }
        ancestors.push({ name: node.name, from: node.from, to: node.to });
      },
      leave: () => {
        ancestors.pop();
      },
    });
  }

  return items;
}

function buildDecorations(view: EditorView): DecorationSet {
  const { state } = view;
  const { doc, selection } = state;
  const ranges: Range<Decoration>[] = [];

  // A note nobody is editing renders like a finished document: unfolding is
  // gated on focus, and a locked note (`editable` false) never unfolds at all.
  const revealEnabled = view.hasFocus && state.facet(EditorView.editable);

  const ancestors: NodeRange[] = [];
  const tasks = taskItems(view);

  const isRevealed = (context: RangeLike) =>
    revealEnabled && selectionTouches(selection, context.from, context.to);

  const decorate = (node: NodeRange) => {
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
        markerDecoration(node, text, { ancestorOf, tasks }).range(
          node.from,
          to,
        ),
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
      ranges.push(linkDeco.range(node.from, node.to));
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

  // `Decoration.set(..., true)` sorts (and merges) the collected ranges, so
  // the walk may emit nested ranges — a heading span, then the marks inside
  // it — in any order.
  return Decoration.set(ranges, true);
}

/** What a folded marker is drawn as (bullet, number, checkbox, nothing). */
function markerDecoration(
  node: NodeRange,
  text: string,
  {
    ancestorOf,
    tasks,
  }: {
    ancestorOf: (names: readonly string[]) => NodeRange | null;
    tasks: Set<number>;
  },
): Decoration {
  if (node.name === "TaskMarker") {
    return /[xX]/.test(text) ? TASK_CHECKED : TASK_UNCHECKED;
  }

  if (node.name === "ListMark") {
    const item = ancestorOf(["ListItem"]);
    // The checkbox replaces the bullet, so a task item gets no bullet.
    if (item && tasks.has(item.from)) return HIDDEN;
    const list = ancestorOf(["BulletList", "OrderedList"]);
    return list?.name === "OrderedList" ? orderedMarker(text) : BULLET;
  }

  return HIDDEN;
}

class LivePreviewPlugin {
  decorations: DecorationSet;
  /** Cached so a lock/unlock rebuilds even when no view update flag says so. */
  private revealEnabled: boolean;

  constructor(view: EditorView) {
    this.revealEnabled = view.hasFocus && view.state.facet(EditorView.editable);
    this.decorations = buildDecorations(view);
  }

  update(update: ViewUpdate) {
    const revealEnabled =
      update.view.hasFocus && update.view.state.facet(EditorView.editable);
    if (
      update.docChanged ||
      update.selectionSet ||
      update.viewportChanged ||
      update.focusChanged ||
      revealEnabled !== this.revealEnabled
    ) {
      this.revealEnabled = revealEnabled;
      this.decorations = buildDecorations(update.view);
    }
  }
}

/** The fold/unfold behaviour, as a CodeMirror extension. */
export const markdownLivePreviewPlugin = ViewPlugin.fromClass(
  LivePreviewPlugin,
  {
    decorations: (plugin: LivePreviewPlugin) => plugin.decorations,
  },
);

/**
 * Presentation for the live preview, deliberately kept in step with the
 * typography the capture surface applies to TipTap (Normal). The type values
 * are imported from `capture/body-typography.ts` — one source for both engines
 * (F-15 Rev 2, Task 1.2) — and the rest is expressed directly rather than as
 * utility classes so the preview's look cannot depend on Tailwind having
 * scanned this folder.
 */
export const markdownLivePreviewTheme = EditorView.theme({
  ...LIVE_PREVIEW_TYPE_RULES,
  ".cm-live-syntax": { color: "var(--muted-foreground)" },
  ".cm-live-strong": { fontWeight: "700" },
  ".cm-live-em": { fontStyle: "italic" },
  ".cm-live-strike": { textDecoration: "line-through" },
  ".cm-live-code": {
    fontFamily: LIVE_PREVIEW_CODE_TYPE.fontFamily,
    fontSize: LIVE_PREVIEW_CODE_TYPE.inlineFontSize,
    backgroundColor: "var(--muted)",
    borderRadius: "0.125rem",
    padding: "0.125rem 0.25rem",
  },
  ".cm-live-link": { color: "var(--primary)", textDecoration: "underline" },
  // These three set padding, which CodeMirror's base theme also sets on
  // `.cm-line` with the shorthand — the compound selector is what makes the
  // preview's insets win (equal-specificity rules are resolved by order, and
  // the base theme is not the loser).
  ".cm-line.cm-live-quote": {
    borderInlineStart: "2px solid var(--border)",
    paddingInlineStart: "1rem",
    color: "var(--muted-foreground)",
  },
  // List items: marker in the indent, wrapped lines aligned under the text.
  ".cm-line.cm-live-list-item": {
    paddingInlineStart: "1.5rem",
    textIndent: "-1.5rem",
  },
  // Markers are inline-blocks inside the list line, which carries the hanging
  // indent as `text-indent` — and `text-indent` inherits, so each marker has to
  // reset it or its own glyph is painted outside its box.
  ".cm-live-bullet": {
    display: "inline-block",
    inlineSize: "1.5rem",
    color: "var(--muted-foreground)",
    textIndent: "0",
  },
  ".cm-live-ordered-mark": {
    display: "inline-block",
    inlineSize: "1.5rem",
    color: "var(--muted-foreground)",
    textIndent: "0",
  },
  ".cm-live-task": {
    display: "inline-block",
    inlineSize: "1.5rem",
    textIndent: "0",
  },
  // `---` renders as the rule it means.
  ".cm-live-hr": {
    display: "inline-block",
    inlineSize: "100%",
    blockSize: "0",
    borderBlockStart: "1px solid var(--border)",
    verticalAlign: "middle",
  },
  // Fenced code: one muted block, monospace, no fence text.
  ".cm-line.cm-live-code-block": {
    backgroundColor: "var(--muted)",
    fontFamily: LIVE_PREVIEW_CODE_TYPE.fontFamily,
    fontSize: LIVE_PREVIEW_CODE_TYPE.blockFontSize,
    paddingInline: "0.75rem",
  },
  ".cm-live-code-block-first": {
    borderStartStartRadius: "0.375rem",
    borderStartEndRadius: "0.375rem",
  },
  ".cm-live-code-block-last": {
    borderEndStartRadius: "0.375rem",
    borderEndEndRadius: "0.375rem",
  },
  // GFM tables: the table is a block widget, so its look is defined by the
  // widget rules below rather than by `.cm-line` classes — the source lines it
  // replaces are not laid out at all.
  ".cm-live-table-wrapper": {
    position: "relative",
    overflowX: "auto",
    maxWidth: "100%",
    marginBlock: "0.75rem",
    outline: "none",
  },
  // The scroll container is focusable so a wide table can be scrolled by
  // keyboard, which is only discoverable if the focus ring is visible.
  ".cm-live-table-wrapper:focus-visible": {
    outline: "2px solid var(--ring)",
    outlineOffset: "2px",
    borderRadius: "0.375rem",
  },
  ".cm-live-table-toolbar": {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.125rem",
    marginBlockEnd: "0.25rem",
  },
  ".cm-live-table-tool": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "1.5rem",
    blockSize: "1.5rem",
    padding: "0",
    border: "1px solid transparent",
    borderRadius: "0.25rem",
    background: "transparent",
    color: "var(--muted-foreground)",
    cursor: "pointer",
  },
  ".cm-live-table-tool:hover": {
    backgroundColor: "var(--accent)",
    color: "var(--foreground)",
  },
  ".cm-live-table-tool:focus-visible": {
    outline: "2px solid var(--ring)",
    outlineOffset: "1px",
  },
  ".cm-live-table": {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.875rem",
  },
  ".cm-live-th": {
    border: "1px solid var(--border)",
    backgroundColor: "var(--muted)",
    padding: "0.5rem",
    fontWeight: "600",
    textAlign: "start",
  },
  ".cm-live-td": {
    border: "1px solid var(--border)",
    padding: "0.5rem",
    textAlign: "start",
  },
  // An empty cell has no line box, so the row would collapse to its padding —
  // an empty row reads as a thin sliver next to a filled one. An inline-block
  // pseudo-element gives the cell a line box (at the inherited line-height)
  // without adding content the user can select, edit, or delete.
  ".cm-live-th:empty::before, .cm-live-td:empty::before": {
    content: '""',
    display: "inline-block",
  },
  // A cell being edited shows its markdown source; the tint says "this is
  // source, not the rendered result" without moving the layout. The browser's
  // default focus ring is dropped because the tint is the focus affordance.
  ".cm-live-th:focus, .cm-live-td:focus": {
    outline: "none",
  },
  ".cm-live-cell-editing": {
    backgroundColor: "var(--accent)",
    boxShadow: "inset 0 0 0 2px var(--ring)",
    outline: "none",
  },
});
