-- Dev-only fixture for Postman / local load smoke (B-04c).
-- Password for ada@example.com: correct horse battery staple
-- Apply as omnidoc_migrator (BYPASSRLS table owner), not omnidoc_app.

INSERT INTO tenants (tenant_id, name)
VALUES ('tenant-a', 'Tenant A')
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO actors (actor_id, email, password_hash)
VALUES (
  'actor-a',
  'ada@example.com',
  '$2a$10$4H37sltZmvMvgz7Tez/9EOi3DA4DDnRLQ56b2RHbGhP7pIUFgvc4O'
)
ON CONFLICT (actor_id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO workspaces (workspace_id, tenant_id, name)
VALUES ('ws-a', 'tenant-a', 'Workspace A')
ON CONFLICT (workspace_id) DO NOTHING;

INSERT INTO workspace_memberships (workspace_id, actor_id, tenant_id, roles)
VALUES ('ws-a', 'actor-a', 'tenant-a', '{owner}'::text[])
ON CONFLICT (workspace_id, actor_id) DO NOTHING;
