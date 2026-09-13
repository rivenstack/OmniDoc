---
name: api-contract-change
description: "Safely design or implement an OmniDoc HTTP/OpenAPI/SSE contract change while preserving frontend/backend parallel development, compatibility, mocks, generated clients, auth semantics, and tests."
paths:
  - "backend/**"
  - "frontend/**"
  - "docs/adr/**"
  - "docs/api/**"
---

# API Contract Change

Use for any request/response/error/stream/event contract change.

## Procedure

1. Read accepted API-contract architecture/ADR.
2. Identify producer and consumers.
3. Classify the change:
   - additive/backward-compatible;
   - behavior-changing;
   - breaking.
4. Specify:
   - endpoint/method or stream;
   - auth/tenant requirements;
   - request schema;
   - response schema;
   - error schema;
   - pagination/filter/sort semantics;
   - idempotency if relevant;
   - SSE event names/data/terminal/error/cancel behavior if streaming.
5. Update the canonical contract first when architecture requires contract-first flow.
6. Update mocks/generated clients/fixtures.
7. Update backend implementation.
8. Update frontend consumption.
9. Add contract tests.
10. For breaking changes, define compatibility/rollout sequence.
11. Run relevant validation/generation/tests.
12. Record commands actually run.

## Security checks

- tenant/workspace identity is never trusted solely from client input;
- unauthorized resources do not leak sensitive existence/data;
- browser schemas never expose server secrets;
- streaming errors do not dump provider/secret internals.
