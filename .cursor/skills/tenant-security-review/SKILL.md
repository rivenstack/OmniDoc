---
name: tenant-security-review
description: "Review an OmniDoc backend, retrieval, document, workspace, or AI change for authentication, tenant isolation, ACL, IDOR, RLS, secret, prompt/content-trust, and logging risks."
paths:
  - "backend/**"
  - "frontend/**"
  - "infra/**"
  - "docs/adr/**"
---

# Tenant Security Review

Use when a change can access user/workspace/document/chunk/version/conversation/provider-secret data.

## Review sequence

1. Identify the trust boundary and authenticated principal.
2. Identify how workspace/tenant membership is derived.
3. Trace authorization through:
   - API boundary;
   - application/service layer;
   - persistence query;
   - retrieval/vector query;
   - background jobs;
   - citation/source fetch.
4. Verify client-supplied workspace/document IDs are treated as selectors, not authority.
5. Check IDOR/BOLA:
   - guessed ID from another workspace;
   - moved/deleted document;
   - stale version;
   - shared/revoked access.
6. Verify retrieval filtering happens before ranking/answer generation as designed.
7. Verify RLS/service-role behavior matches the accepted ADR.
8. Check secret exposure:
   - code;
   - config;
   - browser bundle/storage;
   - logs/traces;
   - errors;
   - telemetry.
9. Check untrusted content:
   - Markdown/HTML;
   - prompt injection;
   - links/remote fetch/SSRF;
   - file metadata.
10. Verify audit events where required.
11. Require negative tests for the identified boundaries.

## Output

Report findings by severity with exact code/query/path evidence and required remediation.

Do not claim the system is secure because the UI hides inaccessible resources.
