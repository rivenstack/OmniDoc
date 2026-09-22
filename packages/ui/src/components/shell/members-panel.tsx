import type { ReactNode } from "react";
import { UserRound } from "lucide-react";
import { cn } from "../../lib/utils";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Card, CardContent, CardHeader } from "../card";
import { Skeleton } from "../skeleton";
import { MEMBERS_EMPTY_COPY, ROLE_LABELS } from "./copy";
import type { MemberView } from "./types";

/**
 * Navigation & workspace — `MemberRow` (D-01 inventory §2).
 *
 * Source: `custom`. States: `default · owner · member`.
 *
 * The role is rendered as **text + icon**, never as a colour swatch: "owner" is
 * a permission, so it must survive greyscale, colour-blindness, and a screen
 * reader (a11y §1.6, §4.4).
 *
 * Name and email are user/identifier text placed next to each other, so both are
 * wrapped in `<bdi>` (a11y §7.3).
 */
export type MemberRowProps = {
  member: MemberView;
  /** Inline-end controls — the caller owns what may be done to a member. */
  actions?: ReactNode;
  className?: string;
};

export function MemberRow({ member, actions, className }: MemberRowProps) {
  const isOwner = member.role === "owner";

  return (
    <div
      data-slot="member-row"
      data-role={member.role}
      className={cn("flex items-center gap-2 py-2", className)}
    >
      <Avatar name={member.name} />

      <span className="flex min-w-0 flex-1 flex-col">
        <bdi className="truncate text-od-body-sm text-foreground">
          {member.name}
        </bdi>
        {member.email ? (
          <bdi className="truncate text-od-micro text-od-text-tertiary">
            {member.email}
          </bdi>
        ) : null}
      </span>

      <Badge variant={isOwner ? "accent" : "outline"}>
        {isOwner ? <UserRound aria-hidden="true" /> : null}
        {ROLE_LABELS[member.role]}
      </Badge>

      {actions}
    </div>
  );
}

/**
 * Navigation & workspace — `MembersPanel` (D-01 inventory §2).
 *
 * Source: `custom`. States: `solo-empty · list · loading · error`.
 *
 * Shell spec §4.4: this panel shows **real members only**. There is no
 * directory sync, no admin suite, no seat or plan language — those are the
 * "simulated scale" patterns REC-18 prohibits. The `solo-empty` state says the
 * truth ("You're the only member.") and offers exactly one honest next step.
 *
 * Members are supplied by the caller. The component never derives membership,
 * and F-02 ships no member fixtures: S-03 (or a later contract revision that
 * adds a member-list schema) is the single fixture authority.
 */
export type MembersPanelProps = {
  state?: "solo-empty" | "list" | "loading" | "error";
  members?: readonly MemberView[];
  /** Invite affordance. Rendered in `solo-empty` and `list`. */
  inviteAction?: ReactNode;
  /** Error copy. The panel keeps a retry affordance via `inviteAction`-style slot. */
  errorMessage?: ReactNode;
  retryAction?: ReactNode;
  title?: string;
  className?: string;
};

export function MembersPanel({
  state = "list",
  members = [],
  inviteAction,
  errorMessage = "Couldn't load members.",
  retryAction,
  title = "Members",
  className,
}: MembersPanelProps) {
  return (
    <Card data-slot="members-panel" data-state={state} className={className}>
      <CardHeader>
        {/* Plain `h2`, not `CardTitle` (which renders `h3`): a panel heading
            must not skip a level under the page's `h1` (a11y §4). */}
        <h2 className="text-od-h3 text-foreground">{title}</h2>
      </CardHeader>

      <CardContent className="pb-6">
        {state === "loading" ? (
          <div
            data-slot="members-panel-loading"
            aria-busy="true"
            className="flex flex-col gap-3"
          >
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex items-center gap-2 py-2">
                <Skeleton className="size-6 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="ms-auto h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : null}

        {state === "error" ? (
          <div
            data-slot="members-panel-error"
            role="alert"
            className="flex flex-col items-start gap-2"
          >
            <p className="text-od-body-sm text-od-text-secondary">
              {errorMessage}
            </p>
            {retryAction}
          </div>
        ) : null}

        {state === "solo-empty" ? (
          <div
            data-slot="members-panel-empty"
            className="flex flex-col items-start gap-2"
          >
            <p className="text-od-body-sm text-od-text-secondary">
              {MEMBERS_EMPTY_COPY}
            </p>
            {inviteAction}
          </div>
        ) : null}

        {state === "list" ? (
          <div data-slot="members-panel-list" className="flex flex-col">
            {members.map((member) => (
              <MemberRow key={member.id} member={member} />
            ))}
            {members.length === 0 ? (
              <p className="text-od-body-sm text-od-text-secondary">
                {MEMBERS_EMPTY_COPY}
              </p>
            ) : null}
            {inviteAction ? <div className="pt-2">{inviteAction}</div> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
