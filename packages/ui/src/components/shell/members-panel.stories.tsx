import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../button";
import { MemberRow, MembersPanel } from "./members-panel";
import { storyMembers } from "./shell.story-data";

/**
 * Inventory §2 · `MembersPanel` states: `solo-empty · list · loading · error`.
 */
const meta = {
  title: "Navigation & workspace/MembersPanel",
  component: MembersPanel,
  parameters: {
    docs: {
      description: {
        component:
          "Real members only. No directory sync, no admin suite, no seat or plan language — those are the simulated-scale patterns REC-18 prohibits. The solo state states the truth and offers exactly one honest next step. F-02 ships no member fixtures: S-03 (or a later contract revision that adds a member-list schema) is the single fixture authority.",
      },
    },
  },
} satisfies Meta<typeof MembersPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SoloEmpty: Story = {
  args: {
    state: "solo-empty",
    inviteAction: <Button size="sm">Invite a member</Button>,
  },
};

export const List: Story = {
  args: {
    state: "list",
    members: storyMembers,
    inviteAction: (
      <Button size="sm" variant="outline">
        Invite a member
      </Button>
    ),
  },
};

export const Loading: Story = {
  args: { state: "loading" },
};

export const Error: Story = {
  args: {
    state: "error",
    retryAction: (
      <Button size="sm" variant="outline">
        Retry
      </Button>
    ),
  },
};

/**
 * Inventory §2 · `MemberRow` states: `default · owner · member`. Rendered
 * standalone; the role chip is text + icon, never a colour swatch.
 */
export const RowStates: Story = {
  render: () => (
    <div className="flex w-80 flex-col divide-y divide-border">
      <MemberRow
        member={{ id: "plain", name: "Unassigned role", role: "member" }}
      />
      <MemberRow
        member={{
          id: "owner",
          name: "Ada Lovelace",
          email: "ada@example.com",
          role: "owner",
        }}
      />
      <MemberRow
        member={{
          id: "member",
          name: "Grace Hopper",
          email: "grace@example.com",
          role: "member",
        }}
      />
    </div>
  ),
};
