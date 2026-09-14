# BYOK Vault Patterns and Usage Metering (Wave C)

**Research date / access date:** 2026-09-14  
**Companion to:** [`05-embedding-llm-providers.md`](./05-embedding-llm-providers.md)  
**Question:** How can OmniDoc support dual-mode operator free-tier +
customer-entered keys, and show usage/charges, at portfolio budget —
**evidence only; no vault product selected**.

## Scope

| In scope | Out of scope |
|----------|--------------|
| Distinguishing OmniDoc customer-BYOK vs OpenRouter-upstream-BYOK | UX cookbook / wizard copy (Task 0.8b) |
| Secret-storage patterns at ~$0–$20 infra | Building a payment/billing product |
| Provider APIs that expose usage without inventing meters | Legal certification of key-handling |

## Definitions (repeat for Architect)

1. **OmniDoc customer-BYOK** — customer API key stored in **OmniDoc**
   secret storage; server ports call OpenRouter or a direct provider with
   that key.
2. **OpenRouter-upstream-BYOK** — keys stored in **OpenRouter’s** BYOK
   settings so OpenRouter authenticates to upstream providers. Optional
   ops path; **not** the same as (1). Fee/allowance rules are OpenRouter’s
   (`05`).

## Secret-storage patterns (portfolio budget)

| Pattern | Cost posture | Ops | Tenant isolation notes | Evidence class |
|---------|--------------|-----|------------------------|----------------|
| **Env / deploy secrets** (operator key only) | $0 incremental | Simple; rotation = redeploy | No per-customer keys | Common practice |
| **App-encrypted column** (AES-GCM or libsodium; key from env/KMS) | $0 if encryption key is env; small if using cloud KMS | Project owns crypto + rotation + backup of wrapped keys | Per-tenant rows; never log plaintext; decrypt only in worker/API | Common practice |
| **Managed secrets manager** (e.g. AWS Secrets Manager, Vault) | Often **not** $0 (API + storage); may burn AWS Free Tier credits | Strong rotation/IAM story | Map secret name ↔ tenant; IAM least privilege | Verified provider pricing shape / practice |
| **Pass-through only (no store)** | $0 | Customer pastes key each session | Weak UX; still must not leak to logs/client storage carelessly | Inference — usually insufficient for “v1 BYOK” |

**Architecture controls already required** (`architecture.md` §6):
server-side vault only; rotation/revocation; never log raw keys; no keys
in client bundles or error payloads.

**Inference (not selection):** For portfolio/demo dual-mode, **env for
operator key + encrypted column for customer keys** fits the $0 preference
better than a paid managed vault — **PoC** threat-model and rotation
drill before ADR claims “production-grade vault.”

## What can be shown as usage / charges

### When traffic uses an **OpenRouter** key (operator or customer-supplied OR key)

| Source | Shows | Auth | Class |
|--------|-------|------|-------|
| `GET /api/v1/key` | Credit usage (all-time + daily/weekly/monthly), optional key limit remaining, BYOK usage fields, `is_free_tier` | API key | Verified (`05`) |
| `GET /api/v1/credits` | `total_credits`, `total_usage` | Management key | Verified |
| `GET /api/v1/activity` | Per-endpoint activity, last 30 UTC days | Management key | Verified |
| OpenRouter Activity UI | Same narrative for humans | Web session | Verified FAQ |

Enough for an honest **“usage from provider”** panel: credits used,
recent activity, free-tier flag — **without** card charging, invoices, or
markup billing.

### When traffic uses **direct** OpenAI / Anthropic / etc. (OmniDoc customer-BYOK)

| Source | Shows | Class |
|--------|-------|-------|
| Provider usage dashboards / APIs (vendor-specific) | Spend/tokens if customer’s account | Common practice — verify per vendor at implementation |
| Local accounting | Prompt/completion tokens from API responses summed per tenant | Common practice / inference |

Do **not** invent a SaaS billing product to satisfy “show usage.”

### OpenRouter-upstream-BYOK fees

If the **operator** enables OpenRouter-upstream-BYOK, OpenRouter may
deduct a **5%** fee above allowance from **OpenRouter credits** (`05`).
That is OR platform metering — still not OmniDoc billing.

## Dual-mode feasibility (technical)

| Mode | Key location | Typical meter | Budget note |
|------|--------------|---------------|-------------|
| Operator free-tier demo | OmniDoc env → OpenRouter `:free` | `GET /api/v1/key` + rate-limit headers on 429 | $0 tokens; RPD caps (`05`) |
| Operator after ~$10 credit | Same + OR credits | Credits + activity APIs | `@user`: spend **after** operational |
| Customer scale | OmniDoc vault → customer’s OR or direct provider key | OR APIs **or** upstream usage | Customer pays their provider |

## Risks

- Encrypting keys at rest without HSM/KMS is a **maturity** tradeoff —
  document honestly for portfolio demos.
- Mixing operator and customer keys in one process requires strict
  tenant-keyed retrieval (same class of bug as forgotten `tenant_id`).
- Showing OR `total_usage` for a **shared** operator key is not
  per-customer metering — need per-customer keys or local attribution.
- Management keys for `/credits` and `/activity` are privileged — store
  like other secrets.

## PoC plan

1. Store a fake customer key encrypted-at-rest; prove decrypt only on
   server Ask path; prove key absent from logs and client.
2. Hit OpenRouter `:free` + display `usage_daily` / `limit_remaining` from
   `GET /api/v1/key` in a stub admin page (mock UI OK).
3. Revoke/rotate: old ciphertext unusable after key version bump.

## Architect inputs (no selection)

1. Product BYOK = **OmniDoc vault**, not OpenRouter-upstream-BYOK.  
2. Usage UI can be **API passthrough** for OpenRouter; local token sums
   for direct providers.  
3. Vault choice (env vs encrypted column vs managed) remains **open** —
   budget favors env + encrypted column for year-1.

## Sources (accessed 2026-09-14)

- OpenRouter limits / FAQ / BYOK / credits / activity — URLs in `05`  
- `architecture.md` §5.3, §5.6, §6 (read-only)  
