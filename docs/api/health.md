# OmniDoc API health (S-01b)

Canonical HTTP/OpenAPI/SSE handshake: [README.md](./README.md). This
probe is included in [openapi.yaml](./openapi.yaml) as `GET /actuator/health`.

JVM module: `apps/api` (Java 21 + Spring Boot 4.1.1 + Gradle).

## Local commands

```bash
cd apps/api
./gradlew test
./gradlew bootRun   # -Xmx256m by default
```

From the monorepo root (Nx `run-commands`, no `@nx/gradle`):

```bash
nx run api:test
nx run api:bootRun
```

## Health probe

```bash
curl -s http://localhost:8080/actuator/health
# {"status":"UP"}
```

Actuator exposure is limited to `health`. Default profile needs no live DB; for Compose Postgres + Flyway under profile `local`, see [local-postgres.md](./local-postgres.md). Full Spring Security sessions / CSRF spa() land in B-03. Production OpenRouter / Spring AI adapters stay dark.
