// Decoration primitives — F-15 Rev 2, plan Task 2.4.
//
// Acceptance (plan §5 Task 2.4): "Three singletons are identity-distinct; link
// attributes present."
//
// The three hidden-range singletons exist for a performance reason, not a visual
// one (`OBS-1.14.4-REVEAL-004`): replace decorations are compared *by identity*
// when the range set is diffed, so distinct singletons let the builder tell the
// kinds apart cheaply. That claim is only true if they really are distinct, so
// this file asserts it — and then asserts each primitive actually reaches the
// DOM in the shape the catalogue describes.

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { Decoration, EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { createHarness, type EditorHarness } from "../parity/harness";
import {
  HIDDEN_BLOCK,
  HIDDEN_DELIMITER,
  HIDDEN_MARKER,
  renderedLinkMark,
  transparentMark,
  unresolvedMark,
} from "./decorations";
import { markdownLivePreviewPlugin } from "./index";

const LANGUAGE = markdown({ base: markdownLanguage });

let harness: EditorHarness | null = null;

afterEach(() => {
  harness?.destroy();
  harness = null;
});

describe("three hidden-range singletons (OBS-1.14.4-REVEAL-004)", () => {
  const singletons = [HIDDEN_DELIMITER, HIDDEN_MARKER, HIDDEN_BLOCK];

  it("defines three singletons that are identity-distinct", () => {
    expect(HIDDEN_DELIMITER).not.toBe(HIDDEN_MARKER);
    expect(HIDDEN_DELIMITER).not.toBe(HIDDEN_BLOCK);
    expect(HIDDEN_MARKER).not.toBe(HIDDEN_BLOCK);
    expect(new Set(singletons).size).toBe(3);
  });

  it("keeps every singleton an empty replace — no widget, no class, no attributes", () => {
    for (const singleton of singletons) {
      const spec = singleton.spec as Record<string, unknown>;
      expect(Object.keys(spec)).toEqual([]);
    }
  });

  it("reuses the same instance across ranges, so the diff sees identity", () => {
    const once = HIDDEN_DELIMITER.range(0, 2);
    const twice = HIDDEN_DELIMITER.range(4, 6);
    expect(once.value).toBe(twice.value);
  });

  it("folds a delimiter and a marker with widget-less replacements", () => {
    harness = createHarness({
      doc: "**bold**\n\n- [ ] task\n",
      extensions: [LANGUAGE, markdownLivePreviewPlugin],
    });
    const replacements = harness.decorations().filter((d) => d.kind === "replace");

    // The `**` pair and the bullet the checkbox replaces are hidden ranges: a
    // replace with no widget in it.
    expect(replacements.filter((d) => d.widget === undefined).length).toBeGreaterThan(0);
    // …and the checkbox itself is a widget, so the two kinds are not conflated.
    expect(replacements.filter((d) => d.widget !== undefined).length).toBeGreaterThan(0);
  });
});

describe("rendered-link mark (OBS-1.14.4-REVEAL-005, OBS-1.14.4-A11Y-002)", () => {
  it("carries the underline class plus tabindex -1 and draggable", () => {
    const spec = renderedLinkMark.spec as {
      class?: string;
      attributes?: Record<string, string>;
    };
    expect(spec.class).toBe("cm-live-link");
    expect(spec.attributes).toEqual({ tabindex: "-1", draggable: "true" });
  });

  it("puts those attributes on the rendered element in the DOM", () => {
    harness = createHarness({
      doc: "See the link text here",
      extensions: [
        EditorView.decorations.of(() =>
          Decoration.set([renderedLinkMark.range(4, 12)]),
        ),
      ],
    });

    const element = harness.view.contentDOM.querySelector(".cm-live-link");
    expect(element).not.toBeNull();
    // Focusable by script and by pointer, deliberately not a tab stop, and
    // draggable — one element, both surfaces.
    expect(element?.getAttribute("tabindex")).toBe("-1");
    expect(element?.getAttribute("draggable")).toBe("true");
    expect(element?.textContent).toBe("the link");
  });

  it("is what the live preview applies to a link while the caret is away", () => {
    harness = createHarness({
      doc: "A [link](https://example.com) here\n",
      extensions: [LANGUAGE, markdownLivePreviewPlugin],
    });
    // Unfocused, so the link renders: the mark is on the link's own range.
    expect(harness.classesAt(4)).toContain("cm-live-link");
  });
});

describe("transparent and unresolved marks", () => {
  it("keeps the transparent mark free of class and attributes", () => {
    const spec = transparentMark.spec as Record<string, unknown>;
    expect(spec).toEqual({});
  });

  it("gives the unresolved mark its own class, ready for the link re-open", () => {
    const spec = unresolvedMark.spec as { class?: string };
    expect(spec.class).toBe("cm-live-unresolved");
  });

  it("emits neither mark yet — both are wired by later work, not silently by the walk", () => {
    harness = createHarness({
      doc: "A [missing]() and a [link](https://example.com) here\n",
      extensions: [LANGUAGE, markdownLivePreviewPlugin],
    });
    const classes = harness
      .decorations()
      .flatMap((d) => ("class" in d.spec ? String(d.spec.class ?? "").split(" ") : []));
    expect(classes).not.toContain("cm-live-unresolved");
    expect(classes).not.toContain("cm-live-transparent");
  });
});
