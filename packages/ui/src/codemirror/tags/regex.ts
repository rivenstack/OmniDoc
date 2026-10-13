/**
 * Tag character rules — **one** constant, every consumer (`OBS-1.14.4-TAG-005`).
 *
 * The artifact carries the same tag character class in three separate patterns
 * at three sites (the parser's tag pattern, the autocomplete trigger, and the
 * scan used when detecting tags in text). `TAG-005` calls that duplication a
 * maintenance hazard: "a change to the allowed character set must be made in all
 * three places". Here it is made in one, and {@link TAG_EXCLUDED_CHARACTERS} is
 * the only copy — `tags.test.ts` fails if a second copy appears anywhere.
 *
 * The set is an **exclusion class**, not an inclusion list (`TAG-001`). That is
 * deliberate and surprising enough to restate: the artifact does not enumerate
 * what a tag may contain; it enumerates what *stops* one. So `#tag-with-dashes`,
 * `#nested/tag` and `#café-tag` all match because none of their characters is
 * excluded, and no future allowed-character list has to be kept in step with
 * the docs.
 */

/**
 * The excluded characters, verbatim from `OBS-1.14.4-TAG-001`:
 *
 * - the Unicode **General Punctuation** block (`\u2000-\u206F`);
 * - the **Supplemental Punctuation** block (`\u2E00-\u2E7F`);
 * - the ASCII punctuation set the entry lists — apostrophe, `!"#$%&()*+,.:;<=>?@`,
 *   caret, backtick, `{|}~`, square brackets and backslash;
 * - any whitespace.
 *
 * Split across lines by category for review; the concatenation is the entry's
 * class, unchanged. Note what is *absent*: letters, digits, `_`, `-` and `/` —
 * which is why nested tags and kebab-case names work.
 */
export const TAG_EXCLUDED_CHARACTERS =
  // General Punctuation, then Supplemental Punctuation.
  "\\u2000-\\u206F" +
  "\\u2E00-\\u2E7F" +
  // The ASCII punctuation set.
  "'!\"#$%&()*+,.:;<=>?@^`{|}~\\[\\]\\\\" +
  // Whitespace.
  "\\s";

/**
 * The parser pattern (`OBS-1.14.4-TAG-001`).
 *
 * A hash followed by one or more characters that are not excluded. It is **not
 * end-anchored**, so it matches the *longest valid prefix*: in `#a,b` the tag is
 * `a`, and in `#a#b` it is `a`.
 *
 * The pattern is not start-anchored either, which is the entry's own reading —
 * and the documentation map records "no boundary rule for characters adjacent to
 * `#`" as an unresolved ambiguity, so no boundary is invented here. The
 * autocomplete *trigger* is a different pattern with a different job
 * ({@link TAG_TRIGGER_PATTERN}); `TAG-005` is explicit that the three patterns
 * are separate.
 *
 * Global, because callers scan with `String.prototype.matchAll` (which clones
 * the pattern, so this shared instance cannot leak `lastIndex` state).
 */
export const TAG_PATTERN = new RegExp(`#([^${TAG_EXCLUDED_CHARACTERS}]+)`, "g");

/**
 * The autocomplete trigger (`OBS-1.14.4-TAG-002`) — **recorded, not wired**.
 *
 * A hash preceded by the start of the text or whitespace, followed by zero or
 * more allowed characters up to the caret. Autocomplete is deferred until a tag
 * source exists (`BL-26`), so nothing calls this yet; it is here so the deferred
 * work has the entry's pattern instead of a re-derivation.
 *
 * The artifact's own copy is global because it scans a document; this one is not,
 * because the trigger is tested against one line-prefix at a time and a global
 * pattern would make `.test()` stateful.
 */
export const TAG_TRIGGER_PATTERN = new RegExp(
  `(^|\\s)#[^${TAG_EXCLUDED_CHARACTERS}]*$`,
);

/**
 * The documentation's non-numerical rule, which the artifact's regex does **not**
 * carry (`OBS-1.14.4-TAG-001`).
 *
 * "Tags must contain at least one non-numerical character", so `#1984` is not a
 * tag while `#y1984` is. The entry records that this rule "is NOT enforced by
 * this regex and must live elsewhere" and that *where* it is enforced was not
 * located, so it is enforced here — in the one place the scan can do it — and
 * recorded rather than silently folded into the pattern.
 */
export function isTagName(name: string): boolean {
  return /[^0-9]/.test(name);
}
