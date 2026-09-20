package com.omnidoc.api.web.notes;

import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.omnidoc.api.application.port.NotesPort;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.Completion;
import com.omnidoc.api.domain.CorpusOwnership;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.IdentityModels.Membership;
import com.omnidoc.api.domain.NotesModels.CreateNote;
import com.omnidoc.api.domain.NotesModels.DeleteNote;
import com.omnidoc.api.domain.NotesModels.ListNotes;
import com.omnidoc.api.domain.NotesModels.Note;
import com.omnidoc.api.domain.NotesModels.NoteFields;
import com.omnidoc.api.domain.NotesModels.NotePage;
import com.omnidoc.api.domain.NotesModels.PageRequest;
import com.omnidoc.api.domain.NotesModels.UpdateNote;
import com.omnidoc.api.domain.NotesModels.VersionToken;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.web.PortFailureException;
import com.omnidoc.api.web.PortResults;
import com.omnidoc.api.web.identity.IdentityProfiles;
import com.omnidoc.api.web.identity.WorkspaceMembershipBinder;
import com.omnidoc.api.web.notes.NoteAccessResolver.ResolvedNoteAccess;
import com.omnidoc.api.web.notes.NotesDtos.CreateNoteRequest;
import com.omnidoc.api.web.notes.NotesDtos.NotePageResponse;
import com.omnidoc.api.web.notes.NotesDtos.NoteResponse;
import com.omnidoc.api.web.notes.NotesDtos.UpdateNoteRequest;

/** S-02 notes HTTP surface. The OpenAPI document remains the wire authority. */
@RestController
@Profile(IdentityProfiles.PERSISTENT_IDENTITY)
@RequestMapping("/api/v1")
public class NotesController {

	private static final String WORKSPACE_HEADER = "OmniDoc-Workspace-Id";

	private final NotesPort notesPort;
	private final WorkspaceMembershipBinder membershipBinder;
	private final NoteAccessResolver accessResolver;
	private final ObjectMapper objectMapper;

	public NotesController(
		NotesPort notesPort,
		WorkspaceMembershipBinder membershipBinder,
		NoteAccessResolver accessResolver,
		ObjectMapper objectMapper) {
		this.notesPort = Objects.requireNonNull(notesPort, "notesPort");
		this.membershipBinder = Objects.requireNonNull(membershipBinder, "membershipBinder");
		this.accessResolver = Objects.requireNonNull(accessResolver, "accessResolver");
		this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper");
	}

	@GetMapping("/workspaces/{workspaceId}/notes")
	public NotePageResponse list(
		@PathVariable String workspaceId,
		@RequestParam(defaultValue = "20") int limit,
		@RequestParam(required = false) String cursor,
		Authentication authentication) {
		Membership membership = this.membershipBinder.bind(authentication, workspaceId);
		NotePage page = PortResults.orThrow(this.notesPort.list(new ListNotes(
			actorOf(membership), membership.workspaceId(), new PageRequest(limit, Optional.ofNullable(cursor)))));
		List<NoteResponse> items = page.items().stream().map(this::toResponse).toList();
		return new NotePageResponse(items, page.nextCursor().orElse(null));
	}

	@PostMapping("/workspaces/{workspaceId}/notes")
	public ResponseEntity<NoteResponse> create(
		@PathVariable String workspaceId,
		@RequestBody CreateNoteRequest body,
		Authentication authentication) {
		NoteFields fields = fieldsOf(body == null ? null : body.title(), body == null ? null : body.bodyJson());
		Optional<CorpusOwnership> ownership = ownershipOf(body == null ? null : body.corpusOwnership());
		Membership membership = this.membershipBinder.bind(authentication, workspaceId);
		Note note = PortResults.orThrow(this.notesPort.create(new CreateNote(
			actorOf(membership), membership.workspaceId(), fields, ownership)));
		return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(note));
	}

	@GetMapping("/notes/{noteId}")
	public NoteResponse get(
		@PathVariable String noteId,
		@RequestHeader(name = WORKSPACE_HEADER, required = false) String workspaceSelector,
		Authentication authentication) {
		return toResponse(this.accessResolver.resolveVisible(
			authentication, noteId, workspaceSelector).note());
	}

	@PatchMapping("/notes/{noteId}")
	public NoteResponse update(
		@PathVariable String noteId,
		@RequestHeader(name = WORKSPACE_HEADER, required = false) String workspaceSelector,
		@RequestBody UpdateNoteRequest body,
		Authentication authentication) {
		NoteFields fields = fieldsOf(body == null ? null : body.title(), body == null ? null : body.bodyJson());
		if (body == null || !StringUtils.hasText(body.expectedVersion())) {
			throw validation("expectedVersion is required.");
		}
		ResolvedNoteAccess access = this.accessResolver.resolveVisible(authentication, noteId, workspaceSelector);
		Note note = PortResults.orThrow(this.notesPort.update(new UpdateNote(
			actorOf(access.membership()),
			access.note().workspaceId(),
			new NoteId(noteId),
			fields,
			new VersionToken(body.expectedVersion()))));
		return toResponse(note);
	}

	@PostMapping("/notes/{noteId}/soft-delete")
	public ResponseEntity<Void> softDelete(
		@PathVariable String noteId,
		@RequestHeader(name = WORKSPACE_HEADER, required = false) String workspaceSelector,
		Authentication authentication) {
		ResolvedNoteAccess access = this.accessResolver.resolveVisible(authentication, noteId, workspaceSelector);
		Completion ignored = PortResults.orThrow(this.notesPort.softDelete(new DeleteNote(
			actorOf(access.membership()), access.note().workspaceId(), new NoteId(noteId))));
		return ResponseEntity.noContent().build();
	}

	@PostMapping("/notes/{noteId}/purge")
	public ResponseEntity<Void> purge(
		@PathVariable String noteId,
		@RequestHeader(name = WORKSPACE_HEADER, required = false) String workspaceSelector,
		Authentication authentication) {
		ResolvedNoteAccess access = this.accessResolver.resolveForPurge(authentication, noteId, workspaceSelector);
		Completion ignored = PortResults.orThrow(this.notesPort.purge(new DeleteNote(
			actorOf(access.membership()), access.note().workspaceId(), new NoteId(noteId))));
		return ResponseEntity.noContent().build();
	}

	private NoteResponse toResponse(Note note) {
		JsonNode body;
		try {
			body = this.objectMapper.readTree(note.fields().bodyJson());
		}
		catch (RuntimeException ex) {
			throw new PortFailureException(PortFailure.of(
				PortFailure.Code.UNAVAILABLE, "Stored note body is unavailable."));
		}
		return new NoteResponse(
			note.id().value(),
			note.workspaceId().value(),
			note.versionId().value(),
			note.fields().title(),
			body,
			note.updatedAt(),
			note.corpusOwnership().map(value -> value.name().toLowerCase(Locale.ROOT)).orElse(null));
	}

	private NoteFields fieldsOf(String title, JsonNode bodyJson) {
		if (title == null || bodyJson == null || !bodyJson.isObject()) {
			throw validation("title and an object bodyJson are required.");
		}
		return new NoteFields(title, this.objectMapper.writeValueAsString(bodyJson));
	}

	private static Optional<CorpusOwnership> ownershipOf(String value) {
		if (value == null) {
			return Optional.empty();
		}
		return switch (value) {
			case "sample" -> Optional.of(CorpusOwnership.SAMPLE);
			case "mine" -> Optional.of(CorpusOwnership.MINE);
			default -> throw validation("corpusOwnership must be sample or mine.");
		};
	}

	private static TenantActor actorOf(Membership membership) {
		return new TenantActor(membership.tenantId(), membership.actorId());
	}

	private static PortFailureException validation(String detail) {
		return new PortFailureException(PortFailure.of(PortFailure.Code.VALIDATION, detail));
	}
}
