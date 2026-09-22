---
handoff_id: H-2026-09-20-P1-S03
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "S-03"
lane: backend
human_owner: back-end-programmer
from: commander
to: implementer
created: 2026-09-20
completed: 2026-09-20
archived: 2026-09-20
---

# S-03 — Deterministic mock corpus

## Start Command

```text
/implementer Read docs/handoffs/active/lane-backend.md and execute S-03 exactly. Produce the architecture §9 deterministic mock corpus under packages/mocks (MSW-ready). Do not implement B-05 ingestion, B-06 pgvector, or production AI. Do not overwrite docs/handoffs/current.md or lane-frontend.md.
```

## Objective

Owner: `/implementer`. **Lane:** `backend`. **Human:** back-end
programmer. **allowed_task_classes:** `S-*` only (this handoff = S-03).

Replace the S-01a stub in `packages/mocks` with the architecture §9
deterministic fixture corpus and MSW handlers so the frontend can build
mock journeys without a second fixture authority. Backend lane produces;
frontend consumes. **Do not** open B-05 — return completed archive to
Commander (B-05 waits until S-03 completes or `@user` defers).

## Required Reading

1. `context.md` (read-only)
2. `architecture.md` §4 (Ask success states) and §9 (required themes)
3. `AGENTS.md`
4. `docs/planning/implementation-tracks.md` S-03 row
5. ADR-0002, ADR-0003 (MSW / package boundaries), ADR-0004 (runtime modes)
6. Archived S-02 —
   `docs/handoffs/archive/H-2026-09-17-P1-S02-implementer-implementer.md`
   plus `docs/api/openapi.yaml`, `docs/api/ask-sse.md`, and
   `@omnidoc/contracts` (consume; do not fork)
7. Archived B-03 / B-04 under `docs/handoffs/archive/` (identity + notes
   shapes for fixture alignment; read-only)
8. Archived B-04c Implementer closeout —
   `docs/handoffs/archive/H-2026-09-20-P1-B04C-IMPL-commander-implementer.md`
9. Existing `packages/mocks` scaffold and `docs/frontend/README.md`
   fixture notes (do not fork a second authority)
10. `docs/memory/implementer.md`
11. This handoff

## Inputs / Evidence

- B-04c Implementer closeout **completed** (archived GO path)
- S-02 OpenAPI / Ask SSE / `@omnidoc/contracts` as the single contract
  authority
- Architecture §9 theme table and §4 Ask success vocabulary
- S-01a stub: `packages/mocks/src/index.ts` (`mockCorpusVersion =
  "s-01a-stub"`)

## Allowed Write Paths

- `packages/mocks/**`
- This backend lane handoff and its archive
- `docs/memory/implementer.md` (durable lessons only)

## Must Not Touch

- `apps/api/**`
- `apps/web/**`, `packages/ui/**` (no FE UI authorship)
- `docs/api/**`, `packages/contracts/**` (consume only; escalate forks)
- `context.md`, `architecture.md`, `docs/adr/**`
- `docs/handoffs/current.md`
- `docs/handoffs/active/lane-frontend.md`
- B-05+ product code; Better Auth; production OpenRouter

## Out of Scope

- Ingestion / chunking jobs (B-05)
- pgvector / embed adapters (B-06)
- Java mock ask adapter product work (B-08) beyond fixture data this
  corpus supplies
- Frontend shell / TipTap / Playwright authorship (F-*)
- Opening B-05 or rewriting this lane to B-05
- Live OpenRouter or other provider calls
- Phase Check

## Deliverables

1. Replace the S-01a stub with a versioned deterministic corpus under
   `packages/mocks` (stable fixture ids; same inputs → same outputs).
2. Cover architecture §9 required themes:
   - Happy-path notes + cited Ask
   - Empty states
   - Loading / indexing progress
   - Transport errors (timeout, unavailable, quota) — distinct from Ask
     success states
   - `no_supported_answer` / `refused_policy` as **success**
   - `partial` + `conflict` as **success**
   - Long titles, nested quotes; fenced code + inline identifiers;
     inline URLs/paths; markdown tables; mixed-case tokens; very long
     unbroken strings
   - Sample vs mine labelling + public labelled sample workspace
   - Runtime mode labelling (`mock` / `operator_free_tier` /
     `customer_key` metadata — no live calls)
3. MSW handlers aligned to S-02 identity/workspaces, notes, search, Ask
   SSE, vault metadata, usage, runtime mode, and corpus-ownership
   surfaces so FE can consume without inventing fixtures.
4. Identity / session fixtures sufficient for F-03 (sign-in + workspace
   selector against mock identity).
5. Package tests proving determinism and theme coverage; document how
   FE / Storybook / MSW wires to this package (README in
   `packages/mocks` only).

## Constraints / Prohibited Decisions

- One fixture authority: `packages/mocks` — do not instruct FE to fork
- Do not fork OpenAPI or `@omnidoc/contracts`; escalate mismatches
- Ask success outcomes stay distinct from transport / HTTP errors
- Tenant authority remains server/session-shaped in fixtures; workspace
  is a selector only
- Do not open B-05 or claim production AI / RTL locale closed
- Do not edit `current.md` or `lane-frontend.md`

## Acceptance Criteria

- `packages/mocks` builds and tests PASS (Nx/vitest as configured)
- §9 themes are present with stable ids; Ask success states are not
  modelled as transport failures
- MSW handlers cover the S-02 surfaces needed for FE mock journeys
- Identity fixtures support F-03; sample vs mine labels are first-class
- No changes outside Allowed Write Paths
- Lane left for Commander (do **not** author B-05)

## Stop / escalate conditions

- Soft-stop: S-02 contract conflict — escalate to Commander; do not fork
- Soft-stop: FE demands a second fixture tree under `apps/web` —
  escalate; keep single authority in `packages/mocks`
- Soft-stop: B-05 appears required to ship fixtures — stop and return to
  Commander (do not open B-05)
- Hard-stop: live OpenRouter, Better Auth, or disablement of mock-first
  gates

## Dependencies / Risks

- Depends on: S-01a, S-02; B-04c Implementer closeout completed
- Blocks: F-03+ (F-03 may also use B-03; F-04+ need S-03 fixtures);
  B-08 mock ask path; preferred ahead of B-05 on this lane
- Parallel: F-02 — no write overlap
- Risk: over-scoping into B-05/B-08 Java adapters; keep corpus + MSW only

## Gates

- Production AI activation remains gated
- RTL locale remains deferred
- Phase Check not opened by this slice
- B-05 remains closed until S-03 completes or `@user` defers

## Completion Instructions

1. Record commands and results in this handoff Outcome.
2. Set `status: completed` and archive under
   `docs/handoffs/archive/H-2026-09-20-P1-S03-commander-implementer.md`
   (or dated equivalent).
3. Soft-stop the lane head as `status: blocked` with Outcome
   `waiting on commander for B-05` — do **not** author B-05 yourself;
   do **not** edit `current.md` or `lane-frontend.md`.
4. Durable lessons only in `docs/memory/implementer.md`.
5. Do not open Phase Check.

## Outcome

**Completed 2026-09-20.** Commander-validated **PASS-with-notes** after
Codex token exhaustion left archive/Outcome/coordination incomplete.
Product deliverables under `packages/mocks` were already present;
Commander re-ran verification and archived this handoff, then opened
**B-05**.

### Delivered

1. **Versioned corpus** `mockCorpusVersion = "s-03-v1"` with stable
   fixture ids (`actor_*`, `ws_*`, `*_launch` / `*_conflict` /
   `*_indexing` / `*_formatting`, `job_mine_import`, vault seed).
2. **§9 themes** via scenarios + notes: happy-path cited Ask; empty;
   loading (`releaseResponses`); indexing progress
   (`advanceProgress`); transport `timeout`/`unavailable`/quota
   (HTTP 4xx/5xx distinct from Ask success); all five Ask outcomes as
   HTTP 200 + `completed`; rich-text/edge formatting note; sample vs
   mine + labelled `ws_sample`; runtime mode metadata without live
   calls.
3. **MSW handlers** for session, workspaces, notes CRUD, search, Ask
   SSE, static GET ingestion job, vault metadata, usage/limits, runtime
   mode (invites / export / POST ingestion intentionally omitted —
   documented in README).
4. **Identity fixtures** for F-03 (`signed_out`, Alex/Blair/guest,
   CSRF/session cookie simulation, workspace selector as selector only).
5. **Tests + README** — package tests prove determinism/theme coverage;
   README documents FE/Storybook/MSW wiring and the pending
   **development/test-only** `web → mocks` import-boundary exception
   (Commander/FE; not an S-03 product gap).

### Verification (Commander re-run 2026-09-20)

```text
NX_DAEMON=false NX_ISOLATE_PLUGINS=false \
  pnpm exec nx run-many -t build,typecheck,lint,test \
  --projects=mocks --skip-nx-cache
# PASS — mocks:build, typecheck, lint, test
# mocks:test — Test Files 1 passed; Tests 58 passed (58)

NX_DAEMON=false NX_ISOLATE_PLUGINS=false \
  pnpm exec nx run-many -t typecheck,lint,test \
  --projects=contracts --skip-nx-cache
# PASS — contracts typecheck/lint/test; Tests 11 passed (11)
```

Lockfile: MSW `2.15.0` + transitive adds under `packages/mocks` only;
no protected-file writes (`apps/api`, `apps/web`, `packages/contracts`,
`docs/api`, `lane-frontend.md`).

### Notes (non-blocking)

- Codex exhausted tokens before recording Outcome / archive / soft-stop;
  Commander completed coordination cleanup.
- FE production import of `@omnidoc/mocks` still requires a narrowly
  scoped boundary exception — documented in `packages/mocks/README.md`;
  S-03 correctly did not retag scope or edit ESLint.
- Intentional mock omissions: invites, export stub POST, POST
  ingestion enqueue (static job GET + progress API only).

### Soft-stop disposition

Implementer did **not** author B-05. Commander opens **B-05** on
`docs/handoffs/active/lane-backend.md` after this archive.
