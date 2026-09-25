/**
 * Note route loader (server-only, not a Server Action).
 *
 * The route needs one thing the editor does not: an honest answer about *why* a
 * note is not shown. `denied` covers both a note this session may not read and a
 * note that does not exist, on purpose — `docs/api/openapi.yaml` separates `403`
 * from `404`, and collapsing them here is what stops the route from becoming an
 * existence oracle (`docs/design/system-ux.md` §2).
 *
 * `unavailable` stays separate because "we could not ask" is not "no", and
 * rendering the generic denial for an unreachable API would tell the user their
 * own note is not theirs.
 */
import { readWorkspaces } from "../identity/identity-api";
import { readIdentityJar, readWorkspacePreference } from "../identity/session";
import { resolveWorkspaceSelection } from "../identity/workspace-selection";
import { readNote } from "./notes-api";
import type { CaptureNote } from "@omnidoc/ui";

export type NoteRouteOutcome =
  | { status: "found"; note: CaptureNote }
  | { status: "denied" }
  | { status: "unavailable" };

export async function loadNoteForRoute(
  noteId: string,
): Promise<NoteRouteOutcome> {
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
    return { status: "unavailable" };
  }

  const result = await readNote(noteId, jar, currentWorkspaceId);
  switch (result.status) {
    case "found":
      return {
        status: "found",
        note: {
          id: result.note.id,
          title: result.note.title,
          bodyJson: result.note.bodyJson,
          version: result.note.versionId,
        },
      };
    case "forbidden":
    case "not_found":
      // One answer for both. See the module note.
      return { status: "denied" };
    case "unauthorized":
    case "unavailable":
      return { status: "unavailable" };
  }
}
