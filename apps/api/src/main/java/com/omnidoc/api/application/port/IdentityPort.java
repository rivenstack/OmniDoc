package com.omnidoc.api.application.port;

import com.omnidoc.api.domain.IdentityModels.Authenticate;
import com.omnidoc.api.domain.IdentityModels.InviteMember;
import com.omnidoc.api.domain.IdentityModels.InviteResult;
import com.omnidoc.api.domain.IdentityModels.ListWorkspaces;
import com.omnidoc.api.domain.IdentityModels.Membership;
import com.omnidoc.api.domain.IdentityModels.Principal;
import com.omnidoc.api.domain.IdentityModels.ResolveMembership;
import com.omnidoc.api.domain.IdentityModels.WorkspaceList;
import com.omnidoc.api.domain.PortResult;

public interface IdentityPort {
	PortResult<Principal> authenticate(Authenticate request);
	PortResult<Membership> resolveMembership(ResolveMembership request);
	PortResult<WorkspaceList> listWorkspaces(ListWorkspaces request);
	PortResult<InviteResult> invite(InviteMember request);
}
