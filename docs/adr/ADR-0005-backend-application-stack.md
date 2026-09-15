# ADR-0005 — Backend Application Stack

- **Status:** `proposed` — Architect recommendation 2026-09-15.
  **Not binding** until `@user` U-BE (accept / reject / change).
- **Date:** 2026-09-15
- **Deciders:** Architect proposes; `@user` accepts / rejects / amends
- **Related:** ADR-0001 §6 (reopened); ADR-0002 (`apps/api` Node assumption
  reopened); ADR-0003 (frontend-only, unchanged); ADR-0004 (unchanged);
  `architecture.md` §1, §2, §5.7, §11
- **Consulted evidence:** R-BE
  `docs/research/technical/10`–`15`, supplements to `00`/`06`/`08`,
  `docs/research/version-ledger.md` (Java/Spring rows verified
  2026-09-15). `@user` 2026-09-15 **intent:** no Node.js API; Java
  Spring Boot skill/portfolio preference; Python only if clearly better
  and cheap. Intent is a **driver**, not acceptance of this ADR.

> This ADR does **not** close production AI activation or RTL locale.
> It does **not** authorize Implementer scaffold until status is
> `accepted`.

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

---

## Proposed decision (pending `@user`)

### 1. API / worker language

**Java 21 LTS** + **Spring Boot 4.1.x** (ledger: Boot **4.1.1**,
accessed 2026-09-15) as the API and ingestion/embed **worker** runtime.

Node 24 remains the **frontend / Nx** runtime only (ADR-0002, narrowed).

Do **not** stay on Boot 3.5.x unless a time-boxed PoC proves Boot 4
blocked. Java **25** LTS is a documented alternative (`10`); default
proposal is **21** for denser ops muscle memory and container images.

### 2. Build tool

**Gradle** for the Java module (Initializr-first-class; Nx can invoke
`./gradlew` via `run-commands` without requiring experimental
`@nx/gradle` as a hard dependency). Maven is the recorded fallback if
Gradle toolchain cost exceeds value in Phase 1.

### 3. Monorepo

**One repository, polyglot:**

- Nx + pnpm + Node 24: `apps/web`, `packages/ui`, `packages/contracts`
  (TS from OpenAPI), `packages/mocks` (FE MSW fixtures)
- Gradle: Java API module (path `apps/api` **as a JVM project**, not a
  Node app — or `backend/` if Implementer PoC shows Nx generators fight
  a non-JS `apps/api`; Architect prefers keeping the `apps/api` name
  for continuity with ADR-0002’s map)

**Not** two repos. **Not** `@nx/gradle` as a required plugin until it
is non-experimental or a PoC shows it is stable.

`packages/domain` as TypeScript **backend SoT is dropped**. Domain
ports live as Java interfaces in the API module. FE never depends on
them.

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
the *library* is superseded by this ADR when accepted.

**Rejected as default:** hybrid Better Auth-in-Next + Java dumb API
(tenant-authority split / IDOR; `12`). JWT resource server and
Keycloak / Spring Authorization Server remain documented fallbacks if
`@user` prefers tokens or a separate IdP.

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
re-check (`14`).

### 7. Persistence / jobs / observability / test **classes**

Binding **classes** (tool pins at Implementer unless they change
isolation):

| Class | Proposal |
|-------|----------|
| Notes CRUD | JPA **or** JDBC — Implementer choice inside the port |
| Vector / RLS path | **JDBC** (or jOOQ), not JPA-only; tenant GUC on the same pooled connection inside a transaction |
| Migrations | **Flyway**; migration role ≠ runtime app role; runtime non-owner `NOBYPASSRLS` |
| Phase 1 jobs | `@Async` / TaskExecutor in the API process; split a worker module when I-03 memory allows |
| Logs | Logback JSON; never log BYOK keys or note bodies; correlation + tenant ids OK |
| Metrics | Micrometer + Actuator; OTel **optional** year-1 |
| Tests | JUnit 5, AssertJ, Spring Boot Test, Testcontainers Postgres+pgvector (PG18 image PoC), ArchUnit |
| HTTP contract | springdoc-openapi **3.x** (ledger 3.1.1) → OpenAPI 3 → TS `packages/contracts` + MSW; SSE event shapes in `docs/api` companion |

---

## Alternatives considered

| Option | Why not proposed as default |
|--------|-----------------------------|
| Keep Node `apps/api` + Better Auth | Explicitly declined by `@user`; Better Auth unfit on JVM |
| Boot 3.5.x | Misses Boot 4 / Security 7 / Spring AI 2 pairing (`10`) |
| Java 25 as default | Valid; proposed 21 unless `@user` wants latest LTS on the résumé |
| `@nx/gradle` required | Experimental (`11`) |
| Two repos | Contract/fixture versioning; weaker one-product story |
| JWT-first | Worse default for a browser app unless `@user` prefers it |
| Keycloak / SAS year-1 | SSO not required; ops weight (`06`, `12`) |
| Spring AI as domain / PgVectorStore SoT | Violates ports and RLS/versioned chunks |
| Python sidecar in Phase 1 | Extra runtime on Free Tier without a named unique win |
| Shared TS `packages/domain` as backend SoT | Cannot be the JVM domain |

---

## Consequences

**Liked**

- Backend developer implements in Spring; portfolio story is honest
- Ports + OpenAPI keep FE/BE parallel (F-* vs B-*)
- Spring AI résumé **without** leaking framework types to the UI

**Disliked / accepted costs**

- Dual CI (pnpm + Gradle)
- JVM RSS on Free Tier (`t3.micro` 1 GiB) — I-03/I-04 PoC; may need
  `t3.small` or a single JVM process
- Must build org/membership tables (no Better Auth plugin)
- ADR-0002 amend; S-01 split into S-01a / S-01b

---

## Migration / rollback

- **Forward:** after `@user` accept, Commander opens S-01a (FE Nx) and
  S-01b (Gradle Boot health). Do not execute archived Node S-01.
- **Rollback to Node API:** restore Better Auth as §6 implementation;
  high cost once Java schema/sessions exist — treat as a Phase 0-style
  reopen, not a toggle.
- Identity export: password hashes / session rows are Java-owned;
  plan export if ever moving to Clerk/Keycloak.

---

## Security / privacy

- §2 membership authority lives in the Java API (and workers)
- RLS role split + no Spring AI schema init on the app role
- IDOR negatives (B-12) required before Phase 2
- Vault/BYOK logging redaction (`15`, ADR-0004)

---

## Verification

1. ArchUnit fails a deliberate `org.springframework.ai` type on a
   REST DTO (then revert).
2. Testcontainers: cross-tenant vector hit count = 0 on a non-owner role.
3. OpenAPI generated TS types compile in `packages/contracts`; `apps/web`
   still cannot import Java or Spring AI.
4. Session cookie: user A + user B workspace selector → 403.
5. Falsify Java 21 / Boot 4.1 if SSE Ask cannot stream through the
   chosen reverse-proxy class — then document WebFlux-on-classpath or
   raw SSE without changing ports.

---

## `@user` MUST-NOW questions (U-BE)

See `docs/handoffs/active/` U-BE file once opened. Summary:

1. Confirm Java Spring Boot API (vs keep Node) — **intent already Java**
2. Monorepo: polyglot one-repo (this proposal) vs two repos vs
   `@nx/gradle`
3. Auth: sessions (this proposal) vs JWT vs Keycloak/SAS
4. Spring AI behind ports (this proposal) vs Spring AI as domain
5. Python: never Phase 1 (this proposal) vs eval-only vs PoC exception
6. Java 21 (this proposal) vs 25; Gradle (this proposal) vs Maven

CAN-WAIT: exact Logback encoder, OTel, WebMVC vs WebFlux, GraalVM,
Testcontainers image tag, JPA vs JDBC for **CRUD** (vector path is JDBC).

---

## References

- `docs/research/technical/10`–`15`, `03`, `06`, `08`
- `docs/research/version-ledger.md` (R-BE JVM block)
- `architecture.md` §2, §5
- ADR-0001 §6; ADR-0002; ADR-0004
