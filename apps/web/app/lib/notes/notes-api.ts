/**
 * Notes port — the only place the frontend talks to notes.
 *
 * The port is a typed adapter over `docs/api/openapi.yaml` (S-02, `Notes` tag):
 * create, read, update with optimistic concurrency, and soft delete. Everything
 * it returns is a contract type from `@omnidoc/contracts`; no shape is forked
 * here, and the durable body is `ProseMirrorDocument` JSON (ADR-0001 §2) — never
 * markdown and never HTML.
 *
 * Two rules from `architecture.md` shape the signatures:
 *
 * - **A workspace id selects; it does not authorize.** It travels as the
 *   `OmniDoc-Workspace-Id` selector header and the server re-binds membership
 *   from the session. A mismatch is a generic denial, and the client must not
 *   be able to tell "not yours" from "does not exist" (`system-ux.md` §2).
 * - **Version concurrency is real.** `updateNote` sends the `versionId` the
 *   editor last saw as `expectedVersion`. A `409` is reported as `conflict` and
 *   is **never** retried into a silent last-write-wins: the client does not pick
 *   the winning version.
 *
 * Outcomes are total, like the identity port: transport problems come back as
 * `unavailable` rather than throwing, so the UI can keep "we could not ask" and
 * "the answer is no" apart.
 */
import type { components } from "@omnidoc/contracts";

import { readJson, sendApiRequest, type ApiJar } from "../api/transport";

export type Note = components["schemas"]["Note"];
export type NotePage = components["schemas"]["NotePage"];
export type CreateNoteRequest = components["schemas"]["CreateNoteRequest"];
export type UpdateNoteRequest = components["schemas"]["UpdateNoteRequest"];
export type ProseMirrorDocument = components["schemas"]["ProseMirrorDocument"];
export type IngestionJob = components["schemas"]["IngestionJob"];
export type JobStatus = components["schemas"]["JobStatus"];

export const NOTES_PATH = "/api/v1/notes";
export const INGESTION_JOBS_PATH = "/api/v1/ingestion-jobs";
export const NOTE_ID_HEADER = "OmniDoc-Note-Id";

/** `/api/v1/workspaces/{workspaceId}/notes` — the collection, workspace-scoped. */
export function workspaceNotesPath(workspaceId: string): string {
  return `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/notes`;
}

/** `/api/v1/notes/{noteId}` — one note. */
export function notePath(noteId: string): string {
  return `${NOTES_PATH}/${encodeURIComponent(noteId)}`;
}

/**
 * Outcome of a read.
 *
 * `not_found` and `forbidden` are kept distinct here because the *port* must not
 * invent an answer, but the UI is required to render both through the same
 * generic denial: a member of workspace A asking for a note in workspace B must
 * learn nothing from the difference.
 */
export type NoteReadOutcome =
  | { status: "found"; note: Note }
  | { status: "unauthorized" }
  | { status: "forbidden" }
  | { status: "not_found" }
  | { status: "unavailable" };

/** Outcome of a create. A create cannot conflict — there is no prior version. */
export type NoteCreateOutcome =
  | { status: "saved"; note: Note }
  | { status: "unauthorized" }
  | { status: "forbidden" }
  | { status: "validation" }
  | { status: "unavailable" };

/** Outcome of an update. `conflict` is a first-class result, not an error path. */
export type NoteUpdateOutcome =
  | { status: "saved"; note: Note }
  | { status: "conflict" }
  | { status: "unauthorized" }
  | { status: "forbidden" }
  | { status: "not_found" }
  | { status: "validation" }
  | { status: "unavailable" };

export type NoteDeleteOutcome =
  | { status: "deleted" }
  | { status: "unauthorized" }
  | { status: "forbidden" }
  | { status: "not_found" }
  | { status: "unavailable" };

export type NoteListOutcome =
  | { status: "listed"; notes: Note[]; nextCursor: string | null }
  | { status: "unauthorized" }
  | { status: "forbidden" }
  | { status: "unavailable" };

export type IngestionJobOutcome =
  | { status: "job"; job: IngestionJob }
  | { status: "unauthorized" }
  | { status: "forbidden" }
  | { status: "not_found" }
  | { status: "unavailable" };

/** Outcome of enqueuing an import. */
export type ImportEnqueueOutcome =
  | { status: "queued"; job: IngestionJob }
  | { status: "unauthorized" }
  | { status: "forbidden" }
  | { status: "unsupported_type" }
  | { status: "too_large" }
  | { status: "unavailable" };

/**
 * Minimum shape check on a `Note` response.
 *
 * `bodyJson` is editor-owned (`additionalProperties: true` in the contract), so
 * it is only checked for presence — the port does not try to understand
 * ProseMirror here, and it never turns the body into another representation.
 */
function asNote(body: unknown): Note | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const candidate = body as Partial<Note>;
  const bodyJson = candidate.bodyJson;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.workspaceId !== "string" ||
    typeof candidate.versionId !== "string" ||
    typeof candidate.title !== "string" ||
    typeof bodyJson !== "object" ||
    bodyJson === null
  ) {
    return null;
  }
  return candidate as Note;
}

function asNotePage(body: unknown): { notes: Note[]; nextCursor: string | null } | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const items = (body as { items?: unknown }).items;
  if (!Array.isArray(items)) {
    return null;
  }
  const notes: Note[] = [];
  for (const item of items) {
    const note = asNote(item);
    if (!note) {
      return null;
    }
    notes.push(note);
  }
  const cursor = (body as { nextCursor?: unknown }).nextCursor;
  return { notes, nextCursor: typeof cursor === "string" ? cursor : null };
}

function asIngestionJob(body: unknown): IngestionJob | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const candidate = body as Partial<IngestionJob>;
  if (typeof candidate.jobId !== "string" || typeof candidate.status !== "string") {
    return null;
  }
  return candidate as IngestionJob;
}

/** Create a note version. Title and body only — no folder or tag. */
export async function createNote(
  workspaceId: string,
  request: CreateNoteRequest,
  jar: ApiJar = {},
): Promise<NoteCreateOutcome> {
  const response = await sendApiRequest(workspaceNotesPath(workspaceId), {
    method: "POST",
    jar,
    json: request,
    workspaceSelector: workspaceId,
  });
  if (!response) {
    return { status: "unavailable" };
  }
  if (response.status === 401) {
    return { status: "unauthorized" };
  }
  if (response.status === 403) {
    return { status: "forbidden" };
  }
  if (response.status === 400) {
    return { status: "validation" };
  }
  if (!response.ok) {
    return { status: "unavailable" };
  }
  const note = asNote(await readJson(response));
  return note ? { status: "saved", note } : { status: "unavailable" };
}

/** Read one note. */
export async function readNote(
  noteId: string,
  jar: ApiJar = {},
  workspaceSelector?: string,
): Promise<NoteReadOutcome> {
  const response = await sendApiRequest(notePath(noteId), {
    method: "GET",
    jar,
    workspaceSelector,
  });
  if (!response) {
    return { status: "unavailable" };
  }
  if (response.status === 401) {
    return { status: "unauthorized" };
  }
  if (response.status === 403) {
    return { status: "forbidden" };
  }
  if (response.status === 404) {
    return { status: "not_found" };
  }
  if (!response.ok) {
    return { status: "unavailable" };
  }
  const note = asNote(await readJson(response));
  return note ? { status: "found", note } : { status: "unavailable" };
}

/**
 * Update a note version.
 *
 * `expectedVersion` is the `versionId` the editor last saw. A `409` means the
 * server holds a different version — the caller shows both and lets the user
 * decide. This function deliberately performs **no** retry and no merge.
 */
export async function updateNote(
  noteId: string,
  request: UpdateNoteRequest,
  jar: ApiJar = {},
  workspaceSelector?: string,
): Promise<NoteUpdateOutcome> {
  const response = await sendApiRequest(notePath(noteId), {
    method: "PATCH",
    jar,
    json: request,
    workspaceSelector,
  });
  if (!response) {
    return { status: "unavailable" };
  }
  if (response.status === 401) {
    return { status: "unauthorized" };
  }
  if (response.status === 403) {
    return { status: "forbidden" };
  }
  if (response.status === 404) {
    return { status: "not_found" };
  }
  if (response.status === 409) {
    return { status: "conflict" };
  }
  if (response.status === 400) {
    return { status: "validation" };
  }
  if (!response.ok) {
    return { status: "unavailable" };
  }
  const note = asNote(await readJson(response));
  return note ? { status: "saved", note } : { status: "unavailable" };
}

/** Hide a note from retrieve and Ask immediately. */
export async function softDeleteNote(
  noteId: string,
  jar: ApiJar = {},
  workspaceSelector?: string,
): Promise<NoteDeleteOutcome> {
  const response = await sendApiRequest(`${notePath(noteId)}/soft-delete`, {
    method: "POST",
    jar,
    workspaceSelector,
  });
  if (!response) {
    return { status: "unavailable" };
  }
  if (response.status === 204) {
    return { status: "deleted" };
  }
  if (response.status === 401) {
    return { status: "unauthorized" };
  }
  if (response.status === 403) {
    return { status: "forbidden" };
  }
  if (response.status === 404) {
    return { status: "not_found" };
  }
  return { status: "unavailable" };
}

/** List the notes in a workspace. */
export async function listNotes(
  workspaceId: string,
  jar: ApiJar = {},
  options: { limit?: number; cursor?: string } = {},
): Promise<NoteListOutcome> {
  const query = new URLSearchParams();
  if (options.limit !== undefined) {
    query.set("limit", String(options.limit));
  }
  if (options.cursor) {
    query.set("cursor", options.cursor);
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : "";

  const response = await sendApiRequest(`${workspaceNotesPath(workspaceId)}${suffix}`, {
    method: "GET",
    jar,
    workspaceSelector: workspaceId,
  });
  if (!response) {
    return { status: "unavailable" };
  }
  if (response.status === 401) {
    return { status: "unauthorized" };
  }
  if (response.status === 403) {
    return { status: "forbidden" };
  }
  if (!response.ok) {
    return { status: "unavailable" };
  }
  const page = asNotePage(await readJson(response));
  return page ? { status: "listed", ...page } : { status: "unavailable" };
}

/**
 * Enqueue one file for ingestion.
 *
 * Each call is one job, so each imported file keeps its own status — a batch
 * endpoint would let one failure hide behind its siblings' success.
 */
export async function enqueueImport(
  workspaceId: string,
  file: File,
  jar: ApiJar = {},
): Promise<ImportEnqueueOutcome> {
  const form = new FormData();
  form.set("file", file);
  form.set("fileName", file.name);
  if (file.type) {
    form.set("mediaType", file.type);
  }

  const response = await sendApiRequest(INGESTION_JOBS_PATH, {
    method: "POST",
    jar,
    body: form,
    workspaceSelector: workspaceId,
  });
  if (!response) {
    return { status: "unavailable" };
  }
  if (response.status === 401) {
    return { status: "unauthorized" };
  }
  if (response.status === 403) {
    return { status: "forbidden" };
  }
  if (response.status === 415) {
    return { status: "unsupported_type" };
  }
  if (response.status === 413) {
    return { status: "too_large" };
  }
  if (!response.ok) {
    return { status: "unavailable" };
  }
  const job = asIngestionJob(await readJson(response));
  return job ? { status: "queued", job } : { status: "unavailable" };
}

/** Read one ingestion job's progress. */
export async function readIngestionJob(
  jobId: string,
  jar: ApiJar = {},
  workspaceSelector?: string,
): Promise<IngestionJobOutcome> {
  const response = await sendApiRequest(
    `${INGESTION_JOBS_PATH}/${encodeURIComponent(jobId)}`,
    { method: "GET", jar, workspaceSelector },
  );
  if (!response) {
    return { status: "unavailable" };
  }
  if (response.status === 401) {
    return { status: "unauthorized" };
  }
  if (response.status === 403) {
    return { status: "forbidden" };
  }
  if (response.status === 404) {
    return { status: "not_found" };
  }
  if (!response.ok) {
    return { status: "unavailable" };
  }
  const job = asIngestionJob(await readJson(response));
  return job ? { status: "job", job } : { status: "unavailable" };
}
