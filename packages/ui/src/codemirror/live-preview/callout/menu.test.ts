// Callout type menu — F-15 Rev 2, plan Task 3.2.
//
// Acceptance: "type menu mutations incl. 'None'".
//
// `OBS-1.14.4-CALLOUT-005` is the entry: items in the order `info, important,
// tip, success, question, warning, example, quote`; checked only when the item
// equals the **raw** source text (case-sensitively); a type pick rewrites only
// the text between `[!` and `]`; "None" drops the marker line and un-quotes the
// body.

import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import {
  CALLOUT_MENU_ORDER,
  calloutMenuItems,
  removeCallout,
  selectCalloutRange,
  setCalloutType,
} from "./menu";
import { scanCallouts } from "./parse";

function state(text: string): EditorState {
  return EditorState.create({ doc: text });
}

describe("menu items (OBS-1.14.4-CALLOUT-005)", () => {
  it("lists the eight types in the artifact's order", () => {
    expect(CALLOUT_MENU_ORDER).toEqual([
      "info",
      "important",
      "tip",
      "success",
      "question",
      "warning",
      "example",
      "quote",
    ]);
    expect(calloutMenuItems("note").map((item) => item.type)).toEqual([...CALLOUT_MENU_ORDER]);
  });

  it("checks an item only when it equals the raw source text, case-sensitively", () => {
    expect(calloutMenuItems("tip").find((item) => item.type === "tip")?.checked).toBe(true);
    // An upper-cased marker matches nothing — the comparison is raw.
    const upper = calloutMenuItems("TIP");
    expect(upper.some((item) => item.checked)).toBe(false);
  });
});

describe("type mutation (OBS-1.14.4-CALLOUT-005)", () => {
  it("replaces only the text between `[!` and `]`, leaving the fold and title", () => {
    const source = state("> [!note]- Keep me\n> Body\n");
    const [callout] = scanCallouts(source.doc);
    const next = source.update(setCalloutType(callout, "tip")).state.doc.toString();
    expect(next).toBe("> [!tip]- Keep me\n> Body\n");
  });

  it("selects the whole widget range for the edit item", () => {
    const source = state("> [!note] T\n> Body\n");
    const [callout] = scanCallouts(source.doc);
    expect(selectCalloutRange(callout)).toEqual({
      selection: { anchor: callout.from, head: callout.to },
    });
  });
});

describe("removal (OBS-1.14.4-CALLOUT-005, None)", () => {
  it("deletes the marker line and un-quotes the body", () => {
    const source = state("> [!note] T\n> body line\n> more\n\nAfter\n");
    const [callout] = scanCallouts(source.doc);
    const next = source.update(removeCallout(source.doc, callout)).state.doc.toString();
    expect(next).toBe("body line\nmore\n\nAfter\n");
  });

  it("handles a marker line at the end of the document", () => {
    const source = state("Intro\n\n> [!note] T");
    const [callout] = scanCallouts(source.doc);
    const next = source.update(removeCallout(source.doc, callout)).state.doc.toString();
    expect(next).toBe("Intro\n\n");
  });
});
