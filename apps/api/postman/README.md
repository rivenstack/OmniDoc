# Postman — OmniDoc B-01–B-04 local API

Collection for identity + notes integrity against a local `apps/api`
instance. Consumes S-02 paths; does not fork OpenAPI.

## Files

| File | Purpose |
|------|---------|
| `omnidoc-b01-b04.postman_collection.json` | Session, workspaces, notes CRUD, conflict, soft-delete, purge |
| `local.postman_environment.json` | `baseUrl`, seed credentials, workspace/note ids |

## Prerequisites

1. Compose Postgres + Flyway (profile `local`) — see `docs/api/local-postgres.md`.
2. Seed the dev fixture (same as load smoke):

```bash
# from repo root, with Compose up
docker compose -f apps/api/compose.yaml --env-file .env.example exec -T postgres \
  bash -c 'psql -U omnidoc_migrator -d omnidoc' < apps/api/load/seed-local-fixture.sql
```

If the compose postgres user cannot connect as migrator, run
`apps/api/load/seed-local-fixture.sql` with the migrator JDBC credentials
from `.env.example`.

3. Start the API:

```bash
cd apps/api && SPRING_PROFILES_ACTIVE=local ./gradlew bootRun
```

## Import and run

1. Postman → Import → select both JSON files in this directory.
2. Select environment **OmniDoc B-01–B-04 local**.
3. Run the collection (Collection Runner or folder order top-to-bottom).
4. Sign-in writes the session cookie and copies `XSRF-TOKEN` into
   `{{xsrfToken}}`. Mutating requests send `X-XSRF-TOKEN`.

Newman (optional):

```bash
npx --yes newman run apps/api/postman/omnidoc-b01-b04.postman_collection.json \
  -e apps/api/postman/local.postman_environment.json
```

## Fixture credentials

- Email: `ada@example.com`
- Password: `correct horse battery staple`
- Workspace id: `ws-a`

Dev-only. Do not use these values outside local Compose.
