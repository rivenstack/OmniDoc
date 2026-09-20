---
handoff_id: H-2026-09-20-P1-B02
affinity: implementation
track: parallel
status: ready
phase: "1"
task: "B-02"
lane: backend
human_owner: back-end-programmer
from: commander
to: implementer
created: 2026-09-20
---

# B-02 — Postgres schema + RLS + local Compose

## Start Command

```text
/implementer Read docs/handoffs/active/lane-backend.md and execute B-02 exactly. Add local Docker Compose Postgres 18 + pgvector, Flyway schema for tenants/workspaces/membership/notes/versions, and RLS on a non-owner NOBYPASSRLS app role. Do not implement B-03 auth, B-04 notes HTTP, S-03 mocks, or production AI. Do not overwrite docs/handoffs/current.md or lane-frontend.md.
```

## Objective

Owner: `/implementer`. **Lane:** `backend`. **Human:** back-end
programmer. **allowed_task_classes:** `B-*` only (this handoff = B-02).

Establish the local persistence foundation for Phase 1: PostgreSQL 18
with pgvector via Docker Compose (backend-owned, not DevOps), Flyway
migrations for the year-1 shared-schema tables, and defense-in-depth
RLS on a non-owner, non-`BYPASSRLS` runtime role with tenant GUC on the
same connection inside a transaction (ADR-0001 §3, ADR-0005).

S-02 is **completed** and archived — HTTP contracts already exist.
B-02 does **not** implement controllers or identity sessions; it makes
schema + RLS + local DB runnable so B-03 / B-04 can build on it.

## Required Reading

1. `context.md` (read-only)
2. `architecture.md` §2 (tenancy), §3 (notes/versions), §10 invariants
3. `AGENTS.md`
4. `docs/planning/implementation-tracks.md` B-02 row
5. ADR-0001 §3 (Postgres + RLS DiD), ADR-0001 §4 (pgvector)
6. ADR-0005 (`accepted`) — Flyway; Spring Data JDBC (CRUD);
   JdbcTemplate + `com.pgvector:pgvector` 0.1.6 (vector/RLS); migration
   role ≠ app role; no Spring AI `initialize-schema=true`
7. `docs/research/technical/03-multi-tenant-isolation.md` (RLS failure
   modes — owner/`BYPASSRLS` bypass, FORCE RLS)
8. Archived S-01b —
   `docs/handoffs/archive/H-2026-09-15-P1-S01B-commander-implementer.md`
9. Archived B-01 —
   `docs/handoffs/archive/H-2026-09-16-P1-B01-commander-implementer.md`
   (domain vocabulary; do not rewrite ports unless migration naming
   requires a tiny alignment — prefer matching B-01 ids)
10. Archived S-02 —
    `docs/handoffs/archive/H-2026-09-17-P1-S02-implementer-implementer.md`
    + `docs/api/openapi.yaml` (column/DTO naming awareness only)
11. `docs/memory/implementer.md`
12. This handoff

## Inputs / Evidence

- S-01b Gradle Boot scaffold under `apps/api` (health + ArchUnit)
- Empty Flyway placeholder: `apps/api/src/main/resources/db/migration/`
- B-01 Java ports/domain models (tenants, workspaces, notes, versions,
  corpus ownership optional fields)
- S-02 OpenAPI shapes for notes/workspaces (align names; do not edit
  `docs/api/**` in this handoff)

## Allowed Write Paths

- `apps/api/**` (Compose, Flyway SQL, Spring Data JDBC / JdbcTemplate
  config, RLS helpers, tests; Gradle deps as needed for JDBC/Flyway/
  pgvector/Testcontainers)
- Root or `apps/api` Compose entry only if required for a single local
  Postgres service — prefer `apps/api/compose.yaml` (or
  `docker-compose.yml`) under the API module
- `docs/api/health.md` or a short `apps/api` / `docs/api` local-DB note
  **only** if needed to document Compose/Flyway commands (no OpenAPI
  contract changes)
- `docs/memory/implementer.md` (durable lessons only)
- This backend lane handoff and its archive

## Must Not Touch

- `packages/mocks/**` (S-03)
- `packages/contracts/**`, `docs/api/openapi.yaml`, `docs/api/ask-sse.md`
  (S-02 SoT — consume only)
- `apps/web/**`, `packages/ui/**`
- `context.md`, `architecture.md`, `docs/adr/**`
- `docs/handoffs/current.md`
- `docs/handoffs/active/lane-frontend.md`
- Better Auth, Node `apps/api`, Spring AI schema init, live OpenRouter

## Out of Scope

- Spring Security session login / CSRF spa wiring (B-03)
- Notes HTTP CRUD / controllers (B-04)
- Ingestion workers, embeddings, search, Ask adapters (B-05+)
- Deterministic mock corpus / MSW (S-03)
- AWS / RDS / hosted deploy (I-*)
- Production AI activation

## Deliverables

1. **Local Compose** — PostgreSQL **18** image with **pgvector**;
   documented `up` / `down` / connection URL; credentials only via
   env / `.env.example` placeholders (no real secrets committed).
2. **Flyway migrations** — shared schema for at least: tenants,
   workspaces, membership, notes, note versions (and any minimal FK
   scaffolding needed for those). Migration role ≠ runtime app role.
3. **RLS DiD** — enable RLS + `FORCE ROW LEVEL SECURITY` on tenant-scoped
   tables; policies keyed by tenant GUC; runtime app role is **non-owner**
   and **non-`BYPASSRLS`**. Document the GUC name and that it must be set
   on the **same** pooled connection **inside a transaction**.
4. **App wiring** — Spring Data JDBC and/or JdbcTemplate + pgvector-java
   dependency pins per ADR-0005; datasource config for local Compose;
   a small helper or repository path that sets tenant GUC before queries
   (enough to prove the pattern — full NotesPort adapter can wait for
   B-04 if clearly deferred in Outcome).
5. **Verification** — automated test(s) that fail closed without tenant
   GUC and/or prove cross-tenant row invisibility under the app role
   (Testcontainers Postgres+pgvector preferred; stay within Free Tier CI
   minute awareness — one focused suite is enough).

## Constraints / Prohibited Decisions

- Do not use JPA / Liquibase / schema-per-tenant
- Do not use Spring AI `PgVectorStore` or `initialize-schema=true`
- Do not grant the app role table ownership or `BYPASSRLS`
- Do not invent a second OpenAPI SoT from Java
- Do not claim production AI or RTL locale closed
- Do not open B-03 / S-03 from this handoff unless Completion Instructions
  explicitly allow rewriting the lane head after B-02 PASS

## Acceptance Criteria

- `docker compose` (or documented equivalent) brings up Postgres 18 +
  pgvector locally
- Flyway migrates cleanly against that database
- RLS policies exist; app role cannot read another tenant’s rows when
  GUC is set to tenant A
- Missing / wrong tenant GUC does not leak cross-tenant data (fail closed
  or empty — document which)
- `./gradlew test` (or `nx run api:test`) PASS including the new
  isolation/RLS proof
- No changes outside Allowed Write Paths
- No production adapters or secret material in the repo

## Stop / escalate conditions

- Soft-stop: image/pgvector version conflict with ADR-0001 §3/§4 pins —
  escalate to Commander with evidence; do not silently pick a different
  major Postgres
- Hard-stop: pressure to disable RLS, use owner/`BYPASSRLS` app role,
  reopen ADR-0005, or activate live OpenRouter — stop and escalate

## Dependencies / Risks

- Depends on: S-01b (done), B-01 vocabulary (done)
- Blocks: B-03, B-04, B-06 (vector path)
- Parallel: F-02 (frontend) — no write overlap
- Risk: Testcontainers CI minutes — keep the matrix small
- Risk: B-01 sources still noted uncommitted in `context.md` — commit
  hygiene is human/PR concern; do not block schema work

## Gates

- Production AI activation remains gated
- RTL locale remains deferred
- DevOps I-* remain unassigned (local Compose is **this** lane)

## Completion Instructions

1. Record commands and results in this handoff Outcome.
2. Set `status: completed` and archive under
   `docs/handoffs/archive/H-2026-09-20-P1-B02-commander-implementer.md`.
3. Same-lane next slice with no unmet cross-lane dep: rewrite this file
   to **B-03** (identity adapter) **or** soft-stop and return to
   Commander if you judge S-03 should interleave first — do **not** edit
   `current.md` or `lane-frontend.md`.
4. Durable lessons only in `docs/memory/implementer.md`.
5. Do not open Phase Check.
