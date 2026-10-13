/**
 * External-link activation — the gate chain and the scheme gate
 * (F-15 Rev 2, plan Task 2.10).
 *
 * Four catalogue entries describe the *decision*, and each is a gate the
 * plausible port forgets:
 *
 * | Entry | Rule |
 * |---|---|
 * | `LINK-002` | Source mode: a plain click places the caret. Live Preview: only a click on **rendered** link text follows; clicking the raw syntax places the caret. |
 * | `LINK-003` | Source mode: a `Mod`-click's "new tab" intent is **downgraded** to the current surface unless `Shift` is held; middle-click is exempt. |
 * | `LINK-004` | Live Preview: a non-collapsed selection that contains the target blocks activation. |
 * | `LINK-005` | `Alt` and `Shift` on a plain click are reserved for text selection, not activation. |
 *
 * Then two more describe the *effect*:
 *
 * | Entry | Rule |
 * |---|---|
 * | `LINK-010` | Middle-click is first-class and always means a new tab, and the target decision ignores modifiers. |
 * | `LINK-011` | Activation is **deferred by 100 ms** so other handlers can consume the event first. |
 * | `LINK-009` | `http`/`https`/`mailto` open directly; anything else goes through a confirmation, and an accepted scheme is remembered for the session (plan §4.2 D-2: the gate runs here, in the renderer). |
 *
 * ## Adaptations this module records
 *
 * - **D-3:** the artifact's pane targets are `false | "tab" | "split" |
 *   "window"`. OmniDoc has no splits and no pop-out windows, so `split` and
 *   `window` collapse to a browser tab — {@link paneIntent} keeps the distinction
 *   so the collapse is visible rather than assumed.
 * - **`LINK-010`'s middle-click:** the artifact listens on `mousedown` for
 *   button 1. We listen on `auxclick`, the standard event for non-primary
 *   buttons, and treat the button the same way.
 *
 * Nothing here reaches the API: activation is a *host* action, so it goes
 * through a port ({@link LinkPort}) whose default is the browser's own
 * `window.open` / `window.confirm`.
 */

import { syntaxTree } from "@codemirror/language";
import type { EditorState, Extension } from "@codemirror/state";
import { EditorView, ViewPlugin } from "@codemirror/view";

/** Where a link opens. OmniDoc has two surfaces, not the artifact's four. */
export type LinkTarget = "current" | "tab";

/** Which half of the editor the click happened in. */
export type LinkMode = "preview" | "source";

/** The artifact's pane intent, before this project's adaptation (`D-3`). */
export type PaneIntent = false | "tab" | "split" | "window";

/** The parts of a pointer event the gate chain reads. */
export type LinkClickEvent = {
  readonly button: number;
  /** `Mod` — the primary modifier: Ctrl on Linux/Windows, Cmd on macOS. */
  readonly primaryModifier: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
};

/**
 * The artifact's modifier decoder (`OBS-1.14.4-LINK-001`), before adaptation.
 *
 * Middle button is checked **first** and ignores every modifier. Otherwise a
 * primary modifier is required, and the `Alt`/`Shift` combination picks the
 * intent. `Shift` alone and `Alt` alone are not link gestures.
 */
export function paneIntent(event: LinkClickEvent): PaneIntent {
  if (event.button === 1) return "tab";
  if (!event.primaryModifier) return false;
  if (event.altKey && event.shiftKey) return "window";
  if (event.altKey) return "split";
  return "tab";
}

/**
 * How this product serves the artifact's pane targets.
 *
 * `D-3` collapsed the artifact's `split` and `window` onto a browser tab because
 * OmniDoc has neither. `@user` then directed (2026-10-13) that a **plain click
 * also opens a tab**: the artifact's `false` — "navigate in the current leaf" —
 * would send the whole app to the URL and drop the note being edited, which is
 * not an action this product can offer as a link gesture.
 *
 * The artifact's intents are still decoded faithfully ({@link paneIntent}, and
 * its own test), so the decode stays a parity record; only the surface each one
 * is served by is this project's, and it is named here rather than buried in the
 * gate. A future internal-link re-open can change one value instead of
 * re-deriving the chain.
 */
export const LINK_TARGET_POLICY = {
  /** The artifact's current-leaf intent — a plain click. */
  plain: "tab",
  /** A modifier intent, including the collapsed split/window. */
  modified: "tab",
} as const satisfies Record<string, LinkTarget>;

/** The surface an intent is served by (`D-3`, then `@user` 2026-10-13). */
export function targetOf(intent: PaneIntent): LinkTarget {
  return intent === false ? LINK_TARGET_POLICY.plain : LINK_TARGET_POLICY.modified;
}

export type ActivationInput = {
  readonly mode: LinkMode;
  readonly event: LinkClickEvent;
  /** Live Preview only: did the click land on rendered link text? */
  readonly onRenderedLink: boolean;
  /** Live Preview only: does a non-collapsed selection contain the target? */
  readonly selectionContainsTarget: boolean;
};

/** What the editor should do with the click. */
export type ActivationDecision =
  /** Let CodeMirror handle it — place the caret, extend the selection, … */
  | { readonly kind: "caret" }
  /** Follow the link. */
  | { readonly kind: "activate"; readonly target: LinkTarget };

const CARET: ActivationDecision = { kind: "caret" };

/**
 * The gate chain (`LINK-002`…`LINK-005`), as one pure decision.
 *
 * The two clauses are the artifact's own click gate, in its shape:
 * `(!sourceMode || isMod) && (sourceMode || button !== 0 || isMod || (!altKey && !shiftKey))`.
 * Source mode requires a modifier; Live Preview lets a plain click through the
 * gate and filters it by what was clicked.
 */
export function decideActivation(input: ActivationInput): ActivationDecision {
  const { event, mode } = input;
  const isMod = event.primaryModifier || event.button === 1;

  const gate =
    (mode === "preview" || isMod) &&
    (mode === "source" ||
      event.button !== 0 ||
      isMod ||
      (!event.altKey && !event.shiftKey));
  if (!gate) return CARET;

  if (mode === "source") {
    // `LINK-003`: the tab intent is downgraded to the current surface unless
    // Shift is held — and middle-click is exempt, because it is a link gesture
    // in its own right. The downgraded target is `false` = the current leaf, so
    // the link still follows; it is the *surface* that changes.
    const intent = paneIntent(event);
    const downgraded =
      intent === "tab" && event.button !== 1 && !event.shiftKey ? false : intent;
    return { kind: "activate", target: targetOf(downgraded) };
  }

  // `LINK-004`: selecting text that includes the link is not a link gesture.
  if (input.selectionContainsTarget) return CARET;

  // `LINK-002`: a plain click follows only rendered link text. The raw syntax —
  // brackets, a URL, an unrendered link on the active line — places the caret.
  const plainClick = event.button === 0 && !isMod;
  if (plainClick && !input.onRenderedLink) return CARET;

  return { kind: "activate", target: targetOf(paneIntent(event)) };
}

/* ------------------------------------------------------------------ schemes */

/**
 * The schemes that open with no confirmation (`OBS-1.14.4-LINK-009`).
 *
 * `mailto` is included because the artifact's own docs use it as a link target
 * and it is an application the user chose; everything else — `javascript:`,
 * `data:`, and any custom scheme — goes through the confirmation.
 */
export const INLINE_SCHEMES: readonly string[] = ["http:", "https:", "mailto:"];

/** The URL's scheme, lower-cased, including the colon; `""` when there is none. */
export function schemeOf(url: string): string {
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(url.trim());
  return match ? `${match[1].toLowerCase()}:` : "";
}

/** True for the schemes that open directly. */
export function isInlineScheme(scheme: string): boolean {
  return INLINE_SCHEMES.includes(scheme);
}

/* -------------------------------------------------------------------- port */

/** What the confirmation is asked about. */
export type LinkConfirmRequest = {
  readonly url: string;
  readonly scheme: string;
};

/**
 * The host side of activation.
 *
 * The default is the browser's own `window.open` / `window.confirm`; a host may
 * inject a real modal instead, which is what plan §4.2 D-2 anticipates.
 */
export type LinkPort = {
  readonly open: (url: string, target: LinkTarget) => void;
  /** Resolves `true` when the user accepts; cancel must be the default. */
  readonly confirm: (request: LinkConfirmRequest) => Promise<boolean>;
};

/** The default port: `window.open`, with a `window.confirm` gate. */
export function browserLinkPort(): LinkPort {
  return {
    open: (url, target) => {
      window.open(
        url,
        target === "tab" ? "_blank" : "_self",
        "noopener,noreferrer",
      );
    },
    confirm: ({ scheme }) =>
      Promise.resolve(
        window.confirm(
          "Open external link?\n\n" +
            "This link will open an external application outside of OmniDoc. " +
            "Only proceed if you trust the source of this link.\n\n" +
            `Always open ${scheme}// links?`,
        ),
      ),
  };
}

/** How long activation waits (`OBS-1.14.4-LINK-011`). */
export const ACTIVATION_DELAY_MS = 100;

export type LinkActivatorDeps = LinkPort & {
  /** Injectable for tests; defaults to a {@link ACTIVATION_DELAY_MS} timeout. */
  readonly defer?: (run: () => void) => void;
};

export type LinkActivator = {
  /**
   * Run the scheme gate for one activation.
   *
   * A schemeless URL returns **silently** (`LINK-009`: the artifact's main
   * process ignores "no scheme, the app-internal scheme, or about"), an inline
   * or already-allowed scheme opens after the 100 ms deferral, and anything
   * else asks first.
   */
  activate(url: string, target: LinkTarget): void;
  /** Remember a scheme for the rest of the session (`LINK-009`). */
  allowScheme(scheme: string): void;
  allowedSchemes(): readonly string[];
};

/** Create an activator. One per editor view: the allowlist is per session. */
export function createLinkActivator(deps: LinkActivatorDeps): LinkActivator {
  const defer =
    deps.defer ?? ((run: () => void) => void setTimeout(run, ACTIVATION_DELAY_MS));
  const allowed = new Set<string>();

  return {
    activate(url, target) {
      const scheme = schemeOf(url);
      if (scheme === "") return;
      if (isInlineScheme(scheme) || allowed.has(scheme)) {
        defer(() => deps.open(url, target));
        return;
      }
      void deps.confirm({ url, scheme }).then((accepted) => {
        if (!accepted) return;
        allowed.add(scheme);
        deps.open(url, target);
      });
    },
    allowScheme(scheme) {
      allowed.add(scheme.toLowerCase());
    },
    allowedSchemes: () => [...allowed],
  };
}

/* --------------------------------------------------------------- the target */

/** A link found under a document position. */
export type LinkHit = {
  readonly url: string;
  readonly from: number;
  readonly to: number;
};

/**
 * The link at `pos`, with the URL it points at.
 *
 * `null` for anything that is not a link with a destination — including a
 * *shortcut reference* like `[?]`, which the grammar calls a link but the
 * artifact treats as a task marker (the task layer claims those first).
 */
export function linkAt(state: EditorState, pos: number): LinkHit | null {
  let found: LinkHit | null = null;

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name !== "Link") return;
      if (pos < node.from || pos > node.to) return;
      const url = urlOf(state, node.from, node.to);
      if (!url) return;
      // Keep the innermost match: a link inside a link is still the inner one.
      found = { url, from: node.from, to: node.to };
    },
  });

  return found;
}

/** The destination of the `Link` spanning `[from, to)`, or `null`. */
function urlOf(state: EditorState, from: number, to: number): string | null {
  let url: string | null = null;
  syntaxTree(state).iterate({
    from,
    to,
    enter: (node) => {
      if (node.name !== "URL" || node.from < from || node.to > to) return;
      url = state.sliceDoc(node.from, node.to);
    },
  });
  return url;
}

/** True when a non-collapsed DOM selection sits inside `element` (`LINK-004`). */
export function selectionContainsTarget(element: Element): boolean {
  const selection = typeof window === "undefined" ? null : window.getSelection();
  if (!selection || selection.isCollapsed) return false;
  const { anchorNode, focusNode } = selection;
  return (
    (anchorNode !== null && element.contains(anchorNode)) ||
    (focusNode !== null && element.contains(focusNode))
  );
}

/* --------------------------------------------------------------- the plugin */

/**
 * The activation handler, as a CodeMirror extension.
 *
 * Installed for **both** modes: the artifact's click gate has a Source-mode half
 * (`LINK-002`, `LINK-003`), and OmniDoc's source surface is Text mode, where the
 * preview — and so the rendered link marks — is absent but the same rule still
 * decides what a click means.
 */
export function linkActivationExtension(
  mode: LinkMode,
  port: LinkPort = browserLinkPort(),
): Extension {
  return ViewPlugin.fromClass(
    class {
      private readonly activator: LinkActivator;
      private alive = true;

      constructor(private readonly view: EditorView) {
        this.activator = createLinkActivator(port);
      }

      handle(event: MouseEvent) {
        if (!this.alive) return;
        const element = event.target as Element | null;
        if (!element) return;

        const hit = linkAt(this.view.state, this.view.posAtDOM(element));
        if (!hit) return;

        const decision = decideActivation({
          mode,
          event: {
            button: event.button,
            primaryModifier: event.ctrlKey || event.metaKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
          },
          onRenderedLink: element.closest(".cm-live-link") !== null,
          selectionContainsTarget: selectionContainsTarget(element),
        });
        if (decision.kind === "caret") return;

        // The event is consumed only when the link is actually followed;
        // otherwise CodeMirror's own handling must still place the caret.
        event.preventDefault();
        this.activator.activate(hit.url, decision.target);
      }

      destroy() {
        this.alive = false;
      }
    },
    {
      eventHandlers: {
        click(this: { handle: (event: MouseEvent) => void }, event: MouseEvent) {
          this.handle(event);
        },
        auxclick(this: { handle: (event: MouseEvent) => void }, event: MouseEvent) {
          this.handle(event);
        },
      },
    },
  );
}
