import { FileText, Inbox, Search, Sparkles } from "lucide-react";
import type { CommandPaletteItem, ShellNavItem } from "@omnidoc/ui";

/**
 * Primary navigation — **structure, not data**.
 *
 * These are the shell spec's IA (§1) **spine**: Inbox, Notes, Search, Ask. They
 * are static routing structure (labels + hrefs), not workspace content, so they
 * are not a fixture. No note, workspace, member, or corpus value appears in
 * `apps/web`: `packages/mocks` (S-03, backend-authored) is the single fixture
 * authority for the application (F-02 handoff).
 *
 * `active` is intentionally **not** set here — the shell host derives it from
 * the current route so the highlight can never disagree with the URL.
 */

/**
 * The nav spine, in sidebar order: Inbox · Notes · Search · Ask.
 *
 * **Capture is deliberately not a member.** The shell spec's IA lists "New note"
 * first, but it is described there as the *persistent primary capture action* —
 * a distinct, always-visible control that opens the editor directly, not a
 * destination in the nav list. `AppShellHost` renders it through `Sidebar`'s
 * `newNoteAction` slot and the `MobileTabBar`'s `captureAction`, so it must not
 * also appear here:
 *
 * - In the expanded sidebar it produced a second, visually identical "New note"
 *   right under the capture button.
 * - In the rail it produced two indistinguishable pencil icons.
 * - Its `href` also pointed at `/notes/new`, a route that does not exist (F-04
 *   owns the editor), so the entry 404s.
 *
 * The mobile tab bar already excluded it for exactly this reason; the sidebar now
 * gets the same treatment by construction rather than by filtering.
 */
export const primaryNav: ShellNavItem[] = [
  {
    id: "inbox",
    label: "Inbox",
    href: "/inbox",
    icon: <Inbox aria-hidden="true" className="size-4" />,
  },
  {
    id: "notes",
    label: "Notes",
    href: "/notes",
    icon: <FileText aria-hidden="true" className="size-4" />,
  },
  {
    id: "search",
    label: "Search",
    href: "/search",
    icon: <Search aria-hidden="true" className="size-4" />,
  },
  {
    id: "ask",
    label: "Ask",
    href: "/ask",
    icon: <Sparkles aria-hidden="true" className="size-4" />,
  },
];

/**
 * Mobile tab bar (shell spec §3) — the same spine, with capture moved to its own
 * elevated action. Both navigations read one list, so they cannot drift apart.
 */
export const mobileNav: ShellNavItem[] = primaryNav;

/**
 * Capture as a **command**, not a nav item.
 *
 * The command palette is a third *surface* for capture, not a third *control*: it
 * is never rendered alongside the sidebar button, and it calls the same hook
 * point that button calls (`AppShellHost#requestNewNote`) instead of navigating.
 * One capture behaviour, one implementation — reachable from `Cmd/Ctrl+K` as well
 * as from the chrome.
 */
export const captureCommand = {
  id: "capture",
  label: "New note",
  description: "Start a new capture",
} satisfies Pick<CommandPaletteItem, "id" | "label" | "description">;

/** Marks the current route without relying on a visually-right assumption. */
export function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
