import { ContentRegion, NoteListSkeleton, PageHeader } from "@omnidoc/ui";

/**
 * Notes loading state (F-05).
 *
 * Appears while the server resolves the session and walks the first page, so
 * the reader sees the list's shape and an announced "Loading notes" instead of
 * a blank region. The header is repeated so the transition does not jump.
 */
export default function NotesLoading() {
  return (
    <ContentRegion>
      <PageHeader title="Notes" description="All notes in this workspace." />
      <NoteListSkeleton />
    </ContentRegion>
  );
}
