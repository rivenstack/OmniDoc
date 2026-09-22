package com.omnidoc.api.web.identity;

import org.springframework.security.core.Authentication;

import com.omnidoc.api.domain.IdentityModels.SessionHandle;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.web.PortFailureException;

/**
 * Reads the actor id out of the server session and nothing else.
 *
 * <p>The {@link SessionHandle} handed to {@code IdentityPort} carries that
 * server-resolved actor id (see the adapter's {@code IdentitySessions} convention).
 * No request header or body ever contributes to it.
 */
public final class SessionPrincipals {

	private SessionPrincipals() {
	}

	public static String actorId(Authentication authentication) {
		if (authentication != null && authentication.isAuthenticated()
			&& authentication.getPrincipal() instanceof OmniDocUserDetails details) {
			return details.actorId();
		}
		throw new PortFailureException(PortFailure.of(PortFailure.Code.UNAUTHENTICATED, "Session required."));
	}

	public static SessionHandle sessionHandle(Authentication authentication) {
		return new SessionHandle(actorId(authentication));
	}

}
