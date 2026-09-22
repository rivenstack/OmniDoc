import { FileText, Inbox, Search, Sparkles, SquarePen } from "lucide-react";
import type {
  CommandPaletteItem,
  MemberView,
  ShellNavItem,
  WorkspaceEntry,
} from "./types";

/**
 * Catalogue sample data — **Storybook only**.
 *
 * This is explicitly **not** a fixture authority. `packages/mocks` (S-03,
 * backend-authored) is the single source of corpus fixtures for the
 * application, and `apps/web` ships none (see the F-02 handoff). These literals
 * exist so the component catalogue can render every state, and they are imported
 * only by `*.stories.tsx` files — never by `src/index.ts`, so nothing here can
 * reach an application bundle.
 *
 * Values are chosen to match the architecture's required fixture themes
 * (architecture §9): mixed-case technical tokens, long titles with punctuation,
 * and an explicitly labelled public sample corpus.
 */

export const storyNavItems: ShellNavItem[] = [
  {
    id: "new-note",
    label: "New note",
    href: "/notes/new",
    icon: <SquarePen aria-hidden="true" className="size-4" />,
  },
  {
    id: "inbox",
    label: "Inbox",
    href: "/inbox",
    icon: <Inbox aria-hidden="true" className="size-4" />,
    active: true,
  },
  {
    id: "notes",
    label: "Notes",
    href: "/notes",
    icon: <FileText aria-hidden="true" className="size-4" />,
  },
  {
    id: "search",
    label: "Search",
    href: "/search",
    icon: <Search aria-hidden="true" className="size-4" />,
  },
  {
    id: "ask",
    label: "Ask",
    href: "/ask",
    icon: <Sparkles aria-hidden="true" className="size-4" />,
  },
];

/** Tab-bar subset — capture lives in its own elevated action (shell spec §3). */
export const storyTabItems: ShellNavItem[] = storyNavItems.filter(
  (item) => item.id !== "new-note",
);

export const storyPersonalWorkspace: WorkspaceEntry = {
  workspace: {
    id: "ws-personal",
    tenantId: "tenant-personal",
    name: "Personal workspace",
  },
  corpusOwnership: "mine",
};

export const storySampleWorkspace: WorkspaceEntry = {
  workspace: {
    id: "ws-sample",
    tenantId: "tenant-sample",
    name: "Demo Corpus",
  },
  corpusOwnership: "sample",
};

export const storySecondWorkspace: WorkspaceEntry = {
  workspace: {
    id: "ws-research",
    tenantId: "tenant-research",
    name: 'Research — "pgvector" & BYOK notes',
  },
  corpusOwnership: "mine",
};

export const storyMembers: MemberView[] = [
  {
    id: "member-owner",
    name: "Ada Lovelace",
    email: "ada@example.com",
    role: "owner",
  },
  {
    id: "member-2",
    name: "Grace Hopper",
    email: "grace@example.com",
    role: "member",
  },
];

export const storyPaletteItems: CommandPaletteItem[] = [
  { id: "go-inbox", label: "Go to Inbox", href: "/inbox" },
  { id: "go-notes", label: "Go to Notes", href: "/notes" },
  {
    id: "go-ask",
    label: "Ask a question",
    description: "Search your corpus and get cited answers",
  },
  {
    id: "new-note",
    label: "New note",
    description: "Open the editor with the cursor placed",
  },
  {
    id: "open-identifiers",
    label: "Open `pgvector` migration notes",
    description: "Note · mixed-case technical token",
  },
];
