"use client";

/**
 * The rendered callout (F-15 Rev 2, plan Task 3.2).
 *
 * `OBS-1.14.4-CALLOUT-004` replaces the whole callout with **one** widget; this
 * is what that widget draws. It is a React component because three of its parts
 * are project components rather than hand-built DOM:
 *
 * - the icon is a **Tabler** icon (`D-6`),
 * - the menu is the project's **shadcn context menu**, portalled to the body, and
 *   its second item is the nested "Callout type" submenu (`-005`),
 * - "Other…" opens the project's **command palette** instead of a free-text box.
 *
 * The card element *is* the context menu's trigger, so Base UI opens the menu at
 * the pointer itself — no `contextmenu` handler of ours, and therefore none of
 * the hover-state problems a hand-rolled trigger causes.
 *
 * The two interactions the catalogue is explicit about:
 *
 * - **The fold is DOM-only** (`-003`). Clicking the chevron (or the title) flips
 *   React state; no transaction ever rewrites the source.
 * - **A click on the body reveals the raw range** (`-004`), which is a real
 *   selection change — that is the point.
 */

import * as React from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "../../../components/context-menu";
import { calloutIcon } from "./icons";
import type { CalloutHandlers, CalloutNode } from "./model";
import { calloutMenuItems } from "./menu";
import { CalloutTypePalette } from "./palette";
import { resolveCalloutType } from "./types";

export type CalloutBlockProps = {
  readonly node: CalloutNode;
  /** A locked note renders the callout but wires no interaction. */
  readonly editable: boolean;
  readonly handlers: CalloutHandlers;
};

/** One callout card, nested callouts included. */
export function CalloutBlock({ node, editable, handlers }: CalloutBlockProps) {
  const Icon = calloutIcon(resolveCalloutType(node.type).icon);
  const foldable = node.fold === "+" || node.fold === "-";

  // `-003`: the collapsed state is React state, and nothing else.
  const [collapsed, setCollapsed] = React.useState(node.fold === "-");
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  // `-005`: the menu's checked item is compared against the **raw** source text,
  // so the radio group's value is empty when the raw type matches no item.
  const items = calloutMenuItems(node.rawType);
  const checked = items.find((item) => item.checked)?.type ?? "";

  const toggleFold = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (foldable) setCollapsed((value) => !value);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger
        className={`cm-live-callout${collapsed ? " is-collapsed" : ""}`}
        data-callout={node.type}
        data-callout-fold={node.fold}
        role="note"
      >
        <div
          className="cm-live-callout-title"
          onMouseDown={(event) => event.preventDefault()}
          onClick={toggleFold}
        >
          <Icon className="cm-live-callout-icon size-4" aria-hidden />
          <span className="cm-live-callout-title-text">{node.title}</span>
          {foldable ? (
            <button
              type="button"
              className="cm-live-callout-fold"
              aria-expanded={!collapsed}
              aria-label="Toggle callout"
              onMouseDown={(event) => event.preventDefault()}
              onClick={toggleFold}
            >
              <svg
                viewBox="0 0 24 24"
                width={14}
                height={14}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          ) : null}
        </div>

        <div
          className="cm-live-callout-content"
          hidden={collapsed}
          onClick={() => {
            if (editable) handlers.reveal(node);
          }}
        >
          {node.blocks.map((block) =>
            block.kind === "paragraph" ? (
              <p key={block.key} className="cm-live-callout-paragraph">
                {block.text}
              </p>
            ) : (
              <CalloutBlock
                key={block.key}
                node={block.callout}
                editable={editable}
                handlers={handlers}
              />
            ),
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={() => handlers.edit(node)}>
          Edit
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Callout type</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuRadioGroup
              value={checked}
              onValueChange={(value: unknown) =>
                handlers.pickType(node, String(value))
              }
            >
              {items.map((item) => (
                <ContextMenuRadioItem key={item.type} value={item.type}>
                  {item.label}
                </ContextMenuRadioItem>
              ))}
            </ContextMenuRadioGroup>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => setPaletteOpen(true)}>
              Other…
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => handlers.remove(node)}>
              None
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>

      <CalloutTypePalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onPick={(type) => handlers.pickType(node, type)}
      />
    </ContextMenu>
  );
}
