# Java Test, Observability, Persistence, Contracts (R-BE)

**Research date / access date:** 2026-09-15  
**Question:** What **classes** of logging, test, migration, and OpenAPI tooling fit a JVM OmniDoc API? Pins wait for ADR/Implementer unless they change tenant isolation. **No selection.**

## Observability


| Candidate                                             | Primary tradeoff         | Tenant/privacy                                                                   |
| ----------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------- |
| **A.** Logback + JSON (e.g. logstash-logback-encoder) | Boot default             | **Never** log BYOK keys or note bodies by default; correlation ID + tenant id OK |
| **B.** Log4j2                                         | Performance; more config | Same redaction                                                                   |
| Micrometer + Prometheus + Actuator                    | Metrics without paid APM | Quota metrics must not leak keys                                                 |
| OpenTelemetry Java agent                              | Vendor-neutral traces    | Scrub prompts, bodies, `Authorization`                                           |


~30-day abuse-log honesty and **no** ZDR sales motion stay accepted (ADR-0004). Full prompt/completion logging is a privacy regression.

**Architect** may defer OTel to year-1 optional. `@user` log sink (CloudWatch vs scrape) can wait for I-*.

## Test discipline


| Piece                                                 | Role                                                                                                                                                             |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JUnit 5 + AssertJ + Mockito + Spring Boot Test slices | Baseline                                                                                                                                                         |
| Testcontainers Postgres+**pgvector**                  | Isolation tests (B-12). Official JDBC URL pattern `jdbc:tc:pgvector:…`; OmniDoc uses PG **18** — **image tag is a PoC** (`pgvector/pgvector:pg18` or equivalent) |
| MockMvc / WebTestClient / REST Assured                | HTTP contract                                                                                                                                                    |
| ArchUnit                                              | Hexagonal: no Spring AI in web/DTOs; no provider types on the wire                                                                                               |


CI minutes for Testcontainers on every PR is an `@user` **/ Architect** budget, not a library choice.

## Persistence and migrations


| Candidate                                     | Primary tradeoff                          | RLS note                                                 |
| --------------------------------------------- | ----------------------------------------- | -------------------------------------------------------- |
| Spring Data JPA                               | Speed; N+1 / lazy leaks                   | Owner role + missed filters = leak                       |
| Spring JDBC / `JdbcTemplate` + `com.pgvector` | Explicit SQL; GUC/`set_config` control    | Strong for vector path                                   |
| jOOQ                                          | Type-safe SQL; more setup                 | Same as JDBC for RLS                                     |
| Flyway vs Liquibase                           | Flyway simpler; Liquibase more expressive | **Migration connection must not be the pooled app role** |


**Standing footgun** (`03-multi-tenant-isolation.md`): runtime role non-owner, `NOBYPASSRLS`, `FORCE ROW LEVEL SECURITY`; tenant GUC on the **same** connection **inside a transaction**. Spring AI `initialize-schema=true` is a likely bypass — Architect should forbid it if Spring AI is used.

`com.pgvector:pgvector` **0.1.6** exists on GitHub (accessed via prior research 2026-09-15) — re-pin at ADR time in the ledger.

## API contract (FE/BE handshake)


| Candidate                                                                                                                                                                          | Tradeoff                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **A.** springdoc-openapi **3.1.1** (springdoc.org, accessed 2026-09-15; Boot 4 needs springdoc **3.x**) → OpenAPI JSON → `openapi-typescript` / orval → `packages/contracts` + MSW | Language-agnostic SoT; SSE still weakly modeled in OpenAPI — companion Markdown required |
| **B.** Hand-written OpenAPI in `docs/api` implemented by Java                                                                                                                      | FE can lead; drift risk                                                                  |
| **C.** Shared TypeScript `packages/domain` as backend SoT                                                                                                                          | **Breaks** with a Java API                                                               |


SSE Ask: document event names + payload shapes; disable proxy buffering.

## Architect inputs (no selection)

- Prefer OpenAPI as SoT (A or B). Drop TS `packages/domain` as backend SoT if Java wins.
- Pin JUnit/Testcontainers/springdoc in the ledger when ADR-0005 accepts a JVM API; exact encoder/OTel can wait.
- JDBC (or jOOQ) on the **vector/RLS** path is a security-sensitive Architect lean, not a popularity vote.

