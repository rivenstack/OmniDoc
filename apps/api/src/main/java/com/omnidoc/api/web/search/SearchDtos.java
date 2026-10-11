package com.omnidoc.api.web.search;

import java.util.List;
import java.util.Map;

/** S-02 search DTOs. The OpenAPI file remains the wire authority. */
public final class SearchDtos {

	private SearchDtos() {
	}

	public record SearchRequest(
		String query,
		Integer topK,
		Map<String, String> filters,
		String corpusOwnership) {
	}

	public record SearchHitResponse(
		String chunkId,
		String noteId,
		String versionId,
		double score,
		String snippet,
		String corpusOwnership) {
	}

	public record SearchResultsResponse(List<SearchHitResponse> hits, boolean degraded) {
		public SearchResultsResponse {
			hits = List.copyOf(hits);
		}
	}
}