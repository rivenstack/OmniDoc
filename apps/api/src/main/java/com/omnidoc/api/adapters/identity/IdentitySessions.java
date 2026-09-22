package com.omnidoc.api.adapters.identity;

import com.omnidoc.api.domain.Identifiers.ActorId;
import com.omnidoc.api.domain.IdentityModels.SessionHandle;

/**
 * Adapter convention for {@link SessionHandle}.
 *
 * <p>The transport session is the HTTP-only cookie, held by the servlet container and
 * Spring Security. What the persistence adapter needs is the actor that the container
 * session is bound to, so this adapter defines {@code SessionHandle.value} as that
 * server-resolved actor id. The web layer produces it from
 * {@code SecurityContextHolder}; it is never read from a request header or body.
 *
 * <p>If a server-side session store is introduced later, only this class and the
 * web layer's handle construction change — the port signature stays as B-01 defined it.
 */
public final class IdentitySessions {

	private IdentitySessions() {
	}

	public static SessionHandle forActor(ActorId actorId) {
		return new SessionHandle(actorId.value());
	}

	public static ActorId actorOf(SessionHandle session) {
		return new ActorId(session.value());
	}

}
