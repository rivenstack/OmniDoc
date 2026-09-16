---
handoff_id: H-2026-09-15-P1-S01A
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "S-01a"
lane: shared
from: commander
to: implementer
created: 2026-09-15
---

# S-01a — Frontend Nx workspace + boundary CI

## Start Command

```text
/implementer Read docs/handoffs/active/phase-1-task-s-01a-implementer.md and execute S-01a exactly. Scaffold the Nx/pnpm frontend graph per ADR-0002/0003. Do not create a Node apps/api. Do not touch the JVM module (S-01b). Do not activate production AI. Do not overwrite docs/handoffs/current.md.
```

## Objective

Owner: `/implementer`. **Lane:** `shared` (Frontend reviews `apps/web` +
TS tags). Recommended human: Frontend developer.

Scaffold the **JavaScript / TypeScript** monorepo graph only: Nx 23.2.1,
pnpm 12.4.1, Node 24, `apps/web`, `packages/ui|contracts|mocks` stubs,
and `@nx/enforce-module-boundaries` CI that **fails** on an illegal
`apps/web` → provider SDK import.

**No** Node API. **No** Better Auth. JVM `apps/api` is **S-01b**
(`lane: backend`) — do not overlap writes.

D-01 `/designer` remains on `docs/handoffs/current.md` — do not replace it.

## Required Reading

1. `context.md`
2. This handoff
3. `docs/planning/implementation-tracks.md` (S-01a row)
4. ADR-0001 §1–§5, §7; ADR-0002 (polyglot amend); ADR-0003; ADR-0004
   (modes/chrome awareness only)
5. ADR-0005 (`accepted`) — know why there is no Node API
6. `architecture.md` §1, §11
7. `docs/memory/implementer.md`
8. `.cursor/agents/implementer.md` (lane-aware polyglot contract)

## Inputs / Evidence

- ADR-0005 `accepted` 2026-09-15 (A-BE2)
- Pins: Next.js 16.3.5; Tailwind 4.3.3 + shadcn/Base UI; Nx 23.2.1;
  pnpm 12.4.1; Node 24
- Archived Node S-01 must **not** run
- Parallel **S-01b** owns Gradle / `apps/api` JVM

## Allowed Write Paths

- Root workspace config for Nx/pnpm/Node (`package.json`, `pnpm-workspace`,
  `nx.json`, `tsconfig*`, `.nvmrc`, `.npmrc`, etc. as needed)
- `apps/web/**`
- `packages/ui/**`, `packages/contracts/**`, `packages/mocks/**` (stubs only)
- FE CI workflow stubs under `.github/workflows/` for typecheck/lint/test
  **if** they do not conflict with S-01b JVM CI (prefer `ci-frontend.yml`
  naming)
- `docs/frontend/README.md` (refresh stale stack/auth wording)
- `.env.example` placeholders for **web** only (no real secrets)
- `docs/memory/implementer.md` (durable lessons only)
- This file: append Outcome; set `status: completed`

**Must not touch:** `apps/api/**`, Gradle/`build.gradle*`, `docs/adr/**`,
`architecture.md`, `context.md`, `docs/handoffs/current.md`,
`docs/design/**`, production OpenRouter keys, Better Auth scaffold.

## Deliverables

1. Nx workspace with `apps/web` (Next.js App Router per ADR-0001 §1) —
   PoC `@nx/next` vs Next 16.3.5; document any generator gap.
2. Stub packages: `ui`, `contracts`, `mocks` (empty or minimal so FE can
   compile).
3. `@nx/enforce-module-boundaries` tags: deliberate illegal
   `apps/web` → provider SDK (or equivalent) **fails** CI/local check;
   then remove the deliberate violation.
4. pnpm scripts / Nx targets for typecheck, lint, unit test.
5. `.env.example` web placeholders only.
6. Outcome on this handoff.

## Constraints / Prohibited Decisions

- Do not scaffold Node `apps/api` or Better Auth
- Do not implement full domain ports, OpenAPI surfaces, or mock corpus
  (S-02 / S-03 / B-01)
- Do not invent design tokens beyond placeholders (F-01 waits on D-01)
- Do not enable production AI adapters
- Do not require `@nx/gradle`

## Acceptance Criteria

- `pnpm`/Nx can typecheck/lint/test the FE graph
- Boundary enforcement fails on a deliberate illegal import (then reverted)
- No Node API app exists
- No overlap with S-01b write paths
- `docs/handoffs/current.md` untouched

## Directionality / accessibility checks

- Scaffold must not hardcode physical left/right in shared layout chrome
- Single `lang`/`dir` source planned for App Router root (even if stub)
- Accessibility tooling hooks (axe/Playwright) may be stubbed; full
  journeys are F-11

## Dependencies / Risks

- Parallel with D-01 and S-01b
- Blocks F-01+ source work
- Risk: `@nx/next` vs Next 16.3.5 mismatch — time-box PoC; document
- Risk: inventing `packages/domain` as backend SoT — forbidden

## Gates

- Production AI remains gated
- RTL locale remains deferred

## Completion Instructions

1. Scaffold FE graph per Allowed Write Paths.
2. Append Outcome; set `status: completed`.
3. Durable lessons in `docs/memory/implementer.md`.
4. Do **not** open F-01 — Commander integrates D-01 + S-01a later.
5. Do **not** overwrite `docs/handoffs/current.md`.
6. Persist next handoff only if Commander authorized; otherwise return
   to `/commander` for integration.

## Outcome (2026-09-15, branch `feat/s-01a-fe-nx-workspace`)

Scaffold complete. All acceptance criteria met; violations reverted;
`docs/handoffs/current.md` untouched; no Node API; no overlap with
S-01b write paths.

**Graph:** Nx 23.2.1 + pnpm 12.4.1 + Node `>=24` (`.nvmrc` = `24`;
reference machine runs 26.4.0, within `engines`). Projects
(`nx show projects`): `web` (`scope:app`), `ui` + `contracts`
(`scope:shared`), `mocks` (`scope:tooling`). `apps/web` is a Next.js
16.3.5 App Router stub with a single `lang`/`dir` source
(`app/locale.ts`, `en`/`ltr`), logical-CSS-only stub stylesheet, and
`bdi` on the identifier fragment. Stubs only in
`packages/ui|contracts|mocks`; no design tokens (F-01), no OpenAPI
(S-02), no corpus (S-03), no `packages/domain`.

**`@nx/next` PoC:** no generator gap on versions — `@nx/next@23.2.1`
peers `next >=14 <17`, which covers pinned Next 16.3.5. The scaffold
was authored directly (not via the generator) to avoid accepting
opinionated generator output wholesale per ADR-0002; `@nx/next` is a
root devDependency so the generator is available for F-* work.

**Verification (run, not claimed):**

- `pnpm typecheck` — 4/4 pass (`tsc --noEmit`, per-project configs)
- `pnpm lint` — 4/4 pass (flat config + TS preset +
  `@nx/enforce-module-boundaries`)
- `pnpm test` — 4/4 pass (vitest stubs: locale pin, package exports)
- `nx run web:build` — `next build` succeeds, `/` prerenders static
- Deliberate violation 1: `import OpenAI from "openai"` in
  `apps/web/app/page.tsx` → `error A project tagged with "scope:app"
  is not allowed to import "openai"`, eslint exit 1. Reverted; the
  temporary `openai` devDependency was removed (`pnpm remove -w`);
  lockfile carries no provider SDK.
- Deliberate violation 2: `apps/web` → `@omnidoc/mocks`
  (`scope:tooling`) → `error ... can only depend on libs tagged with
  "scope:shared"`, eslint exit 1. Reverted.
- `git status` confirms: no `apps/api/`, no Better Auth, no secrets,
  no `.env` values (placeholders only in `.env.example`).

**Adjacent fixes inside Allowed Write Paths:** `docs/frontend/README.md`
refreshed (ADR-0005 `accepted`, no `packages/domain`, S-01a presence,
`ci-frontend.yml` existence). FE CI added as
`.github/workflows/ci-frontend.yml` (typecheck/lint/test; JVM-safe
name). Nx cache redirected to `node_modules/.cache/nx` so no
`.gitignore` change was needed.

**Notes for Commander:** pnpm 12 records build approval as
`allowBuilds: { nx: true }` in `pnpm-workspace.yaml` (tracked;
`onlyBuiltDependencies` in `package.json` is ignored by pnpm 12).
Boundary proof detail: the rule only reports installed npm packages,
so violation 1 needed the temporary install. `pnpm-lock.yaml` is new
and must be committed with this branch. Not committed — awaiting
Commander review/PR.
