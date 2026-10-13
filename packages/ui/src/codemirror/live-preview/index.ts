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
 * - `taxonomy.ts` / `reveal.ts` / `policy.ts` — the construct vocabulary, the
 *   reveal predicate and the rebuild policy (Tasks 2.1–2.3).
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
import {
  createRebuildScheduler,
  shouldMapOnly,
  treeCoversViewport,
  type RebuildGuard,
  type RebuildScheduler,
} from "./policy";

/**
 * The preview plugin.
 *
 * Its update path is the artifact's rebuild policy (`REVEAL-006`, `REVEAL-010`)
 * rather than "rebuild on any change":
 *
 * | Situation | What happens |
 * |---|---|
 * | Pointer down / composing / tree short of the viewport | the set is **mapped** only |
 * | Any transaction (document, selection, viewport, lock) | **synchronous** rebuild |
 * | Focus or blur | rebuild after **10 ms** |
 * | Pointer release | rebuild after **50 ms** |
 * | Composition end | rebuild after **100 ms** |
 * | Touch (mobile) drag end | rebuild after **700 ms** |
 * | Caret nudge after a selection change | rebuild after **0 ms** |
 *
 * The delays are why a caret that leaves a construct does not always re-render
 * instantly. Rebuilding while the pointer is down would move text under the
 * cursor, and rebuilding mid-composition would disturb the IME — hence the
 * three guards.
 */
class LivePreviewPlugin {
  decorations: DecorationSet;
  /** Cached so a lock/unlock rebuilds even when no view update flag says so. */
  private revealEnabled: boolean;
  private readonly scheduler: RebuildScheduler = createRebuildScheduler();
  private pointerDown = false;
  /** False once the view is destroyed — a queued rebuild must not run then. */
  private alive = true;

  constructor(private readonly view: EditorView) {
    this.revealEnabled = revealEnabledIn(view);
    this.decorations = buildDecorations(view);
  }

  update(update: ViewUpdate) {
    const revealEnabled = revealEnabledIn(update.view);
    const guard: RebuildGuard = {
      pointerDown: this.pointerDown,
      composing: update.view.composing,
      treeCoversViewport: treeCoversViewport(update.view),
    };

    // `REVEAL-006`: while a guard holds the set is only mapped through the
    // change. Nothing is recomputed, so nothing moves under the pointer and no
    // IME is disturbed.
    if (shouldMapOnly(guard)) {
      if (update.docChanged) this.decorations = this.decorations.map(update.changes);
      this.revealEnabled = revealEnabled;
      return;
    }

    const structural =
      update.docChanged ||
      update.selectionSet ||
      update.viewportChanged ||
      revealEnabled !== this.revealEnabled;

    this.revealEnabled = revealEnabled;

    if (structural) {
      // `REVEAL-010`: the transaction path is synchronous, and supersedes any
      // deferred rebuild that was still waiting.
      this.scheduler.cancel();
      this.rebuild();
      if (update.selectionSet) {
        // The caret nudge: a deferred follow-up once the caret has settled.
        this.scheduler.schedule("caretNudge", () => this.rebuild());
      }
      return;
    }

    if (update.focusChanged) {
      this.scheduler.schedule("focusBlur", () => this.rebuild());
    }
  }

  /** A pointer went down inside the editor: stop rebuilding until it is up. */
  pointerDownStarted() {
    this.pointerDown = true;
  }

  /** The pointer is up: rebuild once the click gesture has settled (50 ms). */
  pointerReleased() {
    this.pointerDown = false;
    this.scheduler.schedule("pointerRelease", () => this.rebuild());
  }

  /** A touch drag ended: the artifact waits 700 ms before re-hiding. */
  dragEnded() {
    this.pointerDown = false;
    this.scheduler.schedule("mobileDragEnd", () => this.rebuild());
  }

  /** Composition finished: rebuild once the IME has settled (100 ms). */
  compositionEnded() {
    this.scheduler.schedule("compositionEnd", () => this.rebuild());
  }

  destroy() {
    this.alive = false;
    this.scheduler.cancel();
  }

  private rebuild() {
    if (!this.alive) return;
    this.decorations = buildDecorations(this.view);
  }
}

/** Unfolding is gated on focus, and a locked note (`editable` false) never unfolds. */
function revealEnabledIn(view: EditorView): boolean {
  return view.hasFocus && view.state.facet(EditorView.editable);
}

/** The fold/unfold behaviour, as a CodeMirror extension. */
export const markdownLivePreviewPlugin = ViewPlugin.fromClass(
  LivePreviewPlugin,
  {
    decorations: (plugin: LivePreviewPlugin) => plugin.decorations,
    // The pointer and composition triggers. Returning nothing (rather than
    // `true`) leaves the events to CodeMirror's own handling — these listeners
    // only record state.
    eventHandlers: {
      mousedown(this: LivePreviewPlugin) {
        this.pointerDownStarted();
      },
      mouseup(this: LivePreviewPlugin) {
        this.pointerReleased();
      },
      touchend(this: LivePreviewPlugin) {
        this.dragEnded();
      },
      compositionend(this: LivePreviewPlugin) {
        this.compositionEnded();
      },
    },
  },
);

export {
  HEADING_PATTERN,
  HIDDEN_BLOCK,
  HIDDEN_DELIMITER,
  HIDDEN_MARKER,
  HIGHLIGHT_COLOURS,
  HIGHLIGHT_EMOJI,
  HIGHLIGHT_MARKER,
  buildDecorations,
  highlightColourOf,
  highlightMark,
  renderedLinkMark,
  scanHighlights,
  transparentMark,
  unresolvedMark,
} from "./decorations";
export type { HighlightColour, HighlightSpan } from "./decorations";
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
  QUOTE_BORDER,
  QUOTE_BORDER_GLYPH,
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
