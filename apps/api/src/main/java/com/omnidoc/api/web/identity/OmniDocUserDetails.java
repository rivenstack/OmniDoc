package com.omnidoc.api.web.identity;

import java.util.Collection;
import java.util.List;
import java.util.Objects;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Session principal. It carries the actor id and nothing else — no password hash, no
 * tenant, no roles. Tenant and roles are re-resolved from first-party membership on
 * every request so a stale session can never widen access.
 */
public record OmniDocUserDetails(String actorId) implements UserDetails {

	private static final long serialVersionUID = 1L;

	public OmniDocUserDetails {
		Objects.requireNonNull(actorId, "actorId");
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return List.of();
	}

	@Override
	public String getPassword() {
		return null;
	}

	@Override
	public String getUsername() {
		return this.actorId;
	}

}
