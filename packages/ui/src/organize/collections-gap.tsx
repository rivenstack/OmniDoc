import type { ReactNode } from "react";
import { IconFolder } from "@tabler/icons-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../components/empty";
import { cn } from "../lib/utils";

/**
 * Organize block — the Collections gap, stated honestly (F-05).
 *
 * `system-ux.md` §1 makes Collections ("optional light folders or tags") a
 * system item, but S-02 has **no** `collections`/`tags` operation and `Note`
 * carries no folder/tag field. The F-05 work ticket is explicit about what that
 * means for this slice:
 *
 * > *with no collections, Inbox (unfiled) and Notes (all) are the same set. Do
 * > not fabricate a difference — be honest, and treat the Collections contract
 * > as the fix.*
 *
 * So the Collections route ships **no** model — no tree, no tag chips, no
 * "create collection" affordance — and says why. These two sentences live in
 * one place so Inbox, Notes and Collections cannot drift into three different
 * stories about the same gap, and so the honesty is testable.
 */

/** The one sentence Inbox and Notes use to explain why they match today. */
export const UNFILED_NOTICE =
  "Collections isn't available yet, so every note is unfiled — Inbox and Notes show the same list.";

/** Muted helper line for the Inbox and Notes headers. */
export function UnfiledNotice({ className }: { className?: string }) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {UNFILED_NOTICE}
    </p>
  );
}

export type CollectionsUnavailableProps = {
  /** Optional next step (a link composed by the caller). */
  children?: ReactNode;
  className?: string;
};

/** The Collections route body: the gap is the content, not a fake tree. */
export function CollectionsUnavailable({
  children,
  className,
}: CollectionsUnavailableProps) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconFolder aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>Collections aren&rsquo;t available yet</EmptyTitle>
        <EmptyDescription>
          Nothing can be filed yet — folders and tags are not built. Every note
          stays unfiled in Inbox and Notes.
        </EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}
