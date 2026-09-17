---
handoff_id: H-2026-09-16-P1-B01
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "B-01"
lane: backend
human_owner: back-end-programmer
from: commander
to: implementer
created: 2026-09-16
completed: 2026-09-17
---

# B-01 — Domain port interfaces (Java)

## Objective

Create thin, language-native Java port interfaces for
`architecture.md` §5.1–§5.11 inside `apps/api`. Keep public contracts
provider-neutral and ready for the S-02 OpenAPI handshake. Do not add
production adapters or make TypeScript `packages/domain` the backend
source of truth.

## Authorized Scope

- `apps/api/**` domain/application port packages and tests
- This handoff and its archive
- `docs/memory/implementer.md` for durable lessons only

Frontend paths, architecture, ADRs, `context.md`, the Commander index,
and the frontend lane were excluded.

## Delivered

- Added Java port interfaces for notes, ingestion, embedding, vector
  search, lexical/hybrid search, cited answers, identity, export,
  credential vault, usage, and runtime mode.
- Added only signature-supporting domain records, typed IDs, results,
  failure codes, answer events, and runtime-mode values.
- Canonical runtime values map exactly to `mock`,
  `operator_free_tier`, and `customer_key`; no fallback contract exists.
- Vector, lexical, hybrid, and Ask requests carry tenant-bound actor and
  ACL scope.
- Identity and all other public ports contain no Spring Security,
  reactive, HTTP, persistence, or provider types.
- Added optional corpus ownership data without implementing B-09 policy.
- Strengthened ArchUnit coverage for framework-neutral domain and port
  packages and added focused port-contract tests.

## Verification

- `cd apps/api && ./gradlew test` — PASS
- `cd apps/api && ./gradlew build` — PASS
- Existing actuator health test — PASS
- ArchUnit boundary rules — PASS
- `git diff --check` — PASS
- Scope scan found no Spring/reactive/HTTP types or competing OpenAPI
  contract in the new public ports.

## Outcome

**Completed.** B-01 acceptance criteria are satisfied. No production
adapter, provider SDK, migration, frontend source, Better Auth code, or
live-AI configuration was added. The next backend lane head is S-02.
