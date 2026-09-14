# Embedding and LLM Provider Posture

**Research date / access date:** 2026-09-13  
**Version pins / provider policy dates:** [`../version-ledger.md`](../version-ledger.md) (verified 2026-09-14; re-confirm retention + pricing rows on the live account before any external claim)  
**Question:** Mainstream embedding/LLM options for OmniDoc — retention,
training terms, BYOK feasibility, unit cost, swap portability. Evidence
only; no vendor selection. Not legal advice.

## Shared OmniDoc constraints

- UI must not call providers directly (ports later; Customer Experience
  First allows mocks first).
- Data ownership / privacy are first-class Extension-First criteria.
- Production AI activation remains an open gate.

## BYOK definition used here

**Bring-your-own-key:** end customer or operator supplies API credentials
stored in project-controlled secret storage; OmniDoc adapters call the
provider using those credentials. Distinct from provider “ZDR enterprise
contracts,” which are account-level data-handling arrangements.

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
  not a dashboard toggle for anonymous hobby accounts.
- Some features (OpenAI Assistants/vector_stores; Gemini Search grounding)
  are incompatible with strict ZDR.

### Unknowns / professional-confirmation / @user gates

- Will OmniDoc pursue formal ZDR (sales motion) or rely on standard 30-day
  abuse retention + mock-first UX?
- Customer BYOK in product vs operator-owned keys only?
- Allowed providers for portfolio demos (brand story)?
- Lawyer/privacy adviser review if marketing privacy claims beyond provider
  docs (Researcher does **not** certify compliance).

## PoC plan

1. Embed 100 fixture chunks via two providers; store model id; prove
   retrieval fails closed across models.
2. Stream a citation answer via backend proxy only; confirm no provider
   key in browser.
3. Document retention mode actually active on the trial account (screenshot
   of data-controls settings).
