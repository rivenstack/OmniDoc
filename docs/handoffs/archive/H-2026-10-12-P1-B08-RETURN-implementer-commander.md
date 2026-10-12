---
handoff_id: H-2026-10-12-P1-B08-RETURN
affinity: coordination
track: parallel
status: blocked
phase: "1"
task: "B-08"
lane: backend
human_owner: back-end-programmer
from: implementer
to: commander
created: 2026-10-12
updated: 2026-10-12
---

# B-08 — Commander validation hold for AvalAI credit

## Start Command

```text
/commander Read docs/handoffs/current.md and docs/handoffs/active/lane-backend.md. Review the B-08 implementation evidence, preserve the live-credit gate, and sequence Researcher live model evaluation, Implementer acceptance, then the pre-B-09 checkpoint only after B-08 passes.
```

## Objective

Owner: `/commander`; allowed_task_classes: `B-08 coordination and gate records only`.
Review the returned B-08 code/evidence and hold the backend lane until the
current AvalAI account has usable credit and the frozen live Ask matrix has
passed. Keep one primary owner at a time. The frontend F-06 lane continues.

## Required Reading

`context.md`, `architecture.md`, `AGENTS.md`, this head,
`docs/handoffs/current.md`,
`docs/handoffs/archive/H-2026-10-12-P1-B08-IMPL-commander-implementer.md`,
`docs/research/technical/18-b08-avalai-ask-model.md`,
`docs/adr/ADR-0004-dual-mode-byok-and-usage.md` B-08 exception,
`docs/quality/b08-ask-verification.md`, and `docs/api/ask-sse.md`.

## Inputs / Evidence

Implementation is complete in `apps/api/**`. The final
`cd apps/api && ./gradlew clean test` passed with **163 tests, zero
failures/errors/skips**. HTTP/SSE/ACL, injected-text, provider source-index,
and $5 reservation tests passed. `git diff --check` passed. No frontend
file was touched.

The authenticated AvalAI credit endpoint returned HTTP 200 but
`remaining_unit=0.0`, `remaining_irt=0.0` twice on 2026-10-12. No B-08
model call was made. Authenticated `GET /v1/models` returned HTTP 200 and
listed the exact pinned ID. The Researcher model choice is provisional;
measured S1–S6 quality, latency, effective cost and funded route behavior
remain unknown.
B-08 is **not accepted** on offline evidence alone.

## Deliverables

1. Review the code and verification matrix for the accepted B-08 scope,
   recording any implementation defect for the Implementer.
2. Once the operator confirms usable credit, assign Researcher the frozen
   live model/quality/effective-cost evaluation. Preserve the exact
   `gemini-2.5-flash` pin unless a new Researcher/Architect decision changes
   it. Keep the combined B-08/checkpoint actual account-spend cap at **$5**.
3. Assign Implementer any resulting bounded fix and the final live Ask API
   walkthrough. Validate B-08 only after S1–S6 and charge evidence passes.
4. **After B-08 PASS, open a separate checkpoint handoff before B-09** for
   the running application API journey: import → chunk → AvalAI
   `text-embedding-v4`/1024 embedding → model/dimension-isolated retrieval
   → AvalAI Ask → openable citations. Include exact API commands, shared
   budget ledger, account/transaction checks, tenant/workspace/deletion
   negatives, source rights, and detailed operator steps. Synthetic notes
   are the baseline; fetched public notes need recorded source and terms.

## Allowed Write Paths

- `docs/handoffs/active/lane-backend.md`
- `docs/handoffs/archive/**`
- `docs/handoffs/current.md`
- `context.md`
- `docs/planning/implementation-tracks.md`

## Out of Scope / Must Not Touch

`apps/web/**`, `packages/ui/**`, `docs/handoffs/active/lane-frontend.md`,
and backend implementation code under this Commander ownership. No
production AI, customer-content provider calls, BYOK activation, or
B-09/B-12 opening.

## Constraints / Prohibited Decisions

One primary owner per handoff. No silent model or mode substitution.
Keep `mock | operator_free_tier | customer_key` and frozen S-02. Do not
treat a successful B-06d standalone probe as a full app API checkpoint.
Do not reset the shared spend ledger between B-08 and the checkpoint.

## Acceptance Criteria

Commander has a reviewed implementation matrix plus measured live S1–S6
outcomes, authorized/openable citations, exact model identity, latency and
actual account charges below the combined $5 cap before marking B-08 PASS.
The separate checkpoint opens before B-09 only after that PASS. No UI
claim is made; English LTR remains primary and RTL-readiness deferred.

## Stop / Escalate Conditions

Stay blocked while credit is zero or transactions cannot be reconciled.
Return to Researcher and Architect if the pinned model, route, price,
grounding, privacy or citation gate fails. Stop on any customer-note
transmission or cross-tenant/workspace hit.

## Dependencies / Risks

The operator controls AvalAI credit and the external key. The checkpoint
needs a separate implementation slice to move the B-06d embedding probe
into gated application flow; it is not B-08.

## Gates

Default runtime and CI stay mock. Local/demo `operator_free_tier` Ask
requires all server-owned gates and usable account credit. Customer-facing
deployment remains closed. B-09 cannot start until the full API pipeline
checkpoint passes.

## Completion Instructions

On usable-credit confirmation, archive this hold before assigning the
next single owner. Preserve the exact evidence and budget total in the
new handoff. When B-08 and the separate checkpoint pass, return the
lane to Commander to decide B-09 sequencing.

## Resolution on consumption

The user added an Alibaba API credit package on 2026-10-12. Researcher
replaced the provisional Gemini pin with `qwen3.5-plus` using measured
synthetic evidence; Architect amended ADR-0004. Implementer then ran
S1–S6 through the application API with current/openable citations.
Commander accepted B-08 after `./gradlew clean test` passed 164 tests
and the account reconciled 26 successful Researcher/B-08 transactions
at $0.01247960 against 27 shared ledger reservations. This earlier
zero-credit hold is superseded by the B-08p checkpoint head.
