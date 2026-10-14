// Fenced code blocks in Live Preview — F-15 Rev 2, plan Task 3.1.
//
// Acceptance (plan §5 Task 3.1): "whole-block widget while untouched; raw source
// on touch; collapsed code block renders no placeholder text; no token
// highlighting in LP/Source (D-9)."
//
// The block is *not* a replacement widget — that deviation (and why) is in
// `index.ts`'s header. What is verified here is the behaviour that stands in for
// it: the whole block renders while untouched, and a caret anywhere inside it
// reveals the whole raw source (the `REVEAL-011` accumulated span), not just the
// fence line under the caret.

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { afterEach, describe, expect, it } from "vitest";
import { createHarness, type EditorHarness } from "../../parity/harness";
import { markdownLivePreviewPlugin } from "../index";
import { CODE_BLOCK_FOLD_PHRASE, codeBlockRevealSpan } from "./index";

const LANGUAGE = markdown({ base: markdownLanguage });

const DOC = "before\n\n```js\nconst a = 1;\n```\n\nafter\n";
const CODE = "const a = 1;";
const CODE_FROM = DOC.indexOf(CODE);
const CODE_TO = CODE_FROM + CODE.length;
/** The three lines of the block: opener, content, closer (1-based). */
const BLOCK_LINES = [3, 4, 5];

let harness: EditorHarness | null = null;

afterEach(() => {
  harness?.destroy();
  harness = null;
});

function mount(doc: string): EditorHarness {
  harness = createHarness({ doc, extensions: [LANGUAGE, markdownLivePreviewPlugin] });
  return harness;
}

describe("code block rendering (OBS-1.14.4-REVEAL-009)", () => {
  it("renders the whole block, with the fence and info string folded away", () => {
    const view = mount(DOC);
    view.focus();
    // The caret sits on the first line, outside the block.
    view.placeCaret(0);

    const text = view.view.contentDOM.textContent ?? "";
    expect(text).toContain(CODE);
    expect(text).not.toContain("```");
    expect(text).not.toContain("js");

    // All three lines carry the rendered code-block class, so the block reads
    // as one block rather than three paragraphs.
    const doc = view.state().doc;
    for (const lineNumber of BLOCK_LINES) {
      expect(view.classesAt(doc.line(lineNumber).from)).toContain("cm-live-code-block");
    }
  });

  it("reveals the whole raw source from a caret anywhere inside the block", () => {
    const view = mount(DOC);
    view.focus();
    // Deliberately the *content* line, not a fence line: whole-block granularity
    // means the fences reveal too (`REVEAL-011`).
    view.placeCaret(CODE_FROM + 3);

    const text = view.view.contentDOM.textContent ?? "";
    expect(text).toContain("```");
    expect(text).toContain("js");
    expect(text).toContain(CODE);
  });

  it("folds the fences again once the caret leaves the block", () => {
    const view = mount(DOC);
    view.focus();
    view.placeCaret(CODE_FROM + 3);
    expect(view.view.contentDOM.textContent).toContain("```");

    view.placeCaret(view.doc().length);
    expect(view.view.contentDOM.textContent).not.toContain("```");
  });
});

describe("folded code block (OBS-1.14.4-FOLD-004)", () => {
  it("pins the folded-code phrase to the empty string", () => {
    expect(CODE_BLOCK_FOLD_PHRASE).toBe("");
  });

  it("renders an untouched block with no placeholder text", () => {
    const view = mount(DOC);
    view.focus();
    view.placeCaret(0);

    const text = view.view.contentDOM.textContent ?? "";
    expect(text).toContain(CODE);
    // No ellipsis and no running phrase: the artifact's phrase table is empty.
    expect(text).not.toContain("…");
    expect(text).not.toContain("folded code");
  });
});

describe("no token highlighting in Live Preview or Source (D-9)", () => {
  it("emits no mark or replace decoration over a block's code text", () => {
    const view = mount(DOC);
    view.focus();
    view.placeCaret(0);

    const overCode = view
      .decorations()
      .filter(
        (decoration) =>
          (decoration.kind === "mark" || decoration.kind === "replace") &&
          decoration.from < CODE_TO &&
          decoration.to > CODE_FROM,
      );
    expect(overCode).toEqual([]);

    // The only decoration the content line carries is its line class.
    const doc = view.state().doc;
    const contentLine = doc.line(BLOCK_LINES[1]);
    const onLine = view
      .decorations()
      .filter((decoration) => decoration.from === contentLine.from && decoration.to === contentLine.from);
    expect(onLine.every((decoration) => decoration.kind === "line")).toBe(true);
  });
});

describe("codeBlockRevealSpan", () => {
  it("returns the block's own range as the accumulated span", () => {
    expect(codeBlockRevealSpan({ from: 8, to: 30 })).toEqual({ from: 8, to: 30 });
  });

  it("passes null through, so the walk can chain it", () => {
    expect(codeBlockRevealSpan(null)).toBeNull();
  });
});
