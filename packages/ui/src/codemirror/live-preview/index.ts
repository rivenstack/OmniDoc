/**
 * The live preview (F-15 Rev 2, Task 1.5).
 *
 * The remaining half of the old 1,722-line `markdown-live-preview.ts` module,
 * split into its parts with no logic change:
 *
 * - `decorations.ts` — the syntax-tree walk and the unfold rules.
 * - `widgets.ts` — the marker glyphs and line decorations it emits.
 * - `theme.ts` — the preview's presentation.
 * - `table/**` — the GFM table block widget (Task 1.4).
 *
 * The public names are unchanged, so callers see the same module as before.
 */

import {
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { buildDecorations } from "./decorations";

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

export { buildDecorations } from "./decorations";
export { markdownLivePreviewTheme } from "./theme";
export {
  WHOLE_LINE_CONSTRUCTS,
  accumulateSpan,
  constructSpan,
  focusedRanges,
  isRevealed,
  isWholeLineConstruct,
  revealContext,
  selectionTouches,
  touches,
  touchesAny,
  wholeLineSpan,
} from "./reveal";
export type { RevealContext } from "./reveal";
export {
  CONSTRUCT_REGIONS,
  INLINE_FORMATTING_KINDS,
  LINK_LIKE_KINDS,
  buildRegionIndex,
  classifyRegion,
  regionOfNode,
} from "./taxonomy";
export type {
  ConstructRegion,
  ExclusionKind,
  InlineFormattingKind,
  LinkLikeKind,
  MarkedRegion,
  RegionIndex,
  RegionRange,
} from "./taxonomy";
export {
  codeBlockFirstLine,
  codeBlockLastLine,
  codeBlockLine,
  codeBlockOnlyLine,
  listItemLine,
  markerDecoration,
  markerEnd,
  quoteLine,
  taskItems,
} from "./widgets";
export type { NodeRange } from "./widgets";
export {
  TABLE_COMPLETE_MS,
  TABLE_IDLE_FLUSH_MS,
  TablePreviewWidget,
  findTableBlocks,
  parseMarkdownTable,
  serializeMarkdownTable,
  tableLivePreview,
} from "./table";
