package com.omnidoc.api.web.notes;

import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

import org.springframework.context.annotation.Profile;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.omnidoc.api.application.port.IdentityPort;
import com.omnidoc.api.application.port.NotesPort;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.Identifiers.ActorId;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.Identifiers.TenantId;
import com.omnidoc.api.domain.Identifiers.WorkspaceId;
import com.omnidoc.api.domain.IdentityModels.ListWorkspaces;
import com.omnidoc.api.domain.IdentityModels.Membership;
import com.omnidoc.api.domain.IdentityModels.Workspace;
import com.omnidoc.api.domain.IdentityModels.WorkspaceList;
import com.omnidoc.api.domain.NotesModels.GetNote;
import com.omnidoc.api.domain.NotesModels.Note;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.web.PortFailureException;
import com.omnidoc.api.web.PortResults;
import com.omnidoc.api.web.identity.IdentityProfiles;
import com.omnidoc.api.web.identity.SessionPrincipals;
import com.omnidoc.api.web.identity.WorkspaceMembershipBinder;

/**
 * Resolves note-by-id access without ever treating the note id as tenant authority.
 * Headerless lookup starts only from the session actor's server-side memberships.
 */
@Component
@Profile(IdentityProfiles.PERSISTENT_IDENTITY)
public class NoteAccessResolver {

	private final IdentityPort identityPort;
	private final NotesPort notesPort;
	private final WorkspaceMembershipBinder membershipBinder;

	public NoteAccessResolver(
		IdentityPort identityPort,
		NotesPort notesPort,
		WorkspaceMembershipBinder membershipBinder) {
		this.identityPort = Objects.requireNonNull(identityPort, "identityPort");
		this.notesPort = Objects.requireNonNull(notesPort, "notesPort");
		this.membershipBinder = Objects.requireNonNull(membershipBinder, "membershipBinder");
	}

	public ResolvedNoteAccess resolveVisible(
		Authentication authentication, String noteId, String workspaceSelector) {
		return resolve(authentication, noteId, workspaceSelector, false);
	}

	public ResolvedNoteAccess resolveForPurge(
		Authentication authentication, String noteId, String workspaceSelector) {
		return resolve(authentication, noteId, workspaceSelector, true);
	}

	private ResolvedNoteAccess resolve(
		Authentication authentication,
		String noteIdValue,
		String workspaceSelector,
		boolean includeSoftDeleted) {
		NoteId noteId = new NoteId(noteIdValue);
		ActorId actorId = new ActorId(SessionPrincipals.actorId(authentication));

		if (workspaceSelector != null) {
			if (!StringUtils.hasText(workspaceSelector)) {
				throw new PortFailureException(
					PortFailure.of(PortFailure.Code.VALIDATION, "Workspace selector must not be blank."));
			}
			Membership membership = this.membershipBinder.bind(authentication, workspaceSelector);
			Note note = PortResults.orThrow(this.notesPort.get(new GetNote(
				new TenantActor(membership.tenantId(), membership.actorId()),
				noteId,
				Optional.of(membership.workspaceId()),
				includeSoftDeleted)));
			return new ResolvedNoteAccess(membership, note);
		}

		WorkspaceList workspaceList = PortResults.orThrow(this.identityPort.listWorkspaces(
			new ListWorkspaces(SessionPrincipals.sessionHandle(authentication))));
		Set<TenantId> tenantIds = new LinkedHashSet<>();
		for (Workspace workspace : workspaceList.workspaces()) {
			tenantIds.add(workspace.tenantId());
		}

		for (TenantId tenantId : tenantIds) {
			PortResult<Note> result = this.notesPort.get(new GetNote(
				new TenantActor(tenantId, actorId), noteId, Optional.empty(), includeSoftDeleted));
			if (result instanceof PortResult.Success<Note> success) {
				Note note = success.value();
				// Re-bind the server-side workspace before any response or mutation.
				Membership membership = this.membershipBinder.bind(
					authentication, note.workspaceId().value());
				if (!membership.tenantId().equals(tenantId)) {
					throw new PortFailureException(PortFailure.of(
						PortFailure.Code.FORBIDDEN,
						"Resolved workspace membership does not match the note tenant."));
				}
				return new ResolvedNoteAccess(membership, note);
			}
			PortFailure failure = ((PortResult.Failure<Note>) result).failure();
			if (failure.code() != PortFailure.Code.NOT_FOUND) {
				throw new PortFailureException(failure);
			}
		}

		throw new PortFailureException(PortFailure.of(PortFailure.Code.NOT_FOUND, "Note was not found."));
	}

	public record ResolvedNoteAccess(Membership membership, Note note) {
		public ResolvedNoteAccess {
			Objects.requireNonNull(membership);
			Objects.requireNonNull(note);
		}
	}
}
