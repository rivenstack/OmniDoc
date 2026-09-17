package com.omnidoc.api.domain;

import java.util.Set;

import com.omnidoc.api.domain.Identifiers.ActorId;
import com.omnidoc.api.domain.Identifiers.TenantId;
import com.omnidoc.api.domain.Identifiers.WorkspaceId;

public final class AccessContext {

	private AccessContext() {
	}

	public record TenantActor(TenantId tenantId, ActorId actorId) {
		public TenantActor { java.util.Objects.requireNonNull(tenantId); java.util.Objects.requireNonNull(actorId); }
	}

	public record AclScope(WorkspaceId workspaceId, Set<String> permissions) {
		public AclScope {
			java.util.Objects.requireNonNull(workspaceId);
			permissions = Set.copyOf(permissions);
		}
	}
}
