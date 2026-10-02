import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTOSAVE_DELAY_MS, CaptureSurface } from "./capture-surface";
import type { CaptureSaveInput } from "./capture-surface";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** The mode switcher is a menu: open the trigger, then pick a radio item. */
function modeTrigger(): HTMLElement {
  return screen.getByRole("button", { name: /^Editor mode:/ });
}

function chooseMode(label: string) {
  fireEvent.click(modeTrigger());
  fireEvent.click(screen.getByRole("menuitemradio", { name: label }));
}

function lockButton(): HTMLElement {
  return screen.getByRole("button", { name: "Lock editing" });
}

describe("CaptureSurface Multi-Mode", () => {
  it("starts in Normal mode behind a single mode button", () => {
    const onSave = vi.fn().mockResolvedValue({
      status: "saved",
      noteId: "note-1",
      version: "v1",
    });

    render(<CaptureSurface note={null} onSave={onSave} />);

    expect(
      screen.getByRole("button", { name: "Editor mode: Normal" }),
    ).toBeTruthy();
    // Formatting toolbar is visible in Normal mode.
    expect(screen.getByRole("toolbar", { name: "Formatting" })).toBeTruthy();
  });

  it("opens the mode menu with the current mode announced as checked", () => {
    render(<CaptureSurface note={null} onSave={vi.fn()} />);

    fireEvent.click(modeTrigger());

    const items = screen.getAllByRole("menuitemradio");
    expect(items).toHaveLength(3);
    expect(
      screen
        .getByRole("menuitemradio", { name: "Normal" })
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen
        .getByRole("menuitemradio", { name: "Text" })
        .getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("switches to Text mode and renders CodeMirror with its toolbar", () => {
    render(<CaptureSurface note={null} onSave={vi.fn()} />);

    chooseMode("Text");

    expect(
      screen.getByRole("button", { name: "Editor mode: Text" }),
    ).toBeTruthy();

    const cmContainer = document.querySelector(
      '[data-slot="codemirror-editor-container"]',
    );
    expect(cmContainer?.getAttribute("data-mode")).toBe("text");
    // Text mode is an editing mode: it keeps the formatting toolbar.
    expect(screen.getByRole("toolbar", { name: "Formatting" })).toBeTruthy();
  });

  it("switches to Markdown mode and renders live preview CodeMirror", () => {
    render(<CaptureSurface note={null} onSave={vi.fn()} />);

    chooseMode("Markdown");

    expect(
      screen.getByRole("button", { name: "Editor mode: Markdown" }),
    ).toBeTruthy();

    const cmContainer = document.querySelector(
      '[data-slot="codemirror-editor-container"]',
    );
    expect(cmContainer?.getAttribute("data-mode")).toBe("markdown");
  });

  it("keeps the formatting toolbar when Text mode is entered from Normal mode", () => {
    // Regression: the toolbar read the CodeMirror handle from a ref during
    // render. Coming from a mode where no CodeMirror had mounted, the handle
    // was still `null` on that render and the toolbar stayed hidden until some
    // unrelated re-render.
    render(<CaptureSurface note={null} onSave={vi.fn()} />);

    expect(screen.getByRole("toolbar", { name: "Formatting" })).toBeTruthy();

    chooseMode("Text");
    expect(screen.getByRole("toolbar", { name: "Formatting" })).toBeTruthy();

    chooseMode("Normal");
    expect(screen.getByRole("toolbar", { name: "Formatting" })).toBeTruthy();
  });

  it("locks every editing affordance and unlocks again", () => {
    render(
      <CaptureSurface
        note={null}
        onSave={vi.fn()}
        onImportFile={vi
          .fn()
          .mockResolvedValue({ status: "queued", jobId: "j1" })}
      />,
    );

    fireEvent.click(lockButton());

    expect(lockButton().getAttribute("aria-pressed")).toBe("true");
    // No editing chrome, no editable title, no import.
    expect(screen.queryByRole("toolbar", { name: "Formatting" })).toBeNull();
    const title = screen.getByRole("textbox", {
      name: "Note title",
    }) as HTMLInputElement;
    expect(title.disabled).toBe(true);
    const fileInput =
      document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput?.disabled).toBe(true);

    fireEvent.click(lockButton());

    expect(lockButton().getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("toolbar", { name: "Formatting" })).toBeTruthy();
    expect(
      (screen.getByRole("textbox", { name: "Note title" }) as HTMLInputElement)
        .disabled,
    ).toBe(false);
  });

  it("passes the lock to the CodeMirror body", () => {
    render(<CaptureSurface note={null} onSave={vi.fn()} />);

    chooseMode("Text");
    fireEvent.click(lockButton());

    const body = screen.getByRole("textbox", { name: "Note body" });
    expect(body.getAttribute("aria-readonly")).toBe("true");
    expect(body.getAttribute("contenteditable")).not.toBe("true");
  });

  it("does not rewrite the editor source when the server echoes the saved note", () => {
    const note = {
      id: "note-1",
      title: "T",
      version: "v1",
      bodyJson: {
        type: "doc" as const,
        content: [
          { type: "paragraph", content: [{ type: "text", text: "hello" }] },
        ],
      },
    };
    const { rerender } = render(
      <CaptureSurface note={note} onSave={vi.fn()} />,
    );

    chooseMode("Text");
    const source = () => document.querySelector(".cm-content")?.textContent;
    expect(source()).toContain("hello");

    // A save revalidates the notes route, so the surface is handed a fresh
    // `note` object while the user is still typing. Re-deriving the source
    // there would replace their text with the serializer's projection of it.
    rerender(
      <CaptureSurface
        note={{
          ...note,
          version: "v2",
          bodyJson: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "rewritten" }],
              },
            ],
          },
        }}
        onSave={vi.fn()}
      />,
    );

    expect(source()).toContain("hello");
    expect(source()).not.toContain("rewritten");
  });

  it("saves converted ProseMirror JSON when editing in Text/Markdown mode", async () => {
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

    // Switch to Text mode with real timers — the menu's focus handling is not
    // under test here and fake timers would freeze it.
    chooseMode("Text");

    vi.useFakeTimers();

    // Edit title so draft is not blank.
    const titleField = screen.getByRole("textbox", { name: "Note title" });
    fireEvent.change(titleField, { target: { value: "My Markdown Note" } });

    // Fast-forward debounce.
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS + 50);
    });

    expect(onSave).toHaveBeenCalled();
    expect(savedInput).toBeTruthy();
    expect((savedInput as any)?.title).toBe("My Markdown Note");
    expect((savedInput as any)?.bodyJson?.type).toBe("doc");
  });

  it("provides table insertion button in the toolbar and preserves tables across modes", () => {
    render(<CaptureSurface note={null} onSave={vi.fn()} />);

    // Table insertion button is present in Normal mode toolbar
    const tableButton = screen.getByRole("button", {
      name: "Insert table (3x3)",
    });
    expect(tableButton).toBeTruthy();

    // Click insert table
    fireEvent.click(tableButton);

    // Switch to Text mode
    chooseMode("Text");

    // CodeMirror contains the markdown table
    const textEditor = document.querySelector(".cm-content");
    expect(textEditor?.textContent).toContain("| --- | --- | --- |");
  });
});
