/**
 * The live preview's marker and line decorations (F-15 Rev 2, Task 1.5).
 *
 * Moved verbatim out of `markdown-live-preview.ts` — a pure move, no logic
 * change. These are the decorations that *draw* something: the bullet, number
 * and checkbox glyphs that stand in for a folded marker, and the line
 * decorations for list items, quotes and fenced code.
 */

import { syntaxTree } from "@codemirror/language";
import type { Text } from "@codemirror/state";
import { Decoration, WidgetType, type EditorView } from "@codemirror/view";

/** A syntax-tree node's name and range. */
export type NodeRange = { name: string; from: number; to: number };

/**
 * A folded token: nothing is rendered in its place.
 *
 * One of the three empty replace singletons `OBS-1.14.4-REVEAL-004` describes.
 * Replace decorations are compared by identity when the range set is diffed, so
 * three distinct singletons let the builder tell three kinds of hidden range
 * apart while keeping that diff cheap. This is the *marker* kind — a line
 * marker folded away with no glyph in its place (a task item's bullet, a folded
 * comment delimiter).
 */
export const HIDDEN_MARKER = Decoration.replace({});

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
export { RULE };

/**
 * The blockquote border glyph (`OBS-1.14.4-REVEAL-007`).
 *
 * The artifact's border is a **widget** whose content is the literal `>` — a
 * real character produced by a decoration, not the document's own marker text.
 * It carries a transparency class because the glyph is not meant to be read:
 * what you see is the border the class draws in its place, so the rendered
 * result is visually identical to a styled `>` while the source range stays
 * owned by a decoration.
 */
const QUOTE_BORDER = Decoration.replace({
  widget: new MarkerWidget("cm-live-quote-border cm-live-transparent", ">"),
});
export { QUOTE_BORDER };

/** The literal glyph the quote-border widget draws (`REVEAL-007`). */
export const QUOTE_BORDER_GLYPH = ">";

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

export const listItemLine = Decoration.line({ class: "cm-live-list-item" });
export const quoteLine = Decoration.line({ class: "cm-live-quote" });
export const codeBlockLine = Decoration.line({ class: "cm-live-code-block" });
export const codeBlockFirstLine = Decoration.line({
  class: "cm-live-code-block cm-live-code-block-first",
});
export const codeBlockLastLine = Decoration.line({
  class: "cm-live-code-block cm-live-code-block-last",
});
export const codeBlockOnlyLine = Decoration.line({
  class: "cm-live-code-block cm-live-code-block-first cm-live-code-block-last",
});

/** Whitespace that belongs to a marker rather than to the content. */
export function markerEnd(doc: Text, from: number): number {
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
export function taskItems(view: EditorView): Set<number> {
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

/** What a folded marker is drawn as (bullet, number, checkbox, nothing). */
export function markerDecoration(
  node: NodeRange,
  text: string,
  {
    ancestorOf,
    tasks,
  }: {
    ancestorOf: (names: readonly string[]) => NodeRange | null;
    tasks: Set<number>;
  },
  /**
   * The decoration for a token that is folded with nothing in its place. The
   * caller picks the *kind* (`REVEAL-004`): a delimiter token passes
   * `HIDDEN_DELIMITER`, a marker token the marker singleton.
   */
  hidden: Decoration,
): Decoration {
  // A quote marker is drawn as the artifact's border glyph, never hidden: the
  // `>` is what the border is made of (`REVEAL-007`).
  if (node.name === "QuoteMark") return QUOTE_BORDER;

  if (node.name === "TaskMarker") {
    return /[xX]/.test(text) ? TASK_CHECKED : TASK_UNCHECKED;
  }

  if (node.name === "ListMark") {
    const item = ancestorOf(["ListItem"]);
    // The checkbox replaces the bullet, so a task item gets no bullet — and
    // that hidden bullet is a *marker*, not a delimiter.
    if (item && tasks.has(item.from)) return HIDDEN_MARKER;
    const list = ancestorOf(["BulletList", "OrderedList"]);
    return list?.name === "OrderedList" ? orderedMarker(text) : BULLET;
  }

  return hidden;
}
