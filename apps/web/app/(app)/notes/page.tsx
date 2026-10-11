import type { Metadata } from "next";
import Link from "next/link";
import { appName } from "@omnidoc/contracts";
import {
  Button,
  ContentRegion,
  NoteList,
  NoteListDenied,
  NoteListEmpty,
  NoteListUnavailable,
  PageHeader,
  type OrganizeNote,
} from "@omnidoc/ui";
import { loadNotesListForRoute } from "../../lib/notes/note-list-loader";
import { pageHref, readCursors } from "../../lib/notes/notes-pages";
import { locale } from "../../locale";
import { NotePaginationLink, NoteRowLink } from "../organize-links";

export const metadata: Metadata = {
  title: `Notes — ${appName}`,
};

const BASE_PATH = "/notes";

/** Rows open the capture route; the id is contract-owned, so encode it. */
function noteHref(note: OrganizeNote): string {
  return `/notes/${encodeURIComponent(note.id)}`;
}

/**
 * Notes — every note in the workspace (F-05, `system-ux.md` §1).
 *
 * The list is server-first: the workspace is resolved from the session and the
 * pages are walked through the notes port on the server, so nothing renders
 * before membership is re-checked. `NoteListEmpty` is shared with capture: a
 * note still needs a title and a body only.
 *
 * Inbox and Collections left the shell on 2026-10-12, so this is the single
 * note list — there is no second destination to be distinct from.
 */
export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string | string[] }>;
}) {
  const params = await searchParams;
  const cursors = readCursors(params.cursor);
  const outcome = await loadNotesListForRoute(cursors);

  if (outcome.status === "denied") {
    return (
      <ContentRegion>
        <NoteListDenied />
      </ContentRegion>
    );
  }

  if (outcome.status === "unavailable") {
    return (
      <ContentRegion>
        <NoteListUnavailable />
      </ContentRegion>
    );
  }

  return (
    <ContentRegion>
      <PageHeader title="Notes" description="All notes in this workspace." />
      {outcome.notes.length === 0 ? (
        <NoteListEmpty description="Notes in this workspace appear here. Capture one with a title and a body to start.">
          <Button render={<Link href="/notes/new" />}>New note</Button>
        </NoteListEmpty>
      ) : (
        <NoteList
          notes={outcome.notes}
          hrefForNote={noteHref}
          loadMoreHref={
            outcome.nextCursor
              ? pageHref(BASE_PATH, [
                  ...outcome.cursors,
                  outcome.nextCursor,
                ])
              : undefined
          }
          firstPageHref={
            outcome.cursors.length > 0 ? pageHref(BASE_PATH, []) : undefined
          }
          lang={locale.lang}
          linkComponent={NoteRowLink}
          paginationLinkComponent={NotePaginationLink}
        />
      )}
    </ContentRegion>
  );
}
