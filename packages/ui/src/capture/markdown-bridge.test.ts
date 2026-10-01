import { describe, expect, it, vi } from "vitest";
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

  it("keeps a link that has a target", () => {
    const json = markdownToProseMirror("see [docs](https://example.com/docs)");
    expect(proseMirrorToMarkdown(json)).toContain(
      "[docs](https://example.com/docs)",
    );
  });

  it("serialises a link mark with no target instead of throwing", () => {
    // TipTap's `Link` mark defaults `href` to `null`, so a stored body can hold
    // a targetless link. Markdown has no syntax for one, and the underlying
    // serializer throws on a null target — the text has to survive instead.
    const json = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "a " },
            { type: "text", text: "targetless", marks: [{ type: "link" }] },
            { type: "text", text: " link" },
          ],
        },
      ],
    };

    expect(() => proseMirrorToMarkdown(json)).not.toThrow();
    expect(proseMirrorToMarkdown(json)).toBe("a targetless link");
  });

  it("refuses to convert outside a browser", () => {
    // The converter is a TipTap editor and TipTap's markdown parser needs a
    // DOM. Failing loudly beats returning "" — a server-rendered caller that
    // silently got an empty string would save it as an empty note body.
    vi.stubGlobal("window", undefined);
    try {
      expect(() =>
        proseMirrorToMarkdown({
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }],
        }),
      ).toThrow(/derive markdown on the client/);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
