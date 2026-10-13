/**
 * The editor's extension factory and its compartments (F-15 Rev 2, Task 1.3).
 *
 * The `CodeMirrorEditor` wrapper used to build its extension array inline, which
 * left two problems:
 *
 * 1. **A settings change rebuilt the view.** Recreating an `EditorState` drops
 *    the caret, the scroll position and the undo history. The artifact
 *    reconfigures its live keys instead (`SET-002`), so OmniDoc does too.
 * 2. **The view could not be told what it was.** Nothing type-checked the
 *    extension list, and the same array was spelled out twice (once for
 *    Markdown mode, once for Text).
 *
 * This module owns one factory and five compartments — `editing`, `settings`,
 * `livePreview`, `keymap`, `language`. A `Compartment` is a labelled slot
 * CodeMirror can re-fill on a running state via `compartment.reconfigure(...)`,
 * which is a *transaction*: the document, the selection and the history all
 * survive it.
 *
 * ## What each compartment carries
 *
 * | Compartment | Carries | Reconfigured when |
 * |---|---|---|
 * | `editing` | read-only facets + ARIA content attributes | the surface's lock toggles |
 * | `settings` | `EditorState.tabSize`, `spellcheck` (`SET-002`) | a setting changes |
 * | `livePreview` | the preview plugin, table widget and theme | Markdown mode or `livePreview` toggles |
 * | `keymap` | the curated binding set | the host swaps bindings |
 * | `language` | the Markdown language | the host swaps the language |
 *
 * ## What is deliberately *not* in a compartment
 *
 * `history()` sits outside every compartment. A mode switch reconfigures
 * `language` and `livePreview`, and an undo stack that lived beside them would
 * be rebuilt with them — the artifact's history survives mode switches
 * (`HIST-002`, Task 5.6), so the extension that owns it must not be a
 * compartment's content.
 *
 * ## Live settings still to land
 *
 * `SET-002` names eight live keys. `tabSize` and `spellcheck` take effect here;
 * the rest are owned by their behaviour tasks and will be added to
 * {@link settingsExtensions} when they land: `useTab` + `autoPair*` (Task 4.1,
 * 4.9), `smartIndentList` (Task 4.8), `rightToLeft` (Task 4.10), `vimMode`
 * (gated — decision 9).
 */

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { bracketMatching } from "@codemirror/language";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { DEFAULT_EDITOR_SETTINGS, type EditorSettings } from "./editor-settings";
import {
  markdownLivePreviewPlugin,
  markdownLivePreviewTheme,
  tableLivePreview,
} from "./markdown-live-preview";

/** The two engines CodeMirror drives. Normal mode is TipTap's, not this one's. */
export type EditorEngineMode = "text" | "markdown";

/** The five slots a running editor can be reconfigured through. */
export type EditorCompartments = {
  readonly editing: Compartment;
  readonly settings: Compartment;
  readonly livePreview: Compartment;
  readonly keymap: Compartment;
  readonly language: Compartment;
};

/**
 * Create one compartment per slot.
 *
 * Compartments are state-shaped, not module-global: two editors on screen must
 * not share a slot. Call this once per editor instance.
 */
export function createEditorCompartments(): EditorCompartments {
  return {
    editing: new Compartment(),
    settings: new Compartment(),
    livePreview: new Compartment(),
    keymap: new Compartment(),
    language: new Compartment(),
  };
}

/** Everything the factory needs to build an editor's extension set. */
export type EditorExtensionOptions = {
  readonly mode: EditorEngineMode;
  readonly settings?: EditorSettings;
  /** The capture surface's lock: the document is untouched and not editable. */
  readonly readOnly?: boolean;
  /** Accessible name for the editing region. */
  readonly bodyLabel?: string;
};

/**
 * The lock, as facets.
 *
 * Two facets on purpose: `EditorState.readOnly` stops command/API changes and
 * drag-drop, `EditorView.editable` stops the DOM from being contenteditable at
 * all. The ARIA attributes describe which of the two is in force.
 */
export function editingExtensions(
  readOnly: boolean,
  bodyLabel: string,
): Extension {
  return [
    EditorState.readOnly.of(readOnly),
    EditorView.editable.of(!readOnly),
    EditorView.contentAttributes.of({
      role: "textbox",
      "aria-multiline": "true",
      "aria-label": bodyLabel,
      "aria-readonly": readOnly ? "true" : "false",
    }),
  ];
}

/**
 * The settings slice (`SET-002`).
 *
 * `EditorState.tabSize` is the width CodeMirror lays tabs out at — it writes the
 * value onto the content element's `tab-size` property, so the reconfigure is
 * visible immediately. `spellcheck` overrides CodeMirror's own `false` default
 * (the facet's attributes are applied on top of it).
 */
export function settingsExtensions(settings: EditorSettings): Extension {
  return [
    EditorState.tabSize.of(settings.tabSize),
    EditorView.contentAttributes.of({
      spellcheck: settings.spellcheck ? "true" : "false",
    }),
  ];
}

/**
 * The live-preview slice.
 *
 * Markdown mode *and* `livePreview` both have to be on: the setting is the
 * artifact's own switch for rendering the preview rather than raw source, so
 * `mode: "markdown"` with `livePreview: false` is a legitimate configuration —
 * the source is Markdown, it just is not decorated.
 */
export function livePreviewExtensions(
  mode: EditorEngineMode,
  settings: EditorSettings,
): Extension {
  if (mode !== "markdown" || !settings.livePreview) return [];
  return [tableLivePreview, markdownLivePreviewPlugin, markdownLivePreviewTheme];
}

/**
 * The curated keymap slot.
 *
 * Task 6.2 replaces the contents with the artifact-parity binding set; the
 * compartment exists now so that swap is a reconfigure. `Escape` blurring the
 * editor is the surface's own behaviour (leaving the field on Escape), kept as
 * the last binding so a future `Escape` binding can take precedence.
 */
export function keymapExtensions(): Extension {
  return keymap.of([
    ...defaultKeymap,
    ...historyKeymap,
    {
      key: "Escape",
      run: (view: EditorView) => {
        view.dom.blur();
        return true;
      },
    },
  ]);
}

/**
 * The language slot: GFM Markdown, in **both** modes.
 *
 * Text mode is the same document rendered as raw source — not a different
 * language — so it parses the same grammar and simply carries no preview
 * decorations (and no Prism-style highlighting; D-9). The compartment exists so
 * a later task can swap the language without rebuilding the view.
 *
 * GFM matters here: with plain CommonMark the parser produced no syntax node for
 * `~~strike~~`, so the preview could not fold it.
 */
export function languageExtensions(): Extension {
  return markdown({ base: markdownLanguage });
}

/**
 * Build the extension set for a new editor.
 *
 * The caller keeps the `compartments` it passed in and uses them for every later
 * reconfiguration — that is what makes a settings change a transaction rather
 * than a rebuild.
 */
export function editorExtensions(
  options: EditorExtensionOptions,
  compartments: EditorCompartments,
): Extension[] {
  const {
    mode,
    settings = DEFAULT_EDITOR_SETTINGS,
    readOnly = false,
    bodyLabel = "Note body",
  } = options;

  return [
    EditorView.lineWrapping,
    bracketMatching(),
    // Outside every compartment: see the header — a mode switch must not drop
    // the undo history (HIST-002).
    history(),
    compartments.keymap.of(keymapExtensions()),
    compartments.language.of(languageExtensions()),
    compartments.settings.of(settingsExtensions(settings)),
    compartments.editing.of(editingExtensions(readOnly, bodyLabel)),
    compartments.livePreview.of(livePreviewExtensions(mode, settings)),
  ];
}
