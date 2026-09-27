"use client";

import { useEffect, useState } from "react";
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
 * Deviations from the upstream file, all deliberate:
 * - Upstream renders **every** item as a collapsible. Here only items that
 *   actually have children do, so no item shows a chevron that toggles nothing.
 * - Upstream's `group-data-[state=open]/collapsible:` is Radix's attribute;
 *   Base UI emits `data-open`, so the selector is `group-data-open/collapsible:`.
 * - Upstream passes `defaultOpen={item.isActive}`. Base UI warns — correctly —
 *   when the *default* of an uncontrolled `Collapsible` changes after
 *   initialization, and the default here is derived from the route, so ordinary
 *   navigation triggered it. The item below is a **controlled** `Collapsible`
 *   instead; see `NavCollapsibleItem`.
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
            <NavCollapsibleItem
              key={item.href}
              item={item}
              active={active}
              pathname={pathname}
            />
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

/**
 * One destination that has children, as a **controlled** `Collapsible`.
 *
 * `defaultOpen` is a mount-time default for an uncontrolled component. Deriving
 * it from the route meant it changed value on navigation, which Base UI reports
 * as a bug because that is what it is — the "default" is being re-injected after
 * initialization and silently dropped:
 *
 *   Base UI: A component is changing the default open state of an uncontrolled
 *   Collapsible after being initialized.
 *
 * Holding the state in React keeps the behaviour the default was reaching for
 * and makes it honest:
 * - the group holding the current destination opens (including on a deep link
 *   into a child route),
 * - a group the user closed stays closed — navigating within the same section
 *   does not re-open it, and navigating *away* never closes what they opened.
 */
function NavCollapsibleItem({
  item,
  active,
  pathname,
}: {
  item: NavDestination;
  active: boolean;
  pathname: string;
}) {
  const children = item.children ?? [];
  const [open, setOpen] = useState(active);
  const Icon = item.icon;

  // A deep link into the section, or a navigation into it, opens it. Closing it
  // is the user's call and is never undone by a route change.
  useEffect(() => {
    if (active) {
      setOpen(true);
    }
  }, [active]);

  return (
    <Collapsible
      open={open}
      onOpenChange={(next) => setOpen(next)}
      className="group/collapsible"
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger
        render={<SidebarMenuButton isActive={active} tooltip={item.label} />}
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
}
