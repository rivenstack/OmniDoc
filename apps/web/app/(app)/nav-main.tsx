"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconChevronRight } from "@tabler/icons-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@omnidoc/ui";
import { isDestinationActive, type NavDestination } from "./nav";

export type NavMainProps = {
  /** Group heading. Hidden (not read out) when the sidebar collapses to icons. */
  label: string;
  /** Destinations in render order. Active state is derived from the route. */
  items: NavDestination[];
};

/**
 * Shell block — `NavMain` (shadcn `sidebar-07` composition).
 *
 * The upstream grouped, collapsible nav: a `SidebarGroupLabel` heading over a
 * `SidebarMenu` whose items with children become a `Collapsible` (chevron
 * rotates on `data-open`, sub-links in a `SidebarMenuSub`); items without
 * children stay plain links.
 *
 * Deviations from the upstream file, both deliberate:
 * - Upstream renders **every** item as a collapsible. Here only items that
 *   actually have children do, so no item shows a chevron that toggles nothing.
 * - Upstream's `group-data-[state=open]/collapsible:` is Radix's attribute;
 *   Base UI emits `data-open`, so the selector is `group-data-open/collapsible:`.
 *
 * `ml-auto`/`ChevronRight` are normalized to logical equivalents (`ms-auto`,
 * `rtl:-scale-x-100`) per the RTL-readiness discipline in `AGENTS.md`.
 */
export function NavMain({ label, items }: NavMainProps) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu className="gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isDestinationActive(pathname, item.href);
          const children = item.children ?? [];

          if (children.length === 0) {
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={active}
                  tooltip={item.label}
                  render={<Link href={item.href} />}
                >
                  <Icon aria-hidden="true" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          return (
            <Collapsible
              key={item.href}
              defaultOpen={active}
              className="group/collapsible"
              render={<SidebarMenuItem />}
            >
              <CollapsibleTrigger
                render={
                  <SidebarMenuButton isActive={active} tooltip={item.label} />
                }
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
                <IconChevronRight
                  aria-hidden="true"
                  className="ms-auto transition-transform duration-200 group-data-open/collapsible:rotate-90 rtl:-scale-x-100"
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {children.map((child) => (
                    <SidebarMenuSubItem key={child.href}>
                      <SidebarMenuSubButton
                        isActive={isDestinationActive(pathname, child.href)}
                        render={<Link href={child.href} />}
                      >
                        <span>{child.label}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
