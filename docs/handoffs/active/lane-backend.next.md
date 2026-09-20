---
handoff_id: H-2026-09-20-P1-B04C
affinity: implementation
track: parallel
status: ready
phase: "1"
task: "B-04c"
lane: backend
human_owner: back-end-programmer
from: implementer
to: implementer
created: 2026-09-20
---

# B-04c — B-01–B-04 quality checkpoint

## Start Command

```text
/implementer Read .codex/INSTRUCTIONS.md and docs/handoffs/active/lane-backend.md, then execute B-04c exactly. Evaluate B-01–B-04, close unit/integration/load/API e2e gaps for identity+notes, and add a Postman collection under apps/api/postman. Do not implement B-05 ingestion, B-06 pgvector, S-03 mocks, or production AI. Do not overwrite docs/handoffs/current.md or lane-frontend.md.
```

## Objective

Owner: `/implementer`. **Lane:** `backend`. **Human:** back-end
programmer. **allowed_task_classes:** `B-*` only (this handoff = B-04c).

Checkpoint **before B-05**. Evaluate B-01–B-04 integrity (ports, RLS,
sessions/CSRF/membership, notes CRUD + version concurrency). Close
automated test gaps, run a bounded local load check, add one backend
API e2e flow, and ship a Postman collection for local API integrity.
Not a Phase Check. Does **not** replace B-12.

## Required Reading

1. `context.md` (read-only)
2. `architecture.md` §2, §5.1, §5.7
3. `AGENTS.md`, `.codex/INSTRUCTIONS.md`
4. `docs/planning/implementation-tracks.md` B-04c row
5. Archived B-01…B-04 under `docs/handoffs/archive/`
6. S-02 `docs/api/openapi.yaml` (consume; do not fork)
7. Existing suites under `apps/api/src/test` (identity, RLS, notes)
8. `docs/memory/implementer.md`
9. This handoff

## Inputs / Evidence

- B-01 ports; B-02 schema/RLS/`TenantRlsSession`; B-03 session +
  `WorkspaceMembershipBinder`; B-04 `NotesPort` + notes HTTP
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

- Ingestion (B-05), pgvector (B-06), search/ask, S-03 mocks
- Full B-12 retrieval matrix; frontend Playwright e2e; AWS load

## Deliverables

1. Short evaluation (Outcome and/or
   `apps/api/docs/b01-b04-checkpoint.md`) with go/no-go for B-05.
2. Unit tests for cheap adapter/domain gaps (no live DB).
3. Testcontainers integration gaps only (conflict, soft-delete/purge,
   cross-tenant 0, IDOR 403, CSRF on notes mutators) — do not duplicate
   green coverage.
4. Bounded local load check; record command + numbers in Outcome (not
   CI-required soak).
5. One backend API e2e (MockMvc/Testcontainers): login → workspaces →
   notes create/get/update(conflict+ok) → soft-delete → purge.
6. Postman: `apps/api/postman/omnidoc-b01-b04.postman_collection.json`,
   optional `local.postman_environment.json`, and
   `apps/api/postman/README.md`.

## Constraints / Prohibited Decisions

- Do not fork OpenAPI; escalate contract conflicts
- Do not disable RLS or grant `BYPASSRLS` to `omnidoc_app`
- Keep default profile health/ArchUnit green without live DB
- Do not claim production AI or RTL locale closed

## Acceptance Criteria

- Eval go/no-go recorded
- `cd apps/api && ./gradlew clean test` PASS
- Postman path + run steps documented
- Load check recorded in Outcome
- No changes outside Allowed Write Paths

## Stop / escalate conditions

- Soft-stop: S-02 conflict — escalate; do not fork
- Soft-stop: blocking B-03/B-04 defect beyond Allowed Write Paths —
  escalate
- Hard-stop: disable RLS, Better Auth, or live OpenRouter

## Dependencies / Risks

- Depends on: B-04 (done)
- Blocks: B-05
- Parallel: F-02 — no write overlap
- Risk: Free Tier CI minutes if Testcontainers/load grow too large

## Gates

- Production AI activation remains gated
- RTL locale remains deferred
- Phase Check not opened by this slice

## Completion Instructions

1. Record commands and results in this handoff Outcome.
2. Set `status: completed` and archive under
   `docs/handoffs/archive/H-2026-09-20-P1-B04C-implementer-implementer.md`
   (or dated equivalent). Delete `lane-backend.next.md` if still present.
3. Same-lane next slice: rewrite this file to **B-05** (ingestion /
   chunking jobs + progress port) **or** soft-stop if S-03 should
   interleave — do **not** edit `current.md` or `lane-frontend.md`.
4. Durable lessons only in `docs/memory/implementer.md`.
5. Do not open Phase Check.
