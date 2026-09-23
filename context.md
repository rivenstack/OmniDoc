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

**Phase 1 Build — dual-lane implementation**

Goal: Front-end programmer owns F-*; back-end programmer owns B-* (and
backend-authored S-02/S-03). D-01 design close-out and S-01a/S-01b
scaffolds are **closed**. Dual-mode BYOK ports stay; production adapters
dark. Hosted AWS and live OpenRouter remain DevOps / Phase 3–4.

Program of record:
[`docs/planning/implementation-tracks.md`](docs/planning/implementation-tracks.md).

## Current Status

- Phase 0 complete: verification **PASS**; Task 0.7 gates answered;
  Wave C evidence (0.8 / 0.8b); ADR-0001 §1–§5, §7 and ADR-0004 `accepted`
- **2026-09-14:** serial Implementer loop superseded. Two-developer tracks
  are the plan of record
- **2026-09-15:** Backend Stack Close-out **complete** — U-BE
  accept-with-amendments → A-BE2 → ADR-0005 `accepted`
- **2026-09-16:** D-01 **Commander-accepted**; S-01a and S-01b **completed**
  and archived. Dual-lane heads opened: F-01 (FE) + B-01 (BE)
- **2026-09-17:** B-01 **Commander-validated PASS** and archived; backend
  lane advanced to **S-02**. F-01 remains live in parallel
- **2026-09-17:** S-02 **completed** and archived — canonical
  HTTP/OpenAPI/SSE contracts in `docs/api/` + `@omnidoc/contracts`.
  F-01 **completed** and archived (tokens + shadcn primitives; 121 UI
  tests pass)
- **2026-09-19:** F-01 soft-stop **cleared** — frontend lane head
  rewritten to **F-02** (app shell, nav, locale, honest workspace
  switcher). F-02 was `ready`
- **2026-09-22:** `@user` paused **F-02 before execution**. D-01 visuals
  are historical, not a build ticket. Live design authority:
  `docs/design/system-ux.md` (system contracts) and
  `docs/design/now.md` (living plan). Look is stock shadcn until a
  design language is chosen
- **2026-09-22:** `@user` chose the **visible kit** slice — **F-02a
  completed**: `/kit` page of stock shadcn primitives in `apps/web`
  (no shell, no journeys). `packages/ui` tests 121/121, typechecks green.
  Design language = swappable token layer; a future look is a token
  retune, not a component rewrite
- **2026-09-23:** `@user` confirmed the **F-01→F-11 sequence as the plan
  of record** (PM tracks it). Task format: title + short description +
  integration details (API/state/fixtures); UI details stay open. New
  rule: implementer asks `@user` for a reference (link / pasted code /
  prompt, image welcome) before building any visual block, and offers
  options on real choices. **F-02 (shell) reopened as the next step**;
  the D-01-era F-02 archive stays historical. Design language = swappable
  token layer
- **2026-09-20:** Backend B-02→B-04 completed and archived; Commander
  B-04c eval **GO**; B-04c Implementer closeout **completed** and
  archived. **S-03** mock corpus **completed** (Commander-validated
  PASS-with-notes after Codex token exhaustion left archive/Outcome
  incomplete). Backend lane advanced to **B-05** (ingestion /
  chunking jobs + progress)
- Production AI / OpenRouter live calls are **not** authorized
- DevOps I-* remain **unassigned** (split later); local Compose Postgres
  is Backend-owned (B-02 completed)

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
| D-01 Visual system + journey UI specs | frontend | Designer | **completed** (Commander-accepted) | `docs/handoffs/archive/H-2026-09-14-P1-D01-commander-designer.md` |
| S-01a FE Nx + boundary CI | shared | Implementer | **completed** | `docs/handoffs/archive/H-2026-09-15-P1-S01A-commander-implementer.md` |
| S-01b Java API scaffold | backend | Implementer | **completed** | `docs/handoffs/archive/H-2026-09-15-P1-S01B-commander-implementer.md` |
| F-01 Design tokens + shadcn | frontend | Implementer (front-end programmer) | **completed** | `docs/handoffs/archive/H-2026-09-16-P1-F01-commander-implementer.md` |
| F-02 App shell + honest workspace switcher | frontend | Implementer (front-end programmer) | **ready** — next in sequence; reopened 2026-09-23 under new design rules (structure from `system-ux.md`; references from `@user`) | `docs/handoffs/active/lane-frontend.md` |
| F-02a Visible UI kit (stock shadcn) | frontend | Implementer (front-end programmer) | **completed** — `/kit` page; archived `H-2026-09-22-P1-F02A` | `docs/handoffs/active/lane-frontend.md` |
| B-01 Domain port interfaces | backend | Implementer (back-end programmer) | **completed** (Commander-validated 2026-09-17) | `docs/handoffs/archive/H-2026-09-16-P1-B01-commander-implementer.md` |
| S-02 Canonical HTTP / OpenAPI / SSE | backend | Implementer (back-end programmer) | **completed** | `docs/handoffs/archive/H-2026-09-17-P1-S02-implementer-implementer.md` |
| B-02 Postgres schema + RLS + local Compose | backend | Implementer (back-end programmer) | **completed** | `docs/handoffs/archive/H-2026-09-20-P1-B02-commander-implementer.md` |
| B-03 Identity sessions + membership binder | backend | Implementer (back-end programmer) | **completed** | `docs/handoffs/archive/H-2026-09-20-P1-B03-implementer-implementer.md` |
| B-04 Notes CRUD + version concurrency | backend | Implementer (back-end programmer) | **completed** | `docs/handoffs/archive/H-2026-09-20-P1-B04-implementer-implementer.md` |
| B-04c Commander eval (B-01–B-04) | backend | Commander | **completed** (GO) | `docs/handoffs/archive/H-2026-09-20-P1-B04C-implementer-commander.md` |
| B-04c Test + Postman closeout | backend | Implementer (back-end programmer) | **completed** | `docs/handoffs/archive/H-2026-09-20-P1-B04C-IMPL-commander-implementer.md` |
| S-03 Deterministic mock corpus | backend | Implementer (back-end programmer) | **completed** | `docs/handoffs/archive/H-2026-09-20-P1-S03-commander-implementer.md` |
| B-05 Ingestion / chunking + progress | backend | Implementer (back-end programmer) | **ready** | `docs/handoffs/active/lane-backend.md` |

Full F-01…F-11, B-01…B-12, S-02, S-03, I-01…I-09 lists:
[`docs/planning/implementation-tracks.md`](docs/planning/implementation-tracks.md).

## Blockers

- Production AI/provider activation remains gated (mock-first CX)
- RTL locale support remains deferred, not closed
- **F-03+** unblocked by **S-03** fixtures (and/or **B-03** live
  identity) — FE still needs a narrowly scoped `web → mocks`
  development/test import exception before in-app MSW wiring
- AWS deploy and live OpenRouter are I-* / Phase 3–4 — not F-02/B-05
- DevOps I-* have no human owner yet
- Backend working-tree changes (B-01 ports, S-03 mocks, etc.) remain
  **uncommitted** — commit before merge/PR; does not block B-05

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

**Closed 2026-09-16**

- D-01 design package → Commander-accepted (bounded gaps in
  `docs/design/traceability.md` §6 remain open; F-01 resolved the
  Storybook question by folding scaffolding into F-02)
- S-01a / S-01b scaffolds → completed

**Still open / standing**

- **RTL locale support** — deferred, not closed
- **Production AI / provider activation** — open until CX-first mock
  validation
- UT-1…UT-22 — unrun hypotheses (0.8b added UT-15…22)
- Exact AWS Free-plan service graph / credit-burn PoC — I-03 (unassigned)
- DevOps I-* human split — later

## Active Handoffs

- **Commander index:** `docs/handoffs/current.md` (`to: commander`) —
  dual-lane board only; not an implementer work ticket
- **Frontend lane:** `docs/handoffs/active/lane-frontend.md` →
  `/implementer` (F-02, `lane: frontend`, human: front-end programmer)
- **Backend lane:** `docs/handoffs/active/lane-backend.md` →
  `/implementer` (B-05 ingestion/chunking + progress, `lane: backend`,
  human: back-end programmer)
