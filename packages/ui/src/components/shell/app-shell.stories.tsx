import type { Meta, StoryObj } from "@storybook/react-vite";
import { SquarePen } from "lucide-react";
import { useState } from "react";
import { AppShell } from "./app-shell";
import { Button } from "../button";
import { ContentRegion } from "./content-region";
import { MobileTabBar } from "./mobile-tab-bar";
import { PageHeader } from "./page-header";
import { Sidebar } from "./sidebar";
import { SkipLink } from "./skip-link";
import { ThemeToggle } from "./theme-toggle";
import { TopBar } from "./top-bar";
import { WorkspaceSwitcher } from "./workspace-switcher";
import {
  storyNavItems,
  storyPersonalWorkspace,
  storySampleWorkspace,
  storyTabItems,
} from "./shell.story-data";

/**
 * Inventory §1 · state: `default` (plus the `sidebarCollapsed` grid variant).
 */
const meta = {
  title: "Shell/AppShell",
  component: AppShell,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Composed shell: skip link first, then `banner` (top bar), `navigation` (sidebar at `lg`, tab bar below), and `main`. The layout is a CSS grid, so column 1 is the inline-start edge in any writing direction — there is no physical inset anywhere and no component sets `dir`. `PageHeader` deliberately renders a `<div>`, not a `<header>`, so the shell owns exactly one `banner` landmark.",
      },
    },
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  // The render composes the whole shell, so `children` is supplied there; the
  // arg exists only to satisfy the component's required prop type.
  args: { children: null },
  render: () => <Shell />,
};

export const SidebarCollapsed: Story = {
  args: { children: null },
  render: () => <Shell initialCollapsed />,
};

function Shell({ initialCollapsed = false }: { initialCollapsed?: boolean }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  return (
    <AppShell
      sidebarCollapsed={collapsed}
      skipLink={<SkipLink />}
      topBar={
        <TopBar
          workspaceSlot={
            <WorkspaceSwitcher
              workspaces={[storyPersonalWorkspace, storySampleWorkspace]}
              selectedId={storyPersonalWorkspace.workspace.id}
            />
          }
          searchTrigger={
            <Button variant="outline" size="sm" className="max-w-sm flex-1">
              Search notes and ask a question
            </Button>
          }
          actions={<ThemeToggle />}
        />
      }
      sidebar={
        <Sidebar
          items={storyNavItems}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          newNoteAction={
            collapsed ? (
              <Button size="icon" aria-label="New note">
                <SquarePen aria-hidden="true" className="size-4" />
              </Button>
            ) : (
              <Button className="od-inline-full">
                <SquarePen aria-hidden="true" className="size-4" />
                New note
              </Button>
            )
          }
        />
      }
      mobileTabBar={
        <MobileTabBar
          items={storyTabItems}
          captureAction={
            <Button size="icon" aria-label="New note">
              <SquarePen aria-hidden="true" className="size-4" />
            </Button>
          }
        />
      }
    >
      <ContentRegion className="gap-6">
        <PageHeader
          id="page-title"
          title="Inbox"
          description="Unfiled captures land here first — one action from anywhere."
        />
      </ContentRegion>
    </AppShell>
  );
}
