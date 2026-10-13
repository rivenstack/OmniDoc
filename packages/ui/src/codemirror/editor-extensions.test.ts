// Editor extension factory + compartments — F-15 Rev 2, plan Task 1.3.
//
// The claim under test is the artifact's own (`SET-002`): a live key changes by
// *reconfiguring* the running editor, not by rebuilding it. So every test here
// checks both halves — the change took effect, and the things a rebuild would
// have destroyed (selection, scroll, undo history) are still there.

import { describe, expect, it } from "vitest";
import { syntaxTree } from "@codemirror/language";
import type { EditorView } from "@codemirror/view";
import { editorSettings, DEFAULT_EDITOR_SETTINGS } from "./editor-settings";
import {
  createEditorCompartments,
  editorExtensions,
  editingExtensions,
  livePreviewExtensions,
  settingsExtensions,
  type EditorCompartments,
  type EditorExtensionOptions,
} from "./editor-extensions";
import { createHarness, type EditorHarness } from "./parity/harness";

const DOC = "alpha bravo\ncharlie delta\necho foxtrot\ngolf hotel\nindia juliet\n";

/** A harness running the real factory, plus the compartments to reconfigure it. */
function createEditor(
  options: Partial<EditorExtensionOptions> = {},
): { harness: EditorHarness; compartments: EditorCompartments; view: EditorView } {
  const compartments = createEditorCompartments();
  const harness = createHarness({
    doc: DOC,
    extensions: editorExtensions(
      { mode: "markdown", settings: DEFAULT_EDITOR_SETTINGS, ...options },
      compartments,
    ),
  });
  return { harness, compartments, view: harness.view };
}

describe("editor extension factory (Task 1.3)", () => {
  it("builds a state that carries the settings it was given", () => {
    const { harness } = createEditor({
      settings: editorSettings({ tabSize: 6, spellcheck: false }),
    });

    expect(harness.state().tabSize).toBe(6);
    expect(harness.view.contentDOM.getAttribute("spellcheck")).toBe("false");

    harness.destroy();
  });

  it("defaults to the artifact settings, spelling them out rather than half-configuring", () => {
    const { harness } = createEditor();

    expect(harness.state().tabSize).toBe(DEFAULT_EDITOR_SETTINGS.tabSize);
    expect(harness.view.contentDOM.getAttribute("spellcheck")).toBe("true");

    harness.destroy();
  });

  it("wires the lock through the editing compartment", () => {
    const { harness, compartments } = createEditor();
    expect(harness.state().readOnly).toBe(false);

    harness.view.dispatch({
      effects: compartments.editing.reconfigure(
        editingExtensions(true, "Note body"),
      ),
    });

    expect(harness.state().readOnly).toBe(true);
    expect(harness.view.contentDOM.getAttribute("contenteditable")).toBe(
      "false",
    );
    expect(harness.view.contentDOM.getAttribute("aria-readonly")).toBe("true");

    harness.destroy();
  });
});

describe("live preview compartment", () => {
  it("installs the preview in Markdown mode with `livePreview` on", () => {
    expect(
      livePreviewExtensions("markdown", DEFAULT_EDITOR_SETTINGS),
    ).toHaveLength(3);
  });

  it("installs nothing in Text mode", () => {
    expect(livePreviewExtensions("text", DEFAULT_EDITOR_SETTINGS)).toEqual([]);
  });

  it("installs nothing when the setting turns the preview off", () => {
    expect(
      livePreviewExtensions(
        "markdown",
        editorSettings({ livePreview: false }),
      ),
    ).toEqual([]);
  });

  it("is reconfigurable on a running editor", () => {
    const { harness, compartments } = createEditor({ mode: "markdown" });
    // The `# heading` marker folds away only while the preview is installed.
    harness.setDoc("# heading\ntext\n");
    expect(harness.classesAt(0)).toContain("cm-live-h1");

    harness.view.dispatch({
      effects: compartments.livePreview.reconfigure(
        livePreviewExtensions("text", DEFAULT_EDITOR_SETTINGS),
      ),
    });

    expect(harness.classesAt(0)).not.toContain("cm-live-h1");

    harness.destroy();
  });
});

describe("language compartment", () => {
  it("carries the GFM markdown language", () => {
    const { harness } = createEditor();
    harness.setDoc("# heading\n\ntext\n");

    expect(syntaxTree(harness.state()).toString()).toContain("ATXHeading1");

    harness.destroy();
  });

  it("can be emptied without rebuilding the view or losing the caret", () => {
    const { harness, compartments } = createEditor();
    harness.setDoc("**bold**\n");
    harness.placeCaret(2);

    harness.view.dispatch({
      effects: compartments.language.reconfigure([]),
    });

    expect(harness.state().selection.main.head).toBe(2);
    expect(harness.doc()).toBe("**bold**\n");
    // No grammar left, so no `StrongEmphasis` node exists any more.
    expect(syntaxTree(harness.state()).toString()).not.toContain(
      "StrongEmphasis",
    );

    harness.destroy();
  });
});

describe("settings reconfiguration (SET-002)", () => {
  it("applies a new tab size and spellcheck without recreating the state", () => {
    const { harness, compartments, view } = createEditor();
    harness.placeCaret(12);
    // jsdom has no layout, so the scroll position is set by hand: a rebuilt view
    // starts at 0, a reconfigured one keeps whatever it had.
    view.scrollDOM.scrollTop = 40;

    view.dispatch({
      effects: compartments.settings.reconfigure(
        settingsExtensions(editorSettings({ tabSize: 8, spellcheck: false })),
      ),
    });

    expect(harness.state().tabSize).toBe(8);
    expect(view.contentDOM.getAttribute("spellcheck")).toBe("false");
    // The things a rebuild would have thrown away.
    expect(harness.state().selection.main.head).toBe(12);
    expect(view.scrollDOM.scrollTop).toBe(40);
    expect(harness.doc()).toBe(DOC);

    harness.destroy();
  });

  it("keeps the undo history across a settings reconfigure", () => {
    const { harness, compartments, view } = createEditor();
    harness.placeCaretAt(1, 0);
    harness.type("X");
    expect(harness.doc().startsWith("Xalpha")).toBe(true);

    view.dispatch({
      effects: compartments.settings.reconfigure(
        settingsExtensions(editorSettings({ tabSize: 2 })),
      ),
    });

    // `history()` is deliberately outside every compartment, so undo survives.
    expect(harness.press("Mod-z")).toBe(true);
    expect(harness.doc()).toBe(DOC);

    harness.destroy();
  });

  it("reports a tab size change to the content element's tab-size style", () => {
    const { harness, compartments, view } = createEditor();

    view.dispatch({
      effects: compartments.settings.reconfigure(
        settingsExtensions(editorSettings({ tabSize: 3 })),
      ),
    });

    expect(view.contentDOM.getAttribute("style") ?? "").toContain("3");

    harness.destroy();
  });
});
