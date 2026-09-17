package com.omnidoc.api.domain;

import java.time.Instant;
import java.util.Optional;

import com.omnidoc.api.domain.AccessContext.TenantActor;

public final class UsageModels {
	private UsageModels() { }
	public record UsagePeriod(Optional<Instant> from, Optional<Instant> to) { }
	public record UsageRequest(TenantActor actor, RuntimeMode mode, UsagePeriod period) { }
	public sealed interface UsageSnapshot permits UsageSnapshot.Available, UsageSnapshot.Unavailable {
		record Available(long inputTokens, long outputTokens, Optional<Long> remainingRequests) implements UsageSnapshot { }
		record Unavailable(String reason) implements UsageSnapshot { }
	}
	public sealed interface RemainingLimits permits RemainingLimits.Available, RemainingLimits.Unavailable {
		record Available(Optional<Long> requests, Optional<Long> tokens) implements RemainingLimits { }
		record Unavailable(String reason) implements RemainingLimits { }
	}
}
