package com.omnidoc.api.domain;

import java.util.List;
import java.util.Set;

import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.Identifiers.ActorId;
import com.omnidoc.api.domain.Identifiers.TenantId;
import com.omnidoc.api.domain.Identifiers.WorkspaceId;

public final class IdentityModels {
	private IdentityModels() { }

	public record CredentialHandle(String value) { }
	public record SessionHandle(String value) { }
	public record Authenticate(CredentialHandle credentials) { }
	public record Principal(ActorId actorId, SessionHandle session) { }
	public record ResolveMembership(SessionHandle session, WorkspaceId workspaceSelector) { }
	public record ListWorkspaces(SessionHandle session) { }
	public record InviteMember(TenantActor actor, WorkspaceId workspaceId, String invitee, Set<String> roles) {
		public InviteMember { roles = Set.copyOf(roles); }
	}
	public record Membership(TenantId tenantId, WorkspaceId workspaceId, ActorId actorId, Set<String> roles) {
		public Membership { roles = Set.copyOf(roles); }
	}
	public record Workspace(WorkspaceId id, TenantId tenantId, String name) { }
	public record WorkspaceList(List<Workspace> workspaces) {
		public WorkspaceList { workspaces = List.copyOf(workspaces); }
	}
	public record InviteResult(String inviteId) { }
}
