---
handoff_id: H-2026-09-20-P1-B02
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "B-02"
lane: backend
human_owner: back-end-programmer
from: commander
to: implementer
created: 2026-09-20
completed: 2026-09-20
---

# B-02 — Postgres schema + RLS + local Compose

## Start Command

```text
/implementer Read docs/handoffs/active/lane-backend.md and execute B-02 exactly. Add local Docker Compose Postgres 18 + pgvector, Flyway schema for tenants/workspaces/membership/notes/versions, and RLS on a non-owner NOBYPASSRLS app role. Do not implement B-03 auth, B-04 notes HTTP, S-03 mocks, or production AI. Do not overwrite docs/handoffs/current.md or lane-frontend.md.
```

## Objective

Owner: `/implementer`. **Lane:** `backend`. Establish local persistence
foundation: PostgreSQL 18 + pgvector via Compose, Flyway shared-schema
migrations, and RLS DiD on a non-owner `NOBYPASSRLS` app role with tenant
GUC on the same connection inside a transaction.

## Delivered

1. **Compose** — `apps/api/compose.yaml` image `pgvector/pgvector:pg18`;
   init `apps/api/docker/postgres/init/01-roles-and-db.sh` creates DB +
   roles + `vector` extension (superuser).
2. **Roles** — `omnidoc_migrator` (owner, `BYPASSRLS` for schema/seed);
   `omnidoc_app` (`NOBYPASSRLS`, non-owner, DML only).
3. **Flyway** — `V1__extension_and_core_tables.sql` (tenants, actors,
   workspaces, workspace_memberships, notes, note_versions);
   `V2__rls_policies.sql` (ENABLE+FORCE RLS + tenant policies).
4. **GUC** — `app.current_tenant_id` via `set_config(..., true)`;
   helper `TenantRlsSession`. Missing/empty GUC → empty rows (fail closed).
5. **Spring wiring** — JDBC/Flyway/pgvector deps; default profile excludes
   DataSource/Flyway autoconfig so health/ArchUnit need no live DB;
   profile `local` enables Compose datasource. Full NotesPort deferred to B-04.
6. **Tests** — `RlsIsolationTest` (Testcontainers) proves cross-tenant
   invisibility + missing GUC empty.

## Commands / results

```text
# Local Compose
docker compose -f apps/api/compose.yaml --env-file .env.example up -d
docker compose -f apps/api/compose.yaml down

# Tests
cd apps/api && ./gradlew test
# BUILD SUCCESSFUL — HealthEndpointTest, ArchitectureBoundaryTest,
# DomainPortContractTest, RlsIsolationTest all PASS
```

Root `.env.example` updated with DB placeholders only (no secrets).

**Deferred to B-04:** full `NotesPort` JDBC adapter / notes HTTP.

**Not written:** `docs/api/local-postgres.md` (Commander owns after B-02).

## Outcome

**Completed.** B-02 acceptance criteria satisfied. Lane rewritten to B-03.
No Phase Check. Did not touch `current.md`, `lane-frontend.md`, OpenAPI,
mocks, or frontend paths.
