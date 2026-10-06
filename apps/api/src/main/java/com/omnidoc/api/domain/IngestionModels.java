package com.omnidoc.api.domain;

import java.io.InputStream;
import java.util.List;

import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.Identifiers.ChunkId;
import com.omnidoc.api.domain.Identifiers.JobId;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.Identifiers.VersionId;
import com.omnidoc.api.domain.Identifiers.WorkspaceId;

public final class IngestionModels {
	private IngestionModels() { }

	public record ImportContent(InputStream bytes, String mediaType, String fileName) { }

	/**
	 * The workspace is the client's selector, re-bound server-side before any write
	 * (architecture.md §2). It is carried on the request so the adapter can re-check
	 * membership instead of inferring a workspace from the tenant.
	 */
	public record EnqueueImport(TenantActor actor, WorkspaceId workspaceId, ImportContent content) { }
	public record GetJob(TenantActor actor, WorkspaceId workspaceId, JobId jobId) { }
	public record ChunkVersion(TenantActor actor, NoteId noteId, VersionId versionId, String text) { }
	public record IngestionJob(JobId id, JobStatus status, int completedUnits, int totalUnits) { }
	public enum JobStatus { PENDING, RUNNING, READY, FAILED, PARTIAL }
	public record Chunk(ChunkId id, NoteId noteId, VersionId versionId, int startOffset, int endOffset, String text) { }
	public record ChunkSet(VersionId versionId, List<Chunk> chunks) {
		public ChunkSet { chunks = List.copyOf(chunks); }
	}
}
