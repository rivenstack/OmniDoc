import { ContentRegion, NoteListSkeleton, PageHeader } from "@omnidoc/ui";

/**
 * Notes loading state (F-05) — same shape as Inbox, so paging between the two
 * destinations does not redraw a different skeleton.
 */
export default function NotesLoading() {
  return (
    <ContentRegion>
      <PageHeader title="Notes" description="All notes in this workspace." />
      <NoteListSkeleton />
    </ContentRegion>
  );
}
