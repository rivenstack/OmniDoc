import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../button";
import { Badge } from "../badge";
import { PageHeader } from "./page-header";

/**
 * Inventory §1 · states: `default · with actions · with corpus chip`.
 */
const meta = {
  title: "Shell/PageHeader",
  component: PageHeader,
  parameters: {
    docs: {
      description: {
        component:
          "The heading is the shell's route-change focus target: focusable programmatically (`tabIndex={-1}`) without entering sequential tab order. The root is a `<div>` rather than a `<header>` — a `<header>` nested in `<main>` is still resolved as a `banner` landmark by assistive-technology heuristics, which would give the shell two banners. Titles render inside `<bdi>` because they are user-generated text next to chassis punctuation.",
      },
    },
  },
  args: {
    id: "page-title",
    title: "Inbox",
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithActions: Story = {
  args: {
    title: "Notes",
    description: "Everything you have captured, newest first.",
    actions: (
      <>
        <Button size="sm">New note</Button>
        <Button size="sm" variant="outline">
          Import
        </Button>
      </>
    ),
  },
};

export const WithCorpusChip: Story = {
  args: {
    title: 'Research — "pgvector" & BYOK notes',
    description:
      "A long, punctuated title demonstrates wrapping and `<bdi>` isolation.",
    corpusChip: <Badge variant="outline">Sample</Badge>,
  },
};
