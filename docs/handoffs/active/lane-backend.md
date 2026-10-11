---
handoff_id: H-2026-10-11-P1-B06D-IMPL
affinity: implementation
track: parallel
status: ready
phase: "1"
task: "B-06d"
lane: backend
human_owner: back-end-programmer
from: commander
to: implementer
created: 2026-10-11
---

# B-06d — AvalAI v4/1024 local fixture probe

## Start Command

```text
/implementer Read docs/handoffs/active/lane-backend.md and execute the B-06d Implementer slice exactly. Build the opt-in S-03-only AvalAI v4/1024 evaluation runner, keep the default backend offline, and verify only within the accepted ADR exception and live-smoke gates.
```

## Objective

Owner: `/implementer`. Lane: backend. Human: back-end programmer.
allowed_task_classes: B-06d local embedding probe and verification only.
Implement the accepted Architect design in `architecture.md` §5.3.1 for
one AvalAI `text-embedding-v4` 1024-dimensional fixture experiment.
Keep the existing B-06 mock/vector path the default and preserve B-07
for subsequent Commander sequencing. No product AI activation.

## Required Reading

1. `context.md`, `architecture.md` §§2, 3, 5.3.1, 5.4, 5.11, 6, 7, `AGENTS.md`
2. `docs/handoffs/current.md`, `docs/planning/implementation-tracks.md` B-06/B-06d/B-07
3. `docs/handoffs/archive/H-2026-10-11-P1-B06D-ARCH-commander-architect.md`
4. Accepted B-06d exception in `docs/adr/ADR-0004-dual-mode-byok-and-usage.md`; accepted ADR-0001 §§4–5 and ADR-0005 §§5, 7
5. `docs/research/technical/17-avalai-development-provider-poc.md` (dated evidence, not live proof)
6. B-06 `EmbeddingPort`, `RuntimeModePort`, `VectorSearchPort`, V5 schema and retrieval adapter; S-03 fixture IDs in `packages/mocks/src/fixtures.ts`; B-05 Java chunk projection; `docs/handoffs/README.md`

## Inputs / Evidence

- `@user` accepted the Architect v4/1024 design and the one-run,
  pre-CX, fixture-only ADR-0004 exception on 2026-10-11. Commander
  recorded the decision in ADR-0004 and archived the Architect return.
  It authorizes this bounded implementation and local development
  experiment, not production AI, customer data or a paid top-up.
- No account, balance, key, current terms, route behavior, token cap,
  charge, response identity/dimensions or retrieval quality has been
  verified in OmniDoc. The key is not in the repository or handoff.
- B-06 V5 has one embedding per chunk. Its current search adapter
  hard-codes mock dimensions and filters by dimension but not model;
  the accepted design requires explicit model/dimension filtering and
  exclusion of stale versions while preserving tenant/ACL/RLS behavior.
- The five exact core queries, relevant note/version IDs, metric rules
  and pass thresholds are frozen in `architecture.md` §5.3.1.

## Allowed Write Paths

- `apps/api/**` — test/local-only runner, adapter, bounded search
  compatibility change and meaningful offline tests
- `docs/quality/b06d-avalai-fixture-probe.md` — opt-in runbook and
  sanitized evaluation results/status only
- `docs/handoffs/active/lane-backend.md` and `docs/handoffs/archive/**`
- `docs/memory/implementer.md` — durable lessons only

## Out of Scope / Must Not Touch

- `apps/web/**`, `packages/**` (including S-03 fixture authority),
  `docs/api/**`, `architecture.md`, `docs/adr/**`, frontend lane,
  `docs/handoffs/current.md`, `context.md`, program-of-record status
- Production profiles, normal API/worker startup, new HTTP surface,
  migrations, customer/user notes, B-07 lexical/hybrid implementation,
  B-08 Ask/chat, alternative models or providers
- Any key, paid account action, raw provider request/response/vector,
  duplicated note body, or secret-bearing command in new source, fixtures, logs,
  errors, reports, handoffs or chat

## Deliverables

1. Build an explicitly invoked **local evaluation runner** with an
   adapter behind the existing `EmbeddingPort`. Prefer Spring AI 2.0.x
   if it passes the exact endpoint, `dimensions=1024` and response
   checks; use adapter-local `RestClient` only after a documented
   compatibility failure. No provider type crosses public ports.
2. Implement a runner-local `RuntimeModePort` policy for exactly
   `operator_free_tier` + `EMBED` + fixed S-03 actor. Require explicit
   one-run opt-in, local-only profile, fixed AvalAI endpoint/model and
   `AVALAI_API_KEY` supplied from an untracked permission-0600 file
   outside the repository. Resolve, assert and stamp mode before every
   outbound request. Missing gate => `mode_forbidden` before I/O.
   Default app and CI remain mock-only. No silent retry or fallback.
3. Materialize the immutable `s-03-v1/b-06d-v1` query/relevance
   manifest from `architecture.md` §5.3.1 **before the first live
   response**. Include fixture IDs, versions, B-05 projection policy,
   hashes and a bounded request/token budget; reject manifest drift.
   Do not create a second corpus source of truth or submit arbitrary text.
4. Use separate disposable Flyway-through-V5 Postgres/pgvector databases
   for the deterministic mock baseline and v4 candidate. Preserve
   exact cosine ranking and tenant GUC/RLS, membership, workspace/ACL,
   soft-delete and current-version checks. Guard every search by exact
   `(embedding_model_id, dimensions)` and query-vector length/finiteness.
   Retain the existing mock tuple as default. No schema change.
5. Add offline tests for denied modes, missing key/opt-in, S-03-only
   boundary, model/dimension mismatch, malformed/nonfinite/zero vectors,
   no silent fallback, current-version exclusion, tenant/workspace/ACL
   negatives and RLS on the non-owner app role. Keep live tests out of
   `test`, `clean test` and CI. Verify the normal B-06 mock suite.
6. Write `docs/quality/b06d-avalai-fixture-probe.md` with exact
   key-setup, fixture preflight, bounded opt-in run and cleanup commands;
   expected observations; live status; sanitized per-query ranks,
   Recall@1, Recall@3 and MRR for both runs; route/usage/charge findings;
   and clear unrun fields when the account/key gate is unavailable.

## Live-Smoke Gate and Stop Behavior

Before any outbound request, the operator must check the actual AvalAI
account's current terms, payment eligibility, model visibility, balance,
key scope/revocation controls and price/limits against the dated research.
The user accepted the fixture-only exception; a discrepancy or need for
a paid top-up returns to Commander/user before a call. The user provides
the development key only via the external local secret mechanism, never
in chat or the repo. Without a key, implement and verify offline, then
return a blocked live-smoke status rather than claiming completion.

Use one fixture input per request, a predeclared ceiling of **100 live
requests and 50,000 input tokens**, and no paid top-up. Check every
B-05-projected fixture chunk against AvalAI's documented 1024-token
figure before full embedding, then record the actual routed response's
usage and accepted lengths. Start with the smallest fixture. Verify the
returned model ID is exactly `text-embedding-v4`, vector length 1024,
all values finite and norm nonzero; record usage, latency and observed
charge or honest `unavailable`. Stop on route/model mismatch, rejected
required chunk, unknown token fit, malformed output, unexpected charge,
any forbidden hit or any secret/content leak. Do not silently truncate,
split, retry, change model/dimensions or cross modes. A deliberate 429
retry observation requires its own bounded step after a successful smoke.

## Acceptance Criteria

- Offline default and CI remain deterministic; opt-in live work is
  impossible on normal startup and fails closed without all gates.
- Only S-03 checked-in synthetic content and frozen queries can cross
  the provider boundary; no key/body/raw vector in logs or reports.
- Mock and v4 runs use the same fixture/projection/actor definitions in
  separate disposable databases, with exact model/dimension selection.
- Report Q1–Q5 ranks and standard macro Recall@1, Recall@3, MRR with
  the `architecture.md` §5.3.1 pass criteria; **zero** forbidden tenant,
  workspace, ACL, deleted or stale-version hits in both runs. Preserve
  and report baseline regressions. A live pass is evidence for this
  small PoC only, not production model selection.
- No schema/API/Ask/UI change; removal of the runner leaves B-06 mock
  and B-07 contracts unchanged. `cd apps/api && ./gradlew clean test`
  passes without any external key or AvalAI network call; `git diff
  --check` passes.
- No UI ships. Product locale stays `en` LTR; RTL locale is deferred.
  Any later display of provider IDs or UGC needs semantic isolation and
  accessible labels/focus behavior. Visual MCPs are irrelevant to this
  backend-only task.

## Dependencies / Risks

Depends on B-06, archived Researcher and Architect slices, and accepted
ADR-0004 exception. AvalAI's published 1024-token figure conflicts
with Alibaba's upstream 8192; account routing, dimensions pass-through,
training/retention/region, key controls, charge and retrieval quality
remain unverified. V5's one-vector-per-chunk key precludes concurrent
candidate/mock storage in one DB. B-07 remains next, not part of this
slice. Unresolved upstream privacy continues to prohibit customer data.

## Gates

- The scoped ADR exception is **accepted**; product CX and production
  AI gates remain open.
- Actual account/terms/payment, balance and key setup are **not yet
  verified**; check them before a live call. No paid top-up is authorized.
- Default tests/CI are offline. Live smoke is opt-in only, limited to
  the approved corpus and budget. Stop on any failed guard.
- Ask/chat, customer content, OpenRouter production use, other models,
  B-07 implementation and Phase Check remain closed.

## Completion Instructions

Record an Outcome with exact files, commands, test counts, live/unrun
observations, evaluation metrics and remaining gates. Archive this
handoff, then return the backend lane to Commander as blocked; do not
self-open B-07 or production work. Commander reviews the evidence and
alone sequences the next same-lane task.
