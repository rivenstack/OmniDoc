---
handoff_id: H-2026-09-17-P1-S02
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "S-02"
lane: backend
human_owner: back-end-programmer
from: implementer
to: implementer
created: 2026-09-17
completed: 2026-09-17
---

# S-02 — Canonical HTTP / OpenAPI / SSE contracts

## Start Command

```text
/implementer Read .codex/INSTRUCTIONS.md and docs/handoffs/active/lane-backend.md, then execute S-02 exactly. Author the canonical OpenAPI and Ask SSE contracts in docs/api and generate/align packages/contracts. Do not modify apps/api or packages/mocks.
```

## Objective

Owner: `/implementer`. **Lane:** `backend`. **Human:** back-end
programmer. Author the canonical HTTP/OpenAPI/SSE handshake for the
Phase 1 frontend and backend. Map the accepted architecture surfaces and
B-01 vocabulary without creating a second contract authority.

## Required Reading

1. `context.md` (read-only)
2. `architecture.md` §2, §4, §5, and §9
3. `AGENTS.md`
4. `docs/planning/implementation-tracks.md` S-02 row
5. ADR-0002, ADR-0004, and ADR-0005 (`accepted`)
6. Archived B-01 outcome —
   `docs/handoffs/archive/H-2026-09-16-P1-B01-commander-implementer.md`
   plus Java ports under `apps/api/.../application/port` and
   `apps/api/.../domain` (read-only for vocabulary; do not edit)
7. Existing `packages/contracts` scaffold
8. `docs/memory/implementer.md`
9. `.cursor/skills/api-contract-change/SKILL.md`
10. This handoff

## Allowed Write Paths

- `docs/api/**`
- `packages/contracts/**`
- This backend lane handoff and its archive
- `docs/memory/implementer.md` (durable lessons only)

## Must Not Touch

- `apps/api/**`
- `packages/mocks/**` (S-03 owns fixtures)
- `apps/web/**`, `packages/ui/**`, and all other frontend paths
- `context.md`, `architecture.md`, `docs/adr/**`
- `docs/handoffs/current.md`
- `docs/handoffs/active/lane-frontend.md`

## Deliverables

1. Canonical OpenAPI contract for identity/workspaces, notes and
   versions, ingestion jobs, search, Ask, vault metadata, usage, runtime
   mode, corpus ownership, and export stub surfaces.
2. Canonical Ask SSE event definitions covering generating, stable claim
   units with citations, completion, and explicit truncation/error.
3. TypeScript contracts generated or aligned from the canonical API
   definition; no hand-maintained conflicting shapes.
4. Contract validation/typecheck tests and documented reproducible
   generation commands.

## Contract Invariants

- Tenant authority comes from the server session; workspace input is a
  selector and never authoritative tenant identity.
- Search and Ask scopes preserve ACL constraints.
- `supported`, `partial`, `no_supported_answer`, `conflict`, and
  `refused_policy` are successful Ask outcomes.
- Citations identify note, version, chunk, passage anchor, preview, and
  optional UTC update/corpus-ownership data.
- Runtime values are exactly `mock`, `operator_free_tier`, and
  `customer_key`; never specify silent fallback.
- Vault responses expose masked metadata only, never plaintext keys.
- Usage may explicitly be unavailable and must not invent billing data.
- Production AI activation remains gated.

## Out of Scope

- Java controllers or changes to B-01 ports
- Mock corpus or MSW handlers (S-03)
- Persistence, migrations, authentication implementation, or adapters
- Frontend UI integration
- Live OpenRouter or other provider calls

## Acceptance Criteria

- OpenAPI and SSE definitions cover the listed architecture surfaces and
  validate successfully.
- `packages/contracts` compiles and is traceable to the canonical API
  definition.
- Success outcomes remain distinct from transport errors.
- No secret-bearing field is returned by vault contracts.
- No changes occur outside the Allowed Write Paths.

## Completion Instructions

1. Record commands and results in this handoff Outcome.
2. Set this handoff to `completed` and archive it under
   `docs/handoffs/archive/`.
3. Do not open frontend work or edit the Commander index.
4. Leave the completed lane head for Commander if the next complete
   backend handoff cannot be authored without expanding these paths.

## Outcome (2026-09-17)

**Completed.** Canonical HTTP/OpenAPI/SSE handshake is in `docs/api/`.
TypeScript in `@omnidoc/contracts` is generated from `openapi.yaml` plus
SSE event-name alignment. `apps/api` and `packages/mocks` were not
modified. Commander index and frontend lane were not touched. B-02 is
not opened here — it needs `apps/api` write paths this handoff cannot
grant.

### Delivered

- `docs/api/openapi.yaml` — OpenAPI 3.1 for identity/workspaces, notes
  and versions, ingestion jobs, lexical/hybrid search, Ask SSE, vault
  metadata, usage, runtime mode, corpus ownership, and export stub.
- `docs/api/ask-sse.md` — `generating` / `claim` / `completed` /
  `truncated` / `error`; Ask success outcomes on `completed`; cancel =
  close connection; `Last-Event-ID` unused in Phase 1.
- `docs/api/README.md` — auth/tenant invariants and generate commands.
- `packages/contracts` — `openapi-typescript` 7.13.0 output in
  `src/generated/openapi.ts`; SSE types in `src/ask-sse.ts`; `appName`
  kept for the web scaffold import.

### Verification

- `pnpm exec nx run contracts:generate` — PASS
- `pnpm exec nx run contracts:typecheck` — PASS
- `pnpm exec nx run contracts:test` — PASS (11 tests)
- `pnpm exec nx run contracts:lint` — PASS
- `git diff --check` — PASS
- Scope: no `apps/api/**`, `packages/mocks/**`, `apps/web/**`,
  `context.md`, `architecture.md`, ADRs, `current.md`, or
  `lane-frontend.md`. Mechanical `pnpm-lock.yaml` update from
  `@omnidoc/contracts` devDependencies.

Archive copy:
`docs/handoffs/archive/H-2026-09-17-P1-S02-implementer-implementer.md`.
Leave this completed lane head for Commander (next BE slice is B-02).

