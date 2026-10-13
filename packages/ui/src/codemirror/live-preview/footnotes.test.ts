// Footnotes — F-15 Rev 2, plan Task 2.11.
//
// Acceptance (plan §5 Task 2.11): "Named refs styled and classified link-like;
// inline footnotes parsed and styled but never interactive; definition
// navigation/hover deferred."
//
// The catalogue entry is `OBS-1.14.4-FOOT-001`, and its exclusion is the whole
// point: the clickable-token classifier requires a span to carry the footref
// marker **and not** the inline-footnote marker, so an inline footnote is never
// a link-like token. That predicate is implemented as a function here so the
// exclusion is asserted rather than implied.

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { afterEach, describe, expect, it } from "vitest";
import { CONSTRUCT_FIXTURES } from "../__fixtures__/constructs";
import { createHarness, type EditorHarness } from "../parity/harness";
import { linkAt } from "../links/activation";
import { isFootrefToken, scanFootnotes } from "./decorations";
import { markdownLivePreviewPlugin } from "./index";
import { LINK_LIKE_KINDS, buildRegionIndex, linkLikeKindForFootnote } from "./taxonomy";

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

function scan(doc: string): ReturnType<typeof scanFootnotes> {
  const state = EditorState.create({ doc, extensions: [LANGUAGE] });
  return scanFootnotes(state.doc, 0, state.doc.length, buildRegionIndex(state));
}

function fixture(id: string): string {
  const found = CONSTRUCT_FIXTURES.find((f) => f.id === id);
  if (!found) throw new Error(`no construct fixture named ${id}`);
  return found.markdown;
}

describe("footnote classification (OBS-1.14.4-REVEAL-008, -FOOT-001)", () => {
  it("classifies a named reference as link-like", () => {
    expect(LINK_LIKE_KINDS).toContain("footref");
    expect(linkLikeKindForFootnote("named")).toBe("footref");
  });

  it("excludes an inline footnote from the link-like kinds", () => {
    // Not an oversight: `FOOT-001` records the classifier's own predicate.
    expect(linkLikeKindForFootnote("inline")).toBeNull();
  });

  it("implements the exclusion as the artifact's own class predicate", () => {
    expect(isFootrefToken(["cm-live-footref"])).toBe(true);
    expect(isFootrefToken(["cm-live-footref", "cm-live-inline-footnote"])).toBe(false);
    expect(isFootrefToken(["cm-live-inline-footnote"])).toBe(false);
    expect(isFootrefToken([])).toBe(false);
  });
});

describe("parsing (OBS-1.14.4-FOOT-001)", () => {
  it("finds a named reference", () => {
    expect(scan("A ref[^note] here.\n")).toEqual([
      { from: 5, to: 12, kind: "named" },
    ]);
  });

  it("finds an inline footnote, with its body", () => {
    expect(scan("An inline^[body] here.\n")).toEqual([
      { from: 9, to: 16, kind: "inline", bodyFrom: 11, bodyTo: 15 },
    ]);
  });

  it("does not confuse one with the other", () => {
    const spans = scan("A named[^n] and an inline^[i] one.\n");
    expect(spans.map((span) => span.kind)).toEqual(["named", "inline"]);
  });

  it("leaves an inline footnote with no closer literal", () => {
    expect(scan("An unclosed^[inline here.\n")).toEqual([]);
  });

  it("skips both kinds inside code and a fence", () => {
    expect(scan("A `ref[^note]` span.\n")).toEqual([]);
    expect(scan("```\n^[inline]\n```\n")).toEqual([]);
  });

  it("scans the footnote fixture: two named refs, one inline, plus the definition", () => {
    const spans = scan(fixture("footnote"));
    expect(spans.filter((span) => span.kind === "named")).toHaveLength(3);
    expect(spans.filter((span) => span.kind === "inline")).toHaveLength(1);
  });
});

describe("named references are styled (OBS-1.14.4-FOOT-001)", () => {
  it("marks the reference, and does not underline it as a link", () => {
    const view = mount("A ref[^note] here.\n");
    view.focus();
    view.placeCaret(view.doc().length);

    expect(view.classesAt(7)).toContain("cm-live-footref");
    // The grammar calls `[^note]` a shortcut reference link; the footnote layer
    // claims it, so no link mark and no pointer cursor on it.
    expect(view.classesAt(7)).not.toContain("cm-live-link");
  });

  it("is not activatable: there is no destination to navigate to", () => {
    const view = mount("A ref[^note] here.\n");
    expect(linkAt(view.state(), 7)).toBeNull();
  });

  it("keeps the reference visible in every state — there is no reveal rule", () => {
    const view = mount("A ref[^note] here.\n");
    view.focus();

    view.placeCaret(7);
    expect(view.view.contentDOM.textContent).toContain("[^note]");
    view.placeCaret(0);
    expect(view.view.contentDOM.textContent).toContain("[^note]");
  });
});

describe("inline footnotes are styled but never interactive (OBS-1.14.4-FOOT-001)", () => {
  it("marks the construct, its body and its delimiters", () => {
    const view = mount("An inline^[body] here.\n");
    view.focus();
    view.placeCaret(view.doc().length);

    // The whole construct…
    expect(view.classesAt(11)).toContain("cm-live-inline-footnote");
    // …its delimiters carry the formatting marker…
    expect(view.classesAt(9)).toContain("cm-live-footnote-marker");
    expect(view.classesAt(15)).toContain("cm-live-footnote-marker");
    // …and the body carries the footref marker *as well as* the inline one, so
    // the clickable-token predicate rejects it.
    expect(view.classesAt(11)).toContain("cm-live-footref");
    expect(isFootrefToken(view.classesAt(11))).toBe(false);
  });

  it("is never a link: no mark, no anchor, no destination", () => {
    const view = mount("An inline^[body] here.\n");
    view.focus();
    view.placeCaret(view.doc().length);

    expect(view.classesAt(11)).not.toContain("cm-live-link");
    expect(view.view.contentDOM.querySelectorAll("a")).toHaveLength(0);
    expect(linkAt(view.state(), 11)).toBeNull();
  });

  it("stays visible with the caret inside it", () => {
    const view = mount("An inline^[body] here.\n");
    view.focus();
    view.placeCaret(11);
    expect(view.view.contentDOM.textContent).toContain("^[body]");
  });
});

describe("the fixture corpus pins both kinds", () => {
  it("styles every footnote marker in the footnote fixture", () => {
    const view = mount(fixture("footnote"));
    view.focus();
    view.placeCaret(view.doc().length);

    expect(view.view.contentDOM.querySelectorAll(".cm-live-footref").length).toBeGreaterThan(2);
    expect(view.view.contentDOM.querySelectorAll(".cm-live-inline-footnote").length).toBe(1);
    // Nothing became interactive.
    expect(view.view.contentDOM.querySelectorAll("a")).toHaveLength(0);
  });
});
