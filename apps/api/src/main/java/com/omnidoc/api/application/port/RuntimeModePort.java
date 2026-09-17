package com.omnidoc.api.application.port;

import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.domain.RuntimeModeModels.AssertModeAllowed;
import com.omnidoc.api.domain.RuntimeModeModels.OutboundStamp;
import com.omnidoc.api.domain.RuntimeModeModels.ResolveMode;
import com.omnidoc.api.domain.RuntimeModeModels.ResolvedMode;
import com.omnidoc.api.domain.RuntimeModeModels.StampOutbound;

public interface RuntimeModePort {
	PortResult<ResolvedMode> resolveMode(ResolveMode request);
	PortResult<ResolvedMode> assertModeAllowed(AssertModeAllowed request);
	OutboundStamp stampOutbound(StampOutbound request);
}
