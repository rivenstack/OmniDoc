import type { Meta, StoryObj } from "@storybook/react-vite";
import { SquarePen } from "lucide-react";
import { Button } from "../button";
import { MobileTabBar } from "./mobile-tab-bar";
import { storyTabItems } from "./shell.story-data";

/**
 * Inventory §1 · states: `default · active tab`.
 */
const meta = {
  title: "Shell/MobileTabBar",
  component: MobileTabBar,
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "mobile1" },
    docs: {
      description: {
        component:
          "Target ~390px (shell spec §3). Every tab is a real link and capture is a real focusable control — nothing is swipe-only, and capture never depends on a gesture. Labels are always visible, so the bar needs no tooltip layer to satisfy the accessible-name requirement.",
      },
    },
  },
  args: {
    items: storyTabItems,
    captureAction: (
      <Button size="icon" aria-label="New note">
        <SquarePen aria-hidden="true" className="size-4" />
      </Button>
    ),
  },
} satisfies Meta<typeof MobileTabBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="w-[390px]">
      <MobileTabBar {...args} />
    </div>
  ),
};

/** Active tab: tint + weight + `aria-current`, never colour alone. */
export const ActiveTab: Story = {
  args: {
    items: storyTabItems.map((item) => ({
      ...item,
      active: item.id === "ask",
    })),
  },
  render: (args) => (
    <div className="w-[390px]">
      <MobileTabBar {...args} />
    </div>
  ),
};

/** A gated tab explains itself in text rather than failing silently. */
export const GatedTab: Story = {
  args: {
    items: storyTabItems.map((item) =>
      item.id === "ask"
        ? {
            ...item,
            disabled: true,
            disabledReason: "Indexing in progress",
          }
        : item,
    ),
  },
  render: (args) => (
    <div className="w-[390px]">
      <MobileTabBar {...args} />
    </div>
  ),
};
