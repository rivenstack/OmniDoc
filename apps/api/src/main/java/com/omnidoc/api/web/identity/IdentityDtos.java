package com.omnidoc.api.web.identity;

import java.util.List;

/**
 * JSON shapes for the S-02 identity paths. Field names mirror
 * {@code docs/api/openapi.yaml} exactly; that document stays the contract source of
 * truth and is not edited from this lane.
 *
 * <p>No session handle, tenant claim, or credential ever appears in a response body:
 * the session is the HTTP-only cookie and the tenant is server-resolved.
 */
public final class IdentityDtos {

	private IdentityDtos() {
	}

	/** {@code CreateSessionRequest}. */
	public record CreateSessionRequest(String email, String password) {
	}

	/** {@code Principal} — actorId only. */
	public record PrincipalResponse(String actorId) {
	}

	/** {@code Workspace}. {@code tenantId} is a server-resolved label, not authority. */
	public record WorkspaceResponse(String id, String tenantId, String name) {
	}

	/** {@code WorkspaceList}. */
	public record WorkspaceListResponse(List<WorkspaceResponse> workspaces) {
	}

	/** {@code InviteMemberRequest}. */
	public record InviteMemberRequest(String invitee, List<String> roles) {
	}

	/** {@code InviteResult}. */
	public record InviteResultResponse(String inviteId) {
	}

}
