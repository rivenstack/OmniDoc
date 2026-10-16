// The per-cell table editor — F-15 Task 3.3 Rev 2, plan Task A.2.
//
// `OBS-1.14.4-TABLE-001` says a table is **one editor per cell** holding the
// cell's **decoded** text. This suite proves that primitive on its own, before
// anything composes it into a grid: mount, read, type, and the cell keymap's
// boundary behaviour.
//
// The `Mod-z` policy (no history in a cell; the request is delegated) is the
// plan's chosen policy (`§11-4`), recorded here as directed — never a parity
// claim.

import { undo } from "@codemirror/commands";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createHarness,
  keyEvent,
  type EditorHarness,
} from "../../parity/harness";
import {
  CellEditor,
  CELL_EDITOR_CLASS,
  type CellEditorHandlers,
} from "./editor";

let editor: CellEditor | null = null;
let host: HTMLElement | null = null;
let harness: EditorHarness | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
  host?.remove();
  host = null;
  harness?.destroy();
  harness = null;
});

function mountCell(
  text: string,
  handlers: CellEditorHandlers = {},
  editable = true,
): CellEditor {
  host = document.createElement("div");
  document.body.appendChild(host);
  editor = new CellEditor(host, text, handlers, editable);
  return editor;
}

/** A handler set that records every call, so a test can assert on the calls. */
function spyHandlers() {
  return {
    onInput: vi.fn(),
    onTab: vi.fn(),
    onEnter: vi.fn(),
    onEscape: vi.fn(),
    onLeave: vi.fn(),
    onHistory: vi.fn(),
  } satisfies CellEditorHandlers;
}

/**
 * Press a key on the cell the way a browser does — a real `keydown` on the nested
 * editor's content DOM.
 *
 * That matters for one reason: CodeMirror's **DOM** handler is what calls
 * `preventDefault()` when a binding consumes a key (`runScopeHandlers` alone only
 * returns a boolean). So `defaultPrevented` after this call is exactly the signal
 * the outer editor uses to ignore the event.
 */
function press(target: CellEditor, key: string): boolean {
  const event = keyEvent(key);
  target.view.contentDOM.dispatchEvent(event);
  return event.defaultPrevented;
}

/**
 * The redo gesture as a browser actually sends it.
 *
 * A real `Ctrl-Shift-Z` reports `key: "Z"` (Shift changes the character) and
 * `keyCode: 90`, and CodeMirror resolves that pair to `Ctrl-Shift-z` — the
 * harness's `keyEvent` cannot express it, because `"Mod-Shift-z"` there leaves
 * `key` lowercase and CodeMirror reads the binding as plain `Ctrl-z`.
 */
function redoKeyEvent(): KeyboardEvent {
  const init = {
    key: "Z",
    code: "KeyZ",
    keyCode: 90,
    which: 90,
    ctrlKey: true,
    shiftKey: true,
    bubbles: true,
    cancelable: true,
  } as KeyboardEventInit;
  return new KeyboardEvent("keydown", init);
}

function pressRedo(target: CellEditor): boolean {
  const event = redoKeyEvent();
  target.view.contentDOM.dispatchEvent(event);
  return event.defaultPrevented;
}

describe("a cell holds decoded text (OBS-1.14.4-TABLE-001)", () => {
  it("TABLE-001: mounts a nested editor in the host with the decoded text", () => {
    const cell = mountCell("a | b");
    expect(host?.classList.contains(CELL_EDITOR_CLASS)).toBe(true);
    expect(host?.querySelector(".cm-editor")).not.toBeNull();
    expect(cell.text()).toBe("a | b");
  });

  it("TABLE-001: holds a newline for a decoded line break", () => {
    const cell = mountCell("line one\nline two");
    expect(cell.text()).toBe("line one\nline two");
    expect(cell.view.state.doc.lines).toBe(2);
  });

  it("receives typed input and reports it back on read", () => {
    const handlers = spyHandlers();
    const cell = mountCell("a | b", handlers);

    cell.view.dispatch({
      ...cell.view.state.replaceSelection("X"),
      userEvent: "input.type",
    });

    expect(cell.text()).toBe("Xa | b");
    expect(handlers.onInput).toHaveBeenCalledTimes(1);
    expect(handlers.onTab).not.toHaveBeenCalled();
  });

  it("replaces the whole document in setText, and does nothing when unchanged", () => {
    const handlers = spyHandlers();
    const cell = mountCell("a", handlers);

    cell.setText("b");
    expect(cell.text()).toBe("b");

    cell.setText("b");
    // A no-op re-render must not disturb the caret or fire an input.
    expect(cell.text()).toBe("b");
  });

  it("is not editable when the note is locked", () => {
    // Asserted through the attribute, not the IDL property: jsdom has no
    // `contentEditable` property, and CodeMirror expresses editability as the
    // `contenteditable` attribute on the content DOM.
    const locked = mountCell("a", {}, false);
    expect(locked.view.contentDOM.getAttribute("contenteditable")).toBe(
      "false",
    );

    locked.destroy();
    host?.remove();

    const unlocked = mountCell("a");
    expect(unlocked.view.contentDOM.getAttribute("contenteditable")).toBe(
      "true",
    );
  });

  it("mounts inside the outer editor's content DOM and keeps working", () => {
    // The real shape: a widget's host lives inside `cm-editor`'s content DOM.
    harness = createHarness({ doc: "outer" });
    host = document.createElement("div");
    harness.view.contentDOM.appendChild(host);
    editor = new CellEditor(host, "cell", {});
    const cell = editor;

    expect(cell.text()).toBe("cell");
    cell.view.dispatch({
      ...cell.view.state.replaceSelection("!"),
      userEvent: "input.type",
    });
    expect(cell.text()).toBe("!cell");
    // The outer document was not touched by the nested edit.
    expect(harness.doc()).toBe("outer");
  });
});

describe("cell keymap (OBS-1.14.4-TABLE-001)", () => {
  it("TABLE-001: consumes Tab and reports it as a forward move", () => {
    const handlers = spyHandlers();
    const cell = mountCell("a", handlers);

    expect(press(cell, "Tab")).toBe(true);
    expect(handlers.onTab).toHaveBeenCalledWith(false);
    expect(cell.text()).toBe("a");
  });

  it("TABLE-001: consumes Shift-Tab and reports it as a backward move", () => {
    const handlers = spyHandlers();
    const cell = mountCell("a", handlers);

    expect(press(cell, "Shift-Tab")).toBe(true);
    expect(handlers.onTab).toHaveBeenCalledWith(true);
  });

  it("TABLE-001: consumes Enter and Escape", () => {
    const handlers = spyHandlers();
    const cell = mountCell("a", handlers);

    expect(press(cell, "Enter")).toBe(true);
    expect(handlers.onEnter).toHaveBeenCalledTimes(1);
    expect(cell.text()).toBe("a");

    expect(press(cell, "Escape")).toBe(true);
    expect(handlers.onEscape).toHaveBeenCalledTimes(1);
  });

  it("TABLE-001: leaves on Left only at decoded offset 0", () => {
    const handlers = spyHandlers();
    const cell = mountCell("abc", handlers);

    cell.focus(1);
    expect(press(cell, "ArrowLeft")).toBe(false);
    expect(handlers.onLeave).not.toHaveBeenCalled();

    cell.focus(0);
    expect(press(cell, "ArrowLeft")).toBe(true);
    expect(handlers.onLeave).toHaveBeenCalledWith("left");
  });

  it("TABLE-001: leaves on Right only at the decoded end", () => {
    const handlers = spyHandlers();
    const cell = mountCell("abc", handlers);

    cell.focus(1);
    expect(press(cell, "ArrowRight")).toBe(false);

    cell.focus(3);
    expect(press(cell, "ArrowRight")).toBe(true);
    expect(handlers.onLeave).toHaveBeenCalledWith("right");
  });

  it("TABLE-001: leaves Up/Down only at the cell's first and last visual line", () => {
    const handlers = spyHandlers();
    const cell = mountCell("line one\nline two", handlers);

    // End of the first line is not the *start* of it: the caret moves up natively.
    cell.focus(8);
    expect(press(cell, "ArrowUp")).toBe(false);
    expect(handlers.onLeave).not.toHaveBeenCalled();

    cell.focus(0);
    expect(press(cell, "ArrowUp")).toBe(true);
    expect(handlers.onLeave).toHaveBeenCalledWith("up");

    // Start of the last line is not its end either.
    cell.focus(9);
    expect(press(cell, "ArrowDown")).toBe(false);

    cell.focus(cell.text().length);
    expect(press(cell, "ArrowDown")).toBe(true);
    expect(handlers.onLeave).toHaveBeenCalledWith("down");
  });

  it("TABLE-001: keeps arrows native while text is selected", () => {
    const handlers = spyHandlers();
    const cell = mountCell("abc", handlers);
    cell.view.dispatch({ selection: { anchor: 0, head: 3 } });

    expect(press(cell, "ArrowLeft")).toBe(false);
    expect(press(cell, "ArrowRight")).toBe(false);
    expect(handlers.onLeave).not.toHaveBeenCalled();
  });

  it("TABLE-001: never moves text while navigating", () => {
    const cell = mountCell("abc", spyHandlers());
    for (const key of [
      "Tab",
      "Shift-Tab",
      "Enter",
      "Escape",
      "ArrowUp",
      "ArrowDown",
    ]) {
      press(cell, key);
    }
    expect(cell.text()).toBe("abc");
  });

  it("does not consume a key when nothing is listening", () => {
    const cell = mountCell("a", {});
    expect(press(cell, "Tab")).toBe(false);
    expect(press(cell, "Enter")).toBe(false);
    expect(press(cell, "ArrowLeft")).toBe(false);
  });
});

describe("no history inside a cell (plan §11-4, @user-directed)", () => {
  it("installs no history extension, so undo is a no-op", () => {
    const cell = mountCell("abc", spyHandlers());
    cell.view.dispatch({
      ...cell.view.state.replaceSelection("X"),
      userEvent: "input.type",
    });
    expect(cell.text()).toBe("Xabc");

    // No `history()` in the cell means CodeMirror's own undo refuses outright.
    expect(undo(cell.view)).toBe(false);
    expect(cell.text()).toBe("Xabc");
  });

  it("delegates Mod-z to the owner instead of undoing locally", () => {
    const handlers = spyHandlers();
    const cell = mountCell("abc", handlers);
    cell.view.dispatch({
      ...cell.view.state.replaceSelection("X"),
      userEvent: "input.type",
    });

    expect(press(cell, "Mod-z")).toBe(true);
    expect(handlers.onHistory).toHaveBeenCalledWith("undo");
    // Consumed locally, but nothing happened locally.
    expect(cell.text()).toBe("Xabc");
  });

  it("delegates redo as well", () => {
    const handlers = spyHandlers();
    const cell = mountCell("abc", handlers);

    expect(pressRedo(cell)).toBe(true);
    expect(handlers.onHistory).toHaveBeenLastCalledWith("redo");
    expect(press(cell, "Mod-y")).toBe(true);
    expect(handlers.onHistory).toHaveBeenLastCalledWith("redo");
  });

  it("does not consume Mod-z when nothing is listening", () => {
    const cell = mountCell("abc", {});
    expect(press(cell, "Mod-z")).toBe(false);
  });
});
