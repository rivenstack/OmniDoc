---
name: reproducible-baseline-check
description: "Explicitly verify OmniDoc's local developer baseline from a clean-clone perspective: config examples, infrastructure, backend, frontend, auth, database/pgvector, health, tests, lint, and docs."
disable-model-invocation: true
---

# Reproducible Baseline Check

Invoke manually before accepting the Phase-0 implementation baseline or after major local-dev changes.

## Clean-clone mindset

Do not rely on:

- uncommitted files;
- shell aliases;
- globally installed project tools unless documented;
- existing database state;
- secrets not described by setup docs;
- IDE-only configuration.

## Checklist

1. Read README/setup docs from the beginning.
2. Verify `.env.example`/config examples contain names and safe placeholders only.
3. Verify required runtime/tool versions are documented from accepted architecture.
4. Start infrastructure using documented commands.
5. Verify PostgreSQL + pgvector readiness.
6. Verify local Keycloak/identity setup.
7. Start backend.
8. Start frontend.
9. Authenticate.
10. Run a documented health/smoke journey.
11. Run:
    - backend tests;
    - frontend tests;
    - lint;
    - type checks;
    - build;
    - contract validation;
    as applicable.
12. Verify shutdown/restart does not depend on hidden state.
13. Record actual commands/results and any machine-specific assumptions.

## Result

Use PASS / FAIL / NOT VERIFIED for each step.

Do not call a baseline reproducible if only the original developer's machine was tested without a clean-state approximation.
