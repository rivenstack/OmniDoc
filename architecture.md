# OmniDoc — Architecture Baseline

> Status: **architecture-ready draft** for Phase 0. Not final accepted
> truth until Phase Check + `@user` acceptance of ADR-0001 where marked.
> Stack-specific choices live in
> [`docs/adr/ADR-0001-frontend-and-platform-stack.md`](docs/adr/ADR-0001-frontend-and-platform-stack.md)
> (`status: proposed`).

OmniDoc is a multi-tenant AI/RAG note and knowledge SaaS: capture notes
and documents, chunk and embed them, then search and ask questions that
return answers cited to the user’s own sources. Platform class:
TypeScript web SaaS. Primary locale: `en` (LTR). RTL / mixed-BiDi
support is **deferred, not closed** — RTL-readiness remains an invariant.
No commerce, payments, shipping, or SMS.

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

**Architecture-ready:** boundary and ports.
**ADR-0001-dependent:** concrete framework, hosting, and adapter packages.

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

**Isolation posture (architecture preference, ADR detail):** shared
schema with application scoping **plus** defense-in-depth (e.g. Postgres
RLS with a non-owner, non-`BYPASSRLS` role) is the intended early path
per research (`docs/research/technical/03-multi-tenant-isolation.md`).
Schema-per-tenant remains an alternative if year-1 scale and ops gates
demand it — undecided until `@user` scale/ops answers + ADR acceptance.

---

## 3. Domain model boundaries

### Notes and documents

- **Note:** primary capture unit (title + body). Body storage format
  (markdown vs structured editor JSON) is an open decision input to
  ADR-0001; architecture requires **one durable source of truth** plus
  export paths.
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
Capture / import
  → durable note/document version
  → ingestion job (visible progress to UI via port)
  → chunks (immutable for a version; new version ⇒ new chunks)
  → embeddings (model id + dimensions recorded)
  → lexical + vector indexes (tenant-scoped)
```

Indexing lag is a first-class state (ready / pending / failed), not
silent success (REC-02).

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
- Passage anchor (offsets or stable block id)
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
| **Production** | Relational store adapter (Postgres per ADR-0001 proposal) |
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

### 5.3 Embedding

| | |
|--|--|
| **Ops** | `embedTexts`, `embedChunks` |
| **In** | texts/chunk ids, `embedding_model_id` |
| **Out** | vectors + model/version metadata |
| **Invariants** | model id stored with vectors; no browser keys |
| **Mock** | Deterministic pseudo-vectors from hash; fixed dims |
| **Production** | Provider HTTP adapter (operator keys or BYOK vault — gated) |
| **Failures** | `timeout`, `quota_exhausted`, `unavailable`, `invalid_model` |

### 5.4 Vector search

| | |
|--|--|
| **Ops** | `similaritySearch` |
| **In** | query vector, **tenant_id**, ACL scope, topK, filters |
| **Out** | ranked chunk hits (tenant-verified) |
| **Invariants** | tenant filter mandatory; zero cross-tenant hits tolerated |
| **Mock** | Fixture ranking tables keyed by query id |
| **Production** | pgvector or dedicated store adapter per ADR-0001 |
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
| **In** | question, tenant, optional source scope, locale |
| **Out** | one of the answer states in §4 + citations |
| **Invariants** | only authorized chunks sent to model; retrieved text is **data**, not instructions; refusal is success; no auto-persist to corpus |
| **Mock** | Deterministic Q→answer map including refusal/partial/conflict |
| **Production** | LLM adapter + citation assembler; never Assistants-hosted corpus as SoT |
| **Failures** | `timeout`, `quota_exhausted`, `unavailable`, `partial` (stream truncated with explicit flag) — distinct from `no_supported_answer` / `refused_policy` |

### 5.7 Identity / tenancy

| | |
|--|--|
| **Ops** | `authenticate`, `resolveMembership`, `listWorkspaces`, `invite` (as product allows) |
| **In** | credentials / session; workspace selector |
| **Out** | principal, memberships, roles |
| **Invariants** | server authority; org context not client-trusted |
| **Mock** | Fixed users/tenants in fixtures |
| **Production** | Auth adapter per ADR-0001 |
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

Mock and production adapters must not be simultaneous writable
authorities for the same domain entity.

---

## 6. Threat and safety boundaries

Use [`.cursor/skills/threat-model/SKILL.md`](.cursor/skills/threat-model/SKILL.md)
and [`.cursor/skills/ai-content-safety/SKILL.md`](.cursor/skills/ai-content-safety/SKILL.md).

### Assets

User notes/versions, chunks/embeddings, identity/session material,
BYOK/provider secrets (if adopted), audit/telemetry, quota state.

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
| BYOK (if `@user` yes) | Server-side vault only; rotation/revocation; never log raw keys |

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
| Sample vs “mine” labelling | Portfolio demo gate (REC-08; `@user` public vs local) |

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

## 11. Architecture-ready vs ADR-0001-dependent

| Topic | Architecture-ready now | Depends on ADR-0001 `@user` acceptance |
|-------|------------------------|----------------------------------------|
| Ports, answer states, tenancy rules | Yes | Adapter implementations |
| Fixture themes | Yes | Fixture file format in app tree |
| Threat / safety / RAG eval bars | Yes | Concrete libraries |
| Frontend framework, editor, DB, vector, auth, hosting, provider posture | Constraints only | **Proposed** in ADR-0001 |
| Directory names `frontend/` / `backend/` | Predictability contract (see frontend guide) | Confirm or adjust in ADR |
| Package manager | Undecided in research | Confirm at implementation handoff |

---

## 12. Related documents

- ADR index: [`docs/adr/README.md`](docs/adr/README.md)
- Proposed stack: [`docs/adr/ADR-0001-frontend-and-platform-stack.md`](docs/adr/ADR-0001-frontend-and-platform-stack.md)
- Technical evidence: `docs/research/technical/`
- UX evidence (input): `docs/research/ux/`
- Frontend contributor contract: `docs/frontend/README.md`
