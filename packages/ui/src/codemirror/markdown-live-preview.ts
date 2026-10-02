import { syntaxTree } from "@codemirror/language";
import {
  EditorState,
  StateEffect,
  StateField,
  type EditorSelection,
  type Extension,
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

export function parseMarkdownTable(text: string): {
  alignments: Array<"left" | "center" | "right">;
  headers: string[];
  rows: string[][];
} | null {
  const lines = text
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  const parseRow = (line: string): string[] => {
    let content = line;
    if (content.startsWith("|")) content = content.slice(1);
    if (content.endsWith("|")) content = content.slice(0, -1);
    return content.split("|").map((c) => c.trim());
  };

  const headers = parseRow(lines[0]);
  const delimiterCells = parseRow(lines[1]);
  const alignments = delimiterCells.map((cell) => {
    const left = cell.startsWith(":");
    const right = cell.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    return "left";
  });

  const rows = lines.slice(2).map(parseRow);
  return { alignments, headers, rows };
}

export function serializeMarkdownTable(
  headers: string[],
  alignments: Array<"left" | "center" | "right">,
  rows: string[][],
): string {
  const alignMap = {
    left: ":---",
    center: ":---:",
    right: "---:",
  };
  const delimiter = headers.map((_, i) => alignMap[alignments[i]] || "---");
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${delimiter.join(" | ")} |`,
    ...rows.map((r) => {
      const cells = headers.map((_, i) => r[i] ?? "");
      return `| ${cells.join(" | ")} |`;
    }),
  ];
  return lines.join("\n");
}

export function cellDOMToMarkdown(el: HTMLElement): string {
  let md = "";
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      md += child.textContent ?? "";
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const elem = child as HTMLElement;
      const tag = elem.tagName.toLowerCase();
      const inner = cellDOMToMarkdown(elem);
      if (tag === "strong" || tag === "b") {
        md += `**${inner}**`;
      } else if (tag === "em" || tag === "i") {
        md += `*${inner}*`;
      } else if (tag === "code") {
        md += `\`${inner}\``;
      } else if (tag === "del" || tag === "s") {
        md += `~~${inner}~~`;
      } else if (tag === "a") {
        const href = elem.getAttribute("href") ?? "";
        md += `[${inner}](${href})`;
      } else {
        md += inner;
      }
    }
  }
  return md.trim();
}

export function renderCellDOM(cellText: string, container: HTMLElement): void {
  const regex =
    /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cellText)) !== null) {
    if (match.index > lastIndex) {
      container.appendChild(
        document.createTextNode(cellText.slice(lastIndex, match.index)),
      );
    }
    const token = match[0];
    if (token.startsWith("`") && token.endsWith("`")) {
      const code = document.createElement("code");
      code.className = "cm-live-code";
      code.textContent = token.slice(1, -1);
      container.appendChild(code);
    } else if (token.startsWith("**") && token.endsWith("**")) {
      const strong = document.createElement("strong");
      strong.className = "cm-live-strong";
      strong.textContent = token.slice(2, -2);
      container.appendChild(strong);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      const em = document.createElement("em");
      em.className = "cm-live-em";
      em.textContent = token.slice(1, -1);
      container.appendChild(em);
    } else if (token.startsWith("~~") && token.endsWith("~~")) {
      const del = document.createElement("del");
      del.className = "cm-live-strike";
      del.textContent = token.slice(2, -2);
      container.appendChild(del);
    } else if (token.startsWith("[") && token.includes("](")) {
      const endText = token.indexOf("](");
      const label = token.slice(1, endText);
      const url = token.slice(endText + 2, -1);
      const a = document.createElement("a");
      a.className = "cm-live-link";
      a.href = url;
      a.textContent = label;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      container.appendChild(a);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < cellText.length) {
    container.appendChild(document.createTextNode(cellText.slice(lastIndex)));
  }
}

export class TablePreviewWidget extends WidgetType {
  constructor(
    private readonly markdown: string,
    private readonly from: number,
    private readonly to: number,
  ) {
    super();
  }

  eq(other: TablePreviewWidget) {
    return (
      other.markdown === this.markdown &&
      other.from === this.from &&
      other.to === this.to
    );
  }

  ignoreEvent() {
    return true;
  }

  toDOM(view: EditorView) {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-live-table-wrapper tableWrapper";
    wrapper.tabIndex = 0;
    wrapper.setAttribute("role", "group");
    wrapper.setAttribute("aria-label", "Table preview");

    const parsed = parseMarkdownTable(this.markdown);
    if (!parsed) {
      wrapper.textContent = this.markdown;
      return wrapper;
    }

    const table = document.createElement("table");
    table.className = "cm-live-table";

    const headerCells: HTMLElement[] = [];
    const bodyCellMatrix: HTMLElement[][] = [];

    const syncToEditor = () => {
      const currentHeaders = headerCells.map((th) => cellDOMToMarkdown(th));
      const currentRows = bodyCellMatrix.map((row) =>
        row.map((td) => cellDOMToMarkdown(td)),
      );
      const newMarkdown = serializeMarkdownTable(
        currentHeaders,
        parsed.alignments,
        currentRows,
      );
      if (newMarkdown !== this.markdown) {
        view.dispatch({
          changes: { from: this.from, to: this.to, insert: newMarkdown },
        });
      }
    };

    const attachCellEvents = (cell: HTMLElement, isHeader: boolean) => {
      cell.contentEditable = "true";
      cell.spellcheck = false;

      cell.addEventListener("blur", () => {
        const md = cellDOMToMarkdown(cell);
        cell.innerHTML = "";
        renderCellDOM(md, cell);
        syncToEditor();
      });

      cell.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Tab" && !e.shiftKey) {
          const allCells = Array.from(
            table.querySelectorAll<HTMLElement>("th, td"),
          );
          const currentIndex = allCells.indexOf(cell);
          if (currentIndex === allCells.length - 1) {
            e.preventDefault();
            // Add a new row on Tab from the last cell
            const newRow: HTMLElement[] = [];
            const tr = document.createElement("tr");
            for (let i = 0; i < parsed.headers.length; i++) {
              const td = document.createElement("td");
              td.className = "cm-live-td";
              if (parsed.alignments[i]) {
                td.style.textAlign = parsed.alignments[i];
              }
              attachCellEvents(td, false);
              tr.appendChild(td);
              newRow.push(td);
            }
            tbody.appendChild(tr);
            bodyCellMatrix.push(newRow);
            syncToEditor();
            newRow[0]?.focus();
          } else if (currentIndex >= 0 && currentIndex < allCells.length - 1) {
            e.preventDefault();
            allCells[currentIndex + 1]?.focus();
          }
        } else if (e.key === "Tab" && e.shiftKey) {
          const allCells = Array.from(
            table.querySelectorAll<HTMLElement>("th, td"),
          );
          const currentIndex = allCells.indexOf(cell);
          if (currentIndex > 0) {
            e.preventDefault();
            allCells[currentIndex - 1]?.focus();
          }
        } else if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          const tr = cell.parentElement;
          const nextRow = tr?.nextElementSibling;
          if (nextRow) {
            const cellIndex = Array.from(tr?.children ?? []).indexOf(cell);
            const target = nextRow.children[cellIndex] as
              | HTMLElement
              | undefined;
            target?.focus();
          } else if (!isHeader) {
            // Enter on the last row adds a new row
            const newRow: HTMLElement[] = [];
            const newTr = document.createElement("tr");
            for (let i = 0; i < parsed.headers.length; i++) {
              const td = document.createElement("td");
              td.className = "cm-live-td";
              if (parsed.alignments[i]) {
                td.style.textAlign = parsed.alignments[i];
              }
              attachCellEvents(td, false);
              newTr.appendChild(td);
              newRow.push(td);
            }
            tbody.appendChild(newTr);
            bodyCellMatrix.push(newRow);
            syncToEditor();
            const cellIndex = Array.from(tr?.children ?? []).indexOf(cell);
            newRow[cellIndex]?.focus();
          }
        }
      });
    };

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    for (let i = 0; i < parsed.headers.length; i++) {
      const th = document.createElement("th");
      th.className = "cm-live-th";
      if (parsed.alignments[i]) {
        th.style.textAlign = parsed.alignments[i];
      }
      renderCellDOM(parsed.headers[i], th);
      attachCellEvents(th, true);
      headerRow.appendChild(th);
      headerCells.push(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const row of parsed.rows) {
      const tr = document.createElement("tr");
      const rowCells: HTMLElement[] = [];
      for (let i = 0; i < parsed.headers.length; i++) {
        const td = document.createElement("td");
        td.className = "cm-live-td";
        if (parsed.alignments[i]) {
          td.style.textAlign = parsed.alignments[i];
        }
        renderCellDOM(row[i] ?? "", td);
        attachCellEvents(td, false);
        tr.appendChild(td);
        rowCells.push(td);
      }
      tbody.appendChild(tr);
      bodyCellMatrix.push(rowCells);
    }
    table.appendChild(tbody);
    wrapper.appendChild(table);

    return wrapper;
  }
}

const tableHeaderLine = Decoration.line({
  class: "cm-live-table-header",
});
const tableRowLine = Decoration.line({
  class: "cm-live-table-row",
});
const tableDelimiterLine = Decoration.line({
  class: "cm-live-table-delimiter",
});
const tablePipeDeco = Decoration.mark({
  class: "cm-live-table-pipe",
});
const TABLE_DELIMITER_RULE = Decoration.replace({
  widget: new MarkerWidget("cm-live-table-hr", ""),
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

function buildTablePreviewDecorations(state: EditorState): DecorationSet {
  const ranges: Range<Decoration>[] = [];

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === "Table") {
        const text = state.doc.sliceString(node.from, node.to);
        const parsed = parseMarkdownTable(text);
        if (parsed) {
          ranges.push(
            Decoration.replace({
              widget: new TablePreviewWidget(text, node.from, node.to),
              block: true,
            }).range(node.from, node.to),
          );
        }
        return false;
      }
    },
  });

  return Decoration.set(ranges, true);
}

export const tableLivePreviewField = StateField.define<DecorationSet>({
  create(state) {
    return buildTablePreviewDecorations(state);
  },
  update(decorations, tr) {
    if (tr.docChanged) {
      return buildTablePreviewDecorations(tr.state);
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export const tableLivePreview: Extension = [tableLivePreviewField];

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

      const to = rule.swallowTrailingSpace
        ? markerEnd(doc, node.to)
        : node.to;
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
    } else if (node.name === "TableHeader") {
      const line = doc.lineAt(node.from);
      ranges.push(tableHeaderLine.range(line.from));
    } else if (node.name === "TableRow") {
      const line = doc.lineAt(node.from);
      ranges.push(tableRowLine.range(line.from));
    } else if (node.name === "TableDelimiter") {
      const inRow = ancestors.some(
        (a) => a.name === "TableHeader" || a.name === "TableRow",
      );
      const line = doc.lineAt(node.from);
      if (inRow) {
        if (isRevealed(line)) {
          ranges.push(SYNTAX.range(node.from, node.to));
        } else {
          ranges.push(tablePipeDeco.range(node.from, node.to));
        }
      } else {
        ranges.push(tableDelimiterLine.range(line.from));
        if (isRevealed(line)) {
          ranges.push(SYNTAX.range(node.from, node.to));
        } else {
          ranges.push(TABLE_DELIMITER_RULE.range(node.from, node.to));
        }
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
 * typography the capture surface applies to TipTap (Normal). Values are
 * expressed directly rather than as utility classes so the preview's look
 * cannot depend on Tailwind having scanned this folder.
 */
export const markdownLivePreviewTheme = EditorView.theme({
  ".cm-live-syntax": { color: "var(--muted-foreground)" },
  ".cm-live-h1": { fontSize: "1.5rem", lineHeight: "2rem", fontWeight: "500" },
  ".cm-live-h2": {
    fontSize: "1.25rem",
    lineHeight: "1.75rem",
    fontWeight: "500",
  },
  ".cm-live-h3": {
    fontSize: "1.125rem",
    lineHeight: "1.75rem",
    fontWeight: "500",
  },
  ".cm-live-strong": { fontWeight: "700" },
  ".cm-live-em": { fontStyle: "italic" },
  ".cm-live-strike": { textDecoration: "line-through" },
  ".cm-live-code": {
    fontFamily: "var(--font-geist-mono), monospace",
    fontSize: "0.9em",
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
    fontFamily: "var(--font-geist-mono), monospace",
    fontSize: "0.875rem",
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
  // GFM tables: monospace alignment, muted header row, clean delimiter
  ".cm-line.cm-live-table-header": {
    backgroundColor: "var(--muted)",
    fontFamily: "var(--font-geist-mono), monospace",
    fontSize: "0.875rem",
    fontWeight: "600",
    paddingInline: "0.5rem",
  },
  ".cm-line.cm-live-table-row": {
    fontFamily: "var(--font-geist-mono), monospace",
    fontSize: "0.875rem",
    paddingInline: "0.5rem",
  },
  ".cm-line.cm-live-table-delimiter": {
    lineHeight: "1rem",
    paddingInline: "0.5rem",
  },
  ".cm-live-table-pipe": {
    color: "var(--border)",
  },
  ".cm-live-table-hr": {
    display: "block",
    inlineSize: "100%",
    blockSize: "0",
    borderBlockStart: "1px solid var(--border)",
    verticalAlign: "middle",
  },
  // Formatted table preview (Obsidian-style live preview when unfocused)
  ".cm-live-table-wrapper": {
    overflowX: "auto",
    maxWidth: "100%",
    marginBlock: "0.75rem",
    cursor: "pointer",
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
});

