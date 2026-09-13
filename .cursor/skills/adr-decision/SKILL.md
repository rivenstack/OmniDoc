---
name: adr-decision
description: "Produce or review a material OmniDoc architecture decision from evidence, alternatives, drivers, consequences, migration, security, and verification."
paths:
  - "architecture.md"
  - "docs/adr/**/*.md"
  - "docs/research/**/*.md"
---

# ADR Decision

Use when a choice is long-lived, cross-cutting, expensive to reverse, security-sensitive, or likely to be questioned later.

## Before deciding

Read:

- accepted `architecture.md`;
- relevant research;
- existing ADRs;
- active handoff.

If required evidence is missing, stop and route research instead of manufacturing certainty.

## Procedure

1. State the decision context.
2. Separate verified facts from assumptions.
3. List 2–3 credible options.
4. Define decision drivers.
5. Compare:
   - correctness;
   - tenant/security impact;
   - privacy/secrets;
   - performance/scalability;
   - operations/observability;
   - migration/rollback;
   - developer experience;
   - portability/lock-in;
   - cost where material.
6. Make one bounded decision.
7. Record rejected options and why.
8. State consequences.
9. Define migration/rollout/recovery.
10. Define verification.
11. Write/update the ADR using `docs/adr/ADR-TEMPLATE.md`.
12. Update `architecture.md` with accepted truth and ADR link.

## Guardrails

- Architect owns acceptance.
- Research recommendations are inputs, not decisions.
- Do not bundle unrelated choices into one ADR.
- Do not decide BYOK, tenancy, RLS, retrieval, or deployment by convention alone.
