---
handoff_id: H-2026-09-13-P0-T07
affinity: decision-gate
track: main
status: in-progress
phase: "0"
task: "0.7"
from: phase-check
to: user
created: 2026-09-13
answered: 2026-09-14
---

# Phase 0 — Task 0.7 `@user` ADR-0001 Decision Gate

> **Status 2026-09-14: PARTIALLY ANSWERED.** `@user` settled the
> frontend stack during research review. Recorded in
> `docs/adr/ADR-0001-frontend-and-platform-stack.md` §Decision record,
> `docs/adr/ADR-0002-workspace-and-tooling.md`,
> `docs/adr/ADR-0003-frontend-application-toolchain.md`, and
> `docs/research/version-ledger.md`. **The gate table and gates 2–5
> below are still live** — categories 3–7 of ADR-0001 remain
> `proposed`, and the product/legal/budget gates are unanswered.
>
> Answered on 2026-09-14: framework → **Next.js 16.3.5** (was React
> Router 7 in the proposal); editor → **TipTap 3.31.3**; note source of
> truth → **ProseMirror JSON** with markdown export; monorepo →
> **Nx 23.2.1** with `apps/` + `packages/`; package manager →
> **pnpm 12.4.1**; React-only (Svelte closed); styling/components →
> **Tailwind 4.3.3 + shadcn/ui 4.21.0 on Base UI 1.8.0**; data/state →
> **RSC + Server Actions + Zustand 5.0.15**; testing → **Vitest 5 +
> Testing Library 16.3.3 + Playwright 1.63 + axe 4.13 + MSW 2.15 +
> Storybook 10.6**; runtime → **Node 24 LTS**.
>
> `/commander` owns rolling this handoff forward into the next
> main-track task.

## Start Command

```text
@user Read docs/handoffs/current.md. Decide ADR-0001 (accept / reject / amend, per category) and answer the listed open gates. The frontend contributor track in docs/frontend/README.md is already unblocked and does not require this decision to begin.
```

## Objective

Owner: **`@user`**

Phase 0 passed independent verification
(`docs/reviews/phase-0-verification.md`, Phase Decision: **PASS**).
`ADR-0001` (`status: accepted (partial)` since 2026-09-14) is ready for
your decision on the remaining categories. This handoff
exists to get your accept / reject / amend answer per category and your
answers to the open product/legal/budget gates so `/commander` can
re-plan Phase 1 with `/designer` and `/implementer`.

**Nothing below is decided yet. Nothing is scaffolded. No stack exists
in code.**

## Required Reading (optional but recommended before deciding)

1. `docs/adr/ADR-0001-frontend-and-platform-stack.md` — full proposal
   with drivers, alternatives, consequences, and citations
2. `docs/reviews/phase-0-verification.md` — independent verification
   (what was checked, what passed; DEF-001 / DEF-002 closed on re-verify)
3. `context.md` — live status and open gates
4. `architecture.md` — boundaries these choices sit behind (ports,
   tenant isolation, threat/safety, RAG-evaluation bar)

You do not need to read the underlying research files unless you want
the primary evidence; ADR-0001 summarizes and cites them per category.

## What was verified (do not re-litigate; re-open only if you disagree)

- No stack is scaffolded; no `package.json`; no secrets in the repo
- No vendor was selected by either research stream; ADR-0001 correctly
  says `proposed`, never `accepted`
- Handoff ledger integrity, evidence counts (20 cited findings / 22
  competitor observations / 14 unrun hypotheses / 12 recommendations),
  and the architecture/ADR-0001 package all independently re-verified
  against on-disk evidence — see the report for the full results table
- Phase 0 verification returned **PASS**. Two documentation defects
  found during verification (**DEF-001** Medium `/implementer`;
  **DEF-002** Low `/commander`) were remediated and independently
  re-verified as **closed**. Phase 0 exits with **zero open defects**.
  Cosmetic handoff-text refresh for this status note (DEF-003) does not
  affect your ADR-0001 decision.
- Product name is **OmniDoc** (slug `omni-doc`), confirmed by `@user`.
  Archived Phase 0 handoffs may still say "OmniNote" — that was the
  pre-correction inferred name; see `docs/handoffs/archive/README.md`.

## Decisions you are asked to make

### 1. ADR-0001 — accept / reject / amend, per category

| # | Category | Architect's proposed choice (still just a proposal) | Primary tradeoff you are accepting if you approve |
|---|----------|-------------------------------------------------------|------------------------------------------------------|
| 1 | Frontend framework | **Next.js 16.3.5** (App Router) — *answered 2026-09-14; the proposal was React Router 7* | Accepted on portfolio-recognizability grounds; React canary coupling is an accepted, documented cost |
| 2 | Rich-text editor | **TipTap 3.31.3** (ProseMirror) + CodeMirror 6 for fenced code; **ProseMirror JSON as note source of truth** — *answered 2026-09-14* | MIT + `textDirection` API; accessibility chrome is DIY and now app-owned; markdown is export/chunking only |
| 3 | Relational database | **PostgreSQL** (shared schema + app scoping + RLS defense-in-depth) | One operational system; RLS footguns (owner/pool bypass) must be actively guarded against |
| 4 | Vector storage | **pgvector** in Postgres | Operational simplicity now; ANN+filter tuning and re-embed cost on model change; escalate to Qdrant only if eval fails |
| 5 | Embedding / LLM posture | **Ports + mocks first**; operator-owned keys; OpenAI embeddings; Anthropic or OpenAI LLM at activation; **no** Assistants/`vector_stores` as corpus SoT; customer BYOK **later** | Standard ~30-day abuse-log retention unless you separately pursue sales-gated ZDR — do not let marketing imply zero-retention by default |
| 6 | Auth / identity | **Better Auth** + organization plugin (self-hosted) | You own security ops/maturity risk; strong if self-host narrative matters to you; **reopens to Clerk/Keycloak if you require year-1 enterprise SSO** |
| 7 | Hosting | **Railway** (or Render); VPS if you mandate self-host | Usage-cost unpredictability vs PaaS convenience; Render free tier sleeps — bad for live demos unless paid always-on |

You may accept all seven, reject/amend any subset, or send it back to
`/architect` with specific objections. Partial acceptance is valid — e.g.
accept 1–4 and 7, hold 5–6 pending your BYOK/SSO answers below.

### 2. Open gates (Researcher-surfaced)

- Monthly budget ceiling (infra + AI)?
- Self-host vs managed preference (app, auth, vectors)? — may flip the
  auth/hosting/vector recommendations above
- Privacy / zero-data-retention ambition, or accept standard ~30-day
  abuse-log retention?
- Customer BYOK: yes / no / **later** (ADR-0001 assumes later)?
- Data region preference (none / US / EU)?
- Enterprise SSO required in year one? (forces Keycloak or Clerk B2B if
  yes — reopens the auth recommendation)

### 3. Open gates (UX-Researcher-surfaced)

- Demos: mock-only deterministic Ask, or a live provider? (experience-
  first default prefers validated mocks before any production AI)
- Public sample workspace for portfolio demos, or local-only fixtures?
- UT-1…UT-14 remain **unrun hypotheses** — no action required now; they
  do not block ADR-0001, only "validated UX" claims later

### 4. Open gates (ADR-0001-added decision inputs)

- Year-1 tenant count / corpus size? (affects RLS vs schema-per-tenant,
  pgvector ceiling)
- Real-time collaborative editing in v1, later, or never?
- Note source of truth: markdown vs structured (ProseMirror/TipTap) JSON?
- Always-on demo hosting required (no cold starts), or is sleep/cold-start
  acceptable?
- Are you open to Svelte, or is this React-only? (ADR-0001 assumes React)
- Package manager preference (npm / pnpm / yarn), if any — research did
  not evaluate this; Implementer will choose after acceptance if you have
  no preference

### 5. Standing (do not close without explicit reason)

- **RTL locale support** — remains deferred, not closed. Say so
  explicitly if you want it to stay deferred, or tell us if you want to
  bring it forward.
- **Production AI / provider activation** — remains open until the
  Customer Experience First validation (mock-first premium UX) is done.

## What is already unblocked (no need to wait for this decision)

A human frontend contributor can start today per
`docs/frontend/README.md` §"What you can start today": reviewing the
onboarding pack, drafting API contract shapes, assembling a deterministic
fixture-corpus outline, drafting an accessibility checklist per journey
(a first pass now exists at `quality/ui-qa-checklist.md` — treat it as a
starting point, not final), collecting design-token input, and
enumerating UI states per journey. None of this requires a chosen stack.

## What happens next (informational — do not act on this yet)

Once you answer the above:

1. `/commander` re-plans Phase 1 with `/designer` (visual system from
   accepted UX research + accepted architecture) and `/implementer`
   (construction behind the now-accepted ports), scoped to whichever
   ADR-0001 categories you accepted.
2. Any category you rejected or amended returns to `/architect` for a
   revised ADR-0001 section (numbered as a new ADR if the decision theme
   changes materially) before Phase 1 work in that area begins.
3. DEF-001 and DEF-002 are already closed (remediated + re-verified);
   they do not gate this decision or Phase 1 planning. See
   `docs/reviews/phase-0-verification.md`.
4. Production AI/provider activation and RTL locale shipping stay gated
   regardless of your ADR-0001 answer, pending their own separate
   confirmations.

## Constraints

- This handoff does not authorize any commit or push. Repository
  initialization / remote creation is a separate action you control.
- No agent may treat your silence as acceptance. If you do not answer a
  gate, `/commander` must keep it open in the next `context.md` update
  rather than assume a default.

## Acceptance Criteria (for this handoff to be considered resolved)

- [ ] You have stated accept / reject / amend for each of the 7 ADR-0001
      categories (or explicitly deferred a subset with a reason)
- [ ] You have answered (or explicitly deferred) each gate in sections
      2–5 above
- [ ] `/commander` receives your answers as the next main-track handoff
      input and re-plans Phase 1 accordingly

## Gates

All gates listed in sections 2–5 above, plus ADR-0001 acceptance itself,
remain **open** until you answer them here.
