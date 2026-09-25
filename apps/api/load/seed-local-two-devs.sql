-- Dev-only: two coworkers on separate tenants (isolation checkpoint).
-- Also keeps the Ada fixture from seed-local-fixture.sql semantics.
-- Password for all three: correct horse battery staple
-- Apply as omnidoc_migrator (BYPASSRLS), after Flyway (API boot once).
-- BCrypt hash matches apps/api/load/seed-local-fixture.sql.

INSERT INTO tenants (tenant_id, name) VALUES
  ('tenant-a', 'Tenant A'),
  ('tenant-kenzo', 'Kenzo Tenant'),
  ('tenant-coworker', 'Coworker Tenant')
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO actors (actor_id, email, password_hash) VALUES
  (
    'actor-a',
    'ada@example.com',
    '$2a$10$4H37sltZmvMvgz7Tez/9EOi3DA4DDnRLQ56b2RHbGhP7pIUFgvc4O'
  ),
  (
    'actor-kenzo',
    'kenzo@example.com',
    '$2a$10$4H37sltZmvMvgz7Tez/9EOi3DA4DDnRLQ56b2RHbGhP7pIUFgvc4O'
  ),
  (
    'actor-coworker',
    'coworker@example.com',
    '$2a$10$4H37sltZmvMvgz7Tez/9EOi3DA4DDnRLQ56b2RHbGhP7pIUFgvc4O'
  )
ON CONFLICT (actor_id) DO UPDATE SET
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash;

INSERT INTO workspaces (workspace_id, tenant_id, name) VALUES
  ('ws-a', 'tenant-a', 'Workspace A'),
  ('ws-kenzo', 'tenant-kenzo', 'Kenzo Workspace'),
  ('ws-coworker', 'tenant-coworker', 'Coworker Workspace')
ON CONFLICT (workspace_id) DO NOTHING;

INSERT INTO workspace_memberships (workspace_id, actor_id, tenant_id, roles) VALUES
  ('ws-a', 'actor-a', 'tenant-a', '{owner}'::text[]),
  ('ws-kenzo', 'actor-kenzo', 'tenant-kenzo', '{owner}'::text[]),
  ('ws-coworker', 'actor-coworker', 'tenant-coworker', '{owner}'::text[])
ON CONFLICT (workspace_id, actor_id) DO NOTHING;
