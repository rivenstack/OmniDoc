---
handoff_id: H-2026-09-15-P0B-RBE
affinity: research
track: parallel
status: completed
phase: "0b"
task: "R-BE"
lane: shared
from: commander
to: researcher
created: 2026-09-15
completed: 2026-09-15
---

# R-BE — Backend Application Stack Evidence (Java / Spring)

## Start Command

```text
/researcher Read docs/handoffs/active/phase-0b-task-r-be-researcher.md and execute R-BE exactly. Produce classified Java/Spring/auth/monorepo/Python/test evidence only. Do not select a stack. Do not edit ADRs or architecture.md.
```

## Objective

Owner: `/researcher`. **Lane:** `shared` (research). Recommended human
reader: Backend.

`@user` (backend developer) declined a Node.js API. Preference:
**Java Spring Boot + Spring AI**, with Python only if a bounded task is
clearly better and cheap. Phase 0 never researched a Java backend.
Better Auth is a TypeScript library and cannot be the Java identity
implementation.

Produce dated, classified evidence for `/architect` ADR-0005. **Do not
select** Spring Boot, an auth product, Maven vs Gradle, or a Python
sidecar.

Parallel **D-01** `/designer` owns `docs/design/**` and
`docs/handoffs/current.md`. Do not wait for it. Do not write design
files.

**S-01** (Node `apps/api` scaffold) is archived `blocked` — do not
revive it.

## Required Reading

1. `context.md` (read-only)
2. `architecture.md` (read-only) — §1, §2, §5.1–§5.11, §6
3. `AGENTS.md` Extension-First criteria
4. `docs/memory/researcher.md`
5. ADR-0001 §5–§7, ADR-0002, ADR-0004 (read-only)
6. Existing: `docs/research/technical/03`, `05`, `06`, `07`, `08`, `09`,
   `00-evidence-matrix.md`, `docs/research/version-ledger.md`
7. This handoff

## Inputs / Evidence

- `@user` 2026-09-15: no Node.js backend; Java Spring Boot programmer;
  full-stack portfolio (Next.js FE already accepted + Java BE);
  Python allowed only if clearly better and cheap.
- Keep (do not reopen unless evidence forces it): Next.js, TipTap,
  Postgres 18 + RLS DiD, pgvector, ADR-0004 dual-mode BYOK, AWS
  Free-plan topology class, ADR-0003 frontend toolchain.
- Reopen for Architect: ADR-0001 §6 Better Auth; ADR-0002 Node
  `apps/api` / TS `packages/domain`; architecture §5.7 production path.
- MUST-NOW questions Architect will ask `@user` (evidence must support
  tradeoffs, not answers): API language; monorepo shape; auth class;
  Spring AI behind ports vs as domain; Python policy; Java 21 vs 25;
  Maven vs Gradle.

Chat notes about Spring versions are **not** evidence. Re-fetch
primary docs with access date **2026-09-15**.

## Allowed Write Paths

- `docs/research/technical/10-backend-runtime-java-spring.md` (create)
- `docs/research/technical/11-monorepo-polyglot-nx-gradle.md` (create)
- `docs/research/technical/12-auth-java-spring-security.md` (create)
- `docs/research/technical/13-spring-ai-openrouter-byok-fit.md` (create)
- `docs/research/technical/14-python-sidecar-policy.md` (create)
- `docs/research/technical/15-java-test-obs-migrate.md` (create)
- `docs/research/technical/README.md` (index rows)
- `docs/research/technical/00-evidence-matrix.md` (supplement rows)
- `docs/research/technical/06-auth-identity.md` (Wave D pointer only)
- `docs/research/technical/08-candidate-shortlist.md` (Java categories)
- `docs/research/version-ledger.md` (Java/Spring/test rows)
- `docs/memory/researcher.md` (durable lessons only)
- This file: status + Outcome

**Must not touch:** `context.md`, `architecture.md`, `docs/adr/**`,
`docs/handoffs/current.md`, `docs/design/**`, `docs/planning/**`,
application source, UX research.

## Deliverables

1. `10` — Spring Boot 3.5 vs 4.x, Java 21 vs 25, Maven vs Gradle,
   SSE/workers, ECS/EC2 container fit. No winner.
2. `11` — Nx+`@nx/gradle` vs Gradle beside Nx vs two repos. Nx cannot
   enforce Java import boundaries.
3. `12` — Spring Security session cookies vs JWT vs Security 7
   Authorization Server vs Keycloak vs hybrid Better Auth-in-Next
   (call out tenant-authority split). Org/membership still first-party.
4. `13` — Spring AI 2.x / LangChain4j / raw OpenAI-compatible HTTP
   **behind** architecture ports. Dual-mode / OpenRouter. Forbid
   Assistants/`vector_stores` / Spring AI `PgVectorStore` as corpus SoT.
5. `14` — Python sidecar policy evidence: default in-process Java
   (Tika/Batch); when a named library uniquely wins.
6. `15` — Logback JSON vs Log4j2 vs OTel; JUnit 5 / Testcontainers /
   ArchUnit / springdoc OpenAPI → TS contracts; Flyway vs Liquibase;
   JPA vs JDBC vs jOOQ; RLS role split.
7. Matrix + shortlist deltas; version-ledger pins with access dates.
8. Short **Architect inputs** (classified, no selection) at the end of
   each new file.

## Constraints / Prohibited Decisions

- Do **not** mark Spring Boot, Spring AI, or any auth product `accepted`
- Do **not** write or amend ADRs / `architecture.md`
- Do **not** treat chat Spring version bullets as verified
- Popularity is not fitness; include adverse evidence
- Do not claim RTL locale support
- Do not authorize scaffolding

## Acceptance Criteria

- Every version/capability claim cites primary docs + ledger row
- Better Auth called out as **unfit** as a Java identity implementation
- Hybrid Better Auth (Next) + Java API is documented as a tenant-
  authority risk, not a convenience default
- Spring AI types leaking to HTTP / `PgVectorStore` as SoT called out
- Python default-in-process is evidence, not a decision
- No vendor chosen

## Directionality / accessibility checks

N/A for backend evidence docs.

## Dependencies / Risks

- Parallel with D-01 (non-overlapping writes).
- Blocks A-BE (ADR-0005).
- Risk: selecting Spring Boot in the evidence package — **forbidden**.
- Risk: proposing Better Auth-in-Next as the identity SoT — **forbidden
  as a silent default**.

## Gates

- Production AI activation remains gated
- RTL remains deferred
- ADR-0001 §1–§5, §7 and ADR-0004 stay accepted unless evidence
  **forces** a reopen (document if so; do not reopen yourself)

## Completion Instructions

1. Write the six new briefs + index/ledger/matrix/shortlist supplements.
2. Append Outcome; set this file `status: completed`.
3. Durable lessons only in `docs/memory/researcher.md`.
4. Do **not** overwrite `docs/handoffs/current.md`.
5. Do **not** open A-BE — Commander opens the Architect handoff after
   integration.

## Outcome

Completed 2026-09-15. Evidence only — **no stack selected**.

Created `docs/research/technical/10`–`15`. Supplemented `00`, `06`, `08`,
`README.md`, `docs/research/version-ledger.md` (Spring Boot 4.1.1,
Spring AI 2.0.1, Java 21/25 LTS, springdoc 3.1.1). Durable lessons in
`docs/memory/researcher.md`.

Better Auth documented as unfit on the JVM. Hybrid Next+Java identity
called out as tenant-authority risk. Spring AI `PgVectorStore` as
corpus SoT called out as forbidden pattern. Python default-in-process
is labelled evidence, not a decision.
