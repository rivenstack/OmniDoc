"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { bracketMatching } from "@codemirror/language";
import {
  EditorSelection,
  EditorState,
  Compartment,
  type Extension,
} from "@codemirror/state";
import { EditorView, keymap, type ViewUpdate } from "@codemirror/view";
import { cn } from "../lib/utils";
import {
  markdownLivePreviewPlugin,
  markdownLivePreviewTheme,
  tableLivePreview,
} from "./markdown-live-preview";

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
  mode: "text" | "markdown";
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
 */
export const CodeMirrorEditor = forwardRef<
  CodeMirrorEditorHandle,
  CodeMirrorEditorProps
>(function CodeMirrorEditor(
  {
    value,
    onChange,
    mode,
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

  // Editable state lives in a compartment so the lock can toggle without
  // rebuilding the view (a rebuild would drop the caret and scroll position).
  const [editingCompartment] = useState(() => new Compartment());

  const editingExtensions = (locked: boolean, label: string): Extension => [
    // Two facets on purpose: `EditorState.readOnly` stops command/API changes
    // and drag-drop, `EditorView.editable` stops the DOM from being
    // contenteditable at all.
    EditorState.readOnly.of(locked),
    EditorView.editable.of(!locked),
    EditorView.contentAttributes.of({
      role: "textbox",
      "aria-multiline": "true",
      "aria-label": label,
      "aria-readonly": locked ? "true" : "false",
    }),
  ];

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
        fontSize: "1rem",
        // Matches `text-base` in the Normal and Reading modes: the mode switch
        // must not change the page's line rhythm.
        lineHeight: "1.5",
      },
      ".cm-content": {
        caretColor: "var(--foreground)",
        fontFamily:
          mode === "text" ? "var(--font-geist-mono), monospace" : "inherit",
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
      EditorView.lineWrapping,
      bracketMatching(),
      // No `syntaxHighlighting(defaultHighlightStyle)`: its `tags.heading`
      // rule is `underline + bold`, which put a stray underline under every
      // heading in the source modes. Heading/bold/italic/code presentation is
      // owned by `markdown-live-preview.ts` in Markdown mode; Text mode stays
      // plain source by design.
      history(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        {
          key: "Escape",
          run: (view: EditorView) => {
            view.dom.blur();
            return true;
          },
        },
      ]),
      // GFM makes the parser understand the same dialect the Reading mode
      // renders (`remark-gfm`) and the toolbar can insert — strikethrough,
      // autolinks, tables. Plain CommonMark silently produced no syntax nodes
      // for `~~strike~~`.
      markdown({ base: markdownLanguage }),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      editingCompartment.of(editingExtensions(readOnly, bodyLabel)),
    ];

    if (mode === "markdown") {
      extensions.push(
        tableLivePreview,
        markdownLivePreviewPlugin,
        markdownLivePreviewTheme,
      );
    }

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
    // Recreate when mode changes so extensions are re-bound cleanly.
  }, [mode, bodyLabel]);

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
      effects: editingCompartment.reconfigure(
        editingExtensions(readOnly, bodyLabel),
      ),
    });
  }, [bodyLabel, editingCompartment, readOnly]);

  return (
    <div
      data-slot="codemirror-editor-container"
      data-mode={mode}
      className={cn("min-h-[40vh] w-full min-w-0 outline-none", className)}
      ref={containerRef}
    />
  );
});
