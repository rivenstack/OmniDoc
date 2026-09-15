---
handoff_id: H-2026-09-15-P0B-UBE
affinity: decision-gate
track: parallel
status: ready
phase: "0b"
task: "U-BE"
lane: shared
from: commander
to: user
created: 2026-09-15
---

# U-BE — Accept / reject / change ADR-0005

## Start Command

```text
Read docs/handoffs/active/phase-0b-task-u-be-user.md and ADR-0005. Answer the MUST-NOW questions. Reply accept, reject, or list changes. Do not scaffold the API until this gate closes.
```

## Objective

Owner: `@user`. **Lane:** `shared` (decision). D-01 `/designer` remains
live on `docs/handoffs/current.md` — this file does **not** replace it.

Close the Backend Stack Close-out. ADR-0005 is **`proposed`**. Scaffolding
S-01a/S-01b and B-01 is **forbidden** until you accept (or accept with
listed amendments).

## Required Reading

1. [`docs/adr/ADR-0005-backend-application-stack.md`](../../adr/ADR-0005-backend-application-stack.md)
2. This file (questions + where to read adverse/benefits)
3. Optional deep-dives (R-BE):
   - [`10-backend-runtime-java-spring.md`](../../research/technical/10-backend-runtime-java-spring.md)
   - [`11-monorepo-polyglot-nx-gradle.md`](../../research/technical/11-monorepo-polyglot-nx-gradle.md)
   - [`12-auth-java-spring-security.md`](../../research/technical/12-auth-java-spring-security.md)
   - [`13-spring-ai-openrouter-byok-fit.md`](../../research/technical/13-spring-ai-openrouter-byok-fit.md)
   - [`14-python-sidecar-policy.md`](../../research/technical/14-python-sidecar-policy.md)
   - [`15-java-test-obs-migrate.md`](../../research/technical/15-java-test-obs-migrate.md)
4. Reopen banners: ADR-0001 §6, ADR-0002, `architecture.md` §5.7
5. Existing (unchanged): ADR-0004 dual-mode; `architecture.md` §2 tenancy;
   [`03-multi-tenant-isolation.md`](../../research/technical/03-multi-tenant-isolation.md) RLS footguns;
   [`06-auth-identity.md`](../../research/technical/06-auth-identity.md) (TS lens — incomplete for Java)

## Recorded intent (not ADR acceptance)

From `@user` 2026-09-15 (backend-stack reopen chat):

- **No Node.js API.** Java Spring Boot is the skill and portfolio reason
  (Next.js already accepted).
- Python only if it is clearly better for a bounded task and cheap.

Architect treated those as **drivers** and proposed ADR-0005 accordingly.
You still must **accept, reject, or change** the ADR.

## MUST-NOW questions

Answer each. Architect proposal is in **bold**. Changing a bold item is
an amendment, not a silent Implementer choice.

### 1. API / worker language

Confirm **Java 21 + Spring Boot 4.1.x** vs keep a Node API vs Java 25
instead of 21.

- Why: unblocks S-01b / B-*.
- Read: ADR-0005 §1; `10`; ledger JVM block.
- Adverse of Java: dual CI; JVM RAM on Free Tier (`t3.micro` = 1 GiB,
  I-03). Benefit: you implement the API; honest full-stack story.
- Adverse of keeping Node: contradicts your stated skill path; Better
  Auth stays but you are not a Node API programmer.

### 2. Monorepo shape

Confirm **one repo: Nx/pnpm FE + Gradle API beside Nx (`run-commands`)**
vs require `@nx/gradle` vs two repos.

- Read: ADR-0005 §3; `11`; ADR-0002 reopen banner.
- Adverse of `@nx/gradle`: plugin still experimental. Adverse of two
  repos: OpenAPI/fixture versioning. Benefit of one repo: one product
  clone.

### 3. Auth class

Confirm **Spring Security HTTP-only session cookies** + first-party
membership tables vs JWT resource server vs Keycloak / Spring
Authorization Server vs hybrid Better Auth-in-Next.

- Read: ADR-0005 §4; `12`; `architecture.md` §2; `06` (Better Auth ops
  risk still applies — you own sessions).
- **Avoid hybrid:** retrieval API must be membership authority (IDOR).
- Adverse of sessions: CSRF + cookie flags are yours. Benefit: one
  authority for tenant isolation. Year-1 SSO still not required.

### 4. Spring AI posture

Confirm **Spring AI 2.0.x in adapters only** vs Spring AI as the domain
vs LangChain4j / raw HTTP instead.

- Read: ADR-0005 §5; `13`; ADR-0004; `architecture.md` §5.3 / §5.6 / §5.11.
- Adverse of “Spring AI is the domain”: types leak to FE; `PgVectorStore`
  fights versioned chunks + RLS. Benefit of adapters: Spring AI résumé
  without breaking ports.

### 5. Python sidecar

Confirm **not in Phase 1** (in-process Java/Tika/Batch) vs eval-scripts
only vs allow a named PoC exception now.

- Read: ADR-0005 §6; `14`.
- Adverse of a sidecar: second runtime on Free Tier + extra tenant
  re-check. Benefit: only if a named library uniquely wins.

### 6. Gradle vs Maven

Confirm **Gradle** (proposal) vs Maven.

- Read: ADR-0005 §2; `10`. Low stakes; Architect can keep the other as
  fallback.

## CAN-WAIT (do not block this gate)

Logback encoder pin; OTel year-1; WebMVC vs WebFlux; GraalVM;
Testcontainers PG18 image tag; JPA vs JDBC for **CRUD** (vector/RLS path
is proposed JDBC). See ADR-0005 and `15`.

**Standing RLS rule (already accepted):** runtime role non-owner
`NOBYPASSRLS`; tenant GUC on the same connection in a transaction;
Flyway must not use the app role; no Spring AI `initialize-schema=true`.

## Allowed Write Paths

`@user` answers in chat (or append an Outcome here). Agents must not
flip ADR-0005 to `accepted` without those answers.

Commander (after accept): `context.md`, `docs/planning/implementation-tracks.md`,
archive this file, open S-01a and/or S-01b.

## Deliverables

1. Accept ADR-0005 as written, **or** reject, **or** list numbered
   changes to §1–§6.
2. Explicit answers to questions 1–6 (even “agree with Architect”).

## Constraints / Prohibited Decisions

- Do not authorize production OpenRouter keys
- Do not revive archived Node S-01
- D-01 continues regardless of this gate

## Acceptance Criteria

- Every MUST-NOW question has an `@user` answer
- ADR-0005 status becomes `accepted`, `rejected`, or `proposed` with
  listed amendments for Architect rewrite
- No API scaffold started in this task

## Dependencies / Risks

- Blocks S-01a, S-01b, B-01, Java-shaped B-03
- Does not block D-01
- Risk: accepting Spring AI as domain — forbidden without rewriting
  ports (Architect must push back)

## Gates

- Production AI remains gated
- RTL remains deferred
- ADR-0005 remains `proposed` until you answer

## Completion Instructions

1. Answer in chat (numbered 1–6) plus accept / reject / amend.
2. Commander records Outcome, sets `status: completed`, archives this
   file, flips ADR-0005 if accepted, opens **S-01a** and **S-01b**
   (if Java accepted) from `docs/planning/implementation-tracks.md`.
3. Do **not** overwrite `docs/handoffs/current.md` (D-01).
