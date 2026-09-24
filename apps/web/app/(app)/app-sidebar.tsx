"use client";

import { IconAlertTriangle } from "@tabler/icons-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
  WorkspaceSwitcher,
  type Principal,
  type Workspace,
} from "@omnidoc/ui";
import { allDestinations, newNoteDestination } from "./nav";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

export type AppSidebarProps = {
  /** Contract-typed session principal. */
  principal: Principal;
  /** Server-resolved memberships. The client never derives this list. */
  workspaces: Workspace[];
  /** True when the session is valid but membership could not be read. */
  workspacesUnavailable?: boolean;
  /** Ids the server marks as the public sample corpus. */
  sampleWorkspaceIds?: string[];
  /** Selected workspace id (a selector, never authority). */
  currentWorkspaceId: string;
  /** Server action. Signs out and returns to the unauthenticated entry. */
  onSignOut: () => void;
  /** Server action. Remembered only after the server re-checks membership. */
  onSelectWorkspace: (workspaceId: string) => void;
};

/**
 * Sidebar header — membership could not be read.
 *
 * Mirrors the switcher block's own muted status row rather than inventing a new
 * pattern, and deliberately offers no chooser: there is nothing truthful to
 * list. The session itself is fine, so the shell stays usable.
 */
function WorkspaceUnavailable() {
  return (
    <div
      data-slot="workspace-switcher-unavailable"
      role="status"
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-start text-xs text-muted-foreground"
    >
      <IconAlertTriangle aria-hidden="true" className="size-4 shrink-0" />
      <span className="truncate">Workspaces unavailable</span>
    </div>
  );
}

/**
 * Shell block — `AppSidebar` (shadcn `sidebar-07` composition).
 *
 * A single `Sidebar collapsible="icon"`: header, grouped nav, footer, and a
 * `SidebarRail` on the inner edge. Collapsing (rail, `Cmd/Ctrl+B`, or the top
 * bar trigger) narrows it to the icon width — group headings and sub-menus
 * drop out, icons stay, and every button carries its label in a tooltip.
 *
 * Content mapping (logged in `docs/design/now.md`): the upstream brand/team
 * block is the workspace switcher (the project-owned `WorkspaceSwitcher`
 * block, not a second copy of it); the upstream nav groups are the OmniDoc
 * destinations; the footer is the account dropdown.
 *
 * Deviations from the upstream block, both deliberate:
 * - Upstream's second group (`NavProjects`) has no honest analog in this
 *   slice. It is a list of user-owned containers with per-row View/Share/
 *   Delete actions; no such data or actions exist yet (`@omnidoc/contracts`
 *   carries no collection shape, and F-05 organize owns that surface).
 *   Rendering it would mean inventing fixtures and menu items that cannot
 *   act, so it is omitted rather than faked.
 * - Upstream's `page.tsx` demo (breadcrumb header over placeholder tiles) is
 *   demo content, not the sidebar block. The shell keeps its own top bar and
 *   `ContentRegion` (`docs/design/now.md`, F-02 references).
 */
export function AppSidebar({
  principal,
  workspaces,
  workspacesUnavailable = false,
  sampleWorkspaceIds = [],
  currentWorkspaceId,
  onSignOut,
  onSelectWorkspace,
}: AppSidebarProps) {
  const items = [newNoteDestination, ...allDestinations];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {workspacesUnavailable ? (
              <WorkspaceUnavailable />
            ) : (
              <WorkspaceSwitcher
                workspaces={workspaces}
                currentWorkspaceId={currentWorkspaceId}
                sampleWorkspaceIds={sampleWorkspaceIds}
                onSelect={onSelectWorkspace}
              />
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain label="Workspace" items={items} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser principal={principal} onSignOut={onSignOut} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
