---
handoff_id: H-2026-10-11-P1-B06D-IMPL
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "B-06d"
lane: backend
human_owner: back-end-programmer
from: commander
to: implementer
created: 2026-10-11
archived: 2026-10-11
---

# B-06d — AvalAI v4/1024 local fixture probe

## Start Command

```text
/implementer Read docs/handoffs/active/lane-backend.md and execute the B-06d Implementer slice exactly. Build the opt-in S-03-only AvalAI v4/1024 evaluation runner, keep the default backend offline, and verify only within the accepted ADR exception and live-smoke gates.
```

## Objective

Owner: `/implementer`. Lane: backend. Human: back-end programmer.
allowed_task_classes: B-06d local embedding probe and verification only.

Implement the accepted Architect design in `architecture.md` §5.3.1 for
one AvalAI `text-embedding-v4` 1024-dimensional fixture experiment.
Keep the existing B-06 mock/vector path the default and preserve B-07
for subsequent Commander sequencing. No product AI activation.

## Allowed Write Paths

- `apps/api/**` — test/local-only runner, adapter, bounded search
  compatibility change and meaningful offline tests
- `docs/quality/b06d-avalai-fixture-probe.md` — opt-in runbook and
  sanitized evaluation results/status only
- `docs/handoffs/active/lane-backend.md` and `docs/handoffs/archive/**`
- `docs/memory/implementer.md` — durable lessons only

## Outcome

### Preconditions

- The accepted ADR-0004 scoped exception was already recorded before implementation.
- No AvalAI key was present in the repository, handoff, or chat.
- Live account/terms/payment verification and the external secret file remained operator-owned gates.

### Files Changed

- `apps/api/build.gradle.kts`
- `apps/api/src/main/resources/application.yml`
- `apps/api/src/main/java/com/omnidoc/api/adapters/retrieval/JdbcVectorSearchAdapter.java`
- `apps/api/src/test/java/com/omnidoc/api/retrieval/RetrievalVectorSearchIT.java`
- `apps/api/src/test/java/com/omnidoc/api/eval/b06d/B06dAvalaiProbeRunner.java`
- `apps/api/src/test/java/com/omnidoc/api/eval/b06d/B06dProbeManifest.java`
- `apps/api/src/test/java/com/omnidoc/api/eval/b06d/B06dProbeRuntimeModePort.java`
- `apps/api/src/test/java/com/omnidoc/api/eval/b06d/B06dProbeRuntimeModePortTest.java`
- `apps/api/src/test/java/com/omnidoc/api/eval/b06d/B06dProbeManifestTest.java`
- `apps/api/src/test/resources/b06d/manifest.json`
- `docs/quality/b06d-avalai-fixture-probe.md`
- `docs/memory/implementer.md`

### Steps

1. Generalized `JdbcVectorSearchAdapter` to fail closed on an explicit `(embedding_model_id, dimensions)` tuple, validate finite/non-zero query vectors, and exclude stale non-current versions.
2. Added retrieval integration coverage for explicit tuple selection, zero/mismatched vectors, stale-version suppression, and non-owner RLS fail-closed behavior.
3. Added an explicit `b06dAvalaiProbe` Gradle task that runs from the test runtime only, keeping normal app startup and `clean test` offline.
4. Added a frozen `b-06d-v1` manifest derived from S-03 IDs plus hash/policy drift checks.
5. Implemented a runner-local `RuntimeModePort` gate that only allows `operator_free_tier + EMBED + actor_alex` when all live-smoke environment gates are present.
6. Implemented the baseline/live probe runner with separate disposable Postgres databases, deterministic projector/chunker seeding, exact tuple filtering, sanitized report generation, and fail-closed live gating.
7. Used manual `spring-ai-openai` model construction rather than the Boot starter so normal backend tests do not auto-configure a live embedding client.
8. Wrote the checked-in runbook/status doc at `docs/quality/b06d-avalai-fixture-probe.md`.

### Complete Code/Configuration

- The live path is only `./gradlew b06dAvalaiProbe`.
- Default app/test startup disables Spring AI embedding auto-configuration (`spring.ai.model.embedding=none`).
- The runner re-enables live embedding only through manual `spring-ai-openai` construction inside the explicit probe task.
- The probe report is emitted to `apps/api/build/reports/b06d/` as timestamped JSON/Markdown plus `latest.md`.

### Data Migration

- No schema change.
- The probe uses fresh disposable Flyway-through-V5 databases per run.

### Verification

#### Automated tests

Focused checks:

```text
cd apps/api && ./gradlew test --tests com.omnidoc.api.retrieval.RetrievalVectorSearchIT --tests com.omnidoc.api.eval.b06d.B06dProbeRuntimeModePortTest --tests com.omnidoc.api.eval.b06d.B06dProbeManifestTest
BUILD SUCCESSFUL
11 tests, 0 failures, 0 errors, 0 skipped
```

Offline baseline probe:

```text
cd apps/api && ./gradlew b06dAvalaiProbe
BUILD SUCCESSFUL
baseline=baseline-only
liveStatus=blocked-before-io
baselineMRR=0.350
```

Required offline suite:

```text
cd apps/api && ./gradlew clean test
BUILD SUCCESSFUL in 1m 8s
147 tests, 0 failures, 0 errors, 0 skipped
```

Diff hygiene:

```text
cd /home/kenzo/RivenStack/omni-note && git diff --check
```

#### Backend isolation / ArchUnit / OpenAPI checks

- Retrieval integration covers explicit tuple selection, workspace/tenant scope, stale-version suppression, soft-delete/purge suppression, and app-role RLS fail-closed behavior.
- B-06d manifest validation rejects fixture/policy drift before the runner can emit a live request.
- No HTTP/API/OpenAPI contract or schema change was introduced.

### Security and Performance Notes

- Default backend behavior remains mock/offline; the live path is task-scoped and opt-in.
- The external key must stay in an out-of-repo `0600` file and is only read from environment at task runtime.
- The runner emits sanitized reports only; no raw vectors, note-body dumps, or provider secrets are written.
- The live gate fails closed before network I/O when the local profile, opt-in, account decision, key export, or secret-file pointer are missing.

### Documentation Updates

- Added `docs/quality/b06d-avalai-fixture-probe.md` with setup commands, baseline results, blocked-live status, and the exact post-run checks for a future live evaluation.

### Remaining Gates / Live Observations

- The checked-in run is intentionally **blocked before network I/O** because the local machine had none of the required live gates set.
- Missing at the time of implementation: `SPRING_PROFILES_ACTIVE=local`, `OMNIDOC_B06D_ALLOW_LIVE=true`, `OMNIDOC_B06D_ACCOUNT_DECISION=accepted`, `AVALAI_API_KEY`, and `OMNIDOC_B06D_SECRET_FILE`.
- Therefore route/model identity, usage, latency, charge, and live Recall@K/MRR remain **unrun** in the archive and in `docs/quality/b06d-avalai-fixture-probe.md`.

### Rollback

- Remove the B-06d test-runtime files and the `b06dAvalaiProbe` task.
- The core B-06 mock path remains unchanged; no migration rollback is needed.