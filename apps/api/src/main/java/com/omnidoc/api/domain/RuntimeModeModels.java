package com.omnidoc.api.domain;

import java.util.Optional;

import com.omnidoc.api.domain.AccessContext.TenantActor;

public final class RuntimeModeModels {
	private RuntimeModeModels() { }
	public enum Feature { EMBED, ASK }
	public record ResolveMode(TenantActor actor, RuntimeMode requestedMode, Feature feature) { }
	public record AssertModeAllowed(TenantActor actor, RuntimeMode mode, Feature feature) { }
	public record OpaqueCredentialHandle(String value) { }
	public record ResolvedMode(RuntimeMode mode, Optional<OpaqueCredentialHandle> credentialHandle) { }
	public record StampOutbound(TenantActor actor, ResolvedMode resolvedMode, Feature feature) { }
	public record OutboundStamp(RuntimeMode mode, Feature feature) { }
}
