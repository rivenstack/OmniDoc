---
handoff_id: H-2026-10-11-P1-B06
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "B-06"
lane: backend
human_owner: back-end-programmer
from: commander
to: implementer
created: 2026-10-11
completed: 2026-10-11
archived: 2026-10-11
---

# B-06 — pgvector + mock embed adapter

## Start Command

```text
/implementer Read docs/handoffs/active/lane-backend.md and execute B-06 exactly. Implement the mock embedding path and tenant-scoped pgvector persistence/search behind the existing ports, without activating production AI, changing the frozen HTTP contract, or touching the frontend lane.
```

## Objective

Owner: `/implementer`. **Lane:** `backend`. **Human:** back-end programmer.
**allowed_task_classes:** `B-*` only (this handoff = **B-06**).

Ship the first embedding and vector-search slice behind the accepted
architecture ports: deterministic mock embeddings now, pgvector-backed
persistence/search shape now, and production-provider modes still dark.
This task is the backend prerequisite for retrieval/Ask follow-on work, not a
provider-activation or UX-polish slice.

## Required Reading

1. `context.md`
2. `architecture.md` §2, §3 (ingestion → embedding → indexing), §5.3, §5.4,
   and §5.11
3. `AGENTS.md`
4. `docs/planning/implementation-tracks.md` B-06, conditional B-06d, B-07,
   and B-08 dependencies
5. ADR-0001 §4 and ADR-0004 (`accepted`)
6. ADR-0005 Verification / persistence sections as needed
7. `docs/handoffs/archive/H-2026-10-06-P1-B05A-ARCH-commander-architect.md`
   (B-06 handoff contract)
8. `docs/handoffs/archive/H-2026-10-06-P1-B05B-commander-implementer.md`
9. `docs/handoffs/archive/H-2026-10-09-P1-B05C-commander-implementer.md`
10. Existing embedding/vector/search code and tests under `apps/api/**`
11. `docs/memory/implementer.md`

## Inputs / Evidence

- B-05b and B-05c are Commander-accepted; chunk rows and verification are in
  place.
- Architecture §5.3 locks **mock embeddings** to deterministic pseudo-vectors
  from hash with fixed dimensions in `mock` mode.
- Architecture §5.4 locks vector search invariants: **tenant filter
  mandatory**, ACL scope carried through, zero cross-tenant hits tolerated.
- Architecture §5.11 keeps live modes dark for Phase 1 mock work:
  `operator_free_tier` and `customer_key` must still return
  `mode_forbidden` where activation is gated.
- Collections sequencing remains open, but no explicit `@user` resequencing
  moved that contract change ahead of B-06.
- `@user` promoted conditional **B-06d** for an AvalAI development-provider
  PoC. It is not part of B-06 and cannot open until B-06 completes, official
  provider docs are supplied, Researcher evidence and Architect fit return GO,
  and a development key is provided outside the repository.

## Allowed Write Paths

- `apps/api/**`
- `docs/handoffs/active/lane-backend.md`
- `docs/handoffs/archive/**`
- `docs/memory/implementer.md`

## Must Not Touch

- `apps/web/**`, `packages/ui/**`, `packages/mocks/**`
- `docs/api/**`, `packages/contracts/**`, `architecture.md`, `docs/adr/**`
- `context.md`, `docs/planning/implementation-tracks.md`,
  `docs/handoffs/current.md`, `docs/handoffs/active/lane-frontend.md`
- Production provider credentials, vault wiring, or OpenRouter live calls

## Out of Scope

- B-07 lexical/hybrid search beyond what is required to keep B-06 ports honest
- B-06d AvalAI research, architecture, provider calls, SDK wiring, or live
  smoke tests
- B-08 Ask/citation assembly
- B-10 vault + usage + mode production wiring
- Collections contract amendment
- Frontend/browser E2E or UI work
- Phase Check

## Delivered

1. Added additive V5 persistence for `embeddings`, keyed by `chunk_id`, with
   `embedding_model_id`, stored dimensions, tenant/workspace/note/version
   scope, pgvector storage, grants, and RLS.
2. Implemented `MockRuntimeModeAdapter` so `mock` mode resolves and
   `operator_free_tier` / `customer_key` fail closed with `mode_forbidden`.
3. Implemented `MockEmbeddingAdapter` behind `EmbeddingPort` with fixed-dimension
   deterministic pseudo-vectors from SHA-256-derived normalized floats,
   `embedTexts`, and persisted `embedChunks` upserts.
4. Implemented `JdbcVectorSearchAdapter` behind `VectorSearchPort` with tenant
   RLS, workspace/ACL scope checks, soft-delete suppression, and pgvector
   cosine similarity ordering.
5. Wired the new runtime-mode, embedding, and vector-search adapters into the
   local persistence profile without changing the HTTP/OpenAPI surface.
6. Added focused B-06 tests for deterministic vectors, stored model/dimensions,
   tenant/workspace isolation, soft-delete/purge suppression, and live-mode
   fail-closed behavior; updated the migration security matrix for V5.

## Constraints / Prohibited Decisions

- No production AI or live embedding providers were activated.
- No S-02 HTTP/OpenAPI/contracts or frontend files changed.
- No tenant isolation, RLS, or CSRF protections were weakened.
- No silent runtime-mode fallback was introduced.
- No AvalAI/provider-specific assumptions were added.

## Acceptance Criteria

- `cd apps/api && ./gradlew clean test` passes with B-06 coverage included.
- Mock embedding and vector-search behavior is deterministic and repeatable.
- Every embedding/vector row remains tenant-scoped and keyed to the existing
  chunk identity contract.
- Similarity search enforces tenant filtering with zero cross-tenant hits.
- `operator_free_tier` and `customer_key` remain unavailable in Phase 1 mock
  mode, returning `mode_forbidden` rather than falling through.
- No changes occur outside Allowed Write Paths.

## Directionality / accessibility checks

- No UI ships in this slice. Status/error naming remains locale-ready for `en`
  LTR and makes no RTL-shipped claim.

## Verification Results

```text
cd apps/api && ./gradlew test --tests com.omnidoc.api.retrieval.RetrievalVectorSearchIT --tests com.omnidoc.api.persistence.IngestionMigrationIT
BUILD SUCCESSFUL in 8s

cd apps/api && ./gradlew clean test
BUILD SUCCESSFUL in 1m 8s
```

## Security and Performance Notes

- Vector rows stay under the runtime-role `NOBYPASSRLS` posture; all ordinary
  embedding and search SQL runs with the tenant GUC bound on the same
  connection inside a transaction.
- Search applies workspace scope in the retrieval SQL path and suppresses
  soft-deleted note content before ranking results.
- Purge removes vector state through the existing corpus cleanup path plus the
  `embeddings.chunk_id -> chunks.chunk_id` cascade.
- Live embedding modes remain dark; no provider credentials or outbound
  provider calls were introduced.

## Residual Risks

- `SearchPort` lexical/hybrid behavior remains for B-07; B-06 only covers the
  vector path and runtime-mode gate required for it.
- The mock adapter currently supports the single fixed model
  `mock-embeddings-v1`; any multi-model retrieval shape remains future work.
- B-06d remains separately gated and was not opened by this slice.

## Outcome

**Completed 2026-10-11.** B-06 is implemented and the full backend acceptance
gate passed. Backend lane returns to Commander for the next sequencing
decision; do not self-open B-06d, B-07, or B-08 from this archive.