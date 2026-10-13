/**
 * Comments in the reading path (`OBS-1.14.4-COMMENT-003`, `-COMMENT-004`).
 *
 * Obsidian's `%%…%%` is not Markdown, so the reading path needs its own rule.
 * The artifact has **two** (`COMMENT-003`), and the difference between them is
 * the whole point:
 *
 * | Rule | Trigger | Consumes |
 * |---|---|---|
 * | **inline** | a `%%` pair closed on the same line | that pair and its text |
 * | **block** | a `%%` pair that is the first thing on its line (spaces only — a **tab** does not count) | to the next pair **anywhere** later, or to the end of the note |
 *
 * The block rule declines as soon as the opening line contains another pair,
 * which is exactly the mechanism that keeps a one-line comment inline. And an
 * unclosed block comment therefore hides the **rest of the note** — but only in
 * the reading path (`COMMENT-004`); the editor styles it and hides nothing.
 *
 * ## Why a source transform and not a remark/mdast plugin
 *
 * A comment renders as *nothing* (`COMMENT-001`: "the render handler for a
 * comment returns nothing"), and deleting a comment's span from the source
 * before parsing is behaviourally identical — the text after a closing pair
 * still parses, and an unclosed block still swallows the rest. An mdast
 * transform cannot express that: a block comment that consumes to the end of
 * the document crosses arbitrary block boundaries, which the tree has already
 * decided. So the stage runs on the source and leaves the F-12 pipeline
 * (`remark-gfm` → `rehype-sanitize` → component overrides) exactly as it was.
 */

/** The comment delimiter. One constant for both paths (`COMMENT-002`). */
export const COMMENT_MARKER = "%%";

/**
 * The first non-space index of `line`.
 *
 * Spaces only: `COMMENT-003` records that a tab-indented pair is **not** a
 * block comment, so the indentation scan must not accept `\t`.
 */
function indentWidth(line: string): number {
  let index = 0;
  while (index < line.length && line[index] === " ") index += 1;
  return index;
}

/**
 * Remove every `%%…%%` pair closed on this line.
 *
 * A lone `%%` with no closer on its line is left **literal** here: the inline
 * rule matches only a pair, and the block rule owns the line-initial case. That
 * asymmetry with the editor (which styles an unclosed pair to the end of the
 * note) is the artifact's own.
 */
function stripInlineComments(line: string): string {
  let out = "";
  let cursor = 0;
  while (cursor < line.length) {
    const open = line.indexOf(COMMENT_MARKER, cursor);
    if (open < 0) {
      out += line.slice(cursor);
      break;
    }
    const close = line.indexOf(COMMENT_MARKER, open + COMMENT_MARKER.length);
    if (close < 0) {
      // No closer on this line: the markers stay as written.
      out += line.slice(cursor);
      break;
    }
    out += line.slice(cursor, open);
    cursor = close + COMMENT_MARKER.length;
  }
  return out;
}

/**
 * The reading-path comment rule, as a source transform.
 *
 * Pass the result to the render path in place of the original source; the
 * pipeline itself is untouched.
 */
export function removeCommentSpans(source: string): string {
  const lines = source.split("\n");
  const kept: string[] = [];
  /** True while a block comment is open and swallowing lines. */
  let blockOpen = false;

  for (const line of lines) {
    if (blockOpen) {
      const close = line.indexOf(COMMENT_MARKER);
      if (close < 0) {
        // Still inside the block: the whole line renders as nothing, but its
        // line break stays, so the surrounding block structure is unchanged.
        kept.push("");
        continue;
      }
      kept.push(line.slice(close + COMMENT_MARKER.length));
      blockOpen = false;
      continue;
    }

    const indent = indentWidth(line);
    if (line.startsWith(COMMENT_MARKER, indent)) {
      const afterOpen = indent + COMMENT_MARKER.length;
      if (line.indexOf(COMMENT_MARKER, afterOpen) < 0) {
        // No closer on the opening line → the block rule: it consumes to the
        // next pair anywhere later, or to the end of the note if there is none.
        blockOpen = true;
        kept.push(line.slice(0, indent));
        continue;
      }
      // Closed on its own line → the inline rule owns it, opening pair included.
      kept.push(line.slice(0, indent) + stripInlineComments(line.slice(indent)));
      continue;
    }

    kept.push(stripInlineComments(line));
  }

  return kept.join("\n");
}
