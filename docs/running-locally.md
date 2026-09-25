# Running OmniDoc locally

Runbook for bringing the whole stack up on one machine: Postgres in
Docker, the JVM API, and the Next.js web app.

This is a **runbook, not live status**. Phase, gates, and blockers live in
[`context.md`](../context.md). Deeper references:

| Topic | Doc |
|-------|-----|
| Postgres, roles, RLS, Flyway | [`docs/api/local-postgres.md`](api/local-postgres.md) |
| HTTP / OpenAPI / SSE contract | [`docs/api/README.md`](api/README.md) |
| Frontend onboarding (clone, journeys, conventions) | [`docs/frontend/README.md`](frontend/README.md) |
| Contribution + handoff rules | [`CONTRIBUTING.md`](../CONTRIBUTING.md) |

## What actually runs

Three processes across two runtimes:

```text
┌──────────────────────────────────┐
│ Postgres 18 + pgvector           │  Docker         host port 5432
│ container: omnidoc-postgres      │  compose.yaml
└───────────────┬──────────────────┘
                │ JDBC: omnidoc_app (runtime DML)
                │ Flyway: omnidoc_migrator (schema owner)
┌───────────────▼──────────────────┐
│ API — Spring Boot 4.1 / JDK 21   │  Gradle          host port 8080
└───────────────▲──────────────────┘
                │ OMNIDOC_API_ORIGIN (server-side only)
┌───────────────┴──────────────────┐
│ Web — Next.js 16                 │  next dev        host port 3311
└──────────────────────────────────┘
```

**Only Postgres is containerized.** There is no `Dockerfile` for the API
and no all-in-one `docker compose up` for the stack — the API is a host JVM
process (ADR-0005), and hosted/containerized API deployment is later
DevOps work. So the backend is always two pieces: **Docker for the DB,
Gradle for the app.**

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 24 LTS | Pinned by `.nvmrc` and `engines.node >= 24`. Frontend / Nx graph only. |
| **pnpm** | 12.4.1 | Declared in `packageManager`. Do not add npm/yarn lockfiles. |
| **JDK** | 21 | `apps/api/build.gradle.kts` requests a Java 21 toolchain. Gradle resolves or downloads it itself, so a newer default `java` on your PATH is fine. |
| **Docker Engine + Compose v2** | — | Must be the **space** form (`docker compose`). `docker compose version` has to print a version. |
| **Git** | — | Clone / branch / PR. |

Check everything at once:

```bash
node -v && pnpm -v && java -version && docker compose version
```

If `docker compose version` fails with `unknown command: docker compose`
or `unknown shorthand flag: 'f'`, the Compose plugin is missing — see
[`docs/api/local-postgres.md`](api/local-postgres.md) for install options.

## First run vs later runs

| | **First run** (clone / new machine / wiped DB) | **Later runs** (restart after sleep / reboot) |
|--|-----------------------------------------------|-----------------------------------------------|
| `pnpm install` | Required once (and after lockfile changes) | Skip unless deps changed |
| Postgres `up -d` | Required — creates volume + roles | Required if container stopped; safe if already up |
| API `bootRun` | Required — first boot runs Flyway | Required — schema already migrated; boot is fast |
| Seed SQL | Required **after** first healthy API boot if you want sign-in | Skip unless you wiped the volume or need fresh fixtures |
| Web `pnpm dev` | Required | Required |

Seeds are idempotent (`ON CONFLICT`), so re-applying them is safe but
unnecessary on a normal restart.

> **Host port 5432 already in use?** If another Postgres owns 5432, the API
> step fails with `password authentication failed for user
> "omnidoc_migrator"`. That is a port misroute, not a credentials problem —
> see **Troubleshooting → Flyway fails** below.

### First run (full stack + sign-in)

From the repository root, use two terminals.

```bash
# Terminal A — deps + database
pnpm install
docker compose -f apps/api/compose.yaml --env-file .env.example up -d

# Terminal A — API (leave running)
# First Gradle download can take several minutes; wait for health below.
cd apps/api && OMNIDOC_CORS_ORIGINS=http://localhost:3311 \
  SPRING_PROFILES_ACTIVE=local ./gradlew bootRun
```

In a third shell (or after health is green), seed, then start the web app:

```bash
# After: curl -s localhost:8080/actuator/health → status UP
docker exec -i omnidoc-postgres psql -U omnidoc_migrator -d omnidoc \
  < apps/api/load/seed-local-two-devs.sql
```

```bash
# Terminal B — web (leave running)
cd apps/web && pnpm dev
```

Open **http://localhost:3311/sign-in**.

`OMNIDOC_CORS_ORIGINS` is recommended for local browser work on port
**3311** (Compose / `.env.example` still mention 3000). The Next.js
identity port talks to the API **server-side** by default
(`OMNIDOC_API_ORIGIN`, fallback `http://localhost:8080`), so sign-in
works without a browser CORS path — the env is still the right default
for any browser-originated API calls.

### Later runs (restart)

Skip `pnpm install` and skip seeding unless the DB volume was wiped.

```bash
# Terminal A
docker compose -f apps/api/compose.yaml --env-file .env.example up -d
cd apps/api && OMNIDOC_CORS_ORIGINS=http://localhost:3311 \
  SPRING_PROFILES_ACTIVE=local ./gradlew bootRun
```

```bash
# Terminal B
cd apps/web && pnpm dev
```

Confirm:

```bash
curl -s localhost:8080/actuator/health
# open http://localhost:3311/sign-in
```

## Step by step

### 1. Install workspace dependencies

```bash
pnpm install
```

### 2. Start Postgres

```bash
docker compose -f apps/api/compose.yaml --env-file .env.example up -d
```

The init script (`apps/api/docker/postgres/init/01-roles-and-db.sh`) runs
**once per volume** and creates the `omnidoc` database, the
`omnidoc_migrator` / `omnidoc_app` roles, and the `vector` extension.

Verify it is healthy:

```bash
docker compose -f apps/api/compose.yaml ps
docker compose -f apps/api/compose.yaml exec postgres \
  psql -U omnidoc_app -d omnidoc -c "SELECT current_user;"
```

### 3. Start the API

```bash
cd apps/api && OMNIDOC_CORS_ORIGINS=http://localhost:3311 \
  SPRING_PROFILES_ACTIVE=local ./gradlew bootRun
```

The `local` profile is what wires the datasource, and it is **not** the
default. On boot, Flyway applies `apps/api/src/main/resources/db/migration/`
(`V1__…`–`V3__…`) as `omnidoc_migrator`. Expect:

```text
Database: jdbc:postgresql://localhost:5432/omnidoc (PostgreSQL 18.x)
Successfully validated 3 migrations
Current schema version: 3
Tomcat started on port 8080
Started OmniDocApiApplication in ~2 seconds
```

Verify:

```bash
curl -s localhost:8080/actuator/health
# {"groups":["liveness","readiness"],"status":"UP"}
```

**There is no separate Flyway step.** Flyway is a Spring Boot starter, not
a Gradle plugin — `./gradlew flywayMigrate` does not exist. Migrations apply
when the API boots.

### 4. Start the web app

```bash
cd apps/web && pnpm dev
```

The dev server runs on **3311**, not 3000 (see `apps/web/package.json`).

Web-side configuration is optional for local work: copy `.env.example` to
`.env.local` for `NEXT_PUBLIC_*` values. Note that **Spring does not read
`.env.local`** — the API takes its configuration from environment variables
on the `bootRun` command line or from `application.yml` defaults. Identity
calls use server-side `OMNIDOC_API_ORIGIN` (default `http://localhost:8080`).

### 5. Seed actors and sign in

Seeding is optional but **required for sign-in**: identity is profile-gated
on `local` and needs real `actors` / membership rows. There is **no** public
sign-up endpoint.

**Order matters:** tables come from Flyway on API boot — seed **after**
`/actuator/health` is `UP`.

Apply as the **migrator** (`BYPASSRLS` table owner), not `omnidoc_app`.

**Recommended (two coworkers + Ada, separate tenants for isolation checks):**

```bash
docker exec -i omnidoc-postgres psql -U omnidoc_migrator -d omnidoc \
  < apps/api/load/seed-local-two-devs.sql
```

| Email | Password | Actor | Workspace / tenant |
|-------|----------|-------|--------------------|
| `kenzo@example.com` | `correct horse battery staple` | `actor-kenzo` | `ws-kenzo` / `tenant-kenzo` |
| `coworker@example.com` | `correct horse battery staple` | `actor-coworker` | `ws-coworker` / `tenant-coworker` |
| `ada@example.com` | `correct horse battery staple` | `actor-a` | `ws-a` / `tenant-a` |

**Minimal single-user fixture** (Postman / load smoke):

```bash
docker exec -i omnidoc-postgres psql -U omnidoc_migrator -d omnidoc \
  < apps/api/load/seed-local-fixture.sql
```

Then open http://localhost:3311/sign-in.

Confirm rows:

```bash
docker exec omnidoc-postgres psql -U omnidoc_migrator -d omnidoc -c \
  "SELECT actor_id, email FROM actors ORDER BY actor_id;"
docker exec omnidoc-postgres psql -U omnidoc_migrator -d omnidoc -c \
  "SELECT workspace_id, actor_id, tenant_id FROM workspace_memberships ORDER BY actor_id;"
```

## Ports

| Service | Host port | Set by |
|---------|-----------|--------|
| Postgres | 5432 | `POSTGRES_PORT` (compose) |
| API | 8080 | `API_PORT` (`application.yml`) |
| Web | 3311 | `apps/web/package.json` dev script |
| Postgres (in container) | 5432 | fixed |

## Common tasks

| Task | Command |
|------|---------|
| Frontend typecheck / lint / test | `pnpm typecheck` · `pnpm lint` · `pnpm test` (Nx `run-many`) |
| Single web target | `pnpm nx run web:typecheck` (also `lint`, `test`, `build`) |
| Backend tests (Testcontainers) | `cd apps/api && ./gradlew test` — needs Docker running |
| Backend build | `cd apps/api && ./gradlew build -x test` |
| API via Nx | `pnpm nx run api:serve` — runs the same `bootRun`, but **does not** set the profile. Export `SPRING_PROFILES_ACTIVE=local` (and CORS if needed) first. |
| Regenerate OpenAPI → TS | `pnpm nx run contracts:generate` (then `contracts:typecheck` / `test` / `lint`) |
| DB logs | `docker compose -f apps/api/compose.yaml logs -f postgres` |
| Stop the database | `docker compose -f apps/api/compose.yaml down` |
| Wipe and re-init the database | `… down -v` then `… --env-file .env.example up -d`, boot API, **re-seed** |

There is **no** `nx run web:dev` target — `apps/web/project.json` defines
only `build`, `typecheck`, `lint`, and `test`. Use `pnpm dev` for the server.

## Troubleshooting

### Flyway fails: `password authentication failed for user "omnidoc_migrator"`

```text
FlywaySqlUnableToConnectToDbException
  FATAL: password authentication failed for user "omnidoc_migrator"
  SQL State : 28P01
```

This usually means the API is talking to **a different Postgres**, not that
the credentials are wrong. Postgres returns the same error for an unknown
role as for a bad password, so a port misroute disguises itself as a
credentials bug.

Cause: something else already holds host port 5432, so the Compose port
mapping (`"${POSTGRES_PORT:-5432}:5432"`) landed the container somewhere
else. Diagnose:

```bash
docker port omnidoc-postgres        # e.g. 5432/tcp -> 0.0.0.0:5433 = not on 5432
ss -ltnp | grep 5432                # who actually owns 5432
docker ps --format '{{.Names}}\t{{.Ports}}'
```

Confirm the container's own credentials are fine:

```bash
docker exec -e PGPASSWORD=omnidoc_migrator_dev omnidoc-postgres \
  psql -U omnidoc_migrator -d omnidoc -h 127.0.0.1 -tAc 'select current_user;'
```

Fix: publish on a free port and point the API at it. `OMNIDOC_JDBC_URL`
drives **both** the datasource and Flyway, so one variable is enough:

```bash
POSTGRES_PORT=5433 docker compose -f apps/api/compose.yaml \
  --env-file .env.example up -d

cd apps/api && SPRING_PROFILES_ACTIVE=local \
  OMNIDOC_JDBC_URL=jdbc:postgresql://localhost:5433/omnidoc \
  OMNIDOC_CORS_ORIGINS=http://localhost:3311 \
  ./gradlew bootRun
```

⚠️ Afterwards, do **not** re-run `up -d` with the plain `--env-file
.env.example` command: it sets `POSTGRES_PORT=5432`, recreates the
container, and fails with `port is already allocated`. Always pass the port
explicitly while the conflict exists.

Note also that the init script only ever `ALTER ROLE … BYPASSRLS` on its
`ELSE` branch — it never resets a password, so re-running Compose will not
repair a role that already exists with a stale password.

### The API starts but never touches the database

`SPRING_PROFILES_ACTIVE=local` was not set. The default profile deliberately
excludes the DataSource and Flyway autoconfiguration, so the app starts and
`/actuator/health` reports `UP` with no DB behind it. That is by design —
health and ArchUnit stay green without a live database.

### Sign-in fails / “can't confirm” session

1. Confirm profile `local` and health: `curl -s localhost:8080/actuator/health`
2. Confirm actors exist (seed after first Flyway boot)
3. Use an exact seed email/password (no public register endpoint)
4. Web defaults API origin to `http://localhost:8080`; override with
   `OMNIDOC_API_ORIGIN` only if the API is not on that URL

### `bootRun` / `pnpm dev` appear hung at `80% EXECUTING`

Both are long-running servers, so they never return a shell prompt. This is
expected, not a hang. Verify liveness with `curl` against the port instead of
waiting for a prompt.

Related: do not pipe these commands through `tail`/`head` to read startup
logs. The pipe buffers, so output only appears when the process exits and the
window looks empty in the meantime. Run them unpiped.

### The browser can't reach the API (CORS / cookies)

`omnidoc.cors.allowed-origins` defaults to `http://localhost:3000`, and
`.env.example` sets `NEXT_PUBLIC_APP_URL=http://localhost:3000`, but the web
dev server runs on **3311**. Prefer:

```bash
OMNIDOC_CORS_ORIGINS=http://localhost:3311 \
  SPRING_PROFILES_ACTIVE=local ./gradlew bootRun
```

F-03 sign-in goes through the Next.js server (cookie relay) to the JVM API,
so missing CORS often does not block `/sign-in`. Widen origins anyway for
any browser-originated cross-origin fetch during local debugging.

### Start over from a clean database

```bash
docker compose -f apps/api/compose.yaml --env-file .env.example down -v
docker compose -f apps/api/compose.yaml --env-file .env.example up -d
cd apps/api && OMNIDOC_CORS_ORIGINS=http://localhost:3311 \
  SPRING_PROFILES_ACTIVE=local ./gradlew bootRun   # re-applies Flyway
# after health UP — re-seed
docker exec -i omnidoc-postgres psql -U omnidoc_migrator -d omnidoc \
  < apps/api/load/seed-local-two-devs.sql
```

Postgres 18 mounts data at `/var/lib/postgresql` (not the older
`/var/lib/postgresql/data`). A volume left over from a failed first start can
leave the container unhealthy — `down -v` once, then `up` again.

## No secrets

`.env.example` holds placeholders only. Never commit real keys, BYOK
material, or `.env.local` contents. Seed passwords are **dev-only**.
Production AI/provider activation stays gated; live runtime modes return
`mode_forbidden` until that gate closes.
