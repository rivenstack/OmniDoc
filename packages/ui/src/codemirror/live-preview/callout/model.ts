/**
 * The callout render model (F-15 Rev 2, plan Task 3.2).
 *
 * Drawing a callout means turning document ranges into a small tree — a title,
 * a body of paragraphs, and nested callouts — so the React renderer never has to
 * know about `Text`, offsets or the syntax tree. Everything here is pure data.
 *
 * `OBS-1.14.4-CALLOUT-010` is why nesting is a *tree* and not a flat list: the
 * parent block widget replaced the whole range, so a child has no decoration of
 * its own and must be drawn by its parent.
 */

import type { Text } from "@codemirror/state";
import {
  calloutTitle,
  outermostCallouts,
  stripQuoteDepth,
  type Callout,
  type CalloutFold,
} from "./parse";

/** What a callout can contain: a paragraph of text, or a nested callout. */
export type CalloutBodyNode =
  | { readonly kind: "paragraph"; readonly key: string; readonly text: string }
  | { readonly kind: "callout"; readonly key: string; readonly callout: CalloutNode };

/** One callout, ready to render. */
export type CalloutNode = {
  /** Stable identity — the source range — used as the React key and menu id. */
  readonly key: string;
  readonly from: number;
  readonly to: number;
  /** The normalised type, written to `data-callout` as-is (`CALLOUT-001`). */
  readonly type: string;
  /** The type text exactly as written — what the type menu compares against (`-005`). */
  readonly rawType: string;
  readonly fold: CalloutFold;
  readonly title: string;
  readonly blocks: readonly CalloutBodyNode[];
};

/** The key for a callout: its source range. */
export function calloutKey(callout: Callout): string {
  return `${callout.from}:${callout.to}`;
}

/**
 * Build the render tree for one callout.
 *
 * Only the **immediate** children are nested here; each is built recursively by
 * the same function.
 */
export function buildCalloutNode(
  doc: Text,
  callout: Callout,
  allCallouts: readonly Callout[],
): CalloutNode {
  const bodyStart = doc.lineAt(callout.markerLine.from).number + 1;
  const bodyEnd = doc.lineAt(callout.to).number;

  const children = outermostCallouts(
    allCallouts.filter(
      (candidate) =>
        candidate !== callout &&
        candidate.from > callout.markerLine.from &&
        candidate.to <= callout.to,
    ),
  ).sort((a, b) => a.from - b.from);

  const blocks: CalloutBodyNode[] = [];
  let pointer = bodyStart;

  const addParagraphs = (fromLine: number, toLine: number) => {
    for (const text of paragraphsBetween(doc, fromLine, toLine, callout.depth)) {
      blocks.push({
        kind: "paragraph",
        key: `${callout.from}:p:${blocks.length}`,
        text,
      });
    }
  };

  for (const child of children) {
    addParagraphs(pointer, doc.lineAt(child.markerLine.from).number - 1);
    blocks.push({
      kind: "callout",
      key: calloutKey(child),
      callout: buildCalloutNode(doc, child, allCallouts),
    });
    pointer = doc.lineAt(child.to).number + 1;
  }
  addParagraphs(pointer, bodyEnd);

  return {
    key: calloutKey(callout),
    from: callout.from,
    to: callout.to,
    type: callout.type,
    rawType: callout.rawType,
    fold: callout.fold,
    title: calloutTitle(callout),
    blocks,
  };
}

/**
 * The body's text between two line numbers, quote prefixes stripped and split
 * into paragraphs on blank lines.
 */
function paragraphsBetween(
  doc: Text,
  fromLine: number,
  toLine: number,
  depth: number,
): string[] {
  if (fromLine > toLine) return [];
  const paragraphs: string[] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length === 0) return;
    paragraphs.push(current.join(" "));
    current = [];
  };

  for (let number = fromLine; number <= toLine; number += 1) {
    const text = stripQuoteDepth(doc.line(number).text, depth);
    if (text.trim() === "") flush();
    else current.push(text.trim());
  }
  flush();

  return paragraphs;
}

/** Every node in a tree, the root included — used to key the handlers. */
export function walkCalloutNodes(node: CalloutNode): CalloutNode[] {
  const out: CalloutNode[] = [node];
  for (const block of node.blocks) {
    if (block.kind === "callout") out.push(...walkCalloutNodes(block.callout));
  }
  return out;
}

/**
 * What the rendered callout can ask the document to do.
 *
 * The component never touches CodeMirror: it calls these, and the widget (which
 * holds the view) dispatches. That keeps the React layer presentational and
 * testable without an editor.
 */
export type CalloutHandlers = {
  /** Select the whole raw range so the Markdown shows (`CALLOUT-004`). */
  reveal: (node: CalloutNode) => void;
  /** The menu's "Edit" item (`CALLOUT-005`). */
  edit: (node: CalloutNode) => void;
  /** The menu's type items and the palette (`-005`). */
  pickType: (node: CalloutNode, type: string) => void;
  /** The menu's "None" item (`-005`). */
  remove: (node: CalloutNode) => void;
};
