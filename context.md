# OmniDoc — Live Context

## Project Identity

| Field | Value |
|-------|-------|
| Name | OmniDoc |
| Slug | `omni-doc` |
| Domain | Multi-tenant AI/RAG note and knowledge SaaS |
| Platform | TypeScript web SaaS — ADR-0001 §1–§7 `accepted`; ADR-0002/0003/0004 `accepted` |
| Primary locale | `en` (LTR) |
| Secondary locale | None |
| Target market | Global English-speaking |
| Business context | Portfolio / freelancing credibility product — production quality; **no** commerce, payments, shipping, or SMS. **6-month** hosted-demo horizon on AWS Free Tier. |

**Identity note (2026-09-13):** Canonical name **OmniDoc** was confirmed by
`@user`. Archived Phase 0 handoffs may still say OmniNote — see
`docs/handoffs/archive/README.md`.

CMS/commerce platform concepts are not applicable. See
`TEMPLATE-PLACEHOLDERS.md`.

## Customer Experience First

Validate a premium capture → organize → retrieve → ask-your-notes
experience with realistic mocks before production AI/provider activation.

Validate at minimum:

- Core note/knowledge journeys and citation trust
- Primary locale `en` (LTR); RTL deferred (not closed) with RTL-readiness
  discipline required
- Mobile usability
- Accessibility (focus, keyboard, labels, reduced motion, contrast)

## Current Phase

**Design close-out + Phase 1 Build (two lanes)**

Goal: finish visual specs (D-01), scaffold the Nx workspace (S-01),
then implement core journeys on deterministic mocks in parallel
**frontend** and **backend** lanes. Dual-mode BYOK ports wired;
production adapters dark. Hosted AWS and live OpenRouter are DevOps /
Phase 3–4 — **not** on the Phase 1 critical path.

Program of record:
[`docs/planning/implementation-tracks.md`](docs/planning/implementation-tracks.md).

## Current Status

- Phase 0 complete: verification **PASS**; Task 0.7 gates answered;
  Wave C evidence (0.8 / 0.8b); ADR-0001 §1–§7 and ADR-0004 `accepted`
- **2026-09-14:** serial Implementer loop (old 1.1 → 1.2 → 1.3…10)
  superseded. Two-developer tracks are the plan of record
- **Active:** **D-01** `/designer` (`lane: frontend`) visual system +
  journey specs; **S-01** `/implementer` (`lane: shared`, recommended
  Backend) Nx scaffold + boundary CI
- Scaffolding is **authorized** by S-01 (not before). S-01 does **not**
  include full ports (B-01), OpenAPI (S-02), or the §9 mock corpus (S-03)
- Production AI / OpenRouter live calls are **not** authorized
- Nothing is scaffolded yet; no secrets in the repo
- DevOps I-* remain **unassigned** (split later); local Compose Postgres
  is Backend-owned (B-02)

### Accepted stack (do not re-open)

| ADR | Decision |
|-----|----------|
| ADR-0001 §1 | Next.js 16.3.5 App Router |
| ADR-0001 §2 | TipTap 3.31.3; ProseMirror JSON SoT |
| ADR-0001 §3 | PostgreSQL 18; shared schema + app scope + RLS DiD |
| ADR-0001 §4 | pgvector in Postgres |
| ADR-0001 §5 + ADR-0004 | Mocks first; OpenRouter operator free-tier gateway; customer BYOK v1; dual-mode; usage port; no Assistants/`vector_stores` SoT |
| ADR-0001 §6 | Better Auth + organization plugin; year-1 SSO not required |
| ADR-0001 §7 | AWS Free-plan topology class: EC2 and/or ECS + RDS Postgres + pgvector; 6-month window in-scope; VPS fallback only if AWS cannot cover; Railway/Render not default |
| ADR-0002 | Nx 23.2.1, pnpm 12.4.1, Node 24, `apps/` + `packages/`, boundary tags |
| ADR-0003 | Tailwind 4.3.3 + shadcn/ui on Base UI; RSC + Server Actions; Vitest/Playwright/axe/MSW/Storybook |

### Wave B + C evidence (do not rewrite as selection)

| Stream | Path |
|--------|------|
| Technical | `docs/research/technical/` (Wave C amended 05, 07, 09) |
| UX | `docs/research/ux/` (0.8b added 09 + REC-13…19) |

## Active Tasks

| Task | Lane | Owner | Status | Handoff |
|------|------|-------|--------|---------|
| 0.1–0.9 | — | (see archive) | completed | `docs/handoffs/archive/` |
| D-01 Visual system + journey UI specs | frontend | Designer | ready | `docs/handoffs/current.md` |
| S-01 Nx workspace + boundary CI | shared (recommended Backend) | Implementer | ready | `docs/handoffs/active/phase-1-task-s-01-implementer.md` |

Full F-01…F-11, B-01…B-12, S-02, S-03, I-01…I-09 lists:
[`docs/planning/implementation-tracks.md`](docs/planning/implementation-tracks.md).
Commander opens the next **live** handoff per lane when dependencies
land. Do not treat unopened IDs as unplanned.

## Blockers

- Production AI/provider activation remains gated (mock-first CX)
- RTL locale support remains deferred, not closed
- F-01 waits on D-01 + S-01; B-01 waits only on S-01 (not design)
- AWS deploy and live OpenRouter are I-* / Phase 3–4 — not D-01/S-01
- DevOps I-* have no human owner yet

## Open Gates

**Closed 2026-09-14**

- ADR-0001 all seven categories; ADR-0004 dual-mode BYOK
- Budget, self-host preference, 30-day retention, BYOK v1, data region
  none, no year-1 SSO, minimal tenants, collab much later, 6-month AWS
  Free Tier window, mock-first then labelled live, public sample workspace
- Nx Cloud remains local-cache-only
- Two-developer track model accepted (serial Implementer loop superseded)

**Still open / standing**

- **RTL locale support** — deferred, not closed
- **Production AI / provider activation** — open until CX-first mock
  validation
- UT-1…UT-22 — unrun hypotheses (0.8b added UT-15…22)
- Exact AWS Free-plan service graph / credit-burn PoC — I-03 (unassigned)
- Nx `@nx/next` generator vs Next 16.3.5 — S-01 PoC
- DevOps I-* human split — later

## Active Handoffs

- Main track: `docs/handoffs/current.md` → `/designer` (D-01, `lane: frontend`)
- Parallel: `docs/handoffs/active/phase-1-task-s-01-implementer.md` →
  `/implementer` (S-01, `lane: shared`, recommended Backend)
