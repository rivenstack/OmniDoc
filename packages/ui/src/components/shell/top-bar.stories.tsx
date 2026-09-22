import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../button";
import { ThemeToggle } from "./theme-toggle";
import { TopBar } from "./top-bar";
import { WorkspaceSwitcher } from "./workspace-switcher";
import {
  storyPersonalWorkspace,
  storySampleWorkspace,
} from "./shell.story-data";

/**
 * Inventory §1 · states: `default · loading`.
 */
const meta = {
  title: "Shell/TopBar",
  component: TopBar,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The shell's single `banner` landmark. The mode-chip slot is reserved and inert in F-02: F-08 owns the chip and its polite status announcements, and announcing a mode before the real content exists would announce nothing meaningful.",
      },
    },
  },
} satisfies Meta<typeof TopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    workspaceSlot: (
      <WorkspaceSwitcher
        workspaces={[storyPersonalWorkspace, storySampleWorkspace]}
        selectedId={storyPersonalWorkspace.workspace.id}
      />
    ),
    searchTrigger: (
      <Button variant="outline" size="sm" className="max-w-sm flex-1">
        Search notes and ask a question
      </Button>
    ),
    actions: <ThemeToggle />,
  },
};

/** Initial shell load: static skeletons, so nav resolving causes no layout shift. */
export const Loading: Story = {
  args: {
    loading: true,
  },
};
