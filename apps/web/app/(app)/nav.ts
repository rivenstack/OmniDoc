import {
  IconMessageChatbot,
  IconNotes,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import type { ComponentType, SVGProps } from "react";

export type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type NavDestination = {
  href: string;
  label: string;
  description: string;
  icon: NavIcon;
  /** Nested secondary links, rendered as a collapsible sub-menu. */
  children?: { href: string; label: string }[];
};

const notesDestination: NavDestination = {
  href: "/notes",
  label: "Notes",
  description: "All notes in this workspace.",
  icon: IconNotes,
};
const searchDestination: NavDestination = {
  href: "/search",
  label: "Search",
  description: "Search is its own operation, separate from Ask.",
  icon: IconSearch,
};
const askDestination: NavDestination = {
  href: "/ask",
  label: "Ask",
  description:
    "Answers are cited. Refusal and partial are successful outcomes, not errors.",
  icon: IconMessageChatbot,
};

/**
 * Shell destinations — `docs/design/system-ux.md` §1.
 *
 * These are the information/actions the shell must expose; placement (icon
 * rail, contextual panel, top bar, palette, mobile tab bar) is a build detail.
 *
 * Inbox and Collections left the shell on 2026-10-12 (`@user`; a
 * `system-ux.md` §1 contract change). With no collections/folders contract
 * there is nothing to file, so Inbox and Notes would be the same list under two
 * names — the shell does not advertise a distinction it cannot honour.
 * Collections is kept for reconsideration as `BL-26`
 * (`docs/planning/feature-backlog.md`).
 *
 * No destination has nested children any more. `children` stays on the type
 * because the collapsible sub-menu in `nav-main.tsx` remains how the shell
 * renders one should a future destination need it.
 */
export const allDestinations: NavDestination[] = [
  notesDestination,
  searchDestination,
  askDestination,
];

export const newNoteHref = "/notes/new";
export const newNoteDestination: NavDestination = {
  href: newNoteHref,
  label: "New note",
  description: "Create a note with a title and body only.",
  icon: IconPlus,
};

/**
 * Destinations shown in the mobile tab bar. The capture action is always
 * present, so a note can be started from any screen.
 */
export const mobileTabDestinations: NavDestination[] = [
  notesDestination,
  newNoteDestination,
  searchDestination,
  askDestination,
];

export function isDestinationActive(pathname: string, href: string): boolean {
  return pathname === href;
}
