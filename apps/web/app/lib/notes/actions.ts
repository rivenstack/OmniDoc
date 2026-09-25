"use server";

/**
 * Notes server actions — the only place the app writes note content.
 *
 * Actions run on the Next server, so they can talk to the Java API with the
 * relayed session cookies and the browser never needs CORS or a client cache
 * (ADR-0003 §2). They call the notes port and nothing else: no Server Action
 * here talks to a provider, directly or on the client's behalf.
 *
 * Workspace scope is resolved from the session on every call. The client sends a
 * note id and content; it never sends a tenant, and it never sends a workspace it
 * picked. `architecture.md` §2 is explicit that the workspace id selects and does
 * not authorize, so this module only ever passes an id that membership already
 * confirmed.
 *
 * Authorship note: a `"use server"` module may only export async functions.
 */
import { revalidatePath } from "next/cache";
import {
  importStatusFromJob,
  type CaptureImportResult,
  type CaptureNote,
  type CaptureSaveInput,
  type CaptureSaveResult,
  type ImportStatus,
} from "@omnidoc/ui";

import { readWorkspaces } from "../identity/identity-api";
import { readIdentityJar, readWorkspacePreference } from "../identity/session";
import { resolveWorkspaceSelection } from "../identity/workspace-selection";
import {
  createNote,
  enqueueImport,
  readIngestionJob,
  readNote,
  updateNote,
} from "./notes-api";
import type { ApiJar } from "../api/transport";

type NotesContext = { jar: ApiJar; workspaceId: string };

/**
 * Resolve the workspace this request may act in.
 *
 * Returns `null` rather than falling back to anything: without a confirmed
 * membership there is no honest workspace to write to, and inventing one would
 * turn a session problem into a tenant-selection problem.
 */
async function resolveNotesContext(): Promise<NotesContext | null> {
  const jar = await readIdentityJar();
  const preference = await readWorkspacePreference();
  const lookup = await readWorkspaces(jar, preference);
  if (lookup.status !== "resolved") {
    return null;
  }
  const { currentWorkspaceId } = resolveWorkspaceSelection(
    lookup.workspaces,
    preference,
  );
  if (!currentWorkspaceId) {
    return null;
  }
  return { jar, workspaceId: currentWorkspaceId };
}

/**
 * Create or update a note.
 *
 * `expectedVersion` is the `versionId` the editor last saw. A `409` comes back as
 * `conflict` and is **not** retried, merged, or force-written — the surface shows
 * both versions and the user chooses (`docs/design/system-ux.md` §2).
 */
export async function saveNoteAction(
  input: CaptureSaveInput,
): Promise<CaptureSaveResult> {
  const context = await resolveNotesContext();
  if (!context) {
    return { status: "unavailable" };
  }

  if (input.noteId === null || input.expectedVersion === null) {
    const created = await createNote(
      context.workspaceId,
      { title: input.title, bodyJson: input.bodyJson },
      context.jar,
    );
    switch (created.status) {
      case "saved":
        revalidatePath("/notes");
        return {
          status: "saved",
          noteId: created.note.id,
          version: created.note.versionId,
        };
      case "forbidden":
        return { status: "forbidden" };
      case "validation":
        return { status: "validation" };
      case "unauthorized":
      case "unavailable":
        return { status: "unavailable" };
    }
  }

  const updated = await updateNote(
    input.noteId,
    {
      title: input.title,
      bodyJson: input.bodyJson,
      expectedVersion: input.expectedVersion,
    },
    context.jar,
    context.workspaceId,
  );

  switch (updated.status) {
    case "saved":
      revalidatePath("/notes");
      return {
        status: "saved",
        noteId: updated.note.id,
        version: updated.note.versionId,
      };
    case "conflict":
      // Passed through untouched. This is the one outcome the action must never
      // resolve on the user's behalf.
      return { status: "conflict" };
    case "forbidden":
      return { status: "forbidden" };
    case "not_found":
      return { status: "not_found" };
    case "validation":
      return { status: "validation" };
    case "unauthorized":
    case "unavailable":
      return { status: "unavailable" };
  }
}

/**
 * Re-read a note's current version — used to resolve a conflict, and to load the
 * editor's initial content on the client.
 *
 * Returns `null` for every failure, including a denial. The surface only uses
 * this to offer a choice; it must not be able to distinguish "not yours" from
 * "gone", so it is told nothing.
 */
export async function loadNoteAction(noteId: string): Promise<CaptureNote | null> {
  const context = await resolveNotesContext();
  if (!context) {
    return null;
  }
  const result = await readNote(noteId, context.jar, context.workspaceId);
  if (result.status !== "found") {
    return null;
  }
  return {
    id: result.note.id,
    title: result.note.title,
    bodyJson: result.note.bodyJson,
    version: result.note.versionId,
  };
}

/**
 * Enqueue one imported file.
 *
 * Takes `FormData` because that is the shape a Server Action can carry a `File`
 * in. Each file is its own job, so each keeps its own status.
 */
export async function importFileAction(
  formData: FormData,
): Promise<CaptureImportResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { status: "rejected" };
  }

  const context = await resolveNotesContext();
  if (!context) {
    return { status: "unavailable" };
  }

  const result = await enqueueImport(context.workspaceId, file, context.jar);
  switch (result.status) {
    case "queued":
      return { status: "queued", jobId: result.job.jobId };
    case "unsupported_type":
    case "too_large":
    case "forbidden":
      return { status: "rejected" };
    case "unauthorized":
    case "unavailable":
      return { status: "unavailable" };
  }
}

/** Read one import's progress. */
export async function readImportJobAction(
  jobId: string,
): Promise<ImportStatus | null> {
  const context = await resolveNotesContext();
  if (!context) {
    return null;
  }
  const result = await readIngestionJob(jobId, context.jar, context.workspaceId);
  return result.status === "job" ? importStatusFromJob(result.job.status) : null;
}
