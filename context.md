# OmniDoc — Live Context

## Project Identity

| Field | Value |
|-------|-------|
| Name | OmniDoc |
| Slug | `omni-doc` |
| Domain | Multi-tenant AI/RAG note and knowledge SaaS |
| Platform | Frontend TypeScript (Next.js) — ADR-0001 §1–§5, §7 `accepted`; ADR-0003/0004 `accepted`. **Backend application stack reopened** 2026-09-15 (`@user`): Node API declined; Java/Spring candidate pending ADR-0005. ADR-0001 §6 and ADR-0002 `apps/api` Node assumption are in close-out. |
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

**Backend Stack Close-out + Design close-out (D-01)**

Goal: finish visual specs (D-01) in parallel with **R-BE → A-BE →
U-BE** so the API language is decided **before** any backend scaffold.
Do **not** scaffold Node `apps/api`. After `@user` accepts ADR-0005,
Commander splits S-01 into S-01a (FE Nx) + S-01b (Java API) and
backend B-* may start. Dual-mode BYOK ports stay; production adapters
dark. Hosted AWS and live OpenRouter remain DevOps / Phase 3–4.

Program of record:
[`docs/planning/implementation-tracks.md`](docs/planning/implementation-tracks.md).

## Current Status

- Phase 0 complete: verification **PASS**; Task 0.7 gates answered;
  Wave C evidence (0.8 / 0.8b); ADR-0001 §1–§5, §7 and ADR-0004 `accepted`
- **2026-09-14:** serial Implementer loop superseded. Two-developer tracks
  are the plan of record
- **2026-09-15:** `@user` reopened backend language (no Node.js API;
  Java Spring Boot preferred). **S-01 archived `blocked`** before
  execution (Node `apps/api` must not be scaffolded). See
  `docs/handoffs/archive/H-2026-09-15-P1-S01-commander-implementer.md`
- **Active:** **D-01** `/designer` (`lane: frontend`); **U-BE** `@user`
  (`lane: shared`) accept/reject ADR-0005. R-BE and A-BE completed.
- Scaffolding of `apps/api` is **not** authorized until ADR-0005 is
  `accepted`. S-01a/S-01b stay listed until U-BE
- Production AI / OpenRouter live calls are **not** authorized
- Nothing is scaffolded yet; no secrets in the repo
- DevOps I-* remain **unassigned** (split later); local Compose Postgres
  is Backend-owned (B-02) after the ADR

### Accepted stack (do not re-open except as noted)

| ADR | Decision |
|-----|----------|
| ADR-0001 §1 | Next.js 16.3.5 App Router |
| ADR-0001 §2 | TipTap 3.31.3; ProseMirror JSON SoT |
| ADR-0001 §3 | PostgreSQL 18; shared schema + app scope + RLS DiD |
| ADR-0001 §4 | pgvector in Postgres |
| ADR-0001 §5 + ADR-0004 | Mocks first; OpenRouter operator free-tier gateway; customer BYOK v1; dual-mode; usage port; no Assistants/`vector_stores` SoT |
| ADR-0001 §6 | **Reopened 2026-09-15.** Better Auth 1.7.4 + org plugin remains the *recorded* 2026-09-14 choice; unfit as a Java identity implementation. Disposition via ADR-0005 + `@user` |
| ADR-0001 §7 | AWS Free-plan topology class: EC2 and/or ECS + RDS Postgres + pgvector; 6-month window in-scope; VPS fallback only if AWS cannot cover; Railway/Render not default |
| ADR-0002 | Nx 23.2.1, pnpm 12.4.1, Node 24 for **frontend** graph. **`apps/api` as Node + TS `packages/domain` SoT reopened** 2026-09-15 (ADR-0005) |
| ADR-0003 | Tailwind 4.3.3 + shadcn/ui on Base UI; RSC + Server Actions; Vitest/Playwright/axe/MSW/Storybook |
| ADR-0005 | `proposed` — [ADR-0005](docs/adr/ADR-0005-backend-application-stack.md); `@user` U-BE |

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
| S-01 Nx workspace (Node `apps/api`) | shared | Implementer | **blocked** (superseded before execution) | `docs/handoffs/archive/H-2026-09-15-P1-S01-commander-implementer.md` |
| R-BE Backend stack evidence | shared | Researcher | completed | `docs/handoffs/archive/H-2026-09-15-P0B-RBE-commander-researcher.md` |
| A-BE ADR-0005 proposed | shared | Architect | completed | `docs/handoffs/archive/H-2026-09-15-P0B-ABE-commander-architect.md` |
| U-BE Accept ADR-0005 | shared | `@user` | ready | `docs/handoffs/active/phase-0b-task-u-be-user.md` |

Full F-01…F-11, B-01…B-12, S-02, S-03, I-01…I-09 lists:
[`docs/planning/implementation-tracks.md`](docs/planning/implementation-tracks.md).
Commander opens the next **live** handoff per lane when dependencies
land. Do not treat unopened IDs as unplanned.

## Blockers

- Production AI/provider activation remains gated (mock-first CX)
- RTL locale support remains deferred, not closed
- **Backend application stack** — R-BE / ADR-0005 / U-BE; B-* and S-01b
  must not start on TypeScript ports or Better Auth
- F-01 waits on D-01 + **S-01a** (after U-BE); B-01 waits on **S-01b**
- AWS deploy and live OpenRouter are I-* / Phase 3–4 — not D-01/R-BE
- DevOps I-* have no human owner yet

## Open Gates

**Closed 2026-09-14**

- ADR-0001 §1–§5 and §7; ADR-0004 dual-mode BYOK
- Budget, self-host preference, 30-day retention, BYOK v1, data region
  none, no year-1 SSO, minimal tenants, collab much later, 6-month AWS
  Free Tier window, mock-first then labelled live, public sample workspace
- Nx Cloud remains local-cache-only
- Two-developer track model accepted (serial Implementer loop superseded)

**Reopened 2026-09-15**

- ADR-0001 §6 Better Auth implementation (identity **port** stays)
- ADR-0002 Node `apps/api` / TS domain SoT

**Still open / standing**

- **RTL locale support** — deferred, not closed
- **Production AI / provider activation** — open until CX-first mock
  validation
- **Backend application stack (ADR-0005)** — `@user` U-BE after A-BE
- UT-1…UT-22 — unrun hypotheses (0.8b added UT-15…22)
- Exact AWS Free-plan service graph / credit-burn PoC — I-03 (unassigned)
- Nx `@nx/next` generator vs Next 16.3.5 — S-01a PoC (after U-BE)
- DevOps I-* human split — later

## Active Handoffs

- Main track: `docs/handoffs/current.md` → `/designer` (D-01, `lane: frontend`)
- Parallel: `docs/handoffs/active/phase-0b-task-u-be-user.md` →
  `@user` (U-BE, `lane: shared`)
