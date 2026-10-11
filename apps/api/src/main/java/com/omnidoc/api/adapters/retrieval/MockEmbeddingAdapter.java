package com.omnidoc.api.adapters.retrieval;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

import com.omnidoc.api.application.port.EmbeddingPort;
import com.omnidoc.api.application.port.RuntimeModePort;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.Identifiers.ChunkId;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.domain.RetrievalModels.EmbedChunks;
import com.omnidoc.api.domain.RetrievalModels.EmbedTexts;
import com.omnidoc.api.domain.RetrievalModels.Embedding;
import com.omnidoc.api.domain.RetrievalModels.EmbeddingBatch;
import com.omnidoc.api.domain.RuntimeModeModels.AssertModeAllowed;
import com.omnidoc.api.domain.RuntimeModeModels.Feature;
import com.omnidoc.api.persistence.TenantRlsSession;

/**
 * Deterministic Phase 1 embedding adapter (architecture.md §5.3).
 */
public class MockEmbeddingAdapter implements EmbeddingPort {

	public static final String MODEL_ID = "mock-embeddings-v1";
	public static final int DIMENSIONS = 16;
	public static final int MAX_CHARS = 4096;

	private final JdbcTemplate jdbcTemplate;
	private final TenantRlsSession rlsSession;
	private final TransactionTemplate transactionTemplate;
	private final RuntimeModePort runtimeModePort;

	public MockEmbeddingAdapter(
		JdbcTemplate jdbcTemplate,
		TenantRlsSession rlsSession,
		TransactionTemplate transactionTemplate,
		RuntimeModePort runtimeModePort) {
		this.jdbcTemplate = Objects.requireNonNull(jdbcTemplate, "jdbcTemplate");
		this.rlsSession = Objects.requireNonNull(rlsSession, "rlsSession");
		this.transactionTemplate = Objects.requireNonNull(transactionTemplate, "transactionTemplate");
		this.runtimeModePort = Objects.requireNonNull(runtimeModePort, "runtimeModePort");
	}

	@Override
	public PortResult<EmbeddingBatch> embedTexts(EmbedTexts request) {
		PortFailure validation = validateTextsRequest(request);
		if (validation != null) {
			return new PortResult.Failure<>(validation);
		}
		PortResult<?> allowed = this.runtimeModePort.assertModeAllowed(
			new AssertModeAllowed(request.actor(), request.mode(), Feature.EMBED));
		if (allowed instanceof PortResult.Failure<?> failure) {
			return new PortResult.Failure<>(((PortResult.Failure<?>) allowed).failure());
		}
		List<Embedding> embeddings = request.texts().stream()
			.map(text -> new Embedding(pseudoVector(text), MODEL_ID, DIMENSIONS))
			.toList();
		return new PortResult.Success<>(new EmbeddingBatch(embeddings));
	}

	@Override
	public PortResult<EmbeddingBatch> embedChunks(EmbedChunks request) {
		PortFailure validation = validateChunksRequest(request);
		if (validation != null) {
			return new PortResult.Failure<>(validation);
		}
		PortResult<?> allowed = this.runtimeModePort.assertModeAllowed(
			new AssertModeAllowed(request.actor(), request.mode(), Feature.EMBED));
		if (allowed instanceof PortResult.Failure<?> failure) {
			return new PortResult.Failure<>(((PortResult.Failure<?>) allowed).failure());
		}

		try {
			PortResult<EmbeddingBatch> result = this.transactionTemplate.execute(status ->
				this.rlsSession.callWithinActorAndTenant(
					request.actor().actorId().value(),
					request.actor().tenantId().value(),
					() -> persistChunkEmbeddings(request)));
			return Objects.requireNonNull(result, "transaction result");
		}
		catch (DataAccessException ex) {
			return failure(PortFailure.Code.UNAVAILABLE, "Embedding persistence is unavailable.");
		}
	}

	private PortResult<EmbeddingBatch> persistChunkEmbeddings(EmbedChunks request) {
		List<ChunkRow> rows = loadChunks(request.actor(), request.chunkIds());
		if (rows.size() != new LinkedHashSet<>(request.chunkIds()).size()) {
			return failure(PortFailure.Code.NOT_FOUND, "One or more chunks were not found for embedding.");
		}

		Map<String, ChunkRow> rowsById = new LinkedHashMap<>();
		for (ChunkRow row : rows) {
			rowsById.put(row.chunkId().value(), row);
		}

		List<Embedding> embeddings = new ArrayList<>(request.chunkIds().size());
		Set<String> persisted = new LinkedHashSet<>();
		for (ChunkId chunkId : request.chunkIds()) {
			ChunkRow row = rowsById.get(chunkId.value());
			if (row == null) {
				return failure(PortFailure.Code.NOT_FOUND, "One or more chunks were not found for embedding.");
			}
			Embedding embedding = new Embedding(pseudoVector(row.text()), MODEL_ID, DIMENSIONS);
			embeddings.add(embedding);
			if (persisted.add(row.chunkId().value())) {
				upsertEmbedding(row, embedding);
			}
		}
		return new PortResult.Success<>(new EmbeddingBatch(embeddings));
	}

	private List<ChunkRow> loadChunks(TenantActor actor, List<ChunkId> chunkIds) {
		if (chunkIds.isEmpty()) {
			return List.of();
		}
		List<ChunkId> distinctIds = List.copyOf(new LinkedHashSet<>(chunkIds));
		String placeholders = "?, ".repeat(distinctIds.size());
		String inClause = placeholders.substring(0, placeholders.length() - 2);
		List<Object> arguments = new ArrayList<>(distinctIds.size() + 1);
		arguments.add(actor.tenantId().value());
		arguments.addAll(distinctIds.stream().map(ChunkId::value).toList());
		return this.jdbcTemplate.query(
			"""
			SELECT c.chunk_id, c.tenant_id, c.workspace_id, c.note_id, c.version_id, c.text
			FROM chunks c
			JOIN notes n ON n.note_id = c.note_id AND n.tenant_id = c.tenant_id
			WHERE c.tenant_id = ?
				AND n.soft_deleted_at IS NULL
				AND c.chunk_id IN (%s)
			""".formatted(inClause),
			(rs, rowNum) -> new ChunkRow(
				new ChunkId(rs.getString("chunk_id")),
				rs.getString("tenant_id"),
				rs.getString("workspace_id"),
				rs.getString("note_id"),
				rs.getString("version_id"),
				rs.getString("text")),
			arguments.toArray());
	}

	private void upsertEmbedding(ChunkRow row, Embedding embedding) {
		String vector = vectorLiteral(embedding.vector());
		this.jdbcTemplate.update(connection -> prepareUpsert(connection, row, embedding, vector));
	}

	private PreparedStatement prepareUpsert(
		java.sql.Connection connection,
		ChunkRow row,
		Embedding embedding,
		String vectorLiteral) throws SQLException {
		PreparedStatement statement = connection.prepareStatement(
			"""
			INSERT INTO embeddings
				(chunk_id, tenant_id, workspace_id, note_id, version_id,
				 embedding_model_id, dimensions, embedding)
			VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS vector))
			ON CONFLICT (chunk_id) DO UPDATE
			SET tenant_id = EXCLUDED.tenant_id,
				workspace_id = EXCLUDED.workspace_id,
				note_id = EXCLUDED.note_id,
				version_id = EXCLUDED.version_id,
				embedding_model_id = EXCLUDED.embedding_model_id,
				dimensions = EXCLUDED.dimensions,
				embedding = EXCLUDED.embedding,
				updated_at = now()
			""");
		statement.setString(1, row.chunkId().value());
		statement.setString(2, row.tenantId());
		statement.setString(3, row.workspaceId());
		statement.setString(4, row.noteId());
		statement.setString(5, row.versionId());
		statement.setString(6, embedding.modelId());
		statement.setInt(7, embedding.dimensions());
		statement.setString(8, vectorLiteral);
		return statement;
	}

	private static PortFailure validateTextsRequest(EmbedTexts request) {
		if (request == null || request.actor() == null || request.mode() == null) {
			return PortFailure.of(PortFailure.Code.VALIDATION, "Actor and mode are required.");
		}
		if (!MODEL_ID.equals(request.embeddingModelId())) {
			return PortFailure.of(PortFailure.Code.INVALID_MODEL, "Unsupported embedding model.");
		}
		for (String text : request.texts()) {
			if (text == null) {
				return PortFailure.of(PortFailure.Code.VALIDATION, "Embedding text must not be null.");
			}
			if (text.length() > MAX_CHARS) {
				return PortFailure.of(PortFailure.Code.VALIDATION, "Embedding text exceeds the mock model limit.");
			}
		}
		return null;
	}

	private static PortFailure validateChunksRequest(EmbedChunks request) {
		if (request == null || request.actor() == null || request.mode() == null) {
			return PortFailure.of(PortFailure.Code.VALIDATION, "Actor and mode are required.");
		}
		if (!MODEL_ID.equals(request.embeddingModelId())) {
			return PortFailure.of(PortFailure.Code.INVALID_MODEL, "Unsupported embedding model.");
		}
		if (request.chunkIds().stream().anyMatch(Objects::isNull)) {
			return PortFailure.of(PortFailure.Code.VALIDATION, "Chunk ids must not contain null values.");
		}
		return null;
	}

	private static float[] pseudoVector(String text) {
		byte[] digest = sha256(text);
		float[] vector = new float[DIMENSIONS];
		for (int index = 0; index < DIMENSIONS; index++) {
			int hi = Byte.toUnsignedInt(digest[(index * 2) % digest.length]);
			int lo = Byte.toUnsignedInt(digest[(index * 2 + 1) % digest.length]);
			int raw = (hi << 8) | lo;
			vector[index] = (raw / 32767.5f) - 1.0f;
		}
		float norm = 0.0f;
		for (float value : vector) {
			norm += value * value;
		}
		norm = (float) Math.sqrt(norm);
		if (norm == 0.0f) {
			vector[0] = 1.0f;
			return vector;
		}
		for (int index = 0; index < vector.length; index++) {
			vector[index] = vector[index] / norm;
		}
		return vector;
	}

	private static byte[] sha256(String text) {
		try {
			return MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
		}
		catch (NoSuchAlgorithmException ex) {
			throw new IllegalStateException("SHA-256 must be available", ex);
		}
	}

	static String vectorLiteral(float[] vector) {
		StringBuilder builder = new StringBuilder("[");
		for (int index = 0; index < vector.length; index++) {
			if (index > 0) {
				builder.append(',');
			}
			builder.append(String.format(Locale.ROOT, "%.8f", vector[index]));
		}
		return builder.append(']').toString();
	}

	private static <T> PortResult<T> failure(PortFailure.Code code, String detail) {
		return new PortResult.Failure<>(PortFailure.of(code, detail));
	}

	private record ChunkRow(
		ChunkId chunkId,
		String tenantId,
		String workspaceId,
		String noteId,
		String versionId,
		String text) {
	}
}