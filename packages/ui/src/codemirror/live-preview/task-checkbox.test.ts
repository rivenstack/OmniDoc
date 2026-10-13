// Task checkbox widget and toggle — F-15 Rev 2, plan Task 2.8.
//
// Acceptance (plan §5 Task 2.8): "Click writes `x` from space and space from
// any other char; the original char is lost (decision 4); focus/selection
// unchanged; the LP predicate is case-insensitive."
//
// `OBS-1.14.4-TASK-001` is one of the entries most likely to be "improved" by a
// well-meaning port — preserving the original character, or moving the caret to
// the click. The tests below pin the artifact's behaviour instead.

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState, Transaction } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { createHarness, type EditorHarness } from "../parity/harness";
import { markdownLivePreviewPlugin } from "./index";

const LANGUAGE = markdown({ base: markdownLanguage });

let harness: EditorHarness | null = null;

afterEach(() => {
  harness?.destroy();
  harness = null;
});

function mount(doc: string): EditorHarness {
  harness = createHarness({ doc, extensions: [LANGUAGE, markdownLivePreviewPlugin] });
  return harness;
}

/** The rendered checkbox element. */
function checkbox(view: EditorHarness): HTMLElement {
  const element = view.view.contentDOM.querySelector<HTMLElement>(
    '.cm-live-task[role="checkbox"]',
  );
  if (!element) throw new Error("no task checkbox rendered");
  return element;
}

/** Whether the rendered checkbox is checked, from its own ARIA state. */
function isChecked(view: EditorHarness): boolean {
  return checkbox(view).getAttribute("aria-checked") === "true";
}

/** Click the rendered checkbox the way a pointer would. */
function click(view: EditorHarness): void {
  checkbox(view).dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
}

describe("the predicate accepts any bracketed character (OBS-1.14.4-TASK-001)", () => {
  it("draws a checkbox for every single-character marker, whatever the character", () => {
    const cases: readonly (readonly [string, boolean])[] = [
      ["- [ ] task\n", false],
      ["- [x] task\n", true],
      // The predicate is case-insensitive…
      ["- [X] task\n", true],
      // …and it does not care what the character *is*: the artifact's docs say
      // any character marks the task complete, and the predicate is the reason.
      ["- [-] task\n", true],
      ["- [?] task\n", true],
      // An ordered task and a quoted task are tasks too.
      ["1. [ ] task\n", false],
      ["> - [x] task\n", true],
    ];

    for (const [doc, checked] of cases) {
      const view = mount(doc);
      expect(isChecked(view), doc).toBe(checked);
    }
  });

  it("renders the design system's checkbox, not a character", () => {
    const view = mount("- [ ] task\n");
    const box = checkbox(view);

    // A real checkbox to assistive technology, with the Tabler tick inside.
    expect(box.getAttribute("aria-checked")).toBe("false");
    expect(box.getAttribute("aria-label")).toBe("Task");
    expect(box.dataset.checked).toBe("false");
    expect(box.querySelector(".cm-live-task-tick")).not.toBeNull();
    // No glyph text stands in for the box.
    expect(box.textContent).toBe("");
  });

  it("still gives the bullet up to the checkbox, including in a quote", () => {
    const view = mount("> - [ ] task\n");
    expect(view.view.contentDOM.textContent).not.toContain("•");
    expect(checkbox(view)).toBeTruthy();
  });
});

describe("a completed task's text is struck through (@user-directed)", () => {
  it("marks the item text, not the marker, when checked", () => {
    const view = mount("- [x] done task\n\ntrailing\n");
    view.focus();
    view.placeCaret(20);

    // From the character after the marker's whitespace to the end of the line.
    expect(view.classesAt(7)).toContain("cm-live-task-done");
    expect(view.classesAt(0)).not.toContain("cm-live-task-done");
    expect(view.classesAt(20)).not.toContain("cm-live-task-done");
  });

  it("leaves an open task unstruck", () => {
    const view = mount("- [ ] open task\n\ntrailing\n");
    view.focus();
    view.placeCaret(21);
    expect(view.classesAt(7)).not.toContain("cm-live-task-done");
  });

  it("fills the box for `[?]` and `[-]` but does not strike them", () => {
    // The artifact's two halves disagree: the predicate fills the box for any
    // character, but only `x` / `X` strikes the text through.
    for (const doc of ["- [?] odd\n\ntrailing\n", "- [-] odd\n\ntrailing\n"]) {
      const view = mount(doc);
      view.focus();
      view.placeCaret(18);

      expect(isChecked(view), doc).toBe(true);
      expect(view.classesAt(6), doc).not.toContain("cm-live-task-done");
      view.destroy();
    }
  });

  it("strikes `[X]` as well as `[x]`", () => {
    const view = mount("- [X] done task\n\ntrailing\n");
    view.focus();
    view.placeCaret(20);
    expect(view.classesAt(7)).toContain("cm-live-task-done");
  });

  it("keeps the strike while the marker is revealed", () => {
    const view = mount("- [x] done task\n");
    view.focus();
    view.placeCaret(9);

    expect(view.view.contentDOM.textContent).toContain("[x]");
    expect(view.classesAt(7)).toContain("cm-live-task-done");
  });
});

describe("the toggle writes exactly `x` or a space (OBS-1.14.4-TASK-001)", () => {
  it("writes `x` from a space", () => {
    const view = mount("- [ ] task\n");
    click(view);
    expect(view.doc()).toBe("- [x] task\n");
  });

  it("writes a space from `x`", () => {
    const view = mount("- [x] task\n");
    click(view);
    expect(view.doc()).toBe("- [ ] task\n");
  });

  it("loses the original character — a dash becomes a space, not a dash again", () => {
    const view = mount("- [-] task\n");
    click(view);
    expect(view.doc()).toBe("- [ ] task\n");
  });

  it("round-trips: two clicks return to the original state", () => {
    const view = mount("- [ ] task\n");
    click(view);
    expect(view.doc()).toBe("- [x] task\n");
    click(view);
    expect(view.doc()).toBe("- [ ] task\n");
  });

  it("touches only the character between the brackets", () => {
    const view = mount("Intro\n\n- [ ] first task\n- [x] second task\n\nOutro\n");
    click(view);
    // Exactly one character changed, in the first task.
    expect(view.doc()).toBe("Intro\n\n- [x] first task\n- [x] second task\n\nOutro\n");
  });
});

describe("the click moves nothing (OBS-1.14.4-TASK-001)", () => {
  it("leaves the caret and the selection exactly where they were", () => {
    // The caret is on the next line: on the task's own line the marker unfolds
    // and there is no checkbox to click (which is also the keyboard route).
    const view = mount("- [ ] task\n\ntrailing\n");
    view.focus();
    view.placeCaret(16);

    const before = view.state().selection.main;
    click(view);

    const after = view.state().selection.main;
    expect(after.anchor).toBe(before.anchor);
    expect(after.head).toBe(before.head);
    expect(view.view.contentDOM.contains(document.activeElement)).toBe(true);
  });

  it("keeps a non-collapsed selection non-collapsed", () => {
    const view = mount("- [ ] task\n\ntrailing\n");
    view.focus();
    view.select(13, 17);
    click(view);
    expect(view.state().selection.main.from).toBe(13);
    expect(view.state().selection.main.to).toBe(17);
  });

  it("carries no user-event annotation, so undo groups it as a plain edit", () => {
    // The artifact's toggle transaction carries no user event at all.
    const seen: (string | undefined)[] = [];
    harness = createHarness({
      doc: "- [ ] task\n",
      extensions: [
        LANGUAGE,
        markdownLivePreviewPlugin,
        EditorView.updateListener.of((update) => {
          for (const transaction of update.transactions) {
            seen.push(transaction.annotation(Transaction.userEvent));
          }
        }),
      ],
    });
    click(harness);

    expect(seen).toEqual([undefined]);
  });
});

describe("`[?]` and `[-]` are tasks, not links (plan §7 risk D-5)", () => {
  it("does not underline the marker or fold it as link syntax", () => {
    const view = mount("- [?] odd\n\ntrailing\n");
    view.focus();
    view.placeCaret(18);

    // The grammar reads `[?]` as a shortcut reference link; the task layer wins,
    // so there is no link mark and no link-folded brackets.
    expect(view.view.contentDOM.querySelectorAll(".cm-live-link")).toHaveLength(0);
    expect(view.classesAt(3)).not.toContain("cm-live-link");
    // The checkbox stands where the marker was.
    expect(checkbox(view)).toBeTruthy();
    expect(view.view.contentDOM.textContent).not.toContain("[?]");
  });

  it("shows the raw marker, still as a task, when the caret is on the line", () => {
    const view = mount("- [?] odd\n\ntrailing\n");
    view.focus();
    view.placeCaret(5);

    // Revealed, and still not a link: the task layer claims the span either way.
    expect(view.view.contentDOM.textContent).toContain("[?]");
    expect(view.view.contentDOM.querySelectorAll(".cm-live-link")).toHaveLength(0);
  });

  it("keeps a real link a link", () => {
    const view = mount("- a [link](https://example.com) here\n");
    view.focus();
    view.placeCaret(view.doc().length);

    expect(view.classesAt(5)).toContain("cm-live-link");
  });
});

describe("the checkbox stays decoration (OBS-1.14.4-A11Y-003)", () => {
  it("is not a tab stop, so the editor's tab order stays the document", () => {
    const view = mount("- [ ] task\n");
    expect(checkbox(view).tabIndex).toBe(-1);
  });

  it("toggles on Space or Enter when focus does land on it", () => {
    const view = mount("- [ ] task\n\ntrailing\n");
    const box = checkbox(view);

    box.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(view.doc()).toBe("- [x] task\n\ntrailing\n");

    checkbox(view).dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    expect(view.doc()).toBe("- [ ] task\n\ntrailing\n");
  });

  it("refuses to toggle a locked note", () => {
    harness = createHarness({
      doc: "- [ ] task\n",
      extensions: [
        LANGUAGE,
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        markdownLivePreviewPlugin,
      ],
    });
    click(harness);
    expect(harness.doc()).toBe("- [ ] task\n");
  });

  it("reveals the raw marker when the caret is on the line (@user-observed)", () => {
    const view = mount("- [ ] task\n");
    view.focus();
    view.placeCaret(9);

    // The catalogue gives the task marker no reveal rule (`REVEAL-008` lists
    // neither it nor any line marker), but `@user` observed the artifact
    // revealing the raw marker with the caret on the line. The observation wins.
    expect(view.view.contentDOM.textContent).toContain("[ ]");
  });

  it("keeps the checkbox when the caret is elsewhere on another line", () => {
    const view = mount("- [ ] task\n\ntrailing\n");
    view.focus();
    view.placeCaret(16);

    expect(checkbox(view)).toBeTruthy();
    expect(view.view.contentDOM.textContent).not.toContain("[ ]");
  });

  it("keeps the keyboard path as the command surface, not a tab stop", () => {
    const view = mount("- [ ] task\n");
    // The artifact's checkbox is pointer-only (`A11Y-003`); OmniDoc's keyboard
    // path for this action is the Task 6 command set (D-4), so the widget stays
    // out of the tab order but still answers the checkbox gesture if focus
    // lands on it.
    expect(checkbox(view).tabIndex).toBe(-1);
  });
});
