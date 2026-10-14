/**
 * The "Insert callout" command (F-15 Rev 2, plan Task 3.2).
 *
 * `OBS-1.14.4-CALLOUT-006` fixes the literal exactly: `> [!NOTE]` — **upper
 * case** even though the parser lower-cases type ids — then a newline and `> `,
 * and the caret then selects characters **4 through 8** of the inserted line,
 * i.e. the `NOTE` inside the brackets. With a non-empty selection the command
 * wraps it instead; inside a table cell it refuses.
 */

import type { StateCommand } from "@codemirror/state";
import { findTableBlocks } from "../table/scan";

/** The inserted literal, case for case (`OBS-1.14.4-CALLOUT-006`). */
export const INSERT_CALLOUT_TEXT = "> [!NOTE]\n> ";

/** The `NOTE` text's offsets in the inserted line — `[4, 8)`. */
export const INSERT_CALLOUT_SELECTION: readonly [number, number] = [4, 8];

/** The placeholder title the wrap template leaves on the marker line. */
export const WRAP_CALLOUT_TITLE = "Title";

/**
 * The wrap template: a Title line and a Contents line (`-006`).
 *
 * The selection becomes the Contents line; the marker line carries the
 * placeholder title, and the caret selects the `NOTE` on the marker line.
 */
export function calloutWrapText(selected: string): string {
  return `> [!NOTE] ${WRAP_CALLOUT_TITLE}\n> ${selected}`;
}

/** True when `pos` sits inside a table block (`-006`: refused in a table cell). */
function insideTable(state: Parameters<StateCommand>[0]["state"], pos: number): boolean {
  return findTableBlocks(state.doc).some((block) => pos >= block.from && pos <= block.to);
}

/**
 * Insert a callout, or wrap the selection in one.
 *
 * Returns `false` (the command "was not handled") inside a table cell, so the
 * keymap can fall through rather than corrupting the table's source.
 */
export const insertCallout: StateCommand = ({ state, dispatch }) => {
  const { doc, selection } = state;
  const main = selection.main;

  if (insideTable(state, main.from)) return false;

  if (!main.empty) {
    const selected = doc.sliceString(main.from, main.to);
    dispatch(
      state.update({
        changes: { from: main.from, to: main.to, insert: calloutWrapText(selected) },
        selection: {
          anchor: main.from + INSERT_CALLOUT_SELECTION[0],
          head: main.from + INSERT_CALLOUT_SELECTION[1],
        },
        userEvent: "input.insertCallout",
      }),
    );
    return true;
  }

  const line = doc.lineAt(main.from);
  // `-006`: a leading newline is prepended when the previous line is non-empty,
  // and the selection shifts with it.
  const previous = line.number > 1 ? doc.line(line.number - 1) : null;
  const leading = main.from === line.from && previous && previous.text !== "" ? "\n" : "";
  const insert = `${leading}${INSERT_CALLOUT_TEXT}`;

  dispatch(
    state.update({
      changes: { from: main.from, insert },
      selection: {
        anchor: main.from + leading.length + INSERT_CALLOUT_SELECTION[0],
        head: main.from + leading.length + INSERT_CALLOUT_SELECTION[1],
      },
      userEvent: "input.insertCallout",
    }),
  );
  return true;
};
