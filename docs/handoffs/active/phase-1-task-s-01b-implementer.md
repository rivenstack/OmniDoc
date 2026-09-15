---
handoff_id: H-2026-09-15-P1-S01B
affinity: implementation
track: parallel
status: ready
phase: "1"
task: "S-01b"
lane: backend
from: commander
to: implementer
created: 2026-09-15
---

# S-01b — Java API module scaffold (Gradle + Spring Boot)

## Start Command

```text
/implementer Read docs/handoffs/active/phase-1-task-s-01b-implementer.md and execute S-01b exactly. Scaffold the Gradle Spring Boot apps/api health module per ADR-0005. Do not create a Node API. Do not implement Better Auth. Do not enable production OpenRouter. Do not overwrite docs/handoffs/current.md.
```

## Objective

Owner: `/implementer`. **Lane:** `backend` (Backend developer).

Scaffold the **JVM** API module: Java 21 + Spring Boot 4.1.x + **Gradle**,
beside the Nx graph via `run-commands` (ADR-0005 / ADR-0002 Option B).
Deliver a health endpoint and module layout suitable for B-01 ports next.

**No** production OpenRouter adapters. **No** Better Auth. **No** Python
sidecar. FE Nx scaffold is **S-01a** — do not overlap writes.

D-01 `/designer` remains on `docs/handoffs/current.md` — do not replace it.

## Required Reading

1. `context.md`
2. This handoff
3. `docs/planning/implementation-tracks.md` (S-01b / B-* rows)
4. [`docs/adr/ADR-0005-backend-application-stack.md`](../../adr/ADR-0005-backend-application-stack.md) (`accepted`)
5. ADR-0002 (polyglot layout); ADR-0001 §3 / §6 port; ADR-0004
6. `architecture.md` §1–§2, §5 (ports — stubs later in B-01)
7. A-BE2 Outcome pins:
   [`docs/handoffs/archive/H-2026-09-15-P0B-ABE2-commander-architect.md`](../archive/H-2026-09-15-P0B-ABE2-commander-architect.md)
8. `docs/memory/implementer.md`
9. `.cursor/agents/implementer.md` (backend standards)

## Inputs / Evidence (pins — do not re-decide)

| Surface | Pin |
|---------|-----|
| Runtime | Java **21** + Spring Boot **4.1.x** (ledger **4.1.1**) |
| Build | **Gradle** |
| Path | Prefer `apps/api` as JVM project; `backend/` only if Nx fights non-JS `apps/api` (document PoC) |
| Auth class | Spring Security sessions (wire minimally or stub; full B-03 later) |
| Logs | **Log4j2** (`spring-boot-starter-log4j2`); never log secrets |
| CRUD / vector | Spring Data JDBC + JdbcTemplate/pgvector — **not required** for health-only scaffold; do not introduce JPA |
| Migrations | Flyway when schema lands (B-02); optional empty Flyway layout OK |
| Boundaries | ArchUnit baseline that can fail a deliberate Spring AI-on-DTO import |
| Python | Not in Phase 1 |

## Allowed Write Paths

- `apps/api/**` (or documented `backend/**` if PoC forces rename)
- Gradle wrapper + build files for the API module
- Root Nx `run-commands` target(s) that invoke `./gradlew` **without**
  requiring `@nx/gradle`
- BE CI stub under `.github/workflows/` (e.g. `ci-backend.yml`) —
  respect Free Tier CI minutes
- `.env.example` API placeholders only (no real secrets)
- Minimal `docs/api/` health note if useful (optional)
- `docs/memory/implementer.md` (durable lessons only)
- This file: append Outcome; set `status: completed`

**Must not touch:** `apps/web/**`, `packages/ui/**`, FE-only workspace
locks except unavoidable root Nx target registration, `docs/adr/**`,
`architecture.md`, `context.md`, `docs/handoffs/current.md`,
`docs/design/**`, production adapters, Better Auth, Python services.

## Deliverables

1. Gradle Spring Boot 4.1.x module on Java 21 with a **health** endpoint
   (Actuator or simple controller).
2. Log4j2 configured (exclude Logback); JSON-oriented logging OK at stub
   level; redaction comment/doc for BYOK / note bodies.
3. ArchUnit test (or stub rule) proving hexagonal intent — deliberate
   `org.springframework.ai` on a fake DTO fails, then revert.
4. Nx (or docs) `run-commands` so `./gradlew test` / bootRun can be
   invoked from the monorepo without `@nx/gradle`.
5. `.env.example` API placeholders.
6. Outcome listing exact module path and versions used.

## Constraints / Prohibited Decisions

- Do not implement full §5 ports (that is B-01)
- Do not enable Spring AI production clients or OpenRouter keys
- Do not use Spring AI `PgVectorStore` / `initialize-schema=true`
- Do not introduce JPA
- Do not scaffold Better Auth or a Node API
- Do not exceed a lean CI footprint (Free Tier minutes)

## Acceptance Criteria

- `./gradlew` build + health endpoint succeeds locally (document commands)
- Module path matches ADR-0002 preference or documents PoC rename
- No Node `apps/api`; no Better Auth; no Python sidecar
- ArchUnit (or equivalent) check exists for Spring AI leakage
- No overlap with S-01a write paths
- `docs/handoffs/current.md` untouched

## Directionality / accessibility checks

- N/A for health-only API scaffold (no UI). Tenant/security notes in
  Outcome.

## Dependencies / Risks

- Parallel with D-01 and S-01a
- Blocks B-01, B-02, and OpenAPI authoring that needs a running API
- Risk: JVM RSS on Free Tier — document heap defaults; I-03 owns SKU PoC
- Risk: Boot 4 modularization surprises — time-box; do not fall back to
  Boot 3 without Architect

## Gates

- Production AI remains gated
- RTL locale remains deferred
- Full identity/RLS schema is B-02 / B-03 — not this task

## Completion Instructions

1. Scaffold JVM module per Allowed Write Paths.
2. Append Outcome; set `status: completed`.
3. Durable lessons in `docs/memory/implementer.md`.
4. Do **not** open B-01 — Commander opens the next backend live handoff.
5. Do **not** overwrite `docs/handoffs/current.md`.
6. Return integration to `/commander` unless authorized to open B-01.
