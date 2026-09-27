import type { Options as SanitizeSchema } from "rehype-sanitize";

/**
 * The one sanitize schema for the markdown render path.
 *
 * Note content is **untrusted input** end to end (`architecture.md`), whose
 * security row is explicit: "Markdown / XSS | Sanitize render pipeline; block
 * dangerous schemes". This schema *is* that control, so it is written as an
 * explicit list of **refusals** rather than as a diff against a library default
 * nobody re-reads. ADR-0003 §4 pins `rehype-sanitize` 6.0.0 and calls
 * sanitization mandatory; ADR-0003 §Verification item 5 requires a test proving
 * a hostile payload cannot execute through this path (`markdown.test.tsx`).
 *
 * ## Refused, and why
 *
 * - **Anything outside the element allowlist.** The list is the GFM set GitHub
 *   itself sanitizes to (tables, task lists, strikethrough, footnotes,
 *   headings, lists, code). `script` is additionally stripped. `rehype-raw` is
 *   never added, so markdown-authored HTML never becomes elements in the first
 *   place — this schema is the second layer, not the first.
 * - **`style` and every `on*` handler.** Absent from every attribute list, so
 *   markdown has no channel for CSS or script.
 * - **Presentational attributes** — `align`, `color`, `border`, `cellPadding`,
 *   `cellSpacing`, `width`, `height`, `hSpace`, `vSpace`. The library's default
 *   wildcard allows these on every element; they are legacy layout and colour
 *   channels that let note content fight the token layer, so they are dropped.
 * - **`name`, and unprefixed `id`.** `name` is a DOM-clobbering channel and is
 *   refused outright. `id` is kept **only** because GFM footnotes need anchor
 *   targets, and only through the `user-content-` prefix — `clobberPrefix` is
 *   what makes that safe, so it is load-bearing, not cosmetic.
 * - **Dangerous URL schemes.** Schemes are *allowlisted per attribute*, so an
 *   unexpected scheme is refused by default rather than blocklisted. `src`
 *   allows `http`/`https` only, which refuses `data:` (an SVG/script smuggling
 *   path); `href` additionally allows `mailto`. Relative URLs stay valid — they
 *   carry no scheme at all.
 * - **`irc`, `ircs` and `xmpp` links.** Present in the library's default `href`
 *   protocols and unused by this product; refused rather than silently allowed.
 * - **Mis-nested table sections.** `ancestors` keeps `td`/`th`/`tr`/`thead`/
 *   `tbody`/`tfoot` inside a `table`, so a hostile tree cannot re-parent cells.
 * - **Any `className` other than a fenced code block's `language-*`.** The
 *   single class channel this schema opens, and it is pattern-matched.
 *
 * Deliberately absent: `rehype-raw` support, `dangerouslySetInnerHTML`, and any
 * prop pass-through that would let a caller widen this at render time.
 */
export const markdownSanitizeSchema: SanitizeSchema = {
  ancestors: {
    tbody: ["table"],
    td: ["table"],
    tfoot: ["table"],
    th: ["table"],
    thead: ["table"],
    tr: ["table"],
  },
  attributes: {
    a: [
      "href",
      "title",
      // GFM footnote reference/back-reference plumbing. `ariaDescribedBy` is
      // pattern-free here on purpose: only the footnotes heading may describe a
      // link, so an arbitrary untrusted label cannot be attached.
      "dataFootnoteBackref",
      "dataFootnoteRef",
      ["className", "data-footnote-backref"],
      ["ariaDescribedBy", "footnote-label"],
    ],
    blockquote: ["cite"],
    // The only `className` this schema lets through: what a fenced code block
    // needs for a future highlighter. Anything else is refused.
    code: [["className", /^language-./]],
    del: ["cite"],
    img: ["src", "alt", "title"],
    input: [
      ["disabled", true],
      ["type", "checkbox"],
    ],
    ins: ["cite"],
    li: [["className", "task-list-item"]],
    // GFM renders the footnotes heading visually hidden.
    h2: [["className", "sr-only"]],
    ol: ["start", ["className", "contains-task-list"]],
    q: ["cite"],
    section: ["dataFootnotes", ["className", "footnotes"]],
    source: ["srcSet"],
    td: ["colSpan", "rowSpan"],
    th: ["colSpan", "rowSpan", "scope"],
    ul: [["className", "contains-task-list"]],
    // Narrow on purpose: no `style`, no `on*`, no presentational layout, and no
    // `name`. `id` stays for footnote anchors (prefix applied via `clobber`).
    "*": ["title", "lang", "dir", "id"],
  },
  clobber: ["id"],
  clobberPrefix: "user-content-",
  protocols: {
    cite: ["http", "https"],
    href: ["http", "https", "mailto"],
    longDesc: ["http", "https"],
    src: ["http", "https"],
  },
  required: { input: { disabled: true, type: "checkbox" } },
  strip: ["script"],
  tagNames: [
    "a",
    "b",
    "blockquote",
    "br",
    "code",
    "dd",
    "del",
    "details",
    "div",
    "dl",
    "dt",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "input",
    "ins",
    "kbd",
    "li",
    "ol",
    "p",
    "picture",
    "pre",
    "q",
    "rp",
    "rt",
    "ruby",
    "s",
    "samp",
    "section",
    "source",
    "span",
    "strike",
    "strong",
    "sub",
    "summary",
    "sup",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "tt",
    "ul",
    "var",
  ],
};
