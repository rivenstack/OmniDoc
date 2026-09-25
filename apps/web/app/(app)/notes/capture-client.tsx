"use client";

import { useRouter } from "next/navigation";
import { CaptureSurface, type CaptureNote } from "@omnidoc/ui";
import {
  importFileAction,
  loadNoteAction,
  readImportJobAction,
  saveNoteAction,
} from "../../lib/notes/actions";

/**
 * Capture route — client boundary.
 *
 * The thin seam between the route (server) and the capture blocks (UI package).
 * All four capabilities arrive as props, so the block never imports an app
 * module and stays testable on its own. `onCreated` is what makes a new note's
 * URL real: once the first save returns an id, the route replaces itself with
 * `/notes/{id}` so a reload lands on the same note instead of a fresh draft.
 */
export function CaptureClient({ note }: { note: CaptureNote | null }) {
  const router = useRouter();

  return (
    <CaptureSurface
      note={note}
      onSave={saveNoteAction}
      onLoadServerVersion={loadNoteAction}
      onReadImportJob={readImportJobAction}
      onImportFile={(file) => {
        // A Server Action carries a `File` inside `FormData`, not as a bare
        // argument.
        const formData = new FormData();
        formData.set("file", file);
        return importFileAction(formData);
      }}
      onCreated={(noteId) => {
        router.replace(`/notes/${noteId}`);
      }}
    />
  );
}
