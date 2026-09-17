package com.omnidoc.api.application.port;

import com.omnidoc.api.domain.ExportModels.ExportBundle;
import com.omnidoc.api.domain.ExportModels.ExportNotes;
import com.omnidoc.api.domain.ExportModels.ExportWorkspace;
import com.omnidoc.api.domain.PortResult;

public interface ExportPort {
	PortResult<ExportBundle> exportWorkspace(ExportWorkspace request);
	PortResult<ExportBundle> exportNotes(ExportNotes request);
}
