---
handoff_id: H-2026-10-06-P1-B05B
affinity: implementation
track: parallel
status: blocked
phase: "1"
task: "B-05b"
lane: backend
human_owner: back-end-programmer
from: implementer
to: commander
created: 2026-10-06
updated: 2026-10-06
---

# Backend lane — soft-stopped after B-05b

## Outcome

**waiting on commander for B-05c**

B-05b (IngestionPort — jobs + progress) is **completed** and archived at
`docs/handoffs/archive/H-2026-10-06-P1-B05B-commander-implementer.md`.
That archive carries the full Outcome: commands, per-deliverable results,
file inventory, interpretations, and soft-stops.

Gate result:

```text
cd apps/api && ./gradlew clean test
BUILD SUCCESSFUL — 100 tests, 0 failures, 0 errors, 0 skipped
```

## Lane state

- **Shipped:** Flyway `V4` (`ingestion_jobs`, `ingestion_job_payloads`,
  `chunk_sets`, `chunks`, `claim_ingestion_job`, RLS + `omnidoc_app`
  grants), `pm-md-v1` projector, `omni-blockpack-v1` chunker, Tika +
  commonmark parser adapter, `JdbcIngestionAdapter` + `@Async`/`@Scheduled`
  runner, coalesced rechunk outbox on version commit, S-02 HTTP surface,
  ArchUnit §7 rules, unit + Testcontainers ITs.
- **Not shipped, by design:** B-05c closeout (full verification matrix,
  Postman collection, guided walkthrough) and B-06 (pgvector, embeddings,
  similarity search). No embedding column exists; `chunks` holds text and
  anchors only.
- **Unchanged:** `context.md`, `architecture.md`, `docs/adr/**`,
  `docs/api/**`, `docs/planning/**`, `docs/handoffs/current.md`,
  `lane-frontend.md`, `packages/**`, `apps/web/**`.

## Why this lane is blocked

The next backend task is **B-05c**, which Commander owns opening. Per the
B-05b Completion Instructions, the implementer must not author B-05c or
B-06. Backend iteration stops here until Commander accepts the B-05b
archive and issues the next ticket into this lane head.

## For Commander — inputs to the B-05c decision

Three implementation interpretations are recorded in the archive and may
deserve confirmation when B-05c is scoped. None reopened a locked choice:

1. `softMinChars=300` read as compatible with the unconditional heading
   break — it only suppresses an avoidably tiny hard-split tail.
2. A zip renamed `.docx` passes Tika content detection (DOCX specializes
   `application/zip`) and fails at parse time as `unsupported_type`.
3. `projection_sha256` hashes the projection, not the `jsonb` round-trip,
   because Postgres does not preserve `body_json` byte order.

## Gates still closed

- Production AI activation remains gated; no live OpenRouter call exists.
- Better Auth remains out; session identity is the B-03 JDBC adapter.
- RTL locale remains deferred (not closed); this slice ships no UI.
- Phase Check not opened.
