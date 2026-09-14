---
handoff_id: H-2026-09-14-P1-T02
affinity: implementation
track: parallel
status: ready
phase: "1"
task: "1.2"
from: commander
to: implementer
created: 2026-09-14
---

# Phase 1 — Task 1.2 Nx Workspace Scaffold and Boundary Enforcement

## Start Command

```text
/implementer Read docs/handoffs/active/phase-1-task-1-2-implementer.md and execute it exactly. Scaffold the Nx workspace per ADR-0002/0003. Do not activate production AI. Do not invent design tokens beyond placeholders.
```

## Objective

Owner: `/implementer`

Scaffold the accepted OmniDoc monorepo: Nx 23.2.1, pnpm 12.4.1, Node 24
LTS, `apps/web` (Next.js 16.3.5), `apps/api` (placeholder for BFF/workers),
`packages/ui`, `packages/contracts`, `packages/domain`, `packages/mocks`.
Turn the ports-only invariant into `@nx/enforce-module-boundaries` CI.

A parallel Designer task (1.1) writes visual specs under `docs/design/`.
Do not wait for finished visuals. Use shadcn/ADR-0003 placeholders in
`packages/ui`. Do not implement TipTap, Better Auth, Postgres, or BYOK
beyond empty port interfaces and mock stubs needed to prove the graph.

This handoff **authorizes scaffolding**. It does **not** authorize
production provider keys, live OpenRouter calls, or AWS deploy.

## Required Reading

1. `context.md` (read-only)
2. `architecture.md` §1, §5 (all ports including 5.9–5.11), §8, §11
3. ADR-0001, ADR-0002, ADR-0003, ADR-0004 (all `accepted`)
4. `docs/frontend/README.md` (refresh — stale vs Nx layout)
5. `docs/research/version-ledger.md` (pins)
6. `.cursor/skills/api-contract-change/SKILL.md` (awareness)
7. This handoff

## Inputs / Evidence

Pins (ledger): Next.js 16.3.5, Node 24, pnpm 12.4.1, Nx 23.2.1, Tailwind
4.3.3, shadcn/ui 4.21.0, Base UI 1.8.0, Vitest 5, Playwright 1.63, axe
4.13, MSW 2.15, Storybook 10.6, Zustand 5.0.15.

Nx Cloud / remote cache: **local cache only** (ADR-0002).

## Allowed Write Paths

- `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `nx.json`,
  `tsconfig*.json`, `.nvmrc`, `.npmrc`, `.gitignore` (extend)
- `apps/**`
- `packages/**`
- `.github/workflows/**` (typecheck/lint/test CI only — no secrets)
- `docs/frontend/README.md` (reconcile stack + Nx layout)
- `README.md` (repo map only: replace `frontend/`/`backend/` with Nx)
- `docs/api/**` (optional stub OpenAPI/SSE if needed for contracts package)
- `docs/handoffs/active/phase-1-task-1-2-implementer.md` (status + outcome)
- `docs/memory/implementer.md` (durable lessons)

**Must not touch:** `context.md`, `architecture.md`, `docs/adr/**`,
`docs/research/**`, `docs/design/**`, `docs/handoffs/current.md`.

## Deliverables

1. Working Nx workspace installable with `pnpm install` on Node 24.
2. `apps/web` Next.js App Router shell (`en` `lang`/`dir` from one
   source); no provider SDK in the client graph.
3. `apps/api` minimal Node app placeholder (health route sufficient).
4. Packages: `ui` (shadcn configured per ADR-0003; one or two primitive
   components), `contracts`, `domain` (port TypeScript interfaces for
   notes, ask, vault, usage, mode — no production adapters), `mocks`
   (deterministic ask fixture including `no_supported_answer`).
5. `@nx/enforce-module-boundaries` tags as ADR-0002: `apps/web` must not
   depend on provider SDKs or `packages/domain` internals. Prove the
   rule **fails** when violated (documented failing check or test).
6. `nx run-many -t typecheck lint test` passes on a clean checkout.
7. Refresh `docs/frontend/README.md` and root `README.md` repo map for
   the accepted stack (ADR-0001 follow-through).
8. `.env.example` placeholders only — never real keys.
9. This file `status: completed` with outcome, including exact commands
   to install and verify.

## Constraints / Prohibited Decisions

- Do not call OpenRouter, OpenAI, or any live provider
- Do not add AWS deploy Terraform/CDK in this task
- Do not implement TipTap editor, Better Auth sessions, or Postgres
  migrations yet (those are later increments)
- Do not enable Nx Cloud
- Do not let `shadcn create` overwrite Nx config (ADR-0002)
- Do not use React canary-only APIs in app code
- Do not commit secrets

## Acceptance Criteria

- Clean `pnpm install` + `pnpm nx run-many -t typecheck lint test` passes
- Boundary rule is demonstrated to **fail** on an illegal `apps/web` →
  provider SDK import (then revert the illegal import)
- No provider SDK in `apps/web` dependency graph (`pnpm nx graph` or
  equivalent documented)
- Locale: one `lang`/`dir` source; logical CSS in any UI chrome added
- Accessibility: any interactive control has a name; skip-link or
  equivalent if a shell exists
- Production AI still not activated
- Designer write path `docs/design/` untouched

## Directionality / accessibility checks

- `en` LTR; RTL deferred — logical properties if any layout CSS
- `bdi` if any identifier is rendered
- Focus visible on any interactive shell control

## Dependencies / Risks

- Parallel with Task 1.1. Do not consume unfinished `docs/design/` as
  required input; placeholders are enough.
- Risk: Nx `@nx/next` generator vs Next 16.3.5 peer range — PoC and
  record; falsify per ADR-0002 verification item 5 if it cannot scaffold
  cleanly.
- Risk: shadcn Turborepo assumption — take conventions, keep Nx.

## Gates

- Production AI activation remains gated
- RTL remains deferred
- AWS deploy remains a later increment
- BYOK vault implementation remains a later increment (interfaces only)

## Completion Instructions

1. Scaffold and verify locally.
2. Update this file to `status: completed` with commands and outcome.
3. Durable lessons in `docs/memory/implementer.md`.
4. Do not overwrite `docs/handoffs/current.md`.
