import type { Meta, StoryObj } from "@storybook/react-vite";
import { ThemeToggle } from "./theme-toggle";

/**
 * Inventory §2 · states: `light · dark · system`.
 *
 * The three options are menu radio items, so the selection is exposed as
 * `aria-checked` on a `menuitemradio` rather than only as a highlighted row. The
 * accessible name ("Switch theme") is static while the icon follows the theme, so
 * the name can never drift with the visual. Each story pins the theme global,
 * which the preview decorator passes to `ThemeProvider` as `forcedTheme`.
 */
const meta = {
  title: "Navigation & workspace/ThemeToggle",
  component: ThemeToggle,
  parameters: {
    docs: {
      description: {
        component:
          "All theming is token-level: the component branches on theme only to choose an icon, never to set colour. The `.dark` class remaps tokens in one place (`tokens.css`).",
      },
    },
  },
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {
  globals: { theme: "light" },
};

export const Dark: Story = {
  globals: { theme: "dark" },
};

export const System: Story = {
  globals: { theme: "system" },
};

/** Open state, so the radio group and its `aria-checked` rows are reviewable. */
export const Open: Story = {
  globals: { theme: "dark" },
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <ThemeToggle />
      <p className="text-od-body-sm text-od-text-secondary">
        Activate the control to see the Light / Dark / System radio group.
      </p>
    </div>
  ),
};
