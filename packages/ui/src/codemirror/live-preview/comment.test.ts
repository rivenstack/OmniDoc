// Comments in Live Preview — F-15 Rev 2, plan Task 2.7.
//
// Acceptance (plan §5 Task 2.7): "LP: `%%x%%` visible and faint with the caret
// inside and outside — never hidden; the pair toggle spans a line break; inside
// code/href it is literal; a table row resets it."
//
// `OBS-1.14.4-COMMENT-001` is a *negative* entry: the plausible port hides
// comments in Live Preview and reveals them on touch, and the artifact provably
// does not (plan §0.4 negative 6). The tests below are therefore written to
// fail if a reveal rule ever appears.

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { afterEach, describe, expect, it } from "vitest";
import { CONSTRUCT_FIXTURES } from "../__fixtures__/constructs";
import { createHarness, type EditorHarness } from "../parity/harness";
import { COMMENT_DELIMITER, scanComments } from "./comment";
import { markdownLivePreviewPlugin } from "./index";
import { buildRegionIndex } from "./taxonomy";

const LANGUAGE = markdown({ base: markdownLanguage });

let harness: EditorHarness | null = null;

afterEach(() => {
  harness?.destroy();
  harness = null;
});

function fixture(id: string): string {
  const found = CONSTRUCT_FIXTURES.find((f) => f.id === id);
  if (!found) throw new Error(`no construct fixture named ${id}`);
  return found.markdown;
}

function mount(doc: string): EditorHarness {
  harness = createHarness({ doc, extensions: [LANGUAGE, markdownLivePreviewPlugin] });
  return harness;
}

/** The scanned comment ranges for a document, with the region index built. */
function scan(doc: string): ReturnType<typeof scanComments> {
  const state = EditorState.create({ doc, extensions: [LANGUAGE] });
  return scanComments(state.doc, 0, state.doc.length, buildRegionIndex(state));
}

describe("the delimiter is shared with the reading path (OBS-1.14.4-COMMENT-002)", () => {
  it("uses the same `%%` constant", () => {
    expect(COMMENT_DELIMITER).toBe("%%");
  });
});

describe("comments are visible and faint, never hidden (OBS-1.14.4-COMMENT-001)", () => {
  it("styles an inline comment and keeps every character on screen", () => {
    const view = mount("An %%inline comment%% inside a paragraph.\n");
    view.focus();
    // Caret away from the comment.
    view.placeCaret(38);

    const text = view.view.contentDOM.textContent ?? "";
    expect(text).toContain("%%inline comment%%");
    expect(view.classesAt(5)).toContain("cm-live-comment");
    // The `%%` pair carries the comment class plus its marker class.
    expect(view.classesAt(3)).toContain("cm-live-comment");
    expect(view.classesAt(3)).toContain("cm-live-comment-marker");
  });

  it("renders identically with the caret inside the comment — there is no reveal rule", () => {
    const view = mount("An %%inline comment%% inside a paragraph.\n");
    view.focus();

    view.placeCaret(38);
    const outside = view.view.contentDOM.textContent;
    const outsideClasses = view.classesAt(5).slice().sort();

    view.placeCaret(6);
    const inside = view.view.contentDOM.textContent;
    const insideClasses = view.classesAt(5).slice().sort();

    expect(inside).toBe(outside);
    expect(insideClasses).toEqual(outsideClasses);
    expect(inside).toContain("%%inline comment%%");
  });

  it("never emits a replace over a comment — no hiding, on any path", () => {
    const view = mount("An %%inline comment%% here.\n\n%%\nA block.\n%%\n");
    view.focus();
    view.placeCaret(0);

    const replaces = view.decorations().filter((d) => d.kind === "replace");
    const commentSpans = scan("An %%inline comment%% here.\n\n%%\nA block.\n%%\n");
    expect(commentSpans.length).toBeGreaterThan(0);
    for (const span of commentSpans) {
      expect(
        replaces.some((d) => d.from < span.to && d.to > span.from),
        `${span.from}-${span.to}`,
      ).toBe(false);
    }
  });
});

describe("the `%%` pair is a toggle with stream state (OBS-1.14.4-COMMENT-002)", () => {
  it("marks a same-line pair and its body", () => {
    const ranges = scan("An %%inline comment%% here.\n");
    expect(ranges).toEqual([
      { from: 3, to: 5, marker: true },
      { from: 5, to: 19, marker: false },
      { from: 19, to: 21, marker: true },
    ]);
  });

  it("carries the flag across a line break, so an unclosed pair marks the rest", () => {
    const doc = "A comment with unclosed %% mark,\nwhich hides nothing in the editor.\n";
    const ranges = scan(doc);
    const open = doc.indexOf("%%");
    const firstBreak = doc.indexOf("\n");
    const secondLine = doc.slice(firstBreak + 1, doc.length - 1);

    // The pair itself, then the rest of its line, then the whole next line —
    // the flag is stream state, so it survives the line break.
    expect(ranges).toEqual([
      { from: open, to: open + 2, marker: true },
      { from: open + 2, to: firstBreak, marker: false },
      {
        from: firstBreak + 1,
        to: firstBreak + 1 + secondLine.length,
        marker: false,
      },
    ]);
  });

  it("closes the comment at the next pair on a later line", () => {
    const doc = "%%\nA block comment that spans\nseveral lines.\n%%\n";
    const ranges = scan(doc);
    const close = doc.lastIndexOf("%%");

    expect(ranges.filter((r) => r.marker).map((r) => ({ from: r.from, to: r.to }))).toEqual([
      { from: 0, to: 2 },
      { from: close, to: close + 2 },
    ]);
    // Two bodies: the two full lines between the pairs. The opening pair is
    // alone on its line, so that line has no body of its own.
    expect(ranges.filter((r) => !r.marker).length).toBe(2);
  });

  it("does not toggle inside a code span or a fenced block", () => {
    const doc = "Inline `code %% not a comment %% inside a code span`.\n";
    expect(scan(doc)).toEqual([]);

    const fenced = "```\n%% not a comment %%\n```\n";
    expect(scan(fenced)).toEqual([]);
  });

  it("does not toggle inside a link, text or href", () => {
    const doc = "A [link with %% inside](https://example.com/%%path%%) its href.\n";
    expect(scan(doc)).toEqual([]);
  });

  it("resets the flag at a table row", () => {
    const doc = "After a table row the %% state resets.\n";
    // Without a table, the unclosed pair marks the rest of the line.
    expect(scan(doc)).toHaveLength(2);

    const withTable = [
      "%% unclosed before a table",
      "| a | b |",
      "| --- | --- |",
      "| 1 | 2 |",
      "After the table %% resets.",
      "",
    ].join("\n");
    const ranges = scan(withTable);
    const tableStart = withTable.indexOf("| a | b |");
    const afterTable = withTable.indexOf("After the table");

    // The comment that was open before the table stops there: the row reset the
    // flag, so nothing inside the table is comment text.
    expect(ranges.some((r) => r.from >= tableStart && r.from < afterTable)).toBe(false);
    expect(ranges.every((r) => r.to <= tableStart || r.from >= afterTable)).toBe(true);
    // The first body is the opening line's own text, and stops before the row.
    const firstBody = ranges.find((r) => !r.marker);
    expect(firstBody).toEqual({ from: 2, to: withTable.indexOf("\n"), marker: false });
  });
});

describe("the fixture corpus pins the comment cases", () => {
  it("scans the comment fixture: literal in code and links, reset by the table", () => {
    const doc = fixture("comment");
    const ranges = scan(doc);
    const markers = ranges.filter((r) => r.marker);
    const markerStarts = markers.map((r) => r.from);

    // A `%%` inside a code span or inside a link does not toggle: neither pair
    // is a marker.
    const codeLine = doc.indexOf("Inline `code");
    const codeLineEnd = doc.indexOf("\n", codeLine);
    expect(markerStarts.some((from) => from >= codeLine && from < codeLineEnd)).toBe(false);

    const linkLine = doc.indexOf("A [link with");
    const linkLineEnd = doc.indexOf("\n", linkLine);
    expect(markerStarts.some((from) => from >= linkLine && from < linkLineEnd)).toBe(false);

    // The unclosed pair before the table does not continue into it: the row
    // reset the flag, so nothing between the link line and the table row is
    // comment text any more.
    const tableStart = doc.indexOf("| cell |");
    const afterTable = doc.indexOf("After a table row");
    expect(ranges.some((r) => r.from >= linkLineEnd && r.from < tableStart)).toBe(false);

    // The inline pair and the pair after the table are markers; the pair in a
    // code span and the pairs inside a link are not (asserted above).
    expect(markerStarts).toContain(doc.indexOf("%%inline comment%%"));
    expect(markerStarts).toContain(doc.lastIndexOf("%%"));
    expect(markerStarts.some((from) => from >= afterTable)).toBe(true);
  });
});
