# ADR-0004 — Dual-mode BYOK, Vault, Usage, and Key Resolution

- **Status:** `accepted` (accepted by `@user` direction 2026-09-14;
  Architect recorded 2026-09-14)
- **Date:** 2026-09-14
- **Deciders:** Architect; `@user` directed product posture in Task 0.7
- **Related:** ADR-0001 §5 (stack-level embedding/LLM gateway posture);
  `architecture.md` §5.3, §5.6, §5.9–§5.11, §6
- **Consulted evidence:** Wave C
  `docs/research/technical/05-embedding-llm-providers.md`,
  `09-byok-and-usage-metering.md`, `08-candidate-shortlist.md`;
  UX experience constraints REC-13…REC-19
  (`docs/research/ux/08-design-facing-recommendations.md`,
  `09-byok-cookbook-and-dual-mode.md`). UT-* are unrun hypotheses and
  are not used as justification.

> This ADR does **not** close production AI activation or RTL locale
> shipping. Cookbook/wizard chrome is Designer-owned later; this ADR
> owns ports and invariants only.

---

## Context

`@user` (2026-09-14) rejected ADR-0001 §5’s “BYOK later” posture.
Customer BYOK is **v1**. The product must support dual-mode key
resolution: operator free-tier quota for labelled live demos, and
customer-vault keys for sustained/scale use — **never silently mixed**.
Usage/charges display is required when provider APIs allow it, without
building a billing product. Wave C evidence makes OpenRouter a credible
operator free-tier **gateway**; OmniDoc customer-BYOK must not be
confused with OpenRouter-upstream-BYOK.

ADR-0001 stays stack-level. This ADR owns vault, usage/metering, and
runtime key-resolution contracts that `architecture.md` ports implement.

---

## Decision

### 1. Dual-mode spine (binding)

Runtime modes exposed to orchestration and UI chrome:

| Mode | Key source | When |
|------|------------|------|
| `mock` | None (deterministic adapters) | Default until Customer Experience First is validated |
| `operator_free_tier` | Operator-owned OpenRouter (or later swap) key in deploy secrets | Labelled live demo **after** CX gate |
| `customer_key` | Per-tenant OmniDoc vault ciphertext | Opt-in scale / sustained use |

**Never** silently fall back from customer key to operator quota, or the
reverse. Mode switches are explicit. Mock Ask remains available when
only live paths fail (unless the whole product is down) — experience
constraint REC-13 / REC-16.

### 2. Two BYOK meanings (must not conflate)

| Term | Meaning | Who holds the secret |
|------|---------|----------------------|
| **OmniDoc customer-BYOK** | Customer supplies a provider/gateway API key stored in **OmniDoc’s** vault; server adapters call upstream with that key | OmniDoc vault |
| **OpenRouter-upstream-BYOK** | OpenRouter workspace feature: upload provider keys into **OpenRouter**; OR routes with those credentials (may charge platform fee) | OpenRouter |

Product BYOK = **OmniDoc customer-BYOK**. OpenRouter-upstream-BYOK is an
optional **ops** path for the operator account only — not the customer
vault product (`05`, `09`).

### 3. Operator free-tier gateway

**Decision:** **OpenRouter** is the operator free-tier **gateway** behind
the answer (and, when used for embed via the same gateway, embedding)
ports for the labelled live-demo path.

- Prefer OpenRouter `:free` variants first; ~$10 credit purchase only
  **after** the product is operational (`@user`; `05`).
- Exact model IDs are **not** pinned here — Implementer PoC +
  rag-evaluation at production-activation time.
- Embeddings may use OpenRouter **or** a direct embedding provider behind
  the same embed port; store `embedding_model_id` + dims; never mix
  incompatible vectors (`05`).
- **Forbid** Assistants / hosted `vector_stores` (or any gateway
  equivalent) as OmniDoc corpus SoT (`05`, shortlist).

### 4. Credential vault (port-owned)

Year-1 preferred pattern (budget): **env/deploy secrets** for the
operator key + **app-encrypted column** (AES-GCM or equivalent; wrapping
key from env/KMS) for customer keys (`09`). Managed secrets manager is
allowed later if budget/ops justify it — not required for acceptance.

Vault port ops (see `architecture.md` §5.9): `store`, `rotate`,
`revoke`, `verify`. Invariants:

- Server-only decrypt; never in client bundles, repo, or error payloads
- Never log raw keys (masked prefix only after save)
- Tenant-keyed retrieval; same class of bug as forgotten `tenant_id`
- Verify probe distinct from Ask failure (REC-14)
- Cookbook is UX surface; Architect owns these ports

### 5. Usage / metering (not billing)

Usage port wraps provider usage APIs (e.g. OpenRouter
`GET /api/v1/key`, and management-key credits/activity when needed)
and/or local token attribution for direct providers (`05`, `09`).

- Show remaining limits / attributed usage when available
- **`unavailable` is a first-class state** — never invent dollars
- No payment product, invoices, seat matrices, or markup billing
- Shared operator key usage is **not** per-customer metering; attribute
  honestly or require per-customer keys

### 6. Privacy honesty

Accept standard ~**30-day** upstream abuse-log retention when those
providers are used. **No** ZDR sales motion (`@user`; `05`). OpenRouter
default content logging is metadata-oriented; upstream retention still
applies when proxied — market that honestly (REC-17).

---

## Alternatives considered

| Option | Why not |
|--------|---------|
| BYOK later / operator-only keys in v1 | Rejected by `@user` 2026-09-14 |
| OpenRouter-upstream-BYOK as the customer product | Conflates vault ownership; customer keys would live at OpenRouter (`05`, `09`) |
| Direct OpenAI/Anthropic as operator free-tier default | No comparable documented free-variant + usage APIs for $0 demo path; keep as swap-ready adapters (`05`, shortlist) |
| Build OmniDoc billing/invoicing | Out of scope; usage APIs suffice for portfolio honesty (`09`) |
| Pass-through keys (no store) each session | Insufficient for v1 BYOK UX (`09`) |
| Live-AI-first onboarding skipping mocks | Violates Customer Experience First and REC-13 |

---

## Consequences

**Liked**

- Ports stay provider-neutral; UI never holds keys
- Dual-mode matches portfolio demo → scale path without silent payer mix
- Thin usage wrappers avoid inventing a commerce stack

**Disliked / accepted costs**

- Encrypted-column vault without HSM is a maturity tradeoff — document
  honestly for portfolio demos (`09`)
- OpenRouter is an extra sub-processor; free-model capacity/quality vary
  (`05`)
- Operator quota exhaustion and 429 handling are first-class demo ops
- Production AI still gated — this ADR authorizes **ports and mocks**,
  not live activation

---

## Migration / rollback

- Forward: implement §5.9–§5.11 mocks first; operator env key only after
  CX gate; customer vault after verify path works end-to-end
- Swap gateway: new adapter behind embed/answer ports; re-store model
  ids; re-eval citations/refusals
- Rollback of customer BYOK: revoke all vault rows; force
  `mock` / `operator_free_tier` only
- Rollback of OpenRouter: point operator mode at a direct provider
  adapter; usage port may report `unavailable` until remapped

---

## Security / privacy

- Threat-model skill applies to vault and key-resolution boundaries
- Mixing operator and customer keys in one process requires strict
  tenant-keyed retrieval and mode stamping on every outbound call
- Management keys for OpenRouter `/credits` and `/activity` are
  privileged — store like other secrets (`09`)
- Prompt construction still treats notes as untrusted evidence
  (ai-content-safety)

---

## Verification

1. Mock Ask fixtures include refusal/partial before any live key.
2. Mode stamp on every embed/ask: assert no silent cross-mode key use.
3. Vault PoC: fake customer key encrypted at rest; absent from logs and
   client; revoke/rotate makes old ciphertext unusable.
4. Usage PoC: display OpenRouter `GET /api/v1/key` fields **or** honest
   `unavailable`.
5. `quota_exhausted` distinguishes `operator_free_tier` vs
   `customer_key` to the UI.
6. Production-activation checklist (separate gate): retention mode of the
   actual account; no Assistants corpus; tenant filters on chunks sent
   to model.
7. Falsify if verify cannot be distinguished from Ask failures, or if
   provider usage APIs cannot support an honest strip without inventing
   meters — then keep `unavailable` and do not fake billing.

---

## References

- `docs/research/technical/05-embedding-llm-providers.md`
- `docs/research/technical/09-byok-and-usage-metering.md`
- `docs/research/technical/08-candidate-shortlist.md`
- `docs/research/ux/09-byok-cookbook-and-dual-mode.md`
- `docs/research/ux/08-design-facing-recommendations.md` (REC-13…19)
- `architecture.md` §5.3, §5.6, §5.9–§5.11, §6
- `docs/adr/ADR-0001-frontend-and-platform-stack.md` §5
