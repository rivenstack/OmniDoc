# Polyglot Monorepo — Nx + Java (R-BE)

**Research date / access date:** 2026-09-15  
**Question:** How should a Next.js (Nx/pnpm) frontend and a JVM API share one product repo? **No selection.**

ADR-0002 (`accepted`) chose Nx **because** `@nx/enforce-module-boundaries` makes the ports-only invariant a CI failure for the **TypeScript** graph. That mechanism **does not** enforce Java package imports.

## Option A — Gradle (or Maven) project under Nx via `@nx/gradle`

| Factor | Evidence | Class | Conf. |
|--------|----------|-------|-------|
| Plugin | Nx documents a Gradle plugin (`@nx/gradle`); npm notes it as **experimental**; Java ≥17 | Verified technical | H |
| Benefit | One task graph / CI entry | Common practice | M |
| Adverse | Experimental CI flakiness; still need **ArchUnit** for Java hexagonal rules | Inference | M |

## Option B — Java module beside Nx (Nx orchestrates via `run-commands`)

Layout example: `apps/web` + `packages/*` remain Nx/pnpm; `apps/api` (or `backend/`) is a Gradle/Maven tree. Nx calls `./gradlew test` as a target.

**Tradeoff:** simpler, weaker “affected” graph. **ArchUnit + CI** still required. Pragmatic for two developers.

## Option C — Two repositories

Clean language boundaries; painful OpenAPI/fixture versioning; weaker “one product” portfolio story. Only if CI pain dominates.

## Boundary substitute

| Graph | Mechanism |
|-------|-----------|
| `apps/web` → no provider SDK / no Java types | Existing Nx tags (ADR-0002) |
| Java `..api.web` / HTTP DTOs → no `org.springframework.ai` | **ArchUnit** (+ Checkstyle/SpotBugs optional) |
| FE/BE handshake | OpenAPI 3 (+ SSE companion) → TS `packages/contracts` / MSW |

## Architect inputs (no selection)

- Bias for Architect sequencing: **one repo** (A or B), not two, unless evidence of contract-version pain.
- `@user` must answer tolerance for experimental `@nx/gradle` (A) vs Gradle-beside-Nx (B).
- ADR-0002 must be **amended** if `apps/api` is no longer a Node app; do not silently diverge from `docs/frontend/README.md`.
