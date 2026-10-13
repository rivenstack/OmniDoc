/**
 * Comments in Live Preview (`OBS-1.14.4-COMMENT-001`, `-COMMENT-002`).
 *
 * This is the one construct in the reveal catalogue with **no reveal rule at
 * all**, and that is deliberate: comments are styled faint and are **never
 * hidden** in the editing view. They are absent from both construct sets, so
 * nothing folds them, and the caret makes no difference — the same faint text
 * with the caret inside and outside. Only the reading path hides them.
 *
 * What the editor *does* model is the `%%` pair's **state**, and it is a stream
 * state with three quirks (`COMMENT-002`):
 *
 * 1. The pair **toggles** a flag. Unset → this pair opens a comment; set → it
 *    closes one. There is no line-start requirement: a pair toggles at any
 *    inline position.
 * 2. The flag is carried across lines, so an **unclosed pair keeps everything
 *    after it marked as a comment across line breaks** — which is why the
 *    documentation advises keeping both markers of an inline comment on one
 *    line.
 * 3. The check is **skipped inside a code span, a fenced block or a link href**
 *    (there the pair is literal text and does not toggle), and **starting a
 *    table row resets the flag**, so a table interrupts an unclosed comment's
 *    highlighting.
 *
 * The catalogue's coverage of this area is `verified`, and the classes it names
 * (`cm-comment` with the code-comment colour role) are the artifact's; ours is
 * `cm-live-comment`, in the Mintlify token layer like everything else.
 */

import type { Text } from "@codemirror/state";
import { COMMENT_MARKER } from "../../markdown/comments";
import type { RegionIndex } from "./taxonomy";

/** One range the editor styles as a comment. */
export type CommentRange = {
  readonly from: number;
  readonly to: number;
  /**
   * True for a `%%` pair itself — the artifact's "formatting" comment marker,
   * which is styled apart from the comment body.
   */
  readonly marker: boolean;
};

/** The comment delimiter, shared with the reading path (`COMMENT-002`). */
export const COMMENT_DELIMITER = COMMENT_MARKER;

/**
 * Every range styled as a comment in `[from, to)`.
 *
 * Ranges never overlap and are returned in document order, so a caller can turn
 * each one into a mark without merging.
 */
export function scanComments(
  doc: Text,
  from: number,
  to: number,
  regions: RegionIndex,
): CommentRange[] {
  const ranges: CommentRange[] = [];
  /** The stream state: whether an open `%%` is still waiting for its pair. */
  let inComment = false;

  const first = doc.lineAt(from).number;
  const last = doc.lineAt(to).number;

  for (let number = first; number <= last; number += 1) {
    const line = doc.line(number);

    // Quirk 3: a table row resets the flag, so a table interrupts an unclosed
    // comment's highlighting.
    if (regions.regionAt(line.from) === "table") inComment = false;

    let cursor = 0;
    /** Where the current comment body starts on this line. */
    let bodyStart = 0;

    while (cursor < line.length) {
      const open = line.text.indexOf(COMMENT_DELIMITER, cursor);
      if (open < 0) break;

      const absolute = line.from + open;
      // Quirk 3: inside code or a link the pair is literal and does not toggle.
      if (regions.isExcluded(absolute, ["verbatim", "link"])) {
        cursor = open + COMMENT_DELIMITER.length;
        continue;
      }

      // The text before a closing pair belongs to the comment body.
      if (inComment && open > bodyStart) {
        ranges.push({ from: line.from + bodyStart, to: absolute, marker: false });
      }
      ranges.push({
        from: absolute,
        to: absolute + COMMENT_DELIMITER.length,
        marker: true,
      });

      // Quirk 1: the pair toggles.
      inComment = !inComment;
      cursor = open + COMMENT_DELIMITER.length;
      bodyStart = cursor;
    }

    // Quirk 2: the flag carries on, so the rest of this line is comment body.
    if (inComment && bodyStart < line.length) {
      ranges.push({ from: line.from + bodyStart, to: line.to, marker: false });
    }
  }

  return ranges.filter((range) => range.from < range.to);
}
