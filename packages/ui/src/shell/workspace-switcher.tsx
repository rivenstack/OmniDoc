"use client";

import type { Workspace } from "./types";
import {
  IconCheck,
  IconSelector,
  IconShieldExclamation,
} from "@tabler/icons-react";
import { Badge } from "../components/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/dropdown-menu";
import { SidebarMenuButton, useSidebar } from "../components/sidebar";
import { cn } from "../lib/utils";

/** Security contract copy — see `docs/design/system-ux.md` §2 (Tenancy). */
export const WORKSPACE_FORBIDDEN_MESSAGE =
  "You don't have access to that workspace.";

export type WorkspaceSwitcherProps = {
  /** Server-resolved memberships. The client never derives this list. */
  workspaces: Workspace[];
  /** Currently selected workspace id (a selector, never authority). */
  currentWorkspaceId: string;
  /** Ids the server marks as the public sample corpus, rendered separately. */
  sampleWorkspaceIds?: string[];
  /**
   * True when the server refused the requested selector. Renders the generic
   * denial and never reveals whether the workspace exists.
   */
  forbidden?: boolean;
  /**
   * Show the workspace name next to the mark. Set `false` in a collapsed icon
   * rail so the trigger reads as a single square mark (no clipped text).
   */
  showLabel?: boolean;
  onSelect?: (workspaceId: string) => void;
  className?: string;
};

function WorkspaceName({ name }: { name: string }) {
  // `bdi` isolates user-generated workspace names from surrounding copy
  // (LTR-now / RTL-readiness discipline).
  return <bdi className="truncate">{name}</bdi>;
}

function WorkspaceMark({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "W";
  // The mark is a filled chip, so its foreground belongs to its own background
  // rather than the row's. `DropdownMenuItem` forces every descendant to
  // `accent-foreground` while highlighted, which would print the initial in the
  // accent colour on a `primary` circle — i.e. invisible. The `!` opts out of
  // that blanket rule; upstream uses the same escape for destructive icons.
  return (
    <span
      aria-hidden="true"
      className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground!"
    >
      {initial}
    </span>
  );
}

/**
 * Shell block — `WorkspaceSwitcher`.
 *
 * A selector at the top of the sidebar. Honest at n≈1 (a single workspace
 * reads "Solo workspace", never a faked org scale); a sample workspace is
 * separated and labelled; a forbidden selector renders the generic denial from
 * `system-ux.md` §2. Data arrives via props — this slice does no fetching and
 * authors no fixtures.
 *
 * Like `NavUser`, this is a sidebar block: it reads `useSidebar` and must sit
 * inside a `SidebarProvider`.
 */
export function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
  sampleWorkspaceIds = [],
  forbidden = false,
  showLabel = true,
  onSelect,
  className,
}: WorkspaceSwitcherProps) {
  const { isMobile } = useSidebar();

  if (forbidden) {
    return (
      <div
        data-slot="workspace-switcher-forbidden"
        role="status"
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-start text-xs text-muted-foreground",
          className,
        )}
      >
        <IconShieldExclamation aria-hidden="true" className="size-4 shrink-0" />
        {showLabel && <span>{WORKSPACE_FORBIDDEN_MESSAGE}</span>}
      </div>
    );
  }

  const sampleSet = new Set(sampleWorkspaceIds);
  const mine = workspaces.filter((w) => !sampleSet.has(w.id));
  const sample = workspaces.filter((w) => sampleSet.has(w.id));
  const current = workspaces.find((w) => w.id === currentWorkspaceId);
  const solo = mine.length <= 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-slot="workspace-switcher-trigger"
        render={
          <SidebarMenuButton
            size="lg"
            aria-label={
              showLabel
                ? undefined
                : current
                  ? `Workspace: ${current.name}`
                  : "Select workspace"
            }
            className={cn(
              "data-popup-open:bg-muted data-popup-open:text-foreground",
              className,
            )}
          />
        }
      >
        <WorkspaceMark name={current?.name ?? "Workspace"} />
        <span
          className={cn(
            "grid flex-1 text-start text-sm leading-tight",
            !showLabel && "hidden",
          )}
        >
          <span className="truncate font-medium">
            {current ? (
              <WorkspaceName name={current.name} />
            ) : (
              "Select workspace"
            )}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {solo ? "Solo workspace" : `${mine.length} workspaces`}
          </span>
        </span>
        {showLabel && (
          <IconSelector
            aria-hidden="true"
            className="ms-auto size-4 shrink-0"
          />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        // Mirrors `NavUser`: the trigger sits at the sidebar's inline-start
        // edge, so the menu opens out of the sidebar rather than over the nav
        // (mobile keeps the bottom sheet behaviour).
        side={isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={4}
        className="min-w-56"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {mine.map((workspace) => (
            <WorkspaceItem
              key={workspace.id}
              workspace={workspace}
              selected={workspace.id === currentWorkspaceId}
              onSelect={onSelect}
            />
          ))}
          {mine.length === 0 && (
            <DropdownMenuItem disabled>No workspaces</DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        {sample.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-1.5">
                Sample
                <Badge variant="outline">Public demo notes</Badge>
              </DropdownMenuLabel>
              {sample.map((workspace) => (
                <WorkspaceItem
                  key={workspace.id}
                  workspace={workspace}
                  selected={workspace.id === currentWorkspaceId}
                  onSelect={onSelect}
                  sample
                />
              ))}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WorkspaceItem({
  workspace,
  selected,
  onSelect,
  sample = false,
}: {
  workspace: Workspace;
  selected: boolean;
  onSelect?: (workspaceId: string) => void;
  sample?: boolean;
}) {
  return (
    <DropdownMenuItem
      data-slot="workspace-switcher-item"
      // Base UI `Menu.Item` fires `onClick`; Radix's `onSelect` is not a prop it
      // honours, so using it here silently dropped every pick.
      onClick={() => onSelect?.(workspace.id)}
    >
      <WorkspaceMark name={workspace.name} />
      <WorkspaceName name={workspace.name} />
      {sample && <Badge variant="outline">Sample</Badge>}
      {selected && (
        <IconCheck aria-hidden="true" className="ms-auto size-4 shrink-0" />
      )}
    </DropdownMenuItem>
  );
}
