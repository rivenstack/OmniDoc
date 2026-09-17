package com.omnidoc.api.domain;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.omnidoc.api.domain.AccessContext.AclScope;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.Identifiers.ChunkId;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.Identifiers.VersionId;

public final class RetrievalModels {
	private RetrievalModels() { }

	public record Embedding(float[] vector, String modelId, int dimensions) {
		public Embedding { vector = vector.clone(); }
		@Override public float[] vector() { return vector.clone(); }
	}
	public record EmbedTexts(TenantActor actor, List<String> texts, String embeddingModelId, RuntimeMode mode) {
		public EmbedTexts { texts = List.copyOf(texts); }
	}
	public record EmbedChunks(TenantActor actor, List<ChunkId> chunkIds, String embeddingModelId, RuntimeMode mode) {
		public EmbedChunks { chunkIds = List.copyOf(chunkIds); }
	}
	public record EmbeddingBatch(List<Embedding> embeddings) {
		public EmbeddingBatch { embeddings = List.copyOf(embeddings); }
	}
	public record SearchFilters(Map<String, String> values) {
		public SearchFilters { values = Map.copyOf(values); }
	}
	public record VectorSearch(TenantActor actor, AclScope acl, float[] queryVector, int topK, SearchFilters filters) {
		public VectorSearch { queryVector = queryVector.clone(); }
		@Override public float[] queryVector() { return queryVector.clone(); }
	}
	public record TextSearch(TenantActor actor, AclScope acl, String query, int topK, SearchFilters filters) { }
	public record SearchHit(ChunkId chunkId, NoteId noteId, VersionId versionId, double score,
		String snippet, Optional<CorpusOwnership> corpusOwnership) { }
	public record SearchResults(List<SearchHit> hits, boolean degraded) {
		public SearchResults { hits = List.copyOf(hits); }
	}
}
