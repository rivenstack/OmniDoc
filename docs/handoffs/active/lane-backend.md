---
handoff_id: H-2026-09-17-P1-S02
affinity: implementation
track: parallel
status: ready
phase: "1"
task: "S-02"
lane: backend
human_owner: back-end-programmer
from: implementer
to: implementer
created: 2026-09-17
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
