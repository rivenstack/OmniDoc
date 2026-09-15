# ADR-0005 — Backend Application Stack

- **Status:** `accepted` — `@user` U-BE accept-with-amendments 2026-09-15;
  Architect A-BE2 pins (Log4j2 + persistence) 2026-09-15.
- **Date:** 2026-09-15
- **Deciders:** Architect proposes; `@user` accepts / rejects / amends;
  Architect pins observability + persistence after U-BE
- **Related:** ADR-0001 §6 (identity **port** stays; Better Auth **library**
  superseded); ADR-0002 (`apps/api` JVM beside Nx; TS `packages/domain`
  not backend SoT); ADR-0003 (frontend-only, unchanged); ADR-0004
  (unchanged); `architecture.md` §1, §2, §5.7, §11
- **Consulted evidence:** R-BE
  `docs/research/technical/10`–`15`, supplements to `00`/`06`/`08`,
  `docs/research/version-ledger.md` (Java/Spring rows verified
  2026-09-15). U-BE archive:
  `docs/handoffs/archive/H-2026-09-15-P0B-UBE-commander-user.md`.

> This ADR does **not** close production AI activation or RTL locale.
> Scaffolding of `apps/api` is authorized only via Commander-opened
> S-01b (and related B-*) after this `accepted` status — not by this
> document alone.

---

## Context

Phase 0 accepted a **frontend** TypeScript stack (Next.js, TipTap,
Tailwind/shadcn) plus Postgres 18, pgvector, dual-mode BYOK, and AWS
Free-plan topology class. The **API** was never specified as Java. It
was **implied Node** by:

- ADR-0001 framing (“TypeScript web SaaS”) and §6 Better Auth 1.7.4
  (TypeScript library)
- ADR-0002 `apps/api` as Node BFF/workers and `packages/domain` as TS
  port SoT
- Track B-01 (TypeScript interfaces) and S-01 (Node health route)

`@user` (backend developer, 2026-09-15) declined Node for the API and
asked for a Spring Boot (+ Spring AI) backend so the product is a
credible Next.js + Java full-stack portfolio. S-01 was archived
`blocked` before execution so a Node API would not be scaffolded.

`architecture.md` ports §5.1–§5.11 stay **language-neutral**. HTTP /
OpenAPI / SSE remains the FE/BE handshake. UI never imports Spring AI
or Java domain types.

U-BE (2026-09-15) **accepted** the proposed stack **with amendments**:
Log4j2 (not Logback); Architect must pin CRUD + vector/RLS + migrations
(not Implementer choice); Free Tier CI-minute budget for Testcontainers
/ dual CI.

---

## Decision drivers

1. Portfolio / freelance credibility: Next.js UI + Java API is a
   stated product purpose (same class as ADR-0001 §1 recognizability)
2. Ports-first: Spring / Spring AI are adapters, not the domain
3. Tenant isolation at retrieval time (`architecture.md` §2)
4. Extension-First: Spring ecosystem before custom; Python only for a
   named, cheap, bounded win
5. Two-developer parallel lanes via OpenAPI + MSW
6. AWS Free-plan 6-month window (JVM RAM is an I-03 risk, not a reason
   to keep a Node API against `@user` intent)
7. Nx tags cannot enforce Java imports — need ArchUnit + CI
8. Security-fit over convenience on any path that sets tenant GUC /
   runs vector SQL (R-BE `15`, `03`)

---

## Decision (accepted)

### 1. API / worker language

**Java 21 LTS** + **Spring Boot 4.1.x** (ledger: Boot **4.1.1**,
verified 2026-09-15) as the API and ingestion/embed **worker** runtime.

Node 24 remains the **frontend / Nx** runtime only (ADR-0002, narrowed).

Do **not** stay on Boot 3.5.x unless a time-boxed PoC proves Boot 4
blocked. Java **25** LTS was considered; **21** is the accepted pin.

### 2. Build tool

**Gradle** for the Java module (Initializr-first-class; Nx invokes
`./gradlew` via `run-commands`). Maven remains the recorded fallback if
Gradle toolchain cost exceeds value in Phase 1.

### 3. Monorepo

**One repository, polyglot — Option B:**

- Nx + pnpm + Node 24: `apps/web`, `packages/ui`, `packages/contracts`
  (TS from OpenAPI), `packages/mocks` (FE MSW fixtures)
- Gradle: Java API module at path `apps/api` **as a JVM project**, not a
  Node app — or `backend/` only if Implementer PoC shows Nx generators
  fight a non-JS `apps/api` (prefer keeping `apps/api` for map continuity)

**Not** two repos. **Not** `@nx/gradle` as a required plugin (experimental
per R-BE `11`).

`packages/domain` as TypeScript **backend SoT is dropped**. Domain
ports live as Java interfaces in the API module. FE never depends on
them. The TS package may be removed or reduced to FE-only helpers;
it must not be treated as the JVM domain.

**Java boundary enforcement:** ArchUnit (+ CI) — no
`org.springframework.ai` (or provider SDKs) in HTTP DTO / web packages.
Nx tags continue to protect `apps/web`.

### 4. Identity implementation (supersedes ADR-0001 §6 *library*)

**Spring Security** with **HTTP-only session cookies** and SPA CSRF
(`csrf.spa()`, Security 7 docs, 2026-09-15). First-party
organization / workspace / membership / invite tables behind
`architecture.md` §5.7. Client workspace id remains a **selector**.
Year-1 SSO still **not** required.

**Better Auth is not** the Java identity implementation. ADR-0001 §6’s
*product* gates (no year-1 SSO; server-authoritative orgs) stay;
the *library* is superseded by this ADR.

**Rejected as default:** hybrid Better Auth-in-Next + Java dumb API
(tenant-authority split / IDOR; `12`). JWT resource server and
Keycloak / Spring Authorization Server remain documented fallbacks if
`@user` later prefers tokens or a separate IdP.

### 5. Spring AI posture

**Spring AI 2.0.x** (ledger **2.0.1**) **only in adapters** for embed
and ask (§5.3, §5.6), using OpenAI-compatible clients toward OpenRouter
when live modes are later authorized.

**Forbid:**

- Spring AI types on the HTTP wire
- Spring AI `PgVectorStore` (or `initialize-schema=true`) as corpus SoT
- Assistants / hosted `vector_stores` as SoT (already ADR-0001 §5)
- Silent operator↔customer key mix (ADR-0004)

Fallbacks if auto-config fights OmniDoc schema: LangChain4j or raw
`RestClient` (`13`). Production adapters stay **dark** until CX /
production-AI gates.

### 6. Python

**Not in Phase 1.** In-process Java (Tika / Spring Batch or `@Async` /
Spring AI readers) for ingest. A later sidecar requires a **named**
library, a failed time-boxed Java PoC, the same ports, and tenant
re-check (`14`). Avoid a second Free Tier runtime / image / deploy unit.

### 7. Persistence / migrations / jobs / observability / tests

**Architect pins (U-BE amendment — not Implementer choice):**

| Class | Pin |
|-------|-----|
| Notes / membership **CRUD** | **Spring Data JDBC** (not JPA). Explicit mappings; no JPA lazy / missed-filter footguns across tenant GUC sessions |
| **Vector / RLS / retrieval** path | **Spring `JdbcTemplate` + `com.pgvector:pgvector` 0.1.6** — explicit SQL; tenant GUC (`set_config`) on the **same** pooled connection **inside a transaction**. **Not** JPA-only. jOOQ deferred (upgrade if type-safe SQL pays off) |
| **Migrations** | **Flyway** (Boot BOM-managed). Migration role ≠ runtime app role. **Not** Liquibase for year-1 |
| Standing RLS | Runtime role non-owner `NOBYPASSRLS` + `FORCE ROW LEVEL SECURITY`; Flyway ≠ app role; no Spring AI `initialize-schema=true` |
| Phase 1 jobs | `@Async` / TaskExecutor in the API process; split a worker module when I-03 memory allows |
| **Logs** | **Log4j2** via `spring-boot-starter-log4j2` (exclude Logback); **JSON** structured logging; never log BYOK keys or note bodies; correlation + tenant ids OK. Pin current Boot-aligned Log4j2 stack; document redaction |
| Metrics | Micrometer + Actuator; **OTel year-1 optional** (Architect may defer). Log sink (CloudWatch vs scrape) waits for **I-*** |
| Tests | JUnit 5, AssertJ, Spring Boot Test, Testcontainers Postgres+pgvector (PG18 image PoC), ArchUnit — **within Free Tier CI minutes** (dual CI + Testcontainers must stay in budget; not every PR must run the full container matrix if minutes blow) |
| HTTP contract | springdoc-openapi **3.x** (ledger 3.1.1) → OpenAPI 3 → TS `packages/contracts` + MSW; SSE event shapes in `docs/api` companion |

---

## Alternatives considered

| Option | Why not chosen |
|--------|----------------|
| Keep Node `apps/api` + Better Auth | Explicitly declined by `@user`; Better Auth unfit on JVM |
| Boot 3.5.x | Misses Boot 4 / Security 7 / Spring AI 2 pairing (`10`) |
| Java 25 as default | Valid; `@user`/Architect accepted **21** |
| `@nx/gradle` required | Experimental (`11`); Option B uses `run-commands` |
| Two repos | Contract/fixture versioning; weaker one-product story |
| JWT-first | Worse default for a browser app |
| Keycloak / SAS year-1 | SSO not required; ops weight (`06`, `12`) |
| Spring AI as domain / PgVectorStore SoT | Violates ports and RLS/versioned chunks |
| Python sidecar in Phase 1 | Extra runtime on Free Tier without a named unique win |
| Shared TS `packages/domain` as backend SoT | Cannot be the JVM domain |
| Logback (proposed §7) | Superseded by U-BE amendment — **Log4j2** |
| JPA for CRUD | Rejected: N+1 / lazy / filter footguns with RLS (`15`); CRUD pinned to Spring Data JDBC |
| JPA-only vector path | Forbidden — no explicit GUC/SQL control |
| jOOQ year-1 | Deferred — JDBC sufficient; avoids codegen setup cost on Free Tier |
| Liquibase | Flyway simpler for year-1; Liquibase remains fallback if changelog expressiveness becomes a blocker |

---

## Consequences

**Liked**

- Backend developer implements in Spring; portfolio story is honest
- Ports + OpenAPI keep FE/BE parallel (F-* vs B-*)
- Spring AI résumé **without** leaking framework types to the UI
- One JDBC-family persistence story for CRUD + vector/RLS
- Log4j2 performance choice recorded; redaction rules explicit

**Disliked / accepted costs**

- Dual CI (pnpm + Gradle) — **Free Tier CI minutes** constrain
  Testcontainers frequency and dual-pipeline cost
- JVM RSS on Free Tier (`t3.micro` 1 GiB) — I-03/I-04 PoC; may need
  `t3.small` or a single JVM process
- Must build org/membership tables (no Better Auth plugin)
- Log4j2 config / CVE surface — keep Boot-BOM versions; redaction tests
- ADR-0002 amend; S-01 split into S-01a / S-01b

---

## Migration / rollback

- **Forward:** Commander opens S-01a (FE Nx) and S-01b (Gradle Boot
  health). Do not execute archived Node S-01.
- **Rollback to Node API:** restore Better Auth as §6 implementation;
  high cost once Java schema/sessions exist — treat as a Phase 0-style
  reopen, not a toggle.
- Identity export: password hashes / session rows are Java-owned;
  plan export if ever moving to Clerk/Keycloak.
- Persistence rollback (JDBC → JPA): high cost after schema/repos exist;
  not a toggle. jOOQ adoption is additive on the vector path if needed.

---

## Security / privacy

- §2 membership authority lives in the Java API (and workers)
- RLS role split + no Spring AI schema init on the app role
- IDOR negatives (B-12) required before Phase 2
- Vault/BYOK logging redaction (`15`, ADR-0004) — Log4j2 JSON must
  never emit BYOK keys or note bodies
- CSRF + cookie flags are project-owned (session auth)

---

## Verification

1. ArchUnit fails a deliberate `org.springframework.ai` type on a
   REST DTO (then revert).
2. Testcontainers: cross-tenant vector hit count = 0 on a non-owner role
   (JdbcTemplate + GUC path).
3. OpenAPI generated TS types compile in `packages/contracts`; `apps/web`
   still cannot import Java or Spring AI.
4. Session cookie: user A + user B workspace selector → 403.
5. Log fixture: assert redaction — no BYOK key / note body substrings in
   JSON log output for a vault + note write path.
6. Falsify Java 21 / Boot 4.1 if SSE Ask cannot stream through the
   chosen reverse-proxy class — then document WebFlux-on-classpath or
   raw SSE without changing ports.
7. CI budget: document which Testcontainers suites run on PR vs nightly
   if Free Tier minutes are exceeded.

---

## Acceptance trail

| Event | Record |
|-------|--------|
| A-BE proposed | 2026-09-15 — status `proposed` |
| U-BE | `@user` accept-with-amendments (Log4j2; Architect pins persistence; Option B; Gradle; sessions; Spring AI adapters only; Python not Phase 1; Free Tier CI for tests) |
| A-BE2 | Architect marks `accepted`; pins Spring Data JDBC (CRUD), JdbcTemplate + pgvector-java (vector/RLS), Flyway, Log4j2 JSON |

---

## References

- `docs/research/technical/10`–`15`, `03`, `06`, `08`
- `docs/research/version-ledger.md` (R-BE JVM block → ADR-0005 pins)
- `architecture.md` §2, §5
- ADR-0001 §6; ADR-0002; ADR-0004
- U-BE: `docs/handoffs/archive/H-2026-09-15-P0B-UBE-commander-user.md`
