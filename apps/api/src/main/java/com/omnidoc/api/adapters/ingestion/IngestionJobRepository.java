package com.omnidoc.api.adapters.ingestion;

import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.transaction.support.TransactionTemplate;

import com.omnidoc.api.domain.AccessContext.TenantActor;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.Identifiers.VersionId;
import com.omnidoc.api.domain.Identifiers.WorkspaceId;
import com.omnidoc.api.domain.IngestionModels.JobStatus;
import com.omnidoc.api.persistence.TenantRlsSession;

/**
 * All {@code ingestion_jobs} / {@code ingestion_job_payloads} SQL in one place.
 *
 * <p>Every statement except {@link #claim} runs under normal RLS with the tenant and
 * actor GUCs bound on the same connection inside a transaction. The claim is the one
 * exception required by architecture.md §5.2.1 §4: it has to select a row <em>before</em>
 * the tenant is known, which the fail-closed app-role policy forbids, so it goes through
 * the {@code SECURITY DEFINER} {@code claim_ingestion_job} function instead.
 *
 * <p>Stage and terminal writes are lease-guarded. If another worker reclaimed the job
 * after a lease expiry, the guarded update matches zero rows and the losing worker stops
 * touching the job rather than overwriting the new owner's progress.
 *
 * <p>Never logs payload bytes, note bodies, or file contents.
 */
public class IngestionJobRepository {

	static final int TOTAL_UNITS = 4;

	private static final RowMapper<ClaimedJob> CLAIMED_JOB = (rs, rowNum) -> new ClaimedJob(
		rs.getString("o_job_id"),
		rs.getString("o_tenant_id"),
		rs.getString("o_workspace_id"),
		rs.getString("o_actor_id"),
		rs.getString("o_kind"),
		rs.getInt("o_attempts"));

	private static final RowMapper<JobRow> JOB_ROW = (rs, rowNum) -> new JobRow(
		rs.getString("job_id"),
		rs.getString("workspace_id"),
		rs.getString("kind"),
		JobStatus.valueOf(rs.getString("status").toUpperCase(Locale.ROOT)),
		rs.getInt("completed_units"),
		rs.getInt("total_units"),
		rs.getString("note_id"),
		rs.getString("version_id"),
		rs.getString("error_code"));

	private final JdbcTemplate jdbcTemplate;
	private final TenantRlsSession rlsSession;
	private final TransactionTemplate transactionTemplate;

	public IngestionJobRepository(
		JdbcTemplate jdbcTemplate, TenantRlsSession rlsSession, TransactionTemplate transactionTemplate) {
		this.jdbcTemplate = Objects.requireNonNull(jdbcTemplate, "jdbcTemplate");
		this.rlsSession = Objects.requireNonNull(rlsSession, "rlsSession");
		this.transactionTemplate = Objects.requireNonNull(transactionTemplate, "transactionTemplate");
	}

	/** Run {@code work} in a transaction with both GUCs bound on the same connection. */
	public <T> T inActorAndTenant(TenantActor actor, Supplier<T> work) {
		T result = this.transactionTemplate.execute(status -> this.rlsSession.callWithinActorAndTenant(
			actor.actorId().value(), actor.tenantId().value(), work));
		return result;
	}

	/** Independent membership predicate: a tenant id never implies workspace access. */
	public boolean hasMembership(TenantActor actor, WorkspaceId workspaceId) {
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

	public String insertImportJob(
		TenantActor actor, WorkspaceId workspaceId, String fileName, String mediaType, long sizeBytes,
		byte[] payload) {
		String jobId = "job-" + UUID.randomUUID();
		this.jdbcTemplate.update(
			"""
			INSERT INTO ingestion_jobs
				(job_id, tenant_id, workspace_id, actor_id, kind, status,
				 completed_units, total_units, file_name, media_type, size_bytes)
			VALUES (?, ?, ?, ?, 'import', 'pending', 0, ?, ?, ?, ?)
			""",
			jobId, actor.tenantId().value(), workspaceId.value(), actor.actorId().value(),
			TOTAL_UNITS, fileName, mediaType, sizeBytes);
		this.jdbcTemplate.update(
			"INSERT INTO ingestion_job_payloads (job_id, tenant_id, bytes) VALUES (?, ?, ?)",
			jobId, actor.tenantId().value(), payload);
		return jobId;
	}

	/**
	 * Coalesced rechunk outbox row (§4). The partial unique index on
	 * {@code (note_id) WHERE kind='rechunk' AND status='pending'} does the coalescing, so
	 * a burst of autosaves leaves exactly one pending job.
	 *
	 * @return {@code true} when this call created the pending row
	 */
	public boolean enqueueRechunk(TenantActor actor, WorkspaceId workspaceId, NoteId noteId) {
		int inserted = this.jdbcTemplate.update(
			"""
			INSERT INTO ingestion_jobs
				(job_id, tenant_id, workspace_id, actor_id, kind, status,
				 completed_units, total_units, note_id)
			VALUES (?, ?, ?, ?, 'rechunk', 'pending', 0, ?, ?)
			ON CONFLICT DO NOTHING
			""",
			"job-" + UUID.randomUUID(), actor.tenantId().value(), workspaceId.value(),
			actor.actorId().value(), TOTAL_UNITS, noteId.value());
		return inserted > 0;
	}

	public Optional<JobRow> findJob(TenantActor actor, String jobId) {
		List<JobRow> rows = this.jdbcTemplate.query(
			"""
			SELECT job_id, workspace_id, kind, status, completed_units, total_units,
				note_id, version_id, error_code
			FROM ingestion_jobs
			WHERE tenant_id = ? AND job_id = ?
			""",
			JOB_ROW, actor.tenantId().value(), jobId);
		return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
	}

	/**
	 * Claim the oldest claimable job: {@code pending}, or {@code running} with an expired
	 * lease (crash reclaim). {@code FOR UPDATE SKIP LOCKED} inside the function keeps this
	 * safe for more than one runner without a broker.
	 */
	public Optional<ClaimedJob> claim(String workerId, int leaseSeconds) {
		List<ClaimedJob> claimed = this.jdbcTemplate.query(
			"SELECT * FROM claim_ingestion_job(?, ?)", CLAIMED_JOB, workerId, leaseSeconds);
		return claimed.isEmpty() ? Optional.empty() : Optional.of(claimed.getFirst());
	}

	/** Record stage progress and extend the lease. {@code false} ⇒ the lease was lost. */
	public boolean advance(ClaimedJob job, int completedUnits, String workerId, int leaseSeconds) {
		return inActorAndTenant(job.actor(), () -> this.jdbcTemplate.update(
			"""
			UPDATE ingestion_jobs
			SET completed_units = ?,
				lease_until = now() + make_interval(secs => ?)
			WHERE job_id = ? AND tenant_id = ? AND status = 'running' AND lease_owner = ?
			""",
			completedUnits, leaseSeconds, job.jobId(), job.tenantId(), workerId) > 0);
	}

	public boolean attachNote(ClaimedJob job, NoteId noteId, VersionId versionId, String workerId) {
		return inActorAndTenant(job.actor(), () -> this.jdbcTemplate.update(
			"""
			UPDATE ingestion_jobs
			SET note_id = ?, version_id = ?
			WHERE job_id = ? AND tenant_id = ? AND status = 'running' AND lease_owner = ?
			""",
			noteId.value(), versionId.value(), job.jobId(), job.tenantId(), workerId) > 0);
	}

	/**
	 * Terminal transition. The payload row is dropped in the same transaction so
	 * imported bytes never outlive the job that needed them.
	 */
	public boolean finish(
		ClaimedJob job, JobStatus status, String errorCode, int completedUnits, String workerId) {
		return inActorAndTenant(job.actor(), () -> {
			int updated = this.jdbcTemplate.update(
				"""
				UPDATE ingestion_jobs
				SET status = ?, error_code = ?, completed_units = ?,
					finished_at = now(), lease_owner = NULL, lease_until = NULL
				WHERE job_id = ? AND tenant_id = ? AND status = 'running' AND lease_owner = ?
				""",
				status.name().toLowerCase(Locale.ROOT), errorCode, completedUnits,
				job.jobId(), job.tenantId(), workerId);
			if (updated > 0) {
				this.jdbcTemplate.update(
					"DELETE FROM ingestion_job_payloads WHERE tenant_id = ? AND job_id = ?",
					job.tenantId(), job.jobId());
			}
			return updated > 0;
		});
	}

	public Optional<byte[]> payload(ClaimedJob job) {
		List<byte[]> rows = inActorAndTenant(job.actor(), () -> this.jdbcTemplate.query(
			"SELECT bytes FROM ingestion_job_payloads WHERE tenant_id = ? AND job_id = ?",
			(rs, rowNum) -> rs.getBytes("bytes"),
			job.tenantId(), job.jobId()));
		return rows.isEmpty() ? Optional.empty() : Optional.ofNullable(rows.getFirst());
	}

	public Optional<ImportDescriptor> importDescriptor(ClaimedJob job) {
		List<ImportDescriptor> rows = inActorAndTenant(job.actor(), () -> this.jdbcTemplate.query(
			"SELECT file_name, media_type, size_bytes FROM ingestion_jobs WHERE tenant_id = ? AND job_id = ?",
			(rs, rowNum) -> new ImportDescriptor(
				rs.getString("file_name"), rs.getString("media_type"), rs.getLong("size_bytes")),
			job.tenantId(), job.jobId()));
		return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
	}

	/**
	 * The rechunk target resolved <em>at claim time</em> (§4), not at enqueue: autosave
	 * never waits on chunking, so intermediate versions may legitimately have no chunks.
	 */
	public Optional<RechunkTarget> rechunkTarget(ClaimedJob job) {
		List<RechunkTarget> rows = inActorAndTenant(job.actor(), () -> this.jdbcTemplate.query(
			"""
			SELECT n.note_id, n.workspace_id, n.current_version_id
			FROM ingestion_jobs j
			JOIN notes n ON n.note_id = j.note_id AND n.tenant_id = j.tenant_id
			WHERE j.tenant_id = ? AND j.job_id = ? AND n.soft_deleted_at IS NULL
			""",
			(rs, rowNum) -> new RechunkTarget(
				new NoteId(rs.getString("note_id")),
				new WorkspaceId(rs.getString("workspace_id")),
				new VersionId(rs.getString("current_version_id"))),
			job.tenantId(), job.jobId()));
		return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
	}

	/** Chunk rows and job rows for a note, removed as part of {@code NotesPort.purge}. */
	public void deleteForNote(TenantActor actor, NoteId noteId) {
		this.jdbcTemplate.update(
			"DELETE FROM chunks WHERE tenant_id = ? AND note_id = ?",
			actor.tenantId().value(), noteId.value());
		this.jdbcTemplate.update(
			"""
			DELETE FROM chunk_sets
			WHERE tenant_id = ? AND version_id IN (
				SELECT version_id FROM note_versions WHERE tenant_id = ? AND note_id = ?
			)
			""",
			actor.tenantId().value(), actor.tenantId().value(), noteId.value());
		this.jdbcTemplate.update(
			"DELETE FROM ingestion_job_payloads WHERE tenant_id = ? AND job_id IN ("
				+ "SELECT job_id FROM ingestion_jobs WHERE tenant_id = ? AND note_id = ?)",
			actor.tenantId().value(), actor.tenantId().value(), noteId.value());
		this.jdbcTemplate.update(
			"DELETE FROM ingestion_jobs WHERE tenant_id = ? AND note_id = ?",
			actor.tenantId().value(), noteId.value());
	}

	/** A job the worker owns a lease on. */
	public record ClaimedJob(
		String jobId, String tenantId, String workspaceId, String actorId, String kind, int attempts) {

		public TenantActor actor() {
			return new TenantActor(
				new com.omnidoc.api.domain.Identifiers.TenantId(this.tenantId),
				new com.omnidoc.api.domain.Identifiers.ActorId(this.actorId));
		}

		public WorkspaceId workspace() {
			return new WorkspaceId(this.workspaceId);
		}

		public boolean isRechunk() {
			return "rechunk".equals(this.kind);
		}
	}

	/** Pollable job state. */
	public record JobRow(
		String jobId, String workspaceId, String kind, JobStatus status,
		int completedUnits, int totalUnits, String noteId, String versionId, String errorCode) {
	}

	public record ImportDescriptor(String fileName, String mediaType, long sizeBytes) {
	}

	public record RechunkTarget(NoteId noteId, WorkspaceId workspaceId, VersionId versionId) {
	}
}
