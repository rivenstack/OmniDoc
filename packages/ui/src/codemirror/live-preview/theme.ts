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
 * The table's look (F-15 Task 3.3 Rev 2, plan Task B.1).
 *
 * `@user`-directed, 2026-10-16 (plan §1) — recorded as **directed**, never as a
 * parity claim: §2's captures (S1–S3) set the target, and the entries the
 * behaviour below must keep are `OBS-1.14.4-TABLE-001`/`-007`.
 *
 * Exported rather than inlined into {@link markdownLivePreviewTheme} so
 * `table/theme.test.ts` can assert the *rules*: jsdom has no layout, so the only
 * honest test of a look is what the stylesheet says.
 *
 * Three decisions shape it:
 *
 * - **No focus outline** (B-1). The wrapper stays focusable — a wide table must
 *   stay keyboard-scrollable (`ui-qa-checklist.md` §6.4) — but draws no ring:
 *   the caret and the selection highlight are the focus affordances. That is why
 *   the rule sets `outline: none` rather than simply omitting an outline: the
 *   project's global `:focus-visible` contract would otherwise paint one.
 * - **Content width, not full width** (B-2). The table hugs its columns and caps
 *   at the note's own width, with a minimum inline size per cell so an empty
 *   column stays visible and clickable. Sizing is the **browser's own table
 *   layout** — `@user`-directed 2026-10-16 after the first pass measured the
 *   columns in JavaScript: no `colgroup`, no inline widths, no measurement, and
 *   so no delay between typing and a column resizing.
 * - **No header fill** (S1). The header row is bold text on the body's own
 *   background, separated by the same hairline grid as every other cell.
 *
 * The nested cell editors are `EditorView`s of their own, so they arrive with
 * CodeMirror's base theme: a monospace scroller, a `4px 0` / `0 2px 0 6px` inset
 * and a `1px dotted` focus ring. None of that belongs to a table cell, and the
 * rules below are what take it back.
 *
 * Every colour is an existing token role — no new `tokens.css` entries. The
 * affordance and selection tints (C.4, D.1, D.2) are visual-pass items (§11).
 */
export const TABLE_THEME_RULES: Record<string, Record<string, string>> = {
  // The scroll container: still the escape hatch for a genuinely wide table.
  ".cm-live-table-wrapper": {
    position: "relative",
    overflowX: "auto",
    maxWidth: "100%",
    marginBlock: "0.75rem",
    // B-1. See the doc comment: an omission would not be enough.
    outline: "none",
  },
  // The grid is the positioning context for the affordances (the hover grip and
  // the `+`, D.1/D.2) and hugs the table, so pinning something to its edge is
  // pinning it to the table's edge.
  ".cm-live-table-grid": {
    position: "relative",
    width: "max-content",
    maxWidth: "100%",
  },
  // B-2. `max-content` (not `100%`) is what makes the table hug its columns;
  // `max-width: 100%` keeps a long one inside the note, where its content wraps
  // rather than running off the page. Between them the browser's own table
  // layout distributes the space — there is nothing to measure and nothing to
  // recompute when a cell is edited.
  ".cm-live-table": {
    width: "max-content",
    maxWidth: "100%",
    borderCollapse: "collapse",
    fontSize: "0.875rem",
  },
  // The cell box, shared by the head and the body: the hairline grid, and B-2's
  // minimum width — the only floor a column needs, so an empty column stays
  // visible (and, once D.1 lands, clickable) instead of collapsing to nothing.
  //
  // The box carries **no padding** (`@user`, 2026-10-16): the editable area
  // inside it fills the cell edge to edge (see the `.cm-editor` rule below), so
  // a click anywhere in a cell lands in its editor. The cell's inner spacing is
  // the editor's own padding, which keeps the look identical.
  ".cm-live-th, .cm-live-td": {
    border: "1px solid var(--border)",
    padding: "0",
    minInlineSize: "4rem",
    // A wrapped cell grows downwards. Without this the row's other cells would
    // float their content to the middle and the row would stop reading as a row.
    verticalAlign: "top",
  },
  // S1: bold, no filled bar — the header is a row, not a surface.
  ".cm-live-th": {
    fontWeight: "600",
    textAlign: "start",
  },
  ".cm-live-td": {
    textAlign: "start",
  },
  // A cell editor must read as part of the document's own text, and the table
  // carries no focus ring of its own (B-1) — so the nested base theme's dotted
  // ring goes, along with its monospace scroller and its own insets.
  //
  // It also **is** the cell's content area: full width and full height of the
  // box it sits in (`@user`, 2026-10-16), so the editable region is the whole
  // cell rather than a strip inside it. At 100% of a table cell the height
  // resolves against the row, so a short cell in a tall row stays clickable
  // throughout; where it cannot resolve, the cell simply hugs its content.
  ".cm-live-table .cm-editor": {
    outline: "none",
    backgroundColor: "transparent",
    width: "100%",
    blockSize: "100%",
  },
  ".cm-live-table .cm-scroller": {
    // Inherited, not chosen: a cell is the document's own type, at whatever the
    // surrounding text resolves to.
    fontFamily: "inherit",
    lineHeight: "inherit",
  },
  // The document's editor tints its caret; a cell's is the base theme's black,
  // which would be invisible in the dark theme.
  ".cm-live-table .cm-cursor": {
    borderLeftColor: "var(--foreground)",
  },
  // The editable div: it carries the cell's inner spacing now that the cell box
  // has none, so the text sits exactly where it did before while the editor
  // reaches the cell's edges.
  ".cm-live-table .cm-content": {
    padding: "0.5rem",
    boxSizing: "border-box",
    // An empty cell has no line box, so its row would collapse to the cell's
    // padding and read as a sliver next to a filled one. The old implementation
    // solved that with an `:empty::before` pseudo-element; a cell holds an
    // editor now, so the line box is the editor's to keep. The value is a
    // visual-pass item (§11-8).
    minBlockSize: "1.5em",
  },
  ".cm-live-table .cm-line": {
    padding: "0",
  },
  // A click target under the table (plan C.2): clicking below a last-block table
  // has no document position to land on, so this strip turns that click into
  // "put the caret on a new line after the table". It sits inside the grid, so
  // it reads as the table's own bottom margin rather than a toolbar (B-3).
  ".cm-live-table-tail": {
    blockSize: "0.75rem",
    cursor: "text",
  },
};

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
  // Footnotes (`OBS-1.14.4-FOOT-001`). A named reference is styled like the
  // link-like marker it classifies as; an inline footnote reads as the same
  // colour because it is the same construct in a different spelling. Whether
  // the artifact renders either as a *superscript* reference was never
  // established (`FOOT-001` unknowns), so no size or baseline change is
  // invented here.
  ".cm-live-footref": { color: "var(--primary)" },
  ".cm-live-inline-footnote": { color: "var(--primary)" },
  ".cm-live-footnote-marker": { opacity: "0.6" },
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
  // Callouts (`OBS-1.14.4-CALLOUT-001`, `-008`). The type's colour is a CSS
  // custom property the base rule consumes for the title, the icon stroke and a
  // colour-mixed background — the artifact's own shape — but the *values* are
  // OmniDoc token roles rather than the artifact's palette (the recorded `adapt`
  // deviation). `data-callout` carries the type **as written**, so an unknown
  // type falls through to the base rule without the attribute being rewritten.
  //
  // The artifact's 13 types use teal/blue/cyan/green/yellow/orange/red/purple/
  // grey; the project's status palette has five hues (info, accent, success,
  // warning, danger) plus neutral, so the families collapse: blue→info,
  // teal/cyan→accent, green→success, yellow/orange→warning, red→danger,
  // purple→accent, and `quote` keeps the artifact's literal grey.
  ".cm-live-callout": {
    "--cm-callout-colour": "var(--od-info-500)",
    display: "block",
    marginBlock: "0.75rem",
    padding: "0.5rem 0.75rem",
    borderInlineStart: "2px solid var(--cm-callout-colour)",
    borderRadius: "0.375rem",
    backgroundColor:
      "color-mix(in srgb, var(--cm-callout-colour) 8%, transparent)",
  },
  ".cm-live-callout[data-callout='summary'], .cm-live-callout[data-callout='abstract'], .cm-live-callout[data-callout='tldr']":
    { "--cm-callout-colour": "var(--od-accent-500)" },
  ".cm-live-callout[data-callout='todo']": {
    "--cm-callout-colour": "var(--od-info-500)",
  },
  ".cm-live-callout[data-callout='important'], .cm-live-callout[data-callout='tip'], .cm-live-callout[data-callout='hint']":
    { "--cm-callout-colour": "var(--od-accent-500)" },
  ".cm-live-callout[data-callout='success'], .cm-live-callout[data-callout='check'], .cm-live-callout[data-callout='done']":
    { "--cm-callout-colour": "var(--od-success-500)" },
  ".cm-live-callout[data-callout='question'], .cm-live-callout[data-callout='help'], .cm-live-callout[data-callout='faq']":
    { "--cm-callout-colour": "var(--od-warning-500)" },
  ".cm-live-callout[data-callout='warning'], .cm-live-callout[data-callout='caution'], .cm-live-callout[data-callout='attention']":
    { "--cm-callout-colour": "var(--od-warning-500)" },
  ".cm-live-callout[data-callout='fail'], .cm-live-callout[data-callout='failure'], .cm-live-callout[data-callout='missing'], .cm-live-callout[data-callout='error'], .cm-live-callout[data-callout='danger'], .cm-live-callout[data-callout='bug']":
    { "--cm-callout-colour": "var(--od-danger-500)" },
  ".cm-live-callout[data-callout='example']": {
    "--cm-callout-colour": "var(--od-accent-500)",
  },
  // The artifact's literal quote grey (`CALLOUT-001`, `quoteColourLiteral`).
  ".cm-live-callout[data-callout='quote'], .cm-live-callout[data-callout='cite']":
    {
      "--cm-callout-colour": "#9e9e9e",
    },
  ".cm-live-callout-title": {
    display: "flex",
    alignItems: "center",
    gap: "0.375rem",
    fontWeight: "600",
    color: "var(--cm-callout-colour)",
  },
  ".cm-live-callout-icon": { flex: "none" },
  // The chevron is a real button so the fold affordance has a keyboard path
  // (`ui-qa-checklist.md` §1.1), even though the artifact's is pointer-only.
  ".cm-live-callout-fold": {
    display: "inline-flex",
    alignItems: "center",
    marginInlineStart: "auto",
    padding: "0",
    border: "none",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    transition: "transform 120ms ease",
  },
  ".cm-live-callout-fold[aria-expanded='true']": { transform: "rotate(90deg)" },
  ".cm-live-callout-fold:focus-visible": {
    outline: "2px solid var(--ring)",
    outlineOffset: "1px",
  },
  ".cm-live-callout-content": { marginBlockStart: "0.25rem" },
  ".cm-live-callout-paragraph": { margin: "0.25rem 0" },
  "@media (prefers-reduced-motion: reduce)": {
    ".cm-live-callout-fold": { transition: "none" },
  },
  // Tables: the table is a block widget, so its look is defined by the widget
  // rules rather than by `.cm-line` classes — the source lines it replaces are
  // not laid out at all. The rules live in `TABLE_THEME_RULES` above so
  // `table/theme.test.ts` can read them; spreading them here keeps the document
  // and the per-cell editors on one stylesheet.
  ...TABLE_THEME_RULES,
});
