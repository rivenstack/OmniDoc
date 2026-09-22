# Local Postgres 18 + pgvector (B-02)

Everyday setup for backend developers. Schema is code; each machine runs
its own Compose DB. Hosted RDS is later (I-* / DevOps) — not this guide.

## Prerequisites

- Docker Engine **and** Compose **v2** (`docker compose`, space — not the
  legacy `docker-compose` hyphen binary)
- Repo root `.env.example` (placeholders only — never commit real passwords)
- JDK 21 for `apps/api` Gradle tasks

### Compose v2 missing? (`unknown shorthand flag: 'f'` / `unknown command: docker compose`)

Ubuntu’s `docker.io` package often installs the engine **without** the
Compose plugin. Confirm:

```bash
docker compose version
```

**Option A — apt (needs sudo):**

```bash
sudo apt-get update && sudo apt-get install -y docker-compose-v2
```

**Option B — user plugin (no sudo):** download
`docker-compose-linux-x86_64` from the
[Compose releases](https://github.com/docker/compose/releases) into
`~/.docker/cli-plugins/docker-compose`, `chmod +x` it, then re-run
`docker compose version`.

Until `docker compose version` prints a version, the `-f` flag will fail
because Docker never enters the Compose subcommand.

## Up / down / connection

From the monorepo root:

```bash
docker compose -f apps/api/compose.yaml --env-file .env.example up -d
docker compose -f apps/api/compose.yaml down
# Optional logs:
docker compose -f apps/api/compose.yaml logs -f postgres
```

| Item | Value |
|------|--------|
| Image | `pgvector/pgvector:pg18` |
| Compose | `apps/api/compose.yaml` |
| Init (once per volume) | `apps/api/docker/postgres/init/01-roles-and-db.sh` |
| JDBC URL | `jdbc:postgresql://localhost:5432/omnidoc` (`OMNIDOC_JDBC_URL`) |
| DB name | `omnidoc` |
| Port | `5432` (`POSTGRES_PORT`) |

Init creates the DB, roles, and `vector` extension on first volume create.
Wipe the named volume if you need a clean re-init:

```bash
docker compose -f apps/api/compose.yaml --env-file .env.example down -v
docker compose -f apps/api/compose.yaml --env-file .env.example up -d
```

Postgres **18** mounts data at `/var/lib/postgresql` (not the older
`/var/lib/postgresql/data` path). A leftover volume from a failed first
start can leave the container unhealthy — use `down -v` once, then `up`
again.

## How Flyway runs

There is **no** separate Flyway server or CLI step for day-to-day work.

1. Start Compose Postgres (above).
2. Run the API with Spring profile **`local`** (`SPRING_PROFILES_ACTIVE=local` in `.env.example`).
3. Boot applies migrations from `apps/api/src/main/resources/db/migration/`
   (`V1__…`, `V2__…`) using the **migrator** credentials on the same JDBC URL.

Default (non-`local`) profile excludes DataSource and Flyway autoconfig so
`GET /actuator/health` and ArchUnit stay green without a live DB. See
[health.md](./health.md).

## Roles and tenant GUC

| Role | Purpose |
|------|---------|
| `omnidoc_migrator` | Table owner; `BYPASSRLS`; Flyway schema/seed only |
| `omnidoc_app` | Runtime DML; `NOBYPASSRLS`; non-owner |

- Runtime datasource uses `omnidoc_app`. Flyway uses `omnidoc_migrator`
  (`spring.flyway.user` / `password` under profile `local`).
- Tenant scope GUC: `app.current_tenant_id`, set with
  `set_config(..., true)` **inside a transaction** on the same pooled
  connection (`TenantRlsSession`).
- Missing or empty GUC → **fail closed as empty** (zero rows under FORCE
  RLS), not a SQL error.

## Verification

```bash
cd apps/api && ./gradlew test
```

`RlsIsolationTest` (Testcontainers) proves cross-tenant invisibility and
missing-GUC empty. Optional manual check:

```bash
docker compose -f apps/api/compose.yaml exec postgres \
  psql -U omnidoc_app -d omnidoc -c "SELECT current_user;"
```

## Sharing schema without a hosted DB

- **Schema as code** — commit Flyway SQL under
  `apps/api/src/main/resources/db/migration/`. Each developer pulls and
  applies locally (Boot `local` profile or tests).
- **Per-developer Compose** — do not share one laptop Postgres among the
  team; everyone runs `apps/api/compose.yaml` on their machine.
- **No live secrets** — do not share production credentials, `.env.local`
  with real passwords, or dumps that contain secrets or tenant PII.
- **Optional dump/restore** — `pg_dump` / restore between peers is
  convenience only. Migrations remain the contract; do not treat a dump
  as the source of truth for schema.
- **Hosted RDS** — later I-* / DevOps work. Out of scope for local setup.
