---
handoff_id: H-2026-09-20-P1-B05
affinity: implementation
track: parallel
status: ready
phase: "1"
task: "B-05"
lane: backend
human_owner: back-end-programmer
from: commander
to: implementer
created: 2026-09-20
---

# B-05 — Ingestion / chunking jobs + progress port

## Start Command

```text
/implementer Read docs/handoffs/active/lane-backend.md and execute B-05 exactly. Implement IngestionPort (enqueue + getJob + chunkVersion) with visible indexing progress over S-02 ingestion HTTP. Do not implement B-06 pgvector, B-07 search, B-08 Ask, or production AI. Do not overwrite docs/handoffs/current.md or lane-frontend.md.
```

## Objective

Owner: `/implementer`. **Lane:** `backend`. **Human:** back-end
programmer. **allowed_task_classes:** `B-*` only (this handoff = B-05).

Ship the **ingestion / chunking jobs + progress** path behind
`IngestionPort` (`architecture.md` §5.2) so indexing lag is a
first-class, pollable state (REC-02). Bind every op to tenant +
membership via B-03; consume S-02 OpenAPI as-is. S-03 mock corpus is
**completed** — do not re-author fixtures; Java path is the live API
adapter.

## Required Reading

1. `context.md` (read-only)
2. `architecture.md` §3 (ingestion → chunking), §5.2, §9 (progress
   themes for parity awareness only), §10
3. `AGENTS.md`
4. `docs/planning/implementation-tracks.md` B-05 row
5. ADR-0005 (`accepted`) — Spring Data JDBC / `JdbcTemplate` + Flyway;
   no Spring AI on the wire for this slice
6. S-02 ingestion paths in `docs/api/openapi.yaml` (consume; do not
   fork): `POST /api/v1/ingestion-jobs`,
   `GET /api/v1/ingestion-jobs/{jobId}`, schemas `EnqueueImportRequest`,
   `IngestionJob`, `JobStatus`, error responses `413` / `415`
7. B-01 ports: `IngestionPort`, `IngestionModels` in `apps/api`
8. Archived B-04 —
   `docs/handoffs/archive/H-2026-09-20-P1-B04-implementer-implementer.md`
   (notes/version ids this slice chunks against)
9. Archived B-04c Implementer closeout —
   `docs/handoffs/archive/H-2026-09-20-P1-B04C-IMPL-commander-implementer.md`
10. Archived S-03 —
    `docs/handoffs/archive/H-2026-09-20-P1-S03-commander-implementer.md`
    (fixture job shapes for progress vocabulary parity; read-only)
11. `docs/memory/implementer.md`
12. This handoff

## Inputs / Evidence

- B-04 notes + versions live; B-03 membership binder + RLS session
- S-02 OpenAPI ingestion contract frozen
- B-01 `IngestionPort`: `enqueueImport`, `getJob`, `chunkVersion`;
  `JobStatus` = `PENDING|RUNNING|READY|FAILED|PARTIAL`
- S-03 completed — FE can continue mock journeys without waiting on
  this Java adapter

## Allowed Write Paths

- `apps/api/**` (ingestion domain persistence, JDBC/worker adapter,
  HTTP controllers, Flyway additive migrations for jobs/chunks only,
  tests; optional Postman/load notes under `apps/api/postman` or
  `apps/api/load` if useful)
- `docs/memory/implementer.md` (durable lessons only)
- This backend lane handoff and its archive under
  `docs/handoffs/archive/`

## Must Not Touch

- `packages/mocks/**` (S-03 closed — escalate corpus gaps to Commander)
- `packages/contracts/**`, `docs/api/openapi.yaml`, `docs/api/ask-sse.md`
- `apps/web/**`, `packages/ui/**`
- `context.md`, `architecture.md`, `docs/adr/**`
- `docs/handoffs/current.md`
- `docs/handoffs/active/lane-frontend.md`
- B-06+ product code (pgvector, embed, search, Ask); Better Auth;
  production OpenRouter

## Out of Scope

- pgvector + mock embed adapter (B-06)
- Lexical / hybrid search HTTP (B-07)
- Ask port / citation assembler (B-08)
- Sample-vs-mine retrieval labelling beyond existing note field (B-09)
- Vault / usage / mode adapters (B-10); export (B-11)
- Re-authoring `packages/mocks` or MSW handlers
- Production AI / live provider calls
- Phase Check

## Deliverables

1. **Persistence** for ingestion jobs (+ chunk rows for a version) with
   tenant RLS / GUC discipline consistent with B-02/B-03; additive
   Flyway only.
2. **`IngestionPort` adapter** implementing `enqueueImport`, `getJob`,
   and `chunkVersion`:
   - Progress visible: `pending` → `running` → `ready` (and
     `failed` / `partial` where warranted)
   - Chunk ids **stable per note version** (re-chunk same version →
     same ids)
   - Failures map to port/HTTP: `unsupported_type` (415), `too_large`
     (413), `timeout`, `partial`, `unavailable` as applicable
3. **HTTP surface** matching S-02: multipart enqueue → `202` +
   `IngestionJob`; GET job → `200` with `completedUnits` /
   `totalUnits`; workspace selector + CSRF on mutating path; membership
   IDOR → `403`; unknown job → `404`.
4. **Tests:** unit for chunk stability / status transitions; ITs for
   enqueue → poll progress → ready (or failed/partial), cross-tenant
   isolation, CSRF on POST, size/type rejection.
5. Do **not** open B-06; return completed archive to Commander (or
   soft-stop only if blocked on a cross-lane / contract issue).

## Constraints / Prohibited Decisions

- Do not fork OpenAPI or `@omnidoc/contracts`; escalate mismatches
- Do not disable RLS or grant `BYPASSRLS` to `omnidoc_app`
- Indexing lag must remain observable — do not hide jobs behind
  synchronous-only APIs with no progress
- Chunking only; no embedding writes / similarity search in this slice
- Do not claim production AI or RTL locale closed
- Do not edit `current.md` or `lane-frontend.md`

## Acceptance Criteria

- `cd apps/api && ./gradlew clean test` PASS (include new ingestion
  coverage)
- Enqueue + getJob HTTP match S-02 shapes; progress units update before
  `ready`
- Same version re-chunk yields stable chunk ids
- Cross-tenant / non-member job access denied
- No changes outside Allowed Write Paths
- B-06 / B-08 / mocks package not implemented or rewritten

## Directionality / accessibility checks

- No UI in this slice. Any future progress copy must remain
  locale-ready (`en` LTR now); do not hard-code RTL assumptions into
  job status enums or error codes.

## Stop / escalate conditions

- Soft-stop: S-02 contract conflict — escalate to Commander; do not fork
- Soft-stop: B-04 notes/version schema gap blocks chunk FK — escalate
  with precise schema ask; do not invent a second notes authority
- Soft-stop: product asks for embed/pgvector to “finish” progress —
  stop; that is B-06
- Hard-stop: live OpenRouter, Better Auth, or disablement of RLS /
  mock-first gates

## Dependencies / Risks

- Depends on: B-04c completed; **S-03 completed** (archived 2026-09-20)
- Blocks: B-06 (preferred next on this lane after B-05)
- Parallel: F-02 — no write overlap; F-03+ may use S-03 fixtures without
  waiting on this Java adapter
- Risk: over-scoping into B-06 embeddings or B-07 search; keep jobs +
  chunks + progress only
- Risk: background worker complexity — prefer a bounded in-process or
  clock-step worker that still exposes real status transitions under
  test

## Gates

- Production AI activation remains gated
- RTL locale remains deferred
- Phase Check not opened by this slice

## Completion Instructions

1. Record commands and results in this handoff Outcome.
2. Set `status: completed` and archive under
   `docs/handoffs/archive/H-2026-09-20-P1-B05-commander-implementer.md`
   (or dated equivalent).
3. Soft-stop the lane head as `status: blocked` with Outcome
   `waiting on commander for B-06` — do **not** author B-06 yourself;
   do **not** edit `current.md` or `lane-frontend.md`.
4. Durable lessons only in `docs/memory/implementer.md`.
5. Do not open Phase Check.
