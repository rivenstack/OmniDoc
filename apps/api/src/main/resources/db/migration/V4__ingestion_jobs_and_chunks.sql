-- B-05b V4: durable ingestion jobs + chunk corpus (architecture.md §5.2.1 §2 / §4).
--
-- Additive only. V1–V3 tables and policies are untouched.
--
-- Roles (unchanged): omnidoc_migrator owns + BYPASSRLS; omnidoc_app is the runtime
-- role and stays NOBYPASSRLS / non-owner. Tenant GUC app.current_tenant_id is bound
-- with set_config(..., true) on the SAME connection INSIDE a transaction, exactly as
-- V2 established; missing / empty GUC still fails closed as zero rows.
--
-- No embedding / pgvector columns here: B-06 adds vectors keyed by chunk_id (§9).

CREATE TABLE ingestion_jobs (
	job_id           TEXT PRIMARY KEY,
	tenant_id        TEXT NOT NULL REFERENCES tenants (tenant_id),
	workspace_id     TEXT NOT NULL REFERENCES workspaces (workspace_id),
	actor_id         TEXT NOT NULL REFERENCES actors (actor_id),
	kind             TEXT NOT NULL,
	status           TEXT NOT NULL,
	completed_units  INTEGER NOT NULL DEFAULT 0,
	-- Stage units (§5): 1 validated, 2 parsed, 3 note/version persisted, 4 chunks
	-- persisted. Known at enqueue and never 0 while pending.
	total_units      INTEGER NOT NULL DEFAULT 4,
	note_id          TEXT REFERENCES notes (note_id),
	version_id       TEXT REFERENCES note_versions (version_id),
	file_name        TEXT,
	media_type       TEXT,
	size_bytes       BIGINT,
	error_code       TEXT,
	attempts         INTEGER NOT NULL DEFAULT 0,
	lease_owner      TEXT,
	lease_until      TIMESTAMPTZ,
	created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
	started_at       TIMESTAMPTZ,
	finished_at      TIMESTAMPTZ,
	CONSTRAINT ingestion_jobs_kind_chk CHECK (kind IN ('import', 'rechunk')),
	CONSTRAINT ingestion_jobs_status_chk
		CHECK (status IN ('pending', 'running', 'ready', 'failed', 'partial')),
	CONSTRAINT ingestion_jobs_total_units_chk CHECK (total_units > 0),
	CONSTRAINT ingestion_jobs_completed_units_chk
		CHECK (completed_units >= 0 AND completed_units <= total_units)
);

CREATE INDEX idx_ingestion_jobs_tenant_workspace ON ingestion_jobs (tenant_id, workspace_id);
CREATE INDEX idx_ingestion_jobs_claimable ON ingestion_jobs (status, created_at, job_id);

-- Coalesced rechunk outbox: at most one pending rechunk per note (§4 note-save hook).
CREATE UNIQUE INDEX uq_ingestion_jobs_pending_rechunk
	ON ingestion_jobs (note_id)
	WHERE kind = 'rechunk' AND status = 'pending';

-- Payload bytes live out of the job row and are deleted on any terminal state.
CREATE TABLE ingestion_job_payloads (
	job_id     TEXT PRIMARY KEY REFERENCES ingestion_jobs (job_id) ON DELETE CASCADE,
	tenant_id  TEXT NOT NULL REFERENCES tenants (tenant_id),
	bytes      BYTEA NOT NULL
);

-- One chunk set per version, carrying the policy tuple that produced it (§2).
-- Same version + same tuple ⇒ idempotent no-op; different tuple ⇒ rejected in B-05b.
CREATE TABLE chunk_sets (
	version_id         TEXT PRIMARY KEY REFERENCES note_versions (version_id),
	tenant_id          TEXT NOT NULL REFERENCES tenants (tenant_id),
	projector_id       TEXT NOT NULL,
	chunker_id         TEXT NOT NULL,
	params_hash        TEXT NOT NULL,
	projection_sha256  TEXT NOT NULL,
	chunk_count        INTEGER NOT NULL,
	created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT chunk_sets_chunk_count_chk CHECK (chunk_count >= 0)
);

CREATE INDEX idx_chunk_sets_tenant_id ON chunk_sets (tenant_id);

-- Locked chunk columns (§2). Invariant held by the adapter:
--   projection.substring(start_offset, end_offset) == text
-- start_block / end_block are top-level ProseMirror block ordinals in body_json (§3).
CREATE TABLE chunks (
	chunk_id      TEXT PRIMARY KEY,
	tenant_id     TEXT NOT NULL REFERENCES tenants (tenant_id),
	workspace_id  TEXT NOT NULL REFERENCES workspaces (workspace_id),
	note_id       TEXT NOT NULL REFERENCES notes (note_id),
	version_id    TEXT NOT NULL REFERENCES chunk_sets (version_id) ON DELETE CASCADE,
	ordinal       INTEGER NOT NULL,
	start_block   INTEGER NOT NULL,
	end_block     INTEGER NOT NULL,
	start_offset  INTEGER NOT NULL,
	end_offset    INTEGER NOT NULL,
	text          TEXT NOT NULL,
	text_sha256   TEXT NOT NULL,
	created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT chunks_version_ordinal_unique UNIQUE (version_id, ordinal),
	CONSTRAINT chunks_ordinal_chk CHECK (ordinal >= 0),
	CONSTRAINT chunks_block_range_chk CHECK (end_block >= start_block AND start_block >= 0),
	CONSTRAINT chunks_offset_range_chk CHECK (end_offset >= start_offset AND start_offset >= 0)
);

CREATE INDEX idx_chunks_tenant_workspace ON chunks (tenant_id, workspace_id);
CREATE INDEX idx_chunks_tenant_note ON chunks (tenant_id, note_id);

-- DML for the runtime role (tables are owned by the migrator).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
	ingestion_jobs,
	ingestion_job_payloads,
	chunk_sets,
	chunks
TO omnidoc_app;

ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs FORCE ROW LEVEL SECURITY;

ALTER TABLE ingestion_job_payloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_job_payloads FORCE ROW LEVEL SECURITY;

ALTER TABLE chunk_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunk_sets FORCE ROW LEVEL SECURITY;

ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON ingestion_jobs
	FOR ALL
	TO omnidoc_app
	USING (
		current_setting('app.current_tenant_id', true) IS NOT NULL
		AND current_setting('app.current_tenant_id', true) <> ''
		AND tenant_id = current_setting('app.current_tenant_id', true)
	)
	WITH CHECK (
		current_setting('app.current_tenant_id', true) IS NOT NULL
		AND current_setting('app.current_tenant_id', true) <> ''
		AND tenant_id = current_setting('app.current_tenant_id', true)
	);

CREATE POLICY tenant_isolation ON ingestion_job_payloads
	FOR ALL
	TO omnidoc_app
	USING (
		current_setting('app.current_tenant_id', true) IS NOT NULL
		AND current_setting('app.current_tenant_id', true) <> ''
		AND tenant_id = current_setting('app.current_tenant_id', true)
	)
	WITH CHECK (
		current_setting('app.current_tenant_id', true) IS NOT NULL
		AND current_setting('app.current_tenant_id', true) <> ''
		AND tenant_id = current_setting('app.current_tenant_id', true)
	);

CREATE POLICY tenant_isolation ON chunk_sets
	FOR ALL
	TO omnidoc_app
	USING (
		current_setting('app.current_tenant_id', true) IS NOT NULL
		AND current_setting('app.current_tenant_id', true) <> ''
		AND tenant_id = current_setting('app.current_tenant_id', true)
	)
	WITH CHECK (
		current_setting('app.current_tenant_id', true) IS NOT NULL
		AND current_setting('app.current_tenant_id', true) <> ''
		AND tenant_id = current_setting('app.current_tenant_id', true)
	);

CREATE POLICY tenant_isolation ON chunks
	FOR ALL
	TO omnidoc_app
	USING (
		current_setting('app.current_tenant_id', true) IS NOT NULL
		AND current_setting('app.current_tenant_id', true) <> ''
		AND tenant_id = current_setting('app.current_tenant_id', true)
	)
	WITH CHECK (
		current_setting('app.current_tenant_id', true) IS NOT NULL
		AND current_setting('app.current_tenant_id', true) <> ''
		AND tenant_id = current_setting('app.current_tenant_id', true)
	);

-- Claim (§4). The runtime role's RLS is fail-closed before a tenant GUC is bound, and
-- a claim must happen *before* the tenant is known — so exactly this one statement runs
-- SECURITY DEFINER as the migrator (BYPASSRLS). Every other job / chunk statement runs
-- under normal RLS with the tenant GUC bound. Parameters and output columns are prefixed
-- so no name can be captured by a column reference inside the body.
CREATE FUNCTION claim_ingestion_job(p_worker_id TEXT, p_lease_seconds INTEGER)
RETURNS TABLE (
	o_job_id        TEXT,
	o_tenant_id     TEXT,
	o_workspace_id  TEXT,
	o_actor_id      TEXT,
	o_kind          TEXT,
	o_attempts      INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
	UPDATE ingestion_jobs AS j
	SET status = 'running',
		lease_owner = p_worker_id,
		lease_until = now() + make_interval(secs => p_lease_seconds),
		attempts = j.attempts + 1,
		started_at = COALESCE(j.started_at, now())
	WHERE j.job_id = (
		SELECT c.job_id
		FROM ingestion_jobs AS c
		WHERE c.status = 'pending'
			OR (c.status = 'running' AND c.lease_until IS NOT NULL AND c.lease_until < now())
		ORDER BY c.created_at, c.job_id
		FOR UPDATE SKIP LOCKED
		LIMIT 1
	)
	RETURNING j.job_id, j.tenant_id, j.workspace_id, j.actor_id, j.kind, j.attempts;
$$;

-- Postgres grants EXECUTE on new functions to PUBLIC by default. Revoke first so the
-- claim is reachable by the runtime role only.
REVOKE ALL ON FUNCTION claim_ingestion_job(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_ingestion_job(TEXT, INTEGER) TO omnidoc_app;
