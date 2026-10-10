package com.omnidoc.api.adapters.ingestion;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;

import com.omnidoc.api.chunking.BlockPackChunker;
import com.omnidoc.api.chunking.ChunkDraft;
import com.omnidoc.api.chunking.ChunkPolicy;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.Identifiers.ChunkId;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.Identifiers.VersionId;
import com.omnidoc.api.domain.Identifiers.WorkspaceId;
import com.omnidoc.api.domain.IngestionModels.Chunk;
import com.omnidoc.api.domain.IngestionModels.ChunkSet;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.projection.Projection;
import com.omnidoc.api.projection.ProseMirrorMarkdownProjector;

/**
 * Writes the chunk set for one note version — the synchronous primitive behind
 * {@code IngestionPort.chunkVersion} and stage 4 of the runner.
 *
 * <p>The stored {@code note_versions.body_json} is the corpus authority, so the
 * projection is always taken from it; a caller-supplied text is verified against that
 * projection rather than trusted. The policy rule from architecture.md §5.2.1 §2 is
 * enforced here: same version + same {@code (projector_id, chunker_id, params_hash)} is
 * an idempotent no-op that returns the existing set, and a different policy is rejected
 * — B-05b never re-chunks a version in place.
 *
 * <p>Writes are safe to repeat: a reclaimed job re-running stage 4 hits the
 * {@code chunk_sets} primary key and the {@code (version_id, ordinal)} unique index
 * instead of double-inserting.
 */
public class VersionChunker {

	private final JdbcTemplate jdbcTemplate;
	private final IngestionJobRepository repository;
	private final ProseMirrorMarkdownProjector projector;
	private final BlockPackChunker chunker;

	public VersionChunker(
		JdbcTemplate jdbcTemplate,
		IngestionJobRepository repository,
		ProseMirrorMarkdownProjector projector,
		BlockPackChunker chunker) {
		this.jdbcTemplate = Objects.requireNonNull(jdbcTemplate, "jdbcTemplate");
		this.repository = Objects.requireNonNull(repository, "repository");
		this.projector = Objects.requireNonNull(projector, "projector");
		this.chunker = Objects.requireNonNull(chunker, "chunker");
	}

	/**
	 * @param workspaceSelector when present, must match the note's workspace — the IDOR
	 *     check for a client-supplied selector
	 * @param suppliedText optional {@code body_json} the caller believes the version
	 *     holds; a mismatch is a validation failure, never a silent overwrite
	 */
	public PortResult<Outcome> chunk(
		TenantActor actor,
		Optional<WorkspaceId> workspaceSelector,
		NoteId noteId,
		VersionId versionId,
		String suppliedText) {

		return this.repository.inActorAndTenant(actor, () -> {
			List<NoteRow> noteRows = this.jdbcTemplate.query(
				"SELECT workspace_id FROM notes WHERE tenant_id = ? AND note_id = ? AND soft_deleted_at IS NULL",
				(rs, rowNum) -> new NoteRow(new WorkspaceId(rs.getString("workspace_id"))),
				actor.tenantId().value(), noteId.value());
			if (noteRows.isEmpty()) {
				return failure(PortFailure.Code.NOT_FOUND, "Note was not found.");
			}
			WorkspaceId workspaceId = noteRows.getFirst().workspaceId();
			if (workspaceSelector.isPresent() && !workspaceSelector.orElseThrow().equals(workspaceId)) {
				return failure(PortFailure.Code.FORBIDDEN, "Note does not belong to the selected workspace.");
			}
			if (!this.repository.hasMembership(actor, workspaceId)) {
				return failure(PortFailure.Code.FORBIDDEN, "Workspace selector does not match session membership.");
			}

			List<String> bodies = this.jdbcTemplate.query(
				"""
				SELECT body_json::text AS body_json
				FROM note_versions
				WHERE tenant_id = ? AND note_id = ? AND version_id = ?
				""",
				(rs, rowNum) -> rs.getString("body_json"),
				actor.tenantId().value(), noteId.value(), versionId.value());
			if (bodies.isEmpty()) {
				return failure(PortFailure.Code.NOT_FOUND, "Note version was not found.");
			}

			Projection projection;
			try {
				projection = this.projector.project(bodies.getFirst());
			}
			catch (IllegalArgumentException ex) {
				return failure(PortFailure.Code.VALIDATION, "Stored note body is not a ProseMirror document.");
			}
			String projectionSha = ChunkPolicy.sha256Hex(projection.text());

			if (suppliedText != null && !suppliedText.isBlank()) {
				Projection supplied;
				try {
					supplied = this.projector.project(suppliedText);
				}
				catch (IllegalArgumentException ex) {
					return failure(PortFailure.Code.VALIDATION, "Supplied text is not a ProseMirror document.");
				}
				if (!ChunkPolicy.sha256Hex(supplied.text()).equals(projectionSha)) {
					return failure(
						PortFailure.Code.VALIDATION, "Supplied text does not match the stored note version.");
				}
			}

			ChunkPolicy policy = ChunkPolicy.frozen(ProseMirrorMarkdownProjector.PROJECTOR_ID);
			Optional<ChunkSetRow> existing = findChunkSet(actor, versionId);
			if (existing.isPresent()) {
				ChunkSetRow row = existing.orElseThrow();
				if (!policy.sameAs(row.projectorId(), row.chunkerId(), row.paramsHash())) {
					return failure(
						PortFailure.Code.CONFLICT,
						"This version already has a chunk set under a different policy.");
				}
				if (!row.projectionSha256().equals(projectionSha)) {
					return failure(
						PortFailure.Code.CONFLICT,
						"Stored chunk set does not match the current projection of this version.");
				}
				return new PortResult.Success<>(new Outcome(
					loadChunkSet(actor, noteId, versionId), projection.warnings(), false));
			}

			List<ChunkDraft> drafts = this.chunker.chunk(projection, versionId.value(), policy);
			int inserted = this.jdbcTemplate.update(
				"""
				INSERT INTO chunk_sets
					(version_id, tenant_id, projector_id, chunker_id, params_hash,
					 projection_sha256, chunk_count)
				VALUES (?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT (version_id) DO NOTHING
				""",
				versionId.value(), actor.tenantId().value(), policy.projectorId(), policy.chunkerId(),
				policy.paramsHash(), projectionSha, drafts.size());
			if (inserted == 0) {
				// Another runner persisted the same version first; its set is ours by policy.
				return new PortResult.Success<>(new Outcome(
					loadChunkSet(actor, noteId, versionId), projection.warnings(), false));
			}

			for (ChunkDraft draft : drafts) {
				this.jdbcTemplate.update(
					"""
					INSERT INTO chunks
						(chunk_id, tenant_id, workspace_id, note_id, version_id, ordinal,
						 start_block, end_block, start_offset, end_offset, text, text_sha256)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					""",
					draft.chunkId(), actor.tenantId().value(), workspaceId.value(), noteId.value(),
					versionId.value(), draft.ordinal(), draft.startBlock(), draft.endBlock(),
					draft.startOffset(), draft.endOffset(), draft.text(), draft.textSha256());
			}

			return new PortResult.Success<>(new Outcome(
				loadChunkSet(actor, noteId, versionId), projection.warnings(), true));
		});
	}

	private Optional<ChunkSetRow> findChunkSet(TenantActor actor, VersionId versionId) {
		List<ChunkSetRow> rows = this.jdbcTemplate.query(
			"""
			SELECT projector_id, chunker_id, params_hash, projection_sha256
			FROM chunk_sets
			WHERE tenant_id = ? AND version_id = ?
			FOR UPDATE
			""",
			(rs, rowNum) -> new ChunkSetRow(
				rs.getString("projector_id"), rs.getString("chunker_id"),
				rs.getString("params_hash"), rs.getString("projection_sha256")),
			actor.tenantId().value(), versionId.value());
		return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
	}

	private ChunkSet loadChunkSet(TenantActor actor, NoteId noteId, VersionId versionId) {
		List<Chunk> chunks = this.jdbcTemplate.query(
			"""
			SELECT chunk_id, start_offset, end_offset, text
			FROM chunks
			WHERE tenant_id = ? AND version_id = ?
			ORDER BY ordinal
			""",
			(rs, rowNum) -> new Chunk(
				new ChunkId(rs.getString("chunk_id")),
				noteId,
				versionId,
				rs.getInt("start_offset"),
				rs.getInt("end_offset"),
				rs.getString("text")),
			actor.tenantId().value(), versionId.value());
		return new ChunkSet(versionId, new ArrayList<>(chunks));
	}

	private static PortResult<Outcome> failure(PortFailure.Code code, String detail) {
		return new PortResult.Failure<>(PortFailure.of(code, detail));
	}

	/**
	 * @param warnings projection warnings — content that degraded to plain text; a
	 *     non-empty list makes a runner job {@code partial}
	 * @param created {@code false} when an existing set was returned unchanged
	 */
	public record Outcome(ChunkSet chunkSet, List<String> warnings, boolean created) {

		public Outcome {
			Objects.requireNonNull(chunkSet, "chunkSet");
			warnings = List.copyOf(warnings);
		}
	}

	private record NoteRow(WorkspaceId workspaceId) {
	}

	private record ChunkSetRow(
		String projectorId, String chunkerId, String paramsHash, String projectionSha256) {
	}
}
