# Embedding and LLM Provider Posture

**Research date / access date:** 2026-09-13 (Wave B); **Wave C amend 2026-09-14**  
**Version pins / provider policy dates:** [`../version-ledger.md`](../version-ledger.md)  
**Question:** Mainstream embedding/LLM options for OmniDoc — retention,
training terms, BYOK feasibility, unit cost, swap portability. Evidence
only; **no vendor accepted**. Not legal advice.

## Shared OmniDoc constraints

- UI must not call providers directly (ports later; Customer Experience
  First allows mocks first).
- Data ownership / privacy are first-class Extension-First criteria.
- Production AI activation remains an open gate.
- `@user` (2026-09-14): accept standard ~**30-day** abuse-log retention;
  **no** ZDR sales motion. Customer **BYOK in v1**. Operator path:
  OpenRouter **free-tier first**; ~**$10** credit **after** product is
  operational (do **not** spend $10 in this research task).

## Two BYOK meanings (do not conflate)

| Term | Meaning | Who holds the secret |
|------|---------|----------------------|
| **OmniDoc customer-BYOK** | End customer (or tenant admin) supplies a provider / gateway API key stored in **OmniDoc’s** vault; OmniDoc server adapters call upstream with that key | OmniDoc project vault |
| **OpenRouter-upstream-BYOK** | OpenRouter feature: customer uploads **provider** keys into **OpenRouter’s** BYOK settings; OpenRouter routes using those credentials and may charge a platform fee above allowance | OpenRouter workspace |

Dual-mode product shape (evidence lens, not UX design): (a) **operator**
free-tier / operator-owned OpenRouter key for hosted demo; (b)
**customer-entered** key (OmniDoc customer-BYOK) for paid scale. Usage /
charges display if APIs allow — see [`09-byok-and-usage-metering.md`](./09-byok-and-usage-metering.md).

## BYOK definition used for Wave B vendors

**Bring-your-own-key (OmniDoc):** end customer or operator supplies API
credentials stored in project-controlled secret storage; OmniDoc adapters
call the provider using those credentials. Distinct from provider “ZDR
enterprise contracts,” which are account-level data-handling arrangements.

---

## Wave C — OpenRouter (primary docs, access 2026-09-14)

**Status:** Evidence shortlist candidate only — **not** marked `accepted`.

### `:free` models and rate limits

| Claim | Detail | Class | Conf. |
|-------|--------|-------|-------|
| `:free` variant | Append `:free` to a model ID for $0 token cost variants; may differ in rate limits/availability vs paid | Verified provider | H |
| Free-model rate limits (structure) | Platform caps free-variant requests by lifetime credits purchased; separate from paid-model spend caps; 429 on exceed | Verified provider | H |
| Free-model numeric caps | OpenRouter FAQ + OpenRouter-published tutorials state: **20 RPM**; **50 RPD** if lifetime credits purchased **&lt; $10**; **1000 RPD** if lifetime credits purchased **≥ $10** | Verified provider (FAQ/blog); limits HTML page uses client-side constants | H/M |
| Free Models Router | `openrouter/free` auto-selects a free model | Verified provider | H |
| New-user allowance | “Small” / “very small” free allowance to test — **exact USD not stated** in FAQ | Unresolved amount | M |
| Negative balance | Account with **negative** credit balance may error **including on free models** until balance &gt; 0 | Verified provider | H |
| Extra accounts | Creating extra accounts/keys does **not** raise rate limits (global capacity governance) | Verified provider | H |
| Production fitness | FAQ: free models usually **not suitable for production** due to low limits | Verified provider | H |

**Project lens:** Operator free-tier first is viable for **demo/dev** Ask
volume; the later **~$10** credit purchase is documented as the switch
that raises free-model **daily** caps — spend only after operational, per
`@user`.

**Sources:**  
https://openrouter.ai/docs/guides/routing/model-variants/free ;  
https://openrouter.ai/docs/api-reference/limits ;  
https://openrouter.ai/docs/faq ;  
https://openrouter.ai/blog/tutorials/how-to-get-the-lowest-cost-llm-inference-on-openrouter/  
(accessed **2026-09-14**).

### Privacy / logging (OpenRouter vs upstream)

| Claim | Detail | Class | Conf. |
|-------|--------|-------|-------|
| Default OpenRouter content logging | Prompts/completions **not** stored by default; metadata (timestamps, model, token counts, latency) **is** stored | Verified provider | H |
| Opt-in private I/O logging | Observability setting; for user’s own debug logs; OR states it does not use that data | Verified provider | H |
| Opt-in “use for product” | Privacy setting; 1% discount; off by default | Verified provider | H |
| Upstream providers | Requests are proxied; **provider retention/training policies still apply**; account can deny providers that train; retention policies shown per provider but OR does **not** auto-filter on retention alone | Verified provider | H |
| ZDR / regional | Enterprise in-region routing (`eu.openrouter.ai` / `us.openrouter.ai`) by request — **out of scope** given no ZDR sales motion | Verified provider | H |

**Alignment with `@user`:** Standard ~30-day **upstream** abuse logs (e.g.
OpenAI) remain the honesty baseline when routing to those providers;
OpenRouter’s own default is metadata-only unless opt-in. Do not market
“zero retention end-to-end” without verifying each upstream endpoint.

**Sources:**  
https://openrouter.ai/docs/guides/privacy/data-collection ;  
https://openrouter.ai/docs/guides/privacy/provider-logging ;  
https://openrouter.ai/docs/faq  
(accessed **2026-09-14**).

### OpenRouter-upstream-BYOK (not OmniDoc vault)

| Claim | Detail | Class | Conf. |
|-------|--------|-------|-------|
| Feature | Upload provider keys in OpenRouter workspace BYOK settings; OR encrypts and uses them for routing | Verified provider | H |
| Fee | Above plan allowance: **5%** of list-price inference (FAQ); allowance measured in list-price $, not request count (PAYG **$25k**/mo cited in FAQ) | Verified provider | H |
| Data policies | Upstream BYOK **does not** bypass OR `data_collection` / ZDR routing filters (unless key-level ZDR **declaration** per docs) | Verified provider | H |

**Sources:**  
https://openrouter.ai/docs/guides/overview/auth/byok ;  
https://openrouter.ai/docs/faq  
(accessed **2026-09-14**).

### Usage / charges APIs (display without inventing billing)

| API | Auth | What you can show | Class |
|-----|------|-------------------|-------|
| `GET /api/v1/key` | Inference API key | `usage`, `usage_daily`/`weekly`/`monthly`, `limit` / `limit_remaining`, `byok_usage*`, `is_free_tier` | Verified provider |
| `GET /api/v1/credits` | **Management** key | `total_credits`, `total_usage` | Verified provider |
| `GET /api/v1/activity` | **Management** key | Activity grouped by endpoint for last **30** completed UTC days | Verified provider |
| Activity UI | Web | Historic usage by model/provider/key | Verified provider (FAQ) |

Sufficient to surface **provider-reported usage and credit burn** in an
operator/customer dashboard **without** building a payment product.
Customer-BYOK to **non-OpenRouter** providers needs that provider’s own
usage API (or local token accounting) — see `09`.

**Sources:**  
https://openrouter.ai/docs/api-reference/limits ;  
https://openrouter.ai/docs/api/api-reference/credits/get-remaining-credits ;  
https://openrouter.ai/docs/api/api-reference/analytics/get-user-activity ;  
https://openrouter.ai/docs/faq  
(accessed **2026-09-14**).

### Adverse / open for OpenRouter

- Free-model **capacity and quality** vary; not guaranteed equal to paid variants.  
- Embeddings: confirm whether required embedding models exist as `:free` or require paid/credits — **Unresolved without live models catalog pin**.  
- Unified gateway = extra sub-processor in the trust story.  
- **Forbid** treating any gateway’s Assistants/`vector_stores`-style hosted corpus as OmniDoc SoT (same Wave B rule for OpenAI).

---

## Embeddings — cost signals (verify at purchase)

| Model / vendor | Listed unit cost (accessed 2026-09-13) | Notes | Conf. |
|----------------|----------------------------------------|-------|-------|
| OpenAI `text-embedding-3-small` | **$0.02 / 1M tokens** on model page | Input-only billing; ZDR-eligible endpoint per data controls table | H |
| OpenAI `text-embedding-3-large` | **$0.13 / 1M tokens** (secondary trackers matching model page) | Higher quality / dims tradeoff | M/H |
| Voyage `voyage-4-lite` | **$0.02 / 1M**; free token allotment for new accounts | Opt-out of store/train for zero-day retention (dashboard; payment method required) | H |
| Voyage `voyage-4` / `voyage-4-large` | **$0.06 / $0.12 per 1M** | Same retention controls | H |
| Cohere Embed (gateway listing) | ~**$0.12 / 1M** via third-party gateway page | Confirm on Cohere’s own pricing before ADR | M |

**Sources:** https://developers.openai.com/api/docs/models/text-embedding-3-small ;
https://developers.openai.com/api/docs/guides/embeddings ;
https://docs.voyageai.com/docs/pricing ; https://docs.voyageai.com/docs/faq
(accessed 2026-09-13).

## LLM / API data-retention and training (provider rules)

### OpenAI API

| Claim | Detail | Class | Conf. |
|-------|--------|-------|-------|
| Training | API data not used to train since **2023-03-01** unless explicit opt-in | Verified provider rule | H |
| Default abuse retention | Up to **30 days** abuse monitoring logs | Verified provider rule | H |
| ZDR / Modified Abuse Monitoring | Requires OpenAI approval; endpoint eligibility table applies | Verified provider rule | H |
| Embeddings | `/v1/embeddings`: training No; abuse 30d; app state None; **ZDR eligible** | Verified provider rule | H |
| Assistants / vector_stores | Application state until deleted; **not** ZDR eligible | Verified provider rule | H |

**Source:** https://developers.openai.com/api/docs/guides/your-data
(accessed 2026-09-13).

### Anthropic Claude API

| Claim | Detail | Class | Conf. |
|-------|--------|-------|-------|
| Training | Retained data not used for training without express permission | Verified provider rule | H |
| ZDR | Sales-enabled per organization; does not auto-extend to all orgs under an account | Verified provider rule | H |
| Covered Models | Some models require **30-day** retention and are not ZDR unless expressly authorized | Verified provider rule | H |
| Default | Conversation content not retained by default except documented exceptions | Verified provider rule | H |
| Browser CORS | CORS not supported for ZDR orgs — use backend proxy (aligns with OmniDoc ports) | Verified provider rule | H |

**Source:** https://platform.claude.com/docs/en/manage-claude/api-and-data-retention
(accessed 2026-09-13).

### Google Gemini Developer API (Paid Services)

| Claim | Detail | Class | Conf. |
|-------|--------|-------|-------|
| Training | Paid Services: prompts/responses not used to improve products (ToS) | Verified provider rule | H |
| ZDR | Available by request; abuse logs sanitized when approved | Verified provider rule | H |
| Grounding Search/Maps | Stores prompts/context/output **30 days**; **cannot disable** if feature used | Verified provider rule | H |
| Interactions `store` | Default may store state; set `store=false` for zero footprint | Verified provider rule | H |
| Free / AI Studio | Different terms may allow improvement use — **do not assume paid terms** | Unresolved for free tier | M |

**Source:** https://ai.google.dev/gemini-api/docs/zdr (accessed 2026-09-13).

### Voyage / Cohere (embeddings-focused)

- **Voyage:** Hosted API customers can opt out of storage/training for
  zero-day retention (admin + payment method) — FAQ (accessed 2026-09-13).
- **Cohere:** SaaS logs deleted after ~30 days with exceptions; enterprise
  ZDR on request; private deployments keep data outside Cohere access —
  https://cohere.com/enterprise-data-commitments (accessed 2026-09-13).

## Portability / swap

| Practice | Evidence class |
|----------|----------------|
| Hide provider SDKs behind project ports; store `embedding_model_id` + dims with vectors | Common practice / inference |
| Never mix vectors from incompatible models in one index without migration | Verified technical (embedding geometry) |
| Prefer OpenAI-compatible or thin HTTP adapters for swap | Common practice |
| Treat Assistants/hosted vector stores as high lock-in vs app-owned pgvector/Qdrant | Inference from OpenAI retention table |
| OpenRouter as optional **gateway adapter** behind the same ports | Inference — preserves swap to direct OpenAI/Anthropic |

## Cost per unit of work (illustrative, not a quote)

Assuming ~512 tokens/chunk: OpenAI `text-embedding-3-small` ≈
$0.02 × 512/1e6 ≈ **$0.00001 per chunk** — so **embedding** is usually
cheap vs LLM answer tokens. LLM answer cost dominates ask-your-notes;
exact model prices change frequently — **re-fetch pricing in ADR-0001**.

## Findings

### Verified provider requirements

- Mainstream paid APIs currently state no training on API data by default
  (with documented opt-in or free-tier caveats).
- “Zero data retention” is almost always **contractual / approval-gated**,
  not a dashboard toggle for anonymous hobby accounts — `@user` accepts
  standard ~30-day abuse logs (no ZDR sales).
- Some features (OpenAI Assistants/vector_stores; Gemini Search grounding)
  are incompatible with strict ZDR.
- OpenRouter provides `:free` models + documented usage/limit APIs;
  upstream retention still applies when proxied.

### Closed `@user` gates (recorded; not Architect selection)

- Customer BYOK: **v1** (OmniDoc vault).  
- Privacy: standard ~30-day abuse logs OK; no ZDR motion.  
- AI budget path: OpenRouter free first; ~$10 later when operational.

### Unknowns

- Which `:free` models (if any) meet citation/refusal quality bars — PoC.  
- Whether embeddings stay on a direct provider while answers use OpenRouter
  (multi-vendor ops) — Architect choice.  
- Exact new-account free credit allowance on OpenRouter.

## PoC plan

1. Embed 100 fixture chunks via two providers; store model id; prove
   retrieval fails closed across models.
2. Stream a citation answer via backend proxy only; confirm no provider
   key in browser.
3. Operator path: call an OpenRouter `:free` model; exercise
   `GET /api/v1/key` usage fields; hit rate limit deliberately and handle 429.
4. Document retention mode actually active on the trial account (screenshot
   of data-controls / OpenRouter privacy settings).

## Architect inputs (no selection)

1. Dual-mode is **architecture-ready**: operator OpenRouter key **and**
   OmniDoc customer-BYOK vault — distinct from OpenRouter-upstream-BYOK.  
2. OpenRouter is a **shortlist gateway** for free-tier demos; **not** marked
   accepted; Assistants/`vector_stores` remain **forbidden** as corpus SoT.  
3. Usage display can be **thin wrappers** over OpenRouter key/credits/activity
   APIs — not a billing product.  
4. Honest privacy copy: OR metadata defaults + **upstream** ~30-day abuse
   logs when those providers are used.

## Sources — Wave C OpenRouter (2026-09-14)

- https://openrouter.ai/docs/guides/routing/model-variants/free  
- https://openrouter.ai/docs/api-reference/limits  
- https://openrouter.ai/docs/faq  
- https://openrouter.ai/docs/guides/privacy/data-collection  
- https://openrouter.ai/docs/guides/privacy/provider-logging  
- https://openrouter.ai/docs/guides/overview/auth/byok  
- https://openrouter.ai/docs/api/api-reference/credits/get-remaining-credits  
- https://openrouter.ai/docs/api/api-reference/analytics/get-user-activity  
- https://openrouter.ai/blog/tutorials/how-to-get-the-lowest-cost-llm-inference-on-openrouter/  
