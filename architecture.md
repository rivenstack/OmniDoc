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
