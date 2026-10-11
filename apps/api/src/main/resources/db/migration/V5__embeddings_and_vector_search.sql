-- B-06 V5: deterministic mock embeddings + tenant-scoped pgvector persistence/search.
--
-- Additive only. Live provider modes remain gated; this schema stores vectors keyed by
-- existing chunk identity and stays under the same runtime-role RLS posture as V2/V4.

CREATE TABLE embeddings (
	chunk_id             TEXT PRIMARY KEY REFERENCES chunks (chunk_id) ON DELETE CASCADE,
	tenant_id            TEXT NOT NULL REFERENCES tenants (tenant_id),
	workspace_id         TEXT NOT NULL REFERENCES workspaces (workspace_id),
	note_id              TEXT NOT NULL REFERENCES notes (note_id),
	version_id           TEXT NOT NULL REFERENCES note_versions (version_id),
	embedding_model_id   TEXT NOT NULL,
	dimensions           INTEGER NOT NULL,
	embedding            vector NOT NULL,
	created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT embeddings_dimensions_chk CHECK (dimensions > 0)
);

CREATE INDEX idx_embeddings_tenant_workspace_model
	ON embeddings (tenant_id, workspace_id, embedding_model_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE embeddings TO omnidoc_app;

ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON embeddings
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