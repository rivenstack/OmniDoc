---
handoff_id: H-2026-09-15-P0B-ABE2
affinity: architecture
track: parallel
status: completed
phase: "0b"
task: "A-BE2"
lane: shared
from: commander
to: architect
created: 2026-09-15
---

# A-BE2 — Finalize ADR-0005 (`accepted` + U-BE amendments)

## Outcome (Architect, 2026-09-15)

ADR-0005 marked **`accepted`**. Pins Commander may quote into S-01a /
S-01b:

| Surface | Pin |
|---------|-----|
| Runtime | Java **21** + Spring Boot **4.1.x** (ledger **4.1.1**) |
| Build | **Gradle** |
| Monorepo | Option B — Gradle beside Nx via `run-commands` (not `@nx/gradle`) |
| Auth | Spring Security HTTP-only session cookies + first-party membership |
| Spring AI | **2.0.x** (ledger **2.0.1**) in adapters only |
| Python | Not in Phase 1 |
| Logs | **Log4j2** (`spring-boot-starter-log4j2`); JSON structured; never BYOK keys / note bodies; OTel year-1 optional; log sink → I-* |
| CRUD | **Spring Data JDBC** (not JPA) |
| Vector / RLS | **JdbcTemplate** + `com.pgvector:pgvector` **0.1.6** |
| Migrations | **Flyway** (migration role ≠ app role) |
| Tests / CI | JUnit / Testcontainers / ArchUnit OK **within Free Tier CI minutes** |
| Domain SoT | Java interfaces in `apps/api`; TS `packages/domain` not backend SoT |

Also amended: ADR-0001 §6 (port stays; Better Auth library superseded);
ADR-0002 (JVM `apps/api` + ArchUnit); `architecture.md` banners;
`docs/adr/README.md`; ledger JVM block.

**Did not** scaffold `apps/**` / `packages/**`. **Did not** overwrite
`docs/handoffs/current.md` (D-01 remains live). **Did not** open S-01a /
S-01b — Commander may now open those from
`docs/planning/implementation-tracks.md`.

---

## Start Command

```text
/architect Read docs/handoffs/active/phase-0b-task-a-be2-architect.md and execute A-BE2 exactly. Mark ADR-0005 accepted with U-BE amendments (Log4j2 + persistence pins). Amend ADR-0001 §6, ADR-0002, and architecture.md banners. Do not scaffold application code. Do not overwrite docs/handoffs/current.md.
```

## Objective

Owner: `/architect`. **Lane:** `shared`. D-01 `/designer` remains live on
`docs/handoffs/current.md` — this file does **not** replace it.

Close Backend Stack Close-out. `@user` U-BE **accepted ADR-0005 with
amendments**. Flip ADR-0005 to **`accepted`**, pin the amended surfaces,
and reconcile reopen banners so Commander may open S-01a / S-01b.

## Required Reading

1. [`docs/handoffs/archive/H-2026-09-15-P0B-UBE-commander-user.md`](../archive/H-2026-09-15-P0B-UBE-commander-user.md) (Outcome)
2. [`docs/adr/ADR-0005-backend-application-stack.md`](../../adr/ADR-0005-backend-application-stack.md)
3. ADR-0001 §6; ADR-0002; `architecture.md` reopen banners
4. R-BE `docs/research/technical/10`–`15` (esp. `15` for Log4j2 + persistence)
5. `docs/research/version-ledger.md` (JVM block)
6. `context.md` (read-only for status; you may update banners/ADR links you own)
7. This handoff

## Inputs / Evidence (U-BE locked)

| Topic | `@user` choice |
|-------|----------------|
| Runtime | Java 21 + Spring Boot 4.1.x |
| Build | Gradle |
| Monorepo | Option B — Gradle beside Nx via `run-commands` (not `@nx/gradle`) |
| Auth | Spring Security HTTP-only session cookies + first-party membership |
| Spring AI | 2.0.x in adapters only |
| Python | Not in Phase 1; avoid second Free Tier runtime |
| Observability | **Log4j2** (not Logback); OTel year-1 optional; log sink → I-* |
| Tests | JUnit/Testcontainers/ArchUnit OK **within Free Tier CI minutes** |
| Persistence | **Architect decides and pins** (CRUD + vector/RLS + migrations) |

Standing RLS (unchanged): runtime non-owner `NOBYPASSRLS`; tenant GUC on
same connection in a transaction; Flyway ≠ app role; no Spring AI
`initialize-schema=true`.

## Allowed Write Paths

- `docs/adr/ADR-0005-backend-application-stack.md` → `accepted` + pins
- `docs/adr/ADR-0001-frontend-and-platform-stack.md` (§6 disposition only)
- `docs/adr/ADR-0002-workspace-and-tooling.md` (polyglot amend)
- `docs/adr/README.md` (status rows)
- `architecture.md` (reopen / identity banners only — ports stay)
- `docs/research/version-ledger.md` (pin rows if needed)
- `docs/memory/architect.md` (durable lessons only)
- This file: append Outcome; set `status: completed`

**Must not touch:** `docs/handoffs/current.md`, `apps/**`, `packages/**`,
scaffold files, production adapter enablement, D-01 design tree.

## Deliverables

1. ADR-0005 status **`accepted`** incorporating U-BE answers:
   - Pin **Log4j2** + JSON structured logging; never log BYOK keys / note
     bodies; correlation + tenant ids OK
   - Defer OTel year-1 optional; CloudWatch vs scrape = I-*
   - **Decide and pin** year-1 persistence/migrations (CRUD path; vector /
     RLS path; Flyway vs Liquibase). Prefer security-fit over convenience
     for the vector/RLS path (JDBC or jOOQ lean from `15`)
   - Record Free Tier CI-minute constraint for Testcontainers / dual CI
2. Amend ADR-0001 §6: identity **port** stays; Better Auth **library**
   superseded by Spring Security sessions (ADR-0005)
3. Amend ADR-0002: `apps/api` as JVM Gradle module beside Nx; drop TS
   `packages/domain` as backend SoT; ArchUnit for Java boundaries
4. Clear or rewrite `architecture.md` reopen banners so they match
   accepted ADR-0005
5. Update `docs/adr/README.md` status table
6. Outcome on this handoff

## Constraints / Prohibited Decisions

- Do not reopen ADR-0001 §1–§5, §7, ADR-0003, ADR-0004
- Do not make Spring AI the domain or corpus SoT
- Do not authorize production OpenRouter / live adapters
- Do not revive Node `apps/api` or Better Auth-on-JVM
- Do not leave CRUD persistence as “Implementer choice”
- Do not overwrite D-01 `current.md`

## Acceptance Criteria

- ADR-0005 is `accepted` with Log4j2 + concrete persistence pins
- ADR-0001 §6 and ADR-0002 no longer claim Node Better Auth / TS domain SoT
- `architecture.md` banners match accepted state
- No application source scaffolded
- Outcome records pins Commander can quote into S-01a / S-01b

## Directionality / accessibility checks

- N/A for this ADR finalize (no UI). Locale/RTL gates unchanged.

## Dependencies / Risks

- Blocks S-01a, S-01b, B-01+
- Does not block D-01
- Risk: choosing JPA-only for vector/RLS — forbidden; keep explicit SQL
  control on that path
- Risk: Log4j2 misconfig / CVE surface — pin a current Boot-aligned
  Log4j2 stack and document redaction

## Gates

- Production AI remains gated
- RTL remains deferred
- Scaffolding remains forbidden until this handoff completes with
  ADR-0005 `accepted`

## Completion Instructions

1. Write ADR / architecture / ledger updates per Allowed Write Paths.
2. Append Outcome listing every pin; set `status: completed`.
3. Durable lessons only in `docs/memory/architect.md`.
4. Do **not** open S-01a / S-01b — Commander integrates A-BE2 and opens
   those handoffs from `docs/planning/implementation-tracks.md`.
5. Do **not** overwrite `docs/handoffs/current.md`.
