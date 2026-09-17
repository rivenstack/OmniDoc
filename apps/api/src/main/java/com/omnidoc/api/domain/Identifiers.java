package com.omnidoc.api.domain;

import java.util.Objects;

public final class Identifiers {

	private Identifiers() {
	}

	public record TenantId(String value) { public TenantId { require(value); } }
	public record ActorId(String value) { public ActorId { require(value); } }
	public record WorkspaceId(String value) { public WorkspaceId { require(value); } }
	public record NoteId(String value) { public NoteId { require(value); } }
	public record VersionId(String value) { public VersionId { require(value); } }
	public record ChunkId(String value) { public ChunkId { require(value); } }
	public record JobId(String value) { public JobId { require(value); } }
	public record VaultRecordId(String value) { public VaultRecordId { require(value); } }
	public record ExportId(String value) { public ExportId { require(value); } }

	private static void require(String value) {
		if (Objects.requireNonNull(value, "value").isBlank()) {
			throw new IllegalArgumentException("value must not be blank");
		}
	}
}
