import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState, type ComponentProps } from "react";
import { Button } from "../button";
import { CommandPalette } from "./command-palette";
import { storyPaletteItems } from "./shell.story-data";

/**
 * Inventory §1 · states: `closed · open · loading · empty · results`.
 *
 * Base UI `Dialog` supplies the modal behaviour — focus trap, `Escape`, focus
 * restore to the previously focused element, scroll lock. The results list is
 * keyboard-complete: `ArrowDown`/`ArrowUp` move between the field and the rows,
 * and `Enter` activates. The result count is announced once from a polite status
 * region, never per keystroke.
 */
const meta = {
  title: "Shell/CommandPalette",
  component: CommandPalette,
  parameters: {
    docs: {
      description: {
        component:
          "Documented equivalent of the shadcn `command` composition. shadcn's `command` is built on `cmdk`, which is not a pinned dependency in ADR-0003; introducing it from an F-* slice would be a new component-base dependency decision. The dialog is the `open` state; the list below is the `results`/`empty`/`loading` state.",
      },
    },
  },
  args: {
    items: storyPaletteItems,
  },
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Closed: the palette renders nothing at all, so the trigger is the story. */
export const Closed: Story = {
  args: {
    open: false,
    onOpenChange: () => undefined,
  },
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Button variant="outline" size="sm">
        Search notes and ask a question
      </Button>
      <p className="text-od-body-sm text-od-text-secondary">
        Closed — nothing is mounted until the palette opens.
      </p>
    </div>
  ),
};

export const Open: Story = {
  args: { open: false, onOpenChange: () => undefined },
  render: (args) => <InteractivePalette {...args} />,
};

export const Loading: Story = {
  args: { open: true, loading: true, onOpenChange: () => undefined },
};

export const Empty: Story = {
  args: {
    open: true,
    onOpenChange: () => undefined,
    items: [],
  },
};

export const Results: Story = {
  args: {
    open: true,
    onOpenChange: () => undefined,
  },
};

/** Reduced-motion variant: the open/close transition resolves to instant. */
export const ReducedMotion: Story = {
  args: {
    open: true,
    onOpenChange: () => undefined,
  },
  globals: { motion: "reduced" },
};

function InteractivePalette(props: ComponentProps<typeof CommandPalette>) {
  const [open, setOpen] = useState(false);

  // Open on mount so the story lands on the interactive surface.
  useEffect(() => {
    setOpen(true);
  }, []);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Search notes and ask a question
      </Button>
      <CommandPalette
        {...props}
        open={open}
        onOpenChange={(next) => setOpen(next)}
      />
    </>
  );
}
