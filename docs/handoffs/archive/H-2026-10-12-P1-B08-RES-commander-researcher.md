---
handoff_id: H-2026-10-12-P1-B08-RES
affinity: research
track: parallel
status: completed
phase: "1"
task: "B-08"
lane: backend
human_owner: back-end-programmer
from: commander
to: researcher
created: 2026-10-12
updated: 2026-10-12
archived: 2026-10-12
---

# B-08 — AvalAI Ask model research

## Start Command

```text
/researcher Read docs/handoffs/active/lane-backend.md and execute the B-08 Ask model research exactly. Return evidence and a pinned recommendation to Commander for Architect review.
```

## Objective

Owner: `/researcher`. Lane: backend. allowed_task_classes: `B-08 model/provider research only`.
The user expanded B-08 on 2026-10-12: research an AvalAI chat or reasoning model
for grounded Ask in a controlled local/demo application, then route a bounded
architecture exception before implementation. Exactly one primary owner is
active in this lane at a time.

## Required Reading

Read `context.md`, `architecture.md` §§2–5.6, `AGENTS.md`,
`docs/handoffs/current.md`, `docs/planning/implementation-tracks.md` B-08/B-09,
`docs/adr/ADR-0001-frontend-and-platform-stack.md` §5,
`docs/adr/ADR-0004-dual-mode-byok-and-usage.md`, `docs/api/ask-sse.md`,
and `docs/research/technical/17-avalai-development-provider-poc.md`.

## Inputs / Evidence

- The original mock-only B-08 handoff is archived as superseded before execution.
- B-06d implemented a separate embedding probe, not an application Ask adapter.
- The user reports a successful live embedding probe and an external key; checked-in
  B-06d evidence remains older and `blocked-before-io`. Treat the user's result
  as reported, not independently verified.
- User choices: real application API in local/demo only; public or synthetic
  notes only; combined B-08 plus pre-B-09 checkpoint live spend cap **$5**.

## Deliverables

1. Date-stamped, attributable comparison of at most three serious AvalAI
   chat/reasoning choices on current model availability, input/output cost,
   account-route availability, latency, context, grounding and refusal fitness,
   provider data handling, and failure behavior.
2. Frozen public/synthetic Ask evaluation set covering supported, partial,
   conflict, unsupported, policy refusal and retrieved prompt injection.
3. One pinned model recommendation, or a two-model routing recommendation only
   if measured quality and effective cost justify its extra complexity. Specify
   exact IDs, request limits and acceptance thresholds; label unrun live
   comparisons honestly. Use the provider's per-request transaction costs when
   a live comparison is later authorized. Do not spend from the $5 budget
   before the Architect's live-test gate.
4. Evidence report under `docs/research/technical/**` and a return handoff
   for Commander to assign the Architect slice.

## Allowed Write Paths

- `docs/research/technical/**`
- `docs/handoffs/active/lane-backend.md`
- `docs/handoffs/archive/**`
- `docs/memory/researcher.md`

## Out of Scope / Constraints

No application code, frontend/shared-lane edits, S-02 contract changes,
ADR/architecture edits, secret handling or live Ask network calls. Do not
turn provider documentation into a measured quality claim. Keep customer
content, customer deployments and B-09/B-10/B-12 outside this slice.

## Acceptance Criteria

Evidence separates provider claims, direct observations, inferences and
unknowns; cites current primary sources; specifies a cost-bounded model
recommendation and falsifiable Ask evaluation. No provider I/O occurs before
Architect authorization. English LTR is primary; no RTL locale claim.

## Stop / Escalate Conditions

Return to Commander if the candidate needs an S-02 change, conflicts with
the existing mode vocabulary, or requires customer-content processing.

## Gates

The accepted B-06d exception has expired and excludes Ask. Architect must
amend the gate before live Ask evaluation or application use. Production and
customer-data activation remain closed. Combined spend cap: $5.

## Completion Instructions

Archive this handoff with evidence and exact commands, then return the lane
to Commander for an Architect handoff. Do not self-open implementation.

## Outcome

Researcher report: `docs/research/technical/18-b08-avalai-ask-model.md`.
Read-only catalogue command:
`curl -fsS https://api.avalai.ir/public/models | jq ...` (three exact
candidate IDs and published prices extracted). No authenticated call or
account charge. Provisional pinned recommendation: `gemini-2.5-flash`.
Live route, quality, latency, account price and upstream data handling
remain unverified and are explicit Architect/Implementer gates.
