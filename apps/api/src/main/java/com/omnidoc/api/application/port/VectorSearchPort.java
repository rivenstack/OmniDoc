package com.omnidoc.api.application.port;

import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.domain.RetrievalModels.SearchResults;
import com.omnidoc.api.domain.RetrievalModels.VectorSearch;

public interface VectorSearchPort {
	PortResult<SearchResults> similaritySearch(VectorSearch request);
}
