package com.omnidoc.api.adapters.identity;

import org.junit.jupiter.api.Test;

import com.omnidoc.api.domain.Identifiers.ActorId;
import com.omnidoc.api.domain.IdentityModels.SessionHandle;

import static org.assertj.core.api.Assertions.assertThat;

class IdentitySessionsTest {

	@Test
	void forActorStoresActorIdAsSessionHandleValue() {
		SessionHandle handle = IdentitySessions.forActor(new ActorId("actor-a"));
		assertThat(handle.value()).isEqualTo("actor-a");
	}

	@Test
	void actorOfRoundTripsHandle() {
		ActorId actor = IdentitySessions.actorOf(new SessionHandle("actor-b"));
		assertThat(actor.value()).isEqualTo("actor-b");
		assertThat(IdentitySessions.actorOf(IdentitySessions.forActor(actor))).isEqualTo(actor);
	}

}
