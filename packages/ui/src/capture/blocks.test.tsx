import { useEffect, useState } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AUTOSAVE_DELAY_MS, CaptureSurface } from "./capture-surface";
import type { CaptureSaveInput } from "./capture-surface";
import { EMPTY_DOCUMENT, isBlankDraft } from "./document";
import { FormattingToolbar, SelectionToolbar } from "./formatting-toolbar";
import { ImportDropzone } from "./import-dropzone";
import { NoteTitleField } from "./note-title-field";
import { SaveIndicator } from "./save-indicator";
import { SaveProblemBanner } from "./save-problem-banner";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** A mounted editor plus whatever block is under test. */
function EditorHarness({
  children,
  onReady,
}: {
  children: (editor: Editor) => React.ReactNode;
  onReady?: (editor: Editor) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: "<p>hello world</p>",
    immediatelyRender: false,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (editor && !ready) {
      setReady(true);
      onReady?.(editor);
    }
  }, [editor, onReady, ready]);

  if (!editor) {
    return null;
  }

  return (
    <>
      <EditorContent editor={editor} />
      {children(editor)}
    </>
  );
}

describe("SaveIndicator", () => {
  /** The visible badge — decorative to AT, so it is queried by DOM, not role. */
  function badgeText(container: HTMLElement): string {
    return (
      container.querySelector("[data-slot=save-indicator] span[aria-hidden]")
        ?.textContent ?? ""
    );
  }

  it("shows one badge word per status", () => {
    const { container, rerender } = render(<SaveIndicator status="saving" />);
    expect(badgeText(container)).toBe("Saving…");

    rerender(<SaveIndicator status="saved" />);
    expect(badgeText(container)).toBe("Saved");

    rerender(<SaveIndicator status="idle" />);
    // `idle` says nothing rather than claiming anything.
    expect(badgeText(container)).toBe("");
  });

  it("announces the honest sentence, not just the badge word", () => {
    render(<SaveIndicator status="conflict" />);

    const status = screen.getByRole("status");
    expect(status.textContent).toMatch(/not saved/i);
    expect(status.textContent).not.toBe("Conflict");
  });

  it("hides the badge from assistive tech so nothing is said twice", () => {
    render(<SaveIndicator status="saved" />);

    // "Saved" appears in the DOM twice but is exposed once.
    expect(screen.getAllByText("Saved")).toHaveLength(2);
    expect(screen.getByRole("status").textContent).toBe("Saved");
  });

  it("does not make conflict and error look or read the same", () => {
    const { container: conflict } = render(<SaveIndicator status="conflict" />);
    const conflictTone = conflict
      .querySelector("[data-slot=save-indicator]")
      ?.getAttribute("data-status");

    cleanup();
    const { container: failed } = render(<SaveIndicator status="error" />);
    const failedTone = failed
      .querySelector("[data-slot=save-indicator]")
      ?.getAttribute("data-status");

    expect(conflictTone).toBe("conflict");
    expect(failedTone).toBe("error");
  });

  it("keeps the live region mounted while idle so its text change is announced", () => {
    render(<SaveIndicator status="idle" />);

    expect(screen.getByRole("status").textContent).toBe("");
  });
});

describe("NoteTitleField", () => {
  it("names the input with a real label, not the placeholder", () => {
    render(<NoteTitleField id="t" value="" onValueChange={() => undefined} />);

    expect(screen.getByRole("textbox", { name: "Note title" })).toBeTruthy();
  });

  it("reports every keystroke to the surface", () => {
    const onValueChange = vi.fn();
    render(
      <NoteTitleField
        id="t"
        value=""
        onValueChange={onValueChange}
        placeholder="Untitled"
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Note title" }), {
      target: { value: "Ergonomics" },
    });

    expect(onValueChange).toHaveBeenCalledWith("Ergonomics");
  });
});

describe("SaveProblemBanner", () => {
  it("offers both versions as an explicit choice on a conflict", () => {
    const onKeepServerVersion = vi.fn();
    const onKeepMyEdits = vi.fn();

    render(
      <SaveProblemBanner
        kind="conflict"
        onKeepServerVersion={onKeepServerVersion}
        onKeepMyEdits={onKeepMyEdits}
      />,
    );

    expect(screen.getByText(/changed somewhere else/i)).toBeTruthy();
    // Nothing has been discarded on the user's behalf.
    expect(
      screen.getByText(/neither version has been discarded/i),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /keep the server/i }));
    fireEvent.click(screen.getByRole("button", { name: /keep my edits/i }));

    expect(onKeepServerVersion).toHaveBeenCalledOnce();
    expect(onKeepMyEdits).toHaveBeenCalledOnce();
  });

  it("offers a retry, not a merge, when the save simply failed", () => {
    render(<SaveProblemBanner kind="error" onRetry={() => undefined} />);

    expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy();
    // Reconciling two versions is meaningless when none was reached.
    expect(screen.queryByRole("button", { name: /keep my edits/i })).toBeNull();
  });

  it("does not double-announce what the status region already said", () => {
    render(<SaveProblemBanner kind="conflict" />);

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("ImportDropzone", () => {
  it("gives every imported file its own status", () => {
    render(
      <ImportDropzone
        items={[
          { id: "1", fileName: "handbook.pdf", status: "ready" },
          { id: "2", fileName: "notes.md", status: "indexing" },
          { id: "3", fileName: "scan.png", status: "failed" },
        ]}
        onFilesSelected={() => undefined}
      />,
    );

    expect(screen.getByText("handbook.pdf")).toBeTruthy();
    expect(screen.getByText("Ready")).toBeTruthy();
    expect(screen.getByText("Indexing")).toBeTruthy();
    expect(screen.getByText("Failed")).toBeTruthy();
    // A failed file does not get a success word.
    expect(screen.getByText(/not searchable/i)).toBeTruthy();
  });

  it("warns that the index is incomplete instead of implying it is done", () => {
    render(
      <ImportDropzone
        items={[{ id: "1", fileName: "big.pdf", status: "indexing" }]}
        onFilesSelected={() => undefined}
      />,
    );

    expect(screen.getByRole("status").textContent).toMatch(
      /not everything is indexed yet/i,
    );
  });

  it("stays silent once everything is indexed", () => {
    render(
      <ImportDropzone
        items={[{ id: "1", fileName: "done.pdf", status: "ready" }]}
        onFilesSelected={() => undefined}
      />,
    );

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("provides a labelled file control, so dropping is never the only way", () => {
    render(<ImportDropzone items={[]} onFilesSelected={() => undefined} />);

    const input = screen.getByLabelText("Choose files");
    expect(input.getAttribute("type")).toBe("file");
    // The visible control is the label; the input is hidden but not `display:none`.
    expect(input.className).toContain("sr-only");
    expect(input.className).toContain("peer");
  });

  it("reports dropped files", () => {
    const onFilesSelected = vi.fn();
    const { container } = render(
      <ImportDropzone items={[]} onFilesSelected={onFilesSelected} />,
    );

    const zone = container.querySelector("[data-slot=import-dropzone] div");
    const file = new File(["x"], "dropped.md", { type: "text/markdown" });
    fireEvent.drop(zone as Element, { dataTransfer: { files: [file] } });

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });
});

describe("FormattingToolbar", () => {
  it("names every control and applies a command to the selection", () => {
    const holder: { editor: Editor | null } = { editor: null };
    render(
      <EditorHarness
        onReady={(editor) => {
          holder.editor = editor;
        }}
      >
        {(editor) => <FormattingToolbar editor={editor} />}
      </EditorHarness>,
    );

    const toolbar = screen.getByRole("toolbar", { name: "Formatting" });
    expect(toolbar).toBeTruthy();
    // Keyboard-only formatting requires every command to have a name.
    expect(screen.getByRole("button", { name: "Bold" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Heading 1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Code block" })).toBeTruthy();

    act(() => {
      holder.editor?.commands.selectAll();
    });
    fireEvent.click(screen.getByRole("button", { name: "Bold" }));

    expect(holder.editor?.isActive("bold")).toBe(true);
  });

  it("reports pressed state through aria-pressed", () => {
    const holder: { editor: Editor | null } = { editor: null };
    render(
      <EditorHarness
        onReady={(editor) => {
          holder.editor = editor;
        }}
      >
        {(editor) => <FormattingToolbar editor={editor} />}
      </EditorHarness>,
    );

    act(() => {
      holder.editor?.commands.selectAll();
    });
    const bold = screen.getByRole("button", { name: "Bold" });
    expect(bold.getAttribute("aria-pressed")).toBe("false");
  });

  it("renders no selection toolbar without a live selection", () => {
    render(
      <EditorHarness>
        {(editor) => <SelectionToolbar editor={editor} />}
      </EditorHarness>,
    );

    // jsdom reports a zero-size rect, and an invisible toolbar must not leave
    // tabbable buttons behind.
    expect(
      screen.queryByRole("toolbar", { name: "Text formatting" }),
    ).toBeNull();
  });
});

describe("isBlankDraft", () => {
  it("treats an empty editor and a bare paragraph as blank", () => {
    expect(isBlankDraft("", EMPTY_DOCUMENT)).toBe(true);
    expect(isBlankDraft("", { type: "doc", content: [] })).toBe(true);
    expect(isBlankDraft("   ", undefined)).toBe(true);
  });

  it("treats a title as content on its own", () => {
    expect(isBlankDraft("Ergonomics", EMPTY_DOCUMENT)).toBe(false);
  });

  it("treats a second paragraph as content, because the user pressed Enter", () => {
    expect(
      isBlankDraft("", {
        type: "doc",
        content: [{ type: "paragraph" }, { type: "paragraph" }],
      }),
    ).toBe(false);
  });

  it("treats a typed paragraph as content", () => {
    expect(
      isBlankDraft("", {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "hi" }] },
        ],
      }),
    ).toBe(false);
  });
});

describe("CaptureSurface", () => {
  /** The subset of outcomes these tests exercise. */
  type SaveResult =
    | { status: "saved"; noteId: string; version: string }
    | { status: "conflict" }
    | { status: "unavailable" };

  const saved = (version = "v1"): SaveResult => ({
    status: "saved",
    noteId: "n1",
    version,
  });

  function renderDraft(
    onSave: (input: CaptureSaveInput) => Promise<SaveResult>,
    props: Partial<React.ComponentProps<typeof CaptureSurface>> = {},
  ) {
    return render(
      <CaptureSurface
        note={null}
        onSave={onSave}
        onLoadServerVersion={async () => ({
          id: "note_1",
          title: "Their version",
          bodyJson: EMPTY_DOCUMENT,
          version: "v9",
        })}
        {...props}
      />,
    );
  }

  it("names the body surface distinctly from the title", () => {
    renderDraft(async (): Promise<SaveResult> => saved());

    expect(screen.getByRole("textbox", { name: "Note body" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Note title" })).toBeTruthy();
  });

  it("does not invent a note from an untouched editor", async () => {
    vi.useFakeTimers();
    const onSave = vi.fn(async (): Promise<SaveResult> => saved());
    renderDraft(onSave);

    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 3);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it("autosaves a titled note and reports it as saved", async () => {
    vi.useFakeTimers();
    const onSave = vi.fn(async (): Promise<SaveResult> => saved());
    renderDraft(onSave);

    fireEvent.change(screen.getByRole("textbox", { name: "Note title" }), {
      target: { value: "Ergonomics" },
    });

    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS + 10);
    });

    expect(onSave).toHaveBeenCalledWith({
      noteId: null,
      title: "Ergonomics",
      bodyJson: EMPTY_DOCUMENT,
      // A note that has never been saved has no version to protect.
      expectedVersion: null,
    });
    expect(screen.getByRole("status").textContent).toBe("Saved");
  });

  it("surfaces a conflict and does not resolve it on its own", async () => {
    vi.useFakeTimers();
    const onSave = vi.fn(async (): Promise<SaveResult> => ({
      status: "conflict",
    }));
    renderDraft(onSave, { onCreated: vi.fn() });

    fireEvent.change(screen.getByRole("textbox", { name: "Note title" }), {
      target: { value: "Ergonomics" },
    });
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS + 10);
    });

    expect(screen.getByText(/changed somewhere else/i)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /keep the server.s version/i }),
    ).toBeTruthy();

    // Autosave must not keep retrying over the user's undecided conflict.
    onSave.mockClear();
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 5);
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves the local edits on top of the server version when the user says so", async () => {
    vi.useFakeTimers();
    const onSave = vi
      .fn<(input: CaptureSaveInput) => Promise<SaveResult>>()
      .mockResolvedValueOnce({ status: "conflict" })
      .mockResolvedValue(saved("v10"));
    const onLoadServerVersion = vi.fn(async () => ({
      id: "note_1",
      title: "Their version",
      bodyJson: EMPTY_DOCUMENT,
      version: "v9",
    }));
    // Only an existing note can conflict: a draft has no version to disagree
    // with.
    renderDraft(onSave, {
      onLoadServerVersion,
      note: {
        id: "note_1",
        title: "Mine",
        bodyJson: EMPTY_DOCUMENT,
        version: "v1",
      },
    });

    fireEvent.change(screen.getByRole("textbox", { name: "Note title" }), {
      target: { value: "Ergonomics" },
    });
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS + 10);
    });

    expect(onSave).toHaveBeenLastCalledWith({
      noteId: "note_1",
      title: "Ergonomics",
      bodyJson: EMPTY_DOCUMENT,
      expectedVersion: "v1",
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /keep my edits/i }));
    });

    expect(onLoadServerVersion).toHaveBeenCalledWith("note_1");
    expect(onSave).toHaveBeenLastCalledWith({
      noteId: "note_1",
      title: "Ergonomics",
      bodyJson: EMPTY_DOCUMENT,
      // Their version becomes the concurrency base — the explicit choice, not a
      // silent client-side win.
      expectedVersion: "v9",
    });
  });

  it("adopts the server version when the user chooses it", async () => {
    vi.useFakeTimers();
    const onSave = vi.fn(async (): Promise<SaveResult> => ({
      status: "conflict",
    }));
    renderDraft(onSave, {
      note: {
        id: "note_1",
        title: "Mine",
        bodyJson: EMPTY_DOCUMENT,
        version: "v1",
      },
    });

    fireEvent.change(screen.getByRole("textbox", { name: "Note title" }), {
      target: { value: "Ergonomics" },
    });
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS + 10);
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /keep the server.s version/i }),
      );
    });

    expect(
      (screen.getByRole("textbox", { name: "Note title" }) as HTMLInputElement)
        .value,
    ).toBe("Their version");
    // Nothing was written: choosing the server's version is not a save.
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("reports a failed save as a retryable state, never as saved", async () => {
    vi.useFakeTimers();
    const onSave = vi
      .fn<(input: CaptureSaveInput) => Promise<SaveResult>>()
      .mockResolvedValue({ status: "unavailable" });
    renderDraft(onSave);

    fireEvent.change(screen.getByRole("textbox", { name: "Note title" }), {
      target: { value: "Ergonomics" },
    });
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS + 10);
    });

    expect(screen.getByRole("status").textContent).toMatch(/couldn't save/i);
    expect(screen.getByRole("status").textContent).not.toBe("Saved");

    onSave.mockResolvedValueOnce(saved());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    });

    expect(screen.getByRole("status").textContent).toBe("Saved");
  });

  it("offers the import affordance only when the app can accept a file", () => {
    renderDraft(async (): Promise<SaveResult> => saved());

    expect(screen.queryByLabelText("Choose files")).toBeNull();
  });
});
