# OmniDoc — Architecture Baseline

> Status: **architecture baseline** for Phase 0 close-out. ADR-0001
> categories 1–5 and 7 are `accepted` (2026-09-14); §6 identity **port**
> stays — Better Auth **library** superseded by ADR-0005 (`accepted`,
> 2026-09-15): Spring Security HTTP-only session cookies. Dual-mode BYOK
> detail in ADR-0004 (`accepted`). ADR-0002 (workspace) remains
> `accepted` for the **frontend Nx graph**; `apps/api` is a **JVM Gradle**
> module beside Nx (not Node). ADR-0003 (frontend toolchain) remains
> `accepted`. ADR-0005 (backend application stack) is **`accepted`**.
> Production AI activation and RTL locale remain **gated / deferred**.
> Stack-specific choices live in
> [`docs/adr/`](docs/adr/README.md).

OmniDoc is a multi-tenant AI/RAG note and knowledge SaaS: capture notes
and documents, chunk and embed them, then search and ask questions that
return answers cited to the user’s own sources. Platform class:
**TypeScript frontend** (Next.js) + **Java 21 / Spring Boot 4.1.x API**
(ADR-0005 `accepted`). Primary locale: `en` (LTR). RTL / mixed-BiDi
support is **deferred, not closed** — RTL-readiness remains an
invariant. No commerce, payments, shipping, or SMS.

---

## 1. Experience-first boundary

```text
Customer Experience Layer (UI)
        ↓  project-owned ports / application APIs only
Application / Domain orchestration
        ↓
Mock / deterministic adapters  →  Future production adapters
        ↓
External providers (embedding, LLM, vector, storage, IdP, …)
```

| Layer | Owns | Must not own |
|-------|------|--------------|
| UI | Presentation, journey states, a11y, locale shell | Provider SDKs, durable business rules, tenant authority |
| Domain ports + orchestration | Contracts, invariants, authz re-checks, citation assembly | Vendor-specific types leaking into UI |
| Mock adapters | Deterministic fixtures for pre-provider UX | Production writes as a second authority |
| Production adapters | Provider I/O behind ports | Silent dual-write against mocks for the same domain |

**Rule:** The UI never calls embedding, LLM, vector, object storage, or
other external providers directly. Production adapters appear only behind
ports after evidence, ADR acceptance, and production-activation gates.

**Architecture-ready:** boundary and ports (incl. vault, usage, mode).
**ADR-accepted stack:** frontend framework, DB, vector, hosting topology,
provider posture (ADR-0001 §1–§5, §7 / ADR-0004); auth **implementation**
and API language (ADR-0005). **Still gated:** production AI activation;
RTL locale. **Scaffold:** only via Commander-opened S-01a / S-01b (and
downstream F-*/B-*) — not from this baseline alone. Node `apps/api` is
**not** authorized.

---

## 2. Tenancy and identity boundary

### Invariant

Tenant isolation must hold at **retrieval time**, not only when a query
is constructed. Cross-tenant retrieval is a **security failure**, never
a relevance miss. Forgotten filters, worker bypasses, and vector
similarity without tenant (and ACL) constraints are treated as
critical defects.

### Where tenant identity originates

1. Authenticated principal is established by the identity adapter
   (session / verified token) — server-side only.
2. Organization / workspace membership is resolved from the
   **server-authoritative** identity store (not from client-supplied
   `tenantId` / `orgId` as authority).
3. Client may send a workspace selector; the API treats it as a
   **selector**, then re-binds to membership. Mismatch → deny (403).

### Propagation and re-verification

| Surface | Requirement |
|---------|-------------|
| HTTP / SSE API | Bind `tenant_id` (+ workspace ACL) from session before domain work |
| Persistence | Every note/chunk/embedding/citation row is tenant-scoped |
| Vector / hybrid search | Tenant (and document ACL) filter applied in the retrieval path; results re-checked before citation assembly |
| Background jobs | Job payload carries tenant from trusted enqueue path; worker re-loads membership; never trusts client-only claims |
| Caches | Cache keys include tenant; stale authz must not serve other tenants |
| Export / delete | Scoped to authorized tenant; derived artifacts included |

Apply continuous review with
[`.cursor/skills/tenant-security-review/SKILL.md`](.cursor/skills/tenant-security-review/SKILL.md).

**Isolation posture (ADR-0001 §3 `accepted`):** shared schema with
application scoping **plus** defense-in-depth (Postgres RLS with a
non-owner, non-`BYPASSRLS` role) per
`docs/research/technical/03-multi-tenant-isolation.md`. **Minimal year-1
tenants** keep this shape — do not over-engineer schema-per-tenant now;
reopen only if isolation/ops evidence demands it. Honest workspace/team
chrome at n≈1–few (REC-18); collaborative editing is **much later**.

---

## 3. Domain model boundaries

### Notes and documents

- **Note:** primary capture unit (title + body). Body durable SoT is
  **TipTap/ProseMirror JSON** (ADR-0001 §2); markdown is an export /
  chunking projection via one canonical serializer.
- **Document:** imported file or pasted blob that becomes one or more
  notes / versions under the same tenant.
- Version identity is durable: answers and citations reference a
  specific note/document **version**, not “whatever is current” alone.

### Workspace / collection structure

- Tenant → workspace(s) → optional light collections (inbox, folders,
  tags). UX research constrains IA toward write-first capture and light
  optional structure (REC-01, REC-03) — not deep taxonomy as activation
  prerequisite.
- ACL lives on workspace membership; notes inherit workspace scope.

### Ingestion → chunking → embedding → indexing

```text
Import path (enqueueImport)
  → validate → parse → persist note/version → chunk path
Rechunk path (note-save outbox / chunkVersion)
  → resolve current version → chunk path
Chunk path (shared)
  → ProseMirror JSON → pm-md-v1 projection → omni-blockpack-v1 chunks
  → chunk_sets + chunks rows (immutable for a version)
  → embeddings (B-06; model id + dimensions recorded)
  → lexical + vector indexes (tenant-scoped)
```

Two enqueue kinds feed one chunk path: `import` (bytes → new note +
first version → chunks) and `rechunk` (existing note's current version →
chunks). Job progress uses stage units known at enqueue
(`totalUnits = 4`, never 0 while pending) — see §5.2.1. Indexing lag is
a first-class pollable state (`pending|running|ready|failed|partial`),
not silent success (REC-02). Chunk ids are stable per note version under
a frozen policy tuple; new version ⇒ new chunks.

### Retrieval and answer synthesis

- Retrieve candidate chunks **within tenant + ACL**.
- Synthesize answer only from authorized evidence.
- Attach **passage-level** citations (REC-04): note/version id, chunk id,
  offsets or anchor, preview text, last-updated cue when available.
- Prefer no citation over a mismatched citation (citation-trust
  evidence).

### Search

- Lexical and/or hybrid search over the same tenant scope.
- Snippets must not leak cross-tenant content; highlighting is
  presentation over authorized hits.

### Export and deletion

| Operation | Guarantee |
|-----------|-----------|
| Export | Tenant-scoped bundle of notes/versions user is allowed to read; derived chunks optional in export package per product policy |
| Soft delete | Hidden from retrieve/ask immediately |
| Hard / purge delete | Removes or tombstones note versions **and** derived chunks, embeddings, vector payloads, and citation targets; retrieval must not return deleted evidence; jobs must no-op on purged ids |

Deletion without vector/chunk cleanup is an architecture defect.

---

## 4. AI answer and citation boundary (trust core)

This boundary is the product’s trust core. UX package inputs (not
findings from unrun tests): passage inspection is the trust loop
(REC-04); refusal and partial support are first-class states (REC-10);
AI answers are not auto-written into the corpus (REC-06).

### Answer outcome states (port contract — success shapes)

| State | Meaning | Transport |
|-------|---------|-----------|
| `supported` | Claims linked to passage citations | Success |
| `partial` | Some spans unsupported / marked | Success |
| `no_supported_answer` | Honest refusal + suggested next steps | Success |
| `conflict` | Sources disagree; both shown | Success |
| `refused_policy` | Model/policy refusal (safety) | Success |
| Stream progress | `generating` → stable claim units + citations | Events |

**Refusal / no-supported-answer is a legitimate successful outcome of the
answer port**, not an exception or 5xx path. Speculative “helpful”
prose when the corpus lacks support is a contract violation.

### Citation payload (minimum)

- `noteId`, `versionId`, `chunkId`
- Passage anchor (offsets or stable block id) — Phase 1 lock: offsets
  into the `pm-md-v1` projection **and** top-level block ordinals
  (`startBlock`/`endBlock`) in the version's `body_json` (see §5.2.1)
- Preview text suitable for same-view inspection
- Optional `updatedAt` (UTC) for stale-risk cues

Citations that cannot be opened to an authorized passage must not be
emitted.

UT-1…UT-14 remain **unrun hypotheses** and do not justify accepted
requirements.

---

## 5. Provider-neutral ports

UI and orchestration call these ports only. Each port has: contract
sketch, mock path, production path, failure states.

### 5.1 Notes / documents

| | |
|--|--|
| **Ops** | `create`, `update`, `get`, `list`, `softDelete`, `purge` |
| **In** | tenant-bound actor, workspace id, note fields, version concurrency token |
| **Out** | note/version DTOs; list pages |
| **Invariants** | tenant re-check on every op; UI never invents authz |
| **Mock** | Fixture corpus under agreed fixture ids; deterministic CRUD in-memory/file |
| **Production** | Relational store adapter (PostgreSQL per ADR-0001 §3 `accepted`) |
| **Failures** | `not_found`, `conflict` (version), `forbidden`, `validation`, `unavailable` |

### 5.2 Ingestion and chunking

| | |
|--|--|
| **Ops** | `enqueueImport`, `getJob`, `chunkVersion` |
| **In** | bytes/text, mime, note/version id, tenant |
| **Out** | job status; chunk set for version |
| **Invariants** | progress visible; chunk ids stable per version |
| **Mock** | Instant or clock-step jobs; fixed chunk boundaries for fixtures |
| **Production** | Worker + storage; parser adapters behind port |
| **Failures** | `unsupported_type`, `too_large`, `timeout`, `partial` (some files ok), `unavailable` |

#### 5.2.1 B-05a design lock (2026-10-06)

Implementer-ready lock for B-05b. Evidence:
[`docs/research/technical/16-ingestion-chunking-jobs.md`](docs/research/technical/16-ingestion-chunking-jobs.md)
(§1–§4, Architect inputs). Elaboration of ADR-0001 §2 / ADR-0005 —
**no ADR-0006**. Port ops and S-02 HTTP stay frozen.

##### 1. Canonical TipTap → markdown owner = Java (`apps/api`)

| | |
|--|--|
| **Owner** | JVM projector in a `projection` package behind this port |
| **Id** | `pm-md-v1` (corpus projection SoT for chunking now; export B-11 later) |
| **Rationale** | `chunkVersion(text)` and import both run on the JVM; S-02 `Note` carries only `bodyJson` (no markdown on the wire) so the frozen contract is untouched; a shared Node utility would add a second runtime (same adverse class as the Python sidecar in `14`) |
| **FE bridge** | `packages/ui/src/capture/markdown-bridge.ts` is **editor interaction tooling** only (markdown editing mode / paste; browser-only, needs a DOM). Never a corpus authority; output never persisted. No FE change required; no soft-stop |
| **Parity** | B-05c owns FE-bridge vs Java projector parity on S-03 fixtures with a documented allowed-delta list |
| **UniqueID** | TipTap UniqueID **out** for Phase 1 (would mandate a note-SoT change ⇒ ADR + FE extension pin); top-level block ordinals from JSON cover the anchor need |

**Projector allowlist** (StarterKit + table set): nodes `doc`,
`paragraph`, `heading` (1–6), `bulletList`, `orderedList`, `listItem`,
`blockquote`, `codeBlock` (fenced, language attr), `hardBreak`,
`horizontalRule`, `table` / `tableRow` / `tableHeader` / `tableCell`
(GFM pipe tables; literal `|` escaped as `\|`); marks `bold`, `italic`,
`strike`, `code`, `link`. Unknown node types degrade to concatenated
text content with a recorded warning (job does not fail). Same JSON ⇒
byte-identical projection string.

##### 2. Chunk algorithm, ids, policy

| | |
|--|--|
| **Algorithm** | Custom deterministic **block-pack splitter**, id `omni-blockpack-v1`, over the `pm-md-v1` projection |
| **Shape** | Each top-level ProseMirror block projected individually; projection = blocks joined by `\n\n`; a chunk is a run of consecutive whole blocks; a heading always starts a new chunk (`headingBreak`); a single block larger than `maxChars` hard-splits at paragraph → sentence → whitespace → char boundaries |
| **Frozen params** | `{maxChars: 1200, softMinChars: 300, headingBreak: true, overlapChars: 0}` |
| **Char unit** | UTF-16 code units (Java `String` / JS `string` — identical on both runtimes); no tokenizer dependency (B-06 verifies `maxChars` against the embed model's limit) |

**Not selected** (cite `16` §1.3 / §4): Spring AI `TokenTextSplitter`
(no block anchors / offset guarantees; Spring AI is adapter-only per
ADR-0005 and must stay dark in B-05); LangChain4j
`DocumentSplitters.recursive` (loses block anchors; separate release
train for no citation gain).

**Chunk id:** `{versionId}_c{ordinal}` with a 4-digit zero-padded
ordinal (e.g. `v123_c0007`).

**Chunk row columns:** `chunk_id`, `tenant_id`, `workspace_id`,
`note_id`, `version_id`, `ordinal`, `start_block`, `end_block`,
`start_offset`, `end_offset`, `text`, `text_sha256`, `created_at`;
unique `(version_id, ordinal)`. Invariant:
`projection.substring(start_offset, end_offset) == text`.

**`chunk_sets` row per version:** `(version_id PK, tenant_id,
projector_id, chunker_id, params_hash, projection_sha256, chunk_count,
created_at)`.

**Policy rule:** same version + same
`(projector_id, chunker_id, params_hash)` ⇒ idempotent no-op (verify
`projection_sha256`, return the existing set). Same version + different
policy ⇒ **forbidden in B-05b** (reject; do not re-chunk in place).
Policy bumps are a future re-index job that replaces a version's whole
set in one transaction and invalidates its old chunk ids; Ask/citation
assembly (B-08) drops citations whose `chunkId` is unknown — never
remaps silently.

##### 3. Citation fields

Both: `startOffset` / `endOffset` into the projection string **and**
block anchors `startBlock` / `endBlock` (top-level block ordinals in the
version's `body_json`). Preview text = chunk `text`. Satisfies §4
"offsets or stable block id" with both.

##### 4. Phase 1 job persistence + worker model

**Tables** (additive Flyway; RLS exactly like V2 policies;
`omnidoc_app` DML grants):

| Table | Key columns |
|-------|-------------|
| `ingestion_jobs` | `job_id` PK, `tenant_id`, `workspace_id`, `actor_id`, `kind` (`import`\|`rechunk`), `status` (`pending`\|`running`\|`ready`\|`failed`\|`partial`), `completed_units`, `total_units`, `note_id` NULL, `version_id` NULL, `file_name`, `media_type`, `size_bytes`, `error_code` NULL, `attempts`, `lease_owner` NULL, `lease_until` NULL, `created_at`, `started_at`, `finished_at` |
| `ingestion_job_payloads` | `job_id` PK/FK, `tenant_id`, `bytes` BYTEA — payload row deleted when the job reaches a terminal state |

**Runner:** ADR-0005 in-process `@Async` / TaskExecutor dispatcher,
triggered after the enqueue transaction commits
(`TransactionSynchronization.afterCommit`), plus a `@Scheduled` sweeper
(e.g. every 15 s) that dispatches `pending` rows and reclaims `running`
rows whose `lease_until` has expired (crash reclaim).

**Claim:** because the app role's RLS is fail-closed before a tenant GUC
is bound, the claim runs through a `SECURITY DEFINER` SQL function owned
by `omnidoc_migrator` (e.g. `claim_ingestion_job(worker_id,
lease_seconds)`) implementing `UPDATE … WHERE job_id = (SELECT … WHERE
status='pending' OR (status='running' AND lease_until < now()) ORDER BY
created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING job_id, tenant_id,
actor_id, workspace_id, kind`. Grant `EXECUTE` to `omnidoc_app` only.
All other job/chunk DML runs under normal RLS.

**After claim:** worker opens a transaction per stage, binds
`app.current_tenant_id` and `app.current_actor_id` (existing
`TenantRlsSession` / `ActorRls` discipline) and **re-resolves the
actor's membership in the job's workspace via the B-03 binder**; loss of
membership ⇒ job `failed` (never trust enqueue-time claims). Lease
120 s; heartbeat (extend lease) after each stage; `attempts > 3` ⇒
`failed`. Stage writes are idempotent so a reclaimed job re-running a
stage cannot double-insert chunks (`chunk_sets` PK + chunks unique
index).

**Not Phase 1 / deferred** (with reasons): Spring Batch (extra
`BATCH_*` schema without an RLS story; `16` §2 J2); second Boot worker
process (I-03 memory evidence; the claim SQL is already multi-instance
safe so no redesign needed); Redis/SQS (adverse Free Tier / ops, `07`;
`16` §4); Python (ADR-0005 §6; `14`).

**Note-save hook:** the B-04 version-commit path writes a coalesced
`rechunk` outbox job in the same transaction (one pending `rechunk` per
note — partial unique index on `(note_id) WHERE kind='rechunk' AND
status='pending'`); the worker chunks the note's `current_version_id`
at claim time, so autosave never blocks on chunking and intermediate
autosave versions may legitimately have no chunks.

##### 5. Progress units

Unit = pipeline stage. `totalUnits = 4` is known at enqueue and never 0:

| Stage | Meaning |
|-------|---------|
| 1 | validated (allowlist + size) |
| 2 | parsed |
| 3 | note/version persisted |
| 4 | chunks persisted |

`pending` = `0/4`; `ready` = `4/4`; `failed` / `partial` keep the count
of fully completed stages. Matches S-03 fixtures (`0/4`, `2/4`, `4/4`).
`chunkVersion` is the synchronous primitive (returns `ChunkSet`, no job
row); `rechunk` jobs reuse stages 3–4 semantics with `totalUnits = 4`
as well for one vocabulary (stages 1–2 complete immediately).

##### 6. Parser allowlist + limits (`@user` confirmed 2026-10-06)

| Allow | Detect |
|-------|--------|
| `text/markdown` (+ `.md`), `text/plain`, `text/html`, `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | Declared `mediaType` / extension, confirmed by Tika type detection; mismatch or anything else ⇒ `unsupported_type` (415 at enqueue) |
| Archives (`zip`), executables, images | `unsupported_type` |

**Parsers** behind one parser adapter port:

- Apache **Tika 4.1.0** for PDF / DOCX / HTML text extraction
  (text-only fidelity; layout / OCR not Phase 1)
- Markdown via **commonmark-java 0.30.0**
  (`org.commonmark:commonmark` + `commonmark-ext-gfm-tables`) AST →
  ProseMirror JSON on the same node allowlist as §1 (inverse mapping)
- Plain text / Tika text → paragraphs split on blank lines; title =
  file name without extension

**Limits** (config properties, not literals):

| Limit | Failure |
|-------|---------|
| max 10 MiB | `too_large` (413 at enqueue; also enforced server-side after upload) |
| parse wall-clock 60 s; whole-job 5 min | `timeout` (job `failed` with `error_code=timeout`) |
| Tika `TikaException` on openable-but-corrupt bytes | job `failed` with `error_code=unsupported_type` |
| extraction completed with warnings / dropped content but a version was persisted | `partial` |
| DB / pool / executor rejection | `unavailable` (503 class) |

Tika memory: stream input; cap `setMaxStringLength` / write limit
consistent with the size cap. Import creates a **new** note + first
version in the actor's selected workspace (tenant from membership,
never from the client).

##### 7. Spring AI ETL

**Not permitted** in B-05 (no `TikaDocumentReader`, no
`TokenTextSplitter`); plain Tika + custom code. ArchUnit expectation
for B-05b: no `org.springframework.ai..` anywhere in ingestion
packages and no `org.apache.tika..` types outside the parser adapter
package; no Tika / commonmark types on HTTP DTOs or in the domain.

##### 8. B-05b must not invent

A second TipTap serializer (anywhere); a different chunker / params /
id scheme; overlap; a tokenizer; a broker (Redis / SQS); Spring Batch;
a second process; different unit semantics or `totalUnits=0` while
pending; Spring AI ETL types; Python; embedding / pgvector columns or
writes; new OpenAPI operations; a different allowlist / limits without
`@user`.

##### 9. B-06 handoff contract

Chunk rows carry tenant, workspace, note, version, stable id, ordinal,
text, offsets + block anchors, `text_sha256`; `chunk_sets` carries the
policy tuple. No embedding columns or writes in B-05b; B-06 adds
`embedding_model_id` / dims and vectors keyed by `chunk_id`.

### 5.3 Embedding

| | |
|--|--|
| **Ops** | `embedTexts`, `embedChunks` |
| **In** | texts/chunk ids, `embedding_model_id`, runtime mode from §5.11 |
| **Out** | vectors + model/version metadata |
| **Invariants** | model id stored with vectors; no browser keys; key from §5.11 only — never silent mix of operator vs customer credentials |
| **Mock** | Deterministic pseudo-vectors from hash; fixed dims (`mock` mode) |
| **Production** | Dual-mode path after CX / production-AI gate: `operator_free_tier` via OpenRouter (or swap) gateway adapter, or `customer_key` via vault (§5.9); Assistants/`vector_stores` forbidden as corpus SoT (ADR-0001 §5, ADR-0004) |
| **Failures** | `timeout`, `quota_exhausted` (**must distinguish** `operator_free_tier` vs `customer_key`), `unavailable`, `invalid_model`, `mode_forbidden` |

### 5.4 Vector search

| | |
|--|--|
| **Ops** | `similaritySearch` |
| **In** | query vector, **tenant_id**, ACL scope, topK, filters |
| **Out** | ranked chunk hits (tenant-verified) |
| **Invariants** | tenant filter mandatory; zero cross-tenant hits tolerated |
| **Mock** | Fixture ranking tables keyed by query id |
| **Production** | Postgres + pgvector adapter (ADR-0001 §4 `accepted`) |
| **Failures** | `timeout`, `unavailable`, `empty`, `partial` (degraded topK) |

### 5.5 Lexical / hybrid search

| | |
|--|--|
| **Ops** | `lexicalSearch`, `hybridSearch` |
| **In** | query string, tenant, filters |
| **Out** | hits with snippets |
| **Invariants** | same tenant/ACL rules as vector path |
| **Mock** | Keyword fixtures; hybrid = merged fixture lists |
| **Production** | Postgres FTS / store hybrid features behind port |
| **Failures** | `timeout`, `unavailable`, `empty` |

### 5.6 Answer synthesis with citations

| | |
|--|--|
| **Ops** | `ask` (optionally streaming) |
| **In** | question, tenant, optional source scope, locale, runtime mode from §5.11 |
| **Out** | one of the answer states in §4 + citations |
| **Invariants** | only authorized chunks sent to model; retrieved text is **data**, not instructions; refusal is success; no auto-persist to corpus; never silent operator↔customer key mix |
| **Mock** | Deterministic Q→answer map including refusal/partial/conflict (`mock` mode) |
| **Production** | Dual-mode LLM adapter + citation assembler after CX / production-AI gate: OpenRouter operator free-tier gateway or customer vault key (ADR-0004); never Assistants-hosted / `vector_stores` corpus as SoT |
| **Failures** | `timeout`, `quota_exhausted` (**must distinguish** `operator_free_tier` vs `customer_key`), `unavailable`, `partial` (stream truncated with explicit flag), `mode_forbidden` — distinct from `no_supported_answer` / `refused_policy` |

### 5.7 Identity / tenancy

| | |
|--|--|
| **Ops** | `authenticate`, `resolveMembership`, `listWorkspaces`, `invite` (as product allows) |
| **In** | credentials / session; workspace selector |
| **Out** | principal, memberships, roles |
| **Invariants** | server authority; org context not client-trusted |
| **Mock** | Fixed users/tenants in fixtures |
| **Production** | Identity adapter behind this port. **Accepted 2026-09-15 (ADR-0005):** Spring Security HTTP-only session cookies + first-party organization / workspace / membership / invite tables. Better Auth (ADR-0001 §6 historical library) is **superseded** — do not implement Better Auth in the JVM API. Year-1 SSO still not required. |
| **Failures** | `unauthenticated`, `forbidden`, `unavailable` |

### 5.8 Export

| | |
|--|--|
| **Ops** | `exportWorkspace`, `exportNotes` |
| **In** | tenant, scope, format |
| **Out** | downloadable bundle / job |
| **Invariants** | no cross-tenant ids; secrets excluded |
| **Mock** | Static zip/json fixtures |
| **Production** | Exporter worker |
| **Failures** | `timeout`, `too_large`, `unavailable`, `forbidden` |

### 5.9 Credential vault

Server-only secret storage for OmniDoc **customer-BYOK** keys (and
metadata). Distinct from OpenRouter-upstream-BYOK (ADR-0004). Cookbook
UX is Designer-owned later; this port owns store / verify / rotate /
revoke.

| | |
|--|--|
| **Ops** | `store`, `rotate`, `revoke`, `verify`, `getMetadata` (masked prefix, provider/tool chapter id, status) |
| **In** | tenant-bound actor, plaintext key (write ops only on server), tool/chapter id, optional label |
| **Out** | vault record metadata (never full plaintext after store); `verify` → ok / invalid / wrong_scope |
| **Invariants** | decrypt only in API/worker; never log raw keys; never return full key to UI after save; tenant-keyed rows; write-once display (masked prefix); verify ≠ Ask |
| **Mock** | In-memory map of fixture keys; deterministic verify outcomes by key id |
| **Production** | App-encrypted column (year-1 preferred) or managed secrets adapter; operator key stays in env/deploy secrets, not customer vault rows (ADR-0004) |
| **Failures** | `invalid_key`, `wrong_scope`, `forbidden`, `unavailable`, `encryption_error` |

### 5.10 Usage / metering

Read remaining limits and attributed usage from provider APIs (e.g.
OpenRouter `GET /api/v1/key`) and/or local token sums. **Not** a billing
product.

| | |
|--|--|
| **Ops** | `getUsage`, `getRemainingLimits` |
| **In** | tenant, runtime mode, optional period |
| **Out** | usage DTO **or** explicit `unavailable`; never invent currency burn |
| **Invariants** | attribute honestly (shared operator key ≠ per-customer); secrets excluded; management keys stored like other secrets |
| **Mock** | Fixture counters / fixed `unavailable` cases |
| **Production** | Thin wrappers over provider usage APIs; local attribution for direct providers (ADR-0004) |
| **Failures** | `unavailable` (first-class success-shaped empty), `forbidden`, `timeout` |

### 5.11 Runtime key-resolution / mode

Resolves which credentials (if any) may be used for embed/ask on a
request. Modes: `mock` | `operator_free_tier` | `customer_key`.

| | |
|--|--|
| **Ops** | `resolveMode`, `assertModeAllowed`, `stampOutbound` |
| **In** | tenant, actor, requested mode (selector), feature (`embed` or `ask`) |
| **Out** | resolved mode + opaque credential handle (not raw key to UI) |
| **Invariants** | never silently fall back across modes; CX gate blocks live modes until closed; production AI gate still applies; mode stamped on every outbound provider call |
| **Mock** | Always `mock`; live modes return `mode_forbidden` until fixtures enable labelled demos |
| **Production** | Policy from ADR-0004 + env; operator key from deploy secrets; customer key via §5.9 |
| **Failures** | `mode_forbidden`, `vault_missing`, `unauthenticated`, `forbidden` |

Mock and production adapters must not be simultaneous writable
authorities for the same domain entity.

---

## 6. Threat and safety boundaries

Use [`.cursor/skills/threat-model/SKILL.md`](.cursor/skills/threat-model/SKILL.md)
and [`.cursor/skills/ai-content-safety/SKILL.md`](.cursor/skills/ai-content-safety/SKILL.md).

### Assets

User notes/versions, chunks/embeddings, identity/session material,
BYOK/provider secrets (**in scope for v1** — ADR-0004), audit/telemetry,
quota / usage state.

### Trust boundaries (high level)

Browser → API/BFF → domain → DB/vector → workers → embedding/LLM
providers; optional external fetch for import.

### Architectural controls (not optional “later polish”)

| Risk | Control |
|------|---------|
| Prompt injection via notes | Structural separation of system vs retrieved evidence; evidence labeled untrusted; never let content set tenant, tools, or credentials |
| Markdown / XSS | Sanitize render pipeline; block dangerous schemes; citations are links to authorized previews, not raw HTML exec |
| SSRF on import/fetch | Explicit allow/deny; block link-local/metadata IPs; timeouts/size limits |
| Cross-tenant IDOR | Server membership + retrieval-time checks; negative tests required |
| Provider/tool trust | Model output untrusted for privileged actions; no auto tool elevation |
| Secret leakage | No provider/BYOK keys in repo, client bundles, or error payloads |
| BYOK (v1, OmniDoc vault) | Server-side vault only (§5.9); rotation/revocation/verify; never log raw keys; dual-mode key resolution (§5.11); distinguish from OpenRouter-upstream-BYOK (ADR-0004) |

Note content is **untrusted input** end-to-end.

---

## 7. Retrieval quality as architecture

Retrieval changes are architecture-gated by measurable regression
evidence per
[`.cursor/skills/rag-evaluation/SKILL.md`](.cursor/skills/rag-evaluation/SKILL.md).

**Must be measurable and regression-testable before accepting a retrieval
change:**

1. **Recall@K** (and related rank metrics as justified) on a versioned
   eval corpus
2. **Citation correctness** (claim ↔ authorized passage; no dead/mismatched
   citations)
3. **Tenant-isolation failures = 0** (cross-tenant hit is security fail)

Eval corpus must include: keyword and paraphrase cases, ambiguity,
headings, code/tables, similar docs, stale versions, deleted/inaccessible
docs, cross-workspace negatives, and no-supported-answer questions.

---

## 8. Locale, direction, and time

| Rule | Detail |
|------|--------|
| Locale | Primary `en` only in Phase 0; no secondary locale |
| Direction | LTR now; RTL / mixed-BiDi **deferred, not closed** |
| Source of truth | Single locale → `lang` / `dir`; never scattered hardcoding |
| CSS | Logical properties by default; physical direction only for true exceptions |
| Isolation | `bdi` (or equivalent) for identifiers, code tokens, URLs, UGC fragments |
| Long content | Break/overflow rules for titles, code, tables, unbroken strings |
| JS | No “next = visually right” assumptions; prefer start/end semantics |
| Timestamps | Store **UTC**; format only at presentation |

Accessibility (focus order, keyboard, labels, reduced motion, contrast)
is a **release gate** for UI phases — not optional chrome.

---

## 9. Mock corpus and deterministic fixtures

Required so the frontend can be built before any provider exists.
Aligned with themes already assigned to the human coworker in
[`docs/frontend/README.md`](docs/frontend/README.md) (do not fork a
second fixture authority).

### Required themes

| Theme | Purpose |
|-------|---------|
| Happy-path notes + cited Ask | Activation / REC-12 demo path |
| Empty states | First-run What / Why / one Next (REC-07) |
| Loading / indexing progress | Import before Ask (REC-02) |
| Transport errors | Timeout, unavailable, quota |
| `no_supported_answer` / refusal | First-class success state (REC-10) |
| Partial support + conflict | Honest uncertainty |
| Long titles, nested quotes | Layout / overflow |
| Fenced code + inline ``identifiers`` | BiDi isolation / rendering |
| Inline URLs and file paths | Isolation + sanitization |
| Markdown tables | Retrieve + ask rendering |
| Mixed-case tokens (`pgvector`, `BYOK`) | Search/display edge |
| Very long unbroken strings | Overflow safety |
| Sample vs “mine” labelling | **First-class** corpus labelling (REC-08, REC-17) |
| Public labelled sample workspace | Required portfolio demo path (`@user` YES) plus clone-and-run fixtures — not a substitute for “mine” |
| Runtime mode labelling | Mock vs live·operator free-tier vs live·your key near Ask (REC-13, REC-17) |

**Sample vs mine** is a first-class domain/API concern: list, Ask scope,
and citation surfaces must carry an explicit corpus ownership label.
The public sample workspace is labelled non-personal; clone-and-run
fixtures remain a separate engineer path.

Determinism: same inputs → same outputs. Fixture ids stable across
docs and mock adapters.

---

## 10. Invariants

1. One primary owner per change set / handoff.
2. Extensions and vendors integrate **behind ports**; they do not become
   the architecture.
3. Evidence precedes vendor selection; popularity is not evidence.
4. Phase Check is independent verification — not self-certification.
5. Open gates stay open until explicitly closed by the owning authority
   (`@user` for listed gates).
6. UI → ports only; never providers.
7. Tenant isolation at retrieval time; cross-tenant = security failure.
8. Refusal / no-supported-answer is a success state of the answer port.
9. Citations are passage-level and entailment-honest; no decorative cites.
10. Untrusted note content never controls authz, tools, or secrets.
11. Mock and production are not dual writable authorities.
12. RTL-readiness discipline holds while RTL locale remains deferred.
13. Production AI / provider activation remains gated.
14. Retrieval changes require rag-evaluation evidence (recall, citation
    correctness, zero isolation failures).

---

## 11. Architecture-ready vs ADR-dependent

| Topic | Architecture-ready / accepted | Still gated or Implementer-owned |
|-------|------------------------------|----------------------------------|
| Ports, answer states, tenancy rules | Yes (incl. §5.9–§5.11) | Adapter implementations |
| Fixture themes + sample vs mine | Yes | Fixture file format in app tree |
| Threat / safety / RAG eval bars | Yes | Concrete libraries |
| Frontend framework, editor + note SoT | **Accepted** (ADR-0001 §1–2) | Scaffolding via Implementer handoff |
| DB / vector | **Accepted** (ADR-0001 §3, §4) | Migrations, RLS role PoC |
| Auth **port** | Ready (`architecture.md` §5.7) | **Impl accepted** — Spring Security sessions (ADR-0005); no Better Auth |
| Embedding/LLM dual-mode + BYOK | **Accepted** (ADR-0001 §5 + ADR-0004) | Production AI activation gate; model PoC |
| Hosting topology class | **Accepted** (ADR-0001 §7 — AWS Free-plan EC2/ECS + RDS + pgvector) | SKU PoC; credit-burn monitoring; no scaffold yet |
| Directory names / layout | `apps/` + `packages/` per ADR-0002 (`accepted`). `apps/api` = **JVM Gradle** beside Nx (ADR-0005); TS `packages/domain` not backend SoT | S-01a Nx PoC; S-01b Gradle health |
| Package manager | **Decided: pnpm 12.4.1** (ADR-0002) | — |
| Production AI / RTL locale | **Not claimed** | Production AI open; RTL deferred not closed |

---

## 12. Related documents

- ADR index: [`docs/adr/README.md`](docs/adr/README.md)
- Stack: [`docs/adr/ADR-0001-frontend-and-platform-stack.md`](docs/adr/ADR-0001-frontend-and-platform-stack.md) (`accepted`)
- Workspace + tooling: [`docs/adr/ADR-0002-workspace-and-tooling.md`](docs/adr/ADR-0002-workspace-and-tooling.md) (`accepted`)
- Frontend application toolchain: [`docs/adr/ADR-0003-frontend-application-toolchain.md`](docs/adr/ADR-0003-frontend-application-toolchain.md) (`accepted`)
- Dual-mode BYOK + usage: [`docs/adr/ADR-0004-dual-mode-byok-and-usage.md`](docs/adr/ADR-0004-dual-mode-byok-and-usage.md) (`accepted`)
- Backend application stack: [`docs/adr/ADR-0005-backend-application-stack.md`](docs/adr/ADR-0005-backend-application-stack.md) (`accepted`)
- Technical evidence: `docs/research/technical/`
- UX evidence (input): `docs/research/ux/`
- Frontend contributor contract: `docs/frontend/README.md`
