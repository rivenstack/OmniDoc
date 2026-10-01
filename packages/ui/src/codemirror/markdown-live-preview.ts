import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";

/**
 * Delimiter tokens in Lezer markdown grammar that get collapsed when unfocused.
 */
const FORMATTING_MARKS = new Set([
  "HeaderMark",
  "EmphasisMark",
  "CodeMark",
]);

/**
 * Mark decoration that collapses markdown formatting syntax unless active.
 * Using zero font-size and opacity ensures CodeMirror text offset coordinates
 * remain synchronized during cursor movement.
 */
const hiddenMarkDeco = Decoration.mark({
  class: "cm-formatting-mark-hidden opacity-0 text-[0px] select-none inline-block w-0 overflow-hidden align-baseline",
});

/**
 * Styling decorations applied to rich content nodes in live preview.
 */
const heading1Deco = Decoration.mark({ class: "cm-live-h1 text-2xl font-semibold leading-tight inline-block" });
const heading2Deco = Decoration.mark({ class: "cm-live-h2 text-xl font-semibold leading-tight inline-block" });
const heading3Deco = Decoration.mark({ class: "cm-live-h3 text-lg font-semibold leading-tight inline-block" });
const strongDeco = Decoration.mark({ class: "cm-live-strong font-bold" });
const emDeco = Decoration.mark({ class: "cm-live-em italic" });
const inlineCodeDeco = Decoration.mark({
  class: "cm-live-code font-mono text-[0.9em] bg-muted px-1 py-0.5 rounded-xs",
});

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const selection = view.state.selection;

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node: { name: string; from: number; to: number }) => {
        const nodeFrom = node.from;
        const nodeTo = node.to;

        // Check if cursor intersects this node or its immediate line
        const isCursorTouching = selection.ranges.some((range: { from: number; to: number }) => {
          return range.from <= nodeTo && range.to >= nodeFrom;
        });

        // 1. Formatting mark collapsing (only when cursor is not touching)
        if (FORMATTING_MARKS.has(node.name)) {
          if (!isCursorTouching && nodeTo > nodeFrom) {
            builder.add(nodeFrom, nodeTo, hiddenMarkDeco);
          }
          return;
        }

        // 2. Styling decorations for formatted blocks
        if (node.name === "ATXHeading1") {
          builder.add(nodeFrom, nodeTo, heading1Deco);
        } else if (node.name === "ATXHeading2") {
          builder.add(nodeFrom, nodeTo, heading2Deco);
        } else if (node.name === "ATXHeading3") {
          builder.add(nodeFrom, nodeTo, heading3Deco);
        } else if (node.name === "StrongEmphasis") {
          builder.add(nodeFrom, nodeTo, strongDeco);
        } else if (node.name === "Emphasis") {
          builder.add(nodeFrom, nodeTo, emDeco);
        } else if (node.name === "InlineCode") {
          builder.add(nodeFrom, nodeTo, inlineCodeDeco);
        }
      },
    });
  }

  return builder.finish();
}

class LivePreviewPlugin {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = buildDecorations(view);
  }

  update(update: ViewUpdate) {
    if (
      update.docChanged ||
      update.selectionSet ||
      update.viewportChanged
    ) {
      this.decorations = buildDecorations(update.view);
    }
  }
}

/**
 * CodeMirror 6 ViewPlugin providing Obsidian-style inline live preview.
 */
export const markdownLivePreviewPlugin = ViewPlugin.fromClass(
  LivePreviewPlugin,
  {
    decorations: (v: LivePreviewPlugin) => v.decorations,
  },
);
