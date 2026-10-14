/**
 * The fenced-code-block opener (F-15 Rev 2, plan Task 3.1).
 *
 * `OBS-1.14.4-REVEAL-009` records the artifact's opener pattern as a **literal**
 * — this module is that literal and nothing more. The capture groups are the
 * point:
 *
 * - **Group 1** is the fence marker: three or more tildes, *or* three or more
 *   backticks. Two of either is not a fence.
 * - **Group 2** is the language code: word characters plus `/`, `+`, `#`, `-`.
 * - The trailing `[^\n`]*` is the info string's remainder. It may hold anything
 *   except a newline or a **backtick** — and that single exclusion is what lets
 *   a longer backtick fence wrap a shorter one (the artifact's own documented
 *   rule: an outer block needs more fence characters or a different fence
 *   character). It applies to tilde fences too, because the pattern is shared.
 *
 * The entry lists the pattern's author as the artefact itself rather than a help
 * page (`doc_status: partially-documented`), so the regex is the authority here:
 * `fence.test.ts` pins each property above instead of paraphrasing it.
 */

/**
 * The artifact's opener pattern, verbatim (`OBS-1.14.4-REVEAL-009`).
 *
 * Anchored to a whole line: a fence opener is alone on its line, so
 * `` ```js `inline` `` is not an opener (and neither is prose that merely
 * *contains* a fence).
 */
export const FENCE_PATTERN = /^\s*(~~~+|```+)[ \t]*([\w/+#-]*)[^\n`]*$/;

/** The two fence characters. */
export type FenceChar = "`" | "~";

/** One fenced-code opener the pattern recognised. */
export type Fence = {
  /** Which character the fence is made of. */
  readonly char: FenceChar;
  /** The run length — always three or more. */
  readonly length: number;
  /** The language code (group 2); the empty string when the fence is bare. */
  readonly info: string;
};

/**
 * Parse a single line as a fence opener, or `null` when it is not one.
 *
 * Closing fences match the same pattern: the artifact does not distinguish an
 * opener from a closer at this layer, and a bare `` ``` `` is a valid fence
 * either way.
 */
export function parseFence(text: string): Fence | null {
  const match = FENCE_PATTERN.exec(text);
  if (!match) return null;
  const marker = match[1] ?? "";
  return {
    char: marker.startsWith("~") ? "~" : "`",
    length: marker.length,
    info: match[2] ?? "",
  };
}
