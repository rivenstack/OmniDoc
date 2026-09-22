"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown, Layers, UserRound } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import {
  CREATE_WORKSPACE_ACTION_LABEL,
  HIDE_SAMPLE_ACTION_LABEL,
  MINE_GROUP_LABEL,
  ROLE_LABELS,
  SAMPLE_GROUP_LABEL,
  SOLO_WORKSPACE_BADGE_LABEL,
  WORKSPACE_FORBIDDEN_COPY,
} from "./copy";
import type {
  CorpusOwnership,
  MembershipRole,
  WorkspaceEntries,
} from "./types";

const menuItemClassName = cn(
  "flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 outline-none",
  "text-od-body-sm text-popover-foreground select-none",
  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
);

/**
 * Navigation & workspace — `SoloWorkspaceBadge` (D-01 inventory §2).
 *
 * Source: `custom`. States: `default`.
 *
 * REC-18 in one component: at n≈1 the chrome says so plainly instead of
 * implying an organisation. Text + icon, never colour-only (a11y §1.6).
 */
export function SoloWorkspaceBadge({ className }: { className?: string }) {
  return (
    <Badge
      data-slot="solo-workspace-badge"
      variant="outline"
      className={className}
    >
      <UserRound aria-hidden="true" />
      {SOLO_WORKSPACE_BADGE_LABEL}
    </Badge>
  );
}

/**
 * Navigation & workspace — `WorkspaceSwitcherItem` (D-01 inventory §2).
 *
 * Source: `custom`. States: `default · selected · sample-tagged`.
 *
 * Presentational row only: it renders the content, while the surrounding
 * `Menu.Item` owns interaction, focus, and `role="menuitem"`. Keeping it
 * presentational is what lets it be story-tested in isolation and keeps a single
 * definition of the row used by the switcher.
 *
 * The name is wrapped in `<bdi>` and the sample tag is text + icon, so neither
 * corpus identity nor re-ordering depends on colour or bidi guesswork
 * (states/sample-vs-mine §1, §8–9).
 */
export type WorkspaceSwitcherItemProps = Omit<
  ComponentProps<"div">,
  "children"
> & {
  name: string;
  corpusOwnership: CorpusOwnership;
  /** Rendered only when the server supplied a role (never invented). */
  role?: MembershipRole;
  selected?: boolean;
};

export function WorkspaceSwitcherItem({
  name,
  corpusOwnership,
  role,
  selected = false,
  className,
  ...props
}: WorkspaceSwitcherItemProps) {
  return (
    <div
      data-slot="workspace-switcher-item"
      data-selected={selected ? "" : undefined}
      data-corpus={corpusOwnership}
      className={cn("flex min-w-0 flex-1 items-center gap-2", className)}
      {...props}
    >
      <Avatar name={name} />

      <span className="flex min-w-0 flex-1 flex-col text-start">
        <bdi className="truncate">{name}</bdi>
        {role ? (
          <span className="text-od-micro text-od-text-tertiary">
            {ROLE_LABELS[role]}
          </span>
        ) : null}
      </span>

      {corpusOwnership === "sample" ? (
        <Badge variant="outline" data-slot="workspace-switcher-sample-tag">
          <Layers aria-hidden="true" />
          Sample
        </Badge>
      ) : null}

      {selected ? (
        <span
          data-slot="workspace-switcher-selected"
          className="flex items-center gap-1 text-od-micro text-od-text-tertiary"
        >
          <Check aria-hidden="true" className="size-3.5" />
          Current
        </span>
      ) : null}
    </div>
  );
}

/**
 * Navigation & workspace — `WorkspaceSwitcher` (D-01 inventory §2).
 *
 * Source: `shadcn+` (Base UI `Menu`). States: `single-workspace · few ·
 * sample-present · open · forbidden`.
 *
 * ## Honest chrome (REC-18 / shell spec §4)
 *
 * - **n = 1** renders a *label* with a `SoloWorkspaceBadge` — not a menu that
 *   pretends to hold more. A single-workspace principal has nothing to switch
 *   to, and offering a one-item menu is theatre.
 * - **n > 1** lists only actual memberships, grouped `Mine` / `Sample (public
 *   demo notes)` and visually separated. The sample group is never merged into
 *   "Mine" and is labelled, so demo data cannot be mistaken for personal notes
 *   (states/sample-vs-mine §1–2).
 * - **forbidden** renders the *generic* message — "You don't have access to that
 *   workspace." — which deliberately does not disclose whether the id exists
 *   (architecture §2, shell spec §4.3).
 * - No simulated scale: no org chart, no member directory, no SSO wall, no
 *   invented counts.
 *
 * ## Selector, not authority
 *
 * Selecting calls `onSelect(id)`. The client sends the id as a *selector*; the
 * server re-binds membership and answers `403` on a mismatch. The component never
 * re-derives authority from the selection, and `selectedId` is presentation only.
 *
 * ## Props, not data
 *
 * The switcher receives `WorkspaceEntries` (contract `Workspace` + a corpus
 * label) and fetches nothing. Live data arrives when S-03 lands the MSW
 * fixtures; until then the app mounts the `TopBar` loading state (see the F-02
 * Outcome).
 */
export type WorkspaceSwitcherProps = {
  workspaces: WorkspaceEntries;
  /** Presentation only — never treated as authorization. */
  selectedId?: string;
  onSelect?: (workspaceId: string) => void;
  /** Server-resolved membership role for the current principal, if known. */
  role?: MembershipRole;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** A select was rejected: show the generic forbidden message. */
  forbidden?: boolean;
  /** Removes the sample workspace from this user's view only. */
  onHideSample?: () => void;
  onCreateWorkspace?: () => void;
  className?: string;
};

export function WorkspaceSwitcher({
  workspaces,
  selectedId,
  onSelect,
  role,
  open,
  onOpenChange,
  forbidden = false,
  onHideSample,
  onCreateWorkspace,
  className,
}: WorkspaceSwitcherProps) {
  const mine = workspaces.filter((entry) => entry.corpusOwnership === "mine");
  const sample = workspaces.filter(
    (entry) => entry.corpusOwnership === "sample",
  );

  const selected =
    workspaces.find((entry) => entry.workspace.id === selectedId) ??
    workspaces[0];

  const forbiddenNote = forbidden ? (
    <p
      data-slot="workspace-switcher-forbidden"
      role="alert"
      className="mt-1.5 text-od-micro text-od-status-error"
    >
      {WORKSPACE_FORBIDDEN_COPY}
    </p>
  ) : null;

  // No memberships resolved yet. Not an inventory state: the caller mounts this
  // component once data exists, and the shell shows `TopBar loading` until then.
  if (!selected) return null;

  if (workspaces.length === 1) {
    return (
      <div
        data-slot="workspace-switcher"
        data-state="single-workspace"
        className={cn("flex min-w-0 flex-col", className)}
      >
        <div className="flex min-w-0 items-center gap-2 px-1 py-1">
          <Avatar name={selected.workspace.name} />
          <bdi className="min-w-0 truncate text-od-body-sm font-medium text-foreground">
            {selected.workspace.name}
          </bdi>
          <SoloWorkspaceBadge />
        </div>
        {forbiddenNote}
      </div>
    );
  }

  return (
    <div
      data-slot="workspace-switcher"
      data-state={sample.length > 0 ? "sample-present" : "few"}
      className={cn("flex min-w-0 flex-col", className)}
    >
      <Menu.Root open={open} onOpenChange={onOpenChange}>
        <Menu.Trigger
          nativeButton
          data-slot="workspace-switcher-trigger"
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-start",
            "transition-colors duration-[var(--od-duration-instant)] ease-standard motion-reduce:transition-none",
            "hover:bg-accent hover:text-accent-foreground",
            "data-[popup-open]:bg-accent data-[popup-open]:text-accent-foreground",
          )}
        >
          <Avatar name={selected.workspace.name} />
          <bdi className="min-w-0 truncate text-od-body-sm font-medium">
            {selected.workspace.name}
          </bdi>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner
            // Direction-aware alignment: the menu lines up with the trigger's
            // start edge under whatever direction the locale supplies.
            align="start"
            sideOffset={6}
            className="z-50 outline-none"
          >
            <Menu.Popup
              data-slot="workspace-switcher-popup"
              className={cn(
                "min-w-64 rounded-lg border border-border bg-popover p-1",
                "text-popover-foreground shadow-od-2 outline-none",
                "origin-[var(--transform-origin)]",
                "transition-[opacity,scale] duration-[var(--od-duration-fast)] ease-standard motion-reduce:transition-none",
                "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
                "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
              )}
            >
              {mine.length > 0 ? (
                <Menu.Group>
                  <Menu.GroupLabel className="px-2 py-1 text-od-micro font-medium text-od-text-tertiary">
                    {MINE_GROUP_LABEL}
                  </Menu.GroupLabel>
                  {mine.map((entry) => (
                    <Menu.Item
                      key={entry.workspace.id}
                      className={menuItemClassName}
                      onClick={() => onSelect?.(entry.workspace.id)}
                    >
                      <WorkspaceSwitcherItem
                        name={entry.workspace.name}
                        corpusOwnership={entry.corpusOwnership}
                        role={role}
                        selected={entry.workspace.id === selected.workspace.id}
                      />
                    </Menu.Item>
                  ))}
                </Menu.Group>
              ) : null}

              {sample.length > 0 ? (
                <>
                  <Menu.Separator className="my-1 h-px bg-border" />
                  <Menu.Group>
                    <Menu.GroupLabel className="px-2 py-1 text-od-micro font-medium text-od-text-tertiary">
                      {SAMPLE_GROUP_LABEL}
                    </Menu.GroupLabel>
                    {sample.map((entry) => (
                      <Menu.Item
                        key={entry.workspace.id}
                        className={menuItemClassName}
                        onClick={() => onSelect?.(entry.workspace.id)}
                      >
                        <WorkspaceSwitcherItem
                          name={entry.workspace.name}
                          corpusOwnership={entry.corpusOwnership}
                          selected={
                            entry.workspace.id === selected.workspace.id
                          }
                        />
                      </Menu.Item>
                    ))}
                  </Menu.Group>
                </>
              ) : null}

              <Menu.Separator className="my-1 h-px bg-border" />

              {sample.length > 0 && onHideSample ? (
                <Menu.Item
                  className={menuItemClassName}
                  onClick={() => onHideSample()}
                >
                  {HIDE_SAMPLE_ACTION_LABEL}
                </Menu.Item>
              ) : null}

              {onCreateWorkspace ? (
                <Menu.Item
                  className={menuItemClassName}
                  onClick={() => onCreateWorkspace()}
                >
                  {CREATE_WORKSPACE_ACTION_LABEL}
                </Menu.Item>
              ) : null}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {forbiddenNote}
    </div>
  );
}
