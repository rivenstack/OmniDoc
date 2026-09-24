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
  type Principal,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  cn,
  useSidebar,
} from "@omnidoc/ui";

export type NavUserProps = {
  /**
   * The session principal, straight from `@omnidoc/contracts`.
   *
   * `Principal` carries `actorId` and nothing else, so that is what the account
   * menu shows. F-03 deliberately did **not** keep the F-02 placeholder name: a
   * display name would be a second identity authority beside the contract. A
   * profile schema is a contract change, not a frontend decision.
   */
  principal: Principal;
  /**
   * When absent, no Sign out item renders — the menu never shows a control that
   * cannot act. In the shell this is the `signOutAction` server action.
   */
  onSignOut?: () => void;
  className?: string;
};

function UserIdentity({
  principal,
  className,
}: {
  principal: Principal;
  className?: string;
}) {
  return (
    <div
      className={cn("grid flex-1 text-start text-sm leading-tight", className)}
    >
      {/*
        `bdi` isolates the identifier (LTR-now / RTL-readiness): an actor id is
        an opaque token, so its direction must not be inferred from the
        surrounding copy nor allowed to leak into it.
      */}
      <span className="truncate font-medium">
        <bdi>{principal.actorId}</bdi>
      </span>
    </div>
  );
}

function UserAvatar({ principal }: { principal: Principal }) {
  const initial = principal.actorId.trim().charAt(0).toUpperCase() || "U";
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
export function NavUser({ principal, onSignOut, className }: NavUserProps) {
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
                aria-label={`Account: ${principal.actorId}`}
                className={cn(
                  "data-popup-open:bg-muted data-popup-open:text-foreground",
                  className,
                )}
              />
            }
          >
            <UserAvatar principal={principal} />
            <UserIdentity principal={principal} />
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
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                  <UserAvatar principal={principal} />
                  <UserIdentity principal={principal} />
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
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
