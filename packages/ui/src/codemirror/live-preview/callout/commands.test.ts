// Insert-callout command — F-15 Rev 2, plan Task 3.2.
//
// Acceptance: "insert command literal and selection 4–8; wrap selection; refused
// in a table cell."
//
// `OBS-1.14.4-CALLOUT-006` fixes the literal (`> [!NOTE]\n> `, upper case), the
// selection (`[4, 8)` — the `NOTE`), the leading newline after a non-empty line,
// the wrap template and the table-cell refusal.

import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import {
  INSERT_CALLOUT_SELECTION,
  INSERT_CALLOUT_TEXT,
  calloutWrapText,
  insertCallout,
} from "./commands";

/** Run the command and return the resulting state, or `null` when refused. */
function run(doc: string, anchor: number, head = anchor) {
  const state = EditorState.create({ doc, selection: { anchor, head } });
  // A holder object, not a `let`: TypeScript tracks property assignments inside
  // the dispatch callback, but not assignments to a captured variable.
  const result: { state: EditorState | null } = { state: null };
  insertCallout({
    state,
    dispatch: (transaction) => {
      result.state = transaction.state;
    },
  });
  return result.state;
}

/** Narrow away `null` without a non-null assertion. */
function must(value: EditorState | null): EditorState {
  if (value == null) throw new Error("expected the command to run");
  return value;
}

describe("insertCallout (OBS-1.14.4-CALLOUT-006)", () => {
  it("uses the artifact's literal and selection offsets", () => {
    expect(INSERT_CALLOUT_TEXT).toBe("> [!NOTE]\n> ");
    expect(INSERT_CALLOUT_SELECTION).toEqual([4, 8]);
  });

  it("inserts the marker on an empty line and selects the type name", () => {
    const next = must(run("", 0));
    expect(next.doc.toString()).toBe("> [!NOTE]\n> ");
    expect(next.selection.main.from).toBe(4);
    expect(next.selection.main.to).toBe(8);
    expect(next.doc.sliceString(4, 8)).toBe("NOTE");
  });

  it("prepends a newline when the previous line is non-empty", () => {
    const doc = "Text above\n";
    const next = must(run(doc, doc.length));
    expect(next.doc.toString()).toBe("Text above\n\n> [!NOTE]\n> ");
    // The selection shifts by the prepended newline and still covers `NOTE`.
    expect(next.doc.sliceString(next.selection.main.from, next.selection.main.to)).toBe("NOTE");
  });

  it("wraps a selection with a Title line and a Contents line", () => {
    const doc = "selected text";
    const next = must(run(doc, 0, doc.length));
    expect(calloutWrapText("selected text")).toBe("> [!NOTE] Title\n> selected text");
    expect(next.doc.toString()).toBe("> [!NOTE] Title\n> selected text");
    expect(next.doc.sliceString(next.selection.main.from, next.selection.main.to)).toBe("NOTE");
  });

  it("refuses inside a table cell", () => {
    const doc = "| A | B |\n| --- | --- |\n| x | y |\n";
    expect(run(doc, doc.indexOf("y"))).toBeNull();
  });

  it("does not refuse in ordinary text", () => {
    expect(run("plain paragraph\n", 0)).not.toBeNull();
  });
});
