"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  IconLogout,
  IconMoon,
  IconSelector,
  IconSun,
} from "@tabler/icons-react";
import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  cn,
  useSidebar,
} from "@omnidoc/ui";

/**
 * Render-placeholder identity shape for the shell.
 *
 * `@omnidoc/contracts` exposes only `Principal` (`actorId`) today; a name /
 * email-bearing profile schema does not exist yet. F-03 (session UI) replaces
 * this placeholder with contract-typed consumption — do not extend this shape
 * into a second identity authority.
 */
export type ShellUser = {
  name: string;
  email?: string;
};

export type NavUserProps = {
  user: ShellUser;
  /**
   * Wired by the F-03 session slice. When absent, no Sign out item renders —
   * the menu never shows a control that cannot act.
   */
  onSignOut?: () => void;
  className?: string;
};

function UserIdentity({
  user,
  className,
}: {
  user: ShellUser;
  className?: string;
}) {
  return (
    <div
      className={cn("grid flex-1 text-start text-sm leading-tight", className)}
    >
      <span className="truncate font-medium">
        {/* `bdi` isolates user-generated names (LTR-now / RTL-readiness). */}
        <bdi>{user.name}</bdi>
      </span>
      {user.email && (
        <span className="truncate text-xs text-muted-foreground">
          <bdi>{user.email}</bdi>
        </span>
      )}
    </div>
  );
}

function UserAvatar({ user }: { user: ShellUser }) {
  const initial = user.name.trim().charAt(0).toUpperCase() || "U";
  return (
    <Avatar className="size-8 shrink-0 rounded-lg">
      <AvatarFallback className="rounded-lg">{initial}</AvatarFallback>
    </Avatar>
  );
}

/**
 * Shell block — `NavUser` (shadcn `sidebar-07` / `sidebar-09` composition —
 * both blocks ship the same file).
 *
 * Mirrors the upstream block: an account trigger in the sidebar footer whose
 * dropdown opens `side="right"`, `align="end"` on desktop and bottom on
 * mobile, with a label header and grouped items. OmniDoc has no commerce, so
 * the upstream Upgrade/Billing items have no analog; the honest menu carries
 * the theme toggle and — once a session exists — Sign out.
 */
export function NavUser({ user, onSignOut, className }: NavUserProps) {
  const { isMobile } = useSidebar();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const themeLabel = isDark ? "Light theme" : "Dark theme";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            data-slot="nav-user-trigger"
            render={
              <SidebarMenuButton
                size="lg"
                aria-label={`Account: ${user.name}`}
                className={cn(
                  "data-popup-open:bg-muted data-popup-open:text-foreground",
                  className,
                )}
              />
            }
          >
            <UserAvatar user={user} />
            <UserIdentity user={user} />
            <IconSelector
              aria-hidden="true"
              className="ms-auto size-4 shrink-0"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                <UserAvatar user={user} />
                <UserIdentity user={user} />
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onSelect={() => setTheme(isDark ? "light" : "dark")}
              >
                {isDark ? (
                  <IconSun aria-hidden="true" />
                ) : (
                  <IconMoon aria-hidden="true" />
                )}
                {themeLabel}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            {onSignOut && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onSelect={onSignOut}>
                    <IconLogout aria-hidden="true" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
