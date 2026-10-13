// Comments in the reading path — F-15 Rev 2, plan Task 2.7.
//
// Acceptance (plan §5 Task 2.7, reading half): "Reading path: inline/block
// rules; block requires a line start (spaces only, not tabs); unclosed block
// hides the rest."
//
// The catalogue entries are `OBS-1.14.4-COMMENT-003` (the two rules) and
// `-COMMENT-004` (an unclosed block hides the rest of the note — in the reading
// path **only**). The last block renders through the real `Markdown` block, so
// the rule is proven where a reader actually meets it.

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { COMMENT_MARKER, removeCommentSpans } from "./comments";
import { Markdown } from "./markdown";

afterEach(cleanup);

function text(source: string): string {
  const { container } = render(<Markdown source={source} />);
  return container.textContent ?? "";
}

describe("the comment delimiter (OBS-1.14.4-COMMENT-002)", () => {
  it("is the shared `%%` constant", () => {
    expect(COMMENT_MARKER).toBe("%%");
  });
});

describe("the inline rule (OBS-1.14.4-COMMENT-003)", () => {
  it("removes a pair closed on the same line, and nothing else", () => {
    expect(removeCommentSpans("Keep %%hidden%% visible.")).toBe(
      "Keep  visible.",
    );
  });

  it("removes every pair on the line", () => {
    expect(removeCommentSpans("%%a%% mid %%b%% end")).toBe(" mid  end");
  });

  it("works at any inline position — there is no line-start requirement", () => {
    expect(removeCommentSpans("before %%x%% after")).toBe("before  after");
  });

  it("leaves a lone `%%` with no closer on its line literal", () => {
    // The inline rule matches a *pair*; a mid-line unclosed pair is plain text.
    expect(removeCommentSpans("a %% b")).toBe("a %% b");
  });

  it("cannot cross a line break", () => {
    // The inline rule is per line: a pair closed on its own line goes, and one
    // on the next line goes independently.
    expect(removeCommentSpans("x %%a%% y\n%%b%% z")).toBe("x  y\n z");
    // An *unclosed* mid-line pair never reaches across the break — only a
    // line-initial one does, and that is the block rule.
    expect(removeCommentSpans("x %%a\nb%% c")).toBe("x %%a\nb%% c");
  });

  it("keeps the text after a closing pair, still parsed as markdown", () => {
    expect(removeCommentSpans("%%gone%% *kept*")).toBe(" *kept*");
    expect(text("%%gone%% *kept*")).toContain("kept");
    expect(text("%%gone%% *kept*")).not.toContain("%%");
  });
});

describe("the block rule (OBS-1.14.4-COMMENT-003)", () => {
  it("starts at the beginning of a line and consumes to the next pair anywhere", () => {
    const source = "%%\nhidden\nmore\n%%\nvisible\n";
    expect(removeCommentSpans(source)).toBe("\n\n\n\nvisible\n");
  });

  it("accepts leading spaces before the marker", () => {
    expect(removeCommentSpans("   %%\nhidden\n%%\nkept\n")).toBe(
      "   \n\n\nkept\n",
    );
  });

  it("does not accept a tab — only spaces count", () => {
    // A tab-indented line-initial pair is not a block, so it hides nothing…
    expect(removeCommentSpans("\t%%\nkept %% tail\n")).toContain(
      "kept %% tail",
    );
    // …whereas the same shape indented with spaces swallows the rest.
    expect(removeCommentSpans("  %%\nkept\n")).not.toContain("kept");
  });

  it("declines when the opening line closes its own pair (that is the inline rule)", () => {
    // A same-line pair must not start swallowing the rest of the note.
    expect(removeCommentSpans("%%a%%\nkept\n")).toBe("\nkept\n");
  });

  it("resumes the rest of the line after the closing pair", () => {
    expect(removeCommentSpans("%%\nhidden\n%% trailing text\n")).toBe(
      "\n\n trailing text\n",
    );
  });

  it("hides the rest of the note when the block is never closed (OBS-1.14.4-COMMENT-004)", () => {
    const source = "visible first\n%%\nhidden\nstill hidden\n";
    const result = removeCommentSpans(source);
    expect(result).toContain("visible first");
    expect(result).not.toContain("hidden");
    expect(text(source)).toContain("visible first");
    expect(text(source)).not.toContain("hidden");
  });
});

describe("the reading path hides comments (OBS-1.14.4-COMMENT-001)", () => {
  it("renders an inline comment as nothing", () => {
    const rendered = text("Keep %%hidden%% visible.");
    expect(rendered).toContain("Keep");
    expect(rendered).toContain("visible.");
    expect(rendered).not.toContain("%%");
    expect(rendered).not.toContain("hidden");
  });

  it("renders a block comment as nothing", () => {
    const rendered = text("%%\nhidden\n%%\nAfter.\n");
    expect(rendered).toContain("After.");
    expect(rendered).not.toContain("hidden");
  });

  it("leaves the F-12 pipeline intact — markdown after a comment still renders", () => {
    const rendered = text(
      "%%gone%% **bold** and a [link](https://example.com)",
    );
    expect(rendered).toContain("bold");
    expect(rendered).toContain("link");
    expect(rendered).not.toContain("gone");
  });
});
