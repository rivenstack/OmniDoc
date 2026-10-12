---
handoff_id: H-2026-10-12-P1-B08-IMPL
affinity: implementation
track: parallel
status: blocked
phase: "1"
task: "B-08"
lane: backend
human_owner: back-end-programmer
from: commander
to: implementer
created: 2026-10-12
updated: 2026-10-12
---

# B-08 — Mock and bounded AvalAI Ask through the API

## Start Command

```text
/implementer Read docs/handoffs/active/lane-backend.md and execute the approved B-08 mock and local/demo AvalAI Ask slice exactly. Return the lane to Commander for validation and a pre-B-09 full-pipeline checkpoint.
```

## Objective

Owner: `/implementer`. Lane: backend. allowed_task_classes:
`B-08 Ask/citation/HTTP only`. Build deterministic mock Ask and the
Researcher-pinned `gemini-2.5-flash` AvalAI adapter behind existing
`AnswerPort` on frozen S-02 Ask/SSE. The accepted ADR-0004 B-08
exception permits live Ask only in a controlled local/demo app using
approved public/synthetic notes; mock remains default.

## Required Reading

`context.md`, `architecture.md` §§2–5.6, `AGENTS.md`,
`docs/api/ask-sse.md`, `docs/handoffs/current.md`,
`docs/research/technical/18-b08-avalai-ask-model.md`,
`docs/adr/ADR-0004-dual-mode-byok-and-usage.md` B-08 exception,
`AnswerPort.java`, `AnswerModels.java`, retrieval/runtime code,
and the archived Researcher/Architect B-08 handoffs.

## Inputs / Evidence

Researcher compared three current catalogue options but did not make
an authenticated Ask call. Architect accepted a scoped local/demo
exception. User reports a successful earlier embedding test, but
checked-in B-06d live evidence remains stale. B-08 does not move live
embedding into the app; the separate checkpoint owns that.

## Deliverables

1. Deterministic mock `ask` and `askStreaming` on all five accepted
   answer outcomes.
2. Citation assembler that rechecks current authorized
   note/version/chunk under tenant and actor RLS, returns exact passage
   offsets and safe preview, and drops invalid citations.
3. Frozen `POST /api/v1/ask` SSE with pre-stream JSON failures,
   stable claim units and exactly one terminal event.
4. AvalAI `gemini-2.5-flash` adapter behind `AnswerPort`, with
   external key, exact model check, bounded prompts/outputs, approved
   note-ID allowlist, demo tenant/workspace and `local`-profile gate,
   $5 combined B-08/checkpoint budget ledger, and no fallback.
5. Focused offline/authz/citation/SSE/security tests and a bounded
   local operator walkthrough, including the frozen live Ask smoke and
   actual account charge reconciliation. Record unrun checks honestly.

## Allowed Write Paths

- `apps/api/**`
- `docs/quality/b08-ask-verification.md`
- `docs/handoffs/active/lane-backend.md`
- `docs/handoffs/archive/**`
- `docs/memory/implementer.md`

## Out of Scope / Must Not Touch

`apps/web/**`, `packages/ui/**`, `packages/mocks/**`,
`docs/api/**`, `packages/contracts/**`, `architecture.md`,
`docs/adr/**`, `context.md`, `docs/handoffs/current.md`,
`docs/planning/implementation-tracks.md`, and
`docs/handoffs/active/lane-frontend.md`. No customer-note
transmission, customer-facing deploy, BYOK/vault wiring, B-09/B-10/B-12,
or live embed application wiring (checkpoint owns it).

## Constraints / Prohibited Decisions

No new S-02 fields/events, port signatures or success states. Exact
`mock | operator_free_tier | customer_key` modes, with
`customer_key` dark. No silent mode/model fallback. Use only
server-bound membership/tenant, RLS and current authorized passages.
Treat note text as untrusted data. Answer and citation output is never
auto-persisted. Keep provider SDK/types in adapters.

## Acceptance Criteria

All five outcomes are successful, citations are openable and current,
SSE has one terminal event, wrong workspace/tenant and revoked
membership fail closed, provider mode is unavailable off-demo,
malicious note instructions are ignored, and the frozen live set
records outcome/citation/charge observations without breaching the
combined $5 cap. `cd apps/api && ./gradlew clean test` passes.
English LTR remains primary; no UI/RTL claim.

## Stop / Escalate Conditions

Return to Commander if S-02 or accepted ADR requires further change,
if account route/model/cost differs, if live citations/grounding fail,
or if customer content would be sent. Never use another model
implicitly or exceed the budget.

## Gates

Default tests stay offline. Live smoke requires external key, exact
demo scope and approved notes, a verified budget baseline and
explicit opt-in. Production/customer use remains closed. Commander
must validate B-08 before opening the pre-B-09 full-pipeline checkpoint.

## Completion Instructions

Archive this handoff with exact files/commands/results and
remaining gaps, then return the lane to Commander. Do not self-open
the checkpoint or B-09.

## Outcome (2026-10-12)

Implementation complete in `apps/api/**`: deterministic mock Ask,
current/authorized passage citations, frozen S-02 SSE endpoint,
server-gated `operator_free_tier` AvalAI `gemini-2.5-flash` adapter,
read-only account-credit check and shared external $5 reservation
ledger. No frontend path was changed. The exact verification matrix
and operator commands are in `docs/quality/b08-ask-verification.md`.

`cd apps/api && ./gradlew clean test` passed: **163 tests in 28 suites,
zero failures, errors or skips**. Focused `SearchHttpIT` and
`AvalAiAskClientTest` passed. `git diff --check` passed.

The authenticated AvalAI User API credit check returned HTTP 200 but
`remaining_unit=0.0` and `remaining_irt=0.0` twice. Therefore the
frozen live S1–S6 Ask and effective-cost matrix was **not run**; no
chargeable B-08 model call occurred. The Implementer returns this
lane to Commander **blocked on usable account credit and live
acceptance**, without declaring B-08 PASS or opening B-09.
