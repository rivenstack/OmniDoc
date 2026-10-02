import { createRef } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CodeMirrorEditor, type CodeMirrorEditorHandle } from "./cm-editor";

afterEach(() => {
  cleanup();
});

describe("CodeMirrorEditor", () => {
  it("renders in text mode with accessible attributes", () => {
    const handleChange = vi.fn();
    render(
      <CodeMirrorEditor
        value="# Test Heading"
        onChange={handleChange}
        mode="text"
        bodyLabel="Raw note body"
      />,
    );

    const textbox = screen.getByRole("textbox", { name: "Raw note body" });
    expect(textbox).toBeTruthy();
    expect(textbox.getAttribute("aria-multiline")).toBe("true");
    expect(textbox.textContent).toContain("# Test Heading");
  });

  it("renders in markdown mode with live preview enabled", () => {
    const handleChange = vi.fn();
    render(
      <CodeMirrorEditor
        value="**Bold text** and *italic*"
        onChange={handleChange}
        mode="markdown"
      />,
    );

    const textbox = screen.getByRole("textbox", { name: "Note body" });
    expect(textbox).toBeTruthy();
    expect(textbox.textContent).toContain("Bold text");
  });

  it("handles wrapSelection and prefixLine through editor handle", () => {
    const handleRef = createRef<CodeMirrorEditorHandle>();
    const handleChange = vi.fn();

    render(
      <CodeMirrorEditor
        ref={handleRef}
        value="hello world"
        onChange={handleChange}
        mode="text"
      />,
    );

    expect(handleRef.current).toBeDefined();

    act(() => {
      handleRef.current?.wrapSelection("**", "**");
    });

    const view = handleRef.current?.getEditorView();
    expect(view?.state.doc.toString()).toBe("****hello world");

    act(() => {
      handleRef.current?.prefixLine("# ");
    });

    expect(view?.state.doc.toString()).toBe("# ****hello world");
  });

  it("folds every syntax token while the editor is unfocused", () => {
    const handleRef = createRef<CodeMirrorEditorHandle>();

    render(
      <CodeMirrorEditor
        ref={handleRef}
        value={"# Title\n\n- item"}
        onChange={vi.fn()}
        mode="markdown"
      />,
    );

    const view = handleRef.current?.getEditorView();
    expect(view).toBeTruthy();
    if (!view) {
      throw new Error("CodeMirror view did not mount");
    }

    // A freshly opened surface parks the caret at 0. Without the focus gate the
    // first heading would greet the reader with a visible `#`, and the list
    // item with a `-`.
    expect(view.contentDOM.textContent).toContain("Title");
    expect(view.contentDOM.textContent).not.toContain("#");
    expect(view.contentDOM.textContent).not.toContain("-");
    expect(view.contentDOM.textContent).toContain("•");
  });

  it("draws list, fence and rule blocks instead of their markers", () => {
    const handleRef = createRef<CodeMirrorEditorHandle>();

    render(
      <CodeMirrorEditor
        ref={handleRef}
        value={
          "- item\n\n- [ ] task\n\n1. first\n\n---\n\n```js\nconst a = 1;\n```"
        }
        onChange={vi.fn()}
        mode="markdown"
      />,
    );

    const view = handleRef.current?.getEditorView();
    expect(view).toBeTruthy();
    if (!view) {
      throw new Error("CodeMirror view did not mount");
    }
    const dom = view.contentDOM;

    // Bullets replace `-`; the task item gets a checkbox instead of a bullet.
    expect(dom.querySelectorAll(".cm-live-bullet")).toHaveLength(1);
    expect(dom.querySelector(".cm-live-task")?.textContent).toBe("☐");
    // Ordered markers keep the source's own number.
    expect(dom.querySelector(".cm-live-ordered-mark")?.textContent).toBe("1.");
    // Every list item carries the hanging indent, including nested content.
    expect(dom.querySelectorAll(".cm-live-list-item")).toHaveLength(3);
    // `---` becomes a rule, and the fence becomes a code block.
    expect(dom.querySelector(".cm-live-hr")).toBeTruthy();
    expect(dom.querySelectorAll(".cm-live-code-block")).toHaveLength(3);
    expect(dom.textContent).not.toContain("```");
    expect(dom.textContent).not.toContain("---");
  });

  it("folds markdown syntax until the cursor touches the affected content", () => {
    const handleRef = createRef<CodeMirrorEditorHandle>();

    render(
      <CodeMirrorEditor
        ref={handleRef}
        value={"# Title\n\nSay **hi** now"}
        onChange={vi.fn()}
        mode="markdown"
      />,
    );

    const view = handleRef.current?.getEditorView();
    expect(view).toBeTruthy();
    if (!view) {
      throw new Error("CodeMirror view did not mount");
    }
    const dom = view.contentDOM;

    // Caret parked in the last paragraph: neither the heading's `#` nor the
    // `**` around "hi" are needed, so both fold away entirely.
    act(() => {
      view.dispatch({ selection: { anchor: view.state.doc.length } });
    });
    expect(dom.textContent).toContain("Title");
    expect(dom.textContent).not.toContain("#");
    expect(dom.textContent).not.toContain("**");

    // Caret anywhere on the heading line unfolds the `#` (line token) while
    // the `**` stays folded (inline token, different span).
    act(() => {
      view.focus();
      view.dispatch({ selection: { anchor: 3 } });
    });
    expect(dom.textContent).toContain("#");
    expect(dom.textContent).not.toContain("**");

    // Caret inside the bold word unfolds the `**` too.
    act(() => {
      view.dispatch({ selection: { anchor: 16 } });
    });
    expect(dom.textContent).toContain("**");
  });

  it("keeps the body non-editable when read-only", () => {
    render(
      <CodeMirrorEditor
        value="# Title"
        onChange={vi.fn()}
        mode="text"
        readOnly
      />,
    );

    const textbox = screen.getByRole("textbox", { name: "Note body" });
    expect(textbox.getAttribute("aria-readonly")).toBe("true");
    expect(textbox.getAttribute("contenteditable")).not.toBe("true");
  });

  it("renders GFM tables as permanent interactive rich HTML table preview with inline markdown support", () => {
    const handleRef = createRef<CodeMirrorEditorHandle>();
    const tableMarkdown = [
      "| Header **Bold** | Header *Italic* |",
      "| --- | --- |",
      "| `code` | ~~strike~~ |",
      "| [link](https://example.com) | Plain text |",
    ].join("\n");

    render(
      <CodeMirrorEditor
        ref={handleRef}
        value={tableMarkdown}
        onChange={vi.fn()}
        mode="markdown"
      />,
    );

    const view = handleRef.current?.getEditorView();
    expect(view).toBeTruthy();
    if (!view) {
      throw new Error("CodeMirror view did not mount");
    }
    const dom = view.contentDOM;

    // 1. Permanent rich HTML table preview is rendered
    expect(dom.querySelector("table.cm-live-table")).toBeTruthy();
    expect(dom.querySelectorAll("th.cm-live-th")).toHaveLength(2);
    expect(dom.querySelectorAll("td.cm-live-td")).toHaveLength(4);
    expect(dom.querySelector(".cm-live-table-wrapper")).toBeTruthy();

    // 2. Cell inline markdown is rendered to real DOM elements
    expect(dom.querySelector("strong.cm-live-strong")?.textContent).toBe("Bold");
    expect(dom.querySelector("em.cm-live-em")?.textContent).toBe("Italic");
    expect(dom.querySelector("code.cm-live-code")?.textContent).toBe("code");
    expect(dom.querySelector("del.cm-live-strike")?.textContent).toBe("strike");
    const linkEl = dom.querySelector("a.cm-live-link") as HTMLAnchorElement | null;
    expect(linkEl?.textContent).toBe("link");
    expect(linkEl?.getAttribute("href")).toBe("https://example.com");

    // 3. Cells are contenteditable for direct editing
    const firstCell = dom.querySelector("td.cm-live-td") as HTMLElement | null;
    expect(firstCell?.contentEditable).toBe("true");

    // 4. When focused with cursor, the table remains as an interactive table widget (does NOT unfold to raw text lines)
    act(() => {
      view.focus();
      view.dispatch({ selection: { anchor: 5 } });
    });

    expect(dom.querySelector("table.cm-live-table")).toBeTruthy();
    expect(dom.querySelectorAll("th.cm-live-th")).toHaveLength(2);
    expect(dom.querySelectorAll("td.cm-live-td")).toHaveLength(4);
  });
});
