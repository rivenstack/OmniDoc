package com.omnidoc.api.adapters.answer;

import java.util.Optional;

import com.omnidoc.api.adapters.retrieval.MockRuntimeModeAdapter;
import com.omnidoc.api.application.port.RuntimeModePort;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.domain.RuntimeMode;
import com.omnidoc.api.domain.RuntimeModeModels.AssertModeAllowed;
import com.omnidoc.api.domain.RuntimeModeModels.Feature;
import com.omnidoc.api.domain.RuntimeModeModels.OutboundStamp;
import com.omnidoc.api.domain.RuntimeModeModels.ResolveMode;
import com.omnidoc.api.domain.RuntimeModeModels.ResolvedMode;
import com.omnidoc.api.domain.RuntimeModeModels.StampOutbound;

/** Keeps EMBED and CUSTOMER_KEY dark; allows only explicitly gated local ASK. */
public final class DemoAskRuntimeModeAdapter implements RuntimeModePort {

	private final MockRuntimeModeAdapter mock = new MockRuntimeModeAdapter();
	private final DemoAskPolicy policy;

	public DemoAskRuntimeModeAdapter(DemoAskPolicy policy) {
		this.policy = policy;
	}

	@Override
	public PortResult<ResolvedMode> resolveMode(ResolveMode request) {
		return allow(request == null ? null : request.actor(),
			request == null ? null : request.requestedMode(),
			request == null ? null : request.feature());
	}

	@Override
	public PortResult<ResolvedMode> assertModeAllowed(AssertModeAllowed request) {
		return allow(request == null ? null : request.actor(),
			request == null ? null : request.mode(),
			request == null ? null : request.feature());
	}

	@Override
	public OutboundStamp stampOutbound(StampOutbound request) {
		if (request == null || request.actor() == null || request.resolvedMode() == null
			|| request.feature() != Feature.ASK
			|| request.resolvedMode().mode() != RuntimeMode.OPERATOR_FREE_TIER
			|| !this.policy.allowsActor(request.actor().tenantId().value())) {
			throw new IllegalArgumentException("Live Ask outbound mode is unavailable.");
		}
		return new OutboundStamp(RuntimeMode.OPERATOR_FREE_TIER, Feature.ASK);
	}

	private PortResult<ResolvedMode> allow(
		com.omnidoc.api.domain.AccessContext.TenantActor actor, RuntimeMode mode, Feature feature) {
		if (mode == RuntimeMode.MOCK) {
			return this.mock.assertModeAllowed(new AssertModeAllowed(actor, mode, feature));
		}
		if (actor != null && mode == RuntimeMode.OPERATOR_FREE_TIER
			&& feature == Feature.ASK && this.policy.allowsActor(actor.tenantId().value())) {
			return new PortResult.Success<>(new ResolvedMode(mode, Optional.empty()));
		}
		return new PortResult.Failure<>(PortFailure.forMode(PortFailure.Code.MODE_FORBIDDEN,
			"Requested runtime mode is unavailable.", mode == null ? RuntimeMode.OPERATOR_FREE_TIER : mode));
	}
}
