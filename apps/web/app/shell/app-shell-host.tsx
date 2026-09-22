"use client";

import {
  AppShell,
  Button,
  CommandPalette,
  ContentRegion,
  MobileTabBar,
  SHELL_CONTENT_ID,
  Sidebar,
  SkipLink,
  ThemeToggle,
  TopBar,
  WorkspaceSwitcher,
  type CommandPaletteItem,
  type ShellNavItem,
} from "@omnidoc/ui";
import { SquarePen } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { captureCommand, isActiveRoute, mobileNav, primaryNav } from "./nav";
import { navIcons } from "./nav-icons";

/**
 * Shell wiring for the authenticated route group — F-02 deliverable 2.
 *
 * ## What this component owns
 *
 * Only **behaviour**: landmarks, focus order, the command-palette hotkey, the
 * new-note hook point, and route-change focus. It owns no data. It never
 * imports a provider SDK, a Java type, or `packages/mocks` (inventory §13), and
 * it does not set `dir` — `apps/web/app/layout.tsx` remains the single
 * `lang`/`dir` source (a11y §7.1).
 *
 * ## Focus contract (shell spec §2.4, a11y §2)
 *
 * - `SkipLink` is the first focusable element in the document.
 * - `Cmd/Ctrl + K` opens the palette; the palette traps focus, closes on
 *   `Escape`, and Base UI restores focus to whatever was focused before it
 *   opened.
 * - `Cmd/Ctrl + N` is the new-note **hook point**. F-04 owns the editor; until
 *   it lands the hook moves focus to the real capture control instead of doing
 *   nothing observable. It never fabricates an editor. The command palette's
 *   "New note" command routes through this same hook, so capture has one
 *   implementation behind two entry points.
 * - A route change moves focus to the content heading, falling back to the
 *   content region when a route renders no heading.
 *
 * ## Deliberate omissions
 *
 * - **Workspace data.** The switcher is mounted but receives an empty list, so
 *   it resolves to nothing (its documented guard) rather than inventing a
 *   tenant. Live memberships arrive with S-03; the top bar's `loading` state is
 *   the honest interim surface.
 * - **Mode chip.** The slot is reserved for F-08. Nothing is announced until
 *   there is a real mode to announce.
 */
export type AppShellHostProps = {
  children: ReactNode;
  /** F-04 hook point. When omitted, focus moves to the capture control. */
  onNewNote?: () => void;
};

export function AppShellHost({ children, onNewNote }: AppShellHostProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const navItems = useMemo<ShellNavItem[]>(
    () =>
      primaryNav.map((item) => ({
        ...item,
        icon: navIcons[item.id],
        active: isActiveRoute(pathname, item.href),
      })),
    [pathname],
  );

  const tabItems = useMemo<ShellNavItem[]>(
    () =>
      mobileNav.map((item) => ({
        ...item,
        icon: navIcons[item.id],
        active: isActiveRoute(pathname, item.href),
      })),
    [pathname],
  );

  const requestNewNote = useCallback(() => {
    if (onNewNote) {
      onNewNote();
      return;
    }

    // F-04 replaces this with the editor. Until then, move focus to whichever
    // capture control is actually rendered (the sidebar and the mobile tab bar
    // both provide one, and only one is visible at a given viewport).
    const controls = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="new-note-action"]'),
    );
    const visible = controls.find((node) => node.offsetParent !== null);
    visible?.querySelector<HTMLElement>("button")?.focus();
  }, [onNewNote]);

  /**
   * Capture is a *command* here, not a nav entry.
   *
   * The palette is a third surface for capture, not a third control: it is never
   * on screen next to the sidebar button, and it calls the same hook point that
   * button calls. `primaryNav` is the spine only (see `nav.tsx`), so the palette
   * no longer offers "Go to New note" — a destination that does not exist until
   * F-04 ships `/notes/new`.
   */
  const paletteItems = useMemo<CommandPaletteItem[]>(
    () => [
      {
        id: captureCommand.id,
        label: captureCommand.label,
        description: captureCommand.description,
        onSelect: requestNewNote,
      },
      ...primaryNav.map((item) => ({
        id: `nav-${item.id}`,
        label: `Go to ${item.label}`,
        href: item.href,
      })),
    ],
    [requestNewNote],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;

      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      } else if (key === "n") {
        event.preventDefault();
        requestNewNote();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestNewNote]);

  const previousPathname = useRef(pathname);
  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;

    const region = document.getElementById(SHELL_CONTENT_ID);
    const target =
      region?.querySelector<HTMLElement>('[data-slot="page-header-title"]') ??
      region;
    target?.focus();
  }, [pathname]);

  const captureAction = (
    <span data-slot="new-note-action">
      <Button size="icon" aria-label="New note" onClick={requestNewNote}>
        <SquarePen aria-hidden="true" className="size-4" />
      </Button>
    </span>
  );

  return (
    <>
      <AppShell
        sidebarCollapsed={collapsed}
        skipLink={<SkipLink />}
        topBar={
          <TopBar
            workspaceSlot={
              // Empty until S-03 supplies memberships. The switcher renders
              // nothing rather than inventing a tenant.
              <WorkspaceSwitcher workspaces={[]} />
            }
            searchTrigger={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaletteOpen(true)}
                className="max-w-sm flex-1 justify-start"
              >
                Search notes and ask a question
              </Button>
            }
            actions={<ThemeToggle />}
          />
        }
        sidebar={
          <Sidebar
            items={navItems}
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            newNoteAction={
              <span data-slot="new-note-action" className="od-inline-full">
                {collapsed ? (
                  <Button
                    size="icon"
                    className="size-9"
                    aria-label="New note"
                    onClick={requestNewNote}
                  >
                    <SquarePen aria-hidden="true" className="size-4" />
                  </Button>
                ) : (
                  <Button
                    className="h-9 justify-start ps-2 pe-2 od-inline-full"
                    onClick={requestNewNote}
                  >
                    <SquarePen aria-hidden="true" className="size-4" />
                    New note
                  </Button>
                )}
              </span>
            }
          />
        }
        mobileTabBar={
          <MobileTabBar items={tabItems} captureAction={captureAction} />
        }
      >
        <ContentRegion>{children}</ContentRegion>
      </AppShell>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        items={paletteItems}
      />
    </>
  );
}

/**
 * Rail state is per-user UI preference, not data. It is held in memory for now:
 * persisting it belongs with the real session/membership wiring (S-03/B-03), and
 * inventing a storage key before then would create a second preference
 * authority.
 */
