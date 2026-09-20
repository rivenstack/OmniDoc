package com.omnidoc.api.web.identity;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import com.omnidoc.api.domain.IdentityModels.SessionHandle;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.web.PortFailureException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SessionPrincipalsTest {

	@Test
	void actorIdReadsOmniDocUserDetailsFromAuthenticatedPrincipal() {
		Authentication authentication = new UsernamePasswordAuthenticationToken(
			new OmniDocUserDetails("actor-a"), null, java.util.List.of());
		assertThat(SessionPrincipals.actorId(authentication)).isEqualTo("actor-a");
		assertThat(SessionPrincipals.sessionHandle(authentication))
			.isEqualTo(new SessionHandle("actor-a"));
	}

	@Test
	void missingOrWrongPrincipalIsUnauthenticated() {
		assertThatThrownBy(() -> SessionPrincipals.actorId(null))
			.isInstanceOf(PortFailureException.class)
			.extracting(ex -> ((PortFailureException) ex).failure().code())
			.isEqualTo(PortFailure.Code.UNAUTHENTICATED);

		Authentication anonymous = new UsernamePasswordAuthenticationToken("anonymous", null);
		anonymous.setAuthenticated(false);
		assertThatThrownBy(() -> SessionPrincipals.sessionHandle(anonymous))
			.isInstanceOf(PortFailureException.class);

		Authentication wrongType = new UsernamePasswordAuthenticationToken("actor-a", null, java.util.List.of());
		assertThatThrownBy(() -> SessionPrincipals.actorId(wrongType))
			.isInstanceOf(PortFailureException.class);
	}

}
