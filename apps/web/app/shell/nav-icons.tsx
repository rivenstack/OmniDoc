import type { ReactNode } from "react";
import { FileText, Inbox, Search, Sparkles } from "lucide-react";

/**
 * Decorative icons for the nav spine — the presentation half of `nav.ts`.
 *
 * `ShellNavItem.icon` is decorative by contract: the shell always renders the
 * text label too (`packages/ui` keeps an `sr-only` copy in rail mode), so the
 * icon is never the accessible name. Keeping the glyphs in a `.tsx` module lets
 * `nav.ts` stay JSX-free and therefore unit-testable.
 *
 * Keyed by spine id, so an entry added to `primaryNav` without an icon here
 * simply renders label-only rather than breaking.
 */
export const navIcons: Record<string, ReactNode> = {
  inbox: <Inbox aria-hidden="true" className="size-4" />,
  notes: <FileText aria-hidden="true" className="size-4" />,
  search: <Search aria-hidden="true" className="size-4" />,
  ask: <Sparkles aria-hidden="true" className="size-4" />,
};
