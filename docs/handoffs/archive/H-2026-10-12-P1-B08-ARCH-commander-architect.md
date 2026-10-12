---
handoff_id: H-2026-10-12-P1-B08-ARCH
affinity: architecture
track: parallel
status: completed
phase: "1"
task: "B-08"
lane: backend
human_owner: back-end-programmer
from: commander
to: architect
created: 2026-10-12
updated: 2026-10-12
archived: 2026-10-12
---

# B-08 — Local/demo AvalAI Ask boundary

## Start Command

```text
/architect Read docs/handoffs/active/lane-backend.md and decide the bounded B-08 local/demo AvalAI Ask exception from the Researcher report. Record the ADR amendment before returning to Commander.
```

## Objective

Owner: `/architect`. Lane: backend. allowed_task_classes:
`B-08 architecture exception only`. The user authorized a real
application API Ask path in a controlled local/demo environment on
public/synthetic notes, with a shared $5 B-08/checkpoint live spend cap.
Production and customer-note activation remain closed.

## Required Reading

`context.md`, `architecture.md` §§2–5.6, `AGENTS.md`,
`docs/handoffs/current.md`, `docs/api/ask-sse.md`,
`docs/research/technical/18-b08-avalai-ask-model.md`,
`docs/adr/ADR-0001-frontend-and-platform-stack.md` §5,
`docs/adr/ADR-0004-dual-mode-byok-and-usage.md`, and the archived
Researcher handoff.

## Inputs / Evidence

Researcher provisionally pinned `gemini-2.5-flash` after a read-only
three-candidate provider-catalogue comparison. No live Ask quality,
route, latency or account price was measured. B-06d is a test-source
embedding probe only; its exception expired and excludes Ask.

## Deliverables

1. Accepted, bounded ADR-0004 amendment authorizing local/demo
   `operator_free_tier` Ask through the real API, conditional on exact
   selected model and account checks, while preserving mock default.
2. Server-enforced demo workspace/environment scope, approved
   public/synthetic data boundary, secret source, request/token and
   cumulative $5 controls, no fallback, and terminal failure behavior.
3. Reproducible live acceptance/rollback and criteria for returning
   to Researcher if the model fails. Keep S-02 and AnswerPort frozen.
4. Archive this handoff and return to Commander for a revised
   Implementer handoff.

## Allowed Write Paths

- `docs/adr/ADR-0004-dual-mode-byok-and-usage.md`
- `architecture.md` (only if a cross-cutting boundary must be clarified)
- `docs/handoffs/active/lane-backend.md`
- `docs/handoffs/archive/**`
- `docs/memory/architect.md`

## Out of Scope

No `apps/api/**`, frontend/shared-lane edits, S-02 contract changes,
customer content, customer deployment, B-09/B-10/B-12 or production
AI activation. Do not represent unrun model quality as measured.

## Acceptance Criteria

The decision is implementation-ready, preserves tenant/ACL and
citation trust, uses exact runtime mode names, fails closed off-demo,
and keeps a bounded, auditable spend reserve for the checkpoint.
English LTR remains primary; no RTL locale ships.

## Stop / Escalate Conditions

Return to Commander if the desired API flow requires an S-02 contract
change, a new unapproved provider, or customer-note transmission.

## Gates

No live Ask network I/O before this ADR amendment is accepted.
The user selected local/demo and public/synthetic content only.

## Completion Instructions

Archive with decision and exact evidence, then return the lane to
Commander. Do not implement the adapter.

## Outcome

Accepted ADR-0004 B-08 local/demo Ask exception on 2026-10-12 from
the user's explicit direction and the Researcher report. Pinned
`gemini-2.5-flash` provisionally; exact account route and grounded
quality remain falsifiable Implementer gates. No live network call
or application implementation occurred in this slice.
