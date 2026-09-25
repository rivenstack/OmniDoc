import { cn } from "../lib/utils";

export type MobileTabItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
};

export type MobileTabBarProps = {
  items: MobileTabItem[];
  /** Accessible name for the `navigation` landmark. */
  label?: string;
  className?: string;
};

/** One tab row's minimum height. */
export const MOBILE_TAB_BAR_ROW_HEIGHT_CLASS = "min-h-14";

/**
 * Bottom clearance content must reserve while the bar is fixed.
 *
 * The bar is `position: fixed`, so it is out of flow and the last element of any
 * page slides underneath it without this. The value is derived from the row
 * height above plus the `border-t` pixel plus the iOS home-indicator inset, and
 * the two constants live together so a taller bar cannot silently start covering
 * content again. Cleared at `md`, where the bar is not rendered.
 */
export const MOBILE_TAB_BAR_CLEARANCE_CLASS =
  "pb-[calc(3.5rem+1px+env(safe-area-inset-bottom))] md:pb-0";

/**
 * Shell block — `MobileTabBar`.
 *
 * Fixed bottom navigation for small viewports (`< md`), where the sidebar is
 * replaced by a sheet. Capture and the four core destinations are reachable in
 * one tap with no gestures (ui-qa-checklist §1.8 / §8.1).
 *
 * Rendered as plain anchors so `packages/ui` stays framework-agnostic; the app
 * composes its own client navigation around this block if it needs it.
 */
export function MobileTabBar({
  items,
  label = "Primary",
  className,
}: MobileTabBarProps) {
  return (
    <nav
      data-slot="mobile-tab-bar"
      aria-label={label}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden",
        className,
      )}
    >
      <ul className="flex">
        {items.map((item) => (
          <li key={item.href} className="flex-1">
            <a
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-1 py-2 text-[0.7rem] transition-colors",
                MOBILE_TAB_BAR_ROW_HEIGHT_CLASS,
                item.active
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.icon && (
                <span aria-hidden="true" className="[&_svg]:size-[18px]">
                  {item.icon}
                </span>
              )}
              <span className="max-w-full truncate">{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
