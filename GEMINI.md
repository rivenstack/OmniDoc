# OmniDoc — Antigravity Agent Operating Contract & Workspace Rules

Welcome to **OmniDoc** (`riven-stack/OmniDoc`). OmniDoc is a multi-tenant AI/RAG note and knowledge SaaS.

---

## Shared Context Load Order

At the start of every meaningful session, read in this order:

1. [`context.md`](file:///home/morty/Develop/riven-stack/OmniDoc/context.md) — live phase, status, blockers, gates
2. [`architecture.md`](file:///home/morty/Develop/riven-stack/OmniDoc/architecture.md) — boundaries and invariants
3. [`AGENTS.md`](file:///home/morty/Develop/riven-stack/OmniDoc/AGENTS.md) — canonical roster and role ownership rules
4. Active handoff — Commander index [`docs/handoffs/current.md`](file:///home/morty/Develop/riven-stack/OmniDoc/docs/handoffs/current.md) and the assigned [`docs/handoffs/active/lane-*.md`](file:///home/morty/Develop/riven-stack/OmniDoc/docs/handoffs/active/) (FE or BE)
5. [`docs/planning/implementation-tracks.md`](file:///home/morty/Develop/riven-stack/OmniDoc/docs/planning/implementation-tracks.md) when doing Phase 1+ work
6. Cited **accepted** ADRs under [`docs/adr/`](file:///home/morty/Develop/riven-stack/OmniDoc/docs/adr/)
7. [`MEMORY.md`](file:///home/morty/Develop/riven-stack/OmniDoc/MEMORY.md) + `docs/memory/<role>.md` — supporting context only

Do **not** copy live phase or task status into host instruction files. Update the canonical SoT once.

---

## Agent Roster & Slash Commands

In Antigravity, each agent role is registered as an executable skill / slash command under `.agent/skills/`:

| Role | Antigravity Command | Skill Directory | Responsibilities |
|---|---|---|---|
| **Commander** | `/commander` | [`.agent/skills/commander`](file:///home/morty/Develop/riven-stack/OmniDoc/.agent/skills/commander) | Project coordination, dual-track lanes, phase control, handoffs |
| **Architect** | `/architect` | [`.agent/skills/architect`](file:///home/morty/Develop/riven-stack/OmniDoc/.agent/skills/architect) | Architecture decisions, ADR ownership, ports & boundaries |
| **Researcher** | `/researcher` | [`.agent/skills/researcher`](file:///home/morty/Develop/riven-stack/OmniDoc/.agent/skills/researcher) | Technical, market, legal/provider, and evidence research |
| **UX Researcher** | `/ux-researcher` or `/ux_researcher` | [`.agent/skills/ux_researcher`](file:///home/morty/Develop/riven-stack/OmniDoc/.agent/skills/ux_researcher) | Customer behavior, note journeys, citation trust, UX recommendations |
| **Designer** | `/designer` | [`.agent/skills/designer`](file:///home/morty/Develop/riven-stack/OmniDoc/.agent/skills/designer) | System UX contracts, design language token layer (`tokens.css`) |
| **Implementer** | `/implementer` | [`.agent/skills/implementer`](file:///home/morty/Develop/riven-stack/OmniDoc/.agent/skills/implementer) | Reproducible Next.js & Spring Boot implementation, asks for visual reference |
| **Phase Check** | `/phase-check` | [`.agent/skills/phase-check`](file:///home/morty/Develop/riven-stack/OmniDoc/.agent/skills/phase-check) | Independent quality verification, tenant isolation & release gates |

---

## Core Principles & Invariants

### 1. Customer Experience First Rule
Before production activation of critical AI providers or external integrations, OmniDoc must have a validated premium customer experience (Phase 1 uses realistic mock data).
- Enforce primary locale `en` (LTR); RTL / mixed-BiDi is deferred (not closed) — enforce RTL-readiness discipline (logical CSS, locale-driven `lang`/`dir`, semantic isolation `bdi`).
- Validate accessibility: focus order, keyboard navigation, accessible labels, contrast, reduced motion.

### 2. Extension-First & Reuse-Before-Custom Rule
Evaluate native behavior and mature ecosystem extensions before custom code. Reuse only when current evidence shows safety and fit.
- Extensions must never bypass project-owned ports, identities, policies, or data-ownership boundaries.

### 3. Architecture & Tech Stack Invariants
- **Frontend**: Next.js 16 App Router, TipTap 3, Tailwind CSS 4 + shadcn/ui on Base UI, Nx monorepo with pnpm.
- **Backend**: **Java 21 + Spring Boot 4.1.x** in `apps/api` (Gradle). **Never scaffold a Node `apps/api`**.
- **Database**: PostgreSQL 18 with `pgvector`, shared schema with application scoping + RLS defense-in-depth.
- **Tenancy**: Cross-tenant isolation must hold at retrieval time. Server session is the sole tenant authority.
- **AI Integration**: UI calls project-owned application ports only — never direct calls from UI to embedding/LLM/vector APIs. Mocks first; production AI remains gated.

---

## Workspace Project Skills

Available as slash commands and on-demand procedure runbooks:

- `/adr-decision` — Turn evidence into a clean material architecture decision / ADR
- `/ai-content-safety` — Audit prompt injection, untrusted markdown, XSS/SSRF, tool trust
- `/api-contract-change` — Change HTTP/OpenAPI/SSE contracts safely across frontend/backend
- `/handoff-authoring` — Create, archive, or repair persistent single-owner handoffs
- `/migration-safety` — Plan relational, vector, chunk, or schema migrations safely
- `/rag-evaluation` — Measure retrieval/citation quality and tenant-isolation regressions
- `/reproducible-baseline-check` — Clean-clone baseline verification
- `/tenant-security-review` — Review auth, tenant boundaries, ACL, IDOR, RLS, secret leakage
- `/threat-model` — Threat-model trust boundaries, sensitive data flows, and BYOK

---

## User-Level Skills

Configured from `~/.agents/skills/` via `skills.json`:

- `codebase-inspection` — Analyze codebase size and languages with pygount
- `diagnosing-hangs` — Diagnose hanging commands or processes with faulthandler watchdogs
- `dogfood` — Systematic exploratory QA for web apps with screenshot evidence
- `find-skills` — Discover and install skills
- `github` — Manage issues, PRs, branch lifecycle, and reviews with `gh` CLI
- `hand-pose-geometry` — Geometric math for MediaPipe/TFJS hand pose keypoints
- `implementation-plan-execution` — Step-by-step execution of structured implementation plans
- `implementation-planning` — Authoring durable bite-sized plans under `docs/plans/`
- `jsx-to-tsx` — Converting React JSX components to typed TSX
- `medusa-monorepo-scaffold` — Scaffold Medusa v2 in monorepos
- `node-inspect-debugger` — V8 inspector and Chrome DevTools Protocol debugging
- `project-plan-maintenance` — Keep plans, dependency pins, and tool configs in sync
- `python-debugpy` — Debug Python processes with pdb / debugpy
- `requesting-code-review` — Pre-commit code verification and review
- `shadcn` — Manage, style, and compose shadcn components and UI presets
- `simplify-code` — Parallel review and cleanup of recently modified code
- `spike` — Rapid throwaway experiments to validate technical feasibility
- `storybook-showcase` — Storybook integration for monorepo UI components
- `systematic-debugging` — 4-phase root cause analysis for test failures and bugs
- `test-driven-development` — TDD test-first discipline
