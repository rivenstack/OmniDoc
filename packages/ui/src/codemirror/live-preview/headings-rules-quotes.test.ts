// Headings, rules and quote borders — F-15 Rev 2, plan Task 2.6.
//
// Acceptance (plan §5 Task 2.6): "Heading marker hidden with the line rendered;
// caret anywhere on the line reveals; HR renders as a rule; blockquote border
// glyph is a widget with the literal `>` and a transparency class."
//
// The catalogue entries are `OBS-1.14.4-REVEAL-007` (the quote border widget),
// `-REVEAL-011` (the whole-line span a heading reveals over) and
// `-FOLD-002` (the heading pattern, landed as a regex only).

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { afterEach, describe, expect, it } from "vitest";
import { createHarness, type EditorHarness } from "../parity/harness";
import { HEADING_PATTERN } from "./decorations";
import { markdownLivePreviewPlugin } from "./index";
import { QUOTE_BORDER_GLYPH } from "./widgets";

const LANGUAGE = markdown({ base: markdownLanguage });

let harness: EditorHarness | null = null;

afterEach(() => {
  harness?.destroy();
  harness = null;
});

function mount(doc: string): EditorHarness {
  harness = createHarness({ doc, extensions: [LANGUAGE, markdownLivePreviewPlugin] });
  return harness;
}

describe("headings (OBS-1.14.4-REVEAL-011)", () => {
  it("hides the marker and keeps the line rendered", () => {
    const view = mount("# A title\ntext\n");
    view.focus();
    // The caret is on the next line, so the heading's whole-line span is not
    // touched and the marker folds.
    view.placeCaret(10);

    const text = view.view.contentDOM.textContent ?? "";
    expect(text).toContain("A title");
    expect(text).not.toContain("#");
    // The line still carries its heading class, so the text renders as a heading.
    expect(view.classesAt(2)).toContain("cm-live-h1");
  });

  it("reveals the marker from anywhere on the heading line", () => {
    const view = mount("# A title\n\nA paragraph.\n");
    view.focus();

    // Caret at the far end of the line — still the heading's whole-line span.
    view.placeCaret(8);
    expect(view.view.contentDOM.textContent).toContain("#");

    // Caret on the following line: the heading folds again.
    view.placeCaret(12);
    expect(view.view.contentDOM.textContent).not.toContain("#");
  });

  it("styles each of the three scale levels, and folds every heading level", () => {
    const view = mount("# One\n\n## Two\n\n### Three\n\n#### Four\n");
    view.focus();
    view.placeCaret(view.doc().length);

    expect(view.classesAt(2)).toContain("cm-live-h1");
    expect(view.classesAt(9)).toContain("cm-live-h2");
    expect(view.classesAt(18)).toContain("cm-live-h3");
    // `#### Four` has no scale step of its own, but its marker still folds.
    expect(view.view.contentDOM.textContent).toContain("Four");
    expect(view.view.contentDOM.textContent).not.toContain("#");
  });

  it("pins the artifact's heading pattern (OBS-1.14.4-FOLD-002)", () => {
    // One to six hashes, then whitespace or end of line.
    for (const hashes of ["#", "##", "###", "####", "#####", "######"]) {
      expect(HEADING_PATTERN.test(`${hashes} title`), hashes).toBe(true);
      expect(HEADING_PATTERN.test(hashes), hashes).toBe(true);
      expect(HEADING_PATTERN.test(`  ${hashes} indented`), hashes).toBe(true);
    }
    // Seven or more hashes is not a foldable heading.
    expect(HEADING_PATTERN.test("####### seven")).toBe(false);
    // A hash with no whitespace after it is not a heading marker.
    expect(HEADING_PATTERN.test("#hash")).toBe(false);
    expect(HEADING_PATTERN.test("##tag/sub")).toBe(false);
  });
});

describe("horizontal rules", () => {
  it("renders `---` as a rule instead of its source text", () => {
    const view = mount("Above\n\n---\n\nBelow\n");
    view.focus();
    view.placeCaret(0);

    const text = view.view.contentDOM.textContent ?? "";
    expect(text).not.toContain("---");
    expect(text).toContain("Above");
    expect(text).toContain("Below");
    expect(view.view.contentDOM.querySelector(".cm-live-hr")).not.toBeNull();
  });

  it("shows the raw `---` while the caret is on the rule's line", () => {
    const view = mount("Above\n\n---\n\nBelow\n");
    view.focus();
    view.placeCaret(8);

    expect(view.view.contentDOM.textContent).toContain("---");
  });
});

describe("blockquote border (OBS-1.14.4-REVEAL-007)", () => {
  it("draws the border as a widget whose content is the literal `>`", () => {
    const view = mount("> quoted line\n");
    view.focus();
    view.placeCaret(14);

    const widget = view.view.contentDOM.querySelector(".cm-live-quote-border");
    expect(widget).not.toBeNull();
    expect(widget?.textContent).toBe(QUOTE_BORDER_GLYPH);
    // The glyph is real content, and it is transparent — the border the class
    // draws is what the reader sees.
    expect(widget?.classList.contains("cm-live-transparent")).toBe(true);
    // The widget is decoration, so it stays out of the document and out of the
    // accessibility tree.
    expect(widget?.getAttribute("aria-hidden")).toBe("true");
  });

  it("keeps the source marker when the caret is on the quoted line", () => {
    const view = mount("> quoted line\n");
    view.focus();
    view.placeCaret(5);

    expect(view.view.contentDOM.querySelector(".cm-live-quote-border")).toBeNull();
    expect(view.view.contentDOM.textContent).toContain(">");
  });

  it("does not put the rule on the line as well as on the widget", () => {
    const view = mount("> quoted line\n");
    view.focus();
    view.placeCaret(14);

    const line = view.view.contentDOM.querySelector(".cm-line.cm-live-quote");
    expect(line).not.toBeNull();
    // The muted colour is the line's job; the rule belongs to the widget.
    expect(line?.querySelector(".cm-live-quote-border")).not.toBeNull();
  });

  it("gives every line of a multi-line quote the border", () => {
    const view = mount("> first\n> second\n");
    view.focus();
    view.placeCaret(17);

    expect(view.view.contentDOM.querySelectorAll(".cm-live-quote-border")).toHaveLength(2);
    expect(view.view.contentDOM.querySelectorAll(".cm-line.cm-live-quote")).toHaveLength(2);
  });
});
