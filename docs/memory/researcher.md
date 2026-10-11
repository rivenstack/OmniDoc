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
- Better Auth is a TypeScript library — it cannot be the identity
  implementation inside a Java API; hybrid Next-auth + Java retrieval
  is a tenant-authority split unless designed as a true BFF
- Spring AI ChatClient/PgVectorStore convenience can become accidental
  corpus SoT; keep adapters behind architecture ports and forbid
  `initialize-schema` on the app role
- Nx module-boundary tags do not enforce Java imports — ArchUnit is the
  substitute
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
- Ingestion chunking (B-05a): TipTap JSON → markdown needs **one**
  canonical serializer; Java chunkers should prefer port-supplied
  projected `text` over a second TipTap port. Library splitters
  (Spring AI `TokenTextSplitter`, LangChain4j recursive) are adapters
  only — map to OmniDoc `Chunk` offsets/ids; never leak framework types
  to HTTP
- Postgres `FOR UPDATE SKIP LOCKED` is the official queue-claim primitive
  (PG SELECT locking docs); pair with durable job rows + lease/reaper.
  Redis/SQS popularity is weak Free Tier evidence versus Postgres-only
- Apache Tika is a **parser**, not a citation chunker; Spring Batch adds
  restart metadata and a second schema — score against S-02
  `IngestionJob` projection cost before adopting
- Python sidecar remains Phase-1-out (`14` adverse + ADR-0005); cite
  policy only — do not reopen as a B-05 recommendation
- Embeddings/pgvector writes are B-06 handoff points after stable
  chunks; do not select embed stacks inside ingestion research
- For embedding gateways, use the dedicated embeddings reference over
  generated per-model chat examples; verify the routed model, dimensions,
  input cap, charge and availability with a bounded fixture-only probe.
- A pgvector `vector` column caps at 2000 dimensions; shortlist checks
  must include returned dimensions and model-specific index/isolation fit.
  A gateway privacy statement does not establish upstream retention or
  residency for a routed model.
- B-06d user chose AvalAI `text-embedding-v4` (Alibaba Qwen3-series) at
  1024 dimensions as the preferred development-probe model, valuing
  retrieval quality over the absolute cheapest input token price. Gemini
  001 is a fallback research option, and direct Cloudflare Qwen is outside
  this probe. The live Researcher report records the unresolved routed
  1024-vs-8192 input token cap and fixture-only validation gate.
