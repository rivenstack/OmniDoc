"use client";

/**
 * The callout block widget (F-15 Rev 2, plan Task 3.2).
 *
 * `OBS-1.14.4-CALLOUT-004` replaces the whole callout with **one** block widget
 * while the selection does not touch it, so this is the widget. It renders the
 * React component in `block.tsx` through a synchronous React root, because the
 * card is made of project components (Tabler icons, the shadcn context menu, the
 * command palette) rather than hand-built DOM.
 *
 * Everything the component must not know about — `Text`, offsets, the
 * `EditorView` — stays here: the component speaks in `CalloutNode`s and calls
 * `CalloutHandlers`, and this file is what turns those into transactions.
 */

import { WidgetType } from "@codemirror/view";
import type { EditorView } from "@codemirror/view";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { CalloutBlock } from "./block";
import { removeCallout, selectCalloutRange, setCalloutType } from "./menu";
import {
  buildCalloutNode,
  type CalloutHandlers,
  type CalloutNode,
} from "./model";
import { scanCallouts, type Callout } from "./parse";

/**
 * Bind the component's callbacks to the editor.
 *
 * The component is presentational: it says *what* happened ("pick `tip`"), and
 * this decides *what that means* — a `setCalloutType` transaction that rewrites
 * only the text between `[!` and `]`, for instance.
 *
 * ## Every offset is checked against the live document
 *
 * A rendered card carries the offsets it was built from, and a React tree can
 * outlive the state it was built in (a widget whose DOM CodeMirror reused, or a
 * click that arrives while the document is being replaced). Dispatching those
 * raw offsets is a `RangeError: Selection points outside of document` waiting to
 * happen, so a stale node is *resolved* — the callout is looked up afresh — and
 * the one action that must still work ([reveal](#), the body click) is clamped
 * into the document rather than trusted.
 */
export function createCalloutHandlers(view: EditorView): CalloutHandlers {
  const currentCallout = (node: CalloutNode): Callout | null =>
    scanCallouts(view.state.doc).find(
      (callout) => callout.from === node.from && callout.to === node.to,
    ) ?? null;

  return {
    reveal: (node) => {
      const doc = view.state.doc;
      const from = Math.min(Math.max(node.from, 0), doc.length);
      const to = Math.min(Math.max(node.to, from), doc.length);
      view.dispatch({ selection: { anchor: from, head: to } });
    },
    edit: (node) => {
      const callout = currentCallout(node);
      if (callout) view.dispatch(selectCalloutRange(callout));
    },
    pickType: (node, type) => {
      const callout = currentCallout(node);
      if (callout) view.dispatch(setCalloutType(callout, type));
    },
    remove: (node) => {
      const callout = currentCallout(node);
      if (callout) view.dispatch(removeCallout(view.state.doc, callout));
    },
  };
}

/**
 * The block widget: one rendered callout in place of its source range.
 *
 * `ignoreEvent` is `true` — every interaction is a React handler above, so
 * CodeMirror must not turn the widget's clicks into caret placements.
 */
export class CalloutPreviewWidget extends WidgetType {
  private root: Root | null = null;

  constructor(
    private readonly text: string,
    private readonly from: number,
    private readonly to: number,
    private readonly editable: boolean,
  ) {
    super();
  }

  eq(other: CalloutPreviewWidget): boolean {
    return (
      other.text === this.text &&
      other.from === this.from &&
      other.to === this.to &&
      other.editable === this.editable
    );
  }

  ignoreEvent(): boolean {
    return true;
  }

  toDOM(view: EditorView): HTMLElement {
    const host = document.createElement("div");
    host.className = "cm-live-callout-widget";
    this.mount(host, view);
    return host;
  }

  /**
   * Reuse a host CodeMirror built for a *different* callout of the same kind.
   *
   * Without this, CodeMirror would either keep a stale React tree or throw the
   * DOM away and remount; re-rendering the existing root keeps the card's own
   * state (a folded callout stays folded) while the data is refreshed.
   */
  updateDOM(dom: HTMLElement, view: EditorView): boolean {
    this.mount(dom, view);
    return true;
  }

  destroy(): void {
    this.root?.unmount();
    this.root = null;
  }

  /** Render (or re-render) the React tree for the current document. */
  private mount(host: HTMLElement, view: EditorView): void {
    const doc = view.state.doc;
    const callouts = scanCallouts(doc);
    const callout = callouts.find(
      (candidate) => candidate.from === this.from && candidate.to === this.to,
    );
    if (!callout) {
      // The range is gone (a mid-transaction render): show the raw source rather
      // than an empty card, and drop the React tree.
      this.root?.unmount();
      this.root = null;
      host.textContent = this.text;
      return;
    }

    const node = buildCalloutNode(doc, callout, callouts);
    const handlers = createCalloutHandlers(view);
    this.root ??= createRoot(host);
    // `flushSync` so the widget's DOM exists before CodeMirror measures it — a
    // concurrent render would leave an empty block for a frame.
    flushSync(() => {
      this.root?.render(
        <CalloutBlock
          node={node}
          editable={this.editable}
          handlers={handlers}
        />,
      );
    });
  }
}
