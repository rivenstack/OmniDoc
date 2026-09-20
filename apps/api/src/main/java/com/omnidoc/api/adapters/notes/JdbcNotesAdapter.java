package com.omnidoc.api.adapters.notes;

import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

import com.omnidoc.api.application.port.NotesPort;
import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.Completion;
import com.omnidoc.api.domain.CorpusOwnership;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.Identifiers.VersionId;
import com.omnidoc.api.domain.Identifiers.WorkspaceId;
import com.omnidoc.api.domain.NotesModels.CreateNote;
import com.omnidoc.api.domain.NotesModels.DeleteNote;
import com.omnidoc.api.domain.NotesModels.GetNote;
import com.omnidoc.api.domain.NotesModels.ListNotes;
import com.omnidoc.api.domain.NotesModels.Note;
import com.omnidoc.api.domain.NotesModels.NoteFields;
import com.omnidoc.api.domain.NotesModels.NotePage;
import com.omnidoc.api.domain.NotesModels.PageRequest;
import com.omnidoc.api.domain.NotesModels.UpdateNote;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.persistence.TenantRlsSession;

/**
 * B-04 relational notes adapter. Every query is transaction-bound to the actor and
 * tenant GUCs on the same connection. Workspace membership remains an independent
 * predicate: a tenant id never grants access to every workspace in that tenant.
 *
 * <p>Note titles and bodies are deliberately absent from logging and failure details.
 */
public class JdbcNotesAdapter implements NotesPort {

	private static final int MIN_PAGE_LIMIT = 1;
	private static final int MAX_PAGE_LIMIT = 100;
	private static final int CURSOR_VERSION = 1;

	private static final String NOTE_COLUMNS =
		"n.note_id, n.workspace_id, n.current_version_id, n.title, "
			+ "n.body_json::text AS body_json, n.updated_at, n.corpus_ownership";

	private static final RowMapper<Note> NOTE_ROW_MAPPER = (rs, rowNum) -> new Note(
		new NoteId(rs.getString("note_id")),
		new WorkspaceId(rs.getString("workspace_id")),
		new VersionId(rs.getString("current_version_id")),
		new NoteFields(rs.getString("title"), rs.getString("body_json")),
		rs.getTimestamp("updated_at").toInstant(),
		Optional.ofNullable(rs.getString("corpus_ownership"))
			.map(value -> CorpusOwnership.valueOf(value.toUpperCase(Locale.ROOT))));

	private final JdbcTemplate jdbcTemplate;
	private final TenantRlsSession rlsSession;
	private final TransactionTemplate transactionTemplate;
	private final ObjectMapper objectMapper;

	public JdbcNotesAdapter(
		JdbcTemplate jdbcTemplate,
		TenantRlsSession rlsSession,
		TransactionTemplate transactionTemplate,
		ObjectMapper objectMapper) {
		this.jdbcTemplate = Objects.requireNonNull(jdbcTemplate, "jdbcTemplate");
		this.rlsSession = Objects.requireNonNull(rlsSession, "rlsSession");
		this.transactionTemplate = Objects.requireNonNull(transactionTemplate, "transactionTemplate");
		this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper");
	}

	@Override
	public PortResult<Note> create(CreateNote request) {
		PortFailure validation = validateFields(request == null ? null : request.fields());
		if (validation != null) {
			return new PortResult.Failure<>(validation);
		}
		if (request.actor() == null || request.workspaceId() == null) {
			return failure(PortFailure.Code.VALIDATION, "Actor and workspace are required.");
		}

		return execute(request.actor(), () -> {
			if (!hasMembership(request.actor(), request.workspaceId())) {
				return forbiddenWorkspace();
			}
			String noteId = "note-" + UUID.randomUUID();
			String versionId = "version-" + UUID.randomUUID();
			String ownership = ownershipValue(request.corpusOwnership());
			this.jdbcTemplate.update(
				"""
				INSERT INTO notes
					(note_id, tenant_id, workspace_id, title, body_json, current_version_id, corpus_ownership)
				VALUES (?, ?, ?, ?, CAST(? AS jsonb), ?, ?)
				""",
				noteId,
				request.actor().tenantId().value(),
				request.workspaceId().value(),
				request.fields().title(),
				request.fields().bodyJson(),
				versionId,
				ownership);
			insertVersion(versionId, noteId, request.actor(), request.fields());
			return findVisibleNote(request.actor(), new NoteId(noteId), Optional.of(request.workspaceId()));
		});
	}

	@Override
	public PortResult<Note> update(UpdateNote request) {
		PortFailure validation = validateFields(request == null ? null : request.fields());
		if (validation != null) {
			return new PortResult.Failure<>(validation);
		}
		if (request.actor() == null || request.workspaceId() == null || request.noteId() == null
			|| request.expectedVersion() == null || !StringUtils.hasText(request.expectedVersion().value())) {
			return failure(PortFailure.Code.VALIDATION, "Workspace, note, and expected version are required.");
		}

		return execute(request.actor(), () -> {
			if (!hasMembership(request.actor(), request.workspaceId())) {
				return forbiddenWorkspace();
			}
			String versionId = "version-" + UUID.randomUUID();
			List<UpdateRow> updated = this.jdbcTemplate.query(
				"""
				UPDATE notes
				SET title = ?, body_json = CAST(? AS jsonb), current_version_id = ?, updated_at = CURRENT_TIMESTAMP
				WHERE tenant_id = ? AND workspace_id = ? AND note_id = ?
					AND current_version_id = ? AND soft_deleted_at IS NULL
				RETURNING workspace_id, corpus_ownership, updated_at
				""",
				(rs, rowNum) -> new UpdateRow(
					rs.getString("workspace_id"),
					rs.getString("corpus_ownership"),
					rs.getTimestamp("updated_at").toInstant()),
				request.fields().title(),
				request.fields().bodyJson(),
				versionId,
				request.actor().tenantId().value(),
				request.workspaceId().value(),
				request.noteId().value(),
				request.expectedVersion().value());
			if (updated.isEmpty()) {
				return classifyFailedMutation(request.actor(), request.workspaceId(), request.noteId(), true);
			}

			insertVersion(versionId, request.noteId().value(), request.actor(), request.fields());
			UpdateRow row = updated.getFirst();
			return new PortResult.Success<>(new Note(
				request.noteId(),
				request.workspaceId(),
				new VersionId(versionId),
				request.fields(),
				row.updatedAt(),
				Optional.ofNullable(row.corpusOwnership())
					.map(value -> CorpusOwnership.valueOf(value.toUpperCase(Locale.ROOT)))));
		});
	}

	@Override
	public PortResult<Note> get(GetNote request) {
		if (request == null || request.actor() == null || request.noteId() == null) {
			return failure(PortFailure.Code.VALIDATION, "Actor and note are required.");
		}
		return execute(request.actor(), () -> findVisibleNote(
			request.actor(), request.noteId(), request.workspaceSelector(), request.includeSoftDeleted()));
	}

	@Override
	public PortResult<NotePage> list(ListNotes request) {
		if (request == null || request.actor() == null || request.workspaceId() == null || request.page() == null) {
			return failure(PortFailure.Code.VALIDATION, "Actor, workspace, and page are required.");
		}
		if (request.page().limit() < MIN_PAGE_LIMIT || request.page().limit() > MAX_PAGE_LIMIT) {
			return failure(PortFailure.Code.VALIDATION, "Page limit must be between 1 and 100.");
		}

		CursorPayload cursor;
		try {
			cursor = decodeCursor(request.page(), request.actor(), request.workspaceId());
		}
		catch (IllegalArgumentException ex) {
			return failure(PortFailure.Code.VALIDATION, "Page cursor is invalid for this workspace.");
		}

		return execute(request.actor(), () -> {
			if (!hasMembership(request.actor(), request.workspaceId())) {
				return forbiddenWorkspace();
			}
			List<Object> arguments = new ArrayList<>();
			arguments.add(request.actor().tenantId().value());
			arguments.add(request.workspaceId().value());
			String cursorPredicate = "";
			if (cursor != null) {
				cursorPredicate = " AND (n.updated_at < ? OR (n.updated_at = ? AND n.note_id < ?))";
				Instant cursorTime = Instant.parse(cursor.updatedAt());
				arguments.add(Timestamp.from(cursorTime));
				arguments.add(Timestamp.from(cursorTime));
				arguments.add(cursor.noteId());
			}
			arguments.add(request.page().limit() + 1);
			List<Note> rows = this.jdbcTemplate.query(
				"SELECT " + NOTE_COLUMNS + " FROM notes n"
					+ " WHERE n.tenant_id = ? AND n.workspace_id = ? AND n.soft_deleted_at IS NULL"
					+ cursorPredicate
					+ " ORDER BY n.updated_at DESC, n.note_id DESC LIMIT ?",
				NOTE_ROW_MAPPER,
				arguments.toArray());

			boolean hasNext = rows.size() > request.page().limit();
			List<Note> items = hasNext ? List.copyOf(rows.subList(0, request.page().limit())) : List.copyOf(rows);
			Optional<String> nextCursor = hasNext
				? Optional.of(encodeCursor(request.actor(), request.workspaceId(), items.getLast()))
				: Optional.empty();
			return new PortResult.Success<>(new NotePage(items, nextCursor));
		});
	}

	@Override
	public PortResult<Completion> softDelete(DeleteNote request) {
		if (!validDeleteRequest(request)) {
			return failure(PortFailure.Code.VALIDATION, "Actor, workspace, and note are required.");
		}
		return execute(request.actor(), () -> {
			if (!hasMembership(request.actor(), request.workspaceId())) {
				return forbiddenWorkspace();
			}
			int count = this.jdbcTemplate.update(
				"""
				UPDATE notes SET soft_deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
				WHERE tenant_id = ? AND workspace_id = ? AND note_id = ? AND soft_deleted_at IS NULL
				""",
				request.actor().tenantId().value(), request.workspaceId().value(), request.noteId().value());
			if (count == 0) {
				return classifyFailedMutation(request.actor(), request.workspaceId(), request.noteId(), false);
			}
			return new PortResult.Success<>(Completion.DONE);
		});
	}

	@Override
	public PortResult<Completion> purge(DeleteNote request) {
		if (!validDeleteRequest(request)) {
			return failure(PortFailure.Code.VALIDATION, "Actor, workspace, and note are required.");
		}
		return execute(request.actor(), () -> {
			if (!hasMembership(request.actor(), request.workspaceId())) {
				return forbiddenWorkspace();
			}
			// Deliberately no soft_deleted_at predicate: purge must remove tombstoned notes.
			List<StoredNoteState> rows = this.jdbcTemplate.query(
				"""
				SELECT workspace_id, soft_deleted_at
				FROM notes WHERE tenant_id = ? AND note_id = ?
				FOR UPDATE
				""",
				(rs, rowNum) -> new StoredNoteState(
					rs.getString("workspace_id"), rs.getTimestamp("soft_deleted_at") != null),
				request.actor().tenantId().value(), request.noteId().value());
			if (rows.isEmpty()) {
				return failure(PortFailure.Code.NOT_FOUND, "Note was not found.");
			}
			if (!rows.getFirst().workspaceId().equals(request.workspaceId().value())) {
				return failure(PortFailure.Code.FORBIDDEN, "Note does not belong to the selected workspace.");
			}
			this.jdbcTemplate.update(
				"DELETE FROM note_versions WHERE tenant_id = ? AND note_id = ?",
				request.actor().tenantId().value(), request.noteId().value());
			this.jdbcTemplate.update(
				"DELETE FROM notes WHERE tenant_id = ? AND workspace_id = ? AND note_id = ?",
				request.actor().tenantId().value(), request.workspaceId().value(), request.noteId().value());
			return new PortResult.Success<>(Completion.DONE);
		});
	}

	private PortResult<Note> findVisibleNote(
		TenantActor actor, NoteId noteId, Optional<WorkspaceId> workspaceSelector) {
		return findVisibleNote(actor, noteId, workspaceSelector, false);
	}

	private PortResult<Note> findVisibleNote(
		TenantActor actor, NoteId noteId, Optional<WorkspaceId> workspaceSelector,
		boolean includeSoftDeleted) {
		String visibilityPredicate = includeSoftDeleted ? "" : " AND n.soft_deleted_at IS NULL";
		List<Note> rows;
		if (workspaceSelector.isPresent()) {
			WorkspaceId selector = workspaceSelector.orElseThrow();
			if (!hasMembership(actor, selector)) {
				return forbiddenWorkspace();
			}
			rows = this.jdbcTemplate.query(
				"SELECT " + NOTE_COLUMNS + " FROM notes n"
					+ " WHERE n.tenant_id = ? AND n.note_id = ?" + visibilityPredicate,
				NOTE_ROW_MAPPER,
				actor.tenantId().value(), noteId.value());
			if (!rows.isEmpty() && !rows.getFirst().workspaceId().equals(selector)) {
				return failure(PortFailure.Code.FORBIDDEN, "Note does not belong to the selected workspace.");
			}
		}
		else {
			rows = this.jdbcTemplate.query(
				"""
				SELECT n.note_id, n.workspace_id, n.current_version_id, n.title,
					n.body_json::text AS body_json, n.updated_at, n.corpus_ownership
				FROM notes n
				JOIN workspace_memberships m
					ON m.workspace_id = n.workspace_id AND m.tenant_id = n.tenant_id
				WHERE n.tenant_id = ? AND n.note_id = ?
					AND m.actor_id = ?
				""" + visibilityPredicate,
				NOTE_ROW_MAPPER,
				actor.tenantId().value(), noteId.value(), actor.actorId().value());
		}
		return rows.isEmpty()
			? failure(PortFailure.Code.NOT_FOUND, "Note was not found.")
			: new PortResult.Success<>(rows.getFirst());
	}

	private <T> PortResult<T> classifyFailedMutation(
		TenantActor actor, WorkspaceId workspaceId, NoteId noteId, boolean conflictWhenVisible) {
		List<StoredNoteState> rows = this.jdbcTemplate.query(
			"SELECT workspace_id, soft_deleted_at FROM notes WHERE tenant_id = ? AND note_id = ?",
			(rs, rowNum) -> new StoredNoteState(
				rs.getString("workspace_id"), rs.getTimestamp("soft_deleted_at") != null),
			actor.tenantId().value(), noteId.value());
		if (rows.isEmpty() || rows.getFirst().softDeleted()) {
			return failure(PortFailure.Code.NOT_FOUND, "Note was not found.");
		}
		if (!rows.getFirst().workspaceId().equals(workspaceId.value())) {
			return failure(PortFailure.Code.FORBIDDEN, "Note does not belong to the selected workspace.");
		}
		return conflictWhenVisible
			? failure(PortFailure.Code.CONFLICT, "The note was updated from another version.")
			: failure(PortFailure.Code.NOT_FOUND, "Note was not found.");
	}

	private void insertVersion(String versionId, String noteId, TenantActor actor, NoteFields fields) {
		this.jdbcTemplate.update(
			"""
			INSERT INTO note_versions (version_id, note_id, tenant_id, title, body_json)
			VALUES (?, ?, ?, ?, CAST(? AS jsonb))
			""",
			versionId, noteId, actor.tenantId().value(), fields.title(), fields.bodyJson());
	}

	private boolean hasMembership(TenantActor actor, WorkspaceId workspaceId) {
		Boolean allowed = this.jdbcTemplate.queryForObject(
			"""
			SELECT EXISTS (
				SELECT 1 FROM workspace_memberships
				WHERE tenant_id = ? AND workspace_id = ? AND actor_id = ?
			)
			""",
			Boolean.class,
			actor.tenantId().value(), workspaceId.value(), actor.actorId().value());
		return Boolean.TRUE.equals(allowed);
	}

	private <T> PortResult<T> execute(TenantActor actor, Supplier<PortResult<T>> work) {
		try {
			PortResult<T> result = this.transactionTemplate.execute(status ->
				this.rlsSession.callWithinActorAndTenant(
					actor.actorId().value(), actor.tenantId().value(), work));
			return Objects.requireNonNull(result, "transaction result");
		}
		catch (DataAccessException ex) {
			return failure(PortFailure.Code.UNAVAILABLE, "Notes persistence is unavailable.");
		}
	}

	private PortFailure validateFields(NoteFields fields) {
		if (fields == null || fields.title() == null || fields.bodyJson() == null) {
			return PortFailure.of(PortFailure.Code.VALIDATION, "Title and bodyJson are required.");
		}
		try {
			JsonNode node = this.objectMapper.readTree(fields.bodyJson());
			if (node == null || !node.isObject()) {
				return PortFailure.of(PortFailure.Code.VALIDATION, "bodyJson must be a JSON object.");
			}
		}
		catch (RuntimeException ex) {
			return PortFailure.of(PortFailure.Code.VALIDATION, "bodyJson must be a JSON object.");
		}
		return null;
	}

	private String encodeCursor(TenantActor actor, WorkspaceId workspaceId, Note note) {
		CursorPayload payload = new CursorPayload(
			CURSOR_VERSION,
			actor.tenantId().value(),
			workspaceId.value(),
			note.updatedAt().toString(),
			note.id().value());
		String json = this.objectMapper.writeValueAsString(payload);
		return Base64.getUrlEncoder().withoutPadding()
			.encodeToString(json.getBytes(StandardCharsets.UTF_8));
	}

	private CursorPayload decodeCursor(PageRequest page, TenantActor actor, WorkspaceId workspaceId) {
		if (page.cursor() == null || page.cursor().isEmpty()) {
			return null;
		}
		String value = page.cursor().orElseThrow();
		if (!StringUtils.hasText(value)) {
			throw new IllegalArgumentException("blank cursor");
		}
		try {
			String json = new String(Base64.getUrlDecoder().decode(value), StandardCharsets.UTF_8);
			CursorPayload payload = this.objectMapper.readValue(json, CursorPayload.class);
			if (payload == null || payload.version() != CURSOR_VERSION
				|| !actor.tenantId().value().equals(payload.tenantId())
				|| !workspaceId.value().equals(payload.workspaceId())
				|| !StringUtils.hasText(payload.noteId())) {
				throw new IllegalArgumentException("cursor scope mismatch");
			}
			Instant.parse(payload.updatedAt());
			return payload;
		}
		catch (RuntimeException ex) {
			throw new IllegalArgumentException("invalid cursor", ex);
		}
	}

	private static boolean validDeleteRequest(DeleteNote request) {
		return request != null && request.actor() != null
			&& request.workspaceId() != null && request.noteId() != null;
	}

	private static String ownershipValue(Optional<CorpusOwnership> ownership) {
		if (ownership == null || ownership.isEmpty()) {
			return null;
		}
		return ownership.orElseThrow().name().toLowerCase(Locale.ROOT);
	}

	private static <T> PortResult<T> forbiddenWorkspace() {
		return failure(PortFailure.Code.FORBIDDEN, "Workspace selector does not match session membership.");
	}

	private static <T> PortResult<T> failure(PortFailure.Code code, String detail) {
		return new PortResult.Failure<>(PortFailure.of(code, detail));
	}

	private record UpdateRow(String workspaceId, String corpusOwnership, Instant updatedAt) {
	}

	private record StoredNoteState(String workspaceId, boolean softDeleted) {
	}

	private record CursorPayload(
		int version, String tenantId, String workspaceId, String updatedAt, String noteId) {
	}
}
