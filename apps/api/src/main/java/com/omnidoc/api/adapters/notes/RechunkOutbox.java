package com.omnidoc.api.adapters.notes;

import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.Identifiers.WorkspaceId;

/**
 * What the notes adapter needs from the ingestion side, declared here so notes does not
 * depend on ingestion (architecture.md §5.2.1 §4 note-save hook).
 *
 * <p>Both calls run inside the caller's note transaction: a committed version always
 * leaves a queued rechunk behind, and a purge removes the note's corpus in the same
 * breath as the note.
 */
public interface RechunkOutbox {

	/** No ingestion wired (default profile, focused tests): note writes behave as before. */
	RechunkOutbox NOOP = new RechunkOutbox() {

		@Override
		public void noteCommitted(TenantActor actor, WorkspaceId workspaceId, NoteId noteId) {
		}

		@Override
		public void notePurged(TenantActor actor, NoteId noteId) {
		}
	};

	/**
	 * Queue a coalesced rechunk for a note whose current version just changed. Autosave
	 * must not block on chunking, so this only enqueues.
	 */
	void noteCommitted(TenantActor actor, WorkspaceId workspaceId, NoteId noteId);

	/** Remove chunks and ingestion jobs for a note being purged. */
	void notePurged(TenantActor actor, NoteId noteId);
}
