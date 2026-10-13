/**
 * The live preview's theme (F-15 Rev 2, Task 1.5).
 *
 * Moved verbatim out of `markdown-live-preview.ts` — a pure move, no logic
 * change.
 */

import { EditorView } from "@codemirror/view";
import {
  LIVE_PREVIEW_CODE_TYPE,
  LIVE_PREVIEW_TYPE_RULES,
} from "../../capture/body-typography";

/**
 * Presentation for the live preview, deliberately kept in step with the
 * typography the capture surface applies to TipTap (Normal). The type values
 * are imported from `capture/body-typography.ts` — one source for both engines
 * (F-15 Rev 2, Task 1.2) — and the rest is expressed directly rather than as
 * utility classes so the preview's look cannot depend on Tailwind having
 * scanned this folder.
 */
export const markdownLivePreviewTheme = EditorView.theme({
  ...LIVE_PREVIEW_TYPE_RULES,
  ".cm-live-syntax": { color: "var(--muted-foreground)" },
  ".cm-live-strong": { fontWeight: "700" },
  ".cm-live-em": { fontStyle: "italic" },
  ".cm-live-strike": { textDecoration: "line-through" },
  ".cm-live-code": {
    fontFamily: LIVE_PREVIEW_CODE_TYPE.fontFamily,
    fontSize: LIVE_PREVIEW_CODE_TYPE.inlineFontSize,
    backgroundColor: "var(--muted)",
    borderRadius: "0.125rem",
    padding: "0.125rem 0.25rem",
  },
  ".cm-live-link": { color: "var(--primary)", textDecoration: "underline" },
  // These three set padding, which CodeMirror's base theme also sets on
  // `.cm-line` with the shorthand — the compound selector is what makes the
  // preview's insets win (equal-specificity rules are resolved by order, and
  // the base theme is not the loser).
  ".cm-line.cm-live-quote": {
    borderInlineStart: "2px solid var(--border)",
    paddingInlineStart: "1rem",
    color: "var(--muted-foreground)",
  },
  // List items: marker in the indent, wrapped lines aligned under the text.
  ".cm-line.cm-live-list-item": {
    paddingInlineStart: "1.5rem",
    textIndent: "-1.5rem",
  },
  // Markers are inline-blocks inside the list line, which carries the hanging
  // indent as `text-indent` — and `text-indent` inherits, so each marker has to
  // reset it or its own glyph is painted outside its box.
  ".cm-live-bullet": {
    display: "inline-block",
    inlineSize: "1.5rem",
    color: "var(--muted-foreground)",
    textIndent: "0",
  },
  ".cm-live-ordered-mark": {
    display: "inline-block",
    inlineSize: "1.5rem",
    color: "var(--muted-foreground)",
    textIndent: "0",
  },
  ".cm-live-task": {
    display: "inline-block",
    inlineSize: "1.5rem",
    textIndent: "0",
  },
  // `---` renders as the rule it means.
  ".cm-live-hr": {
    display: "inline-block",
    inlineSize: "100%",
    blockSize: "0",
    borderBlockStart: "1px solid var(--border)",
    verticalAlign: "middle",
  },
  // Fenced code: one muted block, monospace, no fence text.
  ".cm-line.cm-live-code-block": {
    backgroundColor: "var(--muted)",
    fontFamily: LIVE_PREVIEW_CODE_TYPE.fontFamily,
    fontSize: LIVE_PREVIEW_CODE_TYPE.blockFontSize,
    paddingInline: "0.75rem",
  },
  ".cm-live-code-block-first": {
    borderStartStartRadius: "0.375rem",
    borderStartEndRadius: "0.375rem",
  },
  ".cm-live-code-block-last": {
    borderEndStartRadius: "0.375rem",
    borderEndEndRadius: "0.375rem",
  },
  // GFM tables: the table is a block widget, so its look is defined by the
  // widget rules below rather than by `.cm-line` classes — the source lines it
  // replaces are not laid out at all.
  ".cm-live-table-wrapper": {
    position: "relative",
    overflowX: "auto",
    maxWidth: "100%",
    marginBlock: "0.75rem",
    outline: "none",
  },
  // The scroll container is focusable so a wide table can be scrolled by
  // keyboard, which is only discoverable if the focus ring is visible.
  ".cm-live-table-wrapper:focus-visible": {
    outline: "2px solid var(--ring)",
    outlineOffset: "2px",
    borderRadius: "0.375rem",
  },
  ".cm-live-table-toolbar": {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.125rem",
    marginBlockEnd: "0.25rem",
  },
  ".cm-live-table-tool": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "1.5rem",
    blockSize: "1.5rem",
    padding: "0",
    border: "1px solid transparent",
    borderRadius: "0.25rem",
    background: "transparent",
    color: "var(--muted-foreground)",
    cursor: "pointer",
  },
  ".cm-live-table-tool:hover": {
    backgroundColor: "var(--accent)",
    color: "var(--foreground)",
  },
  ".cm-live-table-tool:focus-visible": {
    outline: "2px solid var(--ring)",
    outlineOffset: "1px",
  },
  ".cm-live-table": {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.875rem",
  },
  ".cm-live-th": {
    border: "1px solid var(--border)",
    backgroundColor: "var(--muted)",
    padding: "0.5rem",
    fontWeight: "600",
    textAlign: "start",
  },
  ".cm-live-td": {
    border: "1px solid var(--border)",
    padding: "0.5rem",
    textAlign: "start",
  },
  // An empty cell has no line box, so the row would collapse to its padding —
  // an empty row reads as a thin sliver next to a filled one. An inline-block
  // pseudo-element gives the cell a line box (at the inherited line-height)
  // without adding content the user can select, edit, or delete.
  ".cm-live-th:empty::before, .cm-live-td:empty::before": {
    content: '""',
    display: "inline-block",
  },
  // A cell being edited shows its markdown source; the tint says "this is
  // source, not the rendered result" without moving the layout. The browser's
  // default focus ring is dropped because the tint is the focus affordance.
  ".cm-live-th:focus, .cm-live-td:focus": {
    outline: "none",
  },
  ".cm-live-cell-editing": {
    backgroundColor: "var(--accent)",
    boxShadow: "inset 0 0 0 2px var(--ring)",
    outline: "none",
  },
});
