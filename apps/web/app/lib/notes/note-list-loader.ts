/**
 * Organize list loader (server-only, not a Server Action).
 *
 * The route-facing half of the Inbox/Notes lists: it resolves the workspace the
 * session may list **server-side** and then walks the cursor chain through
 * `notes-pages.ts`. Kept separate from that module so the walk stays testable
 * without `next/headers`, mirroring how `note-loader.ts` sits beside the notes
 * port.
 *
 * Workspace selection is a preference over the list the server returned
 * (`architecture.md` §2): a stale preference falls back to a real workspace,
 * and a workspace the API *refuses* comes back as `forbidden`, which renders
 * the generic denial — never a hint that the workspace does or does not exist.
 */
import { readWorkspaces } from "../identity/identity-api";
import { readIdentityJar, readWorkspacePreference } from "../identity/session";
import { resolveWorkspaceSelection } from "../identity/workspace-selection";
import { collectNotePages, type NotesListOutcome } from "./notes-pages";

export type { NotesListOutcome } from "./notes-pages";

export async function loadNotesListForRoute(
  cursors: readonly string[] = [],
): Promise<NotesListOutcome> {
  const jar = await readIdentityJar();
  const preference = await readWorkspacePreference();
  const lookup = await readWorkspaces(jar, preference);
  if (lookup.status !== "resolved") {
    return { status: "unavailable" };
  }

  const { currentWorkspaceId } = resolveWorkspaceSelection(
    lookup.workspaces,
    preference,
  );
  if (!currentWorkspaceId) {
    // No membership at all: there is no list to read, and that is not "no notes".
    return { status: "unavailable" };
  }

  return collectNotePages(currentWorkspaceId, jar, cursors);
}
