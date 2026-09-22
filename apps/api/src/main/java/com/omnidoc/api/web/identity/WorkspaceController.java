package com.omnidoc.api.web.identity;

import java.util.List;
import java.util.Objects;
import java.util.Set;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.omnidoc.api.application.port.IdentityPort;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.Identifiers.ActorId;
import com.omnidoc.api.domain.Identifiers.WorkspaceId;
import com.omnidoc.api.domain.IdentityModels.InviteMember;
import com.omnidoc.api.domain.IdentityModels.InviteResult;
import com.omnidoc.api.domain.IdentityModels.ListWorkspaces;
import com.omnidoc.api.domain.IdentityModels.Membership;
import com.omnidoc.api.domain.IdentityModels.WorkspaceList;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.web.PortFailureException;
import com.omnidoc.api.web.PortResults;
import com.omnidoc.api.web.identity.IdentityDtos.InviteMemberRequest;
import com.omnidoc.api.web.identity.IdentityDtos.InviteResultResponse;
import com.omnidoc.api.web.identity.IdentityDtos.WorkspaceListResponse;
import com.omnidoc.api.web.identity.IdentityDtos.WorkspaceResponse;

/**
 * S-02 {@code /api/v1/workspaces}. The list is whatever first-party membership says the
 * session actor may select; the invite path re-binds the path selector before writing.
 */
@RestController
@Profile(IdentityProfiles.PERSISTENT_IDENTITY)
@RequestMapping("/api/v1/workspaces")
public class WorkspaceController {

	private final IdentityPort identityPort;
	private final WorkspaceMembershipBinder membershipBinder;

	public WorkspaceController(IdentityPort identityPort, WorkspaceMembershipBinder membershipBinder) {
		this.identityPort = Objects.requireNonNull(identityPort, "identityPort");
		this.membershipBinder = Objects.requireNonNull(membershipBinder, "membershipBinder");
	}

	@GetMapping
	public WorkspaceListResponse list(Authentication authentication) {
		WorkspaceList workspaces = PortResults.orThrow(this.identityPort.listWorkspaces(
			new ListWorkspaces(SessionPrincipals.sessionHandle(authentication))));
		List<WorkspaceResponse> body = workspaces.workspaces().stream()
			.map(workspace -> new WorkspaceResponse(
				workspace.id().value(),
				workspace.tenantId().value(),
				workspace.name()))
			.toList();
		return new WorkspaceListResponse(body);
	}

	@PostMapping("/{workspaceId}/invites")
	public ResponseEntity<InviteResultResponse> invite(
		@PathVariable String workspaceId,
		@RequestBody InviteMemberRequest body,
		Authentication authentication) {
		if (body == null || body.roles() == null || body.roles().isEmpty()) {
			throw new PortFailureException(
				PortFailure.of(PortFailure.Code.VALIDATION, "At least one role is required."));
		}

		Membership membership = this.membershipBinder.bind(authentication, workspaceId);
		ActorId actorId = new ActorId(SessionPrincipals.actorId(authentication));
		InviteResult result = PortResults.orThrow(this.identityPort.invite(new InviteMember(
			new TenantActor(membership.tenantId(), actorId),
			new WorkspaceId(workspaceId),
			body.invitee(),
			Set.copyOf(body.roles()))));
		return ResponseEntity.status(HttpStatus.CREATED)
			.body(new InviteResultResponse(result.inviteId()));
	}

}
