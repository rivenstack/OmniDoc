---
handoff_id: H-2026-10-11-P1-B06D-ARCH-RETURN
affinity: coordination
track: parallel
status: blocked
phase: "1"
task: "B-06d"
lane: backend
human_owner: back-end-programmer
from: architect
to: commander
created: 2026-10-11
---

# B-06d — Architect decision returned to Commander

## Start Command

```text
/commander Read docs/handoffs/current.md and the live lane-*.md files under docs/handoffs/active/. Review the archived B-06d Architect decision and the proposed ADR-0004 exception; obtain the required user decision before opening any Implementer work.
```

## Objective

Owner: `/commander`. Lane: backend. Human: back-end programmer.
allowed_task_classes: B-06d decision review, user gate, and same-lane sequencing only.
Architect has returned a conditional design; this lane is blocked on the
user's proposed ADR-0004 exception decision. B-07 remains listed and
unexecuted. Commander alone opens a subsequent same-lane handoff.

## Required Reading

1. `context.md`, `architecture.md` §5.3.1, `AGENTS.md`, `docs/handoffs/current.md`
2. `docs/handoffs/archive/H-2026-10-11-P1-B06D-ARCH-commander-architect.md`
3. `docs/adr/ADR-0004-dual-mode-byok-and-usage.md` proposed B-06d exception
4. `docs/research/technical/17-avalai-development-provider-poc.md`
5. `docs/planning/implementation-tracks.md` B-06d/B-07 and `docs/handoffs/README.md`

## Inputs / Evidence

- Architect disposition: `GO_WITH_CONDITIONS` for exactly AvalAI
  `text-embedding-v4` at 1024 dimensions, S-03-only, local development.
  The complete architecture design and evaluation thresholds are locked
  in `architecture.md` §5.3.1. No key, account action, live request,
  implementation or production activation occurred.
- Accepted ADR-0001 §5 and ADR-0004 currently block pre-CX live modes.
  A narrow exception to both timing clauses is **proposed but not
  accepted** at the end of ADR-0004.
  Researcher documentation did not verify routed behavior, input cap,
  account charge, key controls or retrieval quality.
- B-06 V5 stores one model per chunk; B-06 vector search currently
  hard-codes mock dimensions and lacks a model filter. The conditional
  design uses two disposable fixture databases and exact model/dimension
  filtering, retaining the deterministic mock baseline.

## Allowed Write Paths

- `docs/handoffs/active/lane-backend.md` and `docs/handoffs/archive/**`
- `docs/handoffs/current.md`, `context.md`, and backend rows of
  `docs/planning/implementation-tracks.md` under Commander ownership
- `docs/adr/ADR-0004-dual-mode-byok-and-usage.md` only to record the
  user's explicit accept/reject decision on the proposed exception

## Out of Scope / Must Not Touch

- `apps/api/**`, `apps/web/**`, `packages/**`, `docs/api/**`, frontend lane
- Secrets, `.env*`, provider account state, live AvalAI requests,
  customer notes, production AI, B-07 implementation and B-08 Ask/chat
- An implicit ADR acceptance or silent switch to 2048/Gemini/OpenRouter

## Deliverables

1. Review the archived Architect design and proposed ADR amendment.
2. Put the concrete B-06d pre-CX exception to `@user` for accept/reject;
   record that decision in ADR-0004 if supplied.
3. If accepted, open one bounded B-06d Implementer handoff using
   `architecture.md` §5.3.1 and the gates below. If rejected, record
   NO-GO for the live probe and resume the preserved B-07 handoff.
4. Preserve the separate account/terms/payment decision before any live
   smoke and require a local key-setup/API-check runbook from Implementer
   after an accepted design gate. Do not collect the key in chat or repo.

## Constraints / Prohibited Decisions

Keep `mock | operator_free_tier | customer_key`, mock default and no
silent fallback. The proposed exception covers only one local S-03
embedding runner and expires with B-06d. Do not reinterpret it as
production OpenRouter or customer-BYOK authorization. No alternative
model selection, new HTTP surface, UI, schema migration, Ask/chat or
provider data-handling approval is implied.

## Acceptance Criteria

- User decision on the ADR exception is explicit and persisted before
  Implementer assignment; the account/terms/payment gate remains visible.
- Any Implementer ticket freezes a versioned S-03 query/relevance set
  before live responses, keeps CI offline, uses disposable databases,
  compares Recall@1/3 and MRR with B-06, and fails on any forbidden hit.
- Rejected exception returns B-07 without a live B-06d probe.
- No UI ships; product locale remains `en` LTR, RTL locale deferred.
  Later displayed provider IDs/UGC require semantic isolation and
  accessible labels/focus behavior.

## Stop / Escalate Conditions

Soft-stop pending the user ADR decision. A separate user account/terms/
payment decision is required before any live request; unresolved privacy
continues to bar customer content. Hard-stop on key handling, live call,
production activation, write-path collision or silent ADR change.

## Dependencies / Risks

The provider pages and price are dated snapshots. AvalAI says 1024 input
tokens in its table while Alibaba reports 8192 upstream. The route may
reject 1024 dimensions or differ in charge/retention. Existing B-06
search needs explicit model/dimension guards for the candidate. B-07 is
preserved and remains next after B-06d completion or NO-GO.

## Gates

Researcher and Architect slices are complete; neither authorizes a live
call. `@user` acceptance of the ADR-0004 exception precedes Implementer
assignment. `@user` approval of current AvalAI account/terms/payment
eligibility precedes a live smoke. The development key enters only
through the approved external local mechanism after those decisions.
Production AI, customer data, B-08 Ask/chat and Phase Check remain closed.

## Completion Instructions

Commander records the user decision and the next sole lane owner in a
new backend handoff. Archive this return handoff before rewriting the
lane head. Update its own index/status files; preserve other-lane work.

## Outcome

Architect completed and archived
`docs/handoffs/archive/H-2026-10-11-P1-B06D-ARCH-commander-architect.md`
on 2026-10-11. Waiting on the explicit user ADR exception decision;
Implementer and B-07 remain unopened.

## Commander Review / Consumed 2026-10-11

Commander verified the archived Architect handoff, the design lock in
`architecture.md` §5.3.1, the Researcher evidence, and the proposed
ADR-0004 text. `@user` accepted the bounded decision and exception in
the subsequent Commander request. ADR-0004 now records that acceptance.
This return was consumed before opening the sole B-06d Implementer
handoff at `docs/handoffs/active/lane-backend.md`. No account or live
route behavior was verified, no key was handled, and no provider call
was made during Commander review. B-07 remains deferred until B-06d
completion or NO-GO.
