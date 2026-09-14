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

**Phase 1 — Scaffold, visual system, mock journeys**

Goal: Nx workspace + design system + core journeys on deterministic
mocks, with dual-mode BYOK ports wired but production adapters dark.
Hosted AWS Free-tier deploy and live OpenRouter stay later increments.

## Current Status

- Phase 0 complete: verification **PASS**; Task 0.7 gates answered;
  Wave C evidence (0.8 / 0.8b); ADR-0001 §1–§7 and ADR-0004 `accepted`
- **Active:** Task **1.1** `/designer` (main) visual system + journey
  specs; Task **1.2** `/implementer` (parallel) Nx scaffold + boundary
  enforcement
- Scaffolding is **now authorized** by Task 1.2 (not before)
- Production AI / OpenRouter live calls are **not** authorized
- Nothing was scaffolded before Task 1.2; no secrets in the repo

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

| Task | Owner | Status | Handoff |
|------|-------|--------|---------|
| 0.1–0.9 | (see archive) | completed | `docs/handoffs/archive/` |
| 1.1 Visual system + journey UI specs | Designer | ready | `docs/handoffs/current.md` |
| 1.2 Nx workspace scaffold | Implementer | ready | `docs/handoffs/active/phase-1-task-1-2-implementer.md` |

### Phase 1 program of record (downstream; not all opened)

1. Designer visual system (1.1 — open)
2. Implementer Nx scaffold (1.2 — open)
3. Auth + honest workspaces (Better Auth)
4. Notes + TipTap + JSON SoT
5. Postgres + RLS + pgvector with mock embed/vector adapters
6. Ask UI on deterministic mocks
7. Public labelled sample workspace
8. BYOK vault + cookbook/wizard + usage shells (adapters dark)
9. AWS Free Tier deploy path for the 6-month hosted demo
10. Production AI activation only after CX-first + `@user` / Phase Check

Each later increment: Implementer → Phase Check. Commander opens one to
three tasks per cycle after 1.1 + 1.2 land.

## Blockers

- Production AI/provider activation remains gated (mock-first CX)
- RTL locale support remains deferred, not closed
- AWS deploy and live OpenRouter are not in Tasks 1.1/1.2
- TipTap / Better Auth / Postgres implementation wait for later
  increments after scaffold + specs

## Open Gates

**Closed 2026-09-14**

- ADR-0001 all seven categories; ADR-0004 dual-mode BYOK
- Budget, self-host preference, 30-day retention, BYOK v1, data region
  none, no year-1 SSO, minimal tenants, collab much later, 6-month AWS
  Free Tier window, mock-first then labelled live, public sample workspace
- Nx Cloud remains local-cache-only

**Still open / standing**

- **RTL locale support** — deferred, not closed
- **Production AI / provider activation** — open until CX-first mock
  validation
- UT-1…UT-22 — unrun hypotheses (0.8b added UT-15…22)
- Exact AWS Free-plan service graph / credit-burn PoC — later increment
- Nx `@nx/next` generator vs Next 16.3.5 — Task 1.2 PoC

## Active Handoffs

- Main track: `docs/handoffs/current.md` → `/designer` (Task 1.1)
- Parallel: `docs/handoffs/active/phase-1-task-1-2-implementer.md` →
  `/implementer` (Task 1.2)
