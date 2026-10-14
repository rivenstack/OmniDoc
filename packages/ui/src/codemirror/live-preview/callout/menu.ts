/**
 * The callout type menu (F-15 Rev 2, plan Task 3.2).
 *
 * `OBS-1.14.4-CALLOUT-005` records a right-click submenu titled "Callout type"
 * whose items mutate the **document**, unlike the fold click. Three details are
 * reproduced rather than smoothed over:
 *
 * - the item order is `info, important, tip, success, question, warning, example,
 *   quote` — note it is *not* the canonical colour order of `-001`;
 * - an item is checked when it equals the **raw** source slice between `[!` and
 *   `]`, compared case-sensitively, so an upper-cased `[!TIP]` shows **nothing**
 *   checked (`-007`);
 * - "None" removes the callout: it deletes the whole marker line *including its
 *   newline* and strips the quote prefix from each following line, leaving the
 *   body as plain text.
 *
 * The disposition is `adapt`: the artifact opens a native Electron context menu,
 * so this is rendered as an in-place web menu on the widget instead.
 */

import type { ChangeSpec, Text, TransactionSpec } from "@codemirror/state";
import { defaultCalloutTitle, quotePrefix, type Callout } from "./parse";

/** The menu's item order (`OBS-1.14.4-CALLOUT-005`). */
export const CALLOUT_MENU_ORDER = [
  "info",
  "important",
  "tip",
  "success",
  "question",
  "warning",
  "example",
  "quote",
] as const;

/** One type entry in the menu. */
export type CalloutMenuItem = {
  readonly type: string;
  readonly label: string;
  /** Checked when the raw source text equals the item's type, exactly. */
  readonly checked: boolean;
};

/**
 * The menu's type items for a callout, in the artifact's order.
 *
 * The checked test is deliberately `rawType === type` — case-sensitive against
 * the source, **not** the normalised id (`-005` edge case, `-007`).
 */
export function calloutMenuItems(rawType: string): CalloutMenuItem[] {
  return CALLOUT_MENU_ORDER.map((type) => ({
    type,
    label: defaultCalloutTitle(type),
    checked: rawType === type,
  }));
}

/**
 * Replace only the text between `[!` and `]` (`-005`).
 *
 * The fold marker and the title stay exactly as they were.
 */
export function setCalloutType(callout: Callout, type: string): TransactionSpec {
  return {
    changes: { from: callout.typeFrom, to: callout.typeTo, insert: type },
    userEvent: "input.setCalloutType",
  };
}

/**
 * Remove the callout (`-005`): drop the marker line and un-quote the body.
 *
 * The marker line goes with its newline; every following line of the block gives
 * up its quote prefix, so the body becomes ordinary text.
 */
export function removeCallout(doc: Text, callout: Callout): TransactionSpec {
  const markerLine = doc.lineAt(callout.markerLine.from);
  const changes: ChangeSpec[] = [];

  changes.push({
    from: markerLine.from,
    to: markerLine.to < doc.length ? markerLine.to + 1 : markerLine.to,
  });

  const lastLine = doc.lineAt(callout.to).number;
  for (let number = markerLine.number + 1; number <= lastLine; number += 1) {
    const line = doc.line(number);
    const prefix = quotePrefix(line.text);
    if (prefix.length > 0) changes.push({ from: line.from, to: line.from + prefix.length });
  }

  return { changes, userEvent: "input.removeCallout" };
}

/** Select the whole raw range, which reveals the Markdown (`-005` edit item). */
export function selectCalloutRange(callout: Callout): TransactionSpec {
  return { selection: { anchor: callout.from, head: callout.to } };
}
