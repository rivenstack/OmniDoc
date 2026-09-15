# OmniDoc — Live Context

## Project Identity

| Field | Value |
|-------|-------|
| Name | OmniDoc |
| Slug | `omni-doc` |
| Domain | Multi-tenant AI/RAG note and knowledge SaaS |
| Platform | Frontend TypeScript (Next.js) — ADR-0001 §1–§5, §7 `accepted`; ADR-0003/0004 `accepted`. **Backend** Java 21 / Spring Boot 4.1.x — ADR-0005 `accepted` 2026-09-15. ADR-0001 §6 identity **port** stays; Better Auth library superseded. ADR-0002: `apps/api` JVM Gradle beside Nx. |
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

**Design close-out (D-01) + Phase 1 scaffolds (S-01a / S-01b)**

Goal: finish visual specs (D-01) while Implementers scaffold the
polyglot monorepo — **S-01a** FE Nx and **S-01b** Java API. Dual-mode
BYOK ports stay; production adapters dark. Hosted AWS and live
OpenRouter remain DevOps / Phase 3–4.

Program of record:
[`docs/planning/implementation-tracks.md`](docs/planning/implementation-tracks.md).

## Current Status

- Phase 0 complete: verification **PASS**; Task 0.7 gates answered;
  Wave C evidence (0.8 / 0.8b); ADR-0001 §1–§5, §7 and ADR-0004 `accepted`
- **2026-09-14:** serial Implementer loop superseded. Two-developer tracks
  are the plan of record
- **2026-09-15:** Backend Stack Close-out **complete** — U-BE
  accept-with-amendments → A-BE2 → ADR-0005 `accepted`
- **Active:** **D-01** `/designer` (`lane: frontend`); **S-01a**
  `/implementer` (`lane: shared`); **S-01b** `/implementer`
  (`lane: backend`)
- `/implementer` agent contract rewritten as lane-aware polyglot
  (Next.js + Java/Spring) — `.cursor` / `.github` / `.opencode` mirrors
- Production AI / OpenRouter live calls are **not** authorized
- Nothing is scaffolded yet; no secrets in the repo
- DevOps I-* remain **unassigned** (split later); local Compose Postgres
  is Backend-owned (B-02)

### Accepted stack (do not re-open except as noted)

| ADR | Decision |
|-----|----------|
| ADR-0001 §1 | Next.js 16.3.5 App Router |
| ADR-0001 §2 | TipTap 3.31.3; ProseMirror JSON SoT |
| ADR-0001 §3 | PostgreSQL 18; shared schema + app scope + RLS DiD |
| ADR-0001 §4 | pgvector in Postgres |
| ADR-0001 §5 + ADR-0004 | Mocks first; OpenRouter operator free-tier gateway; customer BYOK v1; dual-mode; usage port; no Assistants/`vector_stores` SoT |
| ADR-0001 §6 | Identity **port** stays; Better Auth **library** superseded by Spring Security sessions (ADR-0005) |
| ADR-0001 §7 | AWS Free-plan topology class: EC2 and/or ECS + RDS Postgres + pgvector; 6-month window in-scope; VPS fallback only if AWS cannot cover; Railway/Render not default |
| ADR-0002 | Nx 23.2.1, pnpm 12.4.1, Node 24 for **frontend** graph. `apps/api` = JVM Gradle beside Nx; TS `packages/domain` not backend SoT; ArchUnit for Java |
| ADR-0003 | Tailwind 4.3.3 + shadcn/ui on Base UI; RSC + Server Actions; Vitest/Playwright/axe/MSW/Storybook |
| ADR-0005 | `accepted` — Java 21 + Boot 4.1.x; Gradle; Option B; sessions; Spring AI adapters only; Log4j2; Spring Data JDBC + JdbcTemplate/pgvector-java + Flyway; Python not Phase 1. [ADR-0005](docs/adr/ADR-0005-backend-application-stack.md) |

### Wave B + C evidence (do not rewrite as selection)

| Stream | Path |
|--------|------|
| Technical | `docs/research/technical/` (Wave C 05/07/09; **R-BE** 10–15, 2026-09-15) |
| UX | `docs/research/ux/` (0.8b added 09 + REC-13…19) |

## Active Tasks

| Task | Lane | Owner | Status | Handoff |
|------|------|-------|--------|---------|
| 0.1–0.9 | — | (see archive) | completed | `docs/handoffs/archive/` |
| D-01 Visual system + journey UI specs | frontend | Designer | ready | `docs/handoffs/current.md` |
| S-01 Nx workspace (Node `apps/api`) | shared | Implementer | **blocked** (superseded) | `docs/handoffs/archive/H-2026-09-15-P1-S01-commander-implementer.md` |
| R-BE Backend stack evidence | shared | Researcher | completed | `docs/handoffs/archive/H-2026-09-15-P0B-RBE-commander-researcher.md` |
| A-BE ADR-0005 proposed | shared | Architect | completed | `docs/handoffs/archive/H-2026-09-15-P0B-ABE-commander-architect.md` |
| U-BE Accept ADR-0005 | shared | `@user` | completed | `docs/handoffs/archive/H-2026-09-15-P0B-UBE-commander-user.md` |
| A-BE2 Finalize ADR-0005 | shared | Architect | completed | `docs/handoffs/archive/H-2026-09-15-P0B-ABE2-commander-architect.md` |
| S-01a FE Nx + boundary CI | shared | Implementer | ready | `docs/handoffs/active/phase-1-task-s-01a-implementer.md` |
| S-01b Java API scaffold | backend | Implementer | ready | `docs/handoffs/active/phase-1-task-s-01b-implementer.md` |

Full F-01…F-11, B-01…B-12, S-02, S-03, I-01…I-09 lists:
[`docs/planning/implementation-tracks.md`](docs/planning/implementation-tracks.md).

## Blockers

- Production AI/provider activation remains gated (mock-first CX)
- RTL locale support remains deferred, not closed
- F-01 waits on D-01 + **S-01a**; B-01 waits on **S-01b**
- AWS deploy and live OpenRouter are I-* / Phase 3–4 — not D-01/S-01*
- DevOps I-* have no human owner yet

## Open Gates

**Closed 2026-09-14**

- ADR-0001 §1–§5 and §7; ADR-0004 dual-mode BYOK
- Budget, self-host preference, 30-day retention, BYOK v1, data region
  none, no year-1 SSO, minimal tenants, collab much later, 6-month AWS
  Free Tier window, mock-first then labelled live, public sample workspace
- Nx Cloud remains local-cache-only
- Two-developer track model accepted (serial Implementer loop superseded)

**Closed 2026-09-15 (A-BE2)**

- ADR-0001 §6 Better Auth **library** disposition → Spring Security
  sessions (ADR-0005)
- ADR-0002 Node `apps/api` / TS domain SoT → JVM Gradle + Java ports
- ADR-0005 backend application stack → `accepted`

**Still open / standing**

- **RTL locale support** — deferred, not closed
- **Production AI / provider activation** — open until CX-first mock
  validation
- UT-1…UT-22 — unrun hypotheses (0.8b added UT-15…22)
- Exact AWS Free-plan service graph / credit-burn PoC — I-03 (unassigned)
- Nx `@nx/next` generator vs Next 16.3.5 — S-01a PoC
- DevOps I-* human split — later

## Active Handoffs

- Main track: `docs/handoffs/current.md` → `/designer` (D-01, `lane: frontend`)
- Parallel: `docs/handoffs/active/phase-1-task-s-01a-implementer.md` →
  `/implementer` (S-01a, `lane: shared`)
- Parallel: `docs/handoffs/active/phase-1-task-s-01b-implementer.md` →
  `/implementer` (S-01b, `lane: backend`)
