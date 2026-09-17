package com.omnidoc.api.application.port;

import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.domain.UsageModels.RemainingLimits;
import com.omnidoc.api.domain.UsageModels.UsageRequest;
import com.omnidoc.api.domain.UsageModels.UsageSnapshot;

public interface UsagePort {
	PortResult<UsageSnapshot> getUsage(UsageRequest request);
	PortResult<RemainingLimits> getRemainingLimits(UsageRequest request);
}
