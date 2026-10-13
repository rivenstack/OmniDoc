// Construct taxonomy and region classification — F-15 Rev 2, plan Task 2.1.
//
// Acceptance (plan §5 Task 2.1): "Every region classified from a fixture; sets
// exported." The catalogue entries this pins are named in the test titles.
//
// The region vocabulary is only sound if the names it keys on are names the
// parser really produces, so the first block of tests parses the fixture corpus
// and asserts each declared node name actually occurs. The rest then checks the
// classification and the exclusion answers the scanners depend on.

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxTree } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { CONSTRUCT_FIXTURES } from "../__fixtures__/constructs";import {
  CONSTRUCT_REGIONS,
  INLINE_FORMATTING_KINDS,
  LINK_LIKE_KINDS,
  LINK_NODES,
  REGION_NODES,
  buildRegionIndex,
  classifyRegion,
  regionOfNode,
  type ConstructRegion,
} from "./taxonomy";

const EXTENSIONS = [markdown({ base: markdownLanguage })];

/** A fixture by id — the corpus is the test's input, so a miss is a real failure. */
function fixture(id: string): string {
  const found = CONSTRUCT_FIXTURES.find((f) => f.id === id);
  if (!found) throw new Error(`no construct fixture named ${id}`);
  return found.markdown;
}

function parse(doc: string): EditorState {
  return EditorState.create({ doc, extensions: EXTENSIONS });
}

/** Every node name the parser produces for `doc`, in tree order. */
function nodeNames(state: EditorState): string[] {
  const names: string[] = [];
  syntaxTree(state).iterate({
    enter: (node) => {
      names.push(node.name);
    },
  });
  return names;
}

/** Every region the corpus is in, as a set. */
function corpusRegions(): Set<ConstructRegion> {
  const seen = new Set<ConstructRegion>();
  for (const fixture of CONSTRUCT_FIXTURES) {
    const state = parse(fixture.markdown);
    const ancestors: string[] = [];
    syntaxTree(state).iterate({
      enter: (node) => {
        ancestors.push(node.name);
        seen.add(classifyRegion(ancestors));
      },
      leave: () => {
        ancestors.pop();
      },
    });
  }
  return seen;
}

describe("construct taxonomy (OBS-1.14.4-REVEAL-008)", () => {
  it("names the five inline-formatting kinds", () => {
    expect(INLINE_FORMATTING_KINDS).toEqual([
      "em",
      "strong",
      "inline-code",
      "strikethrough",
      "highlight",
    ]);
  });

  it("names the six link-like kinds, footnote references included", () => {
    expect(LINK_LIKE_KINDS).toEqual([
      "link",
      "image",
      "internal-link",
      "embed",
      "formatting-link",
      "footref",
    ]);
  });

  it("keeps the kinds disjoint — a construct is formatted or link-like, never both", () => {
    const overlap = (INLINE_FORMATTING_KINDS as readonly string[]).filter((kind) =>
      (LINK_LIKE_KINDS as readonly string[]).includes(kind),
    );
    expect(overlap).toEqual([]);
  });

  it("declares the three regions the plan names", () => {
    expect(CONSTRUCT_REGIONS).toEqual(["prose", "table", "verbatim"]);
  });
});

describe("region node names are real (plan §7 risk D-5)", () => {
  it("produces every verbatim node name for the code fixtures", () => {
    const names = new Set([
      ...nodeNames(parse(fixture("code-fence"))),
      ...nodeNames(parse(fixture("inline-code"))),
    ]);
    for (const name of ["FencedCode", "CodeText", "CodeMark", "CodeInfo"]) {
      expect(names, name).toContain(name);
    }
    expect(names).toContain("InlineCode");
  });

  it("produces every table node name for the table fixture", () => {
    const names = new Set(nodeNames(parse(fixture("table"))));
    for (const name of ["Table", "TableHeader", "TableRow", "TableCell", "TableDelimiter"]) {
      expect(names, name).toContain(name);
    }
  });

  it("produces the link node names for the link fixture", () => {
    const names = new Set(nodeNames(parse(fixture("link"))));
    for (const name of ["Link", "URL", "LinkTitle"]) {
      expect(names, name).toContain(name);
    }
  });

  it("models no node at all for the unmodelled constructs (the custom layer's reason to exist)", () => {
    // Highlight, comment and tag text is prose to the grammar; that is exactly
    // why Tasks 2.5 / 2.7 / 2.9 scan it themselves.
    for (const doc of ["==marked==", "%%a comment%%", "#tag", "text #tag and #a/b"]) {
      const names = nodeNames(parse(doc)).filter(
        (name) => name !== "Document" && name !== "Paragraph",
      );
      expect(names, doc).toEqual([]);
    }
  });
});

describe("region classification", () => {
  it("treats a chain with no marking node as prose", () => {
    expect(classifyRegion([])).toBe("prose");
    expect(classifyRegion(["Document", "Paragraph"])).toBe("prose");
    expect(regionOfNode("Paragraph")).toBeNull();
  });

  it("lets the innermost marking node win — code in a table cell is verbatim", () => {
    expect(classifyRegion(["Document", "Table", "TableCell"])).toBe("table");
    expect(classifyRegion(["Document", "Table", "TableCell", "InlineCode"])).toBe(
      "verbatim",
    );
    expect(classifyRegion(["Document", "FencedCode"])).toBe("verbatim");
  });

  it("classifies every region from the fixture corpus", () => {
    const seen = corpusRegions();
    // Every region the corpus is in is one of the three named regions…
    for (const region of seen) expect(CONSTRUCT_REGIONS).toContain(region);
    // …and the corpus exercises all three, so none of them is untested.
    expect([...seen].sort()).toEqual(["prose", "table", "verbatim"]);
  });
});

describe("region index", () => {
  const TABLE_DOC = [
    "A paragraph.",
    "",
    "| cell | other |",
    "| --- | --- |",
    "| 1 | 2 |",
    "",
    "```js",
    "const x = 1;",
    "```",
    "",
    "Inline `code` here.",
    "",
    "A [link](https://example.com) here.",
  ].join("\n");

  const state = parse(TABLE_DOC);
  const index = buildRegionIndex(state);

  it("reports prose, table and verbatim for the same document", () => {
    expect(index.regionAt(TABLE_DOC.indexOf("A paragraph"))).toBe("prose");
    expect(index.regionAt(TABLE_DOC.indexOf("cell"))).toBe("table");
    expect(index.regionAt(TABLE_DOC.indexOf("const x"))).toBe("verbatim");
    expect(index.regionAt(TABLE_DOC.indexOf("`code`") + 1)).toBe("verbatim");
    expect(index.regionAt(TABLE_DOC.indexOf("https://example.com"))).toBe("prose");
  });

  it("excludes positions inside code or a link, and prose between them", () => {
    expect(index.isExcluded(TABLE_DOC.indexOf("const x"), ["verbatim"])).toBe(true);
    expect(index.isExcluded(TABLE_DOC.indexOf("A paragraph"), ["verbatim"])).toBe(false);
    expect(index.isExcluded(TABLE_DOC.indexOf("https://example.com"), ["link"])).toBe(true);
    expect(index.isExcluded(TABLE_DOC.indexOf("A paragraph"), ["link"])).toBe(false);
  });

  it("treats ranges as half-open, so a marker right after code is prose", () => {
    const codeStart = TABLE_DOC.indexOf("`code`");
    const codeEnd = codeStart + "`code`".length;
    expect(index.regionAt(codeStart)).toBe("verbatim");
    expect(index.regionAt(codeEnd - 1)).toBe("verbatim");
    // The very next position is the space after the span, i.e. prose again.
    expect(index.regionAt(codeEnd)).toBe("prose");
  });

  it("answers per-range overlap for a construct spanning the boundary", () => {
    const fenceStart = TABLE_DOC.indexOf("```js");
    expect(index.overlaps(["verbatim"], fenceStart - 1, fenceStart + 2)).toBe(true);
    expect(index.overlaps(["verbatim"], 0, 5)).toBe(false);
    expect(index.overlaps(["table"], 0, TABLE_DOC.length)).toBe(true);
  });

  it("keeps the link node list in sync with the parser", () => {
    const doc =
      'See [text](https://example.com "T") and [ref][label].\n\n[label]: https://example.com\n';
    const names = new Set(nodeNames(parse(doc)));
    for (const name of LINK_NODES) expect(names, name).toContain(name);
  });

  it("keeps the region node table in sync with the parser", () => {
    const names = new Set(nodeNames(state));
    for (const name of Object.keys(REGION_NODES)) expect(names, name).toContain(name);
  });

  it("scopes the index to the range it is given", () => {
    const cellAt = TABLE_DOC.indexOf("cell");
    const scoped = buildRegionIndex(state, cellAt, cellAt + 4);
    expect(scoped.regionAt(cellAt + 1)).toBe("table");
    expect(scoped.regionAt(TABLE_DOC.indexOf("const x"))).toBe("prose");
    expect(scoped.ranges.length).toBeLessThan(index.ranges.length);
  });
});
