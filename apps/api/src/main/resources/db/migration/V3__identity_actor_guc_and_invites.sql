-- B-03 V3: identity/session support on top of the B-02 tenancy schema.
--
-- Session GUCs (both set with set_config(name, value, true) on the SAME pooled
-- connection INSIDE a transaction — see TenantRlsSession):
--
--   app.current_tenant_id  Tenant authority resolved server-side from the
--                          session membership. Drives the V2 tenant_isolation
--                          policies. Missing / empty → zero rows (fail closed).
--   app.current_actor_id   Authenticated actor resolved server-side from the
--                          Spring Security session. Drives the membership
--                          discovery policies below, which is the only read
--                          path allowed before a tenant is known.
--
-- Neither GUC is ever taken from a client-supplied header or body. The client
-- workspace id is a selector; the server re-binds membership (architecture.md §2).
-- omnidoc_app stays NOBYPASSRLS and non-owner. V2 tenant policies are untouched.

-- Membership discovery: an actor may read its own membership rows before any
-- tenant is bound. Permissive policies OR together, so the V2 tenant_isolation
-- policy still governs every tenant-scoped read/write path.
CREATE POLICY actor_self_memberships ON workspace_memberships
	FOR SELECT
	TO omnidoc_app
	USING (
		current_setting('app.current_actor_id', true) IS NOT NULL
		AND current_setting('app.current_actor_id', true) <> ''
		AND actor_id = current_setting('app.current_actor_id', true)
	);

-- Workspace discovery: only workspaces the bound actor is a member of.
-- The EXISTS subquery is itself RLS-filtered by actor_self_memberships.
CREATE POLICY actor_member_workspaces ON workspaces
	FOR SELECT
	TO omnidoc_app
	USING (
		current_setting('app.current_actor_id', true) IS NOT NULL
		AND current_setting('app.current_actor_id', true) <> ''
		AND EXISTS (
			SELECT 1
			FROM workspace_memberships m
			WHERE m.workspace_id = workspaces.workspace_id
				AND m.actor_id = current_setting('app.current_actor_id', true)
		)
	);

-- Invites are tenant-scoped like every other corpus table.
CREATE TABLE workspace_invites (
	invite_id     TEXT PRIMARY KEY,
	tenant_id     TEXT NOT NULL REFERENCES tenants (tenant_id),
	workspace_id  TEXT NOT NULL REFERENCES workspaces (workspace_id),
	invitee       TEXT NOT NULL,
	roles         TEXT[] NOT NULL DEFAULT '{}',
	invited_by    TEXT NOT NULL REFERENCES actors (actor_id),
	created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspace_invites_tenant_workspace
	ON workspace_invites (tenant_id, workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE workspace_invites TO omnidoc_app;

ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invites FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON workspace_invites
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
