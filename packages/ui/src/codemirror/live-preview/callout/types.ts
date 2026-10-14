/**
 * The callout type table (F-15 Rev 2, plan Task 3.2).
 *
 * `OBS-1.14.4-CALLOUT-001` records the artifact's table as **CSS keyed on a
 * `data-callout` attribute**, with 13 canonical selectors. Two catalogue details
 * are load-bearing and easy to get wrong from the help page:
 *
 * - `important` has its own selector, so it is **canonical**, not a `tip` alias —
 *   even though its visuals are identical to `tip`. The help page says otherwise;
 *   the entry carries the conflict and the artifact wins.
 * - `note` has no selector at all: it *is* the base rule. An unknown type falls
 *   back to it visually, and the `data-callout` attribute is **not** rewritten.
 *
 * Disposition `adapt`: the icon **shapes** are Tabler equivalents (`D-6`), and
 * per-type colours become semantic token roles (the project's status palette has
 * five hues, so the artifact's 13 map onto them — see `theme.ts`).
 */

/** One canonical callout type and the aliases that resolve to it. */
export type CalloutTypeSpec = {
  readonly id: string;
  readonly aliases: readonly string[];
  /** Key into `CALLOUT_ICONS`. */
  readonly icon: string;
  /** A note for the colour mapping; `data-callout` is what actually selects it. */
  readonly colour: string;
}

/**
 * The 13 canonical types (`OBS-1.14.4-CALLOUT-001`), in the artifact's order.
 */
export const CALLOUT_TYPES: readonly CalloutTypeSpec[] = [
  { id: "summary", aliases: ["abstract", "tldr"], icon: "clipboard-list", colour: "teal" },
  { id: "info", aliases: [], icon: "info", colour: "blue" },
  { id: "todo", aliases: [], icon: "check-circle", colour: "blue" },
  { id: "important", aliases: [], icon: "flame", colour: "cyan" },
  { id: "tip", aliases: ["hint"], icon: "flame", colour: "cyan" },
  { id: "success", aliases: ["check", "done"], icon: "check", colour: "green" },
  { id: "question", aliases: ["help", "faq"], icon: "help-circle", colour: "yellow" },
  { id: "warning", aliases: ["caution", "attention"], icon: "alert-triangle", colour: "orange" },
  { id: "fail", aliases: ["failure", "missing"], icon: "x", colour: "red" },
  { id: "error", aliases: ["danger"], icon: "bolt", colour: "red" },
  { id: "bug", aliases: [], icon: "bug", colour: "red" },
  { id: "example", aliases: [], icon: "list", colour: "purple" },
  { id: "quote", aliases: ["cite"], icon: "quote", colour: "gray" },
]

/** The canonical ids — `important` included, per the artifact. */
export const CANONICAL_CALLOUT_TYPES: readonly string[] = CALLOUT_TYPES.map((spec) => spec.id)

/**
 * The base type (`OBS-1.14.4-CALLOUT-001`): no selector, the default colour and
 * the pencil icon.
 */
export const NOTE_CALLOUT_TYPE: CalloutTypeSpec = {
  id: "note",
  aliases: [],
  icon: "pencil",
  colour: "blue",
}

const TYPES_BY_ID = new Map<string, CalloutTypeSpec>()
for (const spec of CALLOUT_TYPES) {
  TYPES_BY_ID.set(spec.id, spec)
  for (const alias of spec.aliases) TYPES_BY_ID.set(alias, spec)
}

/**
 * The spec for a normalised type id, or the base `note` spec.
 *
 * The attribute is *not* rewritten for an unknown type (`-001`): the caller keeps
 * `data-callout` as written and uses this for the icon and colour only.
 */
export function resolveCalloutType(type: string): CalloutTypeSpec {
  return TYPES_BY_ID.get(type) ?? NOTE_CALLOUT_TYPE
}
