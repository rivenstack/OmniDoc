import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef } from "react";
import { SkipLink } from "./skip-link";

/**
 * Inventory §1 · state: `default (visible on focus)`.
 */
const meta = {
  title: "Shell/SkipLink",
  component: SkipLink,
  parameters: {
    docs: {
      description: {
        component:
          "Must be the first focusable element in the document (shell spec §7.1). It is visually hidden until focused and then revealed at the inline-start edge via `start-2` — a logical inset, so it follows the writing direction instead of hard-coding left. It is a plain anchor, so it works with no JavaScript.",
      },
    },
  },
} satisfies Meta<typeof SkipLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The focused appearance, forced with real focus rather than a fake class. */
export const VisibleOnFocus: Story = {
  render: () => <FocusedSkipLink />,
};

function FocusedSkipLink() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.querySelector("a")?.focus();
  }, []);

  return (
    <div ref={containerRef}>
      <SkipLink />
      <p id="main" className="text-od-body-sm text-od-text-secondary">
        Content-region target (<code>#main</code>). Press <kbd>Shift</kbd>+
        <kbd>Tab</kbd> to see it leave.
      </p>
    </div>
  );
}
