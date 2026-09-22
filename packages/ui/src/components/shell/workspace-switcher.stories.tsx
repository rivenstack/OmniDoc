import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../button";
import {
  SoloWorkspaceBadge,
  WorkspaceSwitcher,
  WorkspaceSwitcherItem,
} from "./workspace-switcher";
import {
  storyPersonalWorkspace,
  storySampleWorkspace,
  storySecondWorkspace,
} from "./shell.story-data";

/**
 * Inventory §2 · `WorkspaceSwitcher` states: `single-workspace · few ·
 * sample-present · open · forbidden`.
 */
const meta = {
  title: "Navigation & workspace/WorkspaceSwitcher",
  component: WorkspaceSwitcher,
  parameters: {
    docs: {
      description: {
        component:
          "REC-18 in the chrome: at n≈1 this is a label with a `Solo workspace` badge, not a one-item menu that pretends to be an organisation. At n>1 it lists only real memberships, grouped `Mine` and `Sample (public demo notes)` and separated. There is no org chart, member directory, seat language, or SSO wall. Selecting sends the id as a *selector* — the server re-binds membership and answers `403` on a mismatch, which surfaces as the generic forbidden message that does not disclose whether the id exists.",
      },
    },
  },
} satisfies Meta<typeof WorkspaceSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleWorkspace: Story = {
  args: {
    workspaces: [storyPersonalWorkspace],
    selectedId: storyPersonalWorkspace.workspace.id,
  },
};

export const Few: Story = {
  args: {
    workspaces: [storyPersonalWorkspace, storySecondWorkspace],
    selectedId: storyPersonalWorkspace.workspace.id,
  },
};

export const SamplePresent: Story = {
  args: {
    workspaces: [storyPersonalWorkspace, storySampleWorkspace],
    selectedId: storyPersonalWorkspace.workspace.id,
    onCreateWorkspace: () => undefined,
    onHideSample: () => undefined,
  },
};

export const Open: Story = {
  args: {
    workspaces: [storyPersonalWorkspace, storySampleWorkspace],
    selectedId: storySampleWorkspace.workspace.id,
    open: true,
    onOpenChange: () => undefined,
    onCreateWorkspace: () => undefined,
    onHideSample: () => undefined,
  },
};

export const Forbidden: Story = {
  args: {
    workspaces: [storyPersonalWorkspace, storySampleWorkspace],
    selectedId: storyPersonalWorkspace.workspace.id,
    forbidden: true,
  },
};

/** Reduced-motion variant: the menu's fade resolves to instant. */
export const ReducedMotion: Story = {
  args: {
    workspaces: [storyPersonalWorkspace, storySampleWorkspace],
    selectedId: storyPersonalWorkspace.workspace.id,
    open: true,
    onOpenChange: () => undefined,
  },
  globals: { motion: "reduced" },
};

/** No memberships resolved yet — the shell shows `TopBar loading` instead. */
export const NoMemberships: Story = {
  args: { workspaces: [] },
  render: () => (
    <p className="text-od-body-sm text-od-text-secondary">
      Renders nothing: the caller mounts the switcher once data exists, and the
      shell shows the top bar's loading state until then. No tenant is invented.
    </p>
  ),
};

/**
 * Inventory §2 · `WorkspaceSwitcherItem` states: `default · selected ·
 * sample-tagged`. Rendered standalone — inside the switcher the surrounding
 * `Menu.Item` owns interaction and `role="menuitem"`.
 */
export const ItemStates: Story = {
  args: { workspaces: [storyPersonalWorkspace] },
  render: () => (
    <div className="flex w-72 flex-col gap-1 rounded-lg border border-border p-2">
      <WorkspaceSwitcherItem
        name={storyPersonalWorkspace.workspace.name}
        corpusOwnership="mine"
      />
      <WorkspaceSwitcherItem
        name={storySecondWorkspace.workspace.name}
        corpusOwnership="mine"
        role="owner"
        selected
      />
      <WorkspaceSwitcherItem
        name={storySampleWorkspace.workspace.name}
        corpusOwnership="sample"
      />
    </div>
  ),
};

/**
 * Inventory §2 · `SoloWorkspaceBadge` state: `default`.
 */
export const SoloBadge: Story = {
  args: { workspaces: [storyPersonalWorkspace] },
  render: () => (
    <div className="flex items-center gap-3">
      <SoloWorkspaceBadge />
      <Button size="sm" variant="outline">
        Invite a member
      </Button>
    </div>
  ),
};
