import type { Metadata } from "next";
import Link from "next/link";
import { appName } from "@omnidoc/contracts";
import {
  Button,
  ContentRegion,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  NOTE_FORBIDDEN_MESSAGE,
} from "@omnidoc/ui";
import { loadNoteForRoute } from "../../../lib/notes/note-loader";
import { CaptureClient } from "../capture-client";

export const metadata: Metadata = {
  title: `Note — ${appName}`,
};

/**
 * One note (F-04).
 *
 * Resolution happens on the server through the notes port, so membership is
 * re-checked before anything renders and the client never learns why a note is
 * missing.
 *
 * `denied` is a single state covering both `403` and `404`. `docs/design/
 * system-ux.md` §2 forbids revealing whether a forbidden resource exists, and
 * giving "not yours" and "no such note" different screens would do exactly that
 * — one probe request would tell an attacker which ids are real.
 */
export default async function NotePage({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const { noteId } = await params;
  const outcome = await loadNoteForRoute(noteId);

  if (outcome.status === "denied") {
    return (
      <ContentRegion>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{NOTE_FORBIDDEN_MESSAGE}</EmptyTitle>
            <EmptyDescription>
              It may have been deleted, or it may not be shared with you.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link href="/inbox" />} variant="outline">
              Back to Inbox
            </Button>
          </EmptyContent>
        </Empty>
      </ContentRegion>
    );
  }

  if (outcome.status === "unavailable") {
    return (
      <ContentRegion>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Can&rsquo;t reach your notes right now</EmptyTitle>
            <EmptyDescription>
              The notes service could not be reached, so this note was not
              loaded and nothing was changed. Reload the page to try again.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </ContentRegion>
    );
  }

  return (
    <ContentRegion>
      <CaptureClient note={outcome.note} />
    </ContentRegion>
  );
}
