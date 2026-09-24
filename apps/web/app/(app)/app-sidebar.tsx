"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
  WorkspaceSwitcher,
  type Workspace,
} from "@omnidoc/ui";
import { allDestinations, newNoteDestination } from "./nav";
import { NavMain } from "./nav-main";
import { NavUser, type ShellUser } from "./nav-user";

export type AppSidebarProps = {
  /** Server-resolved workspaces. This slice passes props — no fetching. */
  workspaces: Workspace[];
  /** Ids the server marks as the public sample corpus. */
  sampleWorkspaceIds?: string[];
  /** Render-placeholder identity until F-03 wires the session principal. */
  user: ShellUser;
  /** Wired by the F-03 session slice; omit until a session can act. */
  onSignOut?: () => void;
};

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
  workspaces,
  sampleWorkspaceIds = [],
  user,
  onSignOut,
}: AppSidebarProps) {
  const currentWorkspaceId = workspaces[0]?.id ?? "";
  const items = [newNoteDestination, ...allDestinations];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <WorkspaceSwitcher
              workspaces={workspaces}
              currentWorkspaceId={currentWorkspaceId}
              sampleWorkspaceIds={sampleWorkspaceIds}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain label="Workspace" items={items} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} onSignOut={onSignOut} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
