// Reveal predicate, focused ranges and accumulated spans — F-15 Rev 2, Task 2.2.
//
// Acceptance (plan §5 Task 2.2): "Inclusive predicate: caret inside, partial
// overlap both sides, caret outside; unfocused editor reveals nothing; a
// multi-token construct is one accumulated span; heading/quote/escape use the
// whole line."

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxTree } from "@codemirror/language";
import { EditorState, type Text } from "@codemirror/state";
import { afterEach, describe, expect, it } from "vitest";
import { CONSTRUCT_FIXTURES } from "../__fixtures__/constructs";
import { createHarness, type EditorHarness } from "../parity/harness";
import {
  WHOLE_LINE_CONSTRUCTS,
  accumulateSpan,
  constructSpan,
  focusedRanges,
  isRevealed,
  isWholeLineConstruct,
  revealContext,
  touches,
  touchesAny,
  wholeLineSpan,
  type Span,
} from "./reveal";

const EXTENSIONS = [markdown({ base: markdownLanguage })];

function parse(doc: string): EditorState {
  return EditorState.create({ doc, extensions: EXTENSIONS });
}

function fixture(id: string): string {
  const found = CONSTRUCT_FIXTURES.find((f) => f.id === id);
  if (!found) throw new Error(`no construct fixture named ${id}`);
  return found.markdown;
}

/** Node name → range, for every node in `doc` whose name is in `names`. */
function rangesOf(doc: string, names: readonly string[]): Span[] {
  const spans: Span[] = [];
  syntaxTree(parse(doc)).iterate({
    enter: (node) => {
      if (names.includes(node.name)) spans.push({ from: node.from, to: node.to });
    },
  });
  return spans;
}

let harness: EditorHarness | null = null;

afterEach(() => {
  harness?.destroy();
  harness = null;
});

describe("inclusive touch predicate (OBS-1.14.4-REVEAL-001)", () => {
  const span: Span = { from: 5, to: 10 };

  it("reveals for a zero-length caret anywhere inside the span", () => {
    expect(touches(span, 5, 5)).toBe(true);
    expect(touches(span, 7, 7)).toBe(true);
    expect(touches(span, 10, 10)).toBe(true);
  });

  it("reveals for a partial overlap from either side", () => {
    expect(touches(span, 0, 6)).toBe(true);
    expect(touches(span, 9, 20)).toBe(true);
    expect(touches(span, 0, 20)).toBe(true);
  });

  it("hides when the caret and the selection are both outside", () => {
    expect(touches(span, 4, 4)).toBe(false);
    expect(touches(span, 11, 11)).toBe(false);
    expect(touches(span, 0, 4)).toBe(false);
    expect(touches(span, 11, 30)).toBe(false);
  });

  it("is inclusive at the boundary and not a contains() test", () => {
    // A caret exactly on either edge touches; a span strictly inside a range
    // touches; a range strictly inside the span also touches (not `contains`).
    expect(touches(span, 6, 9)).toBe(true);
    expect(touches(span, 5, 10)).toBe(true);
    expect(touchesAny([{ from: 0, to: 1 }, { from: 20, to: 21 }], span)).toBe(false);
    expect(touchesAny([{ from: 0, to: 1 }, { from: 9, to: 12 }], span)).toBe(true);
  });
});

describe("only the focused editor reveals (OBS-1.14.4-REVEAL-002)", () => {
  it("contributes no ranges while unfocused", () => {
    const state = parse("**bold**");
    const selection = state.selection;
    expect(focusedRanges(selection, false)).toEqual([]);
    expect(focusedRanges(selection, true)).toHaveLength(selection.ranges.length);
    expect(focusedRanges(selection, true)[0]).toEqual({
      from: selection.main.from,
      to: selection.main.to,
    });
  });

  it("reveals nothing at all in an unfocused editor, whatever the caret does", () => {
    harness = createHarness({ doc: "**bold**", extensions: EXTENSIONS });
    harness.placeCaret(4);

    const span: Span = { from: 0, to: 8 };
    expect(isRevealed(revealContext(harness.state().selection, false), span)).toBe(
      false,
    );
    expect(isRevealed(revealContext(harness.state().selection, true), span)).toBe(true);
  });

  it("gates on focus in a real view, and reveals once focused", () => {
    harness = createHarness({ doc: "**bold**", extensions: EXTENSIONS });
    harness.placeCaret(4);

    expect(harness.view.hasFocus).toBe(false);
    expect(revealContext(harness.state().selection, harness.view.hasFocus).ranges).toEqual([]);

    harness.focus();
    expect(harness.view.hasFocus).toBe(true);
    expect(
      isRevealed(revealContext(harness.state().selection, harness.view.hasFocus), {
        from: 0,
        to: 8,
      }),
    ).toBe(true);
  });
});

describe("accumulated spans (OBS-1.14.4-REVEAL-011)", () => {
  it("accumulates every token of a multi-token construct into one span", () => {
    const tokens: Span[] = [
      { from: 2, to: 3 },
      { from: 14, to: 15 },
      { from: 15, to: 16 },
      { from: 16, to: 35 },
      { from: 36, to: 39 },
      { from: 39, to: 40 },
    ];
    expect(accumulateSpan(tokens)).toEqual({ from: 2, to: 40 });
  });

  it("has nothing to accumulate for an empty token list", () => {
    expect(accumulateSpan([])).toBeNull();
  });

  it("accumulates a real link's tokens into exactly the link node's range", () => {
    const doc = fixture("link");
    const [link] = rangesOf(doc, ["Link"]);
    const tokens = rangesOf(doc, ["LinkMark", "URL", "LinkTitle"]).filter(
      (token) => token.from >= link.from && token.to <= link.to,
    );
    // Six tokens — two bracket marks, the URL, the title and its marks — and
    // one accumulated span.
    expect(tokens.length).toBeGreaterThan(1);
    expect(accumulateSpan(tokens)).toEqual({ from: link.from, to: link.to });
  });

  it("names heading, quote and escape as the whole-line constructs", () => {
    expect(WHOLE_LINE_CONSTRUCTS).toEqual(["heading", "quote", "escape"]);
    expect(isWholeLineConstruct("heading")).toBe(true);
    expect(isWholeLineConstruct("quote")).toBe(true);
    expect(isWholeLineConstruct("escape")).toBe(true);
    expect(isWholeLineConstruct("strong")).toBe(false);
    expect(isWholeLineConstruct("link")).toBe(false);
  });

  it("uses the whole line for a heading token", () => {
    const doc = "# A heading\n\nA paragraph.\n";
    const state = parse(doc);
    const text: Text = state.doc;
    const [headerMark] = rangesOf(doc, ["HeaderMark"]);
    const span = constructSpan(text, "heading", [headerMark]);
    expect(span).toEqual(wholeLineSpan(text, headerMark.from));
    expect(span).toEqual({ from: 0, to: doc.indexOf("\n") });
  });

  it("uses the whole line for a quote marker and for an escape", () => {
    const doc = "> quoted\n";
    const state = parse(doc);
    const [quoteMark] = rangesOf(doc, ["QuoteMark"]);
    expect(constructSpan(state.doc, "quote", [quoteMark])).toEqual({
      from: 0,
      to: doc.indexOf("\n"),
    });
    expect(constructSpan(state.doc, "escape", [{ from: 3, to: 3 }])).toEqual({
      from: 0,
      to: doc.indexOf("\n"),
    });
  });

  it("keeps an inline construct on its token span, not its line", () => {
    const doc = "Say **hi** now\n";
    const state = parse(doc);
    const tokens = rangesOf(doc, ["EmphasisMark"]);
    expect(constructSpan(state.doc, "strong", tokens)).toEqual(accumulateSpan(tokens));
    expect(constructSpan(state.doc, "strong", tokens)).not.toEqual(
      wholeLineSpan(state.doc, tokens[0].from),
    );
  });
});
