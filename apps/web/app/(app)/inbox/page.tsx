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
  UnfiledNotice,
  type OrganizeNote,
} from "@omnidoc/ui";
import { loadNotesListForRoute } from "../../lib/notes/note-list-loader";
import { pageHref, readCursors } from "../../lib/notes/notes-pages";
import { locale } from "../../locale";
import { NotePaginationLink, NoteRowLink } from "../organize-links";

export const metadata: Metadata = {
  title: `Inbox — ${appName}`,
};

const BASE_PATH = "/inbox";

/** Rows open the capture route; the id is contract-owned, so encode it. */
function noteHref(note: OrganizeNote): string {
  return `/notes/${encodeURIComponent(note.id)}`;
}

/**
 * Inbox — the unfiled home (F-05, `system-ux.md` §1).
 *
 * The list is server-first: the workspace is resolved from the session and the
 * pages are walked through the notes port on the server, so nothing renders
 * before membership is re-checked. Pagination is a URL chain of server-issued
 * cursors (`?cursor=…`), which keeps the view shareable, reloadable, and
 * operable with JavaScript off — there is no client cache and no client-made
 * cursor.
 *
 * `denied` is the generic workspace denial and `unavailable` is "we could not
 * ask"; neither is allowed to read as "you have no notes".
 */
export default async function InboxPage({
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
      <PageHeader title="Inbox" description="Unfiled notes land here." />
      <UnfiledNotice />
      {outcome.notes.length === 0 ? (
        <NoteListEmpty>
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
