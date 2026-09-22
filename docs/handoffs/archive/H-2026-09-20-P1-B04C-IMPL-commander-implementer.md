---
handoff_id: H-2026-09-20-P1-B04C-IMPL
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "B-04c"
lane: backend
human_owner: back-end-programmer
from: commander
to: implementer
created: 2026-09-20
completed: 2026-09-20
archived: 2026-09-20
---

# B-04c — Test and Postman closeout (Implementer)

## Start Command

```text
/implementer Read docs/handoffs/active/lane-backend.md and execute B-04c exactly. Close unit/integration/load/API e2e gaps for identity+notes and add a Postman collection under apps/api/postman. Do not implement S-03 mocks, B-05 ingestion, B-06 pgvector, or production AI. Do not overwrite docs/handoffs/current.md or lane-frontend.md. Do not open S-03 or B-05 — return to Commander.
```

## Objective

Owner: `/implementer`. **Lane:** `backend`. **Human:** back-end
programmer. **allowed_task_classes:** `B-*` only (this handoff = B-04c
**Implementer closeout**).

Commander has recorded **GO** on B-01–B-04 evaluation. Close remaining
automated test gaps, run a bounded local load check, add one backend API
e2e flow, and ship Postman for local API integrity. Not Phase Check.
Does **not** replace B-12. **Do not** open S-03 or B-05 — Commander
opens **S-03 next** (before B-05) after this archive.

## Required Reading

1. `context.md` (read-only)
2. `architecture.md` §2, §5.1, §5.7
3. `AGENTS.md`
4. `docs/planning/implementation-tracks.md` B-04c row
5. Archived Commander B-04c eval Outcome (GO required)
6. Archived B-01…B-04 under `docs/handoffs/archive/`
7. S-02 `docs/api/openapi.yaml` (consume; do not fork)
8. Existing suites under `apps/api/src/test`
9. `docs/memory/implementer.md`
10. This handoff

## Inputs / Evidence

- Commander B-04c eval **GO**
- B-03 identity ITs; B-04 notes ITs; RLS isolation tests
- S-02 identity/notes paths and `ErrorBody`

## Allowed Write Paths

- `apps/api/**` (tests, optional helpers, `apps/api/postman/**`,
  optional `apps/api/docs/b01-b04-checkpoint.md`, optional
  `apps/api/load/**`)
- `docs/memory/implementer.md` (durable lessons only)
- This backend lane handoff and its archive

## Must Not Touch

- `packages/mocks/**`, `packages/contracts/**`, `docs/api/openapi.yaml`
- `apps/web/**`, `packages/ui/**`
- `context.md`, `architecture.md`, `docs/adr/**`
- `docs/handoffs/current.md`
- `docs/handoffs/active/lane-frontend.md`
- B-05+ product code; Better Auth; production OpenRouter

## Out of Scope

- Re-doing Commander evaluation
- Opening S-03 or B-05 (Commander owns next handoff; **S-03 before B-05**)
- Ingestion, pgvector, search/ask, mock corpus authorship
- Full B-12 retrieval matrix; frontend Playwright; AWS load

## Deliverables

1. Unit tests for cheap adapter/domain gaps (no live DB).
2. Testcontainers integration gaps only (do not duplicate green
   coverage): conflict, soft-delete/purge, cross-tenant 0, IDOR 403,
   CSRF on notes mutators.
3. Bounded local load check; record command + numbers in Outcome (not
   CI-required soak).
4. One backend API e2e (MockMvc/Testcontainers): login → workspaces →
   notes create/get/update(conflict+ok) → soft-delete → purge.
5. Postman: `apps/api/postman/omnidoc-b01-b04.postman_collection.json`,
   optional `local.postman_environment.json`, and
   `apps/api/postman/README.md`.

## Constraints / Prohibited Decisions

- Do not fork OpenAPI; escalate contract conflicts
- Do not disable RLS or grant `BYPASSRLS` to `omnidoc_app`
- Keep default profile health/ArchUnit green without live DB
- Do not rewrite this lane to S-03 or B-05 — return completed archive to
  Commander
- Do not claim production AI or RTL locale closed

## Acceptance Criteria

- `cd apps/api && ./gradlew clean test` PASS
- Postman path + run steps documented
- Load check recorded in Outcome
- No changes outside Allowed Write Paths
- Lane left for Commander to open **S-03** (Implementer must not)

## Stop / escalate conditions

- Soft-stop: S-02 conflict — escalate to Commander; do not fork
- Soft-stop: blocking B-03/B-04 defect — escalate to Commander
- Hard-stop: disable RLS, Better Auth, or live OpenRouter

## Dependencies / Risks

- Depends on: Commander B-04c eval GO
- Blocks: S-03 then B-05 (Commander opens; S-03 first)
- Parallel: F-02 — no write overlap; F-03/F-04 wait on S-03
- Risk: Free Tier CI minutes if Testcontainers/load grow too large

## Gates

- Production AI activation remains gated
- RTL locale remains deferred
- Phase Check not opened by this slice

## Completion Instructions

1. Record commands and results in this handoff Outcome.
2. Set `status: completed` and archive under
   `docs/handoffs/archive/H-2026-09-20-P1-B04C-IMPL-commander-implementer.md`
   (or dated equivalent).
3. Soft-stop the lane head as `status: blocked` with Outcome
   `waiting on commander for S-03` — do **not** author S-03 or B-05
   yourself; do **not** edit `current.md` or `lane-frontend.md`.
4. Durable lessons only in `docs/memory/implementer.md`.
5. Do not open Phase Check.

## Outcome

**Completed 2026-09-20.** B-04c Implementer closeout shipped. No S-03 /
B-05 / OpenAPI / FE / `current.md` changes. Production AI and RTL remain
gated. Phase Check not opened.

### Delivered

1. **Unit (no live DB):** `PortFailuresTest`, `PortResultsTest`,
   `IdentifiersTest`, `RuntimeModeTest`, `PortFailureTest`,
   `IdentitySessionsTest`, `SessionPrincipalsTest`.
2. **IT gaps (no duplicate green suites):** CSRF 403 negatives extended
   on notes `PATCH` / soft-delete / purge in `NotesHttpIT` (create CSRF
   already covered). Conflict, soft-delete/purge, cross-tenant 0, and
   IDOR remain covered by existing green ITs.
3. **API e2e:** `NotesLifecycleE2eIT` —
   login → workspaces → create → get → update conflict + ok →
   soft-delete → purge.
4. **Postman:** `apps/api/postman/omnidoc-b01-b04.postman_collection.json`,
   `local.postman_environment.json`, `README.md`.
5. **Load:** `apps/api/load/b04c-notes-smoke.sh`,
   `seed-local-fixture.sql`, `README.md`.

### Verification

```text
cd apps/api && ./gradlew clean test
# BUILD SUCCESSFUL — 49 tests, 0 skipped, 0 failures, 0 errors

# Bounded local load (Compose Postgres + SPRING_PROFILES_ACTIVE=local bootRun,
# after apps/api/load/seed-local-fixture.sql):
CYCLES=50 ./apps/api/load/b04c-notes-smoke.sh
# success=50/50
# wall_ms=2691
# create_get_p50_ms=46
# create_get_p95_ms=56
```

Postman run steps: `apps/api/postman/README.md`.

### Soft-stop

Lane head left `status: blocked` — **waiting on commander for S-03**.
Implementer did **not** author S-03 or B-05.
