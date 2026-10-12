---
handoff_id: H-2026-10-11-P1-B08
affinity: implementation
track: parallel
status: blocked
phase: "1"
task: "B-08"
lane: backend
human_owner: back-end-programmer
from: commander
to: implementer
created: 2026-10-11
updated: 2026-10-11
archived: 2026-10-12
---

# B-08 — Ask port mock adapter + citation assembler

## Start Command

```text
/implementer Read docs/handoffs/active/lane-backend.md and execute B-08 exactly. Implement the mock ask adapter and citation assembler behind the existing AnswerPort and frozen S-02 ask/SSE contracts; preserve tenant/workspace isolation, keep production AI modes dark, and do not touch the frontend lane.
```

## Objective

Owner: `/implementer`. Lane: backend. Human: back-end programmer.
allowed_task_classes: `B-08` only.

Implement the first backend ask-your-notes slice behind the existing
`AnswerPort` and frozen S-02 ask/SSE contracts. This slice must return only
the accepted answer outcome states, assemble passage-level citations from
authorized retrieval results, and stay entirely in mock mode. It is the backend
prerequisite for F-07 ask UI and for B-12 isolation closeout.

## Required Reading

1. `context.md`
2. `architecture.md` §2, §3, §4, and §5.6
3. `AGENTS.md`
4. `docs/api/ask-sse.md`
5. `docs/planning/implementation-tracks.md` B-07, B-08, B-09, and B-12 rows
6. `docs/handoffs/current.md`
7. `docs/handoffs/archive/H-2026-10-11-P1-B07-REOPEN-commander-implementer.md`
8. `docs/handoffs/archive/H-2026-10-11-P1-B07-RETURN-implementer-commander.md`
9. `apps/api/src/main/java/com/omnidoc/api/application/port/AnswerPort.java`
10. `apps/api/src/main/java/com/omnidoc/api/domain/AnswerModels.java`
11. Existing retrieval/search/runtime-mode code and tests under `apps/api/**`
12. `docs/memory/implementer.md`

## Inputs / Evidence

- B-07 is Commander-validated PASS. Lexical retrieval, deterministic hybrid
	fusion, and architecture §7 evaluation evidence are already accepted.
- `AnswerPort` and the answer/citation domain models already exist, including
	the required success outcomes and passage-level citation shape.
- The S-02 ask contract is frozen: `POST /api/v1/ask` plus the canonical SSE
	event contract in `docs/api/ask-sse.md`.
- Architecture §4 and §5.6 lock the trust boundary: refusal is success,
	citations must be openable under the bound ACL, retrieved text is data rather
	than instructions, and answers are never auto-written into the corpus.
- Production AI activation remains gated. `operator_free_tier` and
	`customer_key` must stay dark in ordinary Phase 1 runtime flows.

## Deliverables

1. Implement a deterministic mock `AnswerPort` adapter for `ask` and
	`askStreaming` that emits only the accepted S-02/architecture answer states.
2. Implement citation assembly from authorized retrieval results with durable
	`noteId`, `versionId`, `chunkId`, passage offsets, preview text, and any
	available corpus ownership / updated-at fields.
3. Wire the ask HTTP/SSE endpoint on the frozen contract, including pre-stream
	JSON failures and post-open terminal SSE events.
4. Add focused automated coverage for ask outcomes, SSE framing, ACL/workspace
	enforcement, citation safety, refusal/no-supported-answer semantics, and live
	mode fail-closed behavior.
5. Leave B-09 sample-vs-mine labeling, B-10 vault/usage wiring, and B-12 full
	isolation closeout as separate follow-on slices.

## Allowed Write Paths

- `apps/api/**`
- `docs/handoffs/active/lane-backend.md`
- `docs/handoffs/archive/**`
- `docs/memory/implementer.md`

## Out of Scope / Must Not Touch

- `apps/web/**`, `packages/ui/**`, `packages/mocks/**`
- `docs/api/**`, `packages/contracts/**`, `architecture.md`, `docs/adr/**`
- `context.md`, `docs/planning/implementation-tracks.md`,
	`docs/handoffs/current.md`, `docs/handoffs/active/lane-frontend.md`
- Production provider credentials, OpenRouter/AvalAI live calls, vault
	wiring, or any product live-mode activation
- B-09 sample-vs-mine labeling beyond fields already available in the current
	corpus data
- B-10 vault + usage + mode mocks, B-11 export, B-12 isolation closeout, and
	any Collections contract work

## Constraints / Prohibited Decisions

- Preserve the frozen S-02 ask HTTP/OpenAPI/SSE contract and the existing port
	boundaries.
- Do not invent new success states, transport events, or frontend-visible
	payload fields outside the accepted contract.
- `no_supported_answer`, `partial`, `conflict`, and `refused_policy` are
	success outcomes, not HTTP failures.
- Citations that cannot be opened against the authorized note version and chunk
	must be dropped rather than guessed.
- Keep ordinary runtime behavior mock-only and fail closed for
	`operator_free_tier` and `customer_key`.
- If you discover a need for a contract change or an architecture reopen, stop
	and return the lane to Commander instead of widening the slice.

## Acceptance Criteria

- `AnswerPort` mock ask behavior is deterministic and covers the accepted
	outcome vocabulary from architecture §4.
- The ask HTTP/SSE surface matches `docs/api/ask-sse.md`, including stable
	claim units, exactly one terminal event, and pre-stream JSON errors.
- Citation payloads always identify an authorized note/version/chunk passage and
	never reference purged, soft-deleted, stale-version, or wrong-workspace data.
- `operator_free_tier` and `customer_key` remain unavailable in Phase 1 mock
	mode, returning `mode_forbidden` or the existing fail-closed behavior instead
	of silently falling through.
- `cd apps/api && ./gradlew clean test` passes after the B-08 coverage lands.
- No file changes occur outside Allowed Write Paths.

## Directionality / accessibility checks

- No UI ships in this slice. Any new status/error text remains locale-ready for
	`en` (LTR), makes no RTL-shipped claim, and preserves semantic isolation for
	identifiers, model ids, and code-like values in rendered/logged examples.

## Stop / escalate conditions

- Soft-stop and return to Commander if B-08 requires an S-02 contract change,
	a new architecture decision, or frontend/shared-lane writes.
- Hard-stop on any request to activate live provider calls in normal runtime,
	store a key in the repository, or widen this slice into B-09, B-10, B-11,
	or B-12.

## Gates

- Production AI activation remains gated.
- B-06d operator live smoke remains deferred and separate.
- B-09 sample/mine labelling, B-10 vault/usage, and B-12 isolation closeout
	remain separate backend slices.
- Phase Check remains unopened until Phase 1 Build exit.

## Completion Instructions

Archive this handoff to `docs/handoffs/archive/H-2026-10-11-P1-B08-commander-implementer.md`
before rewriting the backend lane head. Record the exact commands, files
changed, focused ask/SSE validation, and any remaining gaps in an Outcome
section. On completion, return the lane to Commander for validation; do not
self-open B-09, B-10, B-11, or B-12.

## Outcome

Superseded before execution by the user's 2026-10-12 direction to research
AvalAI Ask model selection, record a bounded local/demo Ask exception, and
then implement mock and live Ask sequentially inside B-08. No implementation
work was performed under this handoff. Commander opened a Researcher-first
B-08 lane head; the prior mock-only scope is retained here as history.
