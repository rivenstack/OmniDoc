// External link activation — F-15 Rev 2, plan Task 2.10.
//
// Acceptance (plan §5 Task 2.10): "Source-mode plain click places the caret; LP
// plain click follows only on rendered text; a selection containing the target
// blocks; Alt/Shift reserved; Mod-click in source downgraded unless Shift;
// middle-click exempt; activation deferred 100 ms; `javascript:`/`data:`-class
// schemes route to the confirm modal; `http/https/mailto` open directly."
//
// The gate chain is `OBS-1.14.4-LINK-002`…`-005`, the target decision is
// `-LINK-001` (adapted, D-3) and `-LINK-010`, the deferral is `-LINK-011`, and
// the scheme gate is `-LINK-009` (adapted, D-2).

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHarness, type EditorHarness } from "../parity/harness";
import { markdownLivePreviewPlugin } from "../live-preview";
import {
  ACTIVATION_DELAY_MS,
  INLINE_SCHEMES,
  LINK_TARGET_POLICY,
  browserLinkPort,
  createLinkActivator,
  decideActivation,
  isInlineScheme,
  linkActivationExtension,
  linkAt,
  paneIntent,
  schemeOf,
  selectionContainsTarget,
  targetOf,
  type LinkClickEvent,
  type LinkPort,
} from "./activation";

const LANGUAGE = markdown({ base: markdownLanguage });
const URL = "https://example.com";

let harness: EditorHarness | null = null;

afterEach(() => {
  harness?.destroy();
  harness = null;
});

function event(overrides: Partial<LinkClickEvent> = {}): LinkClickEvent {
  return {
    button: 0,
    primaryModifier: false,
    altKey: false,
    shiftKey: false,
    ...overrides,
  };
}

/** A port whose calls are recorded, with an immediate (non-deferred) open. */
function fakePort(accepted = true) {
  const open = vi.fn();
  const confirm = vi.fn(() => Promise.resolve(accepted));
  const port: LinkPort = { open, confirm };
  return { port, open, confirm };
}

describe("the modifier decoder (OBS-1.14.4-LINK-001, adapted D-3)", () => {
  it("decodes the artifact's pane intents", () => {
    expect(paneIntent(event())).toBe(false);
    expect(paneIntent(event({ primaryModifier: true }))).toBe("tab");
    expect(paneIntent(event({ primaryModifier: true, altKey: true }))).toBe("split");
    expect(
      paneIntent(event({ primaryModifier: true, altKey: true, shiftKey: true })),
    ).toBe("window");
    expect(paneIntent(event({ shiftKey: true }))).toBe(false);
    expect(paneIntent(event({ altKey: true }))).toBe(false);
  });

  it("checks the middle button first, ignoring every modifier", () => {
    expect(paneIntent(event({ button: 1 }))).toBe("tab");
    expect(paneIntent(event({ button: 1, altKey: true, shiftKey: true }))).toBe("tab");
  });

  it("collapses split and window onto a browser tab (D-3)", () => {
    expect(targetOf("tab")).toBe("tab");
    expect(targetOf("split")).toBe("tab");
    expect(targetOf("window")).toBe("tab");
  });

  it("serves the current-leaf intent with a tab too (@user 2026-10-13)", () => {
    // The recorded deviation: the artifact's `false` means "navigate in the
    // current leaf", which would drop the note being edited.
    expect(LINK_TARGET_POLICY).toEqual({ plain: "tab", modified: "tab" });
    expect(targetOf(false)).toBe(LINK_TARGET_POLICY.plain);
  });
});

describe("the gate chain (OBS-1.14.4-LINK-002…-005)", () => {
  it("source mode: a plain click places the caret", () => {
    expect(
      decideActivation({
        mode: "source",
        event: event(),
        onRenderedLink: true,
        selectionContainsTarget: false,
      }),
    ).toEqual({ kind: "caret" });
  });

  it("source mode: a Mod-click's tab intent is downgraded, then served by a tab", () => {
    // The tab intent is rewritten to `false` — the current leaf — and this
    // product serves that with a tab as well (@user 2026-10-13). The downgrade
    // itself is what `paneIntent`'s own tests pin.
    expect(
      decideActivation({
        mode: "source",
        event: event({ primaryModifier: true }),
        onRenderedLink: true,
        selectionContainsTarget: false,
      }),
    ).toEqual({ kind: "activate", target: "tab" });
  });

  it("source mode: Mod+Shift opens a tab, and so does Mod+Alt (split → tab)", () => {
    expect(
      decideActivation({
        mode: "source",
        event: event({ primaryModifier: true, shiftKey: true }),
        onRenderedLink: false,
        selectionContainsTarget: false,
      }),
    ).toEqual({ kind: "activate", target: "tab" });
    expect(
      decideActivation({
        mode: "source",
        event: event({ primaryModifier: true, altKey: true }),
        onRenderedLink: false,
        selectionContainsTarget: false,
      }),
    ).toEqual({ kind: "activate", target: "tab" });
  });

  it("source mode: middle-click is exempt from the downgrade", () => {
    expect(
      decideActivation({
        mode: "source",
        event: event({ button: 1 }),
        onRenderedLink: false,
        selectionContainsTarget: false,
      }),
    ).toEqual({ kind: "activate", target: "tab" });
  });

  it("preview: a plain click follows only rendered link text", () => {
    const base = { mode: "preview" as const, event: event(), selectionContainsTarget: false };
    expect(decideActivation({ ...base, onRenderedLink: true })).toEqual({
      kind: "activate",
      target: "tab",
    });
    // The raw syntax — brackets, URL, an unrendered link on the active line.
    expect(decideActivation({ ...base, onRenderedLink: false })).toEqual({ kind: "caret" });
  });

  it("preview: a Mod-click follows anywhere on the token", () => {
    expect(
      decideActivation({
        mode: "preview",
        event: event({ primaryModifier: true }),
        onRenderedLink: false,
        selectionContainsTarget: false,
      }),
    ).toEqual({ kind: "activate", target: "tab" });
  });

  it("preview: a selection containing the target blocks activation", () => {
    expect(
      decideActivation({
        mode: "preview",
        event: event(),
        onRenderedLink: true,
        selectionContainsTarget: true,
      }),
    ).toEqual({ kind: "caret" });
    // Even a Mod-click.
    expect(
      decideActivation({
        mode: "preview",
        event: event({ primaryModifier: true }),
        onRenderedLink: true,
        selectionContainsTarget: true,
      }),
    ).toEqual({ kind: "caret" });
  });

  it("preview: Alt and Shift on a plain click are reserved for selection", () => {
    for (const modifiers of [{ altKey: true }, { shiftKey: true }]) {
      expect(
        decideActivation({
          mode: "preview",
          event: event(modifiers),
          onRenderedLink: true,
          selectionContainsTarget: false,
        }),
        JSON.stringify(modifiers),
      ).toEqual({ kind: "caret" });
    }
  });

  it("preview: middle-click opens a tab regardless of what was clicked", () => {
    expect(
      decideActivation({
        mode: "preview",
        event: event({ button: 1 }),
        onRenderedLink: false,
        selectionContainsTarget: false,
      }),
    ).toEqual({ kind: "activate", target: "tab" });
  });
});

describe("the scheme gate (OBS-1.14.4-LINK-009, adapted D-2)", () => {
  it("names the inline schemes", () => {
    expect(INLINE_SCHEMES).toEqual(["http:", "https:", "mailto:"]);
    expect(isInlineScheme("https:")).toBe(true);
    expect(isInlineScheme("javascript:")).toBe(false);
  });

  it("reads a scheme case-insensitively, and reports none for a relative URL", () => {
    expect(schemeOf("https://example.com")).toBe("https:");
    expect(schemeOf("HTTPS://example.com")).toBe("https:");
    expect(schemeOf("mailto:a@b.c")).toBe("mailto:");
    expect(schemeOf("javascript:alert(1)")).toBe("javascript:");
    expect(schemeOf("./note.md")).toBe("");
    expect(schemeOf("/notes/1")).toBe("");
  });

  it("opens http, https and mailto directly", () => {
    const { port, open, confirm } = fakePort();
    const activator = createLinkActivator({ ...port, defer: (run) => run() });

    activator.activate("https://example.com", "current");
    activator.activate("mailto:a@b.c", "tab");

    expect(open).toHaveBeenCalledTimes(2);
    expect(open).toHaveBeenCalledWith("https://example.com", "current");
    expect(open).toHaveBeenCalledWith("mailto:a@b.c", "tab");
    expect(confirm).not.toHaveBeenCalled();
  });

  it("routes javascript: and data: to the confirmation", () => {
    const { port, open, confirm } = fakePort(false);
    const activator = createLinkActivator({ ...port, defer: (run) => run() });

    activator.activate("javascript:alert(1)", "current");
    activator.activate("data:text/html,<script>", "current");

    expect(confirm).toHaveBeenCalledTimes(2);
    expect(confirm).toHaveBeenCalledWith({
      url: "javascript:alert(1)",
      scheme: "javascript:",
    });
    // Declined: nothing opened, nothing remembered.
    expect(open).not.toHaveBeenCalled();
    expect(activator.allowedSchemes()).toEqual([]);
  });

  it("remembers an accepted scheme for the session", () => {
    const { port, open, confirm } = fakePort(true);
    const activator = createLinkActivator({ ...port, defer: (run) => run() });

    activator.activate("omni://note/1", "current");

    return Promise.resolve().then(() => {
      expect(confirm).toHaveBeenCalledTimes(1);
      expect(open).toHaveBeenCalledWith("omni://note/1", "current");
      expect(activator.allowedSchemes()).toEqual(["omni:"]);

      // The second activation of the same scheme does not ask again.
      activator.activate("omni://note/2", "tab");
      expect(confirm).toHaveBeenCalledTimes(1);
      expect(open).toHaveBeenCalledTimes(2);
    });
  });

  it("returns silently for a URL with no scheme", () => {
    const { port, open, confirm } = fakePort();
    const activator = createLinkActivator({ ...port, defer: (run) => run() });

    activator.activate("./note.md", "current");
    activator.activate("", "current");

    expect(open).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("defers activation by 100 ms (OBS-1.14.4-LINK-011)", () => {
    expect(ACTIVATION_DELAY_MS).toBe(100);
    const { port, open } = fakePort();
    const deferred: (() => void)[] = [];
    const activator = createLinkActivator({
      ...port,
      defer: (run) => void deferred.push(run),
    });

    activator.activate("https://example.com", "current");
    // Nothing yet: the artifact gives other handlers a window to consume it.
    expect(open).not.toHaveBeenCalled();
    expect(deferred).toHaveLength(1);

    deferred[0]();
    expect(open).toHaveBeenCalledWith("https://example.com", "current");
  });

  it("defaults to the browser's own open and confirm", () => {
    // The default port is a real object; its behaviour is the browser's, so it
    // is asserted by shape rather than by calling it.
    const port = browserLinkPort();
    expect(typeof port.open).toBe("function");
    expect(typeof port.confirm).toBe("function");
  });
});

describe("finding the link under a position", () => {
  it("returns the URL and range for a link with a destination", () => {
    const state = (() => {
      harness = createHarness({
        doc: "A [link](https://example.com) here\n",
        extensions: [LANGUAGE],
      });
      return harness.state();
    })();

    const hit = linkAt(state, 5);
    expect(hit).not.toBeNull();
    if (!hit) throw new Error("expected a link under position 5");
    expect(hit.url).toBe(URL);
    expect(state.sliceDoc(hit.from, hit.to)).toBe("[link](https://example.com)");
  });

  it("returns null off a link, and for a shortcut reference with no destination", () => {
    harness = createHarness({ doc: "A [?] task\n", extensions: [LANGUAGE] });
    expect(linkAt(harness.state(), 0)).toBeNull();
    // `[?]` is a Link to the grammar but has no URL — the task layer claims it.
    expect(linkAt(harness.state(), 3)).toBeNull();
  });
});

describe("the activation extension", () => {
  /** Dispatch a click on the first element matching `selector`. */
  function click(selector: string, init: MouseEventInit = {}) {
    const element = harness?.view.contentDOM.querySelector(selector);
    if (!element) throw new Error(`no element matching ${selector}`);
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, ...init }),
    );
  }

  function mount(
    mode: "preview" | "source",
    port: LinkPort,
    doc = `A [link](${URL}) here\n`,
  ) {
    // The marks a click can land on come from the preview plugin, so preview
    // mounts install it; source mode deliberately does not (that is what makes
    // it the source surface).
    const extensions =
      mode === "preview"
        ? [LANGUAGE, markdownLivePreviewPlugin, linkActivationExtension(mode, port)]
        : [LANGUAGE, linkActivationExtension(mode, port)];
    harness = createHarness({ doc, extensions });
    return harness;
  }

  it("follows a plain click on rendered link text in preview mode", async () => {
    const { port, open } = fakePort();
    const view = mount("preview", port);
    view.focus();

    click(".cm-live-link");
    // Deferred: nothing yet.
    expect(open).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, ACTIVATION_DELAY_MS + 40));
    expect(open).toHaveBeenCalledWith(URL, "tab");
  });

  it("places the caret instead when the raw syntax is clicked", async () => {
    const { port, open } = fakePort();
    const view = mount("preview", port);
    // Caret on the line, so the brackets are revealed as syntax.
    view.focus();
    view.placeCaret(6);

    click(".cm-live-syntax");
    await new Promise((resolve) => setTimeout(resolve, ACTIVATION_DELAY_MS + 40));
    expect(open).not.toHaveBeenCalled();
  });

  it("opens a tab on a middle-click (auxclick)", async () => {
    const { port, open } = fakePort();
    const view = mount("preview", port);
    view.focus();

    const element = view.view.contentDOM.querySelector(".cm-live-link");
    element?.dispatchEvent(
      new MouseEvent("auxclick", { bubbles: true, cancelable: true, button: 1 }),
    );

    await new Promise((resolve) => setTimeout(resolve, ACTIVATION_DELAY_MS + 40));
    expect(open).toHaveBeenCalledWith(URL, "tab");
  });

  it("keeps a plain click in source mode as a caret", async () => {
    const { port, open } = fakePort();
    // The link starts the line, so `posAtDOM` lands inside it: the gate is what
    // decides, not a miss.
    const view = mount("source", port, `[link](${URL}) here\n`);
    view.focus();

    click(".cm-line");
    await new Promise((resolve) => setTimeout(resolve, ACTIVATION_DELAY_MS + 40));
    expect(open).not.toHaveBeenCalled();
  });

  it("follows a Mod+Shift click in source mode", async () => {
    const { port, open } = fakePort();
    const view = mount("source", port, `[link](${URL}) here\n`);
    view.focus();

    click(".cm-line", { ctrlKey: true, shiftKey: true });
    await new Promise((resolve) => setTimeout(resolve, ACTIVATION_DELAY_MS + 40));
    expect(open).toHaveBeenCalledWith(URL, "tab");
  });

  it("ignores a click that is not on a link at all", async () => {
    const { port, open } = fakePort();
    const view = mount("preview", port, "Plain text with no link.\n");
    view.focus();

    click(".cm-line");
    await new Promise((resolve) => setTimeout(resolve, ACTIVATION_DELAY_MS + 40));
    expect(open).not.toHaveBeenCalled();
  });
});

describe("selection guard helper (OBS-1.14.4-LINK-004)", () => {
  it("is false with no selection", () => {
    const element = document.createElement("span");
    document.body.appendChild(element);
    expect(selectionContainsTarget(element)).toBe(false);
    element.remove();
  });
});
