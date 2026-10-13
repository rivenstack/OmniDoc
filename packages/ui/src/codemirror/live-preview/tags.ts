/**
 * Tag parsing and styling in Live Preview (F-15 Rev 2, plan Task 2.9).
 *
 * `#tag` produces **no syntax node at all** — hashtags are not Markdown, and
 * this file's tests assert the grammar really is silent on them. So, like
 * highlighting and comments, tags come from the preview's own text layer
 * (plan §7 risk D-5).
 *
 * Two catalogue entries are adopted and two are deliberately not:
 *
 * | Entry | Disposition | Here |
 * |---|---|---|
 * | `TAG-001` | adopt | the exclusion-class pattern and the longest-prefix match |
 * | `TAG-003` | adopt | the three-part class split (whole tag, begin, end) |
 * | `TAG-005` | adopt | one shared character class, no triplication |
 * | `TAG-002` | **defer** | autocomplete needs a tag source; waits for `BL-26` |
 * | `TAG-004` | **defer** | click-to-search is decision 8; waits for `BL-26` |
 *
 * Nothing here is interactive: a tag is styled text. The click and the suggest
 * are the deferred halves, and `tags/regex.ts` carries the trigger pattern so
 * that work starts from the entry rather than from a re-derivation.
 */

import type { Text } from "@codemirror/state";
import { TAG_PATTERN, isTagName } from "../tags/regex";
import type { RegionIndex } from "./taxonomy";

/** One tag the text layer found. */
export type TagSpan = {
  /** Includes the leading `#`. */
  readonly from: number;
  readonly to: number;
  /** The tag's name, without the `#`. */
  readonly name: string;
};

/**
 * Every tag in `[from, to)`.
 *
 * Line-based, and prose-only: a `#` inside a code span, a fence, a table or a
 * link is literal text (the fixture corpus pins all four). Names with no
 * non-numerical character are rejected — `#1984` is not a tag, `#y1984` is
 * (`TAG-001`).
 */
export function scanTags(
  doc: Text,
  from: number,
  to: number,
  regions: RegionIndex,
): TagSpan[] {
  const spans: TagSpan[] = [];
  const first = doc.lineAt(from).number;
  const last = doc.lineAt(to).number;

  for (let number = first; number <= last; number += 1) {
    const line = doc.line(number);
    // `matchAll` clones the pattern, so the shared global instance is safe here.
    for (const match of line.text.matchAll(TAG_PATTERN)) {
      const name = match[1] ?? "";
      if (match.index === undefined || name.length === 0) continue;
      if (!isTagName(name)) continue;

      const tagFrom = line.from + match.index;
      const tagTo = tagFrom + match[0].length;
      if (tagFrom < from || tagTo > to) continue;
      if (regions.isExcluded(tagFrom, ["verbatim", "table", "link"])) continue;

      spans.push({ from: tagFrom, to: tagTo, name });
    }
  }

  return spans;
}
