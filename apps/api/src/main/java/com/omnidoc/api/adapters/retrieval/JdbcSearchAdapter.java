package com.omnidoc.api.adapters.retrieval;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

import com.omnidoc.api.application.port.EmbeddingPort;
import com.omnidoc.api.application.port.SearchPort;
import com.omnidoc.api.application.port.VectorSearchPort;
import com.omnidoc.api.domain.AccessContext.AclScope;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.CorpusOwnership;
import com.omnidoc.api.domain.Identifiers.ChunkId;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.Identifiers.VersionId;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.domain.RetrievalModels.EmbedTexts;
import com.omnidoc.api.domain.RetrievalModels.SearchFilters;
import com.omnidoc.api.domain.RetrievalModels.SearchHit;
import com.omnidoc.api.domain.RetrievalModels.SearchResults;
import com.omnidoc.api.domain.RetrievalModels.TextSearch;
import com.omnidoc.api.domain.RetrievalModels.VectorSearch;
import com.omnidoc.api.domain.RuntimeMode;
import com.omnidoc.api.persistence.TenantRlsSession;

/**
 * PostgreSQL lexical search plus deterministic hybrid fusion over the B-06 vector path.
 */
public class JdbcSearchAdapter implements SearchPort {

	public static final String FILTER_CORPUS_OWNERSHIP = "corpus_ownership";

	private static final int MAX_TOP_K = 100;
	private static final int SNIPPET_RADIUS = 72;
	private static final int MAX_SNIPPET_CHARS = 220;
	private static final int RRF_K = 60;

	private final JdbcTemplate jdbcTemplate;
	private final TenantRlsSession rlsSession;
	private final TransactionTemplate transactionTemplate;
	private final EmbeddingPort embeddingPort;
	private final VectorSearchPort vectorSearchPort;

	public JdbcSearchAdapter(
		JdbcTemplate jdbcTemplate,
		TenantRlsSession rlsSession,
		TransactionTemplate transactionTemplate,
		EmbeddingPort embeddingPort,
		VectorSearchPort vectorSearchPort) {
		this.jdbcTemplate = Objects.requireNonNull(jdbcTemplate, "jdbcTemplate");
		this.rlsSession = Objects.requireNonNull(rlsSession, "rlsSession");
		this.transactionTemplate = Objects.requireNonNull(transactionTemplate, "transactionTemplate");
		this.embeddingPort = Objects.requireNonNull(embeddingPort, "embeddingPort");
		this.vectorSearchPort = Objects.requireNonNull(vectorSearchPort, "vectorSearchPort");
	}

	@Override
	public PortResult<SearchResults> lexicalSearch(TextSearch request) {
		PortFailure validation = validate(request, false);
		if (validation != null) {
			return new PortResult.Failure<>(validation);
		}

		Optional<CorpusOwnership> ownership = resolveOwnership(request.filters());
		if (ownership == null) {
			return failure(PortFailure.Code.VALIDATION, "corpusOwnership must be sample or mine.");
		}

		try {
			PortResult<SearchResults> result = this.transactionTemplate.execute(status ->
				this.rlsSession.callWithinActorAndTenant(
					request.actor().actorId().value(),
					request.actor().tenantId().value(),
					() -> runLexical(request, ownership)));
			return Objects.requireNonNull(result, "transaction result");
		}
		catch (DataAccessException ex) {
			return failure(PortFailure.Code.UNAVAILABLE, "Lexical search is unavailable.");
		}
	}

	@Override
	public PortResult<SearchResults> hybridSearch(TextSearch request) {
		PortFailure validation = validate(request, true);
		if (validation != null) {
			return new PortResult.Failure<>(validation);
		}

		Optional<CorpusOwnership> ownership = resolveOwnership(request.filters());
		if (ownership == null) {
			return failure(PortFailure.Code.VALIDATION, "corpusOwnership must be sample or mine.");
		}

		PortResult<SearchResults> lexical = lexicalSearch(request);
		if (lexical instanceof PortResult.Failure<SearchResults> failure) {
			return new PortResult.Failure<>(failure.failure());
		}

		PortResult<com.omnidoc.api.domain.RetrievalModels.EmbeddingBatch> embeddingBatch = this.embeddingPort.embedTexts(
			new EmbedTexts(
				request.actor(),
				List.of(request.query()),
				MockEmbeddingAdapter.MODEL_ID,
				RuntimeMode.MOCK));
		if (embeddingBatch instanceof PortResult.Failure<com.omnidoc.api.domain.RetrievalModels.EmbeddingBatch> failure) {
			return new PortResult.Failure<>(failure.failure());
		}

		float[] queryVector = ((PortResult.Success<com.omnidoc.api.domain.RetrievalModels.EmbeddingBatch>) embeddingBatch)
			.value()
			.embeddings()
			.getFirst()
			.vector();
		PortResult<SearchResults> vector = this.vectorSearchPort.similaritySearch(new VectorSearch(
			request.actor(),
			request.acl(),
			queryVector,
			request.topK(),
			vectorFilters()));
		if (vector instanceof PortResult.Failure<SearchResults> failure) {
			return new PortResult.Failure<>(failure.failure());
		}

		SearchResults lexicalResults = ((PortResult.Success<SearchResults>) lexical).value();
		SearchResults vectorResults = ((PortResult.Success<SearchResults>) vector).value();
		return new PortResult.Success<>(fuse(request, ownership, lexicalResults, vectorResults));
	}

	private PortResult<SearchResults> runLexical(TextSearch request, Optional<CorpusOwnership> ownership) {
		if (!hasMembership(request.actor(), request.acl())) {
			return failure(PortFailure.Code.FORBIDDEN, "Workspace scope does not match session membership.");
		}

		List<Object> arguments = new ArrayList<>();
		arguments.add(request.query());
		arguments.add(request.actor().tenantId().value());
		arguments.add(request.acl().workspaceId().value());
		String ownershipClause = "";
		if (ownership.isPresent()) {
			ownershipClause = " AND n.corpus_ownership = ?";
			arguments.add(ownership.get().name().toLowerCase(Locale.ROOT));
		}
		arguments.add(request.topK());
		List<SearchCandidate> hits = this.jdbcTemplate.query(
			"""
			WITH query AS (
				SELECT websearch_to_tsquery('english', ?) AS terms
			), ranked AS (
				SELECT c.chunk_id, c.note_id, c.version_id, c.text, n.corpus_ownership,
					ts_rank_cd(to_tsvector('english', c.text), query.terms) AS score
				FROM chunks c
				JOIN notes n ON n.note_id = c.note_id AND n.tenant_id = c.tenant_id
				CROSS JOIN query
				WHERE c.tenant_id = ?
					AND c.workspace_id = ?
					AND n.soft_deleted_at IS NULL
					AND n.current_version_id = c.version_id
					AND to_tsvector('english', c.text) @@ query.terms
					%s
				ORDER BY score DESC, c.chunk_id
				LIMIT ?
			)
			SELECT chunk_id, note_id, version_id, text, corpus_ownership, score
			FROM ranked
			ORDER BY score DESC, chunk_id
			""".formatted(ownershipClause),
			(rs, rowNum) -> new SearchCandidate(
				new ChunkId(rs.getString("chunk_id")),
				new NoteId(rs.getString("note_id")),
				new VersionId(rs.getString("version_id")),
				rs.getDouble("score"),
				rs.getString("text"),
				Optional.ofNullable(rs.getString("corpus_ownership"))
					.map(value -> CorpusOwnership.valueOf(value.toUpperCase(Locale.ROOT)))),
			arguments.toArray());

		List<SearchHit> mapped = hits.stream()
			.map(candidate -> candidate.toHit(request.query()))
			.toList();
		return new PortResult.Success<>(new SearchResults(mapped, false));
	}

	private SearchResults fuse(
		TextSearch request,
		Optional<CorpusOwnership> ownership,
		SearchResults lexical,
		SearchResults vector) {
		Map<String, HybridCandidate> byChunkId = new LinkedHashMap<>();
		for (int index = 0; index < lexical.hits().size(); index++) {
			SearchHit hit = lexical.hits().get(index);
			byChunkId.computeIfAbsent(hit.chunkId().value(), ignored -> HybridCandidate.from(hit, request.query()))
				.registerLexical(index + 1, hit.score());
		}
		for (int index = 0; index < vector.hits().size(); index++) {
			SearchHit hit = vector.hits().get(index);
			if (ownership.isPresent() && !ownership.equals(hit.corpusOwnership())) {
				continue;
			}
			byChunkId.computeIfAbsent(hit.chunkId().value(), ignored -> HybridCandidate.from(hit, request.query()))
				.registerVector(index + 1, hit.score(), request.query());
		}

		List<SearchHit> hits = byChunkId.values().stream()
			.sorted(Comparator
				.comparingDouble(HybridCandidate::combinedScore).reversed()
				.thenComparingInt(HybridCandidate::lexicalRank)
				.thenComparingInt(HybridCandidate::vectorRank)
				.thenComparing(HybridCandidate::chunkId))
			.limit(request.topK())
			.map(HybridCandidate::toHit)
			.toList();
		return new SearchResults(hits, false);
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

	private static PortFailure validate(TextSearch request, boolean hybrid) {
		if (request == null || request.actor() == null || request.acl() == null || request.filters() == null) {
			return PortFailure.of(PortFailure.Code.VALIDATION, "Actor, ACL scope, and filters are required.");
		}
		if (request.query() == null || request.query().isBlank()) {
			return PortFailure.of(PortFailure.Code.VALIDATION, "query is required.");
		}
		if (request.topK() <= 0 || request.topK() > MAX_TOP_K) {
			return PortFailure.of(PortFailure.Code.VALIDATION, "topK must be between 1 and 100.");
		}
		Optional<CorpusOwnership> ownership = resolveOwnership(request.filters());
		if (ownership == null) {
			return PortFailure.of(PortFailure.Code.VALIDATION, "corpusOwnership must be sample or mine.");
		}
		if (!hybrid) {
			return null;
		}
		String requestedModel = request.filters().values().get(JdbcVectorSearchAdapter.FILTER_EMBEDDING_MODEL_ID);
		if (requestedModel != null && !MockEmbeddingAdapter.MODEL_ID.equals(requestedModel)) {
			return PortFailure.of(PortFailure.Code.INVALID_MODEL,
				"Hybrid search only supports the mock embedding tuple in Phase 1.");
		}
		String requestedDimensions = request.filters().values().get(JdbcVectorSearchAdapter.FILTER_EMBEDDING_DIMENSIONS);
		if (requestedDimensions == null) {
			return null;
		}
		try {
			int dimensions = Integer.parseInt(requestedDimensions);
			if (dimensions != MockEmbeddingAdapter.DIMENSIONS) {
				return PortFailure.of(PortFailure.Code.INVALID_MODEL,
					"Hybrid search only supports the mock embedding tuple in Phase 1.");
			}
		}
		catch (NumberFormatException ex) {
			return PortFailure.of(PortFailure.Code.VALIDATION, "Embedding dimension filter must be an integer.");
		}
		return null;
	}

	private static Optional<CorpusOwnership> resolveOwnership(SearchFilters filters) {
		String value = filters.values().get(FILTER_CORPUS_OWNERSHIP);
		if (value == null) {
			return Optional.empty();
		}
		return switch (value.toLowerCase(Locale.ROOT)) {
			case "sample" -> Optional.of(CorpusOwnership.SAMPLE);
			case "mine" -> Optional.of(CorpusOwnership.MINE);
			default -> null;
		};
	}

	private static SearchFilters vectorFilters() {
		return new SearchFilters(Map.of(
			JdbcVectorSearchAdapter.FILTER_EMBEDDING_MODEL_ID, MockEmbeddingAdapter.MODEL_ID,
			JdbcVectorSearchAdapter.FILTER_EMBEDDING_DIMENSIONS, String.valueOf(MockEmbeddingAdapter.DIMENSIONS)));
	}

	private static String snippet(String text, String query) {
		String flattened = text.replaceAll("\\s+", " ").trim();
		if (flattened.length() <= MAX_SNIPPET_CHARS) {
			return flattened;
		}
		String lowerText = flattened.toLowerCase(Locale.ROOT);
		String lowerQuery = query.toLowerCase(Locale.ROOT).trim();
		int matchIndex = lowerText.indexOf(lowerQuery);
		if (matchIndex < 0) {
			for (String token : lowerQuery.split("[^\\p{Alnum}_./:-]+")) {
				if (token.isBlank()) {
					continue;
				}
				matchIndex = lowerText.indexOf(token);
				if (matchIndex >= 0) {
					break;
				}
			}
		}
		if (matchIndex < 0) {
			return flattened.substring(0, MAX_SNIPPET_CHARS - 4).trim() + " ...";
		}
		int start = Math.max(0, matchIndex - SNIPPET_RADIUS);
		int end = Math.min(flattened.length(), start + MAX_SNIPPET_CHARS);
		if (end - start < MAX_SNIPPET_CHARS && start > 0) {
			start = Math.max(0, end - MAX_SNIPPET_CHARS);
		}
		String prefix = start > 0 ? "... " : "";
		String suffix = end < flattened.length() ? " ..." : "";
		return prefix + flattened.substring(start, end).trim() + suffix;
	}

	private static <T> PortResult<T> failure(PortFailure.Code code, String detail) {
		return new PortResult.Failure<>(PortFailure.of(code, detail));
	}

	private record SearchCandidate(
		ChunkId chunkId,
		NoteId noteId,
		VersionId versionId,
		double score,
		String text,
		Optional<CorpusOwnership> corpusOwnership) {

		private SearchHit toHit(String query) {
			return new SearchHit(chunkId, noteId, versionId, score, snippet(text, query), corpusOwnership);
		}
	}

	private static final class HybridCandidate {
		private final ChunkId chunkId;
		private final NoteId noteId;
		private final VersionId versionId;
		private final Optional<CorpusOwnership> corpusOwnership;
		private final String query;
		private String rawText;
		private double lexicalScore;
		private double vectorScore;
		private int lexicalRank = Integer.MAX_VALUE;
		private int vectorRank = Integer.MAX_VALUE;

		private HybridCandidate(
			ChunkId chunkId,
			NoteId noteId,
			VersionId versionId,
			Optional<CorpusOwnership> corpusOwnership,
			String query,
			String rawText) {
			this.chunkId = chunkId;
			this.noteId = noteId;
			this.versionId = versionId;
			this.corpusOwnership = corpusOwnership;
			this.query = query;
			this.rawText = rawText;
		}

		private static HybridCandidate from(SearchHit hit, String query) {
			return new HybridCandidate(
				hit.chunkId(),
				hit.noteId(),
				hit.versionId(),
				hit.corpusOwnership(),
				query,
				hit.snippet().isBlank() ? query : hit.snippet());
		}

		private void registerLexical(int rank, double score) {
			this.lexicalRank = Math.min(this.lexicalRank, rank);
			this.lexicalScore = Math.max(this.lexicalScore, score);
		}

		private void registerVector(int rank, double score, String query) {
			this.vectorRank = Math.min(this.vectorRank, rank);
			this.vectorScore = Math.max(this.vectorScore, score);
			if (this.rawText == null || this.rawText.isBlank() || this.rawText.equals(query)) {
				this.rawText = this.rawText == null || this.rawText.isBlank() ? query : this.rawText;
			}
		}

		private double combinedScore() {
			double combined = 0.0d;
			if (this.lexicalRank != Integer.MAX_VALUE) {
				combined += 1.0d / (RRF_K + this.lexicalRank);
			}
			if (this.vectorRank != Integer.MAX_VALUE) {
				combined += 1.0d / (RRF_K + this.vectorRank);
			}
			return combined;
		}

		private int lexicalRank() {
			return this.lexicalRank;
		}

		private int vectorRank() {
			return this.vectorRank;
		}

		private String chunkId() {
			return this.chunkId.value();
		}

		private SearchHit toHit() {
			return new SearchHit(
				this.chunkId,
				this.noteId,
				this.versionId,
				combinedScore(),
				snippet(this.rawText, this.query),
				this.corpusOwnership);
		}
	}
}