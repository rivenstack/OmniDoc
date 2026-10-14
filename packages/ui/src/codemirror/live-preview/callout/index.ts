/**
 * Callouts in Live Preview (F-15 Rev 2, plan Task 3.2).
 *
 * A callout is a blockquote with a `[!type]` marker, so — exactly like a table —
 * it is replaced by **one block widget** while the selection does not touch it
 * (`OBS-1.14.4-CALLOUT-004`). Block decorations may not come from a view plugin,
 * so the replace set lives in a `StateField` provided through
 * `EditorView.decorations.from(field)`.
 *
 * ## Focus, and why there is a second field
 *
 * `-004` says the touch test only counts **while the editor has focus**: an
 * unfocused editor keeps the rendered widget even if the caret is parked inside a
 * callout. A `StateField` cannot ask a view whether it has focus, so a tiny
 * boolean field is kept in step through `EditorView.focusChangeEffect` and read
 * by the decoration builder. The preview plugin uses `view.hasFocus` for the same
 * reason (`REVEAL-002`); both agree because both end up testing the same thing.
 *
 * The predicate itself is the shared inclusive one (`-004` quotes it verbatim:
 * `range.from <= construct.to && range.to >= construct.from`), and there is **no
 * partial reveal**: the marker, the fold marker and the title are all-or-nothing
 * with the block (plan §0.4 negative 5).
 */

import {
  StateEffect,
  StateField,
  type EditorState,
  type Extension,
  type Range,
} from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";
import { isRevealed, revealContext } from "../reveal";
import { outermostCallouts, scanCallouts, type Callout } from "./parse";
import { CalloutPreviewWidget } from "./render";

export * from "./parse";
export * from "./types";
export * from "./model";
export * from "./menu";
export * from "./commands";
export * from "./icons";
export * from "./block";
export * from "./palette";
export * from "./render";

/** Focus, as a field: a `StateField` cannot read `view.hasFocus`. */
const setCalloutFocus = StateEffect.define<boolean>();

const calloutFocusField = StateField.define<boolean>({
  create: () => false,
  update(focused, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setCalloutFocus)) return effect.value;
    }
    return focused;
  },
});

/**
 * The callouts in a state, and which of them are currently replaced.
 *
 * Computed together so the decoration walk and the widget field agree *exactly*
 * on the replaced set: if they disagreed for a moment — the focus field lags a
 * microtask behind `view.hasFocus` — a block replace and an inline mark could
 * land on the same text and CodeMirror would reject the overlapping set.
 */
export function calloutState(state: EditorState): {
  callouts: Callout[];
  replaced: Callout[];
} {
  const callouts = scanCallouts(state.doc);
  const focused =
    (state.field(calloutFocusField, false) ?? false) &&
    state.facet(EditorView.editable) &&
    !state.readOnly;
  const reveal = revealContext(state.selection, focused);
  return {
    callouts,
    replaced: outermostCallouts(callouts).filter((callout) => !isRevealed(reveal, callout)),
  };
}

/** The callouts that are currently replaced by a widget (not touched, focused). */
export function replacedCallouts(state: EditorState): Callout[] {
  return calloutState(state).replaced;
}

function buildCalloutDecorations(state: EditorState): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const editable = state.facet(EditorView.editable) && !state.readOnly;

  for (const callout of replacedCallouts(state)) {
    const text = state.doc.sliceString(callout.from, callout.to);
    ranges.push(
      Decoration.replace({
        widget: new CalloutPreviewWidget(text, callout.from, callout.to, editable),
        block: true,
      }).range(callout.from, callout.to),
    );
  }

  return Decoration.set(ranges, true);
}

const calloutDecorations = StateField.define<DecorationSet>({
  create: (state) => buildCalloutDecorations(state),
  update(decorations, transaction) {
    if (
      transaction.docChanged ||
      transaction.selection !== undefined ||
      transaction.reconfigured ||
      transaction.effects.some((effect) => effect.is(setCalloutFocus))
    ) {
      return buildCalloutDecorations(transaction.state);
    }
    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

/**
 * The callout extension: the focus field, the focus wiring and the block widgets,
 * in that order (the decoration field reads the focus field).
 */
export const calloutLivePreview: Extension = [
  calloutFocusField,
  EditorView.focusChangeEffect.of((_state, focusing) => setCalloutFocus.of(focusing)),
  calloutDecorations,
];
