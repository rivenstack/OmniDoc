"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import {
  bracketMatching,
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { EditorSelection, EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap, type ViewUpdate } from "@codemirror/view";
import { cn } from "../lib/utils";
import { markdownLivePreviewPlugin } from "./markdown-live-preview";

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
  className?: string;
};

/**
 * OmniDoc CodeMirror 6 editor wrapper.
 *
 * Supports two distinct modes:
 * - "text": Clean monospace raw markdown source without preview decorations.
 * - "markdown": Obsidian-style inline live preview with syntax folding.
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
    className,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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
        const changes = state.changeByRange((range: { from: number; to: number }) => {
          const text = state.sliceDoc(range.from, range.to);
          const replacement = `${prefix}${text}${suffix}`;
          return {
            changes: { from: range.from, to: range.to, insert: replacement },
            range: EditorSelection.range(
              range.from + prefix.length,
              range.to + prefix.length,
            ),
          };
        });
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
        lineHeight: "1.75",
      },
      ".cm-content": {
        caretColor: "var(--foreground)",
        fontFamily:
          mode === "text"
            ? "var(--font-geist-mono), monospace"
            : "inherit",
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
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
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
      markdown(),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      EditorView.contentAttributes.of({
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": bodyLabel,
      }),
    ];

    if (mode === "markdown") {
      extensions.push(markdownLivePreviewPlugin);
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

  // Synchronize document if value changed externally
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (value !== currentDoc) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      data-slot="codemirror-editor-container"
      data-mode={mode}
      className={cn("min-h-[40vh] w-full min-w-0 outline-none", className)}
      ref={containerRef}
    />
  );
});
