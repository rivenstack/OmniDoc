---
name: migration-safety
description: "Plan or review an OmniDoc relational, pgvector, document-version, chunk-schema, embedding-model, index, or authorization migration with compatibility, backfill, recovery, and verification."
paths:
  - "backend/**"
  - "infra/**"
  - "docs/adr/**"
---

# Migration Safety

Use for any persistent-data evolution.

## Procedure

1. Identify current and target representation.
2. Identify affected reads/writes and deployed components.
3. Classify migration:
   - metadata/schema only;
   - backfill;
   - destructive;
   - re-embedding/re-chunking;
   - index rebuild;
   - authorization/tenant model.
4. Define compatibility window:
   - can old code read new data?
   - can new code read old data?
   - must dual-read/dual-write be used?
5. Estimate operational risks:
   - table/index locks;
   - write amplification;
   - vector index build;
   - backfill duration;
   - provider embedding limits/cost;
   - partial failure.
6. Make backfill/reprocessing idempotent and observable.
7. Define resume/retry semantics.
8. Define rollback or forward-recovery strategy.
9. Verify backups/recovery assumptions for destructive changes.
10. Add migration tests and post-migration invariants.
11. Never delete old representation before verification and the accepted removal point.

## Embedding-specific checks

- store embedding model/version;
- prevent mixing incompatible dimensions/models in one search path;
- keep source document/version/chunk identity;
- make re-embedding restartable;
- define index rebuild/cutover.
