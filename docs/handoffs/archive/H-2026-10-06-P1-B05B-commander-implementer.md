---
handoff_id: H-2026-10-06-P1-B05B
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "B-05b"
lane: backend
human_owner: back-end-programmer
from: commander
to: implementer
created: 2026-10-06
completed: 2026-10-06
---

# B-05b — IngestionPort implement (jobs + progress)

## Start Command

```text
/implementer Read docs/handoffs/active/lane-backend.md and execute B-05b exactly. Implement IngestionPort (enqueueImport + getJob + chunkVersion) against the B-05a design lock in architecture.md §5.2.1. Do not re-decide chunking or worker topology. Do not implement B-06 pgvector, B-05c closeout, or production AI. Do not overwrite docs/handoffs/current.md or lane-frontend.md.
```

## Objective

Owner: `/implementer`. **Lane:** `backend`. **Human:** back-end
programmer. **allowed_task_classes:** `B-*` only (this handoff =
**B-05b**).

Ship the **ingestion / chunking jobs + progress** path behind
`IngestionPort` (`architecture.md` §5.2) so indexing lag is a
first-class, pollable state (REC-02). Bind every op to tenant +
membership via B-03; consume S-02 OpenAPI as-is.

**B-05a design is Commander-accepted** (2026-10-06). Implement exactly
`architecture.md` §5.2.1 — do **not** re-select chunker, serializer,
runner, progress units, parser allowlist, or Spring AI ETL. No
ADR-0006; no `@user` ADR gate.

Product deliverables match the superseded single B-05 implementer
scope (`H-2026-09-20-P1-B05-superseded-split.md`), **constrained by**
§5.2.1. After this archive, Commander opens **B-05c** (test closeout +
guided verification) — do **not** author B-05c yourself.

## Required Reading

1. `context.md` (read-only)
2. **`architecture.md` §5.2.1** (B-05a design lock — primary SoT) plus
   §3 (ingestion → chunking flow), §4 citation anchors, §5.2 port
   table, §9 / §10 as needed
3. `AGENTS.md`
4. `docs/planning/implementation-tracks.md` — B-05b / B-05c rows
5. ADR-0005 (`accepted`) — JDBC + Flyway; `@Async` / TaskExecutor;
   Spring AI adapters only (ETL **not** permitted in B-05); Python not
   Phase 1
6. ADR-0001 §2 (TipTap JSON SoT; one canonical markdown projector)
7. S-02 ingestion paths in `docs/api/openapi.yaml` (consume; do not
   fork): `POST /api/v1/ingestion-jobs`,
   `GET /api/v1/ingestion-jobs/{jobId}`, schemas `EnqueueImportRequest`,
   `IngestionJob`, `JobStatus`, error responses `413` / `415`
8. B-01 ports: `IngestionPort`, `IngestionModels` in `apps/api`
9. Archived B-05a Architect (accepted design):
   `docs/handoffs/archive/H-2026-10-06-P1-B05A-ARCH-commander-architect.md`
10. Researcher evidence (input only; do not re-select):
    `docs/research/technical/16-ingestion-chunking-jobs.md`
11. Superseded B-05 product scope (deliverables inheritance):
    `docs/handoffs/archive/H-2026-09-20-P1-B05-superseded-split.md`
12. Archived B-04 / B-04c / S-03 under `docs/handoffs/archive/`
    (notes/versions, progress vocabulary parity; read-only)
13. `docs/research/version-ledger.md` — Tika 4.1.0, commonmark-java
    0.30.0 pins
14. `docs/memory/implementer.md`
15. This handoff

## Inputs / Evidence

- B-05a Architect **Commander-accepted**; lock in `architecture.md`
  §5.2.1; **no ADR-0006**
- B-04 notes + versions live; B-03 membership binder + RLS session
- S-02 OpenAPI ingestion contract frozen
- B-01 `IngestionPort`: `enqueueImport`, `getJob`, `chunkVersion`
- S-03 completed — FE can continue mock journeys without waiting on
  this Java adapter
- Locked choices (do not reopen): Java `pm-md-v1` projector;
  `omni-blockpack-v1` chunker + frozen params; chunk ids
  `{versionId}_c{ordinal}`; durable jobs + `@Async` +
  `SECURITY DEFINER` SKIP LOCKED claim; `totalUnits = 4` stage
  units; Tika + commonmark allowlist; Spring AI ETL forbidden

## Allowed Write Paths

- `apps/api/**` (projection + chunker + parser adapters, ingestion
  domain persistence, JDBC/worker adapter, HTTP controllers, Flyway
  additive migrations for jobs/chunks/`chunk_sets` only, ArchUnit
  rules for B-05 packages, tests; optional Postman/load notes under
  `apps/api/postman` or `apps/api/load` if useful for smoke — full
  B-05c closeout is a later ticket)
- `docs/memory/implementer.md` (durable lessons only)
- This backend lane handoff and its archive under
  `docs/handoffs/archive/`

## Must Not Touch

- `packages/mocks/**` (S-03 closed — escalate corpus gaps to Commander)
- `packages/contracts/**`, `docs/api/openapi.yaml`, `docs/api/ask-sse.md`
- `apps/web/**`, `packages/ui/**` (FE bridge stays editor tooling; no
  FE change required)
- `context.md`, `architecture.md`, `docs/adr/**`
- `docs/planning/implementation-tracks.md` (Commander owns status)
- `docs/handoffs/current.md`
- `docs/handoffs/active/lane-frontend.md`
- B-05c runbook / guided verification authorship (next ticket)
- B-06+ product code (pgvector, embed, search, Ask); Better Auth;
  production OpenRouter

## Out of Scope

- Re-deciding B-05a locked design (§5.2.1 §8 must-not-invent list)
- B-05c test closeout + guided verification walkthrough
- pgvector + mock embed adapter (B-06)
- Lexical / hybrid search (B-07); Ask / citations (B-08)
- Vault / usage / mode (B-10); export (B-11)
- Re-authoring `packages/mocks` or MSW handlers
- Production AI / live provider calls
- Phase Check

## Deliverables

1. **Persistence** (additive Flyway; RLS like V2; `omnidoc_app` grants)
   per §5.2.1 §4 / §2:
   - `ingestion_jobs` + `ingestion_job_payloads`
   - `chunk_sets` + chunk rows with locked columns
   - `claim_ingestion_job` `SECURITY DEFINER` SKIP LOCKED function
   - Coalesced `rechunk` outbox on B-04 version-commit (partial unique
     pending-rechunk-per-note)
2. **`pm-md-v1` projector** + **`omni-blockpack-v1` chunker** behind
   ports in `apps/api` (Java corpus SoT; FE bridge not authority).
3. **Parser adapter** — Tika 4.1.0 (PDF/DOCX/HTML) + commonmark-java
   0.30.0 (markdown) + plain text; allowlist + limits from §5.2.1 §6.
4. **`IngestionPort` adapter** — `enqueueImport`, `getJob`,
   `chunkVersion`:
   - Runner: `@Async` afterCommit + `@Scheduled` sweeper; lease /
     membership re-bind; stage progress `totalUnits = 4`
   - Chunk ids stable per version under locked policy; same policy ⇒
     idempotent no-op; different policy ⇒ reject (no in-place rechunk)
   - Failures map to port/HTTP: `unsupported_type` (415), `too_large`
     (413), `timeout`, `partial`, `unavailable`
5. **HTTP surface** matching S-02: multipart enqueue → `202` +
   `IngestionJob`; GET job → `200` with units; workspace selector +
   CSRF; membership IDOR → `403`; unknown job → `404`.
6. **ArchUnit** — no `org.springframework.ai..` in ingestion packages;
   Tika/commonmark confined to parser adapter; none on HTTP DTOs /
   domain.
7. **Tests sufficient to prove the slice** (unit + ITs for enqueue →
   poll → ready/failed/partial, chunk stability, cross-tenant, CSRF,
   size/type rejection, claim/reclaim basics). Full B-05c matrix and
   guided walkthrough are **out of scope** here.
8. Soft-stop for Commander to open **B-05c** — do not open B-06.

## Constraints / Prohibited Decisions

- Do **not** invent anything on §5.2.1 §8 (second TipTap serializer;
  different chunker/params/ids; overlap; tokenizer; Redis/SQS;
  Spring Batch; second process; different unit semantics /
  `totalUnits=0` while pending; Spring AI ETL; Python; embed/pgvector
  columns; new OpenAPI ops; different allowlist/limits without `@user`)
- Do not fork OpenAPI or `@omnidoc/contracts`; escalate mismatches
- Do not disable RLS or grant `BYPASSRLS` to `omnidoc_app`
- Indexing lag must remain observable — no synchronous-only hide
- Chunking only; no embedding writes / similarity search
- Do not claim production AI or RTL locale closed
- Do not edit `current.md` or `lane-frontend.md`
- Do not author or open B-05c / B-06

## Acceptance Criteria

- `cd apps/api && ./gradlew clean test` PASS (include new ingestion /
  projection / chunker / parser coverage)
- Enqueue + getJob HTTP match S-02; progress units update before
  `ready`; `totalUnits = 4` known at enqueue
- Same version + same policy re-chunk yields stable chunk ids;
  `projection.substring(start,end) == text`
- Cross-tenant / non-member job access denied; membership loss mid-job
  ⇒ failed
- ArchUnit rules for §5.2.1 §7 hold
- No changes outside Allowed Write Paths
- No B-06 / B-08 / mocks rewrite; no Spring AI ETL types in ingestion

## Directionality / accessibility checks

- No UI in this slice. Progress / error codes stay locale-ready (`en`
  LTR now); do not hard-code RTL assumptions into job status enums.
- Citation/progress vocabulary must stay consistent with §5.2.1 / §9
  so FE progress UX remains honest when wired later.

## Stop / escalate conditions

- Soft-stop: S-02 contract conflict — escalate to Commander; do not fork
- Soft-stop: B-04 notes/version schema gap blocks chunk FK or outbox —
  escalate with precise schema ask; do not invent a second notes
  authority
- Soft-stop: §5.2.1 lock cannot be implemented as written — escalate to
  Commander / Architect; do not invent an alternate design
- Soft-stop: product asks for embed/pgvector to “finish” progress —
  stop; that is B-06
- Soft-stop: full guided verification / Postman matrix pressure —
  defer to B-05c; do not expand this ticket into B-05c
- Hard-stop: live OpenRouter, Better Auth, or disablement of RLS /
  mock-first gates

## Dependencies / Risks

- Depends on: B-05a Commander-accepted; B-04c / S-03 completed
- Blocks: B-05c, then B-06
- Parallel: frontend lane — no write overlap; F-* may use S-03
  fixtures without waiting on this Java adapter
- Risk: over-scoping into B-05c closeout or B-06 embeddings
- Risk: worker/lease complexity — follow §5.2.1 §4 exactly; do not
  invent brokers

## Gates

- Production AI activation remains gated
- RTL locale remains deferred
- Phase Check not opened by this slice
- B-05c / B-06 **not** opened until Commander accepts this archive

## Completion Instructions

1. Record commands and results in this handoff Outcome.
2. Set `status: completed` and archive under
   `docs/handoffs/archive/H-2026-10-06-P1-B05B-commander-implementer.md`
   (or dated equivalent).
3. Soft-stop the lane head as `status: blocked` with Outcome
   `waiting on commander for B-05c` — do **not** author B-05c or
   B-06; do **not** edit `current.md` or `lane-frontend.md`.
4. Durable lessons only in `docs/memory/implementer.md`.
5. Do not open Phase Check.

## Outcome

**Status: completed 2026-10-06.** B-05b shipped as specified by the
B-05a lock in `architecture.md` §5.2.1. No design choice on the §8
must-not-invent list was reopened; no ADR was authored.

### Commands and results

```text
cd apps/api && ./gradlew clean test
BUILD SUCCESSFUL in 1m — 100 tests, 0 failures, 0 errors, 0 skipped
```

Per-class: `ArchitectureBoundaryTest` 6 · `ProseMirrorMarkdownProjectorTest`
10 · `BlockPackChunkerTest` 8 · `TikaImportParserTest` 12 ·
`IngestionWorkerIT` 11 · `IngestionHttpIT` 6 · plus the 47 pre-existing
B-01…B-04c tests, all still green.

Supporting command: `./gradlew dependencies --configuration runtimeClasspath`
confirmed the version-ledger pins resolve — Tika 4.1.0 and commonmark
0.30.0 (+ `commonmark-ext-gfm-tables` 0.30.0, which `tika-core` 4.1.0
itself depends on, independently corroborating the companion pin).

### Deliverable 1 — persistence

`apps/api/src/main/resources/db/migration/V4__ingestion_jobs_and_chunks.sql`
(additive; V1–V3 untouched):

- `ingestion_jobs` (`kind` ∈ import|rechunk, `status` ∈
  pending|running|ready|failed|partial, `completed_units`,
  `total_units DEFAULT 4`, `attempts`, `lease_owner`, `lease_until`) and
  `ingestion_job_payloads` (`BYTEA`, `ON DELETE CASCADE`)
- `chunk_sets` (`version_id` PK, `projector_id`, `chunker_id`,
  `params_hash`, `projection_sha256`, `chunk_count`) and `chunks`
  (`UNIQUE (version_id, ordinal)`, FK to `chunk_sets` `ON DELETE CASCADE`)
- `claim_ingestion_job(TEXT, INTEGER)` — `SECURITY DEFINER`,
  `FOR UPDATE SKIP LOCKED`, `SET search_path`; `REVOKE ALL … FROM PUBLIC`
  then `GRANT EXECUTE` to `omnidoc_app` only. Also reclaims jobs whose
  lease has expired, so a crashed runner does not strand work.
- Coalesced outbox: `uq_ingestion_jobs_pending_rechunk` partial unique on
  `(note_id) WHERE kind='rechunk' AND status='pending'`
- `ENABLE` + `FORCE ROW LEVEL SECURITY` with `tenant_isolation` policies
  shaped exactly like V2 on all four tables; DML grants to `omnidoc_app`;
  **no** `BYPASSRLS` granted anywhere; **no** embedding/vector columns

### Deliverable 2 — projector + chunker

- `com.omnidoc.api.projection` — `ProseMirrorMarkdownProjector`
  (`pm-md-v1`) + `Projection` / `BlockSpan`. StarterKit + table allowlist,
  fixed mark precedence, unknown node/mark degrades to text plus an
  `unknown_node:<type>` / `unknown_mark:<type>` warning, byte-identical
  across runs. Returns contiguous block spans so chunk anchors are exact.
- `com.omnidoc.api.chunking` — `BlockPackChunker` (`omni-blockpack-v1`),
  `ChunkPolicy` (frozen `maxChars=1200`, `softMinChars=300`,
  `headingBreak=true`, `overlapChars=0`; constructor rejects non-zero
  overlap), `ChunkDraft` with ids `{versionId}_c{ordinal:04d}`. UTF-16
  code units, no tokenizer, `projection.substring(start,end) == text`
  asserted in code, not just in tests.

### Deliverable 3 — parser adapter

`com.omnidoc.api.adapters.ingestion.parser` — `TikaImportParser`
(+ `ImportMediaType`, `MarkdownToProseMirror`, `ProseMirrorDocuments`,
`ParsedDocument`, `ImportParser`, `ImportParseException`). Allowlist
`text/markdown`, `text/plain`, `text/html`, `application/pdf`, DOCX; 10 MiB
cap; declared type ∩ Tika content detection, so a declaration outside the
allowlist is refused even when the extension would match. Tika exceptions
are wrapped in a neutral checked exception so no library type escapes the
adapter. Gradle: narrow Tika modules (core/pdf/microsoft/html/text) rather
than `tika-parsers-standard-package`, which would pull formats outside the
allowlist.

### Deliverable 4 — `IngestionPort` adapter + runner

`com.omnidoc.api.adapters.ingestion` — `JdbcIngestionAdapter`,
`IngestionWorker`, `IngestionJobRepository`, `VersionChunker`,
`IngestionDispatcher`, `JdbcRechunkOutbox`, `IngestionLimits`.

- `enqueueImport`: size/type validated before any write → `too_large` /
  `unsupported_type`; inserts `pending` at `0/4` plus the payload, then
  dispatches `@Async` on `afterCommit`; the `@Scheduled` sweeper (~15 s)
  is the guarantee, the post-commit dispatch only the latency hint.
- `getJob`: membership-bound, tenant-RLS scoped, workspace mismatch ⇒
  `forbidden` (IDOR), unknown ⇒ `not_found`.
- `chunkVersion`: same policy ⇒ idempotent no-op returning the existing
  set; different policy ⇒ `conflict` (no in-place rechunk).
- Runner: lease 120 s, membership re-bound at each stage, stage units
  1 validated → 2 parsed → 3 note/version persisted → 4 chunks persisted,
  `attempts > 3` ⇒ `failed`/`unavailable`, payload deleted on every
  terminal transition. Lease loss abandons silently (the new owner owns
  the job); membership loss fails the job.
- Domain tweak: `EnqueueImport` and `GetJob` now carry `WorkspaceId`;
  `IngestionPort` method signatures unchanged.
- `JdbcNotesAdapter` enqueues the coalesced rechunk in the same
  transaction as the version commit, and purges chunks/jobs before the
  note rows, via a consumer-owned `RechunkOutbox` interface.

### Deliverable 5 — HTTP surface

`com.omnidoc.api.web.ingestion` — `IngestionController` +
`IngestionExceptionHandler` + `IngestionDtos`. `POST /api/v1/ingestion-jobs`
multipart → `202` with `IngestionJob`; `GET /api/v1/ingestion-jobs/{jobId}`
→ `200`; `OmniDoc-Workspace-Id` selector and CSRF enforced; failures via
the existing `PortFailures` mapping (`413`, `415`, `409`, `403`, `404`,
`400`, `503`). S-02 consumed unchanged — no OpenAPI or contracts edit.

### Deliverable 6 — ArchUnit

`ArchitectureBoundaryTest` grew four §7 rules: no `org.springframework.ai..`
in ingestion/projection/chunking/web.ingestion; Tika and commonmark confined
to the parser adapter; projection and chunking stay framework-neutral; notes
must not depend on ingestion (the outbox interface is consumer-owned).

### Deliverable 7 — tests

Unit: projector determinism / mark precedence / table escaping / unknown-node
warnings; chunker substring invariant, stable zero-padded ids, heading break,
oversized-block hard split, frozen params hash; parser allowlist, detection
contradiction, DOCX-renamed-archive, markdown round-trip.
ITs (Testcontainers `pgvector/pgvector:pg18`): `IngestionWorkerIT` drives
`drain()` by hand for determinism — four stage units, policy tuple, payload
cleanup, idempotent re-chunk, policy/body rejection, cross-tenant and
wrong-workspace denial, membership loss ⇒ `failed`/`forbidden`, expired-lease
reclaim, exhausted attempts, coalesced rechunk chunking only
`current_version_id`, purge cleanup, and `omnidoc_app` seeing zero job rows
without a tenant GUC. `IngestionHttpIT` runs the real scheduler end to end:
`202` at `0/4` → poll → `ready` at `4/4` with note and chunks behind it,
plus `415`, `413`, missing-CSRF `403`, missing-selector `400`, anonymous
`401`, wrong-workspace `403`, unknown-job `404`.

### Files created

```text
apps/api/src/main/resources/db/migration/V4__ingestion_jobs_and_chunks.sql
apps/api/src/main/java/com/omnidoc/api/projection/Projection.java
apps/api/src/main/java/com/omnidoc/api/projection/ProseMirrorMarkdownProjector.java
apps/api/src/main/java/com/omnidoc/api/chunking/ChunkPolicy.java
apps/api/src/main/java/com/omnidoc/api/chunking/ChunkDraft.java
apps/api/src/main/java/com/omnidoc/api/chunking/BlockPackChunker.java
apps/api/src/main/java/com/omnidoc/api/adapters/ingestion/IngestionLimits.java
apps/api/src/main/java/com/omnidoc/api/adapters/ingestion/IngestionDispatcher.java
apps/api/src/main/java/com/omnidoc/api/adapters/ingestion/IngestionJobRepository.java
apps/api/src/main/java/com/omnidoc/api/adapters/ingestion/VersionChunker.java
apps/api/src/main/java/com/omnidoc/api/adapters/ingestion/JdbcIngestionAdapter.java
apps/api/src/main/java/com/omnidoc/api/adapters/ingestion/IngestionWorker.java
apps/api/src/main/java/com/omnidoc/api/adapters/ingestion/JdbcRechunkOutbox.java
apps/api/src/main/java/com/omnidoc/api/adapters/ingestion/parser/ImportMediaType.java
apps/api/src/main/java/com/omnidoc/api/adapters/ingestion/parser/ImportParser.java
apps/api/src/main/java/com/omnidoc/api/adapters/ingestion/parser/ImportParseException.java
apps/api/src/main/java/com/omnidoc/api/adapters/ingestion/parser/ParsedDocument.java
apps/api/src/main/java/com/omnidoc/api/adapters/ingestion/parser/ProseMirrorDocuments.java
apps/api/src/main/java/com/omnidoc/api/adapters/ingestion/parser/MarkdownToProseMirror.java
apps/api/src/main/java/com/omnidoc/api/adapters/ingestion/parser/TikaImportParser.java
apps/api/src/main/java/com/omnidoc/api/adapters/notes/RechunkOutbox.java
apps/api/src/main/java/com/omnidoc/api/web/ingestion/IngestionDtos.java
apps/api/src/main/java/com/omnidoc/api/web/ingestion/IngestionController.java
apps/api/src/main/java/com/omnidoc/api/web/ingestion/IngestionExceptionHandler.java
apps/api/src/test/java/com/omnidoc/api/projection/ProseMirrorMarkdownProjectorTest.java
apps/api/src/test/java/com/omnidoc/api/chunking/BlockPackChunkerTest.java
apps/api/src/test/java/com/omnidoc/api/adapters/ingestion/parser/TikaImportParserTest.java
apps/api/src/test/java/com/omnidoc/api/ingestion/IngestionWorkerIT.java
apps/api/src/test/java/com/omnidoc/api/ingestion/IngestionHttpIT.java
```

### Files changed

```text
apps/api/build.gradle.kts                                            (Tika + commonmark deps)
apps/api/src/main/java/com/omnidoc/api/domain/IngestionModels.java   (WorkspaceId on EnqueueImport / GetJob)
apps/api/src/main/java/com/omnidoc/api/adapters/notes/JdbcNotesAdapter.java (rechunk outbox hooks)
apps/api/src/main/java/com/omnidoc/api/config/LocalPersistenceConfig.java  (@EnableAsync/@EnableScheduling + ingestion beans)
apps/api/src/main/resources/application.yml                          (omnidoc.ingestion.*, multipart limits)
apps/api/src/test/java/com/omnidoc/api/ArchitectureBoundaryTest.java (§7 rules)
apps/api/src/test/java/com/omnidoc/api/notes/NotesHttpIT.java        (park sweeper during TRUNCATE)
apps/api/src/test/java/com/omnidoc/api/notes/NotesLifecycleE2eIT.java (park sweeper)
```

No file outside the Allowed Write Paths was touched: `context.md`,
`architecture.md`, `docs/adr/**`, `docs/api/**`, `docs/planning/**`,
`docs/handoffs/current.md`, `lane-frontend.md`, `packages/**`, and
`apps/web/**` are unmodified by this slice.

### Interpretations worth Commander/Architect awareness (no design reopened)

1. **`softMinChars=300` vs "a heading always starts a chunk."** Taken as
   non-contradictory: the heading break is unconditional, and `softMinChars`
   only prevents an *avoidably* tiny tail produced by a hard split inside one
   oversized block. Documented in the `BlockPackChunker` javadoc. If B-05c
   wants a different reading, the change is local to one method.
2. **A DOCX-shaped archive passes content detection.** DOCX is a
   specialization of `application/zip` in Tika's type hierarchy, so a zip
   renamed `.docx` and declared as DOCX is not refused at detection. §6
   already covers the case: it fails at parse time and the job terminates
   `failed`/`unsupported_type`. Pinned by a named test.
3. **`jsonb` round-trip is not byte-stable**, so `projection_sha256` hashes
   the projection built from the parsed tree, never the raw `body_json`
   string read back from Postgres.
4. **An import's stage 3 also enqueues a rechunk** through the B-04 hook;
   it resolves as an idempotent no-op against the set stage 4 just wrote.

### Soft-stops raised

- **B-05c is not authored.** Lane head is `status: blocked` with Outcome
  `waiting on commander for B-05c`. The full verification matrix, Postman
  collection, and guided walkthrough are deliberately left to that ticket.
- **B-06 not opened.** No embedding column, vector index, or similarity
  path exists; `chunks` carries text and anchors only.
- No contract conflict, schema gap, or §5.2.1 implementability problem was
  found — the lock implemented as written.
