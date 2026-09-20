-- B-02 V2: RLS DiD on tenant-scoped tables.
-- Runtime role: omnidoc_app (NOBYPASSRLS, non-owner) — set in Compose/init.
-- Migration role: omnidoc_migrator (table owner + BYPASSRLS) — set in Compose/init.
-- Tenant GUC: app.current_tenant_id via set_config(..., true) on the SAME
-- pooled connection INSIDE a transaction (ADR-0005).
-- Missing / empty GUC → fail closed as empty (no rows), not error.

-- DML for app role (tables owned by migrator).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
	tenants,
	actors,
	workspaces,
	workspace_memberships,
	notes,
	note_versions
TO omnidoc_app;

-- actors are global identity scaffolding (B-03); not tenant-GUC scoped.
-- All other year-1 corpus / tenancy tables enforce RLS.

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces FORCE ROW LEVEL SECURITY;

ALTER TABLE workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_memberships FORCE ROW LEVEL SECURITY;

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes FORCE ROW LEVEL SECURITY;

ALTER TABLE note_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_versions FORCE ROW LEVEL SECURITY;

-- Policy: GUC must be present AND equal tenant_id. Otherwise zero rows.
CREATE POLICY tenant_isolation ON tenants
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

CREATE POLICY tenant_isolation ON workspaces
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

CREATE POLICY tenant_isolation ON workspace_memberships
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

CREATE POLICY tenant_isolation ON notes
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

CREATE POLICY tenant_isolation ON note_versions
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
