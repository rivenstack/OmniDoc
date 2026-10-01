import { describe, expect, it } from "vitest";
import { markdownToProseMirror, proseMirrorToMarkdown } from "./markdown-bridge";

describe("markdown-bridge", () => {
  it("converts basic markdown to ProseMirror JSON and back", () => {
    const markdown = "# Hello World\n\nThis is **bold** and *italic* text.";
    const json = markdownToProseMirror(markdown);

    expect(json).toBeDefined();
    expect(json.type).toBe("doc");
    expect(json.content).toBeDefined();

    const output = proseMirrorToMarkdown(json);
    expect(output).toContain("# Hello World");
    expect(output).toContain("**bold**");
    expect(output).toContain("*italic*");
  });

  it("handles empty input gracefully", () => {
    const json = markdownToProseMirror("");
    expect(json).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });

    const md = proseMirrorToMarkdown(json);
    expect(md).toBe("");
  });

  it("handles lists and blockquotes", () => {
    const markdown = "- item 1\n- item 2\n\n> quote here";
    const json = markdownToProseMirror(markdown);
    const output = proseMirrorToMarkdown(json);

    expect(output).toContain("- item 1");
    expect(output).toContain("- item 2");
    expect(output).toContain("> quote here");
  });

  it("handles code blocks", () => {
    const markdown = "```\nconst x = 42;\n```";
    const json = markdownToProseMirror(markdown);
    const output = proseMirrorToMarkdown(json);

    expect(output).toContain("```");
    expect(output).toContain("const x = 42;");
  });
});
