# Ingestion Jobs + Citation-Stable Chunking (B-05a)

**Research date / access date:** 2026-10-06  
**Version pins:** [`../version-ledger.md`](../version-ledger.md) (B-05a rows verified 2026-10-06)  
**Question:** For OmniDoc Phase 1 under ADR-0005 (Java 21 / Spring Boot
4.1.x + Postgres), what are the serious, Java-fit options for (1)
TipTap/ProseMirror → markdown projection chunking that keeps citation
anchors stable per note version, and (2) ingestion job runners that
surface S-02 `completedUnits` / `totalUnits` progress? **No selection.**

Kept as accepted context (do not reopen here): Next.js UI; TipTap JSON
note SoT (ADR-0001 §2); Postgres 18 + RLS DiD; pgvector (embed path is
**B-06**); Spring Boot 4.1.x / Java 21; Spring Data JDBC + Flyway;
Spring AI adapters only; Python **not** Phase 1 (ADR-0005 §6; cite
`14` adverse only); S-02 ingestion HTTP frozen; B-01 `IngestionPort`
frozen.

**B-06 handoff points only (out of selection scope):** once chunks exist
with stable ids + offsets/anchors, `EmbeddingPort` / pgvector write and
tenant-filtered similarity become B-06. Do not choose embed models,
dims, or index types here.

## Classification Legend

| Label | Meaning |
|-------|---------|
| **Verified technical** | Confirmed from official docs / repo / standards |
| **Verified provider rule** | Stated in current provider docs/ToS |
| **Common practice** | Industry pattern; not mandatory |
| **Inference** | Reasonable conclusion from evidence; needs PoC or gate |
| **Unresolved** | Conflicting, undated, or inaccessible official material |
| **@user gate** | Needs explicit product/budget/privacy decision |

Confidence: **H** high (primary official), **M** medium, **L** low.

---

## Requirements (from architecture + ports — not invented)

| Requirement | Source | Class |
|-------------|--------|-------|
| Note SoT = TipTap/ProseMirror JSON; markdown = export / **chunking projection** via **one** canonical serializer | `architecture.md` §3; ADR-0001 §2 | Accepted architecture |
| Chunks immutable per note version; new version ⇒ new chunks; **chunk ids stable per version** | `architecture.md` §3 / §5.2 | Accepted architecture |
| Passage citations need `noteId`, `versionId`, `chunkId`, offset **or** stable block id, preview text | `architecture.md` §4 | Accepted architecture |
| Progress pollable: `pending\|running\|ready\|failed\|partial` + units | S-02 `JobStatus` / `IngestionJob`; REC-02 | Frozen contract |
| Port failures: `unsupported_type`, `too_large`, `timeout`, `partial`, `unavailable` | `architecture.md` §5.2; OpenAPI 413/415 | Frozen contract |
| Workers re-resolve tenant + membership (never trust enqueue-only claims) | `architecture.md` §2 | Accepted architecture |
| Phase 1 jobs pin (ADR-0005): `@Async` / TaskExecutor in API process; split worker when I-03 memory allows | ADR-0005 §7 | Accepted pin — **evidence may still score alternatives**; do not treat as reopened |

B-01 models already encode citation-facing fields:

- `Chunk(ChunkId, NoteId, VersionId, startOffset, endOffset, text)`
- `ChunkVersion(..., String text)` — re-chunk path may receive **projected text**, not TipTap JSON
- `IngestionJob(jobId, status, completedUnits, totalUnits)`

---

## 1. Chunking TipTap JSON → markdown projection

### 1.1 Serializer ownership (boundary before algorithms)

| Fact | Evidence | Class | Conf. |
|------|----------|-------|-------|
| TipTap documents `renderToMarkdown` via `@tiptap/static-renderer` (no Editor instance) | tiptap.dev static-renderer docs (accessed 2026-10-06) | Verified technical | H |
| TipTap Markdown extension: `editor.getMarkdown()` / `editor.markdown.serialize(json)` | tiptap.dev markdown basic-usage / Editor API (accessed 2026-10-06) | Verified technical | H |
| Static renderer **does not** run UniqueID / transaction hooks; UniqueID attrs need `generateUniqueIds` pre-process | Same static-renderer limitations section | Verified technical | H |
| FE already pins `tiptap-markdown` **0.9.0** and a client `markdown-bridge` | `docs/research/version-ledger.md`; `packages/ui` (read-only) | Verified technical | H |
| Port `chunkVersion` takes `String text` | `IngestionModels.ChunkVersion` | Verified technical | H |

**Inference (M):** Phase 1 Java chunking can operate on an already-projected
markdown/plain string if the **single** serializer lives upstream of the
port (FE or a shared Node utility invoked before enqueue). A **second**
Java TipTap serializer would violate “one canonical serializer” unless
Architect explicitly designates Java as that sole owner and retires the
FE bridge — **do not invent a second SoT in B-05b**.

**Unresolved / Architect design surface:** which runtime owns the
canonical TipTap→markdown projection for chunking vs export vs F-12
render. Soft-stop escalate to Commander only if Architect cannot decide
without inventing a second SoT; this research can still score chunkers
on **text already projected**.

**Adverse:** TipTap static markdown docs warn output is **not** flavor-
validated; FE `tiptap-markdown` vs static-renderer vs a future Java port
are **not** proven bit-identical (PoC required).

### 1.2 Strategies (citation fitness)

| Strategy | How it works | Citation fitness | Class | Conf. |
|----------|--------------|------------------|-------|-------|
| **Fixed size** (chars / tokens) | Slice every N units with optional overlap | Offsets easy (`startOffset`/`endOffset`); passage previews trivial; **ids** must be derived (e.g. version + ordinal or content hash) — re-chunk with same algorithm+params ⇒ stable ordinals | Common practice | H |
| **Recursive** (paragraph → line → sentence → word) | Prefer larger semantic units until size fits | Better boundary quality than naive fixed; offsets still computable on concatenated projection; overlap semantics must be frozen for id stability | Verified technical (LangChain4j `DocumentSplitters.recursive`) | H |
| **Structure / heading-aware** | Split on ATX headings / TipTap heading nodes before size caps | Stronger retrieval locality; **Adverse:** heading renames / insert-above shifts later chunk ordinals unless ids are content-hash or block-id based | Common practice + Inference | M |
| **Block-id / offset anchors** | Persist TipTap UniqueID (or similar) + markdown offsets | Best match to §4 “offsets **or** stable block id”; UniqueID is TipTap extension (`@tiptap/extension-unique-id`); static path needs `generateUniqueIds` | Verified technical (UniqueID docs) + Inference (product mapping) | H / M |

**Stable ids on re-chunk (Inference, H for logic / M for OmniDoc):**

- Architecture requires stability **per version**, not across versions.
- For a fixed `(versionId, algorithmId, params)` tuple, deterministic
  ordinal chunk ids (`{versionId}:{i}`) are citation-stable on identical
  projected text.
- Changing algorithm/params ⇒ **new** chunk set for that version (or
  forbid in-place re-chunk without a version bump) — product rule for
  Architect.
- Content-hash ids survive ordinal shifts better but complicate
  “passage preview” identity when overlap changes.

### 1.3 Java libraries vs custom

| Option | Version (ledger) | What it provides | Fit notes | Class | Conf. |
|--------|------------------|------------------|-----------|-------|-------|
| **A — Custom splitter** behind §5.2 | n/a | Fixed / heading / recursive rules owned by OmniDoc | Max control of offsets + id scheme; matches S-03 fixture determinism; more code | Common practice | H |
| **B — Spring AI `TokenTextSplitter`** | Spring AI **2.0.1** | Token-count chunks; builder (`chunkSize`, min chars, keepSeparator); default CL100K_BASE via jtokkit | Documented ETL transformer (accessed 2026-10-06). **Adverse:** Spring AI is ADR-0005 **adapters only** for embed/ask; using ETL types in domain packages risks ArchUnit / “Spring AI on wire” discipline — keep behind adapter if used | Verified technical | H |
| **C — LangChain4j `DocumentSplitters.recursive`** | LangChain4j **1.21.0** | Paragraph→line→sentence→word→char hierarchy; char or token limits | Apache-2.0 library; ADR-0005 already lists LangChain4j as fallback class for AI adapters (`13`). Still must not become corpus SoT | Verified technical | H |
| **D — Apache Tika alone** | Tika **4.1.0** / **3.3.2** | Extract text/XHTML from bytes — **not** a RAG chunker | Parser for `enqueueImport`; insufficient as citation chunker | Verified technical | H |

**Adverse (B/C):** Library chunk metadata (Spring AI `Document`,
LangChain4j `TextSegment`) must map into OmniDoc `Chunk` DTOs; never
leak framework types to HTTP (ArchUnit — ADR-0005).

**Extension-First:** Prefer a mature splitter **only** if it preserves
deterministic offsets/ids under OmniDoc fixtures; popularity of Spring
AI ETL is insufficient without a citation PoC.

---

## 2. Job runners (Spring Boot 4.1.x + Postgres)

S-02 progress shape: `status` ∈
`pending|running|ready|failed|partial` plus non-negative
`completedUnits` / `totalUnits`. Port does not define what a “unit” is —
Architect must lock (files, pages, chunks, bytes, or pipeline stages).

### Option J1 — In-process `@Async` / `TaskExecutor`

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Boot 4.1 auto-configures `AsyncTaskExecutor`; `@EnableAsync` unless `AsyncConfigurer` present | docs.spring.io/spring-boot/4.1/.../task-execution-and-scheduling.html (accessed 2026-10-06) | Verified technical | H |
| Virtual threads: Java 21 + `spring.threads.virtual.enabled=true` → `SimpleAsyncTaskExecutor` | Same docs | Verified technical | H |
| Pool tunables: `spring.task.execution.pool.*` | Same docs | Verified technical | H |
| ADR-0005 Phase 1 jobs pin | `@Async` / TaskExecutor in API process | Accepted pin | H |
| Progress pattern | Persist job row first (`pending`); worker updates `running` + units; finish `ready`/`failed`/`partial` | Common practice | H |
| **Adverse** | Process crash loses in-flight work unless job state is DB-durable and reclaimable; ties ingest CPU/RAM to request JVM (Free Tier `t3.micro` risk — `07`, `10`) | Inference | M |

### Option J2 — Spring Batch (Boot-managed)

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Boot auto-configures Batch stores (in-memory / JDBC / Mongo); can run `Job` on startup | docs.spring.io/spring-boot/reference/io/spring-batch.html (accessed 2026-10-06) | Verified technical | H |
| Boot **4.1.1** BOM manages Spring Batch **6.0.5** | Maven Central `spring-boot-dependencies:4.1.1` (`spring-batch.version`) (accessed 2026-10-06) | Verified technical | H |
| JDBC `JobRepository` via `@EnableJdbcJobRepository` | Spring Batch reference (accessed 2026-10-06) | Verified technical | H |
| Fit | Strong for multi-step ETL with restart metadata | Common practice | H |
| **Adverse** | Extra `BATCH_*` schema + semantic gap vs OmniDoc `IngestionJob` (must still project S-02 units); startup job runner must be disabled (`spring.batch.job.enabled=false`) for API apps; heavier than single-file import | Inference | M |

ADR-0005 mentions Spring Batch as an **allowed** Phase 1 ingest tool
alongside `@Async` (Python section) but pins Phase 1 jobs to
`@Async`/TaskExecutor — treat Batch as **evidence alternative / later
upgrade**, not a silent override.

### Option J3 — DB-backed queue / outbox + `FOR UPDATE SKIP LOCKED`

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Postgres locking clause: `FOR UPDATE … SKIP LOCKED` skips rows that cannot be locked immediately; docs say suitable to avoid contention for **queue-like** tables (not general queries) | postgresql.org/docs/18/sql-select.html (accessed 2026-10-06) | Verified technical | H |
| Claim pattern | Atomic `UPDATE … WHERE id=(SELECT … FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING …` | Common practice | H |
| Outbox | Write job row in same TX as note/version commit; poller claims later | Common practice | H |
| Progress | Job table **is** the S-02 projection source — natural fit for `getJob` | Inference | H |
| Tenant | Claim SQL must include `tenant_id` / workspace scope; worker re-binds membership before parse/chunk | Inference (from §2) | H |
| **Adverse** | Needs lease/heartbeat + stuck-job reaper; not exactly-once by itself; DB load under many pollers | Common practice / Inference | M |
| Free Tier | No Redis/SQS; stays on already-accepted Postgres — favorable vs new broker | Inference vs `07` | M |

### Option J4 — Second Boot worker process

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| ADR-0005 | API + ingestion/embed **worker** runtime is Boot; split worker module when I-03 memory allows | Accepted pin | H |
| Hosting | EC2/ECS can host web+worker; Lambda-only weak for long jobs (`07`) | Verified provider / prior research | H |
| Same claim tech | Second process typically still uses J3 claim or shared Batch repo | Common practice | H |
| **Adverse** | Second JVM RSS on Free Tier; dual deploy/CI; still must re-check tenant | Inference | M |

### Progress ↔ S-02 units (Architect must lock)

| Unit candidate | When it advances `completedUnits` | Class |
|----------------|-----------------------------------|-------|
| Pipeline stages (parse → chunk → persist) | After each stage | Common practice |
| Chunks written | Each successful chunk row | Common practice |
| Import files / pages | Multi-file or PDF page loops | Common practice |
| Bytes processed | Streaming large imports | Common practice |

**Inference:** `totalUnits=0` with `pending` is ambiguous for UI — prefer
setting `totalUnits` at claim/start once the plan is known, or document
“unknown total” semantics without forking OpenAPI.

---

## 3. Parsers (import bytes) vs note-version re-chunk

### Paths

```text
enqueueImport(bytes, mime)
  → detect / allowlist mime
  → parse to text (or TipTap JSON if markdown import lands as notes first)
  → durable note/version (B-04)
  → same chunk pipeline as chunkVersion
  → job progress → ready|failed|partial

chunkVersion(noteId, versionId, text)
  → authorize + load version
  → chunk projected text
  → replace chunk set for that version (immutable set write)
```

| Concern | Evidence | Class | Conf. |
|---------|----------|-------|-------|
| Apache Tika facade / `Parser` extracts text + metadata from many formats | tika.apache.org 3.3.2 API + download page; Maven **4.1.0** latest / **3.3.2** maintenance (accessed 2026-10-06) | Verified technical | H |
| Spring AI `TikaDocumentReader` wraps Tika into `Document` list | Spring AI ETL docs + API for 2.0.1 (accessed 2026-10-06) | Verified technical | H |
| Tika 4.x requires Java 17+; 3.x Java 11+; 4.x packaging changed (zip vs runnable jar) | tika.apache.org/download.html (accessed 2026-10-06) | Verified technical | H |
| Re-chunk path should **not** re-parse TipTap JSON if `text` is already the canonical projection | Port signature | Inference | H |
| Markdown file import may skip Tika (charset decode + serializer/parser) | Common practice | Common practice | M |

### Failure → port codes

| Condition | Map to | HTTP hint (S-02) | Class |
|-----------|--------|------------------|-------|
| MIME / extension outside allowlist; Tika `Unsupported` / empty meaningful type | `unsupported_type` | 415 | Inference (align with OpenAPI) |
| Payload over product max; Tika `setMaxStringLength` truncation treated as reject | `too_large` | 413 | Inference |
| Parse/chunk wall-clock exceeded; pool rejection | `timeout` | 5xx/`unavailable` transport TBD | Inference |
| Multi-file or multi-page: some succeed, some fail | `partial` (+ job status `partial`) | 200 on getJob | Verified technical (enum exists) |
| DB / worker / dependency down | `unavailable` | 503 class | Inference |
| Corrupt bytes that Tika can open but not parse (`TikaException`) | Prefer `unsupported_type` or `failed` job — **Architect pick** | — | Unresolved |

**Adverse (Tika):** Large PDF/DOCX memory spikes on micro hosts; OCR /
layout-aware citation offsets may fail Java-first PoC — then `14` allows
a **named** Python exception **after** failed time-boxed Java PoC, not
as Phase 1 default.

**Python sidecar:** Do **not** reopen as recommendation. Cite `14`
adverse: second runtime/image/deploy unit; tenant re-check or IDOR;
dual logging/redaction. ADR-0005: Python not Phase 1.

---

## 4. Extension-first tradeoffs (summary matrix)

| Option | Maintenance | Free Tier / ops | Tenant isolation | Upgrade safety | Lock-in | Evidence |
|--------|-------------|-----------------|------------------|----------------|---------|----------|
| Custom chunker + JDBC job rows + `@Async` | Own code; small surface | One JVM; no broker | App + RLS on job/chunk tables; worker re-bind | Params versioned in OmniDoc | Low | Fits ADR-0005 Phase 1 pin |
| Spring AI TokenTextSplitter + TikaDocumentReader | Spring upgrade cadence | Same JVM; heavier deps | Must stay in adapters | Boot/AI BOM churn | Medium (Spring AI types) | ETL docs H; ArchUnit discipline required |
| LangChain4j recursive splitter | Separate release train (**1.21.0**) | Same JVM | Same adapter rule | Library major bumps | Medium | Maven + javadoc H |
| Spring Batch JDBC repo | Framework-owned metadata | Extra tables; startup pitfalls | Batch tables need RLS story or isolation | Batch 6 + Boot 4 pairing | Medium-high | Boot Batch docs H |
| SKIP LOCKED queue (± second worker) | Own poller/reaper | Postgres only; 2nd process costs RAM | Claim must be tenant-scoped | SQL portable on PG18 | Low-medium | PG 18 docs H |
| Redis / SQS / etc. | Ops + IAM | **Adverse** Free Tier / credit burn vs Postgres-only (`07`) | Broker ACL ≠ RLS | Vendor APIs | Higher | Prior hosting evidence — not required for Phase 1 |

Popularity of Spring Batch or Redis queues is **insufficient** without
Free Tier, RLS, and S-02 progress fit.

---

## 5. Candidate shortlist (tradeoffs only — **no selection**)

### Chunking

1. **Deterministic custom splitter** on canonical projected text, with
   frozen `(algorithmId, params)` and ordinal or hash chunk ids +
   `startOffset`/`endOffset`.
2. **LangChain4j recursive** adapter producing OmniDoc `Chunk` rows.
3. **Spring AI TokenTextSplitter** adapter (token-oriented; verify
   offset mapping + ArchUnit packaging).

Optional citation upgrade (orthogonal): TipTap **UniqueID** block
anchors in JSON SoT, carried into citation payload — requires FE
extension pin + serializer cooperation (not selected here).

### Job runners

1. **DB job row + in-process `@Async`** (aligned with ADR-0005 Phase 1
   pin) with durable status/units.
2. **Same job row + `FOR UPDATE SKIP LOCKED` claim** (single or multi
   consumer; enables later second process without broker).
3. **Spring Batch** when multi-step restart metadata outweighs schema
   / mapping cost.
4. **Second Boot worker** when I-03 memory evidence forces split —
   still prefer DB claim over new broker on Free Tier.

---

## Architect inputs (classified — **no selection**)

1. **Lock canonical TipTap→markdown owner** (FE bridge vs shared Node
   util vs Java) so B-05b never invents a second SoT.
   Class: Unresolved design / possible soft-stop to Commander if
   blocked. Conf. — .
2. **Lock chunk algorithm + id scheme + unit semantics** for S-02
   `completedUnits`/`totalUnits` (and whether algorithm changes require
   a note version bump). Class: Inference → Architect decision.
3. **Phase 1 runner elaboration:** stay on ADR-0005 `@Async` with
   durable job rows vs add SKIP LOCKED claim now vs defer Batch /
   second process to I-03. Class: tradeoffs above; ADR pin is default
   context, not a research “winner.”
4. **Parser allowlist + size/time limits** mapped to
   `unsupported_type` / `too_large` / `timeout` / `partial`. Class:
   product policy + Inference.
5. **Whether B-05b may depend on Spring AI ETL classes** (readers /
   splitters) while production AI stays dark — vs plain Tika +
   custom/LangChain4j. Class: ADR-0005 adapter discipline.
6. **B-06 handoff:** chunk rows must carry tenant, version, stable id,
   text, offsets/anchors; embed writes are out of B-05b.
7. **Do not** schedule Python for Phase 1 (`14` adverse; ADR-0005 §6).

**@user gate (only if Architect opens ADR-0006):** material new decision
beyond elaborating `architecture.md` §3 / §5.2 — e.g. mandating UniqueID
in note SoT, or introducing a broker. Otherwise Commander can accept
Architect design without a new ADR.

---

## Proof-of-Concept Plan (for Architect / Implementer — not executed here)

1. **Serializer parity:** same TipTap JSON fixture → FE
   `tiptap-markdown` vs `@tiptap/static-renderer` `renderToMarkdown`;
   assert string equality or document allowed delta.
2. **Chunk determinism:** fixed params × 20 fixtures → identical
   `ChunkId` + offsets on two runs; mutate heading → expect id policy
   behavior documented.
3. **Citation round-trip:** store chunks → reconstruct preview from
   offsets into projected text → open authorized passage.
4. **Job crash reclaim:** kill JVM mid-`running`; prove reclaim via
   SKIP LOCKED lease or restart policy without double-chunk corruption.
5. **Tika allowlist:** PDF/DOCX/MD/HTML happy path; exe/zip →
   `unsupported_type`; oversized → `too_large` (413).
6. **Free Tier memory:** one vs two JVM processes on target EC2 class
   (I-03) — measurement, not selection.

---

## Risks

| Risk | Severity | Mitigation direction |
|------|----------|----------------------|
| Second TipTap serializer on JVM | High (trust + citation drift) | Single owner; port consumes projected `text` |
| Library splitter without stable offsets | High | PoC before B-05b; prefer custom if PoC fails |
| `@Async` without durable reclaim | Medium | Job table + reclaim; optional SKIP LOCKED |
| Spring Batch schema vs RLS | Medium | Treat Batch metadata as privileged or avoid in Phase 1 |
| Tika memory on micro hosts | Medium | Size caps; stream; timeout → port codes |
| Scope creep into embeddings | Medium | Hard stop at chunk persist; B-06 owns vectors |
| Redis/SQS “best practice” on Free Tier | Medium | Score adverse ops/`07` before any broker |

---

## Sources (access date **2026-10-06** unless noted)

| Source | URL / locator |
|--------|----------------|
| Spring Boot 4.1 Task Execution and Scheduling | https://docs.spring.io/spring-boot/4.1/reference/features/task-execution-and-scheduling.html |
| Spring Boot Spring Batch | https://docs.spring.io/spring-boot/reference/io/spring-batch.html |
| Spring Boot 4.1.1 BOM `spring-batch.version=6.0.5` | Maven Central `org.springframework.boot:spring-boot-dependencies:4.1.1` |
| PostgreSQL 18 SELECT locking / SKIP LOCKED | https://www.postgresql.org/docs/18/sql-select.html |
| Spring AI ETL (`TikaDocumentReader`, `TokenTextSplitter`) | https://docs.spring.io/spring-ai/reference/api/etl-pipeline.html |
| Spring AI `TikaDocumentReader` / `TokenTextSplitter` API 2.0.1 | docs.spring.io/spring-ai/docs/current/api/... |
| Apache Tika download (4.1.0 latest; 3.3.2 maintenance) | https://tika.apache.org/download.html |
| Apache Tika 3.3.2 API / Parser docs | https://tika.apache.org/3.3.2/ |
| LangChain4j `DocumentSplitters` / RAG tutorial | Maven Central `dev.langchain4j:langchain4j:1.21.0`; docs.langchain4j.dev |
| TipTap static renderer (`renderToMarkdown`) | https://tiptap.dev/docs/editor/api/utilities/static-renderer |
| TipTap UniqueID | https://tiptap.dev/docs/editor/extensions/functionality/uniqueid |
| TipTap Markdown basic usage | https://tiptap.dev/docs/editor/markdown/getting-started/basic-usage |
| Prior OmniDoc evidence | `10`, `14`, `03`, `07`, `12`, `13`; ADR-0005; `architecture.md` §3/§5.2/§9/§10 |
| Frozen contracts | `docs/api/openapi.yaml` ingestion; `IngestionPort` / `IngestionModels` |

**Not used as sole support:** marketplace blogs on SKIP LOCKED (Prisma,
etc.) — corroboration only; primary claim is PostgreSQL docs.
