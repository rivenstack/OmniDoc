import { PageHeader } from "@omnidoc/ui";

/**
 * Inbox — the unfiled-capture landing (shell spec §1).
 *
 * F-02 delivers the shell around this route, not the journey. Capture, organize,
 * retrieve, and Ask land in F-04…F-07.
 *
 * This page renders **no fixture content**: notes, workspaces, members, and the
 * sample corpus all arrive from `packages/mocks` (S-03, backend-authored), which
 * is the single fixture authority for the application. Until then the page shows
 * only real chrome and honest copy — it does not pretend to have data.
 *
 * The heading is the shell's route-change focus target
 * (`data-slot="page-header-title"`), which is why it carries an id and
 * `tabIndex={-1}` rather than relying on document order. Identifier isolation
 * (`<bdi>`) now lives inside the shell components — workspace names, member
 * names, page titles, and palette rows all wrap user-derived text.
 */
export default function InboxPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        id="page-title"
        title="Inbox"
        description="Unfiled captures land here first. Capture is one action from anywhere, and Ask is never buried in a taxonomy."
      />

      <p className="max-w-[var(--od-measure-reading)] text-od-body-sm text-od-text-secondary">
        The shell is live: skip link, landmarks, the command palette (
        <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>K</kbd>), the new-note hook point (
        <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>N</kbd>), theme switching, and the
        responsive sidebar/tab-bar split. Notes, workspaces, members, and the
        labelled sample corpus arrive with the S-03 mock corpus.
      </p>
    </div>
  );
}
