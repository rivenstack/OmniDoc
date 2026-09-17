package com.omnidoc.api.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.Identifiers.VersionId;
import com.omnidoc.api.domain.Identifiers.WorkspaceId;

public final class NotesModels {
	private NotesModels() { }

	public record VersionToken(String value) { }
	public record NoteFields(String title, String bodyJson) { }
	public record Note(NoteId id, WorkspaceId workspaceId, VersionId versionId, NoteFields fields,
		Instant updatedAt, Optional<CorpusOwnership> corpusOwnership) { }
	public record CreateNote(TenantActor actor, WorkspaceId workspaceId, NoteFields fields,
		Optional<CorpusOwnership> corpusOwnership) { }
	public record UpdateNote(TenantActor actor, NoteId noteId, NoteFields fields, VersionToken expectedVersion) { }
	public record GetNote(TenantActor actor, NoteId noteId) { }
	public record ListNotes(TenantActor actor, WorkspaceId workspaceId, PageRequest page) { }
	public record DeleteNote(TenantActor actor, NoteId noteId) { }
	public record PageRequest(int limit, Optional<String> cursor) { }
	public record NotePage(List<Note> items, Optional<String> nextCursor) {
		public NotePage { items = List.copyOf(items); }
	}
}
