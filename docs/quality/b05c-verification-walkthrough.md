# B-05c ingestion verification walkthrough

This runbook validates the accepted B-05 ingestion path locally. It uses only
the deterministic local API and PostgreSQL; it does not contact an AI provider.

## Automated matrix

From the repository root:

```bash
cd apps/api
./gradlew test --tests com.omnidoc.api.projection.S03ProjectionParityTest \
  --tests com.omnidoc.api.chunking.BlockPackChunkerTest \
  --tests com.omnidoc.api.persistence.IngestionMigrationIT \
  --tests com.omnidoc.api.ingestion.IngestionWorkerIT \
  --tests com.omnidoc.api.ingestion.IngestionLifecycleE2eIT
```

Expected: Gradle reports `BUILD SUCCESSFUL` with no skipped tests.

| Matrix requirement | Automated evidence |
|---|---|
| S-03 projector golden and FE allowed deltas | `S03ProjectionParityTest` |
| Two runs across 20+ chunk fixtures, offsets, anchors, ids, hashes | `BlockPackChunkerTest` |
| Fresh V1→V4 and populated V3→V4 | `IngestionMigrationIT` |
| FORCE RLS, fail-closed GUC, app grants, claim privilege | `IngestionMigrationIT` |
| Five import formats, corrupt bytes, timeout, partial cleanup | `IngestionWorkerIT` |
| Concurrent claim, reclaim, membership loss, outbox, purge | `IngestionWorkerIT` |
| Multipart → poll → terminal → persisted chunks | `IngestionLifecycleE2eIT` |
| CSRF, anonymous, selector, tenant, 413, 415 | `IngestionLifecycleE2eIT` |

Flyway recovery is forward-only. If V4 fails before it is recorded, correct
the cause and rerun migration. Never manually mark V4 successful or apply a
down migration.

## Start the local stack

Terminal A, from the repository root:

```bash
docker compose -f apps/api/compose.yaml --env-file .env.example up -d
cd apps/api
SPRING_PROFILES_ACTIVE=local ./gradlew bootRun
```

After the API reports that Tomcat started, terminal B:

```bash
curl -fsS http://localhost:8080/actuator/health
docker exec -i omnidoc-postgres psql -U omnidoc_migrator -d omnidoc \
  < apps/api/load/seed-local-two-devs.sql
```

Expected health: JSON containing `"status":"UP"`. The seed is idempotent.

## Materialize five bounded fixtures

```bash
B05C_FIXTURES="$(mktemp -d)"
cp apps/api/load/fixtures/b05c-sample.md "$B05C_FIXTURES/sample.md"
printf '%s\n' 'Plain pgvector BYOK OpenAI tenant_id.' > "$B05C_FIXTURES/sample.txt"
printf '%s\n' '<html><body><h1>HTML import</h1><p>pgvector BYOK OpenAI tenant_id.</p></body></html>' > "$B05C_FIXTURES/sample.html"
base64 -d apps/api/load/fixtures/b05c-sample.pdf.b64 > "$B05C_FIXTURES/sample.pdf"
base64 -d apps/api/load/fixtures/b05c-sample.docx.b64 > "$B05C_FIXTURES/sample.docx"
file "$B05C_FIXTURES"/*
```

Expected: Markdown/text/HTML plus a PDF document and Microsoft Word OOXML
document. Each fixture is below 2 KiB.

## Sign in and import

```bash
B05C_COOKIES="$(mktemp)"
curl -fsS -c "$B05C_COOKIES" -b "$B05C_COOKIES" \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"correct horse battery staple"}' \
  http://localhost:8080/api/v1/session >/dev/null
B05C_CSRF="$(awk '$6 == "XSRF-TOKEN" {print $7; exit}' "$B05C_COOKIES")"
B05C_WORKSPACE="ws-a"
```

For each tuple below, run the enqueue and bounded polling block:

```text
sample.md    text/markdown
sample.txt   text/plain
sample.html  text/html
sample.pdf   application/pdf
sample.docx  application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

```bash
B05C_NAME="sample.md"
B05C_TYPE="text/markdown"
B05C_JOB_JSON="$(curl -fsS -b "$B05C_COOKIES" \
  -H "X-XSRF-TOKEN: $B05C_CSRF" \
  -H "OmniDoc-Workspace-Id: $B05C_WORKSPACE" \
  -F "file=@$B05C_FIXTURES/$B05C_NAME;type=$B05C_TYPE" \
  http://localhost:8080/api/v1/ingestion-jobs)"
printf '%s\n' "$B05C_JOB_JSON" | python3 -m json.tool
B05C_JOB_ID="$(printf '%s' "$B05C_JOB_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["jobId"])')"

for B05C_POLL in $(seq 1 50); do
  B05C_JOB_JSON="$(curl -fsS -b "$B05C_COOKIES" \
    -H "OmniDoc-Workspace-Id: $B05C_WORKSPACE" \
    "http://localhost:8080/api/v1/ingestion-jobs/$B05C_JOB_ID")"
  B05C_STATUS="$(printf '%s' "$B05C_JOB_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["status"])')"
  printf '%s\n' "$B05C_JOB_JSON" | python3 -m json.tool
  [[ "$B05C_STATUS" != "pending" && "$B05C_STATUS" != "running" ]] && break
  sleep 0.2
done
```

Expected enqueue observation: `pending`, `completedUnits: 0`,
`totalUnits: 4`. Expected terminal observation: `ready` (or `partial`
when extraction records a warning), `completedUnits: 4`, and non-empty
`noteId` and `versionId`.

## Inspect persisted chunks

```bash
docker exec omnidoc-postgres psql -U omnidoc_migrator -d omnidoc -x -c "
SELECT j.job_id, j.status, j.completed_units, j.total_units,
       cs.projector_id, cs.chunker_id, cs.chunk_count,
       c.chunk_id, c.start_offset, c.end_offset, c.start_block, c.end_block
FROM ingestion_jobs j
JOIN chunk_sets cs ON cs.version_id = j.version_id
JOIN chunks c ON c.version_id = cs.version_id
WHERE j.job_id = '$B05C_JOB_ID'
ORDER BY c.ordinal;"
```

Expected: `pm-md-v1`, `omni-blockpack-v1`, at least one ordered chunk,
and job progress `4/4`.

## Verify 413 and 415

```bash
B05C_LARGE="$(mktemp)"
truncate -s 10485761 "$B05C_LARGE"
curl -sS -o /tmp/b05c-413.json -w '%{http_code}\n' -b "$B05C_COOKIES" \
  -H "X-XSRF-TOKEN: $B05C_CSRF" \
  -H "OmniDoc-Workspace-Id: $B05C_WORKSPACE" \
  -F "file=@$B05C_LARGE;type=text/plain" \
  http://localhost:8080/api/v1/ingestion-jobs
python3 -m json.tool /tmp/b05c-413.json

curl -sS -o /tmp/b05c-415.json -w '%{http_code}\n' -b "$B05C_COOKIES" \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $B05C_CSRF" \
  -H "OmniDoc-Workspace-Id: $B05C_WORKSPACE" \
  -d '{}' http://localhost:8080/api/v1/ingestion-jobs
python3 -m json.tool /tmp/b05c-415.json
```

Expected: HTTP `413` with code `too_large`; HTTP `415` with code
`unsupported_type`.

## Verify workspace and tenant denial

Ada is not a member of `ws-coworker`:

```bash
curl -sS -o /tmp/b05c-workspace.json -w '%{http_code}\n' -b "$B05C_COOKIES" \
  -H 'OmniDoc-Workspace-Id: ws-coworker' \
  "http://localhost:8080/api/v1/ingestion-jobs/$B05C_JOB_ID"
python3 -m json.tool /tmp/b05c-workspace.json
```

Expected: HTTP `403`, code `forbidden`.

Authenticate the separate-tenant coworker and query Ada's job through the
coworker's valid selector:

```bash
B05C_OTHER_COOKIES="$(mktemp)"
curl -fsS -c "$B05C_OTHER_COOKIES" -b "$B05C_OTHER_COOKIES" \
  -H 'Content-Type: application/json' \
  -d '{"email":"coworker@example.com","password":"correct horse battery staple"}' \
  http://localhost:8080/api/v1/session >/dev/null
curl -sS -o /tmp/b05c-tenant.json -w '%{http_code}\n' -b "$B05C_OTHER_COOKIES" \
  -H 'OmniDoc-Workspace-Id: ws-coworker' \
  "http://localhost:8080/api/v1/ingestion-jobs/$B05C_JOB_ID"
python3 -m json.tool /tmp/b05c-tenant.json
```

Expected: HTTP `404`, code `not_found`; no Ada job fields are returned.

## Crash reclaim and bounded load

The deterministic reclaim and dual-claimer checks avoid timing a real JVM
kill:

```bash
cd apps/api
./gradlew test \
  --tests 'com.omnidoc.api.ingestion.IngestionWorkerIT.anExpiredLeaseIsReclaimedAndAttemptsAreCounted' \
  --tests 'com.omnidoc.api.ingestion.IngestionWorkerIT.twoConcurrentClaimersUseSkipLockedAndNeverClaimTheSameJob'
./load/b05c-ingestion-smoke.sh
```

Expected: both focused tests pass. The smoke reports `success=5/5` and
finite p50/p95 enqueue-to-terminal latency, then purges its imported notes.

## Cleanup

```bash
rm -f -- "$B05C_COOKIES" "$B05C_OTHER_COOKIES" "$B05C_LARGE" \
  /tmp/b05c-413.json /tmp/b05c-415.json /tmp/b05c-workspace.json /tmp/b05c-tenant.json
rm -rf -- "$B05C_FIXTURES"
docker compose -f apps/api/compose.yaml --env-file .env.example down
```

Do not add `-v` unless intentionally resetting the local database volume.

## Troubleshooting

- `401`: reseed after Flyway completes, then sign in again.
- `403` on enqueue: replay both the session cookie and raw
  `X-XSRF-TOKEN`; confirm the workspace selector belongs to that session.
- Job remains pending: inspect API logs and run the focused reclaim test;
  never edit the claim function or disable RLS as a workaround.
- PDF/DOCX returns `unsupported_type`: rematerialize from the checked-in
  base64 fixture and confirm the declared MIME type matches.
- Migration failure: preserve the Flyway history and database for diagnosis;
  repair forward. V4 has no downgrade and requires no backfill.

