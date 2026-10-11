---
handoff_id: H-2026-10-11-P1-B06D-RES
affinity: research
track: parallel
status: completed
phase: "1"
task: "B-06d"
lane: backend
human_owner: back-end-programmer
from: commander
to: researcher
created: 2026-10-11
---

# B-06d — AvalAI development-provider PoC evidence

## Start Command

```text
/researcher Read docs/handoffs/active/lane-backend.md and execute the B-06d Researcher slice exactly. Verify AvalAI's official documentation, embedding-model/cost/privacy/API evidence, and recommend an evidence-backed cheap-but-capable model shortlist for Architect review; do not use or request an API key.
```

## Objective

Owner: `/researcher`. **Lane:** `backend`. **Human:** back-end programmer.
**allowed_task_classes:** research for **B-06d only**.

Produce dated, primary-source evidence for a development-only AvalAI embedding
PoC behind OmniDoc's existing `EmbeddingPort` and exact runtime modes. The user
has selected AvalAI for evaluation and wants a low-cost model that remains good
enough to inspect retrieval quality before B-07 and later AI work. Researcher
verifies the provider and model facts and supplies a bounded shortlist plus a
preferred PoC candidate to Architect; Researcher does not implement or silently
amend accepted architecture.

## Required Reading

1. `context.md`
2. `architecture.md` §2, §3 retrieval flow, §5.3, §5.4, §5.11, §6, and §7
3. `AGENTS.md`
4. `docs/handoffs/current.md`
5. `docs/planning/implementation-tracks.md` B-06, B-06d, B-07, B-08, B-12
6. ADR-0001 §4–§5, ADR-0004, and ADR-0005 §5 / §7
7. `docs/handoffs/archive/H-2026-10-11-P1-B06-commander-implementer.md`
8. `docs/handoffs/archive/H-2026-10-11-P1-B07-superseded-before-execution.md`
9. `docs/research/technical/README.md`, `05-embedding-llm-providers.md`,
   `13-spring-ai-openrouter-byok-fit.md`, and `docs/research/version-ledger.md`
10. User-supplied AvalAI developer documentation: `https://docs.avalai.ir/fa/`
11. `docs/memory/researcher.md`

## Inputs / Evidence

- B-06 is completed: deterministic `mock` embeddings, real pgvector storage/
  similarity, model id/dimensions, tenant/workspace filtering, RLS, and
  fail-closed live modes exist behind project-owned ports.
- `@user` explicitly sequenced B-06d before B-07 on 2026-10-11 and supplied
  `https://docs.avalai.ir/fa/` as the developer-documentation starting point.
- User decision driver: prefer the cheapest model that is still capable enough
  for meaningful retrieval inspection as B-07/B-08 approach. Cost alone is not
  sufficient; model availability, retrieval fitness, stable identifiers/
  dimensions, operational limits, and data handling are hard criteria.
- No development API key is needed or permitted in this Researcher slice.
- S-03 checked-in fixtures are the only content eligible for a later live PoC;
  customer/user note content is excluded.

## Allowed Write Paths

- `docs/research/technical/17-avalai-development-provider-poc.md`
- `docs/research/technical/README.md`
- `docs/research/technical/00-evidence-matrix.md` (only a bounded B-06d row)
- `docs/research/version-ledger.md` (only verified B-06d model/client pins)
- `docs/handoffs/active/lane-backend.md`
- `docs/handoffs/archive/**`
- `docs/memory/researcher.md`

## Must Not Touch

- `apps/api/**`, `apps/web/**`, `packages/**`
- `architecture.md`, `docs/adr/**`, `docs/api/**`
- `context.md`, `docs/planning/implementation-tracks.md`,
  `docs/handoffs/current.md`, `docs/handoffs/active/lane-frontend.md`
- Any `.env*`, credentials, local secret stores, provider account state, or
  live API calls

## Deliverables

1. Create `docs/research/technical/17-avalai-development-provider-poc.md`
   with access dates, source links, evidence classifications, confidence, and
   adverse findings.
2. Verify from AvalAI-controlled primary sources where possible:
   - canonical provider/operator identity and official documentation domains;
   - embedding endpoint/base URL, authentication scheme, request/response
     format, OpenAI compatibility, error/rate-limit semantics, and whether
     Spring AI's OpenAI-compatible embedding client is likely to fit;
   - currently available embedding model ids, dimensions, input/token limits,
     languages, normalization/encoding behavior, and lifecycle/stability cues;
   - current price units, minimum spend/credit behavior, free/trial limits,
     quotas, and any material currency/tax ambiguity;
   - retention, training use, abuse logging, subprocessors, region, deletion,
     terms/licensing, key scope/revocation, and account requirements.
3. Compare at least two serious embedding-model candidates when the provider
   offers them. Score cost, expected retrieval fitness, English support,
   multilingual value, dimensional/storage impact, documented limits,
   availability, and evidence confidence. If only one qualified candidate is
   documented, state that constraint rather than fabricating a comparison.
4. Give Architect a preferred **PoC candidate**, not an architecture
   selection, with a falsifiable reason why it is the best cheap-but-capable
   starting point and explicit conditions that would reject it.
5. Define the later opt-in live-smoke plan:
   - S-03 fixtures only; no user content;
   - compare against the deterministic B-06 baseline using a versioned S-03
     query/relevance corpus created for B-06d and reusable unchanged by B-07,
     with Recall@K/rank evidence;
   - persist exact provider model id and dimensions; never mix incompatible
     vectors;
   - default tests/CI remain offline; live execution is explicit and bounded;
   - key enters only through the Architect-approved local secret/env mechanism
     after GO and is never printed or persisted.
6. End with one disposition for Architect: `GO`, `GO_WITH_CONDITIONS`, or
   `NO_GO`, plus every unresolved `@user` gate.

## Constraints / Prohibited Decisions

- Do not infer privacy, retention, pricing, model quality, or availability from
  marketing language. Label missing/conflicting official evidence unresolved.
- Do not use third-party aggregators for a claim when AvalAI or the underlying
  model publisher has a primary source; clearly separate AvalAI facts from
  upstream-model facts.
- Do not perform live API calls, create an account, accept terms, spend credit,
  or request/handle an API key.
- Do not choose a chat/Ask model or implement B-08 here. B-06d is an embedding
  development-provider PoC; later Ask-provider work remains separately gated.
- Do not introduce a new runtime mode. Preserve exactly
  `mock | operator_free_tier | customer_key` with no silent fallback.
- Do not recommend sending customer/user notes until provider data handling is
  explicitly approved. The bounded PoC uses public deterministic fixtures only.

## Acceptance Criteria

- Every material provider/model/cost/privacy claim is dated and directly cited;
  primary official evidence is preferred and conflicting evidence is visible.
- The report separates verified facts, inference, unresolved questions, and
  `@user` decisions using the repository evidence legend.
- The model comparison makes “cheap but good” measurable rather than relying on
  reputation: price unit, dimensions, limits, availability, language fit, and
  the later Recall@K/rank falsification plan are explicit.
- Compatibility is assessed against the existing Java 21/Spring Boot 4.1.x,
  Spring AI-adapter-only posture and the B-06 port/schema boundaries without
  selecting implementation code.
- Data-retention/training/logging, key hygiene, terms, region, and fixture-
  submission safety are each answered or marked unresolved.
- No secret, live provider response, user note, or credential-like value enters
  the repository; `git diff --check` passes.
- The completed Researcher handoff returns to Commander for archive review and
  the sequential B-06d Architect slice. It must not self-open Architect or
  Implementer work.

## Directionality / Accessibility Checks

- No UI ships. Persian documentation may be researched, but product locale
  remains `en` LTR and no RTL-support claim is created. Preserve exact model/
  endpoint identifiers with semantic isolation in prose where needed.

## Stop / Escalate Conditions

- Soft-stop with exact missing evidence if the supplied site is inaccessible,
  cannot establish canonical provider identity, or lacks model/pricing/privacy
  material needed for a safe PoC decision.
- Escalate unresolved terms, retention/training, payment, provider-identity, or
  data-residency decisions to `@user`; do not resolve them by assumption.
- Hard-stop on any request to store/use a key, submit non-fixture data, perform
  live calls, activate production AI, or write outside Allowed Write Paths.

## Dependencies / Risks

- Depends on completed B-06 and the user-supplied documentation URL.
- Provider pages, model availability, and pricing are drift-prone; record access
  date and re-verify before Architect acceptance and before any live smoke.
- A cheap model may produce insufficient retrieval quality or incompatible
  dimensions. The future PoC must be removable without changing B-06/B-07
  contracts or the offline deterministic acceptance path.
- Persian-only or incomplete policy material may leave privacy/legal questions
  unresolved; translate faithfully and retain source links.

## Gates

- Research evidence does not authorize implementation or live calls.
- Architect must return GO and define the adapter/secret/model-isolation shape.
- Only after Architect GO may `@user` configure a development key outside the
  repository for the Implementer slice.
- Production activation, customer data, Ask/chat, B-08, and Phase Check remain
  closed. B-07 resumes after B-06d completes or returns NO-GO.

## Completion Instructions

1. Record an Outcome with deliverables, source access dates, disposition, open
   questions, and exact files changed.
2. Archive the completed Researcher handoff.
3. Rewrite this stable lane head as `status: blocked`, `to: commander`, and
   return sequencing control. Do not self-open Architect or Implementer work.
4. Preserve the frontend lane and Commander index unchanged.

## Outcome

**Researcher completed 2026-10-11. Disposition: `GO_WITH_CONDITIONS` for an S-03-only development PoC; no live call or key was used.** The dated report is [`docs/research/technical/17-avalai-development-provider-poc.md`](../../research/technical/17-avalai-development-provider-poc.md). It verifies the AvalAI OpenAI-shaped embeddings route, documents three model tradeoffs and a preferred `text-embedding-3-small` probe candidate, identifies conflicting API/model examples and Alibaba input limits, and records unresolved upstream privacy, region, account terms, and payment facts. Source access date: **2026-10-11**; AvalAI model/API pages are mostly undated, and the Persian AvalAI privacy policy says last changed **12 Mordad 1405**. No endpoint, price, quality, credential, or account behavior was live-tested.

**Exact files changed by Researcher:** `docs/research/technical/17-avalai-development-provider-poc.md`, `docs/research/technical/README.md`, `docs/research/technical/00-evidence-matrix.md`, `docs/research/version-ledger.md`, `docs/memory/researcher.md`, this handoff, and its archive copy. All other existing worktree changes remain outside this slice.

**Open `@user` gates:** account/terms and payment eligibility before any live smoke; no approval for customer content, production use, or Ask/chat. **Architect gate:** decide offline probe versus narrowly opt-in adapter, exact local secret mechanism and model/dimension isolation, ADR-0004 disposition, and whether the unresolved provider/account facts allow the fixture-only probe. **Implementer gate:** only after Architect GO, freeze the S-03 query/relevance set, verify actual account route/model/dimensions/charge, and give the user exact key-setup and API-check commands for the approved implementation. B-07 remains sequenced after B-06d completion or NO-GO.

Return to `/commander` for archive review and sequencing; Researcher does not open the Architect or Implementer slice.
