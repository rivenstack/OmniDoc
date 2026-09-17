package com.omnidoc.api.domain;

import java.io.InputStream;
import java.util.List;

import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.Identifiers.ExportId;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.Identifiers.WorkspaceId;

public final class ExportModels {
	private ExportModels() { }
	public enum ExportFormat { JSON, ZIP }
	public record ExportWorkspace(TenantActor actor, WorkspaceId workspaceId, ExportFormat format) { }
	public record ExportNotes(TenantActor actor, List<NoteId> noteIds, ExportFormat format) {
		public ExportNotes { noteIds = List.copyOf(noteIds); }
	}
	public record ExportBundle(ExportId id, String mediaType, InputStream content) { }
}
