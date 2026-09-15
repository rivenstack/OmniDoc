---
handoff_id: H-2026-09-14-P1-S01
affinity: implementation
track: parallel
status: blocked
phase: "1"
task: "S-01"
lane: shared
from: commander
to: implementer
created: 2026-09-14
blocked: 2026-09-15
---

# S-01 — Nx Workspace Scaffold (ARCHIVED — superseded before execution)

## Outcome Summary

**Blocked 2026-09-15 by `/commander`.** This handoff was `ready` and
had **not** been executed. `@user` reopened the backend application
stack: the API must not be a Node.js `apps/api` placeholder. Better
Auth (ADR-0001 §6) and ADR-0002's Node API assumption are in
**Backend Stack Close-out** (R-BE → A-BE / ADR-0005 `proposed` →
U-BE).

This records a **workflow correction**, not Implementer failure.
Nothing was scaffolded.

**Do not execute** the original body below. Successors: **S-01a**
(frontend Nx) and **S-01b** (Java API) are listed in
`docs/planning/implementation-tracks.md` and stay gated on U-BE
acceptance of ADR-0005. Live parallel work: D-01 remains on
`docs/handoffs/current.md`.

---

# Original handoff body (immutable historical record)

The original S-01 body follows. Live status is in `context.md`.

---

handoff_id: H-2026-09-14-P1-S01 (original)

# S-01 — Nx Workspace Scaffold and Boundary Enforcement

## Start Command

```text
/implementer Read docs/handoffs/active/phase-1-task-s-01-implementer.md and execute S-01 exactly. Scaffold the Nx workspace per ADR-0002/0003. Do not activate production AI. Do not invent design tokens beyond placeholders. Do not implement full domain ports, OpenAPI, or the mock corpus.
```

## Objective

Owner: `/implementer`. **Lane:** `shared`. **Recommended human owner:
Backend.** Frontend reviews `apps/web` placeholder + boundary tags (PR
review, not a second `to:`).

Scaffold the accepted OmniDoc monorepo: Nx 23.2.1, pnpm 12.4.1, Node 24
LTS, `apps/web` (Next.js 16.3.5), `apps/api` (placeholder for BFF/workers),
`packages/ui`, `packages/contracts`, `packages/domain`, `packages/mocks`.
Turn the ports-only invariant into `@nx/enforce-module-boundaries` CI.

This is **workspace bootstrap**, not AWS DevOps. A parallel **D-01**
Designer task writes visual specs under `docs/design/`. Do not wait for
finished visuals. Use shadcn/ADR-0003 placeholders in `packages/ui`.

**Authorize:** scaffolding only.

**Do not authorize:** production provider keys, live OpenRouter, AWS
deploy, TipTap, Better Auth, Postgres migrations, full `architecture.md`
§5 port implementations (**B-01**), canonical OpenAPI/SSE (**S-02**), or
the architecture §9 fixture corpus (**S-03**). Empty/stub packages that
compile and prove the graph are enough.

## Required Reading

1. `context.md` (read-only)
2. `docs/planning/implementation-tracks.md` (S-01 / S-02 / B-01 split;
   do not edit)
3. `architecture.md` §1, §8, §11 (layout); §5 awareness only — do not
   implement full ports
4. ADR-0001, ADR-0002, ADR-0003, ADR-0004 (all `accepted`)
5. `docs/research/version-ledger.md` (pins)
6. `.cursor/skills/api-contract-change/SKILL.md` (awareness — S-02 owns
   the canonical contract)
7. This handoff

## Inputs / Evidence

Pins (ledger): Next.js 16.3.5, Node 24, pnpm 12.4.1, Nx 23.2.1, Tailwind
4.3.3, shadcn/ui 4.21.0, Base UI 1.8.0, Vitest 5, Playwright 1.63, axe
4.13, MSW 2.15, Storybook 10.6, Zustand 5.0.15.

Nx Cloud / remote cache: **local cache only** (ADR-0002). I-09 is not
this task.

## Allowed Write Paths

- `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `nx.json`,
  `tsconfig*.json`, `.nvmrc`, `.npmrc`, `.gitignore` (extend)
- `apps/**`
- `packages/**` (placeholder packages only)
- `.github/workflows/**` (typecheck/lint/test CI only — no secrets)
- `README.md` (repo map only: replace `frontend/`/`backend/` with Nx)
- `.env.example` (placeholders only)
- `docs/handoffs/active/phase-1-task-s-01-implementer.md` (status +
  outcome)
- `docs/memory/implementer.md` (durable lessons)

**Must not touch:** `context.md`, `architecture.md`, `docs/adr/**`,
`docs/research/**`, `docs/design/**`, `docs/planning/**`,
`docs/api/**` (S-02), `docs/frontend/README.md` (F-01),
`docs/handoffs/current.md`.

## Deliverables

1. Working Nx workspace installable with `pnpm install` on Node 24.
2. `apps/web` Next.js App Router shell (`en` `lang`/`dir` from one
   source); no provider SDK in the client graph.
3. `apps/api` minimal Node app placeholder (health route sufficient).
4. Packages exist and compile: `ui` (shadcn configured per ADR-0003; one
   or two primitive components), `contracts`, `domain`, `mocks` as
   **stubs** so the graph is real. Do **not** fill §5.1–§5.11 interfaces
   (B-01), OpenAPI (S-02), or the §9 corpus (S-03).
5. `@nx/enforce-module-boundaries` tags as ADR-0002: `apps/web` must not
   depend on provider SDKs or `packages/domain` internals. Prove the
   rule **fails** when violated (documented failing check or test).
6. `nx run-many -t typecheck lint test` passes on a clean checkout.
7. Root `README.md` repo map matches the accepted Nx layout.
8. `.env.example` placeholders only — never real keys.
9. This file `status: completed` with outcome, including exact commands
   to install and verify.

## Constraints / Prohibited Decisions

- Do not call OpenRouter, OpenAI, or any live provider
- Do not add AWS deploy Terraform/CDK (I-03 / I-04)
- Do not implement TipTap, Better Auth sessions, or Postgres migrations
  (B-02+)
- Do not enable Nx Cloud
- Do not let `shadcn create` overwrite Nx config (ADR-0002)
- Do not use React canary-only APIs in app code
- Do not commit secrets
- Do not invent design tokens beyond shadcn/ADR-0003 placeholders

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
- `docs/api/` not created here (S-02)

## Directionality / accessibility checks

- `en` LTR; RTL deferred — logical properties if any layout CSS
- `bdi` if any identifier is rendered
- Focus visible on any interactive shell control

## Dependencies / Risks

- Parallel with **D-01**. Do not consume unfinished `docs/design/` as
  required input; placeholders are enough.
- Blocks all F-* and B-* source work.
- Does **not** wait on D-01.
- Risk: Nx `@nx/next` generator vs Next 16.3.5 peer range — PoC and
  record; falsify per ADR-0002 verification item 5 if it cannot scaffold
  cleanly.
- Risk: shadcn Turborepo assumption — take conventions, keep Nx.

## Gates

- Production AI activation remains gated
- RTL remains deferred
- AWS deploy remains I-* (unassigned)
- Full ports / contracts / mock corpus remain B-01 / S-02 / S-03

## Completion Instructions

1. Scaffold and verify locally.
2. Update this file to `status: completed` with commands and outcome.
3. Durable lessons in `docs/memory/implementer.md`.
4. Do **not** overwrite `docs/handoffs/current.md`.
5. Do **not** open B-01, S-02, or F-01 — Commander opens the next live
   handoff per lane from `docs/planning/implementation-tracks.md`.
