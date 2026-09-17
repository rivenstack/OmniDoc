package com.omnidoc.api.application.port;

import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.domain.RetrievalModels.SearchResults;
import com.omnidoc.api.domain.RetrievalModels.TextSearch;

public interface SearchPort {
	PortResult<SearchResults> lexicalSearch(TextSearch request);
	PortResult<SearchResults> hybridSearch(TextSearch request);
}
