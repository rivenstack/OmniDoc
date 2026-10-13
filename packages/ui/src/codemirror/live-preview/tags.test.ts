// Tag parsing and styling — F-15 Rev 2, plan Task 2.9.
//
// Acceptance (plan §5 Task 2.9): "Longest-prefix match; a numeric-only tag does
// not match; three-part class split emitted; the single constant is used by
// parser and scanner (grep-level test)."
//
// Catalogue: `OBS-1.14.4-TAG-001` (the exclusion class), `-TAG-003` (the
// three-part class split) and `-TAG-005` (one character class, not three) are
// adopted; `TAG-002` (autocomplete) and `TAG-004` (click to search) are
// **deferred** behind the `BL-26` collections/tags contract, so the tests below
// also assert that nothing is interactive yet.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxTree } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { afterEach, describe, expect, it } from "vitest";
import { CONSTRUCT_FIXTURES } from "../__fixtures__/constructs";
import { createHarness, type EditorHarness } from "../parity/harness";
import {
  TAG_EXCLUDED_CHARACTERS,
  TAG_TRIGGER_PATTERN,
  isTagName,
} from "../tags/regex";
import { markdownLivePreviewPlugin } from "./index";
import { scanTags } from "./tags";
import { buildRegionIndex } from "./taxonomy";

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

/** Scan a document for tags, with the region index built. */
function scan(doc: string): ReturnType<typeof scanTags> {
  const state = EditorState.create({ doc, extensions: [LANGUAGE] });
  return scanTags(state.doc, 0, state.doc.length, buildRegionIndex(state));
}

function names(doc: string): string[] {
  return scan(doc).map((span) => span.name);
}

describe("the grammar models nothing for a tag (plan §7 risk D-5)", () => {
  it("produces no syntax node for `#tag`", () => {
    const state = EditorState.create({
      doc: "#tag and #nested/tag\n",
      extensions: [LANGUAGE],
    });
    const nodeNames: string[] = [];
    syntaxTree(state).iterate({ enter: (node) => void nodeNames.push(node.name) });
    expect(nodeNames.filter((name) => name !== "Document" && name !== "Paragraph")).toEqual([]);
  });
});

describe("the exclusion class is one constant (OBS-1.14.4-TAG-005)", () => {
  it("leaves the allowed characters alone", () => {
    // Letters, underscore, hyphen, forward slash, and common Unicode.
    for (const allowed of ["a", "Z", "_", "-", "/", "é", "🚀"]) {
      expect(names(`#${allowed}\n`), allowed).toEqual([allowed]);
    }
    // Digits are allowed *inside* a name; a name of digits only is not a tag.
    expect(names("#a0b\n")).toEqual(["a0b"]);
  });

  it("stops at every excluded character", () => {
    const excluded = [
      " ",
      "\t",
      "!",
      '"',
      "$",
      "%",
      "&",
      "(",
      ")",
      "*",
      "+",
      ",",
      ".",
      ":",
      ";",
      "<",
      "=",
      ">",
      "?",
      "@",
      "^",
      "`",
      "{",
      "|",
      "}",
      "~",
      "[",
      "]",
      "\\",
      // General Punctuation and Supplemental Punctuation.
      "\u2014",
      "\u2E2E",
    ];

    for (const character of excluded) {
      expect(names(`#a${character}b\n`), character).toEqual(["a"]);
      expect(names(`#${character}a\n`), character).toEqual([]);
    }
    // `#` is excluded too, so it ends a tag — and the next `#` starts another,
    // because the pattern is not start-anchored (`TAG-001`).
    expect(names("#a#b\n")).toEqual(["a", "b"]);
  });

  it("is the only copy of the class in the source tree", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const scanner = readFileSync(resolve(here, "tags.ts"), "utf8");

    // The scanner imports the constant…
    expect(scanner).toContain('from "../tags/regex"');
    // …and does not re-spell the class (the triplication `TAG-005` warns about).
    expect(scanner).not.toContain("u2000");
    expect(scanner).not.toContain("u2E00");
    expect(TAG_EXCLUDED_CHARACTERS).toContain("\\u2000-\\u206F");
    expect(TAG_EXCLUDED_CHARACTERS).toContain("\\u2E00-\\u2E7F");
  });

  it("records the deferred autocomplete trigger (OBS-1.14.4-TAG-002)", () => {
    // A hash at the start or after whitespace; nothing calls this yet, because
    // autocomplete waits for the BL-26 tag source.
    expect(TAG_TRIGGER_PATTERN.test("#tag")).toBe(true);
    expect(TAG_TRIGGER_PATTERN.test("a #tag")).toBe(true);
    expect(TAG_TRIGGER_PATTERN.test("#")).toBe(true);
    expect(TAG_TRIGGER_PATTERN.test("a#tag")).toBe(false);
  });
});

describe("parsing (OBS-1.14.4-TAG-001)", () => {
  it("matches the longest valid prefix", () => {
    expect(names("#tag\n")).toEqual(["tag"]);
    expect(names("#nested/tag\n")).toEqual(["nested/tag"]);
    expect(names("#tag-with-dashes\n")).toEqual(["tag-with-dashes"]);
    expect(names("#snake_case\n")).toEqual(["snake_case"]);
    // Stops at the first excluded character.
    expect(names("#a,b\n")).toEqual(["a"]);
    expect(names("#a b\n")).toEqual(["a"]);
    expect(names("#a. \n")).toEqual(["a"]);
    // `#` ends the tag and begins the next one: the pattern is not anchored.
    expect(names("#a#b\n")).toEqual(["a", "b"]);
  });

  it("accepts common Unicode and emoji, which the exclusion class leaves alone", () => {
    expect(names("#café-tag\n")).toEqual(["café-tag"]);
    expect(names("#🚀-launch\n")).toEqual(["🚀-launch"]);
  });

  it("finds every tag on a line", () => {
    expect(names("#one and #two and #three\n")).toEqual(["one", "two", "three"]);
  });

  it("rejects a numeric-only name, but keeps one with a non-numerical character", () => {
    // The docs' rule, which the artifact's regex does not carry: "#1984 isn't a
    // valid tag, but #y1984 is".
    expect(isTagName("1984")).toBe(false);
    expect(isTagName("y1984")).toBe(true);
    expect(names("#1984 is not a tag\n")).toEqual([]);
    expect(names("#y1984 is a tag\n")).toEqual(["y1984"]);
    expect(names("#19_84\n")).toEqual(["19_84"]);
  });

  it("ignores a `#` with nothing allowed after it", () => {
    expect(names("#\n")).toEqual([]);
    expect(names("# \n")).toEqual([]);
    expect(names("#, and #. \n")).toEqual([]);
  });

  it("skips tags inside code, a table and a link", () => {
    expect(names("A `code #not-a-tag` span.\n")).toEqual([]);
    expect(names("```\n#not-a-tag\n```\n")).toEqual([]);
    expect(names("A [link #nope](https://example.com)\n")).toEqual([]);
    expect(names("| #cell | b |\n| --- | --- |\n")).toEqual([]);
    expect(names("A #real one, a `#fake` one.\n")).toEqual(["real"]);
  });

  it("scans the tag fixture exactly as the corpus intends", () => {
    const doc = CONSTRUCT_FIXTURES.find((f) => f.id === "tag")?.markdown ?? "";
    const found = names(doc);

    expect(found).toContain("tag");
    expect(found).toContain("nested/tag");
    expect(found).toContain("tag-with-dashes");
    expect(found).toContain("café-tag");
    // `#123`, `#a tag` and `#,` contribute nothing, and the code span and link
    // hold nothing.
    expect(found).not.toContain("123");
    expect(found.filter((name) => name.startsWith("not-a-tag"))).toEqual([]);
    expect(found.filter((name) => name.startsWith("nope"))).toEqual([]);
  });
});

describe("styling (OBS-1.14.4-TAG-003)", () => {
  it("emits the three-part class split: whole tag, begin, end", () => {
    const view = mount("#tag\n");
    view.focus();
    view.placeCaret(view.doc().length);

    // The tag as a whole, on a character only the whole-tag mark covers…
    expect(view.classesAt(2)).toContain("cm-live-tag");
    expect(view.classesAt(2)).not.toContain("cm-live-tag-begin");
    expect(view.classesAt(2)).not.toContain("cm-live-tag-end");
    // …its opening hash…
    expect(view.classesAt(0)).toContain("cm-live-tag-begin");
    // …and its trailing boundary.
    expect(view.classesAt(3)).toContain("cm-live-tag-end");
  });

  it("marks the boundary classes on a single-character tag as well", () => {
    const view = mount("#a\n");
    view.focus();
    view.placeCaret(2);
    // `#a` is one character wide, so begin and end overlap — both apply.
    expect(view.classesAt(1)).toContain("cm-live-tag-begin");
    expect(view.classesAt(1)).toContain("cm-live-tag-end");
  });

  it("styles a tag without hiding anything — there is no reveal rule", () => {
    const view = mount("#tag\n");
    view.focus();

    view.placeCaret(0);
    const inside = view.view.contentDOM.textContent;
    view.placeCaret(5);
    const outside = view.view.contentDOM.textContent;

    expect(inside).toContain("#tag");
    expect(outside).toContain("#tag");
    expect(view.decorations().filter((d) => d.kind === "replace")).toEqual([]);
  });

  it("emits no interactive surface: click and suggest are deferred (TAG-002, TAG-004)", () => {
    const view = mount("#tag\n");
    view.focus();
    view.placeCaret(5);

    // No anchor, no widget, no pointer target — a tag is styled text for now.
    expect(view.view.contentDOM.querySelectorAll("a")).toHaveLength(0);
    expect(view.widgets()).toEqual([]);
  });
});
