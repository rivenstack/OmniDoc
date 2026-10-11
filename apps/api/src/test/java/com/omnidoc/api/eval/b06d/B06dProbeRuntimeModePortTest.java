package com.omnidoc.api.eval.b06d;

import java.nio.file.Path;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.Identifiers.ActorId;
import com.omnidoc.api.domain.Identifiers.TenantId;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.domain.RuntimeMode;
import com.omnidoc.api.domain.RuntimeModeModels.AssertModeAllowed;
import com.omnidoc.api.domain.RuntimeModeModels.Feature;
import com.omnidoc.api.domain.RuntimeModeModels.ResolveMode;

import static org.assertj.core.api.Assertions.assertThat;

class B06dProbeRuntimeModePortTest {

	private static final Path REPO = Path.of("/repo");
	private static final TenantActor ALEX = new TenantActor(new TenantId("tenant_alex"), new ActorId("actor_alex"));
	private static final TenantActor BLAIR = new TenantActor(new TenantId("tenant_blair"), new ActorId("actor_blair"));

	@Test
	void liveGateFailsClosedWithoutRequiredEnvironment() {
		B06dProbeRuntimeModePort.GateState gateState = B06dProbeRuntimeModePort.fromEnvironment(REPO, Map.of());
		assertThat(gateState.ready()).isFalse();
		assertThat(gateState.missing()).isNotEmpty();

		B06dProbeRuntimeModePort port = new B06dProbeRuntimeModePort(ALEX, gateState);
		PortFailure failure = failure(port.resolveMode(new ResolveMode(ALEX, RuntimeMode.OPERATOR_FREE_TIER, Feature.EMBED)));
		assertThat(failure.code()).isEqualTo(PortFailure.Code.MODE_FORBIDDEN);
	}

	@Test
	void apiKeyNormalizationStripsWhitespaceAndWrappingQuotes() {
		assertThat(B06dProbeRuntimeModePort.normalizeApiKey("  aa-demo-key  ")).isEqualTo("aa-demo-key");
		assertThat(B06dProbeRuntimeModePort.normalizeApiKey("'aa-demo-key'\n")).isEqualTo("aa-demo-key");
		assertThat(B06dProbeRuntimeModePort.normalizeApiKey("\"aa-demo-key\"\r\n")).isEqualTo("aa-demo-key");
	}

	@Test
	void onlyFixedActorOperatorFreeTierAndEmbedAreAllowed() {
		B06dProbeRuntimeModePort port = new B06dProbeRuntimeModePort(
			ALEX,
			new B06dProbeRuntimeModePort.GateState(true, java.util.List.of(), java.util.Optional.of(Path.of("/tmp/avalai.env"))));

		assertThat(failure(port.assertModeAllowed(new AssertModeAllowed(BLAIR, RuntimeMode.OPERATOR_FREE_TIER, Feature.EMBED))).code())
			.isEqualTo(PortFailure.Code.MODE_FORBIDDEN);
		assertThat(failure(port.assertModeAllowed(new AssertModeAllowed(ALEX, RuntimeMode.CUSTOMER_KEY, Feature.EMBED))).code())
			.isEqualTo(PortFailure.Code.MODE_FORBIDDEN);
		assertThat(failure(port.assertModeAllowed(new AssertModeAllowed(ALEX, RuntimeMode.OPERATOR_FREE_TIER, Feature.ASK))).code())
			.isEqualTo(PortFailure.Code.MODE_FORBIDDEN);
		assertThat(port.assertModeAllowed(new AssertModeAllowed(ALEX, RuntimeMode.OPERATOR_FREE_TIER, Feature.EMBED)))
			.isInstanceOf(PortResult.Success.class);
	}

	private static PortFailure failure(PortResult<?> result) {
		return ((PortResult.Failure<?>) result).failure();
	}
}