package com.omnidoc.api.application.port;

import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.domain.RetrievalModels.EmbedChunks;
import com.omnidoc.api.domain.RetrievalModels.EmbedTexts;
import com.omnidoc.api.domain.RetrievalModels.EmbeddingBatch;

public interface EmbeddingPort {
	PortResult<EmbeddingBatch> embedTexts(EmbedTexts request);
	PortResult<EmbeddingBatch> embedChunks(EmbedChunks request);
}
