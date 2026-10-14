// Callouts in Live Preview, end to end — F-15 Rev 2, plan Task 3.2.
//
// Acceptance (plan §5 Task 3.2): "whole-block reveal with inclusive predicate; no
// partial reveal; ... rejected in a table cell" — the widget/reveal half. The
// entries are `OBS-1.14.4-CALLOUT-004` (one block widget while untouched, raw
// source when touched, focused editor only) and `-003` (the fold click writes
// nothing).
//
// ## Why the tests flush after focusing
//
// CodeMirror dispatches a focus-change effect in a microtask, not during
// `view.focus()`. The callout field reads that effect (a `StateField` cannot ask
// a view whether it has focus), so a test must let the microtask run **before**
// moving the caret — otherwise the field still believes the editor is unfocused
// and keeps the widget. So every test is `focus → flush → placeCaret`.

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { createHarness, type EditorHarness } from "../../parity/harness";
import { markdownLivePreviewPlugin } from "../index";
import { calloutLivePreview, replacedCallouts } from "./index";
import { buildCalloutNode, type CalloutNode } from "./model";
import { scanCallouts } from "./parse";
import { createCalloutHandlers } from "./render";

const LANGUAGE = markdown({ base: markdownLanguage });

const DOC = "para\n\n> [!note] Note title\n> The callout body.\n\nafter\n";

let harness: EditorHarness | null = null;

afterEach(() => {
  harness?.destroy();
  harness = null;
});

function mount(doc: string): EditorHarness {
  harness = createHarness({
    doc,
    extensions: [LANGUAGE, markdownLivePreviewPlugin, calloutLivePreview],
  });
  return harness;
}

/** Let CodeMirror's deferred focus-change transaction run. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Narrow away `null` without a non-null assertion. */
function must<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("expected a value");
  return value;
}

/**
 * Focus and settle the focus field.
 *
 * CodeMirror *compares* focus during an update and dispatches the focus effect in
 * a microtask, so a dispatch has to follow `focus()` — and in jsdom the DOM's own
 * focus state settles a turn later, hence the second round. Only then does the
 * callout field know the editor is focused.
 */
async function focusSettled(view: EditorHarness): Promise<void> {
  const caret = view.state().selection.main.head;
  view.focus();
  view.placeCaret(caret);
  await flush();
  view.placeCaret(caret);
  await flush();
}

/** Mount, place the caret, focus, settle the focus field. */
async function focusedAt(doc: string, caret: number): Promise<EditorHarness> {
  const view = mount(doc);
  view.placeCaret(caret);
  await focusSettled(view);
  return view;
}

function calloutRange(view: EditorHarness) {
  const [callout] = scanCallouts(view.state().doc);
  return callout;
}

/** The render model of the first callout in the current document. */
function calloutWidgetNode(view: EditorHarness): CalloutNode | null {
  const source = view.state().doc;
  const callouts = scanCallouts(source);
  const [first] = callouts;
  return first ? buildCalloutNode(source, first, callouts) : null;
}

/** The widget node for the first callout, if it is currently replaced. */
function calloutWidget(view: EditorHarness): HTMLElement | null {
  return view.view.contentDOM.querySelector(".cm-live-callout-widget");
}

describe("one block widget while untouched (OBS-1.14.4-CALLOUT-004)", () => {
  it("replaces the whole callout with one widget when the caret is outside", async () => {
    const view = await focusedAt(DOC, 0);

    expect(calloutWidget(view)).not.toBeNull();
    const blocks = view
      .decorations()
      .filter((decoration) => decoration.kind === "replace" && decoration.block);
    expect(blocks).toHaveLength(1);
    const callout = calloutRange(view);
    expect(blocks[0]).toMatchObject({ from: callout.from, to: callout.to });
    // The raw marker is not in the rendered text.
    expect(view.view.contentDOM.textContent).not.toContain("[!note]");
  });

  it("shows the raw source when the caret touches the block", async () => {
    const view = mount(DOC);
    const callout = calloutRange(view);
    view.placeCaret(callout.from + 10);
    await focusSettled(view);

    expect(calloutWidget(view)).toBeNull();
    const text = view.view.contentDOM.textContent ?? "";
    expect(text).toContain("[!note]");
    expect(text).toContain("The callout body.");
  });

  it("keeps the widget for an unfocused editor", () => {
    const view = mount(DOC);
    // No `focus()` — an unfocused editor reveals nothing (`-004`, `REVEAL-002`).
    expect(view.state().facet(EditorView.editable)).toBe(true);
    expect(calloutWidget(view)).not.toBeNull();
  });
});

describe("no partial reveal (plan §0.4 negative 5)", () => {
  it("is all-or-nothing: the marker never appears beside a rendered widget", async () => {
    const view = await focusedAt(DOC, 0);
    const callout = calloutRange(view);

    view.placeCaret(0); // outside
    expect(view.view.contentDOM.textContent).not.toContain("[!note]");
    expect(calloutWidget(view)).not.toBeNull();

    view.placeCaret(callout.from); // inclusive predicate: the very start counts
    expect(replacedCallouts(view.state())).toHaveLength(0);
    expect(view.view.contentDOM.textContent).toContain("[!note]");
  });

  it("uses the inclusive comparison, so a caret at the block's end reveals it", async () => {
    const view = await focusedAt(DOC, 0);
    const callout = calloutRange(view);

    view.placeCaret(callout.to);
    expect(replacedCallouts(view.state())).toHaveLength(0);

    // One position past the block, and it is a widget again.
    view.placeCaret(callout.to + 1);
    expect(replacedCallouts(view.state())).toHaveLength(1);
  });
});

describe("the fold click writes nothing (OBS-1.14.4-CALLOUT-003)", () => {
  it("toggles the collapsed class without changing the document", async () => {
    const view = await focusedAt("para\n\n> [!note]- Folded\n> Body\n\nafter\n", 0);

    const widget = must(calloutWidget(view));
    const button = must(widget.querySelector(".cm-live-callout-fold"));
    const before = view.doc();
    // `-` starts collapsed.
    expect(must(widget.querySelector(".cm-live-callout")).classList.contains("is-collapsed")).toBe(
      true,
    );

    await act(async () => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(must(widget.querySelector(".cm-live-callout")).classList.contains("is-collapsed")).toBe(
      false,
    );
    expect(view.doc()).toBe(before);
  });
});

describe("nesting (OBS-1.14.4-CALLOUT-010)", () => {
  it("draws the nested callout inside the outer widget, at each level", async () => {
    const view = await focusedAt(
      "para\n\n> [!quote] Outer\n> > [!tip]+ Inner\n> > Inner body.\n\n",
      0,
    );

    const widget = must(calloutWidget(view));
    expect(widget.querySelectorAll(".cm-live-callout")).toHaveLength(2);
    expect(widget.querySelectorAll(".cm-live-callout-icon")).toHaveLength(2);
    expect(widget.textContent).toContain("Inner body.");
  });
});
describe("the menu acts on the document (OBS-1.14.4-CALLOUT-005)", () => {
  it("`Edit` selects the widget's whole source range", async () => {
    const view = await focusedAt(DOC, 0);
    const callout = calloutRange(view);
    const widget = must(calloutWidget(view));

    await act(async () => {
      must(widget.querySelector(".cm-live-callout")).dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, cancelable: true }),
      );
    });
    const edit = [...document.body.querySelectorAll('[data-slot="dropdown-menu-item"]')].find(
      (item) => item.textContent === "Edit",
    );
    await act(async () => {
      must(edit).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    // Dispatching from a menu inside the widget tears the widget (and its React
    // root) down synchronously — the regression guard for a clean unmount.
    const selection = view.state().selection.main;
    expect([selection.from, selection.to]).toEqual([callout.from, callout.to]);
  });
});

describe("stale offsets cannot take the editor down", () => {
  it("clamps a reveal whose range is past the end of the document", async () => {
    const view = await focusedAt(DOC, 0);
    const handlers = createCalloutHandlers(view.view);
    const stale: CalloutNode = {
      ...must(calloutWidgetNode(view)),
      from: 10_000,
      to: 20_000,
    };

    // The regression: this used to dispatch raw offsets and throw
    // `RangeError: Selection points outside of document`.
    expect(() => handlers.reveal(stale)).not.toThrow();
    expect(view.state().selection.main.from).toBeLessThanOrEqual(view.doc().length);
  });

  it("ignores a menu action for a callout that is no longer there", async () => {
    const view = await focusedAt(DOC, 0);
    const handlers = createCalloutHandlers(view.view);
    const stale: CalloutNode = { ...must(calloutWidgetNode(view)), from: 0, to: 1 };

    expect(() => handlers.pickType(stale, "tip")).not.toThrow();
    expect(() => handlers.remove(stale)).not.toThrow();
    expect(() => handlers.edit(stale)).not.toThrow();
    expect(view.doc()).toBe(DOC);
  });
});
