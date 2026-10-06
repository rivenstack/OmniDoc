---
handoff_id: H-2026-10-06-P1-B05A
affinity: research
track: parallel
status: completed
phase: "1"
task: "B-05a"
lane: backend
human_owner: back-end-programmer
from: commander
to: researcher
created: 2026-10-06
completed: 2026-10-06
archived: 2026-10-06
---

# B-05a — Ingestion / chunking techniques research (Researcher)

## Start Command

```text
/researcher Read docs/handoffs/active/lane-backend.md and execute B-05a research exactly. Produce classified evidence on Java-fit ingestion job runners and TipTap/markdown chunking techniques for OmniDoc citation-stable chunks. Do not select vendors as final architecture; do not implement apps/api. Do not overwrite lane-frontend.md or current.md.
```

## Objective

Owner: `/researcher`. **Lane:** `backend`. **Human:** back-end
programmer (reader). **allowed_task_classes:** `B-*` research slice
only (this handoff = **B-05a Researcher**).

Exactly one live owner. Do **not** co-own with Architect. After this
archive, Commander rewrites this lane head to the **Architect** slice
of B-05a (`task: "B-05a"`; archive tag e.g. `B05A-ARCH`).

Gather dated, classified evidence so Architect can lock the best
Phase 1 approach for **ingestion / chunking jobs + progress** under
existing ports and S-02 HTTP. Port ops (`enqueueImport`, `getJob`,
`chunkVersion`) and OpenAPI are **frozen** — research **how** to
chunk and run jobs, not whether the port exists.

Prior single B-05 implementer handoff is **superseded** (archived
`H-2026-09-20-P1-B05-superseded-split.md`). Implementer waits for
**B-05b** after B-05a design closes.

## Required Reading

1. `context.md` (read-only)
2. `architecture.md` §3 (ingestion → chunking), §5.2, §9 (progress
   vocabulary awareness), §10
3. `AGENTS.md` — Extension-First and Reuse-Before-Custom criteria
4. `docs/planning/implementation-tracks.md` B-05a / B-05b rows
5. ADR-0005 (`accepted`) — Java 21 / Boot 4.1.x; JDBC + Flyway; Spring
   AI adapters only; Python not Phase 1
6. S-02 ingestion paths in `docs/api/openapi.yaml` (read-only):
   `POST /api/v1/ingestion-jobs`, `GET /api/v1/ingestion-jobs/{jobId}`,
   `EnqueueImportRequest`, `IngestionJob`, `JobStatus`
7. B-01 ports: `IngestionPort`, `IngestionModels` in `apps/api`
   (read-only)
8. Prior research (do not reopen closed stack decisions): 
   `docs/research/technical/10-backend-runtime-java-spring.md`,
   `14-python-sidecar-policy.md`, `03-multi-tenant-isolation.md`,
   `12-auth-java-spring-security.md`, `13-spring-ai-openrouter-byok-fit.md`,
   `07-hosting-deployment.md`
9. Superseded B-05 implementer scope (deliverables B-05b will inherit):
   `docs/handoffs/archive/H-2026-09-20-P1-B05-superseded-split.md`
10. `docs/memory/researcher.md`
11. This handoff

## Inputs / Evidence

- TipTap/ProseMirror JSON is note SoT; markdown via **one** canonical
  serializer for export + chunking (ADR-0001 §2)
- Chunks immutable per note version; new version ⇒ new chunks;
  **chunk ids stable per version** (`architecture.md` §3 / §5.2)
- Indexing lag is first-class / pollable (REC-02):
  `pending|running|ready|failed|partial` + `completedUnits` /
  `totalUnits`
- Workers must re-resolve tenant + membership (never trust enqueue-only
  claims)
- Embeddings / pgvector are **B-06** — out of this research’s
  selection scope (may note handoff points only)
- Free Tier / Phase 1 simplicity preferred; second process is an
  evidence category, not a mandate

## Allowed Write Paths

- `docs/research/technical/16-ingestion-chunking-jobs.md` (create)
- `docs/research/technical/README.md` (index row)
- `docs/research/technical/00-evidence-matrix.md` (supplement rows
  only if needed)
- `docs/research/version-ledger.md` (library/version pins with access
  dates)
- `docs/memory/researcher.md` (durable lessons only)
- This backend lane handoff and its archive under
  `docs/handoffs/archive/`

## Must Not Touch

- `apps/api/**`, `apps/web/**`, `packages/**`
- `docs/api/openapi.yaml`, `packages/contracts/**`
- `context.md`, `architecture.md`, `docs/adr/**`
- `docs/handoffs/current.md`
- `docs/handoffs/active/lane-frontend.md`
- `docs/planning/implementation-tracks.md` (Commander owns status)
- B-05b / B-06+ product code; production OpenRouter; Python sidecar
  reopen as a recommendation (cite `14` adverse/policy only)

## Out of Scope

- Selecting a final architecture or writing an ADR
- Implementing `IngestionPort`, Flyway, HTTP, or workers
- Embedding models, pgvector, hybrid search, Ask, vault
- Forking OpenAPI or re-authoring S-03 mocks
- Phase Check; production AI activation

## Deliverables

1. **`16-ingestion-chunking-jobs.md`** — classified evidence covering
   at least:
   - **Chunking** for TipTap JSON → markdown projection notes:
     strategies (fixed size, recursive, structure/heading-aware,
     block-id / offset anchors), Java libraries vs custom splitters,
     citation fitness (passage previews, stable ids on re-chunk)
   - **Job runners** under Spring Boot 4.1.x + Postgres: in-process
     `@Async`, Spring Batch, DB-backed queue / outbox /
     `FOR UPDATE SKIP LOCKED`, second Boot worker process; progress
     reporting patterns matching S-02 units
   - **Parsers** for import bytes (e.g. Tika) vs note-version
     re-chunk path; failure modes mapped to port codes
     (`unsupported_type`, `too_large`, `timeout`, `partial`,
     `unavailable`)
   - **Extension-first** tradeoffs (maintenance, Free Tier, tenant
     isolation, upgrade safety, lock-in) — popularity alone is
     insufficient
   - Short **Architect inputs** section (classified, no selection)
2. Version-ledger pins with access dates for any libraries cited
3. README index row for `16`

## Constraints / Prohibited Decisions

- Do **not** mark any chunker, queue, or worker product `accepted`
- Do **not** write or amend ADRs / `architecture.md`
- Do **not** treat chat bullets as verified — fetch primary docs with
  access date **2026-10-06** (or later)
- Do not claim production AI or RTL locale closed
- Do not edit `current.md` or `lane-frontend.md`
- Do not author the Architect or B-05b handoff bodies yourself

## Acceptance Criteria

- `16-ingestion-chunking-jobs.md` exists with classified evidence and
  Architect inputs; no vendor “winner” language as selection
- Ledger (+ README) updated for cited pins
- No changes outside Allowed Write Paths
- Lane returned for Commander → Architect B-05a rewrite (not B-05b)

## Stop / escalate conditions

- Soft-stop: evidence forces reopening ADR-0005 pins or S-02 contract —
  escalate to Commander with precise ask; do not amend ADRs
- Soft-stop: TipTap/markdown serializer ownership is blocked and
  prevents chunking evidence — escalate; do not invent a second SoT
- Hard-stop: implementing `apps/api`, live providers, or disabling
  mock-first / RLS gates

## Dependencies / Risks

- Depends on: B-04c completed; S-03 completed; superseded B-05 scope
  as B-05b target
- Blocks: B-05a Architect slice; then B-05b; then B-06
- Parallel: frontend lane — no write overlap
- Risk: over-scoping into B-06 embeddings — keep chunk + job evidence
  only; note embed handoff points without selecting embed stacks
- Risk: recommending Redis/SQS/etc. without Free Tier / ops fit —
  score hosting/ops adverse evidence explicitly

## Gates

- Production AI activation remains gated
- RTL locale remains deferred
- Phase Check not opened by this slice
- B-05b Implementer not opened until Architect (and optional `@user`
  ADR accept) closes B-05a

## Completion Instructions

1. Record commands, sources, and access dates in this handoff Outcome.
2. Set `status: completed` and archive under
   `docs/handoffs/archive/H-2026-10-06-P1-B05A-commander-researcher.md`
   (or dated equivalent).
3. Soft-stop the lane head as `status: blocked` with Outcome
   `waiting on commander for B-05a Architect` — do **not** author the
   Architect handoff; do **not** open B-05b; do **not** edit
   `current.md` or `lane-frontend.md`.
4. Durable lessons only in `docs/memory/researcher.md`.
5. Do not open Phase Check.

### Commander next (after this archive — not Researcher work)

1. Rewrite `docs/handoffs/active/lane-backend.md` to **B-05a Architect**
   (`to: architect`, handoff_id tag e.g. `B05A-ARCH`): lock chunking +
   job/worker design from `16`; ADR-0006 if material, else
   `architecture.md` §3 / §5.2 elaboration; state what B-05b must not
   invent.
2. If a **new ADR** is proposed → brief `@user` accept before B-05b;
   else Commander accepts design and opens **B-05b** Implementer
   (deliverables from superseded B-05 archive + B-05a Required Reading).

## Outcome

Completed 2026-10-06. Evidence only — **no chunker, queue, or worker
selected.**

### Files written

| Path | Action |
|------|--------|
| `docs/research/technical/16-ingestion-chunking-jobs.md` | created |
| `docs/research/technical/README.md` | index row + B-05a handoff note |
| `docs/research/technical/00-evidence-matrix.md` | §8 supplement |
| `docs/research/version-ledger.md` | B-05a library pins |
| `docs/memory/researcher.md` | durable lessons only |

### Commands / verification

```text
date -u +%Y-%m-%d   # → 2026-10-06
curl Maven Central: tika-core metadata (latest 4.1.0; 3.3.2 present)
curl Maven Central: langchain4j metadata (latest 1.21.0)
curl spring-boot-dependencies:4.1.1.pom → spring-batch.version=6.0.5
WebFetch: Boot 4.1 task-execution; Boot Batch; Spring AI ETL;
  Tika download; TipTap static-renderer + UniqueID; PG 18 SELECT
```

### Key evidence (no winner)

- Chunking strategies: fixed, recursive (LangChain4j), heading-aware,
  block-id/offset (TipTap UniqueID) — citation fitness classified.
- Java libs vs custom: Spring AI `TokenTextSplitter` / Tika reader,
  LangChain4j recursive, custom splitter, Tika-as-parser-only.
- Job runners: `@Async` (ADR-0005 Phase 1 pin context), Spring Batch
  6.0.5, PG `FOR UPDATE SKIP LOCKED` outbox/queue, second Boot worker.
- Serializer ownership is an Architect design surface (one canonical
  TipTap→markdown); port `chunkVersion` already takes projected `text`.
- Python sidecar cited `14` adverse only — not reopened.
- Embeddings deferred to B-06 handoff points only.

### Soft-stops escalated

None that block research completion. Serializer ownership left as
Architect input (not a hard soft-stop — chunking evidence proceeds on
projected text). ADR-0005 / S-02 not reopened.

### Access date

All primary fetches: **2026-10-06**.

### Next

Live lane soft-stopped `blocked` — waiting on Commander to rewrite
`lane-backend.md` for B-05a Architect. Do not open B-05b.
