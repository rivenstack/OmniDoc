package com.omnidoc.api.adapters.retrieval;

import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;

import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

import com.omnidoc.api.application.port.VectorSearchPort;
import com.omnidoc.api.domain.AccessContext.AclScope;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.CorpusOwnership;
import com.omnidoc.api.domain.Identifiers.ChunkId;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.Identifiers.VersionId;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.domain.RetrievalModels.SearchHit;
import com.omnidoc.api.domain.RetrievalModels.SearchResults;
import com.omnidoc.api.domain.RetrievalModels.VectorSearch;
import com.omnidoc.api.persistence.TenantRlsSession;

/**
 * Tenant- and workspace-scoped pgvector similarity search (architecture.md §5.4).
 */
public class JdbcVectorSearchAdapter implements VectorSearchPort {

	public static final String FILTER_EMBEDDING_MODEL_ID = "embedding_model_id";
	public static final String FILTER_EMBEDDING_DIMENSIONS = "dimensions";

	private final JdbcTemplate jdbcTemplate;
	private final TenantRlsSession rlsSession;
	private final TransactionTemplate transactionTemplate;

	public JdbcVectorSearchAdapter(
		JdbcTemplate jdbcTemplate,
		TenantRlsSession rlsSession,
		TransactionTemplate transactionTemplate) {
		this.jdbcTemplate = Objects.requireNonNull(jdbcTemplate, "jdbcTemplate");
		this.rlsSession = Objects.requireNonNull(rlsSession, "rlsSession");
		this.transactionTemplate = Objects.requireNonNull(transactionTemplate, "transactionTemplate");
	}

	@Override
	public PortResult<SearchResults> similaritySearch(VectorSearch request) {
		PortFailure validation = validate(request);
		if (validation != null) {
			return new PortResult.Failure<>(validation);
		}

		try {
			PortResult<SearchResults> result = this.transactionTemplate.execute(status ->
				this.rlsSession.callWithinActorAndTenant(
					request.actor().actorId().value(),
					request.actor().tenantId().value(),
					() -> runSearch(request)));
			return Objects.requireNonNull(result, "transaction result");
		}
		catch (DataAccessException ex) {
			return failure(PortFailure.Code.UNAVAILABLE, "Vector search is unavailable.");
		}
	}

	private PortResult<SearchResults> runSearch(VectorSearch request) {
		if (!hasMembership(request.actor(), request.acl())) {
			return failure(PortFailure.Code.FORBIDDEN, "Workspace scope does not match session membership.");
		}
		EmbeddingSelection selection = resolveSelection(request);

		String vectorLiteral = MockEmbeddingAdapter.vectorLiteral(request.queryVector());
		List<SearchHit> hits = this.jdbcTemplate.query(
			"""
			SELECT e.chunk_id, e.note_id, e.version_id, c.text, n.corpus_ownership,
				1 - (e.embedding <=> CAST(? AS vector)) AS score
			FROM embeddings e
			JOIN chunks c ON c.chunk_id = e.chunk_id AND c.tenant_id = e.tenant_id
			JOIN notes n ON n.note_id = e.note_id AND n.tenant_id = e.tenant_id
			WHERE e.tenant_id = ?
				AND e.workspace_id = ?
				AND e.embedding_model_id = ?
				AND e.dimensions = ?
				AND n.soft_deleted_at IS NULL
				AND n.current_version_id = e.version_id
			ORDER BY e.embedding <=> CAST(? AS vector), e.chunk_id
			LIMIT ?
			""",
			(rs, rowNum) -> new SearchHit(
				new ChunkId(rs.getString("chunk_id")),
				new NoteId(rs.getString("note_id")),
				new VersionId(rs.getString("version_id")),
				rs.getDouble("score"),
				rs.getString("text"),
				Optional.ofNullable(rs.getString("corpus_ownership"))
					.map(value -> CorpusOwnership.valueOf(value.toUpperCase(Locale.ROOT)))) ,
			vectorLiteral,
			request.actor().tenantId().value(),
			request.acl().workspaceId().value(),
			selection.modelId(),
			selection.dimensions(),
			vectorLiteral,
			request.topK());
		return new PortResult.Success<>(new SearchResults(hits, false));
	}

	private boolean hasMembership(TenantActor actor, AclScope acl) {
		Boolean allowed = this.jdbcTemplate.queryForObject(
			"""
			SELECT EXISTS (
				SELECT 1 FROM workspace_memberships
				WHERE tenant_id = ? AND workspace_id = ? AND actor_id = ?
			)
			""",
			Boolean.class,
			actor.tenantId().value(),
			acl.workspaceId().value(),
			actor.actorId().value());
		return Boolean.TRUE.equals(allowed) && !acl.permissions().isEmpty();
	}

	private static PortFailure validate(VectorSearch request) {
		if (request == null || request.actor() == null || request.acl() == null || request.queryVector() == null) {
			return PortFailure.of(PortFailure.Code.VALIDATION, "Actor, ACL scope, and query vector are required.");
		}
		if (request.topK() <= 0) {
			return PortFailure.of(PortFailure.Code.VALIDATION, "topK must be greater than zero.");
		}
		if (request.queryVector().length <= 0) {
			return PortFailure.of(PortFailure.Code.VALIDATION, "Query vector must not be empty.");
		}
		double norm = 0.0d;
		for (float value : request.queryVector()) {
			if (!Float.isFinite(value)) {
				return PortFailure.of(PortFailure.Code.VALIDATION, "Query vector must contain only finite values.");
			}
			norm += value * value;
		}
		if (norm == 0.0d) {
			return PortFailure.of(PortFailure.Code.VALIDATION, "Query vector must not be all zeros.");
		}
		PortFailure selectionFailure = validateSelection(request);
		if (selectionFailure != null) {
			return selectionFailure;
		}
		return null;
	}

	private static PortFailure validateSelection(VectorSearch request) {
		String requestedModel = request.filters().values().get(FILTER_EMBEDDING_MODEL_ID);
		if (requestedModel != null && requestedModel.isBlank()) {
			return PortFailure.of(PortFailure.Code.VALIDATION, "Embedding model filter must not be blank.");
		}
		String requestedDimensions = request.filters().values().get(FILTER_EMBEDDING_DIMENSIONS);
		if (requestedDimensions == null) {
			return null;
		}
		try {
			int parsed = Integer.parseInt(requestedDimensions);
			if (parsed != request.queryVector().length) {
				return PortFailure.of(PortFailure.Code.VALIDATION, "Embedding dimension filter must match the query vector length.");
			}
		}
		catch (NumberFormatException ex) {
			return PortFailure.of(PortFailure.Code.VALIDATION, "Embedding dimension filter must be an integer.");
		}
		return null;
	}

	private static EmbeddingSelection resolveSelection(VectorSearch request) {
		String modelId = request.filters().values().getOrDefault(
			FILTER_EMBEDDING_MODEL_ID,
			MockEmbeddingAdapter.MODEL_ID);
		String requestedDimensions = request.filters().values().get(FILTER_EMBEDDING_DIMENSIONS);
		int dimensions = requestedDimensions == null
			? request.queryVector().length
			: Integer.parseInt(requestedDimensions);
		return new EmbeddingSelection(modelId, dimensions);
	}

	private static <T> PortResult<T> failure(PortFailure.Code code, String detail) {
		return new PortResult.Failure<>(PortFailure.of(code, detail));
	}

	private record EmbeddingSelection(String modelId, int dimensions) {
	}
}