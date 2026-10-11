import { badgeVariants } from "../components/badge";
import { cn } from "../lib/utils";
import { DefaultSearchLink, type SearchLink } from "./search-link";

/**
 * Search block — `SearchFilterChips` (F-06).
 *
 * The Sample / Mine filter. `docs/design/system-ux.md` §2 is explicit that
 * *"Sample vs Mine is a real search filter, not only a label"* — so this block
 * renders links whose `href` carries the filter, and the app turns that into the
 * real `corpusOwnership` request field. The chips themselves are local UI state
 * that reaches the server as a contract field; nothing else is invented.
 *
 * Chips are **links**, not buttons with click handlers, for the same reason the
 * F-05 rows are: they are keyboard-operable and they work before hydration.
 * `aria-current` marks the active filter, so the state is announced and not
 * carried by colour alone (`quality/ui-qa-checklist.md` §4.4).
 *
 * Look follows the `@user` choice of 2026-10-11 (*reuse the F-05 quiet Mintlify
 * conventions*): outline pills, muted fill for the active one. The app injects
 * the link component — filter links pass `scroll={false}` so switching corpus
 * does not throw the reader back to the top of the page.
 */
export type SearchFilterOption = {
  /** Stable key for tests and React lists — not a contract field. */
  id: string;
  label: string;
  href: string;
  active: boolean;
};

export type SearchFilterChipsProps = {
  options: readonly SearchFilterOption[];
  /** Accessible name for the filter group. */
  label?: string;
  className?: string;
  linkComponent?: SearchLink;
};

export function SearchFilterChips({
  options,
  label = "Filter by corpus",
  className,
  linkComponent: Link = DefaultSearchLink,
}: SearchFilterChipsProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {options.map((option) => (
        <Link
          key={option.id}
          href={option.href}
          aria-current={option.active ? "true" : undefined}
          className={cn(
            badgeVariants({ variant: option.active ? "secondary" : "outline" }),
            "h-6 px-2.5",
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
