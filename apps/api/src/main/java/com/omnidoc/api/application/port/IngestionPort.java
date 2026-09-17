package com.omnidoc.api.application.port;

import com.omnidoc.api.domain.IngestionModels.ChunkSet;
import com.omnidoc.api.domain.IngestionModels.ChunkVersion;
import com.omnidoc.api.domain.IngestionModels.EnqueueImport;
import com.omnidoc.api.domain.IngestionModels.GetJob;
import com.omnidoc.api.domain.IngestionModels.IngestionJob;
import com.omnidoc.api.domain.PortResult;

public interface IngestionPort {
	PortResult<IngestionJob> enqueueImport(EnqueueImport request);
	PortResult<IngestionJob> getJob(GetJob request);
	PortResult<ChunkSet> chunkVersion(ChunkVersion request);
}
