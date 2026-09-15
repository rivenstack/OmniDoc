# ADR-0001 — Frontend and Platform Stack

- **Status:** `accepted` — categories 1–5 and 7 accepted (1–2 on
  2026-09-14; 3–5, 7 recorded `accepted` 2026-09-14). **§6 identity
  *port* stays;** Better Auth **library** superseded 2026-09-15 by
  [ADR-0005](./ADR-0005-backend-application-stack.md) (`accepted`) —
  Spring Security HTTP-only session cookies. Dual-mode BYOK / vault /
  usage / key-resolution detail: **ADR-0004** (`accepted`). Full
  record: §Decision record.
- **Date:** 2026-09-13 (amended 2026-09-14)
- **Deciders:** Architect proposes; `@user` accepts / rejects / amends
- **Consulted evidence:** `docs/research/technical/` (Wave B + Wave C
  amend 2026-09-14) + `docs/research/version-ledger.md` (pins, verified
  2026-09-14); UX package as **experience constraints** only
  (`docs/research/ux/`, REC-01…REC-19, citation-trust). UT-* are
  **unrun hypotheses** and are not used as justification.

> This ADR does **not** close production AI activation or RTL locale
> shipping. Those remain standing gates.

---

## Context

> **Version note (2026-09-14).** React Router's current major is **8**
> (8.3.1; v7 is still patched but not the current line) — see
> `docs/research/version-ledger.md`. On 2026-09-14 `@user` accepted
> **Next.js 16.3.5** as the framework, so §1 below records the
> amendment rather than the original React Router 7 proposal. The
> original reasoning is preserved in §1's alternatives table so the
> decision trail stays auditable.

OmniDoc needs a concrete **frontend** TypeScript web stack plus
platform data/providers/hosting to leave Phase 0: UI framework, note
editor, relational DB, vector storage, embedding/LLM posture (including
BYOK), auth/identity **port**, and hosting. The **API application
language** was implied Node via §6 Better Auth and ADR-0002; that
implication is **closed** by ADR-0005 (`accepted`, 2026-09-15) — Java /
Spring API; Better Auth library superseded. Architecture requires
provider-neutral ports, retrieval-time tenant isolation, passage-level
citations, and first-class refusal states (`architecture.md`).
Commerce/SMS/payments are out of scope.

Research delivered a non-binding shortlist
(`docs/research/technical/08-candidate-shortlist.md`) and category
briefs. This ADR recommends **one option per category** from that
evidence. Popularity is not treated as fitness.

### Experience constraints consumed (not findings)

From `docs/research/ux/08-design-facing-recommendations.md` and
`02-citation-trust.md`:

- Write-first capture; light optional structure (REC-01, REC-03)
- Passage-level citation payloads (REC-04)
- Refusal / partial / conflict as first-class answer states (REC-10)
- Import/index progress before encouraging Ask (REC-02)
- AI answers not auto-persisted into the corpus (REC-06)
- Mock-deterministic Ask before production providers (REC-08;
  experience-first)
- Accessibility of trust controls (REC-11)

### Open research questions — closed by `@user` 2026-09-14

| # | Question | Answer |
|---|----------|--------|
| 1 | Year-1 tenant count / corpus size | **Minimal** year-1 tenants; honest workspaces; design to scale later |
| 2 | Real-time collaborative editing in v1? | **Much later** — collab path reserved only |
| 3 | Markdown vs structured editor JSON | **ProseMirror JSON** SoT (§2) |
| 4 | React vs Svelte | **React-only** (§1) |
| 5 | Privacy / ZDR ambition | ~**30-day** abuse-log honesty; **no** ZDR sales motion (ADR-0004) |
| 6 | Always-on demo / hosting | AWS Free-plan **6-month** window in-scope (§7) |
| 7 | Managed-only vector vs self-host | **pgvector** in Postgres accepted (§4) |

---

## Decision drivers (shared)

1. Ports-first / Extension-First: mature components behind project ports
2. Tenant isolation at retrieval time (security, not relevance)
3. Editor-centric SaaS + streaming Ask (server-mediated)
4. RTL-readiness discipline without claiming RTL locale support
5. Portfolio credibility: operable demos, honest privacy story
6. Ops fit for ingestion/embedding **workers** (not request-only)
7. Migration/rollback and lock-in awareness from evidence
8. Cost uncertainty until budget gate answered

---

## Recommendations by category

### 1. Frontend framework

**Decision (amended; accepted by `@user` 2026-09-14):** **Next.js
16.3.5** (App Router) as the UI meta-framework, living in the Nx
`apps/web` workspace (ADR-0002). Server components for the shell,
marketing, and read-only surfaces; the note editor stays a client
island. Streaming Ask goes through project-owned ports (route handlers
/ SSE), never provider SDKs from the browser.

**Why the original proposal changed**

The 2026-09-13 proposal recommended **React Router 7 Framework Mode**.
Two corrections moved the decision:

1. **Version drift.** RR7 was already a major behind at the time of
   writing (v8 shipped 2026-06-17), so the choice had to be re-taken
   on current majors regardless. See
   `docs/research/version-ledger.md`.
2. **A missing decision driver.** The stated business context is a
   portfolio / freelancing credibility product, so **audience
   recognizability** — what a prospective client or hiring manager
   recognises in a demo and on a CV — belongs in the driver list. The
   original driver set omitted it entirely and priced only technical
   concerns. On it, Next.js wins decisively, and it is the single
   largest contributing factor to this amendment.

**Drivers**

- **Portfolio recognizability** (added; dominant for this product's
  stated purpose)
- Ecosystem depth for this product shape: TipTap/Lexical React
  adapters, shadcn/ui componentry (ADR-0003), Storybook, streaming
  answer UI patterns
- Authenticated, editor-heavy app: the note surface is largely Client
  Components regardless of framework, so RSC benefit concentrates in
  shell/marketing surfaces (`01-frontend-frameworks.md`)
- Hosting optionality: Node-portable containers (AWS Free-plan topology
  class per §7) *and* Vercel available, with VPS fallback still possible
- Extension-First: TipTap/Lexical React ecosystems documented as mature
  relative to Svelte for this product shape (`01`, `02`)

**Known costs accepted (explicitly)**

- **React canary coupling.** The Next.js App Router runs a React
  *canary* build, not stable React — the risk the research flagged is
  real and ongoing. Mitigation: keep the editor and the data layer
  framework-agnostic behind ports, and forbid canary-only APIs in
  application code. React Router 8 pins stable React ≥19.2.7, so this
  is a genuine cost of the chosen path.
- **Soft Vercel coupling** remains. Mitigation: containerize web and
  worker early (§7) and avoid platform-proprietary bindings in app
  code.
- Vercel's Hobby tier is personal/**non-commercial** only, so it does
  not by itself solve the always-on demo gate (Q6). Demo hosting is
  still decided with §7.

**Alternatives considered**

| Option | Why not chosen |
|--------|-----------------|
| React Router 8 Framework Mode | **The original 2026-09-13 proposal.** Technically sound (`01`): portable Node/Cloudflare adapters, Vite toolchain, ESM-only, stable React ≥19.2.7, clearer data APIs. Lost on audience recognizability for a portfolio product, and it was proposed at RR7 after v8 had already shipped. Remains the **documented fallback** if canary coupling or Vercel-shaped conventions become a real problem. |
| Vite + React SPA | Highest static portability (`01`); lost because auth/BFF/SSE/secret handling become fully DIY and raise session/CSRF risk surface for a multi-tenant SaaS (`01` adverse). Acceptable only if split API is explicitly preferred. |
| SvelteKit | **Closed by `@user` 2026-09-14 (React-only).** Strong Kit (`01`); lost on thinner React-centric editor/streaming UI ecosystem for OmniDoc’s Extension-First bar (`01`, shortlist watchlist). Reopen only if `@user` answers “open to Svelte” affirmatively. |
| TanStack Start | Watchlist; younger maturity (`00`, `01`). |

**Consequences**

- Liked: strongest ecosystem and hiring/demo recognizability; App Router
  shell + client editor island; Vercel *and* Node/PaaS deploy paths stay
  open.
- Disliked: React canary coupling (see accepted costs); RSC complexity
  is real even though most of it lands in shell surfaces; soft Vercel
  conventions persist and must be actively resisted.
- Directory contract: the `frontend/` + `backend/` shape from
  `docs/frontend/README.md` is **replaced by the Nx workspace layout in
  ADR-0002** (`apps/web`, `apps/api`, `packages/*`). Workers stay in a
  separate app so ingestion jobs are not tied to UI request limits.

**Migration / rollback**

- Forward: scaffold only after the ADR-0002 workspace lands + an
  Implementer handoff.
- Rollback: switching to React Router 8 requires rewriting routing and
  data APIs but not the domain layer — keep ports, `docs/api/`
  contracts, and the editor island framework-agnostic to bound the blast
  radius. This is why the ports-only invariant matters more under this
  decision, not less.

**Security / privacy**

- Session cookies and org context stay server-authoritative
  (`06-auth-identity.md` checklist; `architecture.md`).
- No provider keys in the browser bundle — server actions/route handlers
  are the only path to the answer port.

**Verification**

- PoC: authenticated shell + TipTap island + SSE mock Ask; deploy to a
  Node host (not Vercel-only); confirm no provider SDK in the client
  graph (`@nx/enforce-module-boundaries` tag check, ADR-0002).
- Confirm no canary-only React API is used anywhere in app code — grep
  in review, and fail the PR if found.
- Falsify if canary-only breakage or Vercel-shaped coupling repeatedly
  blocks upgrades, or if the workspace cannot keep the editor island
  framework-agnostic behind ports.

**Consistency with `docs/frontend/README.md`**

- **Package manager: decided — pnpm 12.4.1** (ADR-0002). The guide's
  "undecided" note and its prerequisites table are now stale; the guide
  must be refreshed as part of the ADR-0002 rollout.
- Directory contract: the guide's `frontend/` + `backend/` expectation
  is **superseded by ADR-0002** (`apps/` + `packages/`).

---

### 2. Rich-text / markdown editor

**Decision (accepted by `@user` 2026-09-14):** **TipTap 3.31.3**
(ProseMirror) as the primary note editor foundation (MIT core), with
CodeMirror 6 inside it for fenced code.

**Drivers**

- MIT core; extension model; documented `textDirection`
  (`ltr` \| `rtl` \| `auto`) supporting RTL-readiness without shipping
  RTL locale (`02-rich-text-editors.md`).
- Yjs / Hocuspocus path preserves collab **option value** without paying
  Cloud now (`02`, shortlist) — collaborative editing is **much later**
  (`@user` 2026-09-14).
- Extension-First: headless editor + project-owned a11y chrome matches
  REC-11 (a11y is implementer-owned; TipTap does not claim “included”
  a11y — evidence `02`).

**Alternatives considered**

| Option | Why not primary |
|--------|-----------------|
| Lexical | MIT + React-first + Yjs (`02`); lost on younger major-version signal and **unverified** BiDi for OmniDoc (needs PoC) (`02`). Keep as alternate if TipTap a11y cost proves too high in PoC. |
| Milkdown | Markdown-first strength (`02`); lost on smaller ecosystem / weaker collab docs skim (`02`). Prefer if `@user` mandates markdown-as-only-SoT *and* PoC wins. |
| CodeMirror 6 | Excellent for code / source (`02`); lost as primary notes WYSIWYG; still expected **inside** TipTap for fenced code. |

**Storage mode (decided 2026-09-14)**

**TipTap/ProseMirror JSON is the durable source of truth; markdown is
an export and chunking projection, not the store.** `@user` chose this
over markdown-as-SoT and over storing both.

- One SoT, satisfying `architecture.md` (one durable source of truth +
  export paths): the JSON document.
- A **single canonical serializer** (JSON → markdown) is the only
  markdown producer. Chunking and embedding consume its output; export
  consumes the same output. Never parse markdown back into the store —
  a lossy round-trip would corrupt the editor document.
- Passage-level citation anchors (block ids) come from ProseMirror node
  attributes, which is what makes stable citation targets cheap. This is
  the main reason JSON-as-SoT beat markdown-as-SoT for a
  citation-centric product.
- Consequence to own: markdown export fidelity is now a product
  surface with its own tests (tables, nested quotes, fenced code,
  inline identifiers/URLs), not an afterthought.

**Consequences**

- Liked: RTL-ready direction API; extensions; collab path.
- Disliked: a11y DIY; Cloud upsell pressure (`02`) — forbid Cloud as
  architecture dependency; collab OSS only if/when needed.

**Migration / rollback**

- Port owns note body I/O; swapping editor later needs import/export
  through the notes port. Keep markdown export even if JSON SoT.

**Security / privacy**

- Render path must sanitize Markdown/HTML (ai-content-safety skill);
  editor output is untrusted UGC.

**Verification**

- PoC: logical CSS chrome; `textDirection`; fixtures with code, URLs,
  tables; keyboard toolbar labels; paste/import entry points (REC-01/02).
- Falsify if WCAG editor chrome cannot meet release bar without
  disproportionate custom work vs Lexical PoC.

---

### 3. Relational database

**Decision (accepted by `@user` 2026-09-14; Architect status flip
2026-09-14):** **PostgreSQL 18** as the system of record for tenants,
notes/versions, jobs, and (with §4) vectors via extension.

**Drivers**

- Multi-tenant isolation research centers on Postgres app scoping and
  RLS (`03-multi-tenant-isolation.md`).
- pgvector co-location option reduces dual-write early (`04-vector-storage.md`).
- Portfolio self-host and managed Postgres both available (`07`).
- Minimal year-1 tenants still keep shared-schema + RLS — schema-per-
  tenant is not justified at this scale (`@user`; shortlist).

**Alternatives considered**

| Option | Why not |
|--------|---------|
| MySQL / MariaDB | Weaker fit for documented RLS + pgvector path in Wave B evidence set (not shortlisted). |
| SQLite | Fine for single-tenant mocks; insufficient as multi-tenant production SoT for this scope. |
| Serverless-only proprietary stores | Lock-in without evidence advantage for notes + RLS story. |
| Schema-per-tenant now | Deferred — ops cost at minimal year-1 scale; reopen only if isolation/ops evidence demands it. |

**Tenancy mechanism (accepted)**

Shared schema + `tenant_id` **and** Postgres RLS with a non-owner,
non-`BYPASSRLS` role (`03`, shortlist). App filters remain mandatory;
RLS is defense-in-depth.

**Consequences**

- Liked: one operational mental model; SQL tenant filters; scales later
  without rewriting the tenancy story.
- Disliked: RLS pool/GUC footguns; owner bypass if misconfigured (`03`)
  — must use FORCE RLS patterns and fail-closed missing tenant GUC.

**Migration / rollback**

- Standard migrations; RLS policies versioned with schema.
- Rollback of RLS still leaves app filters (weaker).

**Security / privacy**

- Integrity covert channels via unique/FK (`03`) — design keys to avoid
  cross-tenant existence leaks where feasible; never rely on RLS alone.

**Verification**

- Negative tests: wrong `tenant_id`, worker without GUC, owner-role
  banned in app paths; zero cross-tenant reads
  (tenant-security-review skill).

---

### 4. Vector storage

**Decision (accepted by `@user` 2026-09-14; Architect status flip
2026-09-14):** **Postgres + pgvector** (ledger pin **0.8.6**; RDS may
ship a matrix-listed 0.8.x — confirm at scaffold) as the default vector
store, behind the vector-search port.

**Drivers**

- One datastore for notes + vectors; SQL tenant filters; HNSW/IVFFlat
  documented; iterative scans ≥0.8 for filtered ANN
  (`04-vector-storage.md`, `00-evidence-matrix.md`).
- Aligns with Free-plan RDS PostgreSQL + pgvector extension feasibility
  (`07`).
- Store choice never removes tenant filter requirement (`04`).

**Alternatives considered**

| Option | Why not primary now |
|--------|---------------------|
| Qdrant | Strong filtered search + self-host (`04`); lost as default because second system + consistency/outbox cost before scale evidence. Escalate if pgvector filter/recall fails eval. |
| Weaviate | Hybrid + MT features (`04`); managed minimums may blow budget (`04`, shortlist). |
| Pinecone | Managed convenience (`04`); **no self-host**; namespace soft isolation (`04`) — reject as default. |

**Consequences**

- Liked: operational simplicity; transactional affinity with notes.
- Disliked: ANN+filter tuning; unknown ceiling for this product (`04`);
  embedding model change ⇒ full re-embed (`04`).

**Migration / rollback**

- Version `embedding_model_id` + dims on rows; blue/green re-embed.
- Rollback to Qdrant: re-upsert via port; keep Postgres as SoT for notes.

**Security / privacy**

- Similarity search without tenant/ACL filter = security failure
  (`architecture.md`, rag-evaluation skill).

**Verification**

- rag-evaluation corpus: Recall@K, citation correctness, **0** isolation
  failures before accepting index/chunk changes.
- Falsify if filtered HNSW under-returns on realistic tenant sparsity
  after iterative-scan tuning — then reopen Qdrant.

---

### 5. Embedding and LLM provider posture (including BYOK)

**Decision (rewritten and accepted 2026-09-14; `@user` + Wave C):**

1. **Ports + mocks first** until the Customer Experience First /
   production-AI gate closes.
2. **Customer BYOK is v1** (not later) — detail in **ADR-0004**.
3. **Dual-mode key resolution:** `mock` | `operator_free_tier` |
   `customer_key` — never silently mix (ADR-0004; REC-13/16).
4. **Operator free-tier gateway:** **OpenRouter** behind answer/embed
   ports for the labelled live-demo path (`05`, shortlist; Architect
   decision). Prefer `:free` first; ~$10 credit only after operational.
5. **Forbid** OpenAI Assistants / hosted `vector_stores` (and gateway
   equivalents) as corpus SoT (`05`).
6. **Distinguish** OmniDoc customer-BYOK vs OpenRouter-upstream-BYOK
   (ADR-0004; `05`, `09`).
7. **Usage/metering port** wraps provider usage APIs (e.g. OpenRouter
   `GET /api/v1/key`) — no billing product (ADR-0004; `09`).
8. Accept ~**30-day** abuse-log retention honesty; **no** ZDR sales
   motion (`@user`; `05`).
9. Cookbook/wizard is a **UX surface**; Architect owns verify / rotate /
   revoke vault ports (ADR-0004; REC-14).

Stack-level default pairing at activation time may still use direct
OpenAI embeddings and/or non-OpenRouter LLMs via ports — OpenRouter is
the **accepted operator free-tier gateway**, not a permanent exclusive
vendor lock. Exact model IDs are not pinned here.

**Drivers**

- UI must not call providers; backend proxy only (`05`).
- `@user` closed BYOK=v1, dual-mode, OpenRouter free-first, ~30-day
  retention honesty.
- Wave C documents OpenRouter `:free`, rate limits, usage APIs, and the
  two BYOK meanings (`05`, `09`).
- Experience constraints REC-13…REC-17 require mode chrome, verify≠Ask,
  honest usage/`unavailable`, no silent payer mix.

**Alternatives considered**

| Option | Why not default |
|--------|-----------------|
| BYOK later / operator-only in v1 | Rejected by `@user` 2026-09-14 |
| OpenAI embeddings + Anthropic/OpenAI direct as operator free path | Valid paid path (`05`); lost as **operator free-tier** default — no comparable documented free-variant + usage APIs; remain swap-ready |
| Voyage/Cohere embeddings + Anthropic/Gemini | Valid specialist path (`05`, shortlist); keep swap-ready via ports |
| Free AI Studio / consumer chat terms | Explicitly non-equivalent to paid API terms (`05`, shortlist) |
| OpenRouter-upstream-BYOK as customer product | Wrong vault owner (`05`, `09`) |

**Consequences**

- Liked: portable ports; mock Ask for experience-first (REC-08/13);
  dual-mode matches portfolio → scale.
- Disliked: OpenRouter sub-processor + free-model variance (`05`);
  encrypted-column vault maturity tradeoff (ADR-0004).
- Detail ownership: vault, usage, key-resolution → **ADR-0004**.

**Migration / rollback**

- Store model ids with embeddings; never mix incompatible vectors.
- Swap LLM/gateway adapter without UI change; re-eval citation/refusal
  behavior (ADR-0004).

**Security / privacy**

- Keys never in repo/client; notes = untrusted evidence.
- Vault / rotation / revoke: ADR-0004 + `architecture.md` §5.9 / §6.

**Verification**

- Mock Ask fixtures include refusal/partial before any live key.
- Mode-stamp and vault checks per ADR-0004.
- Production activation remains a **separate open gate**.

---

### 6. Auth / identity

> **Amended 2026-09-15 (A-BE2).** The **identity port** (server-
> authoritative membership; year-1 SSO not required; client workspace id
> is a selector only) remains accepted. The **library** choice
> **Better Auth 1.7.4** is **superseded** by
> [ADR-0005](./ADR-0005-backend-application-stack.md) (`accepted`):
> **Spring Security** HTTP-only session cookies + first-party
> organization / workspace / membership / invite tables. Do **not**
> scaffold Better Auth.

**Decision (product gates accepted 2026-09-14; implementation amended
2026-09-15 via ADR-0005):**

1. **Port / product gates (unchanged):** server-authoritative orgs;
   year-1 enterprise SSO **not** required; no client-trusted `orgId`
   authority (`architecture.md` §5.7).
2. **Implementation (ADR-0005):** Spring Security sessions + SPA CSRF
   (`csrf.spa()`); first-party membership tables in the Java API.
3. **Historical record:** Better Auth 1.7.4 + organization plugin was
   the 2026-09-14 Node/TS API choice; retained below as a superseded
   alternative, not the binding implementation.

**Year-1 enterprise SSO is not required** — the prior SSO-reopen
conditional remains **removed**. Revisit SSO only if `@user` later
mandates it.

**Drivers (port — still apply)**

- Org/membership model fits tenancy port (`06-auth-identity.md`).
- Self-host / app-owned sessions align with portfolio narrative.
- Avoids SMS product flows (out of scope) and keeps org context
  server-side (`06` checklist).
- Minimal year-1 tenants: honest workspace chrome (REC-18).

**Alternatives considered**

| Option | Why not primary |
|--------|-----------------|
| Better Auth 1.7.4 + org plugin | **Superseded 2026-09-15** — TypeScript library unfit inside the accepted Java API (ADR-0005). |
| Clerk | Fast org UX; Hobby tier (`06`); lost on managed lock-in, residency uncertainty, and SSO/B2B add-on cost cliffs (`06`). **Fallback** if `@user` prefers managed auth and accepts sub-processor. |
| Keycloak / Spring Authorization Server | Full IdP (`06`, `12`); lost on ops burden while year-1 SSO is not required. |
| Auth.js alone | Viable DIY for a Node API (`06`); moot under Java — not equal product. |
| JWT resource server as default | Worse default for browser SPA unless `@user` prefers tokens (ADR-0005). |

**Consequences**

- Liked: identity **port** stable across language change; one membership
  authority in the Java API.
- Disliked: project owns cookie flags, CSRF, rotation, invite abuse
  controls, and membership schema (no Better Auth plugin).

**Migration / rollback**

- Identity port abstracts sessions; migrate to Clerk/Keycloak later via
  adapter + session invalidation window.
- Rollback to Better Auth implies restoring a Node identity surface —
  treat as a reopen, not a toggle (ADR-0005).

**Security / privacy**

- IDOR tests: user A session + user B org selector → 403 (`06` / B-12).
- No client-trusted `orgId` authority (`architecture.md`).

**Verification**

- PoC invite + role-gated note list; logout revoke; session cookie flags
  + CSRF for SPA.
- Falsify if session + membership tables cannot express workspace ACL for
  retrieval-time isolation without disproportionate custom work.

---

### 7. Hosting / deployment

**Decision (rewritten and accepted 2026-09-14; `@user` + Wave C):**

1. **Railway / Render are not the default** (`@user` rejected).
2. **Preferred topology CLASS** (not a specific instance SKU): **AWS Free
   plan** — **EC2 and/or ECS** + **RDS PostgreSQL** + **pgvector** for
   the accepted **6-month** hosted-demo window (`07`, shortlist).
3. **VPS / Docker Compose fallback only if** a concrete PoC shows AWS
   cannot host web + worker + Postgres(+pgvector) for those 6 months
   within Free-plan eligibility / credits — **not** because 6 months is
   “too short.”
4. Document **credit-burn** and **account-close-at-expiry** honestly;
   these are ops risks, **not** a current blocker for choosing this
   topology (`07`).
5. **Containerize** web + worker early; **no** platform-proprietary
   bindings in app code.
6. **Data region:** none (`@user`).

Exact EC2/ECS instance types and RDS sizes remain **Implementer PoC**
choices within Free-plan-eligible surfaces — this ADR does not pin a
SKU.

**Drivers**

- Workload needs long-running ingestion/embed workers (`07`).
- Wave C: Free plan (credits + 6 months) can host EC2/ECS + RDS +
  pgvector at **$0 cash** while the Free plan lasts; credit exhaustion
  may end the plan early; expiry **closes** the account (`07`).
- `@user`: 6-month demo horizon is an accepted fit; prefer AWS Free
  Tier; infra prefer $0 / ~$20 ceiling.

**Alternatives considered**

| Option | Why not primary |
|--------|-----------------|
| Railway / Render | Explicitly **rejected as default** (`@user`); retain as compared non-defaults (`07`). |
| Vercel + external DB + external worker | Best Next DX (`07`); lost as default because split-brain jobs + function limits (`07`). |
| Fly.io | Capable (`07`); more knobs for solo maintainer. |
| Cloudflare Workers/Pages | Edge/static strengths (`07`); Node/Postgres worker patterns may need redesign. |
| Lightsail / App Runner as Free-plan defaults | Lightsail trial ≠ Free plan; App Runner on Paid lists (`07`). |
| VPS/Docker as default | Max control (`07`); demoted to **fallback-only** per `@user` rule. |

**Consequences**

- Liked: always-on compute shape matches workers; aligns with pgvector
  on RDS; portable containers.
- Disliked: credit monitoring is mandatory demo ops; Free plan end closes
  account (90-day Paid-upgrade recovery window) (`07`).
- Soft Vercel coupling from §1 remains actively resisted via containers.

**Migration / rollback**

- Same container images → VPS if AWS PoC fails eligibility/burn.
- Rollback to Railway/Render: possible as paid non-default; not preferred.
- Export/backup drill before Free plan end date.

**Security / privacy**

- Record snapshot region + provider processing regions honestly even
  when data-region preference is none (`07`).
- Do not claim “data stays in VPC” without evidence on shared managed
  services.

**Verification**

- Deploy web + worker + Postgres(+pgvector) on Free-plan-eligible
  topology; run mock embed job > request timeout; track credit burn.
- Falsify only if Free-plan path cannot host the workload — then time-
  box VPS Compose fallback.

## Summary table

| # | Category | Choice | Status |
|---|----------|--------|--------|
| 1 | Frontend | **Next.js 16.3.5** (App Router) | `accepted` 2026-09-14 |
| 2 | Editor | **TipTap 3.31.3** (ProseMirror) + CodeMirror 6 for fenced code; **ProseMirror JSON as SoT**, markdown via one canonical serializer | `accepted` 2026-09-14 |
| 3 | Database | **PostgreSQL 18** + shared schema + app scoping + RLS defense-in-depth | `accepted` 2026-09-14 |
| 4 | Vector | **pgvector** in Postgres (ledger **0.8.6**; confirm RDS matrix at scaffold) | `accepted` 2026-09-14 |
| 5 | Embedding/LLM | Ports + mocks first; OpenRouter operator free-tier **gateway**; customer BYOK v1; dual-mode; usage port; no Assistants/`vector_stores` SoT — detail **ADR-0004** | `accepted` 2026-09-14 |
| 6 | Auth | **Port:** year-1 SSO **not** required; server-authoritative orgs. **Impl:** Spring Security sessions (ADR-0005); Better Auth library **superseded** | Port `accepted` 2026-09-14; library disposition `accepted` via ADR-0005 2026-09-15 |
| 7 | Hosting | AWS Free-plan topology class: **EC2 and/or ECS + RDS Postgres + pgvector**; Railway/Render not default; VPS fallback only if AWS cannot cover 6 months; data region none | `accepted` 2026-09-14 |

---

## Decision record (2026-09-14)

### Part A — Categories 1–2 + toolchain (earlier same day)

`@user` answered the Task 0.7 gate during research review. Exact pins
come from `docs/research/version-ledger.md`.

| Decision | Exact pin |
|----------|-----------|
| Frontend framework | **Next.js 16.3.5** (App Router) — chosen over React Router 8; primary reason: portfolio audience recognizability |
| Editor foundation | **TipTap 3.31.3** (MIT core; `textDirection` verified present) |
| Note source of truth | **TipTap/ProseMirror JSON**; markdown produced only by one canonical serializer for export + chunking |
| Language / runtime | **Node 24 LTS** (`engines.node >= 24`, `.nvmrc` = `24`) — **frontend / Nx graph**. API language: ADR-0005 |
| Package manager | **pnpm 12.4.1** |
| Monorepo tool + layout | **Nx 23.2.1**, `apps/` + `packages/` → **ADR-0002** |
| Language surface | **React-only** (SvelteKit formally closed in §1) |
| Styling + components | **Tailwind CSS 4.3.3 + shadcn/ui 4.21.0 on Base UI 1.8.0** → **ADR-0003** |
| Data + state | **RSC + Server Actions first**; Zustand 5.0.15 for editor/UI state only; no client cache library in v1 → ADR-0003 |
| Testing | **Vitest 5.0.0 + Testing Library 16.3.3 + Playwright 1.63.0 + @axe-core/playwright 4.13.0 + MSW 2.15.0 + Storybook 10.6.0** → ADR-0003 |

### Part B — Categories 3–7 (Task 0.9; Architect 2026-09-14)

`@user` directed acceptance in Task 0.7 archive
(`docs/handoffs/archive/H-2026-09-13-P0-T07-phase-check-user.md`).
Wave C evidence: `05`, `07`, `09`, shortlist. UX constraints: REC-13…19.

| Decision | Record |
|----------|--------|
| Relational DB | PostgreSQL 18; shared schema + app scoping + RLS DiD |
| Vector | pgvector in Postgres |
| Embedding/LLM | See §5 + **ADR-0004** (`accepted`) |
| Auth | Port: year-1 SSO not required; server-authoritative orgs. Impl: Spring Security sessions (ADR-0005 `accepted`); Better Auth superseded |
| Hosting | AWS Free-plan EC2/ECS + RDS + pgvector topology class; no SKU pin |
| Year-1 tenants | Minimal; honest workspaces; collab much later |
| Demo corpus | Public labelled sample workspace + clone-and-run fixtures |
| Mock-first | Until CX validated; production AI still gated |
| Privacy | ~30-day abuse-log honesty; no ZDR sales motion |
| Data region | None |
| Nx Cloud | Local cache only (unchanged) |

### Standing gates (still open — not closed by this ADR)

- **RTL locale support** — deferred, **not closed**
- **Production AI / provider activation** — open until CX-first mock
  validation
- **UT-*** — still unrun hypotheses
- Exact AWS Free-plan credit-burn PoC and OpenRouter model-quality PoC
  — Implementer / activation-time work, not ADR blockers for accepting
  topology class / gateway choice
- **Backend application stack / ADR-0005** — `accepted` 2026-09-15
  (A-BE2); Node API not authorized; scaffold via S-01b when Commander
  opens it

### Follow-through owned elsewhere

- Commander integrates Task 0.9 and opens Phase 1 (Designer + Implementer
  loops); Architect does **not** scaffold or open those handoffs here.
- `docs/frontend/README.md` may still need a refresh for known stack
  (Implementer / Commander coordination).
- `context.md` live status is Commander-owned after this task.

---

## Closed `@user` gates (2026-09-14)

Previously blocking acceptance of §3–§7; now closed:

1. Monthly budget ceiling (infra prefer $0 / ~$20; AI = OpenRouter free
   then ~$10 after operational)
2. Self-host vs managed (prefer free; managed OK if $0)
3. Privacy / ZDR (~30-day abuse OK; no ZDR sales)
4. Customer BYOK — **yes in v1**; dual-mode
5. Data region — none
6. Enterprise SSO year-1 — **not required**
7. Hosted demo horizon — **6 months**; AWS Free Tier window in-scope
8. Year-1 tenants — minimal; honest workspaces
9. Collaborative editing — much later
10. Mock-first until CX validated; public labelled sample + fixtures
11. ADR-0001 categories 3–7 — **accepted** this amendment

### Standing / not closed

- RTL locale support — deferred, not closed
- Production AI / provider activation — open
- UT-1…UT-22 (and related) — unrun hypotheses
- Nx Cloud / remote caching — local cache only unless `@user` enables

---

## What this ADR does not do

- Does not authorize `package.json` scaffolding (needs Implementer
  handoff after Commander opens Phase 1)
- Does not activate production providers
- Does not treat UT-* as findings
- Does not invent legal/compliance certification
- Does not pick a specific EC2/ECS/RDS SKU
- Does not enable Nx Cloud
- Does not rewrite `docs/frontend/README.md` (Implementer reconciles
  after acceptance if needed)
- Does not own cookbook chrome (Designer later) — ports only via
  ADR-0004

## References

- `docs/research/technical/00-evidence-matrix.md`
- `docs/research/technical/01-frontend-frameworks.md` …
  `07-hosting-deployment.md`
- `docs/research/technical/08-candidate-shortlist.md`
- `docs/research/technical/09-byok-and-usage-metering.md`
- `docs/research/ux/02-citation-trust.md`
- `docs/research/ux/08-design-facing-recommendations.md`
- `docs/research/ux/09-byok-cookbook-and-dual-mode.md`
- `architecture.md`
- `docs/adr/ADR-0004-dual-mode-byok-and-usage.md`
- `docs/frontend/README.md`
