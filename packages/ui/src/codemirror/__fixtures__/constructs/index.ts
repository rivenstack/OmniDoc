// Construct fixture corpus — F-15 Rev 2, plan Task 0.3.
//
// One markdown document per construct, plus the catalogue's own edge cases.
// Phases 2–7 assert their behaviour against these documents (folded *and*
// unfolded state, per the plan's acceptance rule), so the corpus — not the
// tests — is what defines "every construct".
//
// `entries` names the catalogue entries the fixture pins, and MUST be a subset
// of `../parity/dispositions` (harness.test.ts enforces both that and that the
// declared `file` is on disk with exactly this content).

import blockquote from "./blockquote.md?raw";
import callout from "./callout.md?raw";
import calloutNested from "./callout-nested.md?raw";
import codeFence from "./code-fence.md?raw";
import comment from "./comment.md?raw";
import emphasis from "./emphasis.md?raw";
import embed from "./embed.md?raw";
import escape from "./escape.md?raw";
import fenceInfoString from "./fence-info-string.md?raw";
import footnote from "./footnote.md?raw";
import frontmatter from "./frontmatter.md?raw";
import heading from "./heading.md?raw";
import highlight from "./highlight.md?raw";
import hr from "./hr.md?raw";
import image from "./image.md?raw";
import inlineCode from "./inline-code.md?raw";
import internalLink from "./internal-link.md?raw";
import link from "./link.md?raw";
import list from "./list.md?raw";
import mixed from "./mixed.md?raw";
import strikethrough from "./strikethrough.md?raw";
import strong from "./strong.md?raw";
import table from "./table.md?raw";
import tag from "./tag.md?raw";
import taskList from "./task-list.md?raw";

/** `live` fixtures are implemented behaviour; `deferred` ones are data only. */
export type FixtureStatus = "live" | "deferred";

export type ConstructFixture = {
  /** Stable id used by tests (`emphasis`, `callout-nested`, …). */
  readonly id: string;
  /** File name inside this folder. */
  readonly file: string;
  /** Construct name from the plan §3 taxonomy. */
  readonly construct: string;
  readonly status: FixtureStatus;
  /** Catalogue entries (short ids) this document pins. */
  readonly entries: readonly string[];
  /** Why the fixture exists, or what makes it an edge case. */
  readonly note: string;
  readonly markdown: string;
};

export const CONSTRUCT_FIXTURES: readonly ConstructFixture[] = [
  {
    id: "emphasis",
    file: "emphasis.md",
    construct: "em",
    status: "live",
    entries: ["REVEAL-008", "REVEAL-011"],
    note: "Asterisk and underscore emphasis, plus a bold-wrapped run.",
    markdown: emphasis,
  },
  {
    id: "strong",
    file: "strong.md",
    construct: "strong",
    status: "live",
    entries: ["REVEAL-008", "REVEAL-011"],
    note: "Asterisk and underscore strong, plus nesting inside strong.",
    markdown: strong,
  },
  {
    id: "strikethrough",
    file: "strikethrough.md",
    construct: "strikethrough",
    status: "live",
    entries: ["REVEAL-008"],
    note: "GFM strikethrough; the parser needs the GFM dialect to see a node.",
    markdown: strikethrough,
  },
  {
    id: "highlight",
    file: "highlight.md",
    construct: "highlight",
    status: "live",
    entries: ["REVEAL-008"],
    note: "Obsidian ==highlight==, which Lezer markdown does not model — a custom layer construct.",
    markdown: highlight,
  },
  {
    id: "inline-code",
    file: "inline-code.md",
    construct: "inline-code",
    status: "live",
    entries: ["REVEAL-008", "INPUT-003"],
    note: "Single and double backticks; also the verbatim region pairing stays ACTIVE in (negative fixture).",
    markdown: inlineCode,
  },
  {
    id: "link",
    file: "link.md",
    construct: "link",
    status: "live",
    entries: ["REVEAL-005", "REVEAL-008", "LINK-002", "LINK-009", "A11Y-002"],
    note: "Titled link, autolink, mailto, an empty href and a formatting-link — the scheme gate's input set.",
    markdown: link,
  },
  {
    id: "image",
    file: "image.md",
    construct: "image",
    status: "deferred",
    entries: ["EMBED-001", "CLIP-004"],
    note: "Image embeds are deferred (decision 5); the document is parse input only.",
    markdown: image,
  },
  {
    id: "internal-link",
    file: "internal-link.md",
    construct: "internal-link",
    status: "deferred",
    entries: ["LINK-006", "LINK-007", "LINK-008"],
    note: "Wikilinks stay literal in v1 (G-2); parsing/styling only, never resolution.",
    markdown: internalLink,
  },
  {
    id: "embed",
    file: "embed.md",
    construct: "embed",
    status: "deferred",
    entries: ["EMBED-001", "LINK-008"],
    note: "![[…]] embeds are deferred with images (decision 5); the size suffix is untouched.",
    markdown: embed,
  },
  {
    id: "footnote",
    file: "footnote.md",
    construct: "footref",
    status: "live",
    entries: ["FOOT-001"],
    note: "Named ref, inline ref, repeated ref and a wrapped definition body.",
    markdown: footnote,
  },
  {
    id: "heading",
    file: "heading.md",
    construct: "heading",
    status: "live",
    entries: ["FOLD-002", "REVEAL-011"],
    note: "ATX 1–6, setext, extra spacing, and a seven-hash non-heading.",
    markdown: heading,
  },
  {
    id: "blockquote",
    file: "blockquote.md",
    construct: "blockquote",
    status: "live",
    entries: ["REVEAL-007"],
    note: "Two paragraphs in one quote — the border widget carries the literal >.",
    markdown: blockquote,
  },
  {
    id: "callout",
    file: "callout.md",
    construct: "callout",
    status: "live",
    entries: ["CALLOUT-002", "CALLOUT-003", "CALLOUT-004", "CALLOUT-006", "CALLOUT-007"],
    note: "Title derivation, +/- fold marker, canonical `important`, and a plain quote that must NOT become a callout.",
    markdown: callout,
  },
  {
    id: "callout-nested",
    file: "callout-nested.md",
    construct: "callout",
    status: "live",
    entries: ["CALLOUT-010"],
    note: "Nested callouts (unbounded, marker on the innermost first line) and a marker-less triple quote.",
    markdown: calloutNested,
  },
  {
    id: "code-fence",
    file: "code-fence.md",
    construct: "codeblock",
    status: "live",
    entries: ["REVEAL-009"],
    note: "Backtick and tilde fences, a meta info string, and an unclosed fence running to EOF.",
    markdown: codeFence,
  },
  {
    id: "fence-info-string",
    file: "fence-info-string.md",
    construct: "codeblock",
    status: "live",
    entries: ["REVEAL-009"],
    note: "Fence-length rules: a backtick in the info string, mismatched tilde lengths, a nested fence, indented code.",
    markdown: fenceInfoString,
  },
  {
    id: "table",
    file: "table.md",
    construct: "table",
    status: "live",
    entries: ["TABLE-001", "TABLE-007", "MENU-002"],
    note: "Alignment row, an escaped pipe inside code, and an uneven row (3 cells then 1).",
    markdown: table,
  },
  {
    id: "comment",
    file: "comment.md",
    construct: "comment",
    status: "live",
    entries: ["COMMENT-001", "COMMENT-002", "COMMENT-003", "COMMENT-004"],
    note: "Inline, block, unclosed, and the code/href/table-row exclusions — the %% state machine's edge set.",
    markdown: comment,
  },
  {
    id: "tag",
    file: "tag.md",
    construct: "tag",
    status: "live",
    entries: ["TAG-001", "TAG-003", "TAG-005"],
    note: "Nested/dashed/accented tags, non-tags (#123, lone #), and code/link exclusions.",
    markdown: tag,
  },
  {
    id: "task-list",
    file: "task-list.md",
    construct: "task",
    status: "live",
    entries: ["TASK-001", "LIST-001"],
    note: "Unchecked, checked, upper-case X, star bullet and ordered task — the toggle input set.",
    markdown: taskList,
  },
  {
    id: "list",
    file: "list.md",
    construct: "list",
    status: "live",
    entries: ["LIST-001", "LIST-002", "LIST-003"],
    note: "Three bullet characters (never normalised), two ordered delimiters, nesting depth, lazy continuation.",
    markdown: list,
  },
  {
    id: "escape",
    file: "escape.md",
    construct: "escape",
    status: "live",
    entries: ["REVEAL-011"],
    note: "Backslash escapes and a line-ending backslash.",
    markdown: escape,
  },
  {
    id: "hr",
    file: "hr.md",
    construct: "hr",
    status: "live",
    entries: [],
    note: "Thematic break variants. Visual only — the catalogue has no entry for it.",
    markdown: hr,
  },
  {
    id: "frontmatter",
    file: "frontmatter.md",
    construct: "preamble",
    status: "live",
    entries: ["FOLD-007"],
    note: "The preamble fold service's input. There is no properties model (PROP-001 out of scope).",
    markdown: frontmatter,
  },
  {
    id: "mixed",
    file: "mixed.md",
    construct: "mixed",
    status: "live",
    entries: [
      "REVEAL-008",
      "REVEAL-009",
      "COMMENT-001",
      "CALLOUT-004",
      "TABLE-007",
      "TASK-001",
      "TAG-005",
      "FOOT-001",
      "FOLD-002",
      "LINK-002",
    ],
    note: "One document with nearly every construct — the integration fixture for whole-document passes.",
    markdown: mixed,
  },
];

/** Fixtures keyed by id. */
export const FIXTURE_BY_ID: ReadonlyMap<string, ConstructFixture> = new Map(
  CONSTRUCT_FIXTURES.map((fixture) => [fixture.id, fixture]),
);

/** Convenience lookup that fails loudly instead of returning undefined. */
export function fixture(id: string): ConstructFixture {
  const found = FIXTURE_BY_ID.get(id);
  if (!found) throw new Error(`No construct fixture named "${id}"`);
  return found;
}
