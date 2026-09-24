"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { IconMoon, IconPlus, IconSearch, IconSun } from "@tabler/icons-react";
import {
  Button,
  cn,
  CommandPalette,
  type CommandPaletteGroup,
  IconButton,
  MobileTabBar,
  type Principal,
  Separator,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  SkipLink,
  useCommandPalette,
  type Workspace,
} from "@omnidoc/ui";
import { allDestinations, mobileTabDestinations, newNoteHref } from "./nav";
import { AppSidebar } from "./app-sidebar";
import { RouteFocus } from "./route-focus";

export type AppShellProps = {
  /** Contract-typed session principal — the only identity the shell renders. */
  principal: Principal;
  /** Server-resolved memberships. The client never derives this list. */
  workspaces: Workspace[];
  /** The session is valid but membership could not be read. */
  workspacesUnavailable?: boolean;
  /** Ids the server marks as the public sample corpus. */
  sampleWorkspaceIds?: string[];
  /** Selected workspace: a preference over the server list, never a grant. */
  currentWorkspaceId: string;
  /** Server action. Ends the session and its relayed cookies. */
  onSignOut: () => Promise<void>;
  /** Server action. Verifies membership server-side before remembering a pick. */
  onSelectWorkspace: (workspaceId: string) => Promise<void>;
  children: React.ReactNode;
};

/**
 * F-02 authenticated shell — client boundary.
 *
 * The sidebar block is the shadcn `sidebar-07` composition (`./app-sidebar`,
 * `./nav-main`, `./nav-user`): one sidebar that collapses to icons, with a
 * rail, a grouped nav, and an account footer, adapted to the Mintlify token
 * layer and OmniDoc content.
 *
 * Session state (principal, memberships, selection) arrives from the server
 * layout as props — no identity is fetched or decided in the browser. The two
 * callbacks are server actions, so signing out and switching workspace both
 * happen where the cookies and the session actually live.
 *
 * The sidebar carries no search field of its own — `system-ux.md` §1 asks for
 * a way to *start* Search, and the top bar's search entry (which opens the
 * command palette) is it.
 */
export function AppShell({
  principal,
  workspaces,
  workspacesUnavailable,
  sampleWorkspaceIds,
  currentWorkspaceId,
  onSignOut,
  onSelectWorkspace,
  children,
}: AppShellProps) {
  const palette = useCommandPalette();

  return (
    <SidebarProvider>
      <SkipLink />
      <RouteFocus />
      <AppSidebar
        principal={principal}
        workspaces={workspaces}
        workspacesUnavailable={workspacesUnavailable}
        sampleWorkspaceIds={sampleWorkspaceIds}
        currentWorkspaceId={currentWorkspaceId}
        // The dropdown hands its own event to `onSelect`; the actions take no
        // arguments, so they are invoked explicitly rather than passed through.
        onSignOut={() => {
          void onSignOut();
        }}
        onSelectWorkspace={(workspaceId) => {
          void onSelectWorkspace(workspaceId);
        }}
      />
      <SidebarInset id="content" tabIndex={-1} className="min-w-0 outline-none">
        <AppTopBar onOpenSearch={palette.openPalette} />
        {children}
        <MobileTabBar
          label="Primary"
          items={mobileTabDestinations.map((destination) => ({
            href: destination.href,
            label: destination.label,
            icon: <destination.icon aria-hidden="true" />,
          }))}
        />
      </SidebarInset>
      <AppCommandPalette palette={palette} />
    </SidebarProvider>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <IconButton
      variant="ghost"
      size="icon-sm"
      label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <IconSun aria-hidden="true" />
      ) : (
        <IconMoon aria-hidden="true" />
      )}
    </IconButton>
  );
}

function SearchEntry({
  onOpenSearch,
  className,
}: {
  onOpenSearch: () => void;
  className?: string;
}) {
  return (
    <Button
      variant="outline"
      onClick={onOpenSearch}
      className={cn(
        "h-8 justify-start gap-2 px-3 font-normal text-muted-foreground",
        className,
      )}
    >
      <IconSearch data-icon="inline-start" aria-hidden="true" />
      <span className="truncate">Search</span>
      <kbd
        aria-hidden="true"
        className="ms-auto hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground sm:inline"
      >
        ⌘ K
      </kbd>
    </Button>
  );
}

function AppTopBar({ onOpenSearch }: { onOpenSearch: () => void }) {
  return (
    <header
      data-slot="top-bar"
      className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur md:px-4"
    >
      <SidebarTrigger />
      {/*
        A vertical separator defaults to `self-stretch`, which beats a definite
        `h-*` and pins the rule to the flex start. `data-vertical:self-auto`
        hands alignment back to the container (`items-center` here), so the
        20px rule sits centred in the 56px bar.

        This works because `cn` runs tailwind-merge, which drops the
        primitive's conflicting class. The generated CSS order actually puts
        `self-stretch` last, so source order does not save this — do not
        "simplify" it away.

        `me-1.5` optically evens the two gaps: the trigger's 16px glyph sits in
        a 28px hit box (6px inset), so its perceived gap is 8 + 6 = 14px, and
        the search field gets 8 + 6 = 14px.
      */}
      <Separator
        orientation="vertical"
        className="me-1.5 data-vertical:h-5 data-vertical:self-auto"
      />
      <SearchEntry
        onOpenSearch={onOpenSearch}
        className="min-w-0 flex-1 sm:max-w-xs"
      />
      <div className="ms-auto flex items-center gap-2">
        {/* Reserved for the F-08 runtime-mode / corpus chrome. Inert here. */}
        <div data-slot="mode-slot" aria-hidden="true" />
        <ThemeToggle />
        <Button
          nativeButton={false}
          render={<Link href={newNoteHref} />}
          className="hidden sm:inline-flex"
        >
          <IconPlus data-icon="inline-start" aria-hidden="true" />
          New note
        </Button>
        <IconButton
          nativeButton={false}
          render={<Link href={newNoteHref} />}
          label="New note"
          className="sm:hidden"
        >
          <IconPlus aria-hidden="true" />
        </IconButton>
      </div>
    </header>
  );
}

function AppCommandPalette({
  palette,
}: {
  palette: ReturnType<typeof useCommandPalette>;
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const groups: CommandPaletteGroup[] = [
    {
      heading: "Navigate",
      actions: allDestinations.map((destination) => ({
        id: destination.href,
        label: destination.label,
        icon: <destination.icon aria-hidden="true" />,
        onSelect: () => router.push(destination.href),
      })),
    },
    {
      heading: "Actions",
      actions: [
        {
          id: "new-note",
          label: "New note",
          icon: <IconPlus aria-hidden="true" />,
          onSelect: () => router.push(newNoteHref),
        },
        {
          id: "toggle-theme",
          label: "Toggle theme",
          icon:
            resolvedTheme === "dark" ? (
              <IconSun aria-hidden="true" />
            ) : (
              <IconMoon aria-hidden="true" />
            ),
          onSelect: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
        },
      ],
    },
  ];

  return (
    <CommandPalette
      open={palette.open}
      onOpenChange={palette.onOpenChange}
      groups={groups}
      description="Search destinations and actions."
    />
  );
}
