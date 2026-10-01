import { createRef } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CodeMirrorEditor,
  type CodeMirrorEditorHandle,
} from "./cm-editor";

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
});
