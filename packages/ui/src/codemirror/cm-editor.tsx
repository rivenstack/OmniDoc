"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  EditorSelection,
  EditorState,
  type Extension,
} from "@codemirror/state";
import { EditorView, type ViewUpdate } from "@codemirror/view";
import { cn } from "../lib/utils";
import {
  BODY_CODE_FONT_FAMILY,
  BODY_TYPE_SCALE,
} from "../capture/body-typography";
import {
  createEditorCompartments,
  editingExtensions,
  editorExtensions,
  livePreviewExtensions,
  settingsExtensions,
  type EditorEngineMode,
} from "./editor-extensions";
import {
  DEFAULT_EDITOR_SETTINGS,
  type EditorSettings,
} from "./editor-settings";

export type CodeMirrorEditorHandle = {
  focus: () => void;
  wrapSelection: (prefix: string, suffix?: string) => void;
  prefixLine: (prefix: string) => void;
  insertBlock: (content: string) => void;
  getEditorView: () => EditorView | null;
};

export type CodeMirrorEditorProps = {
  value: string;
  onChange: (value: string) => void;
  mode: EditorEngineMode;
  /**
   * Editor settings (`SET-002`). Changing one reconfigures the running editor —
   * the caret, the scroll position and the undo history all survive — so a host
   * may pass a fresh object on every render without paying for a rebuild.
   */
  settings?: EditorSettings;
  bodyLabel?: string;
  /** Locks the editor (the surface's lock control). */
  readOnly?: boolean;
  className?: string;
};

/**
 * OmniDoc CodeMirror 6 editor wrapper.
 *
 * Supports two distinct modes:
 * - "text": Clean monospace raw markdown source without preview decorations.
 * - "markdown": Obsidian-style inline live preview with syntax folding.
 *
 * `readOnly` is the capture surface's lock: the document is untouched and the
 * source stops being contenteditable, while the preview keeps rendering (it
 * simply stops unfolding tokens).
 *
 * The extension set comes from `editor-extensions.ts` (F-15 Rev 2, Task 1.3),
 * where everything reconfigurable lives in a `Compartment`. The effects below
 * therefore dispatch **transactions**: a rebuild would drop the caret, the
 * scroll position and the undo history (`SET-002`).
 */
export const CodeMirrorEditor = forwardRef<
  CodeMirrorEditorHandle,
  CodeMirrorEditorProps
>(function CodeMirrorEditor(
  {
    value,
    onChange,
    mode,
    settings = DEFAULT_EDITOR_SETTINGS,
    bodyLabel = "Note body",
    readOnly = false,
    className,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Read at view-creation time only: a settings change is applied to the running
  // editor by the reconfiguration effect below, so it must not be a creation
  // dependency — that would rebuild the view on every settings change.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // One compartment set per editor instance, for the component's lifetime.
  const [compartments] = useState(() => createEditorCompartments());

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        viewRef.current?.focus();
      },
      wrapSelection: (prefix: string, suffix = prefix) => {
        const view = viewRef.current;
        if (!view) return;
        const { state, dispatch } = view;
        const changes = state.changeByRange(
          (range: { from: number; to: number }) => {
            const text = state.sliceDoc(range.from, range.to);
            const replacement = `${prefix}${text}${suffix}`;
            return {
              changes: { from: range.from, to: range.to, insert: replacement },
              range: EditorSelection.range(
                range.from + prefix.length,
                range.to + prefix.length,
              ),
            };
          },
        );
        dispatch(changes);
        view.focus();
      },
      prefixLine: (prefix: string) => {
        const view = viewRef.current;
        if (!view) return;
        const { state, dispatch } = view;
        const line = state.doc.lineAt(state.selection.main.head);
        const hasPrefix = line.text.startsWith(prefix);
        const changes = hasPrefix
          ? { from: line.from, to: line.from + prefix.length, insert: "" }
          : { from: line.from, to: line.from, insert: prefix };
        dispatch({ changes });
        view.focus();
      },
      insertBlock: (content: string) => {
        const view = viewRef.current;
        if (!view) return;
        const { state, dispatch } = view;
        const main = state.selection.main;
        dispatch({
          changes: { from: main.from, to: main.to, insert: content },
          selection: { anchor: main.from + content.length },
        });
        view.focus();
      },
      getEditorView: () => viewRef.current,
    }),
    [],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const baseTheme = EditorView.theme({
      "&": {
        height: "100%",
        minHeight: "40vh",
        outline: "none",
        backgroundColor: "transparent",
        color: "var(--foreground)",
        // Body typography comes from the one shared scale (F-15 Rev 2, Task
        // 1.2) so the mode switch cannot change the page's line rhythm.
        fontSize: `${BODY_TYPE_SCALE.body.fontSizeRem}rem`,
        lineHeight: String(BODY_TYPE_SCALE.body.lineHeightRem),
      },
      ".cm-content": {
        caretColor: "var(--foreground)",
        fontFamily:
          mode === "text" ? BODY_CODE_FONT_FAMILY : "inherit",
        padding: "0.75rem 0",
      },
      ".cm-line": {
        padding: "0",
      },
      "&.cm-focused": {
        outline: "none",
      },
      ".cm-cursor": {
        borderLeftColor: "var(--foreground)",
      },
    });

    const extensions: Extension[] = [
      baseTheme,
      // No `syntaxHighlighting(defaultHighlightStyle)`: its `tags.heading`
      // rule is `underline + bold`, which put a stray underline under every
      // heading in the source modes. Heading/bold/italic/code presentation is
      // owned by the live preview in Markdown mode; Text mode stays plain
      // source by design.
      ...editorExtensions(
        { mode, settings: settingsRef.current, readOnly, bodyLabel },
        compartments,
      ),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
    ];

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Recreate when mode changes: the base theme is mode-dependent and is not a
    // compartment. Settings, the lock and the live preview are re-applied by the
    // effects below, so they must not appear here.
  }, [mode, bodyLabel, compartments]);

  // Synchronize document if value changed externally. A read-only state
  // rejects changes, so the sync waits for the unlock (the effect depends on
  // `readOnly` and re-runs then).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (value === currentDoc || view.state.readOnly) return;
    view.dispatch({
      changes: { from: 0, to: currentDoc.length, insert: value },
    });
  }, [value, readOnly]);

  // The lock is applied by reconfiguring the compartment, not by remounting.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: compartments.editing.reconfigure(
        editingExtensions(readOnly, bodyLabel),
      ),
    });
  }, [bodyLabel, compartments, readOnly]);

  // Live settings (`SET-002`). The individual values are the dependencies: a host
  // that passes a fresh settings object every render must not pay for a
  // transaction when none of the live keys actually changed.
  const { tabSize, spellcheck, livePreview } = settings;
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: compartments.settings.reconfigure(
        settingsExtensions(settingsRef.current),
      ),
    });
  }, [compartments, tabSize, spellcheck]);

  // The preview is switched by settings, not only by mode, so it gets its own
  // reconfiguration rather than a place in the creation effect.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: compartments.livePreview.reconfigure(
        livePreviewExtensions(mode, settingsRef.current),
      ),
    });
  }, [compartments, livePreview, mode]);

  return (
    <div
      data-slot="codemirror-editor-container"
      data-mode={mode}
      className={cn("min-h-[40vh] w-full min-w-0 outline-none", className)}
      ref={containerRef}
    />
  );
});
