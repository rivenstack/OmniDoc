---
name: threat-model
description: "Create or review an OmniDoc threat model for a new feature, trust boundary, data flow, provider integration, BYOK flow, authentication/authorization change, or externally reachable surface."
paths:
  - "backend/**"
  - "frontend/**"
  - "infra/**"
  - "docs/adr/**"
  - "docs/project/**"
---

# Threat Model

Use this skill when a change introduces or materially changes a trust boundary, sensitive data flow, authentication/authorization path, external provider, credential lifecycle, or ingestion surface.

## Inputs

Read:

- accepted `architecture.md`;
- relevant ADRs;
- active handoff;
- feature/data-flow description;
- relevant security research.

If the actual data flow is unclear, do not invent one. Mark the gap and route it to Architect/Implementer as appropriate.

## Procedure

1. Define the protected assets:
   - user/workspace/document data;
   - document versions/chunks/embeddings;
   - identity/session/JWT material;
   - BYOK/provider credentials;
   - audit/log/telemetry data;
   - internal service credentials;
   - billing/quota/usage state if applicable.

2. Draw or describe the data flow and trust boundaries:
   - browser;
   - frontend server/BFF if present;
   - backend API;
   - Keycloak;
   - PostgreSQL/pgvector;
   - Redis/queue if present;
   - background workers;
   - AI/embedding providers;
   - external fetch/ingestion sources.

3. Enumerate threats using a practical STRIDE-style pass where relevant:
   - spoofing;
   - tampering;
   - repudiation/audit gaps;
   - information disclosure;
   - denial/abuse;
   - privilege escalation.

4. Explicitly test OmniDoc-specific risks:
   - IDOR/BOLA/cross-workspace access;
   - missing ACL checks;
   - retrieval across tenant boundaries;
   - service-role/RLS bypass;
   - prompt injection;
   - malicious retrieved content;
   - unsafe remote fetch/SSRF;
   - XSS from rendered Markdown/HTML;
   - secret leakage to browser/logs/traces;
   - BYOK compromise/rotation/revocation gaps;
   - provider data-retention/privacy assumptions;
   - replay/duplicate background jobs;
   - stale authorization in caches;
   - model/tool output treated as trusted instructions.

5. For each credible threat record:
   - asset;
   - attacker/precondition;
   - attack path;
   - impact;
   - existing control;
   - required control;
   - verification/test;
   - residual risk.

6. Separate:
   - accepted control;
   - proposed mitigation;
   - unresolved architecture question.

7. Route material unresolved architecture/security decisions to `/architect`.

## Output

Prefer a compact table:

| Threat | Asset / Boundary | Severity | Existing Control | Required Mitigation | Verification |
|---|---|---:|---|---|---|

Then include:

- highest-risk findings;
- architecture decisions required;
- tests required;
- residual risks;
- assumptions that still need evidence.

## Guardrails

- Do not call a feature secure merely because authentication exists.
- Do not assume provider claims cover the application's threat model.
- Do not recommend storing secrets in browser persistence without an accepted ADR.
- Do not expose exploit details in public-facing docs if doing so would create unnecessary risk.
