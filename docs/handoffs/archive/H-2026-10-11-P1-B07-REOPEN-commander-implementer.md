---
handoff_id: H-2026-10-11-P1-B07-REOPEN
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "B-07"
lane: backend
human_owner: back-end-programmer
from: commander
to: implementer
created: 2026-10-11
updated: 2026-10-11
archived: 2026-10-11
---

# B-07 — Lexical / hybrid search

## Start Command

```text
/implementer Read docs/handoffs/active/lane-backend.md and execute B-07 exactly. Implement tenant-scoped PostgreSQL lexical search and deterministic hybrid search behind the existing SearchPort and frozen S-02 HTTP contract; keep B-06d live smoke, Ask/chat, and product live modes dark.
```

## Objective

Owner: `/implementer`. Lane: backend. Human: back-end programmer.
allowed_task_classes: `B-07` only.

Implement PostgreSQL lexical retrieval plus deterministic hybrid composition
behind the existing `SearchPort` and frozen S-02 endpoints, using the completed
B-06 vector path as the hybrid baseline. Keep the accepted B-06d provider probe
strictly optional and out of the normal runtime, CI, and product activation path.

## Required Reading

1. `context.md`
2. `architecture.md` §2, §3, §5.4, §6, and §7
3. `AGENTS.md`
4. `docs/handoffs/current.md` and `docs/planning/implementation-tracks.md` B-06d, B-07, B-08, and B-12
5. `docs/handoffs/archive/H-2026-10-11-P1-B06-commander-implementer.md`
6. `docs/handoffs/archive/H-2026-10-11-P1-B06D-commander-implementer.md`
7. `docs/handoffs/archive/H-2026-10-11-P1-B06D-RETURN-implementer-commander.md`
8. `docs/quality/b06d-avalai-fixture-probe.md`
9. Existing search, embedding, retrieval, and evaluation code under `apps/api/**`
10. `docs/memory/implementer.md`

## Inputs / Evidence

- B-06 is completed and Commander-reviewed. The vector path, tuple metadata,
	tenant/workspace scoping, and mock-only runtime gate are already in place.
- B-06d implementation is complete and archived. The checked-in probe run
	stayed `blocked-before-io`; no AvalAI network request was made.
- Commander consumed the B-06d offline evidence on 2026-10-11 and is not
	holding the backend lane for operator-only live-smoke prerequisites.
- Actual AvalAI account/terms/payment, external key, route, usage/charge, and
	live retrieval observations remain deferred operator evidence. They do not
	authorize product live modes and are not prerequisites for B-07.
- The S-02 search contract remains frozen. No HTTP/OpenAPI change is opened by
	this slice.

## Deliverables

1. Implement tenant-scoped PostgreSQL lexical retrieval behind the existing
	 `SearchPort` and frozen S-02 search endpoints.
2. Implement deterministic hybrid ranking that combines lexical and B-06 vector
	 retrieval without mixing tenants, workspaces, deleted content, stale note
	 versions, or incompatible vector tuples.
3. Add focused automated coverage for lexical search, hybrid composition,
	 snippet safety, workspace/ACL enforcement, and cross-tenant negative cases.
4. Write `docs/quality/b07-retrieval-evaluation.md` with the evaluation set,
	 Recall@K / MRR evidence, zero-isolation-failure checks, and exact commands
	 used.
5. Keep the B-06d probe path intact but untouched unless a failing B-07 test
	 proves an internal search-path defect shared with B-06d.

## Allowed Write Paths

- `apps/api/**`
- `docs/quality/b07-retrieval-evaluation.md`
- `docs/handoffs/active/lane-backend.md`
- `docs/handoffs/archive/**`
- `docs/memory/implementer.md`

## Out of Scope / Must Not Touch

- `apps/web/**`, `packages/ui/**`, `packages/mocks/**`
- `docs/api/**`, `packages/contracts/**`, `architecture.md`, `docs/adr/**`
- `context.md`, `docs/planning/implementation-tracks.md`,
	`docs/handoffs/current.md`, `docs/handoffs/active/lane-frontend.md`
- Live AvalAI account checks, secrets, route troubleshooting, top-ups, or any
	other B-06d operator smoke activity
- B-08 Ask/citation assembly, B-10 vault/usage wiring, B-12 isolation closeout,
	Collections contract work, and Phase Check

## Constraints / Prohibited Decisions

- Preserve the frozen S-02 HTTP contract and existing port boundaries.
- No production AI activation, no customer content submission, and no silent
	fallback into `operator_free_tier` or `customer_key`.
- Provider SDK or live-smoke logic must not leak into normal application
	startup, HTTP flows, or default tests.
- Same tenant/ACL, soft-delete/purge, untrusted-content, and fail-closed rules
	as the vector path remain mandatory.
- If you discover a need for a contract change or architecture reopen, stop and
	return the lane to Commander instead of inventing one.

## Acceptance Criteria

- PostgreSQL lexical retrieval works behind `SearchPort` and the existing S-02
	endpoints with tenant/workspace isolation preserved.
- Hybrid ranking is deterministic, reuses the completed B-06 vector path, and
	rejects incompatible or missing vector metadata rather than mixing results.
- Architecture §7 evaluation evidence is checked in with Recall@K / MRR and
	zero isolation failures.
- `cd apps/api && ./gradlew clean test` passes after the B-07 coverage lands.
- No file changes occur outside Allowed Write Paths.

## Directionality / accessibility checks

- No UI ships in this slice. Any new status/error text remains locale-ready for
	`en` (LTR), makes no RTL-shipped claim, and preserves semantic isolation for
	identifiers and model ids in any logged or rendered examples.

## Stop / escalate conditions

- Soft-stop and return to Commander if B-07 requires an S-02 contract change,
	a new architecture decision, or frontend/shared-lane writes.
- Hard-stop on any request to activate live provider calls in normal runtime,
	store a key in the repository, or widen B-06d beyond the accepted local probe.

## Gates

- Production AI activation remains gated.
- B-06d operator live smoke remains a separate deferred gate and is not part of
	B-07 acceptance.
- B-08 Ask/chat remains closed.
- Phase Check remains unopened until Phase 1 Build exit.

## Completion Instructions

Archive this handoff to `docs/handoffs/archive/H-2026-10-11-P1-B07-REOPEN-commander-implementer.md` before rewriting the backend lane head. Record the exact commands, evaluation evidence, files changed, and any remaining gaps in an Outcome section. Return the lane to Commander for validation; do not self-open B-08, B-12, or any additional backend slice.

## Outcome

### Files Changed

- `apps/api/src/main/java/com/omnidoc/api/adapters/retrieval/JdbcSearchAdapter.java`
- `apps/api/src/main/java/com/omnidoc/api/config/LocalPersistenceConfig.java`
- `apps/api/src/main/java/com/omnidoc/api/web/search/SearchController.java`
- `apps/api/src/main/java/com/omnidoc/api/web/search/SearchDtos.java`
- `apps/api/src/main/java/com/omnidoc/api/web/search/SearchExceptionHandler.java`
- `apps/api/src/main/resources/db/migration/V6__lexical_search_index.sql`
- `apps/api/src/test/java/com/omnidoc/api/retrieval/RetrievalSearchIT.java`
- `apps/api/src/test/java/com/omnidoc/api/retrieval/RetrievalSearchEvaluationIT.java`
- `apps/api/src/test/java/com/omnidoc/api/search/SearchHttpIT.java`
- `docs/quality/b07-retrieval-evaluation.md`
- `docs/memory/implementer.md`

### Commands Run

```text
cd apps/api && ./gradlew test --tests com.omnidoc.api.retrieval.RetrievalSearchIT

cd apps/api && ./gradlew test --tests com.omnidoc.api.retrieval.RetrievalSearchIT --tests com.omnidoc.api.search.SearchHttpIT

cd apps/api && ./gradlew test --tests com.omnidoc.api.retrieval.RetrievalSearchIT --tests com.omnidoc.api.search.SearchHttpIT --tests com.omnidoc.api.retrieval.RetrievalSearchEvaluationIT

cd apps/api && ./gradlew test --tests com.omnidoc.api.retrieval.RetrievalSearchEvaluationIT

cd apps/api && ./gradlew clean test
```

### Evaluation Evidence

- Checked-in report: `docs/quality/b07-retrieval-evaluation.md`
- Captured metrics from `RetrievalSearchEvaluationIT`:
  - lexical Recall@1 `0.800`, Recall@3 `0.800`, MRR `0.800`
  - hybrid Recall@1 `0.800`, Recall@3 `1.000`, MRR `0.867`
- Zero isolation failures were asserted for cross-workspace, cross-tenant,
	stale-version, and soft-deleted negatives; wrong-workspace selector returns
	`FORBIDDEN`.

### Remaining Gaps

- Hybrid quality still rides the deterministic mock embedding path from B-06; a
	live semantic provider remains outside B-07 and still gated.
- B-08 answer synthesis/citations and B-12 dedicated isolation closeout remain
	separate backend slices.