# Local load smoke (B-04c)

Bounded local check for identity + notes against a running API. Not CI.

## Prerequisites

1. Compose Postgres up (see `docs/api/local-postgres.md`).
2. Optional fixture seed (dev-only actors / workspaces). Prefer the
   two-dev seed for local sign-in + isolation checks; use the Ada-only
   fixture for Postman / load smoke. See `docs/running-locally.md`.

```bash
# Two coworkers + Ada (separate tenants) — recommended for UI sign-in
docker exec -i omnidoc-postgres psql -U omnidoc_migrator -d omnidoc \
  < apps/api/load/seed-local-two-devs.sql

# Or Ada-only (Postman / b04c-notes-smoke)
docker exec -i omnidoc-postgres psql -U omnidoc_migrator -d omnidoc \
  < apps/api/load/seed-local-fixture.sql
```

If the migrator role is not the compose superuser login, apply the SQL
as the migrator JDBC user from your local SQL client instead.

3. API on profile `local` at `http://localhost:8080`:

```bash
cd apps/api && SPRING_PROFILES_ACTIVE=local ./gradlew bootRun
```

## Run

```bash
cd apps/api
./load/b04c-notes-smoke.sh
# optional: CYCLES=100 BASE_URL=http://localhost:8080 ./load/b04c-notes-smoke.sh
```

Prints total wall time, success count, and simple latency percentiles
for the create+get portion of each cycle. Keep `CYCLES` ≤ 100 so the
run stays under ~2 minutes on a laptop Free Tier machine.
