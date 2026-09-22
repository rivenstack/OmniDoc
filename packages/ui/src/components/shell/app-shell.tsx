import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

/**
 * Layout & shell — `AppShell` (D-01 component inventory §1).
 *
 * Source: `custom (thin)`. States covered: `default` (+ `sidebarCollapsed`,
 * which changes the grid template only).
 *
 * ## Why a CSS grid
 *
 * Grid columns follow the writing direction: column 1 is the inline-start edge
 * in both LTR and RTL. That makes the whole shell layout direction-agnostic
 * without a single physical inset, and without a component that sets `dir`
 * (a11y §7.1). The column track reads the D-01 layout tokens directly —
 * `--od-layout-sidebar` (15rem) and `--od-layout-sidebar-rail` (3.25rem) — so
 * the shell cannot drift from the token layer.
 *
 * ## Height model
 *
 * The shell owns the viewport (`h-dvh`) and the content column scrolls inside
 * it, which is what makes the sidebar's own overflow rule real instead of
 * decorative. `minmax(0, 1fr)` on row 2 is required: without a `0` minimum the
 * row refuses to shrink below its content and inner scrolling never engages.
 *
 * ## The fixed mobile tab bar
 *
 * The tab bar is `position: fixed`, so it leaves the grid flow and is anchored
 * against the *viewport*, not the shell. It therefore needs both inline edges
 * pinned — `start-0 end-0`, the logical pair. A physical `inset-x-0` would be
 * wrong under RTL, and a non-existent utility (the previous `inset-inline-0`)
 * generates no rule at all: the element then shrink-wraps its content and sits
 * at its static position, leaving part of the viewport with no tab bar.
 *
 * ## Motion
 *
 * Collapsing the rail animates `grid-template-columns` rather than swapping
 * tracks in a single frame (D-01 §6.2 `base`). Under
 * `prefers-reduced-motion: reduce` the swap is instant (D-01 §6.1).
 *
 * ## Landmarks
 *
 * The shell itself is a plain `<div>` so that the `TopBar`'s `<header>` maps to
 * the `banner` landmark (a landmark is only suppressed when nested inside
 * `article`/`section`/`main`). `Sidebar`/`MobileTabBar` supply `navigation` and
 * `ContentRegion` supplies `main` (a11y §4).
 *
 * ## Slots
 *
 * The shell takes rendered slots, never data: it owns structure (regions, focus
 * order, responsive behaviour) and nothing else. See the F-02 handoff —
 * components receive data via props and never fetch.
 */
export type AppShellProps = {
  /** Render `SkipLink` here — it must be the first focusable element. */
  skipLink?: ReactNode;
  topBar?: ReactNode;
  /** Desktop-only slot. Hidden below `lg`; `MobileTabBar` takes over. */
  sidebar?: ReactNode;
  /** Fixed to the bottom edge below `lg`; hidden at `lg` and above. */
  mobileTabBar?: ReactNode;
  /** Rail (icon-only) mode. Only affects the desktop column width. */
  sidebarCollapsed?: boolean;
  children: ReactNode;
  className?: string;
};

export function AppShell({
  skipLink,
  topBar,
  sidebar,
  mobileTabBar,
  sidebarCollapsed = false,
  children,
  className,
}: AppShellProps) {
  return (
    <div
      data-slot="app-shell"
      data-sidebar-collapsed={sidebarCollapsed ? "" : undefined}
      className={cn(
        "grid h-dvh grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-od-surface-canvas text-foreground",
        // The rail swap animates the track itself (`base`, D-01 §6.2), so the
        // shell reflows over a token duration instead of in one frame. Below
        // `lg` the track does not change, so the transition is inert there.
        "transition-[grid-template-columns] duration-[var(--od-duration-base)] ease-standard motion-reduce:transition-none",
        // Desktop tracks. Both variants are static strings so Tailwind emits
        // both utilities; only one is applied at a time.
        sidebarCollapsed
          ? "lg:[grid-template-columns:var(--od-layout-sidebar-rail)_1fr]"
          : "lg:[grid-template-columns:var(--od-layout-sidebar)_1fr]",
        className,
      )}
    >
      {skipLink}

      {/* Row 1, both columns: the top bar is a full-width `banner`. */}
      <div className="col-span-full">{topBar}</div>

      {/* Row 2, column 1 (inline-start). Not rendered below `lg`. */}
      {sidebar ? (
        <div className="hidden min-h-0 overflow-hidden lg:block">{sidebar}</div>
      ) : null}

      {/* Row 2, column 2. Bottom padding clears the fixed mobile tab bar. */}
      <div className="flex min-h-0 min-w-0 flex-col overflow-y-auto pb-20 lg:pb-0">
        {children}
      </div>

      {mobileTabBar ? (
        // Logical inline anchoring: `start-0` + `end-0` resolve to the two
        // inline edges in any writing direction. `inset-x-0` is physical and
        // `inset-inline-0` is not a Tailwind utility at all.
        <div className="fixed start-0 end-0 bottom-0 z-40 lg:hidden">
          {mobileTabBar}
        </div>
      ) : null}
    </div>
  );
}
