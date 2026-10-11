package com.omnidoc.api.adapters.retrieval;

import java.util.Objects;
import java.util.Optional;

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

/**
 * Phase 1 gate from architecture.md §5.11: mock works, live modes fail closed.
 */
public class MockRuntimeModeAdapter implements RuntimeModePort {

	@Override
	public PortResult<ResolvedMode> resolveMode(ResolveMode request) {
		return allowOnlyMock(
			request == null ? null : request.actor(),
			request == null ? null : request.requestedMode(),
			request == null ? null : request.feature());
	}

	@Override
	public PortResult<ResolvedMode> assertModeAllowed(AssertModeAllowed request) {
		return allowOnlyMock(
			request == null ? null : request.actor(),
			request == null ? null : request.mode(),
			request == null ? null : request.feature());
	}

	@Override
	public OutboundStamp stampOutbound(StampOutbound request) {
		Objects.requireNonNull(request, "request");
		Objects.requireNonNull(request.actor(), "actor");
		Objects.requireNonNull(request.resolvedMode(), "resolvedMode");
		Objects.requireNonNull(request.feature(), "feature");
		return new OutboundStamp(request.resolvedMode().mode(), request.feature());
	}

	private PortResult<ResolvedMode> allowOnlyMock(
		com.omnidoc.api.domain.AccessContext.TenantActor actor,
		RuntimeMode requestedMode,
		Feature feature) {
		if (actor == null || requestedMode == null || feature == null) {
			return failure(PortFailure.Code.VALIDATION, "Actor, mode, and feature are required.");
		}
		if (requestedMode != RuntimeMode.MOCK) {
			return new PortResult.Failure<>(PortFailure.forMode(
				PortFailure.Code.MODE_FORBIDDEN,
				"Live runtime modes remain gated until production AI activation is opened.",
				requestedMode));
		}
		return new PortResult.Success<>(new ResolvedMode(RuntimeMode.MOCK, Optional.empty()));
	}

	private static <T> PortResult<T> failure(PortFailure.Code code, String detail) {
		return new PortResult.Failure<>(PortFailure.of(code, detail));
	}
}