import type { Meta, StoryObj } from "@storybook/react-vite";
import { SquarePen } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "../button";
import { Sidebar, SidebarNavItem } from "./sidebar";
import { storyNavItems } from "./shell.story-data";

/**
 * Inventory §1 · `Sidebar` states: `expanded · rail · loading · overflow`.
 * Inventory §1 · `SidebarNavItem` states: `default · hover · focus · active`.
 */
const meta = {
  title: "Shell/Sidebar",
  component: Sidebar,
  parameters: {
    docs: {
      description: {
        component:
          'The current route carries three signals — surface tint, font weight, and `aria-current="page"` — so it survives greyscale and screen readers alike. In rail mode each item keeps its accessible name as visually-hidden text and *additionally* gains a tooltip on focus and hover, so removing the tooltip would not remove the label.',
      },
    },
  },
  args: {
    items: storyNavItems,
  },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

const newNoteAction = (
  <Button className="h-9 justify-start ps-2 pe-2 od-inline-full">
    <SquarePen aria-hidden="true" className="size-4" />
    New note
  </Button>
);

export const Expanded: Story = {
  args: {
    newNoteAction,
    onCollapsedChange: () => undefined,
  },
  render: (args) => (
    <div className="h-96 overflow-hidden rounded-lg border border-border">
      <Sidebar {...args} />
    </div>
  ),
};

export const Rail: Story = {
  args: {
    collapsed: true,
    onCollapsedChange: () => undefined,
    newNoteAction: (
      <Button size="icon" className="size-9" aria-label="New note">
        <SquarePen aria-hidden="true" className="size-4" />
      </Button>
    ),
  },
  render: (args) => (
    <div className="h-96 overflow-hidden rounded-lg border border-border">
      <Sidebar {...args} />
    </div>
  ),
};

export const Loading: Story = {
  args: {
    loading: true,
    newNoteAction,
  },
  render: (args) => (
    <div className="h-96 overflow-hidden rounded-lg border border-border">
      <Sidebar {...args} />
    </div>
  ),
};

/** Many collections: the list scrolls inside the sidebar instead of truncating. */
export const Overflow: Story = {
  args: {
    newNoteAction,
    items: [
      ...storyNavItems,
      ...Array.from({ length: 24 }, (_, index) => ({
        id: `collection-${index}`,
        label: `Collection ${index + 1}`,
        href: `/collections/${index + 1}`,
      })),
    ],
  },
  render: (args) => (
    <div className="h-96 overflow-hidden rounded-lg border border-border">
      <Sidebar {...args} />
    </div>
  ),
};

/**
 * `SidebarNavItem` states, rendered standalone.
 *
 * `Hover` note: browsers do not apply `:hover` to synthetic pointers and
 * Storybook 10.6.0 ships no pseudo-state addon, so the hover treatment is shown
 * by applying the same tokens directly. The live rule remains the component's
 * own `hover:` utilities — this story is a rendering aid, not a second style
 * definition.
 */
export const ItemStates: Story = {
  render: () => (
    <ul className="flex w-64 flex-col gap-1">
      <li>
        <SidebarNavItem item={{ id: "d", label: "Default", href: "/d" }} />
      </li>
      <li>
        <SidebarNavItem
          item={{ id: "h", label: "Hover", href: "/h" }}
          className="bg-accent text-accent-foreground"
        />
      </li>
      <li>
        <FocusedItem />
      </li>
      <li>
        <SidebarNavItem
          item={{ id: "a", label: "Active", href: "/a", active: true }}
        />
      </li>
      <li>
        <SidebarNavItem
          item={{
            id: "x",
            label: "Blocked",
            href: "/x",
            disabled: true,
            disabledReason: "Indexing in progress",
          }}
        />
      </li>
    </ul>
  ),
};

function FocusedItem() {
  const containerRef = useRef<HTMLSpanElement>(null);

  // Real focus, so the visible ring is the design system's own `:focus-visible`
  // rule rather than a duplicated style.
  useEffect(() => {
    containerRef.current?.querySelector("a")?.focus();
  }, []);

  return (
    <span ref={containerRef}>
      <SidebarNavItem item={{ id: "f", label: "Focus", href: "/f" }} />
    </span>
  );
}
