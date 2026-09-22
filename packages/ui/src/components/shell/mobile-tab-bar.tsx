"use client";

import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { SHELL_MOBILE_NAV_LABEL } from "./copy";
import type { ShellNavItem } from "./types";

/**
 * Layout & shell — `MobileTabBar` (D-01 component inventory §1).
 *
 * Source: `custom`. States covered: `default · active tab`.
 *
 * Shell spec §3: below `lg` the sidebar is not used; the bottom tab bar carries
 * **Inbox · Notes · Search · Ask** plus a capture action, and the app shell's
 * content column reserves space for it.
 *
 * Gesture discipline (shell spec §3, QA 1.8): every tab is a real link and the
 * capture action is a real focusable control. Nothing here is swipe-only, and
 * capture never depends on a gesture.
 *
 * Labels are always rendered — this bar is not icon-only, so it needs no
 * tooltip layer to meet the accessible-name requirement.
 */
export type MobileTabBarProps = {
  items: ShellNavItem[];
  /** Capture action, rendered in the elevated centre position. */
  captureAction?: ReactNode;
  label?: string;
  className?: string;
};

export function MobileTabBar({
  items,
  captureAction,
  label = SHELL_MOBILE_NAV_LABEL,
  className,
}: MobileTabBarProps) {
  // Capture sits in the middle of the row — the most reachable position, and it
  // is its own list item rather than being bolted onto a tab.
  const captureIndex = Math.ceil(items.length / 2);

  return (
    <nav
      data-slot="mobile-tab-bar"
      aria-label={label}
      className={cn(
        "border-t border-border bg-od-surface-raised pb-[env(safe-area-inset-bottom)]",
        className,
      )}
    >
      <ul className="flex items-stretch">
        {items.flatMap((item, index) => {
          const {
            label: itemLabel,
            icon,
            active = false,
            disabled = false,
            disabledReason,
          } = item;

          const nodes = [];

          // The capture action is its own list item, not a second child of a tab
          // item — a list item must not carry two unrelated controls.
          if (captureAction && index === captureIndex) {
            nodes.push(
              <li
                key="capture"
                data-slot="mobile-tab-bar-capture"
                className="flex flex-1 items-stretch px-1 py-1"
              >
                {captureAction}
              </li>,
            );
          }

          nodes.push(
            <li
              key={item.id}
              data-slot="mobile-tab-bar-item"
              className="flex flex-1 items-stretch"
            >
              {disabled ? (
                <span
                  data-disabled=""
                  aria-disabled="true"
                  title={disabledReason}
                  className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-od-micro text-od-text-tertiary"
                >
                  {icon}
                  <span>{itemLabel}</span>
                </span>
              ) : (
                <a
                  data-active={active ? "" : undefined}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1",
                    "text-od-micro text-od-text-secondary",
                    "transition-colors duration-[var(--od-duration-instant)] ease-standard motion-reduce:transition-none",
                    "hover:bg-accent hover:text-accent-foreground",
                    active && "bg-accent font-medium text-accent-foreground",
                  )}
                >
                  {icon ? (
                    <span
                      aria-hidden="true"
                      className="flex size-5 items-center justify-center"
                    >
                      {icon}
                    </span>
                  ) : null}
                  <span className="truncate">{itemLabel}</span>
                  {active ? (
                    <span className="sr-only">(current page)</span>
                  ) : null}
                </a>
              )}
            </li>,
          );

          return nodes;
        })}
      </ul>
    </nav>
  );
}
