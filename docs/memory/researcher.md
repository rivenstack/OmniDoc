# Researcher Memory

## Durable Responsibilities

- Own technical, market, legal/provider, and evidence-rigor research
- Label confidence and date evidence; do not overclaim
- Supply bounded inputs to UX Researcher when CX is affected
- Do not own customer-behavior synthesis or design-facing UX recommendations
- Produce shortlists with tradeoffs; do not select the stack (ADR-0001)

## Recurring Checks

- Market practice ≠ law
- Extension marketing ≠ verified compatibility
- Provider retention / BYOK / data-residency terms stay explicit
- Unresolved legal/privacy conclusions route to `@user`
- Cross-tenant isolation evidence is mandatory for multi-tenant claims
- RTL-readiness evidence ≠ shipping an RTL locale

## Durable Lessons (platform evidence)

- Record access date on every source; re-fetch provider pricing/retention
  at ADR time — unit prices and ZDR eligibility tables change
- “No training on API data” ≠ “zero retention”; default abuse logs are
  often ~30 days and ZDR is usually sales/approval-gated
- Feature-level exclusions matter (e.g. hosted vector stores, search
  grounding) even when base chat/embeddings look ZDR-eligible
- Postgres RLS is defense-in-depth, not magic: owner/`BYPASSRLS` bypass,
  pool GUC leaks, and FK/unique covert channels are first-class risks
- pgvector approx indexes post-filter; tenant-selective RAG needs iterative
  scans or exact/partial-index strategies — test isolation as security
- Long-running embed/ingest jobs favor worker-capable hosts; function-only
  platforms need an external worker story
- Remix new-project path is React Router 8; cite RR8 not legacy Remix alone
- Version claims rot: cite the exact version + release date + read date, or
  point at `docs/research/version-ledger.md` — never "latest" or "observed"
- TipTap documents `textDirection`; headless editors still require product
  a11y ownership — do not equate API presence with WCAG pass
- AWS Free Tier after **2025-07-15** is **credits + 6-month Free plan**
  (not legacy 12-month hours); Free plan expiry **closes** the account —
  score against the project’s **6-month** demo horizon, not against a
  missing year-long Free always-on
- Distinguish **OmniDoc customer-BYOK** (key in project vault) from
  **OpenRouter-upstream-BYOK** (keys in OpenRouter); they are different
  trust and fee surfaces
- OpenRouter `:free` + `GET /api/v1/key` (and management `/credits`,
  `/activity`) can drive usage display without inventing billing; free
  RPD caps rise after **$10** lifetime credits — do not treat chat
  rumors as pins; re-fetch FAQ/limits
- Lightsail 90-day Paid trial ≠ Free plan; App Runner sits on Paid-plan
  lists for Sign up for AWS (new) — do not assume Free-plan eligibility
  from brand familiarity
