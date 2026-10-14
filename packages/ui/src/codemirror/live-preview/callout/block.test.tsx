// The rendered callout — F-15 Rev 2, plan Task 3.2.
//
// Acceptance (plan §5 Task 3.2): "13 canonical types with `important` canonical;
// fold markers `+`/`-` and chevron toggles DOM only (document unchanged —
// asserted); ... nesting", plus the menu's shape (two items, the second a
// submenu). The entries are `OBS-1.14.4-CALLOUT-001` (type table), `-002`
// (title), `-003` (fold, DOM only), `-005` (menu) and `-010` (nesting).

import { Text } from "@codemirror/state";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { describe, expect, it, vi } from "vitest";
import { CalloutBlock } from "./block";
import { CALLOUT_ICONS } from "./icons";
import { buildCalloutNode, type CalloutHandlers, type CalloutNode } from "./model";
import { scanCallouts } from "./parse";
import { CALLOUT_TYPES, CANONICAL_CALLOUT_TYPES, NOTE_CALLOUT_TYPE, resolveCalloutType } from "./types";
import { CALLOUT_PALETTE_TYPES, CalloutTypePalette } from "./palette";

function doc(text: string): Text {
  return Text.of(text.split("\n"));
}

function must<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("expected a value");
  return value;
}

/** The render model for the first callout in `text`. */
function nodeFor(text: string): CalloutNode {
  const source = doc(text);
  const callouts = scanCallouts(source);
  return buildCalloutNode(source, callouts[0], callouts);
}

function stubHandlers(): CalloutHandlers {
  return { reveal: vi.fn(), edit: vi.fn(), pickType: vi.fn(), remove: vi.fn() };
}

function mount(node: CalloutNode, handlers: CalloutHandlers, editable = true) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root: Root = createRoot(host);
  flushSync(() => {
    root.render(<CalloutBlock node={node} editable={editable} handlers={handlers} />);
  });
  return {
    host,
    unmount: () => {
      flushSync(() => root.unmount());
      host.remove();
    },
  };
}

describe("the type table (OBS-1.14.4-CALLOUT-001)", () => {
  it("has exactly 13 canonical types, with `important` among them", () => {
    expect(CANONICAL_CALLOUT_TYPES).toHaveLength(13);
    expect(CANONICAL_CALLOUT_TYPES).toContain("important");
    // The help page calls `important` a `tip` alias; the artifact does not.
    expect(resolveCalloutType("important").id).toBe("important");
    expect(CANONICAL_CALLOUT_TYPES).toContain("tip");
  });

  it("resolves aliases onto their canonical type", () => {
    expect(resolveCalloutType("abstract").id).toBe("summary");
    expect(resolveCalloutType("tldr").id).toBe("summary");
    expect(resolveCalloutType("hint").id).toBe("tip");
    expect(resolveCalloutType("check").id).toBe("success");
    expect(resolveCalloutType("done").id).toBe("success");
    expect(resolveCalloutType("caution").id).toBe("warning");
    expect(resolveCalloutType("missing").id).toBe("fail");
    expect(resolveCalloutType("danger").id).toBe("error");
    expect(resolveCalloutType("cite").id).toBe("quote");
  });

  it("falls back to the base `note` rule for an unknown type", () => {
    expect(resolveCalloutType("no-such-type")).toBe(NOTE_CALLOUT_TYPE);
    expect(resolveCalloutType("note")).toBe(NOTE_CALLOUT_TYPE);
  });

  it("maps every type to a real Tabler icon component", () => {
    // Tabler icons are `forwardRef` components, so they are objects rather than
    // plain functions — presence, not `typeof`, is what matters.
    for (const spec of CALLOUT_TYPES) {
      expect(CALLOUT_ICONS[spec.icon as keyof typeof CALLOUT_ICONS], spec.id).toBeTruthy();
    }
    expect(CALLOUT_ICONS[NOTE_CALLOUT_TYPE.icon as keyof typeof CALLOUT_ICONS]).toBeTruthy();
  });

  it("lists the base type plus every canonical type in the palette", () => {
    expect(CALLOUT_PALETTE_TYPES[0]).toBe("note");
    for (const id of CANONICAL_CALLOUT_TYPES) {
      expect(CALLOUT_PALETTE_TYPES, id).toContain(id);
    }
    expect(new Set(CALLOUT_PALETTE_TYPES).size).toBe(CALLOUT_PALETTE_TYPES.length);
  });
});

describe("rendering the card (OBS-1.14.4-CALLOUT-002, -003)", () => {
  it("renders the title, a Tabler icon and the body text", () => {
    const handlers = stubHandlers();
    const mounted = mount(nodeFor("> [!tip] A smart tip\n> Body text.\n"), handlers);

    expect(must(mounted.host.querySelector(".cm-live-callout-title-text")).textContent).toBe(
      "A smart tip",
    );
    // A real Tabler icon: an `<svg>` with the icon's own class.
    expect(mounted.host.querySelector("svg.cm-live-callout-icon")).toBeTruthy();
    expect(must(mounted.host.querySelector(".cm-live-callout-content")).textContent).toContain(
      "Body text.",
    );
    mounted.unmount();
  });

  it("derives the title from the type when the marker line has none", () => {
    const mounted = mount(nodeFor("> [!warning]\n> Body only.\n"), stubHandlers());
    expect(must(mounted.host.querySelector(".cm-live-callout-title-text")).textContent).toBe(
      "Warning",
    );
    mounted.unmount();
  });

  it("keeps `data-callout` as written so an unknown type is not rewritten", () => {
    const mounted = mount(nodeFor("> [!my-weird-type] T\n> Body\n"), stubHandlers());
    const root = must(mounted.host.querySelector(".cm-live-callout")) as HTMLElement;
    expect(root.dataset.callout).toBe("my-weird-type");
    mounted.unmount();
  });

  it("writes the fold marker to a data attribute with the three legal values", () => {
    for (const [line, expected] of [
      ["> [!note]+ Fold", "+"],
      ["> [!note]- Fold", "-"],
      ["> [!note] Plain", ""],
    ] as const) {
      const mounted = mount(nodeFor(`${line}\n> Body\n`), stubHandlers());
      const root = must(mounted.host.querySelector(".cm-live-callout")) as HTMLElement;
      expect(root.dataset.calloutFold).toBe(expected);
      mounted.unmount();
    }
  });

  it("only offers fold UI for `+` and `-`, collapsed initially for `-`", () => {
    const plain = mount(nodeFor("> [!note] Plain\n> Body\n"), stubHandlers());
    expect(plain.host.querySelector(".cm-live-callout-fold")).toBeNull();
    plain.unmount();

    const expanded = mount(nodeFor("> [!note]+ Fold\n> Body\n"), stubHandlers());
    expect(
      must(expanded.host.querySelector(".cm-live-callout-fold")).getAttribute("aria-expanded"),
    ).toBe("true");
    expanded.unmount();

    const collapsed = mount(nodeFor("> [!note]- Fold\n> Body\n"), stubHandlers());
    expect(
      must(collapsed.host.querySelector(".cm-live-callout")).classList.contains("is-collapsed"),
    ).toBe(true);
    expect((must(collapsed.host.querySelector(".cm-live-callout-content")) as HTMLElement).hidden).toBe(
      true,
    );
    collapsed.unmount();
  });
});

describe("fold is DOM-only (OBS-1.14.4-CALLOUT-003)", () => {
  it("toggles the collapsed class without calling any handler", async () => {
    const handlers = stubHandlers();
    const mounted = mount(nodeFor("> [!note]- Fold\n> Body\n"), handlers);
    const root = must(mounted.host.querySelector(".cm-live-callout"));
    const button = must(mounted.host.querySelector(".cm-live-callout-fold"));

    await act(async () => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(root.classList.contains("is-collapsed")).toBe(false);
    expect(
      (must(mounted.host.querySelector(".cm-live-callout-content")) as HTMLElement).hidden,
    ).toBe(false);
    // No document mutation of any kind.
    expect(handlers.reveal).not.toHaveBeenCalled();
    expect(handlers.edit).not.toHaveBeenCalled();
    expect(handlers.pickType).not.toHaveBeenCalled();
    expect(handlers.remove).not.toHaveBeenCalled();
    mounted.unmount();
  });

  it("reveals the raw range when the body is clicked (OBS-1.14.4-CALLOUT-004)", async () => {
    const handlers = stubHandlers();
    const node = nodeFor("> [!note] T\n> Body\n");
    const mounted = mount(node, handlers);

    await act(async () => {
      must(mounted.host.querySelector(".cm-live-callout-content")).dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });

    expect(handlers.reveal).toHaveBeenCalledWith(node);
    mounted.unmount();
  });

  it("wires no interaction for a locked note", async () => {
    const handlers = stubHandlers();
    const mounted = mount(nodeFor("> [!note]- Fold\n> Body\n"), handlers, false);
    const root = must(mounted.host.querySelector(".cm-live-callout"));

    await act(async () => {
      must(mounted.host.querySelector(".cm-live-callout-content")).dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });

    // No reveal, and the card stays collapsed.
    expect(handlers.reveal).not.toHaveBeenCalled();
    expect(root.classList.contains("is-collapsed")).toBe(true);
    mounted.unmount();
  });
});

describe("the context menu (OBS-1.14.4-CALLOUT-005)", () => {
  it("opens on right-click with Edit and a `Callout type` submenu", async () => {
    const mounted = mount(nodeFor("> [!tip] T\n> Body\n"), stubHandlers());

    await act(async () => {
      must(mounted.host.querySelector(".cm-live-callout")).dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 12, clientY: 34 }),
      );
    });

    // Portalled to the body, not the widget — an editor-scoped menu would grow
    // the editor's scroll container.
    const popup = document.body.querySelector('[data-slot="context-menu-content"]');
    expect(popup).toBeTruthy();
    expect(mounted.host.querySelector('[data-slot="context-menu-content"]')).toBeNull();
    const text = must(popup).textContent ?? "";
    expect(text).toContain("Edit");
    expect(text).toContain("Callout type");
    mounted.unmount();
  });

  it("reports `Edit` through the handlers", async () => {
    const handlers = stubHandlers();
    const node = nodeFor("> [!tip] T\n> Body\n");
    const mounted = mount(node, handlers);

    await act(async () => {
      must(mounted.host.querySelector(".cm-live-callout")).dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, cancelable: true }),
      );
    });
    const edit = [...document.body.querySelectorAll('[data-slot="dropdown-menu-item"]')].find(
      (item) => item.textContent === "Edit",
    );
    await act(async () => {
      must(edit).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(handlers.edit).toHaveBeenCalledWith(node);
    mounted.unmount();
  });
});

describe("nesting (OBS-1.14.4-CALLOUT-010)", () => {
  it("renders a nested callout inside its parent, each with its own icon", () => {
    const node = nodeFor("> [!quote] Outer\n> > [!tip]+ Inner\n> > Inner body.\n");
    const mounted = mount(node, stubHandlers());

    expect(mounted.host.querySelectorAll(".cm-live-callout")).toHaveLength(2);
    expect(mounted.host.querySelectorAll("svg.cm-live-callout-icon")).toHaveLength(2);
    expect(must(mounted.host.firstElementChild).querySelector(".cm-live-callout .cm-live-callout")).toBeTruthy();
    expect(mounted.host.textContent).toContain("Inner body.");
    mounted.unmount();
  });
});

describe("the type palette", () => {
  it("lists every type and reports the chosen one", async () => {
    const onPick = vi.fn();
    const onOpenChange = vi.fn();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    flushSync(() => {
      root.render(<CalloutTypePalette open onOpenChange={onOpenChange} onPick={onPick} />);
    });

    const item = [...document.body.querySelectorAll("[data-slot='command-item']")].find(
      (entry) => entry.textContent?.includes("Warning"),
    );
    await act(async () => {
      must(item).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(onPick).toHaveBeenCalledWith("warning");
    flushSync(() => root.unmount());
    host.remove();
  });
});
