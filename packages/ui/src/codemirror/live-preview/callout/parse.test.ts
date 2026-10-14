// Callout parsing — F-15 Rev 2, plan Task 3.2.
//
// Acceptance (plan §5 Task 3.2): "Type normalisation; title derivation
// (`tldr → Tldr`, `my-type → My type`); ... nesting."
//
// The entries are `OBS-1.14.4-CALLOUT-002` (title rule), `-003` (the fold
// marker's pattern), `-004` (the block range), `-007` (type normalisation) and
// `-010` (nesting).

import { Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { CONSTRUCT_FIXTURES } from "../../__fixtures__/constructs";
import {
  CALLOUT_MARKER_PATTERN,
  calloutTitle,
  defaultCalloutTitle,
  normalizeCalloutType,
  outermostCallouts,
  parseCalloutMarker,
  quoteDepth,
  scanCallouts,
  stripQuoteDepth,
} from "./parse";

function doc(text: string): Text {
  return Text.of(text.split("\n"));
}

/** Narrow away `null` without a non-null assertion. */
function must<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("expected a value");
  return value;
}

function fixture(id: string): string {
  return CONSTRUCT_FIXTURES.find((entry) => entry.id === id)?.markdown ?? "";
}

describe("type normalisation (OBS-1.14.4-CALLOUT-007)", () => {
  it("trims, lower-cases and turns whitespace runs into single hyphens", () => {
    expect(normalizeCalloutType("  NOTE  ")).toBe("note");
    expect(normalizeCalloutType("My Type")).toBe("my-type");
    expect(normalizeCalloutType("my   type")).toBe("my-type");
    expect(normalizeCalloutType("MY-TYPE")).toBe("my-type");
  });

  it("preserves hyphens and underscores", () => {
    expect(normalizeCalloutType("my--type")).toBe("my--type");
    expect(normalizeCalloutType("my_type")).toBe("my_type");
  });
});

describe("title derivation (OBS-1.14.4-CALLOUT-002)", () => {
  it("hyphen-to-space, lower-case, first char upper-cased", () => {
    expect(defaultCalloutTitle("tldr")).toBe("Tldr");
    expect(defaultCalloutTitle("my-type")).toBe("My type");
    expect(defaultCalloutTitle("MY-TYPE")).toBe("My type");
    expect(defaultCalloutTitle("my_type")).toBe("My_type");
  });
});

describe("marker pattern (OBS-1.14.4-CALLOUT-003)", () => {
  it("captures the type, an optional +/−, and requires whitespace or EOL after", () => {
    expect(CALLOUT_MARKER_PATTERN.exec("[!note] Title")).toMatchObject({ 1: "note", 2: "" });
    expect(CALLOUT_MARKER_PATTERN.exec("[!tip]+ Nested")).toMatchObject({ 1: "tip", 2: "+" });
    expect(CALLOUT_MARKER_PATTERN.exec("[!TIP]- Collapsed")).toMatchObject({ 1: "TIP", 2: "-" });
    expect(CALLOUT_MARKER_PATTERN.test("[!note]")).toBe(true);
    // No whitespace and no fold → not a marker ("[!note]suffix").
    expect(CALLOUT_MARKER_PATTERN.exec("[!note]suffix")).toBeNull();
  });

  it("parses a marker line into raw/normalised type, fold, title and range", () => {
    const line = "> [!TIP]- Collapsed by default";
    const marker = parseCalloutMarker(line, 100);
    expect(marker).toMatchObject({
      rawType: "TIP",
      type: "tip",
      fold: "-",
      titleText: "Collapsed by default",
      typeFrom: 104,
      typeTo: 107,
    });
    // The marker text between `[!` and `]` — what the type menu rewrites.
    const parsed = must(marker);
    expect(line.slice(parsed.typeFrom - 100, parsed.typeTo - 100)).toBe("TIP");
    expect(line.slice(parsed.markerFrom - 100, parsed.markerTo - 100)).toBe("[!TIP]");
  });

  it("finds no marker in a plain quote or a barer line", () => {
    expect(parseCalloutMarker("> Ordinary quote, not a callout.", 0)).toBeNull();
    expect(parseCalloutMarker("[!note] no quote prefix", 0)).toBeNull();
  });
});

describe("quote prefix helpers", () => {
  it("counts nesting depth and strips exactly that many markers", () => {
    expect(quoteDepth("> one")).toBe(1);
    expect(quoteDepth("> > two")).toBe(2);
    expect(quoteDepth(">>two")).toBe(2);
    expect(quoteDepth("plain")).toBe(0);

    expect(stripQuoteDepth("> > Nested body.", 1)).toBe("> Nested body.");
    expect(stripQuoteDepth("> > Nested body.", 2)).toBe("Nested body.");
  });
});

describe("block scanning (OBS-1.14.4-CALLOUT-004, -010)", () => {
  it("finds the four callouts in the fixture and ignores the plain quote", () => {
    const callouts = scanCallouts(doc(fixture("callout")));
    expect(callouts.map((c) => c.type)).toEqual(["note", "tip", "important", "warning"]);
    expect(callouts.map((c) => c.fold)).toEqual(["", "-", "", ""]);
    expect(callouts.map((c) => c.rawType)).toEqual(["note", "TIP", "important", "warning"]);
  });

  it("extends the range over consecutive quote lines and stops at a blank line", () => {
    const text = "> [!note] A\n> body line\n> another\n\n> [!note] B\n";
    const callouts = scanCallouts(doc(text));
    expect(callouts).toHaveLength(2);
    expect(text.slice(callouts[0].from, callouts[0].to)).toBe("> [!note] A\n> body line\n> another");
  });

  it("does not detect a marker under a quote at the same or greater depth", () => {
    const text = "> [!note] A\n> [!tip] not-a-new-callout\n> body\n";
    const callouts = scanCallouts(doc(text));
    expect(callouts.map((c) => c.type)).toEqual(["note"]);
  });

  it("detects a nested callout only on the innermost quote's first line", () => {
    const callouts = scanCallouts(doc(fixture("callout-nested")));
    // Outer (depth 1) and inner (depth 2); the triple quote has no marker.
    expect(callouts.map((c) => [c.type, c.depth])).toEqual([
      ["quote", 1],
      ["tip", 2],
    ]);
    expect(outermostCallouts(callouts).map((c) => c.type)).toEqual(["quote"]);
  });

  it("derives a title from the type when the marker line carries none", () => {
    const [callout] = scanCallouts(doc("> [!warning]\n> Body only.\n"));
    expect(callout.titleText).toBe("");
    expect(calloutTitle(callout)).toBe("Warning");
  });

  it("keeps the marker line's own text as the title when present", () => {
    const [callout] = scanCallouts(doc("> [!tldr] Short version\n> Body.\n"));
    expect(calloutTitle(callout)).toBe("Short version");
  });
});
