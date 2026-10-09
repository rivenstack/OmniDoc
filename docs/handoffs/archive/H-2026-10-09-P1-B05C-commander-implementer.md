---
handoff_id: H-2026-10-09-P1-B05C
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "B-05c"
lane: backend
human_owner: back-end-programmer
from: commander
to: implementer
created: 2026-10-09
completed: 2026-10-09
archived: 2026-10-09
---

# B-05c — Ingestion test closeout + guided verification

## Start Command

```text
/implementer Read docs/handoffs/active/lane-backend.md and execute B-05c exactly. Close the ingestion verification matrix, add the API-level E2E, Postman and bounded load smoke, and write the guided verification walkthrough. Fix only defects proved inside the accepted B-05a/B-05b behavior. Do not redesign ingestion, open B-06, touch the frontend lane, or activate production AI.
```

## Objective

Owner: `/implementer`. Lane: `backend`. Complete the B-05 verification
matrix around the accepted B-05a design and B-05b product code without
changing the frozen HTTP contract, architecture, chunk policy, parser
allowlist, progress model, worker topology, or provider gates.

## Required Reading

1. `context.md`; `architecture.md` §2, §4, §5.2–§5.2.1, §6
2. `AGENTS.md`; `.codex/INSTRUCTIONS.md`; `.agent/CONVENTIONS.md`
3. `docs/planning/implementation-tracks.md` B-05c / B-06
4. ADR-0005 §7 and Verification
5. Archived B-05b and S-03 handoffs
6. Read-only S-03 fixtures and frontend markdown bridge
7. Existing API tests, Postman, and load artifacts

## Allowed Write Paths

- `apps/api/**` — tests, resources, Postman, load artifacts, and only
  proved B-05 defect fixes
- `docs/quality/b05c-verification-walkthrough.md`
- Backend lane handoff and this archive
- `docs/memory/implementer.md` for durable lessons

No frontend/shared package, architecture, ADR, OpenAPI, planning,
`context.md`, `current.md`, or frontend-lane writes were authorized.

## Delivered

### Projection and chunk determinism

- Added an S-03 rich-formatting ProseMirror fixture, exact Java
  `pm-md-v1` golden, actual frontend-bridge golden, and machine-checked
  parity manifest under `apps/api/src/test/resources/b05c/projection/`.
- Executed the real UI bridge in Vitest/jsdom: its output is byte-identical
  to the Java projection, so the reviewed allowed-delta list is empty.
- Pinned SHA-256 values for the frontend bridge, table normalizer, and S-03
  fixture source; backend tests now fail when the captured parity input is
  stale.
- Expanded `BlockPackChunkerTest` to 20 representative dynamic fixtures,
  each run twice with exact record, id, text, offset, block-anchor, hash, and
  ordering comparisons. Heading mutation behavior is version-scoped.

### Migration, RLS, jobs, and formats

- Added `IngestionMigrationIT` using isolated PG18+pgvector databases for:
  fresh V1→V4, populated V3→V4, forward-only preservation, empty new tables,
  FORCE RLS, runtime DML grants, missing-GUC fail-closed behavior, cross-tenant
  DML denial, job constraints, `NOBYPASSRLS`, and app-only claim execution.
- Extended `IngestionWorkerIT` for all five supported formats, corrupt PDF,
  parse timeout interruption, whole-job deadline, `partial` at `4/4`,
  terminal payload deletion, terminal transition guards, two concurrent
  `SKIP LOCKED` claimers, and duplicate-free crash reclaim.
- Existing membership revocation, outbox coalescing, purge cleanup, policy
  conflict, and tenant/workspace negatives remain active.
- Renamed the HTTP suite to `IngestionLifecycleE2eIT`; its public multipart
  flow proves enqueue `0/4` → bounded poll → terminal `4/4` → persisted
  note/version/chunks while retaining 413/415, CSRF, anonymous, workspace,
  tenant, and unknown-job negatives.
- Expanded canonical port failure mapping assertions for ingestion codes.
- No production defect was proved; product code, migrations, ports, and wire
  contracts were unchanged.

### Operator artifacts

- Added `omnidoc-b05c-ingestion.postman_collection.json` with bounded polling
  and stable error-code assertions; extended the existing local environment
  backward-compatibly.
- Added executable `apps/api/load/b05c-ingestion-smoke.sh`, capped at 25
  cycles and 100 polls, with finite waits, note cleanup, and p50/p95 output.
- Added small offline Markdown, PDF, and DOCX fixtures; parser tests prove the
  checked-in binary fixtures are valid.
- Added `docs/quality/b05c-verification-walkthrough.md` with exact startup,
  five-format import, progress, chunk inspection, 413/415, isolation,
  reclaim/concurrency, load, cleanup, and troubleshooting commands.

## Verification Matrix

| Requirement | Evidence |
|---|---|
| S-03 Java/FE parity and reviewed deltas | `S03ProjectionParityTest` |
| 2 × 20+ deterministic chunk fixtures | `BlockPackChunkerTest` (29 tests total) |
| Fresh and populated Flyway paths | `IngestionMigrationIT` |
| RLS, grants, claim boundary, direct DML | `IngestionMigrationIT` |
| Five formats, corrupt data, parse/job timeout | `IngestionWorkerIT`, `TikaImportParserTest` |
| Reclaim, dual claimers, revocation, outbox, purge | `IngestionWorkerIT` |
| Public multipart E2E and HTTP security/failures | `IngestionLifecycleE2eIT` |
| Operator observations | B-05c Postman, bounded smoke, walkthrough |

## Verification Results

```text
cd apps/api && ./gradlew clean test
BUILD SUCCESSFUL in 1m 2s
136 tests, 0 failures, 0 errors, 0 skipped

Focused B-05c suites:
BUILD SUCCESSFUL in 40s

Frontend parity capture:
Vitest 1 file / 1 test passed; frontend output byte-identical to Java

python3 -m json.tool apps/api/postman/omnidoc-b01-b04.postman_collection.json
python3 -m json.tool apps/api/postman/omnidoc-b05c-ingestion.postman_collection.json
python3 -m json.tool apps/api/postman/local.postman_environment.json
PASS

bash -n apps/api/load/b05c-ingestion-smoke.sh
PASS

git diff --check
PASS
```

The Postman collection, bounded load smoke, and guided walkthrough were not
claimed as run against a separately started manual local stack; their JSON,
shell syntax, fixture parsing, and equivalent API behavior are automated.

## Security, Performance, and Recovery

- Runtime tests use `omnidoc_app` as non-owner `NOBYPASSRLS`; no RLS,
  CSRF, or function grants were weakened.
- No payload, note body, credential, or provider secret is logged or committed.
- No embedding/vector writes or production AI calls were added.
- Test inputs are deterministic, offline, and bounded. Load defaults to five
  imports and cleans up each note.
- V4 remains additive and forward-only; recovery is repair-and-rerun, not a
  downgrade or manual Flyway-history rewrite.

## Residual Risks

- The frontend parity snapshot intentionally fails on any hashed bridge or
  fixture change and then requires deliberate recapture/review.
- Testcontainers startup remains the dominant test cost; the full clean suite
  stayed near the established one-minute baseline.
- Browser import E2E remains optional and unrun; no browser tooling was added.
- B-06, production AI, RTL locale, and Collections sequencing remain gated.

## Acceptance

All B-05c automated matrix rows map to passing tests; operator-only rows map
to exact walkthrough steps. No changes were made outside the handoff's
Allowed Write Paths by this implementation, and no B-06 work was opened.

## Outcome

**Completed 2026-10-09.** B-05c verification closeout is ready for Commander
validation. Backend lane is soft-stopped waiting on Commander to choose the
next backend slice.

