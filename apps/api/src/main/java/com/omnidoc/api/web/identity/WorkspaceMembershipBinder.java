package com.omnidoc.api.web.identity;

import java.util.Objects;

import org.springframework.context.annotation.Profile;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.omnidoc.api.application.port.IdentityPort;
import com.omnidoc.api.domain.Identifiers.WorkspaceId;
import com.omnidoc.api.domain.IdentityModels.Membership;
import com.omnidoc.api.domain.IdentityModels.ResolveMembership;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.web.PortFailureException;
import com.omnidoc.api.web.PortResults;

/**
 * Turns a client workspace selector into server-authoritative membership.
 *
 * <p>The selector is the only thing the client controls. Tenant and roles come back
 * from first-party membership; a selector the session actor is not a member of raises
 * {@code FORBIDDEN} (403), never a silently empty result.
 */
@Component
@Profile(IdentityProfiles.PERSISTENT_IDENTITY)
public class WorkspaceMembershipBinder {

	private final IdentityPort identityPort;

	public WorkspaceMembershipBinder(IdentityPort identityPort) {
		this.identityPort = Objects.requireNonNull(identityPort, "identityPort");
	}

	public Membership bind(Authentication authentication, String workspaceSelector) {
		if (!StringUtils.hasText(workspaceSelector)) {
			throw new PortFailureException(
				PortFailure.of(PortFailure.Code.VALIDATION, "Workspace selector is required."));
		}
		return PortResults.orThrow(this.identityPort.resolveMembership(new ResolveMembership(
			SessionPrincipals.sessionHandle(authentication),
			new WorkspaceId(workspaceSelector))));
	}

}
