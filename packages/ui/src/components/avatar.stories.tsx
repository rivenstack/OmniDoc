import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar } from "./avatar";

/**
 * Inventory §3 · states: `image · initials · fallback`.
 *
 * First needed by F-02 (`WorkspaceSwitcherItem`, `MemberRow`) and added here
 * rather than duplicated privately in two shell files. The avatar is decorative
 * chrome for a name that is always rendered as text beside it, so the root is
 * `aria-hidden` unless a `label` is supplied — a picture is not an accessible
 * name for a control. Initials are user-derived text and render inside `<bdi>`.
 */
const meta = {
  title: "Foundations/Avatar",
  component: Avatar,
  parameters: {
    docs: {
      description: {
        component:
          "No image source is available yet: the S-02 `Workspace` schema carries names only, so the initials path is the live one. The `image` state is exercised with a data URI purely to prove the Base UI image/fallback handoff works.",
      },
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = {
  args: { name: "Personal workspace" },
};

export const InitialsSingleWord: Story = {
  args: { name: "OmniDoc" },
};

export const Fallback: Story = {
  args: { fallback: "?" },
};

export const Image: Story = {
  args: {
    name: "Ada Lovelace",
    // 1×1 transparent PNG — enough to drive Base UI's loading-status handoff.
    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar name="Ada Lovelace" className="size-6" />
      <Avatar name="Ada Lovelace" className="size-8" />
      <Avatar name="Ada Lovelace" className="size-10" />
    </div>
  ),
};
