// The table's look — F-15 Task 3.3 Rev 2, plan Task B.1.
//
// These are assertions about **rules**, not pixels: jsdom has no layout engine,
// so the only honest test of a stylesheet is what it says. The look itself is a
// `@user`-directed visual pass (plan §11); B-1…B-3 are recorded as **directed**
// (plan §1), never as parity claims, and the entry the tests below protect is
// the *behaviour* they must not break: `OBS-1.14.4-TABLE-001` (the table is a
// grid of cell editors, not a `contenteditable` table).

import { describe, expect, it } from "vitest";
import { TABLE_THEME_RULES } from "../theme";

type Declaration = {
  readonly selector: string;
  readonly property: string;
  readonly value: string;
};

/** Every declaration in the table's rules, flattened, in source order. */
function declarations(): Declaration[] {
  return Object.entries(TABLE_THEME_RULES).flatMap(([selector, style]) =>
    Object.entries(style).map(([property, value]) => ({
      selector,
      property,
      value,
    })),
  );
}

/**
 * The effective declarations for one selector.
 *
 * A rule may list several selectors (`.cm-live-th, .cm-live-td`), and one
 * selector may appear in more than one rule, so this merges every rule whose
 * selector list *contains* `selector` — the same way the cascade would.
 */
function declarationsOf(selector: string): Record<string, string> {
  const style: Record<string, string> = {};
  for (const declaration of declarations()) {
    const selectors = declaration.selector.split(",").map((one) => one.trim());
    if (selectors.includes(selector))
      style[declaration.property] = declaration.value;
  }
  return style;
}

/** A colour written as a literal rather than as a token role. */
const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i;

describe("table look", () => {
  it("B-1: the wrapper draws no focus outline", () => {
    // Directed, not a parity claim: `@user` rejected the ring on 2026-10-16.
    // The wrapper stays focusable (`TablePreviewWidget.toDOM`), so the ring has
    // to be switched off explicitly — omitting an `outline` declaration would
    // leave the global `:focus-visible` rule to paint one.
    expect(declarationsOf(".cm-live-table-wrapper").outline).toBe("none");
    const focusVisible = Object.keys(TABLE_THEME_RULES).filter(
      (selector) =>
        selector.includes("wrapper") && selector.includes(":focus-visible"),
    );
    expect(focusVisible).toEqual([]);
  });

  it("B-2: the table is content-width, not full-width", () => {
    const table = declarationsOf(".cm-live-table");
    expect(table.width).toBe("max-content");
    expect(table.width).not.toBe("100%");
    // A long table is still bounded by the note, so its content wraps.
    expect(table.maxWidth).toBe("100%");
    // No fixed layout: the columns follow their content.
    expect(table.tableLayout).toBeUndefined();
  });

  it("B-2: pins no column to a computed width", () => {
    // `@user`-directed, 2026-10-16: **CSS only**. A pixel width would have to be
    // measured and recomputed — and a stale one is what wrapped a header while
    // empty space sat beside it. So every width in the block shrink-to-fits, and
    // a column's only floor is the `min-inline-size` below.
    const widths = declarations().filter(
      (declaration) =>
        declaration.property === "width" ||
        declaration.property === "inlineSize",
    );
    // The scan is only meaningful if the block still states a width.
    expect(widths.length).toBeGreaterThan(0);
    for (const { selector, property, value } of widths) {
      expect(`${selector} { ${property}: ${value} }`).toMatch(
        /: max-content \}$/,
      );
    }
  });

  it("B-2: every cell keeps a minimum inline size", () => {
    // 4rem = 64px at the root size: an empty column must stay visible — and,
    // once D.1 lands, clickable — instead of collapsing to nothing.
    for (const selector of [".cm-live-th", ".cm-live-td"]) {
      expect(declarationsOf(selector).minInlineSize, selector).toBe("4rem");
    }
  });

  it("B-3: no toolbar rules remain", () => {
    // The toolbar was replaced by the hover grip, the `+` and the context menu
    // (§1 B-3); a leftover rule would be a surface nothing renders.
    const toolbar = Object.keys(TABLE_THEME_RULES).filter((selector) =>
      selector.includes("table-tool"),
    );
    expect(toolbar).toEqual([]);
  });

  it("S1: the header cell carries no background fill", () => {
    const header = declarationsOf(".cm-live-th");
    expect(header.backgroundColor).toBeUndefined();
    expect(header.background).toBeUndefined();
    // It is still the header: bold, and starting at the inline start edge.
    expect(header.fontWeight).toBe("600");
  });

  it("S1: the cells are a hairline grid in token colours", () => {
    for (const selector of [".cm-live-th", ".cm-live-td"]) {
      expect(declarationsOf(selector).border, selector).toBe(
        "1px solid var(--border)",
      );
    }
  });

  it("normalises the nested cell editors onto the document's own text", () => {
    // A cell editor is its own `EditorView`, so CodeMirror's base theme applies
    // to it: a monospace scroller, its own insets and a `1px dotted` focus ring
    // (S1's cells are the document's type, with no ring of their own).
    const editor = declarationsOf(".cm-live-table .cm-editor");
    expect(editor.outline).toBe("none");
    expect(declarationsOf(".cm-live-table .cm-scroller").fontFamily).toBe(
      "inherit",
    );
    expect(declarationsOf(".cm-live-table .cm-content").padding).toBe("0");
    expect(declarationsOf(".cm-live-table .cm-line").padding).toBe("0");
  });

  it("gives an empty cell a line box", () => {
    // The old look used `.cm-live-th:empty::before`; a cell holds an editor now,
    // so the height lives on the editor's content (§11-8).
    expect(
      declarationsOf(".cm-live-table .cm-content").minBlockSize,
    ).toBeDefined();
  });

  it("spends no colour literals — every colour is a token role", () => {
    const literals = declarations().filter((declaration) =>
      COLOUR_LITERAL.test(declaration.value),
    );
    for (const { selector, property, value } of literals) {
      expect(`${selector} { ${property}: ${value} }`).toMatch(
        /var\(--[a-z0-9-]+\)$/,
      );
    }
    // The scan is only meaningful if the block still paints something: the grid
    // is drawn with the border role, not with a colour of its own.
    expect(
      declarations().some((declaration) =>
        declaration.value.includes("var(--"),
      ),
    ).toBe(true);
  });
});
