# ADR-0001 — Frontend and Platform Stack

- **Status:** `proposed`
- **Date:** 2026-09-13
- **Deciders:** Architect proposes; `@user` accepts / rejects / amends
- **Consulted evidence:** `docs/research/technical/` (Wave B);
  UX package as **experience constraints** only
  (`docs/research/ux/`, REC-01…REC-12, citation-trust). UT-1…UT-14 are
  **unrun hypotheses** and are not used as justification.

> This ADR does **not** close production AI activation, RTL locale
> shipping, or any `@user` gate listed below.

---

## Context

OmniDoc needs a concrete TypeScript web stack to leave Phase 0: UI
framework, note editor, relational DB, vector storage, embedding/LLM
posture (including BYOK), auth/identity, and hosting. Architecture
requires provider-neutral ports, retrieval-time tenant isolation,
passage-level citations, and first-class refusal states
(`architecture.md`). Commerce/SMS/payments are out of scope.

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

### Open research questions treated as decision inputs

From shortlist §Open questions — **not guessed away**:

1. Year-1 tenant count and corpus size
2. Real-time collaborative editing in v1?
3. Markdown-as-source-of-truth vs structured editor JSON?
4. React vs openness to Svelte?
5. Privacy marketing claims required for the portfolio?
6. Always-on demo vs cold starts allowed?
7. Managed-only vector OK, or self-host mandatory?

Where a category cannot be finalized without `@user`, the recommendation
is labelled **conditional** and the blocking gate is listed.

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

**Decision (proposed):** **React Router 7 (Framework Mode)** as the
primary UI meta-framework, with a clear Node deploy adapter (and
optional SPA mode only if a later ADR justifies it).

**Drivers**

- Authenticated, editor-heavy app: research notes that the note surface
  is largely Client Components regardless of RSC
  (`01-frontend-frameworks.md` — Next adverse: RSC benefit reduced for
  core editor).
- Hosting portability: RR7 documents multiple adapters; lower soft
  Vercel coupling than Next (`00-evidence-matrix.md`,
  `01-frontend-frameworks.md`, `08-candidate-shortlist.md`).
- Streaming Ask via resource routes / SSE behind project ports aligns
  with ports-only UI (`01-frontend-frameworks.md`).
- Extension-First: TipTap/Lexical React ecosystems documented as mature
  relative to Svelte for this product shape (`01`, `02`).

**Alternatives considered**

| Option | Why not primary |
|--------|-----------------|
| Next.js App Router | Strong DX and ecosystem (`01`); lost on soft Vercel coupling + RSC complexity for an editor-centric app when workers likely live off-platform (`01`, `07`, shortlist). Remains **fallback** if `@user` mandates Vercel-first DX. |
| Vite + React SPA | Highest static portability (`01`); lost because auth/BFF/SSE/secret handling become fully DIY and raise session/CSRF risk surface for a multi-tenant SaaS (`01` adverse). Acceptable only if split API is explicitly preferred. |
| SvelteKit | Strong Kit (`01`); lost on thinner React-centric editor/streaming UI ecosystem for OmniDoc’s Extension-First bar (`01`, shortlist watchlist). Reopen only if `@user` answers “open to Svelte” affirmatively. |
| TanStack Start | Watchlist; younger maturity (`00`, `01`). |

**Consequences**

- Liked: portable Node deploy; Vite toolchain; clear loaders/actions.
- Disliked: Remix→RR7 naming/docs transition; less RSC depth than Next
  if marketing SSR becomes important later (`01`).
- Directory contract: keep predictability of `frontend/` (UI) +
  `backend/` (API/workers/adapters) from `docs/frontend/README.md`.
  RR7 app lives under `frontend/`; long-running workers remain in
  `backend/` (or `frontend` only if a later ADR colocates — default is
  split so ingestion jobs are not tied to UI request limits).

**Migration / rollback**

- Forward: scaffold only after acceptance + Implementer handoff.
- Rollback: to Next or Vite SPA requires route/data-API rewrite; keep
  domain ports and `docs/api/` contracts stable to limit blast radius.

**Security / privacy**

- Session cookies and org context stay server-authoritative
  (`06-auth-identity.md` checklist; `architecture.md`).
- No provider keys in the browser bundle.

**Verification**

- PoC: authenticated shell + TipTap island + SSE mock Ask; deploy to
  non-Vercel Node host; confirm no provider SDK in client graph.
- Falsify if team cannot staff RR7 docs transition or if `@user`
  requires Vercel-only workflow.

**Consistency with `docs/frontend/README.md`**

- Package manager remains **undecided** (guide correctly says pending;
  research did not evaluate npm/pnpm/yarn). No change forced here —
  Implementer chooses after acceptance unless `@user` prefers one.
- Expected `frontend/` + `backend/` + `docs/api/` + `docs/adr/` contract
  is **confirmed** by this proposal (guide already allowed Architect
  adjustment).

---

### 2. Rich-text / markdown editor

**Decision (proposed):** **TipTap (ProseMirror)** as the primary note
editor foundation (MIT core).

**Drivers**

- MIT core; extension model; documented `textDirection`
  (`ltr` \| `rtl` \| `auto`) supporting RTL-readiness without shipping
  RTL locale (`02-rich-text-editors.md`).
- Yjs / Hocuspocus path preserves collab **option value** without paying
  Cloud now (`02`, shortlist) — collab v1 remains an open question.
- Extension-First: headless editor + project-owned a11y chrome matches
  REC-11 (a11y is implementer-owned; TipTap does not claim “included”
  a11y — evidence `02`).

**Alternatives considered**

| Option | Why not primary |
|--------|-----------------|
| Lexical | MIT + React-first + Yjs (`02`); lost on younger major-version signal and **unverified** BiDi for OmniDoc (needs PoC) (`02`). Keep as alternate if TipTap a11y cost proves too high in PoC. |
| Milkdown | Markdown-first strength (`02`); lost on smaller ecosystem / weaker collab docs skim (`02`). Prefer if `@user` mandates markdown-as-only-SoT *and* PoC wins. |
| CodeMirror 6 | Excellent for code / source (`02`); lost as primary notes WYSIWYG; still expected **inside** TipTap for fenced code. |

**Storage mode (explicitly open)**

Markdown vs ProseMirror JSON as durable SoT is **not decided** here
(shortlist Q3). Architecture requires one SoT + export
(`architecture.md`). Recommendation: store TipTap/ProseMirror JSON
**or** markdown with a single canonical serializer — choose in a
follow-on ADR or Implementer PoC after `@user` preference.

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

**Decision (proposed):** **PostgreSQL** as the system of record for
tenants, notes/versions, jobs, and (initially) vectors via extension.

**Drivers**

- Multi-tenant isolation research centers on Postgres app scoping and
  RLS (`03-multi-tenant-isolation.md`).
- pgvector co-location option reduces dual-write early (`04-vector-storage.md`).
- Portfolio self-host and managed Postgres both available (`07`).

**Alternatives considered**

| Option | Why not |
|--------|---------|
| MySQL / MariaDB | Weaker fit for documented RLS + pgvector path in Wave B evidence set (not shortlisted). |
| SQLite | Fine for single-tenant mocks; insufficient as multi-tenant production SoT for this scope. |
| Serverless-only proprietary stores | Lock-in without evidence advantage for notes + RLS story. |

**Tenancy mechanism (proposed default)**

Shared schema + `tenant_id` **and** Postgres RLS with a non-owner,
non-`BYPASSRLS` role (`03`, shortlist). App filters remain mandatory;
RLS is defense-in-depth. Schema-per-tenant deferred unless year-1
tenant/ops gates demand it (open question Q1).

**Consequences**

- Liked: one operational mental model; SQL tenant filters.
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

**Decision (proposed):** **Postgres + pgvector** as the default vector
store for Phase 1, behind the vector-search port.

**Drivers**

- One datastore for notes + vectors; SQL tenant filters; HNSW/IVFFlat
  documented; iterative scans ≥0.8 for filtered ANN
  (`04-vector-storage.md`, `00-evidence-matrix.md`).
- Aligns with portfolio/self-host narrative options (`07`, shortlist).
- Store choice never removes tenant filter requirement (`04`).

**Alternatives considered**

| Option | Why not primary now |
|--------|---------------------|
| Qdrant | Strong filtered search + self-host (`04`); lost as default because second system + consistency/outbox cost before scale evidence (Q1 open). Escalate if pgvector filter/recall fails eval. |
| Weaviate | Hybrid + MT features (`04`); managed minimums may blow budget (`04`, shortlist) — blocked on budget/self-host gates. |
| Pinecone | Managed convenience (`04`); **no self-host**; namespace soft isolation (`04`) — reject as default while self-host gate open; incompatible if `@user` mandates self-host vectors. |

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

**Conditional on `@user`:** if self-host is mandatory for vectors, this
recommendation strengthens; if managed-only Pinecone-class is required,
**reject this ADR section** and rewrite — do not silently adopt Pinecone.

---

### 5. Embedding and LLM provider posture (including BYOK)

**Decision (proposed):**

1. **Ports-first, mock-first** until production AI gate closes.
2. **Operator-owned provider keys** in server secret storage for early
   demos/production — **not** customer BYOK in v1 unless `@user` says
   yes.
3. **Default provider pairing (when activated):** OpenAI
   `text-embedding-3-small` (or current small embedding) for embeddings
   + **Anthropic Claude API** *or* OpenAI Chat Completions for answers —
   both behind ports; exact LLM pick at activation time by price/quality
   re-fetch.
4. **Forbid** OpenAI Assistants / hosted `vector_stores` as corpus SoT
   (ZDR-ineligible / lock-in — `05-embedding-llm-providers.md`).
5. **BYOK:** architecture-ready vault patterns only; product scope =
   **later** unless gate says yes now.

**Drivers**

- UI must not call providers; CORS/ZDR notes reinforce backend proxy
  (`05` Anthropic CORS note).
- Embeddings are cheap vs LLM tokens (`05`); LLM dominates Ask cost.
- OpenAI embeddings documented ZDR-eligible; default abuse retention
  still up to 30 days without sales ZDR (`05`).
- Assistants/vector_stores not ZDR eligible (`05`) — conflicts with
  data-ownership narrative if over-claimed.

**Alternatives considered**

| Option | Why not default |
|--------|-----------------|
| Voyage/Cohere embeddings + Anthropic/Gemini | Valid specialist path (`05`, shortlist); lost as default to reduce multi-vendor ops until budget/privacy gates settle. Keep swap-ready via ports. |
| Customer BYOK in v1 | Fits ownership narrative (`05`); lost until secret UX, abuse liability, billing complexity answered (`@user` gate). |
| Free AI Studio / consumer chat terms | Explicitly non-equivalent to paid API terms (`05`, shortlist). |

**Consequences**

- Liked: portable ports; mock Ask for experience-first (REC-08).
- Disliked: without formal ZDR, honest marketing must admit default
  abuse-log retention (`05`) — do not claim zero-retention casually.
- Disliked: dual-vendor (OpenAI embed + Anthropic LLM) possible ops
  overhead if that pairing is chosen at activation.

**Migration / rollback**

- Store model ids with embeddings; never mix incompatible vectors.
- Swap LLM adapter without UI change; re-eval citation/refusal behavior.

**Security / privacy**

- Keys never in repo/client; prompt construction treats notes as
  untrusted evidence (ai-content-safety).
- BYOK if later: vault, rotation, revoke; no key in logs.

**Verification**

- Mock Ask fixtures include refusal/partial before any live key.
- Production activation checklist: retention mode of the **actual**
  account, no Assistants corpus, tenant filters on chunks sent to model.
- Falsify if `@user` requires customer BYOK or contractual ZDR before
  any live demo — then demos stay mock-only.

---

### 6. Auth / identity

**Decision (proposed):** **Better Auth** (self-hosted TypeScript library)
with the **organization plugin** for workspace membership/RBAC.

**Drivers**

- First-class org plugin (members, invites, roles) documented
  (`06-auth-identity.md`).
- Self-host aligns with optional portfolio narrative; software free;
  sessions/DB app-owned (`06`, shortlist).
- Avoids SMS product flows (out of scope) and keeps org context
  server-side (`06` checklist).

**Alternatives considered**

| Option | Why not primary |
|--------|-----------------|
| Clerk | Fast org UX; Hobby tier (`06`); lost on managed lock-in, residency uncertainty, and SSO/B2B add-on cost cliffs (`06`) while self-host and SSO gates are open. **Fallback** if `@user` prefers managed auth and accepts sub-processor. |
| Keycloak | Full IdP (`06`); lost on ops burden for solo/portfolio (`06`, shortlist) unless enterprise SSO year-1 is mandatory. |
| Auth.js alone | Viable DIY (`06`); lost because org/RBAC is push-to-project — treat as style under Better Auth, not equal product. |

**Consequences**

- Liked: portable schema; org model fits tenancy port.
- Disliked: project owns security ops/maturity risk (`06`); must
  implement cookie flags, rotation, invite abuse controls explicitly.

**Migration / rollback**

- Identity port abstracts sessions; migrate to Clerk/Keycloak later via
  adapter + session invalidation window.
- Rollback risk: user password hashes / IdP subjects — plan export.

**Security / privacy**

- IDOR tests: user A token + user B org selector → 403 (`06` PoC plan).
- No client-trusted `orgId` authority (`architecture.md`).

**Verification**

- PoC invite + role-gated note list; logout revoke; session flags.
- Falsify if `@user` requires managed IdP or year-1 enterprise SSO
  without accepting Keycloak ops — then switch recommendation to Clerk
  or Keycloak explicitly.

**Conditional:** Enterprise SSO year-1 gate may force Keycloak or Clerk
B2B — **do not accept this section until that gate is answered** if SSO
is in-scope for year-1.

---

### 7. Hosting / deployment

**Decision (proposed):** **Railway** (primary) or **Render** (equivalent
shape) for web + worker + Postgres co-location; region chosen after
data-region gate.

**Drivers**

- OmniDoc workload needs long-running ingestion/embed workers;
  serverless-only platforms conflict unless jobs externalized
  (`07-hosting-deployment.md`).
- Railway/Render explicitly fit web + worker + DB (`07`, shortlist).
- Always-on demo vs sleep: Render free sleep called out as demo risk
  (`07`) — prefer paid always-on if demos matter (open Q6).

**Alternatives considered**

| Option | Why not primary |
|--------|-----------------|
| Vercel + external DB + external worker | Best Next DX (`07`); lost as default because split-brain jobs + function limits (`07`) and this ADR proposes RR7 not Next. Reopen with Next fallback. |
| Fly.io | Capable (`07`); more knobs for solo maintainer. |
| Cloudflare Workers/Pages | Edge/static strengths (`07`); Node/Postgres worker patterns may need redesign. |
| Self-host VPS/Docker | Max residency/narrative (`07`); lost as **default** due to uptime/ops credibility risk for solo portfolio — **elevate to primary** if `@user` mandates self-host app. |

**Consequences**

- Liked: one project for API + worker + DB; matches ingestion shape.
- Disliked: usage-cost unpredictability (`07`); still own backups unless
  external managed DB.

**Migration / rollback**

- Containerize web/worker early; avoid proprietary platform bindings in
  app code.
- Rollback to VPS: same images; to Vercel: only if UI is Next and workers
  stay external.

**Security / privacy**

- Record snapshot region + provider processing regions honestly
  (`07`); do not claim “data stays in VPC” on shared PaaS.

**Verification**

- Deploy web + worker + Postgres; run mock embed job > request timeout;
  confirm demo Ask path under always-on plan if gate requires it.
- Falsify if monthly budget cannot sustain PaaS — fall back to VPS.

---

## Summary table (proposed)

| Category | Proposed choice |
|----------|-----------------|
| Frontend | React Router 7 Framework Mode |
| Editor | TipTap (ProseMirror); CodeMirror for fenced code |
| Database | PostgreSQL (+ app scope + RLS defense-in-depth) |
| Vector | pgvector in Postgres |
| Embedding/LLM | Ports + mocks first; operator keys; OpenAI embeddings; Anthropic or OpenAI LLM at activation; no Assistants vector_store SoT; BYOK later |
| Auth | Better Auth + organization plugin |
| Hosting | Railway (or Render); VPS if self-host mandated |

---

## `@user` gates that block acceptance

These remain **open**. Accepting ADR-0001 without answering them either
requires explicit `@user` waiver or leaves the related section
conditional.

### From Researcher

1. Monthly budget ceiling (infra + AI)
2. Self-host vs managed preference (app, auth, vectors) — may flip
   auth/hosting/vector sections
3. Privacy / zero-data-retention ambition vs standard abuse retention
4. Customer BYOK: yes / no / **later** (this ADR assumes later)
5. Data region preference (none / US / EU)
6. Enterprise SSO in year one (may force Keycloak/Clerk B2B)
7. **ADR-0001 acceptance** itself

### From UX Researcher

8. Mock-only deterministic Ask vs live provider for demos
9. Public sample workspace vs local-only fixtures
10. UT-1…UT-14 remain unrun (user-validation open — not ADR blockers
    for *proposing* stack, but block claiming UX “validated”)

### Standing / ADR-added

11. RTL locale support — deferred, not closed
12. Production AI / provider activation — open
13. Year-1 tenant count / corpus size (affects RLS vs schema-per-tenant
    and pgvector ceiling)
14. Collaborative editing in v1? (editor collab path reserved only)
15. Markdown vs structured JSON as note SoT
16. Always-on demo hosting required?
17. React-only vs openness to Svelte (this ADR assumes React)
18. Package manager preference (if any) — not selected by research

---

## What this ADR does not do

- Does not mark itself `accepted`
- Does not authorize `package.json` scaffolding
- Does not activate production providers
- Does not treat UT-* as findings
- Does not invent legal/compliance certification
- Does not rewrite `docs/frontend/README.md` (Implementer reconciles
  after acceptance if needed)

## References

- `docs/research/technical/00-evidence-matrix.md`
- `docs/research/technical/01-frontend-frameworks.md` …
  `07-hosting-deployment.md`
- `docs/research/technical/08-candidate-shortlist.md`
- `docs/research/ux/02-citation-trust.md`
- `docs/research/ux/08-design-facing-recommendations.md`
- `architecture.md`
- `docs/frontend/README.md`
