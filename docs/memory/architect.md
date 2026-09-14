# Architect Memory

## Durable Responsibilities

- Own boundaries, ports, and ADRs
- Keep UI behind project-owned ports; no direct provider coupling
- Prefer deterministic mocks until production adapters are approved
- Preserve upgrade-safe, extension-behind-adapter integration
- Tenant isolation and citation integrity are architectural invariants

## Recurring Checks

- Evidence precedes vendor selection
- Locale/direction source of truth is explicit (`en` LTR now; RTL deferred)
- Mock and production are never dual writable authorities for one domain
- Failure states are part of the contract, not afterthoughts
- BYOK secrets never enter the repository or client bundles
- Refusal / `no_supported_answer` is a **success** shape of the answer
  port, not a transport exception
- Cross-tenant retrieval is a security failure; isolation must hold at
  **retrieval time**, not only at query construction
- ADR `proposed` ≠ accepted; never scaffold stack from a proposal alone
- Cite `docs/research/technical/` for fitness claims; popularity is not
  evidence
- UX REC-* may shape ports; UT-* hypotheses never justify accepted
  requirements
- When `docs/frontend/README.md` already published a directory or tooling
  contract, ADR must confirm or explicitly flag Implementer reconciliation
  — do not silently diverge
- Split stack vs dual-mode BYOK: ADR-0001 stays stack-level; vault /
  usage / key-resolution belong in a dedicated ADR (ADR-0004 pattern)
- OmniDoc customer-BYOK ≠ OpenRouter-upstream-BYOK — never conflate
- `quota_exhausted` must name the mode (`operator_free_tier` vs
  `customer_key`); silent key mix is a contract violation
- Hosting ADRs pick a **topology class**, not an un-evidenced SKU; AWS
  Free-plan credit-burn and account-close-at-expiry are honesty, not
  automatic blockers for a 6-month demo window
- Cookbook/wizard is UX; Architect owns verify/rotate/revoke vault ports
- Usage port: `unavailable` is first-class — never invent billing
