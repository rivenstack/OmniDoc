import { ContentRegion, NoteListSkeleton, PageHeader } from "@omnidoc/ui";

/**
 * Inbox loading state (F-05).
 *
 * Appears while the server resolves the session and walks the first page, so
 * the reader sees the list's shape and an announced "Loading notes" instead of
 * a blank region. The header is repeated so the transition does not jump.
 */
export default function InboxLoading() {
  return (
    <ContentRegion>
      <PageHeader title="Inbox" description="Unfiled notes land here." />
      <NoteListSkeleton />
    </ContentRegion>
  );
}
