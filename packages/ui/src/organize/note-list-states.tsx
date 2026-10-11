import type { ReactNode } from "react";
import { IconNotes } from "@tabler/icons-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../components/empty";
import { Skeleton } from "../components/skeleton";
import { cn } from "../lib/utils";
import { WORKSPACE_FORBIDDEN_MESSAGE } from "../shell/denials";

/**
 * Organize block — the list's empty / loading / error / denied states (F-05).
 *
 * These four states are the difference between an honest list and a plausible
 * one, so they live beside the list instead of being re-invented per route:
 *
 * - **`NoteListEmpty`** answers *what / why / one primary next*
 *   (`quality/ui-qa-checklist.md` §5.1). The caller supplies the action, because
 *   the "next" is a route (`/notes/new`) and `@omnidoc/ui` owns no routes. It is
 *   also where capture-without-filing is restated: no folder or tag is required
 *   (`system-ux.md` §1).
 * - **`NoteListUnavailable`** is "we could not ask", never "no". Rendering the
 *   empty state for an unreachable API would tell the user their notes are gone
 *   (`system-ux.md` §2).
 * - **`NoteListDenied`** is the generic workspace denial: one sentence for
 *   "does not exist" and "not yours", so the route never becomes an existence
 *   oracle (`architecture.md` §2).
 * - **`NoteListSkeleton`** announces loading exactly once via `role="status"`;
 *   the placeholder rows are `aria-hidden` and the shimmer collapses under
 *   `prefers-reduced-motion` through the global token rule (§2.3, §3.1).
 */

export type NoteListSkeletonProps = {
  rows?: number;
  /** Announced once. Keep it a sentence a screen reader can say on its own. */
  label?: string;
  className?: string;
};

export function NoteListSkeleton({
  rows = 5,
  label = "Loading notes",
  className,
}: NoteListSkeletonProps) {
  return (
    <div role="status" className={cn("flex flex-col gap-4", className)}>
      <span className="sr-only">{label}</span>
      <ul
        role="list"
        aria-hidden="true"
        className="divide-y divide-border border-y border-border"
      >
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex min-w-0 flex-col gap-2 px-3 py-3.5">
            <Skeleton className="h-4 w-3/5 max-w-72" />
            <Skeleton className="h-3 w-28" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export type NoteListEmptyProps = {
  title?: ReactNode;
  description?: ReactNode;
  /** The one primary next step (a link composed by the caller). */
  children?: ReactNode;
  className?: string;
};

export function NoteListEmpty({
  title = "No notes yet",
  description = "Capture a note with a title and a body — nothing has to be filed or tagged.",
  children,
  className,
}: NoteListEmptyProps) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconNotes aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}

export type NoteListStateProps = {
  children?: ReactNode;
  className?: string;
};

/**
 * "We could not ask." Distinct from empty (no notes) and from denied (no
 * access) on purpose; the reload hint is the whole recovery, because the list
 * was not loaded and nothing was changed.
 */
export function NoteListUnavailable({
  children,
  className,
}: NoteListStateProps) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyTitle>Can&rsquo;t reach your notes right now</EmptyTitle>
        <EmptyDescription>
          The notes service could not be reached, so this list was not loaded
          and nothing was changed. Reload the page to try again.
        </EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}

/**
 * The generic denial for a workspace this session cannot list.
 *
 * Same sentence for "no such workspace" and "not yours" — the difference would
 * let a probe request map which workspace ids are real.
 */
export function NoteListDenied({ children, className }: NoteListStateProps) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyTitle>{WORKSPACE_FORBIDDEN_MESSAGE}</EmptyTitle>
        <EmptyDescription>
          It may not exist, or it may not be shared with you.
        </EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}
