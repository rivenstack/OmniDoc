"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { IconButton } from "../icon-button";
import { Skeleton } from "../skeleton";
import {
  SHELL_PRIMARY_NAV_LABEL,
  SHELL_SIDEBAR_NAV_ID,
  SIDEBAR_TOGGLE_LABEL_COLLAPSE,
  SIDEBAR_TOGGLE_LABEL_EXPAND,
} from "./copy";
import type { ShellNavItem } from "./types";

/**
 * Layout & shell — `Sidebar` + `SidebarNavItem` (D-01 inventory §1).
 *
 * `Sidebar` — source: `custom`. States: `expanded · rail · loading · overflow`.
 * `SidebarNavItem` — source: `custom`. States: `default · hover · focus ·
 * active (aria-current)`.
 *
 * ## Active state is not colour-only
 *
 * The current route carries three independent signals — surface tint, font
 * weight, and `aria-current="page"` — so the state survives greyscale and screen
 * readers alike (shell spec §5, a11y §1.6).
 *
 * ## Collapsed rail
 *
 * In rail mode each item keeps its **accessible name**: the label text is
 * clipped to zero width but stays in the accessibility tree, so the name exists
 * with or without the tooltip (shell spec §5). The item also gains a tooltip
 * that opens on focus *and* hover. The tooltip is a convenience: removing it
 * would not remove the label.
 *
 * The rail toggle swaps `PanelLeftClose` (expanded → "collapse") for
 * `PanelLeftOpen` (rail → "expand") and mirrors either glyph with a
 * direction-aware `rtl:rotate-180`. That is a logical transform, not a
 * hard-coded mirrored arrow in JavaScript — the readiness mechanism the a11y
 * spec §7.4 asks for ("no `ArrowRight === next`"). No component here reads or
 * sets `dir`.
 *
 * ## Header row
 *
 * The capture action and the rail toggle share **one row** (expanded) or one
 * centred column (rail). The toggle previously sat on its own `ms-auto` row
 * below the capture button: it floated in ~48px of dead space, jumped between
 * right-aligned and centred as the rail toggled, and gave `aria-expanded` no
 * subject. It now names the region it controls with `aria-controls`.
 *
 * ## Rail geometry
 *
 * The rail is `3.25rem` wide. Every rail control shares one inline centre line
 * because *all* of them are centred the same way: the header column centres its
 * controls (`items-center`) and the nav list centres its items (`items-center`).
 * A block-level item would resolve its overflow toward `inline-end` only and
 * drift off that line, which is why the centring is explicit.
 *
 * The rail item is a `2.25rem` square (`w-9`) with `0.625rem` (`px-2.5`) inline
 * padding: `0.625 + 1rem glyph + 0.625 = 2.25rem`, so the glyph sits dead centre
 * without a `justify-center` that would fight the label's flex growth when
 * expanded. The rail's content padding is `0.375rem` (`px-1.5`), leaving a
 * `2.4375rem` content box for the `2.25rem` square.
 *
 * ## Collapse motion
 *
 * The rail swap is not a single-frame class swap. The shell animates the grid
 * track (`AppShell`) and each nav item animates its own box — `width`,
 * `padding`, and `gap` — over the same token duration, so the items narrow *with*
 * the rail instead of snapping to their rail size while the track is still wide.
 * The label keeps its `1` flex basis, so it shrinks to zero alongside the item
 * and fades via `opacity`; it is never swapped to `sr-only`, which would both
 * snap and remove the transition target. Colours are deliberately **not**
 * transitioned, so hover/active feedback stays instant.
 */

/** Item states shared by sidebar, rail, and mobile tab bar. */
function navItemClasses(active: boolean, collapsed: boolean) {
  return cn(
    "group relative flex h-9 w-full items-center gap-2 overflow-hidden rounded-md px-2",
    "text-od-body-sm font-normal text-od-text-secondary",
    "transition-[width,padding,gap] duration-[var(--od-duration-base)] ease-standard",
    "motion-reduce:transition-none",
    "hover:bg-accent hover:text-accent-foreground",
    "focus-visible:bg-accent focus-visible:text-accent-foreground",
    collapsed && "w-9 gap-0 px-2.5",
    active && "bg-accent font-medium text-accent-foreground",
  );
}

export type SidebarNavItemProps = {
  item: ShellNavItem;
  /** Rail mode: icon only, with tooltip and a clipped (not removed) label. */
  collapsed?: boolean;
  className?: string;
};

export function SidebarNavItem({
  item,
  collapsed = false,
  className,
}: SidebarNavItemProps) {
  const {
    label,
    icon,
    active = false,
    disabled = false,
    disabledReason,
  } = item;

  const body = (
    <>
      {icon ? (
        <span aria-hidden="true" className="flex size-4 shrink-0 items-center">
          {icon}
        </span>
      ) : null}
      <span
        className={cn(
          // `flex-1` (basis 0) lets the label grow to fill the expanded row and
          // shrink to zero in the rail, so it narrows with the item instead of
          // overflowing. `min-w-0` + `truncate` keep long labels ellipsizing
          // rather than pushing the row wide.
          "min-w-0 flex-1 truncate text-start",
          // The label is clipped to zero width in the rail, not removed: text
          // that is clipped but present still supplies the accessible name, so
          // the item's name survives without the tooltip (shell spec §5).
          "transition-opacity duration-[var(--od-duration-base)] ease-standard motion-reduce:transition-none",
          collapsed && "opacity-0",
        )}
      >
        {label}
      </span>
      {active ? (
        // Text alternative for the tint + weight, so the state is never
        // conveyed by appearance alone.
        <span className="sr-only">(current page)</span>
      ) : null}
    </>
  );

  if (disabled) {
    // Shell spec §5: a disabled item exists only for a real gate, and it must
    // explain itself in text rather than silently refusing focus.
    return (
      <span
        data-slot="sidebar-nav-item"
        data-disabled=""
        aria-disabled="true"
        title={disabledReason}
        className={cn(
          navItemClasses(false, collapsed),
          "cursor-not-allowed text-od-text-tertiary hover:bg-transparent hover:text-od-text-tertiary",
          className,
        )}
      >
        {body}
        {!collapsed && disabledReason ? (
          <span className="ms-auto text-od-micro text-od-text-tertiary">
            {disabledReason}
          </span>
        ) : null}
      </span>
    );
  }

  const link = (
    <a
      data-slot="sidebar-nav-item"
      data-active={active ? "" : undefined}
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(navItemClasses(active, collapsed), className)}
    >
      {body}
    </a>
  );

  if (!collapsed) return link;

  // Rail mode only: the label is already in the accessible name above, so the
  // tooltip is purely visual assistance for sighted pointer/keyboard users.
  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger render={link} />
        <Tooltip.Portal>
          <Tooltip.Positioner side="inline-end" align="center" sideOffset={8}>
            <Tooltip.Popup
              data-slot="sidebar-nav-item-tooltip"
              className={cn(
                "z-50 rounded-md border border-border bg-popover px-2 py-1",
                "text-od-micro text-popover-foreground shadow-od-2",
                "transition-opacity duration-[var(--od-duration-instant)] ease-standard motion-reduce:transition-none",
                // Base UI only animates what its state attributes select. Without
                // the `starting`/`ending` opacity the `transition-opacity` above
                // had nothing to move between and the tooltip snapped open.
                "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
              )}
            >
              {label}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

export type SidebarProps = {
  items: ShellNavItem[];
  /** Rail mode. Owned by the caller so the app can persist it. */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Primary capture action — always the first control in the sidebar. */
  newNoteAction?: ReactNode;
  /** Optional light collections section (collapsed by default when empty). */
  collections?: ReactNode;
  loading?: boolean;
  footer?: ReactNode;
  /** Accessible name for the `navigation` landmark. */
  label?: string;
  className?: string;
};

export function Sidebar({
  items,
  collapsed = false,
  onCollapsedChange,
  newNoteAction,
  collections,
  loading = false,
  footer,
  label = SHELL_PRIMARY_NAV_LABEL,
  className,
}: SidebarProps) {
  return (
    <nav
      data-slot="sidebar"
      data-collapsed={collapsed ? "" : undefined}
      aria-label={label}
      className={cn(
        "flex h-full flex-col border-e border-border bg-od-surface-raised",
        className,
      )}
    >
      {/* Capture and the rail toggle share this row. Expanded: capture grows,
          the toggle sits at the inline-end edge. Rail: the column centres both
          controls on the same inline centre line as the nav items below. */}
      <div
        className={cn(
          "flex gap-2",
          collapsed ? "flex-col items-center px-1.5 py-2" : "items-center p-2",
        )}
      >
        <div
          className={cn("flex items-center", !collapsed && "min-w-0 flex-1")}
        >
          {newNoteAction}
        </div>
        {onCollapsedChange ? (
          <IconButton
            className="size-9"
            label={
              collapsed
                ? SIDEBAR_TOGGLE_LABEL_EXPAND
                : SIDEBAR_TOGGLE_LABEL_COLLAPSE
            }
            aria-expanded={!collapsed}
            aria-controls={SHELL_SIDEBAR_NAV_ID}
            onClick={() => onCollapsedChange(!collapsed)}
          >
            {/* Two states, two glyphs — the state is visible, not only
                announced. Logical transform: under an RTL locale the sidebar
                anchors to inline-end and these rotate to keep pointing at it. */}
            {collapsed ? (
              <PanelLeftOpen
                aria-hidden="true"
                className="size-4 rtl:rotate-180"
              />
            ) : (
              <PanelLeftClose
                aria-hidden="true"
                className="size-4 rtl:rotate-180"
              />
            )}
          </IconButton>
        ) : null}
      </div>

      {/* `min-h-0` + `overflow-y-auto` is the sidebar's overflow state: with
          many collections the list scrolls here instead of truncating, and
          because the items are real focusable links the browser scrolls them
          into view on keyboard navigation (shell spec §5).

          This is also the element the rail toggle controls — hence the id. The
          `px-1.5` rail padding leaves a `2.4375rem` content box for the
          `2.25rem` nav squares (see the rail-geometry note above). */}
      <div
        id={SHELL_SIDEBAR_NAV_ID}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto py-2",
          collapsed ? "px-1.5" : "px-2",
        )}
      >
        {loading ? (
          <ul
            data-slot="sidebar-loading"
            aria-busy="true"
            className={cn("flex flex-col gap-1", collapsed && "items-center")}
          >
            {[0, 1, 2, 3, 4].map((index) => (
              <li key={index}>
                <Skeleton
                  className={cn("h-9", collapsed ? "w-9" : "w-full")}
                />
              </li>
            ))}
          </ul>
        ) : (
          <ul
            data-slot="sidebar-nav"
            // The rail centres its items (`items-center`) exactly as the header
            // column centres its controls, so every rail control shares one
            // inline centre line at any rail width.
            className={cn("flex flex-col gap-1", collapsed && "items-center")}
          >
            {items.map((item) => (
              <li key={item.id}>
                <SidebarNavItem item={item} collapsed={collapsed} />
              </li>
            ))}
          </ul>
        )}

        {collections ? (
          <div data-slot="sidebar-collections" className="mt-2">
            {collections}
          </div>
        ) : null}
      </div>

      {footer ? (
        <div
          className={cn(
            "border-t border-border py-2",
            collapsed ? "px-1.5" : "px-2",
          )}
        >
          {footer}
        </div>
      ) : null}
    </nav>
  );
}
