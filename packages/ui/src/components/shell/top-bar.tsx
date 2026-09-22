import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Skeleton } from "../skeleton";

/**
 * Layout & shell — `TopBar` (D-01 component inventory §1).
 *
 * Source: `custom`. States covered: `default · loading`.
 *
 * Shell spec §2.3 places three things here: the workspace switcher at the
 * inline-start edge, the search entry (which opens the command palette rather
 * than living only in the sidebar), and the mode chip.
 *
 * This component is deliberately **pure and slot-based**, so it can render from
 * a server component: it owns the `banner` landmark, the responsive arrangement,
 * and the loading state — not the data behind the slots.
 *
 * **Mode chip slot is inert in F-02.** The slot is reserved and rendered as
 * `null` until F-08 (dual-mode chrome). Nothing here announces mode changes as a
 * status; wiring a live region before the real content exists would announce
 * nothing meaningful (a11y §1.4/§1.5, handoff: "reserve a TopBar slot only").
 */
export type TopBarProps = {
  /** Inline-start. The `WorkspaceSwitcher` goes here. */
  workspaceSlot?: ReactNode;
  /** Centre/grow region — the control that opens the command palette. */
  searchTrigger?: ReactNode;
  /** Reserved for F-08 `ModeChip`. Rendered only if a caller supplies one. */
  modeChipSlot?: ReactNode;
  /** Inline-end controls (e.g. `ThemeToggle`). */
  actions?: ReactNode;
  /** Initial shell load: static skeleton, no layout shift when it resolves. */
  loading?: boolean;
  className?: string;
};

export function TopBar({
  workspaceSlot,
  searchTrigger,
  modeChipSlot,
  actions,
  loading = false,
  className,
}: TopBarProps) {
  return (
    <header
      data-slot="top-bar"
      data-loading={loading ? "" : undefined}
      className={cn(
        "flex items-center gap-3 border-b border-border bg-od-surface-raised px-4 py-2",
        className,
      )}
    >
      <div
        data-slot="top-bar-workspace"
        className="flex min-w-0 shrink-0 items-center"
      >
        {loading ? (
          // Static skeleton: no shimmer, so reduced motion needs no special
          // case, and the shell keeps its geometry while the session resolves.
          <Skeleton className="h-8 w-44" />
        ) : (
          workspaceSlot
        )}
      </div>

      <div
        data-slot="top-bar-search"
        className="flex min-w-0 flex-1 items-center justify-center"
      >
        {loading ? <Skeleton className="h-9 w-full max-w-sm" /> : searchTrigger}
      </div>

      <div
        data-slot="top-bar-actions"
        className="flex shrink-0 items-center gap-2"
      >
        {loading ? <Skeleton className="size-9" /> : modeChipSlot}
        {loading ? null : actions}
      </div>
    </header>
  );
}
