import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTOSAVE_DELAY_MS, CaptureSurface } from "./capture-surface";
import type { CaptureSaveInput } from "./capture-surface";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("CaptureSurface Multi-Mode", () => {
  it("renders with default Normal mode and shows mode switcher pills", () => {
    const onSave = vi.fn().mockResolvedValue({
      status: "saved",
      noteId: "note-1",
      version: "v1",
    });

    render(
      <CaptureSurface
        note={null}
        onSave={onSave}
      />,
    );

    const switcher = screen.getByRole("radiogroup", {
      name: "Editor display mode",
    });
    expect(switcher).toBeTruthy();

    const normalBtn = screen.getByRole("radio", { name: "Normal" });
    const mdBtn = screen.getByRole("radio", { name: "Markdown" });
    const textBtn = screen.getByRole("radio", { name: "Text" });
    const readingBtn = screen.getByRole("radio", { name: "Reading" });

    expect(normalBtn.getAttribute("aria-checked")).toBe("true");
    expect(mdBtn.getAttribute("aria-checked")).toBe("false");
    expect(textBtn.getAttribute("aria-checked")).toBe("false");
    expect(readingBtn.getAttribute("aria-checked")).toBe("false");

    // Formatting toolbar is visible in Normal mode
    expect(screen.getByRole("toolbar", { name: "Formatting" })).toBeTruthy();
  });

  it("switches to Text mode and renders CodeMirror container", () => {
    const onSave = vi.fn();
    render(<CaptureSurface note={null} onSave={onSave} />);

    const textBtn = screen.getByRole("radio", { name: "Text" });
    fireEvent.click(textBtn);

    expect(textBtn.getAttribute("aria-checked")).toBe("true");

    const cmContainer = document.querySelector(
      '[data-slot="codemirror-editor-container"]',
    );
    expect(cmContainer).toBeTruthy();
    expect(cmContainer?.getAttribute("data-mode")).toBe("text");
  });

  it("switches to Markdown mode and renders live preview CodeMirror", () => {
    const onSave = vi.fn();
    render(<CaptureSurface note={null} onSave={onSave} />);

    const mdBtn = screen.getByRole("radio", { name: "Markdown" });
    fireEvent.click(mdBtn);

    expect(mdBtn.getAttribute("aria-checked")).toBe("true");

    const cmContainer = document.querySelector(
      '[data-slot="codemirror-editor-container"]',
    );
    expect(cmContainer).toBeTruthy();
    expect(cmContainer?.getAttribute("data-mode")).toBe("markdown");
  });

  it("switches to Reading mode and hides formatting toolbar", () => {
    const onSave = vi.fn();
    render(<CaptureSurface note={null} onSave={onSave} />);

    const readingBtn = screen.getByRole("radio", { name: "Reading" });
    fireEvent.click(readingBtn);

    expect(readingBtn.getAttribute("aria-checked")).toBe("true");

    // Toolbar is hidden in Reading mode
    expect(screen.queryByRole("toolbar", { name: "Formatting" })).toBeNull();

    // Markdown read-only container is rendered
    expect(document.querySelector('[data-slot="markdown"]')).toBeTruthy();
  });

  it("saves converted ProseMirror JSON when editing in Text/Markdown mode", async () => {
    vi.useFakeTimers();
    let savedInput: CaptureSaveInput | null = null;
    const onSave = vi.fn().mockImplementation((input: CaptureSaveInput) => {
      savedInput = input;
      return Promise.resolve({
        status: "saved",
        noteId: "note-1",
        version: "v1",
      });
    });

    render(<CaptureSurface note={null} onSave={onSave} />);

    // Switch to Text mode
    const textBtn = screen.getByRole("radio", { name: "Text" });
    fireEvent.click(textBtn);

    // Edit title so draft is not blank
    const titleField = screen.getByRole("textbox", { name: "Note title" });
    fireEvent.change(titleField, { target: { value: "My Markdown Note" } });

    // Fast-forward debounce
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS + 50);
    });

    expect(onSave).toHaveBeenCalled();
    expect(savedInput).toBeTruthy();
    expect((savedInput as any)?.title).toBe("My Markdown Note");
    expect((savedInput as any)?.bodyJson?.type).toBe("doc");
  });
});
