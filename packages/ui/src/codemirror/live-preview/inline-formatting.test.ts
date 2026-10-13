// Inline formatting — F-15 Rev 2, plan Task 2.5.
//
// Acceptance (plan §5 Task 2.5): "`**bold**`, `*em*`, `` `code` ``,
// `~~strike~~`, `==highlight==` each render folded with the caret away and raw
// on touch; delimiter hiding is unaffected by source text; highlight colour
// emoji parsed when present (six canonical + square synonyms), default
// highlight otherwise."
//
// Four of the five kinds are grammar-modelled and were already folded by the
// Phase 1 walk; highlighting is not modelled at all and comes from this task's
// text layer. The test drives the real preview plugin for all five, so the two
// paths are held to one behaviour.

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { afterEach, describe, expect, it } from "vitest";
import { createHarness, type EditorHarness } from "../parity/harness";
import {
  HIGHLIGHT_COLOURS,
  HIGHLIGHT_EMOJI,
  HIGHLIGHT_MARKER,
  highlightColourOf,
  type HighlightColour,
} from "./decorations";
import { markdownLivePreviewPlugin } from "./index";
import type { Span } from "./taxonomy";

const LANGUAGE = markdown({ base: markdownLanguage });

let harness: EditorHarness | null = null;

afterEach(() => {
  harness?.destroy();
  harness = null;
});

type Kind = {
  readonly kind: string;
  /** Document with a plain content run between the delimiters. */
  readonly doc: string;
  readonly content: string;
  /** The delimiter text, as typed. */
  readonly delimiter: string;
  /** Delimiter ranges in `doc`, in order. */
  readonly delimiters: readonly Span[];
  /** A caret position inside the formatted content. */
  readonly inside: number;
};

const KINDS: readonly Kind[] = [
  {
    kind: "strong",
    doc: "**bold**\n",
    content: "bold",
    delimiter: "**",
    delimiters: [
      { from: 0, to: 2 },
      { from: 6, to: 8 },
    ],
    inside: 3,
  },
  {
    kind: "em",
    doc: "*em*\n",
    content: "em",
    delimiter: "*",
    delimiters: [
      { from: 0, to: 1 },
      { from: 3, to: 4 },
    ],
    inside: 2,
  },
  {
    kind: "inline-code",
    doc: "`code`\n",
    content: "code",
    delimiter: "`",
    delimiters: [
      { from: 0, to: 1 },
      { from: 5, to: 6 },
    ],
    inside: 3,
  },
  {
    kind: "strikethrough",
    doc: "~~strike~~\n",
    content: "strike",
    delimiter: "~~",
    delimiters: [
      { from: 0, to: 2 },
      { from: 8, to: 10 },
    ],
    inside: 4,
  },
  {
    kind: "highlight",
    doc: "==marked==\n",
    content: "marked",
    delimiter: "==",
    delimiters: [
      { from: 0, to: 2 },
      { from: 8, to: 10 },
    ],
    inside: 4,
  },
];

/** Folded-with-the-caret-away, then raw on touch, for one document. */
function assertFoldsAndReveals(
  view: EditorHarness,
  delimiter: string,
  content: string,
  inside: number,
  awayPos: number,
): void {
  view.placeCaret(awayPos);
  const folded = view.view.contentDOM.textContent ?? "";
  expect(folded).toContain(content);
  expect(folded).not.toContain(delimiter);

  view.placeCaret(inside);
  const revealed = view.view.contentDOM.textContent ?? "";
  expect(revealed).toContain(delimiter);
  expect(revealed).toContain(content);
}

describe("inline formatting folds and reveals (OBS-1.14.4-REVEAL-008, -011)", () => {
  for (const kind of KINDS) {
    it(`renders ${kind.kind} folded with the caret away and raw on touch`, () => {
      harness = createHarness({
        doc: kind.doc,
        extensions: [LANGUAGE, markdownLivePreviewPlugin],
      });
      // Focused, with the caret away from the construct: the editor is live and
      // the token still folds, because the span is not touched.
      harness.focus();
      assertFoldsAndReveals(
        harness,
        kind.delimiter,
        kind.content,
        kind.inside,
        kind.doc.length,
      );
    });

    it(`hides exactly the ${kind.kind} delimiters, and nothing else`, () => {
      harness = createHarness({
        doc: kind.doc,
        extensions: [LANGUAGE, markdownLivePreviewPlugin],
      });
      harness.focus();
      harness.placeCaret(kind.doc.length);

      const hidden = harness
        .decorations()
        .filter((d) => d.kind === "replace" && d.widget === undefined)
        .map((d) => ({ from: d.from, to: d.to }))
        .filter((span) => span.to > span.from);

      for (const delimiter of kind.delimiters) {
        expect(hidden, `${kind.kind} ${delimiter.from}-${delimiter.to}`).toContainEqual(
          delimiter,
        );
      }
      // The content run is never a hidden range.
      const content = kind.delimiters[0].to;
      expect(hidden.every((span) => span.from < content || span.from > content)).toBe(true);
    });
  }

  it("reveals a construct on a partial overlap from either side", () => {
    const kind = KINDS[0];
    harness = createHarness({
      doc: kind.doc,
      extensions: [LANGUAGE, markdownLivePreviewPlugin],
    });
    harness.focus();

    // A selection that merely touches the opening delimiter reveals the pair.
    harness.select(0, 1);
    expect(harness.view.contentDOM.textContent).toContain("**");

    // And one that touches from the far side does too.
    harness.select(kind.doc.length, kind.doc.length);
    expect(harness.view.contentDOM.textContent).not.toContain("**");
    harness.select(7, 8);
    expect(harness.view.contentDOM.textContent).toContain("**");
  });

  it("keeps the highlight mark on the content while the delimiters are folded", () => {
    harness = createHarness({
      doc: "==marked==\n",
      extensions: [LANGUAGE, markdownLivePreviewPlugin],
    });
    harness.focus();
    harness.placeCaret(10);

    // The content carries the highlight class; the `==` pair does not.
    expect(harness.classesAt(4)).toContain("cm-live-highlight");
    expect(harness.classesAt(0)).not.toContain("cm-live-highlight");
  });
});

describe("delimiter hiding does not depend on the source text", () => {
  it("hides the same delimiters whatever the content is", () => {
    const cases = [
      { doc: "**a**\n", delimiters: [{ from: 0, to: 2 }, { from: 3, to: 5 }] },
      {
        doc: "**a much longer run of words**\n",
        delimiters: [{ from: 0, to: 2 }, { from: 28, to: 30 }],
      },
      // Content that itself contains delimiter characters and punctuation.
      {
        doc: "**a * b _ c ~ d**\n",
        delimiters: [{ from: 0, to: 2 }, { from: 15, to: 17 }],
      },
    ];

    for (const { doc, delimiters } of cases) {
      const view = createHarness({
        doc,
        extensions: [LANGUAGE, markdownLivePreviewPlugin],
      });
      view.focus();
      view.placeCaret(doc.length);

      const hidden = view
        .decorations()
        .filter((d) => d.kind === "replace" && d.widget === undefined)
        .map((d) => ({ from: d.from, to: d.to }));

      for (const delimiter of delimiters) {
        expect(hidden, doc).toContainEqual(delimiter);
      }
      expect(view.view.contentDOM.textContent).not.toContain("**");
      view.destroy();
    }
  });

  it("hides the highlight delimiters whatever the content contains", () => {
    harness = createHarness({
      doc: "==a = b * c==\n",
      extensions: [LANGUAGE, markdownLivePreviewPlugin],
    });
    harness.focus();
    harness.placeCaret(14);

    const text = harness.view.contentDOM.textContent ?? "";
    expect(text).toContain("a = b * c");
    expect(text).not.toContain("==");
  });
});

describe("highlight colours (OBS-1.14.4-CMD-003 context)", () => {
  it("names the default plus the six colours", () => {
    expect(HIGHLIGHT_COLOURS).toEqual([
      "default",
      "red",
      "orange",
      "yellow",
      "green",
      "blue",
      "purple",
    ]);
    expect(HIGHLIGHT_MARKER).toBe("==");
  });

  it("gives each of the six colours a canonical circle and a square synonym", () => {
    for (const colour of HIGHLIGHT_COLOURS) {
      if (colour === "default") {
        expect(HIGHLIGHT_EMOJI[colour]).toEqual([]);
        continue;
      }
      expect(HIGHLIGHT_EMOJI[colour]).toHaveLength(2);
    }
    expect(HIGHLIGHT_EMOJI.red).toEqual(["🔴", "🟥"]);
    expect(HIGHLIGHT_EMOJI.purple).toEqual(["🟣", "🟪"]);
  });

  it("parses a leading colour emoji, circles and squares alike", () => {
    expect(highlightColourOf("🔴red")).toBe("red");
    expect(highlightColourOf("🟥red")).toBe("red");
    expect(highlightColourOf("🟠orange")).toBe("orange");
    expect(highlightColourOf("🟧orange")).toBe("orange");
    expect(highlightColourOf("🟡yellow")).toBe("yellow");
    expect(highlightColourOf("🟨yellow")).toBe("yellow");
    expect(highlightColourOf("🟢green")).toBe("green");
    expect(highlightColourOf("🟩green")).toBe("green");
    expect(highlightColourOf("🔵blue")).toBe("blue");
    expect(highlightColourOf("🟦blue")).toBe("blue");
    expect(highlightColourOf("🟣purple")).toBe("purple");
    expect(highlightColourOf("🟪purple")).toBe("purple");
  });

  it("falls back to the default colour without a leading emoji", () => {
    expect(highlightColourOf("plain")).toBe("default");
    expect(highlightColourOf("")).toBe("default");
    // An emoji that is not one of the twelve is just text.
    expect(highlightColourOf("🔶amber")).toBe("default");
    // "Immediately after the opening `==`" means the leading position only.
    expect(highlightColourOf("red 🔴")).toBe("default");
  });

  it("applies the colour class the emoji selects, and the default otherwise", () => {
    const expected: readonly (readonly [string, HighlightColour])[] = [
      ["==🔴red==", "red"],
      ["==🟧orange==", "orange"],
      ["==🟡yellow==", "yellow"],
      ["==🟩green==", "green"],
      ["==🔵blue==", "blue"],
      ["==🟪purple==", "purple"],
      ["==plain==", "default"],
    ];

    for (const [doc, colour] of expected) {
      const view = createHarness({
        doc: `${doc}\n`,
        extensions: [LANGUAGE, markdownLivePreviewPlugin],
      });
      view.focus();
      view.placeCaret(doc.length + 1);

      const contentAt = 3;
      const classes = view.classesAt(contentAt);
      expect(classes, doc).toContain("cm-live-highlight");
      if (colour === "default") {
        expect(classes.some((name) => name.startsWith("cm-live-highlight-")), doc).toBe(
          false,
        );
      } else {
        expect(classes, doc).toContain(`cm-live-highlight-${colour}`);
      }
      view.destroy();
    }
  });

  it("keeps the emoji in the text — stripping it was never established", () => {
    harness = createHarness({
      doc: "==🔴red==\n",
      extensions: [LANGUAGE, markdownLivePreviewPlugin],
    });
    harness.focus();
    harness.placeCaret(9);
    expect(harness.view.contentDOM.textContent).toContain("🔴red");
  });
});
