package com.omnidoc.api.adapters.ingestion;

import java.util.Objects;

import com.omnidoc.api.adapters.notes.RechunkOutbox;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.Identifiers.WorkspaceId;

/**
 * Note-save hook from architecture.md §5.2.1 §4. The outbox row is written in the note's
 * own transaction, so a committed version and its queued rechunk can never disagree; the
 * partial unique index on {@code (note_id) WHERE kind='rechunk' AND status='pending'}
 * coalesces a burst of autosaves into one job.
 *
 * <p>The runner resolves {@code notes.current_version_id} at claim time, which is why
 * intermediate autosave versions may legitimately end up with no chunks.
 */
public class JdbcRechunkOutbox implements RechunkOutbox {

	private final IngestionJobRepository repository;
	private final IngestionDispatcher dispatcher;

	public JdbcRechunkOutbox(IngestionJobRepository repository, IngestionDispatcher dispatcher) {
		this.repository = Objects.requireNonNull(repository, "repository");
		this.dispatcher = Objects.requireNonNull(dispatcher, "dispatcher");
	}

	@Override
	public void noteCommitted(TenantActor actor, WorkspaceId workspaceId, NoteId noteId) {
		this.repository.enqueueRechunk(actor, workspaceId, noteId);
		// Even when an existing pending row absorbed this save, nudging the runner is
		// correct: that row may already be claimable.
		this.dispatcher.dispatchAfterCommit();
	}

	@Override
	public void notePurged(TenantActor actor, NoteId noteId) {
		this.repository.deleteForNote(actor, noteId);
	}
}
