---
handoff_id: H-2026-10-11-P1-B06D-ARCH
affinity: architecture
track: parallel
status: completed
phase: "1"
task: "B-06d"
lane: backend
human_owner: back-end-programmer
from: commander
to: architect
created: 2026-10-11
---

# B-06d — Architect decision for AvalAI development embedding probe

## Start Command

    /architect Read docs/handoffs/active/lane-backend.md and execute the B-06d Architect slice exactly. Decide GO or NO-GO for the S-03-only AvalAI text-embedding-v4 probe; return the design and gates to Commander without opening Implementer work.

## Objective

Owner: /architect. Lane: backend. Human: back-end programmer.
allowed_task_classes: B-06d architecture decision only.

Turn the archived Researcher evidence and the user's preferred AvalAI
text-embedding-v4, 1024-dimensional development model into a bounded,
implementer-ready design or a reasoned NO-GO. This handoff authorizes
architecture work only. B-07 stays listed until B-06d completes or returns
NO-GO.

## Required Reading

1. context.md, architecture.md sections 2, 3, 5.3, 5.4, 5.11, 6, 7, and AGENTS.md
2. docs/handoffs/current.md and docs/planning/implementation-tracks.md B-06, B-06d, B-07, B-08, B-12
3. docs/handoffs/archive/H-2026-10-11-P1-B06D-RES-commander-researcher.md and docs/handoffs/archive/H-2026-10-11-P1-B06D-RETURN-researcher-commander.md
4. docs/research/technical/17-avalai-development-provider-poc.md, including the user's later v4 choice that supersedes the archived Researcher handoff's original preferred-model sentence
5. Accepted ADR-0001 sections 4–5, ADR-0004, ADR-0005 sections 5 and 7
6. B-06 vector schema and port signatures, S-03 fixture identifiers, and docs/handoffs/README.md; read only what is needed for the decision

## Inputs / Evidence

- Researcher returned GO_WITH_CONDITIONS for a local, explicit, S-03-only
  probe. Its 2026-10-11 report is a documentation snapshot; no account, key,
  request, charge, route behavior, or OmniDoc retrieval quality was tested.
- The user chose AvalAI text-embedding-v4 (Alibaba Qwen3-series route) at
  1024 dimensions as the single preferred B-06d probe model. The reported
  catalogue price is $0.07 per million input tokens, subject to account
  verification. Gemini 001 is only a fallback research option if Architect
  separately selects it after v4 fails. Direct Cloudflare Qwen is outside
  B-06d. No production model has been selected.
- AvalAI documents an OpenAI-shaped embeddings endpoint, but Spring AI
  interoperability and pass-through of dimensions or query/document controls
  are untested. AvalAI's table says 1024 input tokens for v4; upstream Alibaba
  says 8192. B-05 chunks are capped in characters, not tokens.
- B-06 already provides deterministic mock embeddings with real
  PostgreSQL/pgvector persistence, model/dimension metadata, tenant/workspace
  filtering and RLS. The existing one-vector-per-chunk schema creates a
  candidate-isolation and baseline-preservation question.
- Upstream content handling, retention/training, region, account terms,
  payment eligibility, and exact dashboard controls remain unresolved.
  The user's account/terms/payment decision is required before any live call.

## Allowed Write Paths

- architecture.md (a bounded B-06d design lock only)
- docs/adr/ADR-0004-dual-mode-byok-and-usage.md only if an explicit,
  justified amendment is required; do not silently change accepted policy
- docs/handoffs/active/lane-backend.md
- docs/handoffs/archive/**
- docs/memory/architect.md (durable lessons only)

## Out of Scope / Must Not Touch

- apps/api/**, apps/web/**, packages/**, docs/api/**, the frontend lane head,
  docs/handoffs/current.md, context.md, and the program-of-record status
- Secrets, .env files, provider account state, live AvalAI requests,
  customer note content, B-07 implementation, and B-08 Ask/chat work

## Deliverables

1. Return GO, GO_WITH_CONDITIONS, or NO_GO for the exact v4/1024,
   development-only fixture probe, with evidence and open conditions.
2. Decide an offline provider probe versus a narrowly opt-in local adapter
   behind EmbeddingPort. Define how the probe is selected without adding a
   runtime mode, bypassing mode authorization, or silently falling back.
   Reconcile any pre-CX live development exception with ADR-0004 explicitly:
   either explain why the bounded probe fits, propose a precise amendment
   and user gate, or return NO-GO.
3. Specify the local secret/env mechanism, outbound mode stamp, failure
   handling, no-body/no-key logging, and exact S-03-only content boundary.
   Set a clear condition for the user's account/terms/payment decision
   before live smoke; unresolved upstream privacy keeps customer content
   and production use closed.
4. Define model identity/dimension isolation for stored and query vectors,
   preserving the B-06 mock baseline and tenant/workspace/ACL/RLS checks.
   Address the one-vector-per-chunk schema, re-embedding/rollback, cosine
   metric, and whether any schema change is required.
5. Pre-register an S-03-derived, versioned query/relevance corpus and
   Recall@1, Recall@3, MRR and core-query pass criteria before first live
   response. Require zero forbidden hits. Specify actual routed token-cap
   checks against B-05 fixture chunks, returned model/1024 dimensions,
   finite vectors, usage/charge and failure observations.
6. Record ADR-0004 disposition. If an amendment is material, keep its
   acceptance gate explicit; no handoff text alone amends accepted policy.
   Return a bounded Implementer scope for Commander to open only after GO
   and all applicable gates, or return the B-07 resumption recommendation
   on NO-GO.

## Constraints / Prohibited Decisions

Preserve exact runtime modes mock | operator_free_tier | customer_key,
mock as default, and no silent mode or model substitution. Spring AI or
HTTP client types remain adapter-local. Production OpenRouter posture,
CX-first activation gate, customer BYOK, corpus ownership, and pgvector
retrieval authority remain intact. No customer/user notes, production
activation, Ask/chat, or new HTTP surface. Do not choose a fallback model
by implication.

## Acceptance Criteria

- The design gives Implementer an explicit, reversible probe boundary,
  secret path, model/dimension guard, token-limit validation, offline
  default, evaluation thresholds, and stop behavior; or explains NO-GO.
- It distinguishes the dated Researcher catalogue claims from untested
  routed/account behavior and preserves every unresolved user gate.
- It states whether ADR-0004 must change before any live development call.
  No accepted ADR is treated as amended merely by this handoff.
- The retrieval test plan has zero-tolerance tenant/workspace/ACL leakage
  and preserves the deterministic B-06 comparison for later B-07 use.
- No UI ships. Primary locale remains en (LTR); RTL locale stays deferred.
  Any later output containing provider IDs or user content must preserve
  semantic isolation and accessibility. No code or other-lane file changes.

## Stop / Escalate Conditions

Soft-stop and return to Commander if account terms/payment eligibility,
the pre-CX exception, or an ADR amendment needs the user's decision before
the design can authorize a live probe. Hard-stop on a requested live call,
key handling, customer content, production activation, or another lane's
write path. If v4 cannot safely fit the existing boundaries, return NO-GO;
do not switch to Gemini or another provider silently.

## Dependencies / Risks

Depends on completed B-06 and the archived B-06d Researcher package.
Provider pages and price may drift. The routed input cap, actual dimension
pass-through, charge, and quality are untested; the B-06 storage key limits
concurrent model comparisons. B-07 remains preserved and resumes only
after B-06d completion or NO-GO.

## Gates

Researcher evidence is complete for Architect review, not a live-test
approval. Architect GO plus any needed accepted ADR amendment must precede
Implementer assignment. The user decides AvalAI account/terms/payment
eligibility before any live smoke and supplies a development key only via
the approved local mechanism after GO. Production AI, customer content,
B-08 Ask/chat, and Phase Check remain closed.

## Completion Instructions

Record the design/disposition and unresolved decisions in an Outcome.
Archive this Architect handoff before rewriting the backend lane head as
a blocked return to Commander. Do not self-open Implementer or B-07 work.
Commander reviews the return and alone assigns the next same-lane slice.

## Outcome

**Architect completed 2026-10-11. Disposition: `GO_WITH_CONDITIONS` for
the single S-03-only AvalAI `text-embedding-v4` / 1024 local probe.**
`architecture.md` §5.3.1 locks the test-classpath runner behind
`EmbeddingPort`, runner-local `operator_free_tier`/`EMBED` authorization,
external local key, fixed endpoint/manifest, isolated disposable databases,
exact model/dimension filtering, cosine/RLS retrieval, token/usage checks,
pre-registered queries and pass/stop criteria. B-06 mock data, application
startup and B-07 contract remain unaffected. No code, key, account action or
live request occurred.

**ADR disposition:** ADR-0001 §5 and ADR-0004 §1 do not yet allow pre-CX live calls.
Its B-06d exception is a visibly **proposed, unaccepted** amendment in
`docs/adr/ADR-0004-dual-mode-byok-and-usage.md`. `@user` must accept it
before Commander opens Implementer work. The user's separate current
AvalAI account/terms/payment eligibility decision and a locally supplied
development key are required before any live smoke. Upstream retention,
training, region and route behavior remain unresolved; no customer content,
production use, Ask/chat or alternative model is authorized. If the
amendment is rejected, Commander should resume B-07 without a live B-06d
probe. If accepted, Commander may open only the bounded B-06d Implementer
slice in §5.3.1, with the account decision still gating live requests.

**Evidence limits:** Researcher documentation snapshot dated 2026-10-11;
AvalAI route, 1024 dimensions, 1024-token table cap, charge and retrieval
quality remain untested. The V5 schema has one embedding per chunk and
the current B-06 search adapter hard-codes 16 dimensions and omits a model
filter; these are explicit Implementer tasks if the user accepts the gate.

**Exact files changed:** `architecture.md`,
`docs/adr/ADR-0004-dual-mode-byok-and-usage.md`,
`docs/handoffs/active/lane-backend.md`, this archive copy, and
`docs/memory/architect.md` (one durable lesson). Other worktree changes
were preserved. Returned to `/commander` without self-opening Implementer
or B-07.
