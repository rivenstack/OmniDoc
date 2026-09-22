import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../button";
import { ContentRegion, ContentRegionRetry } from "./content-region";
import { PageHeader } from "./page-header";

/**
 * Inventory §1 · states: `default · loading · error · empty`.
 */
const meta = {
  title: "Shell/ContentRegion",
  component: ContentRegion,
  parameters: {
    docs: {
      description: {
        component:
          "The shell's `main` landmark and the skip link's target (`#main`). A transport failure is scoped here and always offers a retry, so the chrome around it stays usable — the shell never becomes unusable because a provider path failed.",
      },
    },
  },
  args: {
    state: "default",
  },
} satisfies Meta<typeof ContentRegion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <ContentRegion {...args}>
      <PageHeader title="Inbox" description="Unfiled captures land here." />
    </ContentRegion>
  ),
};

export const Loading: Story = {
  args: { state: "loading" },
};

export const Error: Story = {
  args: {
    state: "error",
    error: {
      title: "Couldn't load your notes.",
      message:
        "The request failed. Your workspace is still available — try again.",
      retry: <ContentRegionRetry />,
    },
  },
};

export const Empty: Story = {
  args: {
    state: "empty",
    empty: {
      title: "Nothing here yet",
      description: "Write your first note, or explore the labelled sample.",
      action: <Button size="sm">Write your first note</Button>,
    },
  },
};
