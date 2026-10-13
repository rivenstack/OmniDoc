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
 * The seven highlight tints: the artifact's default plus its six colours.
 *
 * Expressed as alpha over the note's own background rather than as opaque
 * colours, so a highlight cannot break text contrast and needs no separate dark
 * theme value. `default` is what `==text==` gets with no colour emoji
 * (`documentation-map.md`: "Without a color emoji, the highlight uses your
 * theme's default highlight color").
 */
const HIGHLIGHT_TINTS = {
  default: "rgb(250 204 21 / 0.30)",
  red: "rgb(248 113 113 / 0.30)",
  orange: "rgb(251 146 60 / 0.30)",
  yellow: "rgb(250 204 21 / 0.30)",
  green: "rgb(74 222 128 / 0.30)",
  blue: "rgb(96 165 250 / 0.30)",
  purple: "rgb(192 132 252 / 0.30)",
} as const;

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
  ".cm-live-link": {
    color: "var(--primary)",
    textDecoration: "underline",
    // The mark covers the link's rendered *text* only, so the pointer appears
    // exactly where a click follows the link — the brackets and the URL place
    // the caret (`OBS-1.14.4-LINK-002`), and they keep the text cursor.
    cursor: "pointer",
  },
  // Inline highlighting (`==text==`) — an Obsidian construct the GFM grammar
  // does not model, so the preview's own text layer finds it (Task 2.5). The
  // six colour variants are the ones the artifact's emoji select chooses
  // (`OBS-1.14.4-CMD-003` names six highlight-colour commands). Each is an
  // alpha tint over whatever the note's background already is, which keeps text
  // contrast intact in both themes; the design language will own these values
  // when it names highlight roles.
  ".cm-live-highlight": {
    backgroundColor: HIGHLIGHT_TINTS.default,
    borderRadius: "0.125rem",
  },
  ".cm-live-highlight-red": { backgroundColor: HIGHLIGHT_TINTS.red },
  ".cm-live-highlight-orange": { backgroundColor: HIGHLIGHT_TINTS.orange },
  ".cm-live-highlight-yellow": { backgroundColor: HIGHLIGHT_TINTS.yellow },
  ".cm-live-highlight-green": { backgroundColor: HIGHLIGHT_TINTS.green },
  ".cm-live-highlight-blue": { backgroundColor: HIGHLIGHT_TINTS.blue },
  ".cm-live-highlight-purple": { backgroundColor: HIGHLIGHT_TINTS.purple },
  // Comments: faint, and never hidden (`OBS-1.14.4-COMMENT-001`). The `%%`
  // pair is fainter still, so the delimiters read as syntax rather than as part
  // of the sentence they wrap — but they stay on screen.
  ".cm-live-comment": { color: "var(--muted-foreground)" },
  ".cm-live-comment-marker": { opacity: "0.6" },
  // Tags (`OBS-1.14.4-TAG-003`): the design language's `Badge` — secondary
  // variant — at prose size. The badge's `text-xs` is deliberately **not**
  // applied: a tag inside running prose must not change the text size, or the
  // line rhythm the body type scale owns would break mid-sentence.
  ".cm-live-tag": {
    backgroundColor: "var(--secondary)",
    color: "var(--secondary-foreground)",
    borderRadius: "var(--od-radius-full)",
    paddingBlock: "0.0625rem",
  },
  ".cm-live-tag-begin": { paddingInlineStart: "0.375rem" },
  ".cm-live-tag-end": { paddingInlineEnd: "0.375rem" },
  // These three set padding, which CodeMirror's base theme also sets on
  // `.cm-line` with the shorthand — the compound selector is what makes the
  // preview's insets win (equal-specificity rules are resolved by order, and
  // the base theme is not the loser).
  // Blockquote (`OBS-1.14.4-REVEAL-007`). The border is drawn by the marker
  // widget itself — its span carries the rule and the `>` glyph inside it is
  // transparent — so the line carries only the muted colour. A line-level
  // border here would draw the rule twice.
  ".cm-line.cm-live-quote": {
    color: "var(--muted-foreground)",
  },
  ".cm-live-quote-border": {
    borderInlineStart: "2px solid var(--border)",
    paddingInlineEnd: "0.75rem",
  },
  // The transparency class the border glyph carries: the `>` is content the
  // widget must produce, but it is not what the reader is meant to see.
  ".cm-live-transparent": {
    color: "transparent",
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
    // The project's own `Checkbox` (`components/checkbox.tsx`) in the preview's
    // DOM: a 1rem bordered square that fills with `--primary` when checked, at
    // the same size, radius and focus ring as the React primitive. The 0.5rem
    // end margin keeps task text aligned with a non-task bullet's text, because
    // the marker column is 1.5rem.
    display: "inline-block",
    inlineSize: "1rem",
    blockSize: "1rem",
    marginInlineEnd: "0.5rem",
    border: "1px solid var(--input)",
    borderRadius: "var(--od-radius-xs)",
    textIndent: "0",
    verticalAlign: "-0.125rem",
    cursor: "pointer",
    // No `transition-colors`: the React primitive animates its colour, but the
    // QA checklist treats motion as opt-in, and a static tick is the honest
    // reduced-motion equivalent. Nothing here animates at all.
  },
  ".cm-live-task[data-checked='true']": {
    backgroundColor: "var(--primary)",
    borderColor: "var(--primary)",
    color: "var(--primary-foreground)",
  },
  ".cm-live-task:focus-visible": {
    // The same 3px full-opacity ring the design system's checkbox uses — a
    // tinted ring does not reach the 3:1 non-text contrast bar.
    outline: "none",
    boxShadow: "0 0 0 3px var(--ring)",
  },
  ".cm-live-task-tick": {
    display: "block",
    margin: "0 auto",
    // The tick is only meaningful when the box is filled.
    opacity: "0",
  },
  ".cm-live-task[data-checked='true'] .cm-live-task-tick": {
    opacity: "1",
  },
  // A completed task's own text is struck through and faint — the same
  // treatment the artifact's stylesheet gives a checked task item. This is a
  // *visual* behaviour with no catalogue entry of its own (`TASK-001` covers the
  // toggle, not the look), so it is recorded as a `@user`-directed addition
  // rather than a parity claim.
  ".cm-live-task-done": {
    color: "var(--muted-foreground)",
    textDecoration: "line-through",
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
