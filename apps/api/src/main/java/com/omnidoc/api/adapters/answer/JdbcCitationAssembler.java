package com.omnidoc.api.adapters.answer;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

import com.omnidoc.api.domain.AnswerModels.AskQuestion;
import com.omnidoc.api.domain.AnswerModels.Citation;
import com.omnidoc.api.domain.AnswerModels.PassageAnchor;
import com.omnidoc.api.domain.CorpusOwnership;
import com.omnidoc.api.domain.Identifiers.ChunkId;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.Identifiers.VersionId;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.domain.RetrievalModels.SearchHit;
import com.omnidoc.api.persistence.TenantRlsSession;

/** Re-opens retrieval hits under the caller's current membership and RLS scope. */
public final class JdbcCitationAssembler {

	private final JdbcTemplate jdbc;
	private final TenantRlsSession rls;
	private final TransactionTemplate transactions;

	public JdbcCitationAssembler(JdbcTemplate jdbc, TenantRlsSession rls, TransactionTemplate transactions) {
		this.jdbc = Objects.requireNonNull(jdbc);
		this.rls = Objects.requireNonNull(rls);
		this.transactions = Objects.requireNonNull(transactions);
	}

	public PortResult<List<Evidence>> assemble(AskQuestion request, List<SearchHit> hits, Set<String> approvedNoteIds) {
		if (request == null || request.actor() == null || request.acl() == null
			|| hits == null || approvedNoteIds == null) {
			return new PortResult.Failure<>(PortFailure.of(PortFailure.Code.VALIDATION, "Ask scope is required."));
		}
		try {
			PortResult<List<Evidence>> result = this.transactions.execute(ignored ->
				this.rls.callWithinActorAndTenant(
					request.actor().actorId().value(),
					request.actor().tenantId().value(),
					() -> load(request, hits, approvedNoteIds)));
			return Objects.requireNonNull(result);
		}
		catch (DataAccessException ex) {
			return new PortResult.Failure<>(PortFailure.of(PortFailure.Code.UNAVAILABLE,
				"Citation sources are unavailable."));
		}
	}

	private PortResult<List<Evidence>> load(AskQuestion request, List<SearchHit> hits, Set<String> approvedNoteIds) {
		Boolean member = this.jdbc.queryForObject("""
			SELECT EXISTS (
				SELECT 1 FROM workspace_memberships
				WHERE tenant_id = ? AND workspace_id = ? AND actor_id = ?
			)
			""", Boolean.class,
			request.actor().tenantId().value(), request.acl().workspaceId().value(),
			request.actor().actorId().value());
		if (!Boolean.TRUE.equals(member) || request.acl().permissions().isEmpty()) {
			return new PortResult.Failure<>(PortFailure.of(PortFailure.Code.FORBIDDEN,
				"Workspace scope does not match session membership."));
		}

		List<Evidence> accepted = new ArrayList<>();
		Set<String> seen = new LinkedHashSet<>();
		for (SearchHit hit : hits) {
			if (hit == null || !seen.add(hit.chunkId().value())
				|| (!approvedNoteIds.isEmpty() && !approvedNoteIds.contains(hit.noteId().value()))) {
				continue;
			}
			List<Evidence> rows = this.jdbc.query("""
				SELECT c.chunk_id, c.note_id, c.version_id, c.text, c.start_offset, c.end_offset,
					n.updated_at, n.corpus_ownership
				FROM chunks c
				JOIN notes n ON n.note_id = c.note_id AND n.tenant_id = c.tenant_id
				JOIN note_versions v ON v.version_id = c.version_id
					AND v.note_id = c.note_id AND v.tenant_id = c.tenant_id
				WHERE c.tenant_id = ? AND c.workspace_id = ?
					AND n.workspace_id = c.workspace_id
					AND n.soft_deleted_at IS NULL
					AND n.current_version_id = c.version_id
					AND c.chunk_id = ? AND c.note_id = ? AND c.version_id = ?
				""",
				(rs, row) -> {
					String passage = rs.getString("text");
					int start = rs.getInt("start_offset");
					int end = rs.getInt("end_offset");
					if (passage == null || passage.isBlank() || end - start != passage.length()) {
						return null;
					}
					Optional<CorpusOwnership> ownership = Optional.ofNullable(rs.getString("corpus_ownership"))
						.map(value -> CorpusOwnership.valueOf(value.toUpperCase(Locale.ROOT)));
					if (request.corpusOwnership().isPresent()
						&& !request.corpusOwnership().equals(ownership)) {
						return null;
					}
					Timestamp updatedAt = rs.getTimestamp("updated_at");
					Citation citation = new Citation(
						new NoteId(rs.getString("note_id")),
						new VersionId(rs.getString("version_id")),
						new ChunkId(rs.getString("chunk_id")),
						new PassageAnchor(start, end, Optional.empty()),
						passage,
						Optional.ofNullable(updatedAt).map(Timestamp::toInstant),
						ownership);
					return new Evidence(citation, passage);
				},
				request.actor().tenantId().value(), request.acl().workspaceId().value(),
				hit.chunkId().value(), hit.noteId().value(), hit.versionId().value());
			if (!rows.isEmpty() && rows.getFirst() != null) {
				accepted.add(rows.getFirst());
			}
		}
		return new PortResult.Success<>(List.copyOf(accepted));
	}

	public record Evidence(Citation citation, String text) { }
}
