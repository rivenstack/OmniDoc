---
handoff_id: H-2026-10-06-P1-B05A-ARCH
affinity: architecture
track: parallel
status: completed
phase: "1"
task: "B-05a"
lane: backend
human_owner: back-end-programmer
from: commander
to: architect
created: 2026-10-06
archived: 2026-10-06
---

# B-05a — Ingestion / chunking design lock (Architect)

## Start Command

```text
/architect Read docs/handoffs/active/lane-backend.md and execute B-05a Architect exactly. Lock implementer-ready ingestion/chunking/job design from Researcher evidence 16. Do not implement apps/api. Do not open B-05b. Do not overwrite lane-frontend.md or current.md.
```

## Objective

Owner: `/architect`. **Lane:** `backend`. **Human:** back-end
programmer (reader). **allowed_task_classes:** `B-*` architecture
slice only (this handoff = **B-05a Architect**).

Exactly one live owner. Researcher slice is **completed and archived**
— do not re-research. Produce implementer-ready design decisions for
**ingestion / chunking jobs + progress** under frozen B-01 ports and
S-02 HTTP. Port ops (`enqueueImport`, `getJob`, `chunkVersion`) and
OpenAPI stay frozen — decide **how** to chunk and run jobs, not whether
the port exists.

After this archive, Commander opens **B-05b** Implementer (or brief
`@user` ADR accept first **only if** you propose a new ADR). Do **not**
author or open the B-05b lane yourself.

## Required Reading

1. `context.md` (read-only)
2. `architecture.md` §3 (ingestion → chunking), §5.2, §9 (progress
   vocabulary), §10
3. `AGENTS.md` — Extension-First / Reuse-Before-Custom
4. `docs/planning/implementation-tracks.md` — B-05a / B-05b rows
5. ADR-0005 (`accepted`) — Java 21 / Boot 4.1.x; JDBC + Flyway; Spring
   AI adapters only; Phase 1 jobs pin (`@Async` / TaskExecutor); Python
   not Phase 1
6. ADR-0001 §2 (TipTap JSON SoT; one canonical markdown serializer)
7. S-02 ingestion paths in `docs/api/openapi.yaml` (read-only):
   `POST /api/v1/ingestion-jobs`, `GET /api/v1/ingestion-jobs/{jobId}`,
   `EnqueueImportRequest`, `IngestionJob`, `JobStatus`
8. B-01 ports: `IngestionPort`, `IngestionModels` in `apps/api`
   (read-only)
9. **Researcher evidence (primary input):**
   `docs/research/technical/16-ingestion-chunking-jobs.md`
   (Architect inputs §5–§7; no winner language — you select)
10. Archived Researcher handoff:
    `docs/handoffs/archive/H-2026-10-06-P1-B05A-commander-researcher.md`
11. Superseded B-05 implementer scope (B-05b will inherit deliverables):
    `docs/handoffs/archive/H-2026-09-20-P1-B05-superseded-split.md`
12. Prior research (do not reopen closed stack): `10`, `14`, `03`, `07`,
    `13` under `docs/research/technical/`
13. `docs/memory/architect.md`
14. This handoff

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
- Embeddings / pgvector are **B-06** — out of design selection for
  embed models; require chunk rows ready for B-06 handoff
- Free Tier / Phase 1 simplicity preferred
- Researcher shortlist (tradeoffs only — Architect chooses):
  - Chunking: custom deterministic splitter | LangChain4j recursive |
    Spring AI `TokenTextSplitter` (adapter discipline)
  - Runners: DB job row + `@Async` | + `SKIP LOCKED` claim | Spring
    Batch | second Boot worker later (I-03)
- Serializer ownership is an **Architect design surface** (FE bridge vs
  shared Node util vs Java) — must not leave B-05b free to invent a
  second TipTap→markdown SoT

## Allowed Write Paths

- `architecture.md` — §3 / §5.2 (and tightly related progress/citation
  notes) elaboration only; do not rewrite unrelated sections
- `docs/adr/ADR-0006-*.md` — **only if** a material new decision needs
  an ADR (status `proposed`); otherwise prefer architecture elaboration
- `docs/adr/README.md` — row only if ADR-0006 is created
- `docs/research/version-ledger.md` — pin rows if Architect locks a
  library version already evidenced
- `docs/memory/architect.md` — durable lessons only
- This backend lane handoff and its archive under
  `docs/handoffs/archive/`

## Must Not Touch

- `apps/api/**`, `apps/web/**`, `packages/**` (no implementation)
- `docs/api/openapi.yaml`, `packages/contracts/**` (S-02 frozen)
- `docs/handoffs/current.md`
- `docs/handoffs/active/lane-frontend.md`
- `docs/planning/implementation-tracks.md` (Commander owns status)
- `docs/research/technical/16-*` (evidence is input; do not rewrite as
  selection narrative)
- B-05b product code; production OpenRouter; Python sidecar reopen

## Out of Scope

- Re-running Researcher evidence gathering
- Implementing `IngestionPort`, Flyway, HTTP, or workers (that is B-05b)
- Embedding models, pgvector indexes, hybrid search, Ask, vault
- Forking OpenAPI or re-authoring S-03 mocks
- Opening B-05b or Phase Check
- Production AI activation; RTL locale claim

## Deliverables

1. **Implementer-ready design lock** covering at least:
   - **Canonical TipTap→markdown owner** for chunking (and how it
     relates to export / F-12) — one SoT; no second serializer invented
     in B-05b
   - **Chunk algorithm + library (or explicit custom splitter)** with
     frozen `(algorithmId, params)` policy; **chunk id scheme**
     (ordinal / hash / block-id) stable per note version; rule for
     algorithm/param changes (version bump vs forbid in-place re-chunk)
   - **Citation fields:** how `startOffset`/`endOffset` and/or stable
     block ids are produced; UniqueID optional upgrade called in or out
     for Phase 1
   - **Phase 1 job persistence + worker model** (default context:
     ADR-0005 `@Async` + durable job rows; elaborate reclaim / optional
     `SKIP LOCKED`; Batch / second process deferred or justified)
   - **Progress unit semantics** for S-02 `completedUnits` /
     `totalUnits` (what a unit is; when `totalUnits` is known)
   - **Shared pipeline** for `enqueueImport` vs `chunkVersion` (parse →
     note/version → same chunk path)
   - **Parser allowlist + size/time limits** mapped to existing port
     codes (`unsupported_type`, `too_large`, `timeout`, `partial`,
     `unavailable`) — including corrupt-bytes disposition
   - **Spring AI ETL discipline:** may B-05b use Spring AI reader /
     splitter types behind adapters while production AI stays dark, or
     prefer plain Tika + custom/LangChain4j?
   - **Explicit “B-05b must not invent”** list
   - **B-06 handoff contract:** chunk rows carry tenant, version,
     stable id, text, offsets/anchors; no embed writes in B-05b
2. Persist the lock as `architecture.md` §3 / §5.2 elaboration **and/or**
   ADR-0006 `proposed` if material (new broker, UniqueID mandate in
   note SoT, or other decision beyond elaboration)
3. Outcome on this handoff stating Commander next step: open B-05b, or
   route `@user` ADR accept first

## Constraints / Prohibited Decisions

- Do **not** implement code or change OpenAPI
- Do **not** reopen ADR-0005 pins, Python Phase 1, or production AI
- Do **not** select Redis/SQS/etc. without Free Tier / ops fit and an
  ADR — evidence scores brokers adverse for Phase 1
- Do **not** treat Researcher shortlists as already selected — you
  decide from classified evidence
- Do **not** edit `current.md` or `lane-frontend.md`
- Do **not** open or author the B-05b Implementer handoff
- Do not claim RTL locale support or close Phase Check

## Acceptance Criteria

- Design lock answers every Architect-inputs item from `16` §Architect
  inputs (serializer owner; chunk algorithm/ids/units; runner
  elaboration; parser/failure map; Spring AI ETL yes/no; B-06 handoff;
  no Python Phase 1)
- B-05b can implement without inventing chunker, worker topology,
  progress units, or a second TipTap serializer
- S-02 / B-01 ports remain frozen; no contract fork
- If ADR-0006 proposed: status `proposed`, drivers/alternatives/
  consequences present; Outcome says `@user` accept before B-05b
- If no new ADR: Outcome says Commander may accept design and open
  B-05b
- No changes outside Allowed Write Paths
- Lane soft-stopped for Commander (not B-05b self-open)

## Directionality / accessibility checks

- No UI in this slice. Keep citation/progress vocabulary consistent with
  `architecture.md` §9 (REC-02) so FE progress UX stays honest.
- Tenant isolation and worker re-bind remain hard invariants (security,
  not polish).

## Stop / escalate conditions

- Soft-stop: locking a **canonical TipTap→markdown owner** would invent
  a second SoT or force a FE contract change outside BE write paths —
  escalate to Commander with a precise `@user` / FE sequencing ask; do
  not invent a dual serializer
- Soft-stop: evidence forces reopening ADR-0005 or S-02 — escalate; do
  not amend those ADRs/contracts unilaterally
- Soft-stop: material product policy (MIME allowlist, max size) needs
  `@user` — escalate with options; do not silently invent commercial
  policy
- Hard-stop: implementing `apps/api`, enabling live providers, or
  disabling mock-first / RLS gates

## Dependencies / Risks

- Depends on: Researcher B-05a archive + `16-ingestion-chunking-jobs.md`;
  B-04c / S-03 completed; superseded B-05 scope as B-05b target
- Blocks: B-05b; then B-06
- Parallel: frontend lane — no write overlap
- Risk: serializer ownership spans FE — escalate rather than dual-SoT
- Risk: Spring AI ETL vs ArchUnit “adapters only” discipline
- Risk: over-scoping into embeddings — hard stop at chunk persist

## Gates

- Production AI activation remains gated
- RTL locale remains deferred
- Phase Check not opened by this slice
- B-05b Implementer **not** opened until Commander accepts this design
  (and optional `@user` ADR accept if ADR-0006 proposed)

## Completion Instructions

1. Write the design lock to Allowed Write Paths; append Outcome with
   decisions summary and Commander next step.
2. Set `status: completed` and archive under
   `docs/handoffs/archive/H-2026-10-06-P1-B05A-ARCH-commander-architect.md`
   (or dated equivalent).
3. Soft-stop the live lane head as `status: blocked` with Outcome
   `waiting on commander for B-05b` (or `waiting on @user ADR accept`
   if ADR-0006 proposed) — do **not** author B-05b; do **not** edit
   `current.md` or `lane-frontend.md`.
4. Durable lessons only in `docs/memory/architect.md`.
5. Do not open Phase Check.

### Commander next (after this archive — not Architect work)

1. If ADR-0006 `proposed` → brief `@user` accept handoff, then open
   **B-05b**.
2. Else accept Architect design and rewrite `lane-backend.md` to
   **B-05b** Implementer (deliverables from superseded B-05 archive +
   B-05a Required Reading / locked design).

## Outcome

**Completed 2026-10-06.** B-05a Architect design lock written.
**No ADR-0006 proposed** — everything is elaboration of ADR-0001 §2 /
ADR-0005. Commander may accept the design and open B-05b directly (no
`@user` ADR gate).

### Decisions summary

1. Canonical TipTap→markdown owner = Java `pm-md-v1` projector; FE
   bridge reclassified as editor tooling only.
2. Chunker = custom `omni-blockpack-v1` with frozen params; chunk ids
   `{versionId}_c{ordinal}`; policy tuple on `chunk_sets`.
3. Citation = projection offsets **and** top-level block ordinals;
   UniqueID out for Phase 1.
4. Jobs = durable rows + `@Async` + `SECURITY DEFINER` SKIP LOCKED
   claim; lease reclaim; membership re-bind; coalesced rechunk outbox.
5. Progress = stage units; `totalUnits = 4` known at enqueue (matches
   S-03).
6. Parser allowlist includes PDF + DOCX via Tika 4.1.0; markdown via
   commonmark-java 0.30.0; limits as config properties.
7. Spring AI ETL **not permitted** in B-05; ArchUnit rules for B-05b.
8. Explicit “B-05b must not invent” list locked in §5.2.1.
9. B-06 handoff: chunk rows + policy tuple ready; no embed writes in
   B-05b.

### User-authorized exception

`docs/planning/implementation-tracks.md` was edited (normally Commander
owns status): added **B-05c** (test closeout + guided verification),
wired B-06 depends through B-05c, updated Live handoffs + B-05a status.
Named here because it is an exception to the Architect must-not-touch
list.

### Files written

| Path | Action |
|------|--------|
| `architecture.md` | §3 flow; §4 citation anchor line; §5.2.1 design lock |
| `docs/research/version-ledger.md` | Tika/LangChain4j notes; commonmark-java row |
| `docs/memory/architect.md` | durable lessons only |
| `docs/planning/implementation-tracks.md` | B-05c + depends/live-table (user-authorized) |
| This handoff → archive | completed |

### Acceptance criteria checklist

| Criterion | Where answered |
|-----------|----------------|
| ✔ Serializer owner | `architecture.md` §5.2.1 §1 |
| ✔ Chunk algorithm / ids / policy | §5.2.1 §2 |
| ✔ Citation fields + UniqueID | §5.2.1 §3; §4 one-line |
| ✔ Job persistence + worker | §5.2.1 §4 |
| ✔ Progress units | §5.2.1 §5; §3 flow |
| ✔ Shared import / rechunk pipeline | §3 + §5.2.1 §4–§5 |
| ✔ Parser allowlist + failure map | §5.2.1 §6 |
| ✔ Spring AI ETL yes/no | §5.2.1 §7 (no) |
| ✔ B-05b must-not-invent | §5.2.1 §8 |
| ✔ B-06 handoff; no Python Phase 1 | §5.2.1 §9; §4 deferred |
| ✔ No ADR-0006; Commander may open B-05b | this Outcome |
| ✔ S-02 / B-01 ports frozen | no OpenAPI / apps changes |
| ✔ Lane soft-stopped for Commander | live `lane-backend.md` stub |

### Commander next step

Accept the design, rewrite `lane-backend.md` to **B-05b Implementer**
(deliverables from
`docs/handoffs/archive/H-2026-09-20-P1-B05-superseded-split.md`
constrained by `architecture.md` §5.2.1), then open **B-05c** after
B-05b. Do **not** treat the soft-stop stub as a work ticket.
