import {
  IconFolder,
  IconInbox,
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

const inboxDestination: NavDestination = {
  href: "/inbox",
  label: "Inbox",
  description: "Unfiled notes land here.",
  icon: IconInbox,
};
const notesDestination: NavDestination = {
  href: "/notes",
  label: "Notes",
  description: "All notes in this workspace.",
  icon: IconNotes,
};

/**
 * Shell destinations — `docs/design/system-ux.md` §1.
 *
 * These are the information/actions the shell must expose; placement (icon
 * rail, contextual panel, top bar, palette, mobile tab bar) is a build detail.
 * Routes are stub pages in this slice — capture (F-04), organize (F-05),
 * retrieve (F-06) and ask (F-07) replace their bodies later. Collections is the
 * only destination with nested children in v1.
 */
export const collectionsDestination: NavDestination = {
  href: "/collections",
  label: "Collections",
  description: "Optional light folders and tags. Not required to capture.",
  icon: IconFolder,
  children: [{ href: "/collections", label: "All collections" }],
};

export const allDestinations: NavDestination[] = [
  inboxDestination,
  notesDestination,
  collectionsDestination,
  {
    href: "/search",
    label: "Search",
    description: "Search is its own operation, separate from Ask.",
    icon: IconSearch,
  },
  {
    href: "/ask",
    label: "Ask",
    description:
      "Answers are cited. Refusal and partial are successful outcomes, not errors.",
    icon: IconMessageChatbot,
  },
];

export const newNoteHref = "/notes/new";
export const newNoteDestination: NavDestination = {
  href: newNoteHref,
  label: "New note",
  description: "Create a note with a title and body only.",
  icon: IconPlus,
};

/** Destinations shown in the mobile tab bar (capture first, no gestures). */
export const mobileTabDestinations: NavDestination[] = [
  inboxDestination,
  notesDestination,
  newNoteDestination,
  allDestinations[3],
  allDestinations[4],
];

export function isDestinationActive(pathname: string, href: string): boolean {
  return pathname === href;
}
