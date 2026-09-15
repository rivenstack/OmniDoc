# ADR-0002 — Workspace and Tooling

- **Status:** `accepted` (accepted by `@user` 2026-09-14) with
  **`apps/api` as Node + `packages/domain` TypeScript SoT reopened
  2026-09-15** — see
  [ADR-0005](./ADR-0005-backend-application-stack.md) (`proposed`).
  Nx + pnpm + Node 24 + `apps/web` + `packages/ui` **remain** accepted
  for the frontend graph.
- **Date:** 2026-09-14
- **Deciders:** Architect proposes; `@user` accepts / rejects / amends
- **Supersedes:** the `frontend/` + `backend/` directory contract that
  was previously marked **confirmed** in `README.md`,
  `architecture.md` §11, and `docs/frontend/README.md`
- **Related:** ADR-0001 (frontend and platform stack), ADR-0003
  (frontend application toolchain)

---

## Context

ADR-0001 §1 now places the UI in a Next.js application, and Phase 1
needs a repository layout that can hold a web app, an API/worker
service, and shared domain code without the UI reaching into providers.
The earlier `frontend/` + `backend/` contract was a two-folder
prediction made before any framework or runner was chosen; it has no
mechanism for enforcing the ports-only invariant that
`architecture.md` §1 depends on.

`@user` decided on 2026-09-14 that the project is a monorepo built with
**Nx**. This ADR records the tooling consequences of that decision,
including the parts of the existing documentation it supersedes.

Verified pins come from `docs/research/version-ledger.md`
(verified 2026-09-14).

---

## Decision

> **2026-09-15 reopen (API module only).** The layout below recorded a
> **Node** `apps/api` and TypeScript `packages/domain` as the backend
> SoT. `@user` declined a Node API. Until ADR-0005 is `accepted`, do
> **not** scaffold Node `apps/api`. Nx enforcement for `apps/web`
> remains the reason Nx earns its place for the **JS** graph. Java
> import boundaries (if a JVM API is accepted) are ArchUnit + CI, not
> Nx tags.

**Nx 23.2.1** as the monorepo build system for the **JavaScript /
TypeScript** graph, **pnpm 12.4.1** as the package manager, **Node 24
LTS** as the pinned **frontend** runtime, with an `apps/` + `packages/`
layout:

```text
apps/
  web/          # Next.js 16.3.5 UI application (ADR-0001 §1, ADR-0003)
  api/          # API / workers — **Node placeholder reopened** (ADR-0005).
                # Do not scaffold as Node until U-BE. If Java is accepted,
                # this directory is a JVM module (or `backend/` per ADR-0005).
packages/
  ui/           # shadcn/ui components + design tokens (ADR-0003)
  contracts/    # API request/response/stream types shared by web + api
  domain/       # **Reopened:** was TS ports SoT. If ADR-0005 Java is
                # accepted, ports live in the API module; this package
                # is not the backend SoT.
  mocks/        # deterministic fixture adapters + MSW handlers (architecture.md §9)
docs/
  api/          # canonical HTTP/OpenAPI/SSE contracts (unchanged)
```

**Enforcement (the reason Nx earns its place here).**
`@nx/enforce-module-boundaries` tags implement the ports-only invariant
mechanically rather than by review discipline:

- `apps/web` may depend on `packages/contracts` and `packages/ui` only.
  It may **not** depend on `packages/domain` internals, `packages/mocks`
  production paths, or any provider SDK.
- Provider SDKs (`openai`, `@anthropic-ai/sdk`, `@google/genai`,
  `voyageai`, and any vector/storage SDK) are allowed only inside
  **API adapter** code (Node `apps/api` only if U-BE keeps Node; otherwise
  the JVM API module), never in the `web` dependency graph.
- `packages/domain` must not depend on a framework or on `apps/*`.

A dependency-graph violation is a CI failure, not a code-review opinion.
This is the single strongest justification for choosing Nx over a
lighter runner for this project.

**Node and package manager.** `engines.node >= 24` and `.nvmrc` = `24`
(Node 24 LTS satisfies every verified floor: Next 16.3.5 ≥20.9,
React Router 8 ≥22.22, ESLint 10 and Vitest 5 lines). pnpm 12.4.1 is
already installed on the reference machine, which closes the
"package manager undecided" item that research deliberately left open.

---

## Alternatives considered

| Option | Why not chosen |
|--------|----------------|
| pnpm workspaces + Turborepo 2.10.12 | Lighter, and the layout shadcn/ui's own monorepo scaffolder generates. Lost because Turborepo caches tasks but does **not** enforce module boundaries — the ports-only invariant would stay a review convention, which is the failure mode this ADR exists to remove. |
| pnpm workspaces only (no task runner) | Simplest possible start. Lost on caching and on the same missing enforcement; plus ADR-0003's test matrix (Vitest + Playwright + Storybook across two apps) benefits materially from a task graph. |
| Keep `frontend/` + `backend/` at the root | Lost because it cannot express a shared UI package, contracts, or boundaries, and because Next.js + an API service + shared packages is exactly the shape a workspace exists for. |
| Nx "package-based" mode over an existing pnpm workspace | Viable incremental path if the full Nx model proves heavy; noted as a fallback rather than the starting point, since we are scaffolding greenfield. |

---

## Consequences

**Liked**

- One dependency graph with cached `build`, `typecheck`, `lint`, `test`
  targets and a single `pnpm` lockfile.
- Ports-only becomes executable: the most-repeated rule in this repo
  gains a mechanism instead of another paragraph.
- Generators exist for both apps (`@nx/next` peers `next >=14 <17`;
  `@nx/react` ships `./router-plugin` if RR8 is ever revisited).

**Disliked / accepted costs**

- Nx is the heaviest option on the table: an extra configuration layer
  and its own release cadence to track (23.2.1 stable; 23.3.0-beta/
  canary in flight). It must be kept in the version ledger like every
  other pin.
- Nx's generator defaults are opinionated and will produce files this
  project does not want; generated output must be reviewed, not accepted
  wholesale.
- Task caching is **not** verification. A cache hit proves a target did
  not change inputs; it does not prove the change is correct. Phase
  Check criteria must not be satisfied by cached output alone.
- Deviation to record: shadcn/ui's own monorepo scaffolder assumes
  **Turborepo** and a `web` + `ui` workspace pair. We take its
  *conventions* (`packages/ui`, one `components.json` per workspace,
  identical `style`/`iconLibrary`/`baseColor`) but Nx is the runner.
  Do not let `shadcn create` overwrite the Nx workspace config.

**Directory contract change**

The following previously "confirmed" statements are superseded and must
be updated in the same rollout:

| Location | Previously | Now |
|----------|-----------|-----|
| `README.md` repository map + `frontend/`/`backend/` notes | `frontend/` + `backend/` confirmed | `apps/web` + `apps/api` + `packages/*` |
| `docs/frontend/README.md` "Expected directory contract" | `frontend/` + `backend/` | Nx workspace layout; package manager settled |
| `architecture.md` §11 | "Directory names `frontend/` / `backend/`" | Nx layout (ADR-0002) |
| `docs/adr/ADR-0001` §1 | `frontend/` + `backend/` | Nx layout (ADR-0002) |

---

## Migration / rollback

- **Forward:** scaffold the Nx workspace, then `apps/web` via the
  `@nx/next` generator, then `packages/ui` with shadcn/ui configured per
  ADR-0003. Scaffolding still requires an Implementer handoff; this ADR
  authorizes the *shape*, not the action.
- **Rollback:** the workspace is a build-time layer. Collapsing to
  pnpm workspaces + Turborepo means dropping `nx.json`, per-project
  `project.json` files, and the boundary rules — app and package source
  is unaffected. That reversibility is deliberate.

---

## Security / privacy

- Boundary tags are a security control, not only an ergonomics one: they
  are what make "provider keys never reach the browser" checkable at
  build time (ADR-0001 §1 verification, `architecture.md` §6).
- `apps/api` owns all secret access; no `.env` values or provider
  credentials may be reachable from `apps/web` or `packages/ui` builds.
- Nx Cloud/remote caching must not be enabled without a `@user` decision
  — it would send build artifacts off-machine, which is a data-ownership
  question this ADR does not decide. Default: local cache only.

---

## Verification

1. `pnpm nx graph` shows no dependency path from `apps/web` to a
   provider SDK.
2. A deliberately added `import OpenAI from 'openai'` inside
   `apps/web` fails lint/CI via `@nx/enforce-module-boundaries`.
3. `nx run-many -t typecheck lint test` passes on a clean checkout with
   `engines.node` enforced.
4. A dependency-graph violation is demonstrated as a **failing** check,
   not merely a passing one — the rule must be proven to bite.
5. Falsify if Nx's configuration overhead exceeds its enforcement value
   within Phase 1, or if `@nx/next` cannot scaffold Next.js 16.3.5
   cleanly (peer range is `>=14 <17`, so this needs a real PoC, not an
   assumption).

---

## References

- `architecture.md` §1 (experience-first boundary), §5 (ports), §11
- `docs/adr/ADR-0001-frontend-and-platform-stack.md` §1, §7
- `docs/adr/ADR-0003-frontend-application-toolchain.md`
- `docs/research/version-ledger.md`
- `docs/frontend/README.md`
