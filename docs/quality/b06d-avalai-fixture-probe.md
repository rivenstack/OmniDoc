# B-06d AvalAI Fixture Probe

## Status

- Scope: local, opt-in, S-03-only AvalAI `text-embedding-v4` / 1024 embedding probe.
- Default backend/runtime remains offline. The live path is only the explicit Gradle task `b06dAvalaiProbe`.
- Current checked-in result: **mock baseline completed; AvalAI live smoke blocked before network I/O** because the required local profile/opt-in/account/key gates were absent.

## Current Sanitized Results

### Mock baseline

- Transport: `mock`
- Storage model: `mock-embeddings-v1`
- Requests: `17`
- Prompt tokens: `0`
- Recall@1: `0.100`
- Recall@3: `0.900`
- MRR: `0.350`
- Pass status: `baseline-only`

| Query | Ranked notes | Recall@1 | Recall@3 | RR |
| --- | --- | ---: | ---: | ---: |
| Q1 | `ws_mine_formatting`, `ws_mine_launch`, `ws_mine_conflict`, `ws_mine_indexing` | 0.000 | 1.000 | 0.500 |
| Q2 | `ws_mine_conflict`, `ws_mine_launch`, `ws_mine_indexing`, `ws_mine_formatting` | 0.000 | 1.000 | 0.333 |
| Q3 | `ws_mine_conflict`, `ws_mine_indexing`, `ws_mine_formatting`, `ws_mine_launch` | 0.000 | 1.000 | 0.333 |
| Q4 | `ws_mine_conflict`, `ws_mine_indexing`, `ws_mine_formatting`, `ws_mine_launch` | 0.500 | 0.500 | 0.250 |
| Q5 | `ws_mine_conflict`, `ws_mine_indexing`, `ws_mine_launch`, `ws_mine_formatting` | 0.000 | 1.000 | 0.333 |
| NEG1 | `ws_mine_indexing`, `ws_mine_launch`, `ws_mine_conflict`, `ws_mine_formatting` | 0.000 | 0.000 | 0.000 |

### AvalAI v4/1024

- Status: `blocked-before-io`
- Missing gates from the last run:
  - `SPRING_PROFILES_ACTIVE` must include `local`
  - `OMNIDOC_B06D_ALLOW_LIVE` must be set to `1`, `true`, or `yes`
  - `OMNIDOC_B06D_ACCOUNT_DECISION` must be `accepted`
  - `AVALAI_API_KEY` must be exported from the external secret file
  - `OMNIDOC_B06D_SECRET_FILE` must point at the external secret file
- Route/model, usage, latency, charge, and live retrieval metrics are **unrun** in the checked-in state.

## Preconditions Before Any Live Call

Check the real AvalAI account before sourcing a key or running the task:

1. Confirm the current AvalAI terms, payment eligibility, balance/credit, and dashboard controls are acceptable for this development-only probe.
2. Confirm the account can see the exact model `text-embedding-v4` and that the route still documents 1024-dimensional output.
3. Confirm no paid top-up is needed or intended for this slice.
4. Keep the key outside the repository, outside chat, outside CI, and outside shell history.

If any of those checks fail or require a business decision, stop and return to Commander / `@user` before the task runs.

## Key Setup

Create a local secret file outside the repository and keep it at permission `0600`.

```bash
mkdir -p "$HOME/.config/omnidoc-secrets"
chmod 700 "$HOME/.config/omnidoc-secrets"
cat > "$HOME/.config/omnidoc-secrets/avalai-b06d.env" <<'EOF'
export AVALAI_API_KEY='replace-me'
export OMNIDOC_B06D_SECRET_FILE="$HOME/.config/omnidoc-secrets/avalai-b06d.env"
export OMNIDOC_B06D_ALLOW_LIVE=true
export OMNIDOC_B06D_ACCOUNT_DECISION=accepted
export SPRING_PROFILES_ACTIVE=local
EOF
chmod 600 "$HOME/.config/omnidoc-secrets/avalai-b06d.env"
source "$HOME/.config/omnidoc-secrets/avalai-b06d.env"
stat -c '%a %n' "$OMNIDOC_B06D_SECRET_FILE"
```

Expected permission check: `600 /home/<you>/.config/omnidoc-secrets/avalai-b06d.env`

## Commands

Focused offline checks:

```bash
cd apps/api
./gradlew test --tests com.omnidoc.api.retrieval.RetrievalVectorSearchIT \
  --tests com.omnidoc.api.eval.b06d.B06dProbeRuntimeModePortTest \
  --tests com.omnidoc.api.eval.b06d.B06dProbeManifestTest
```

Full offline suite:

```bash
cd apps/api
./gradlew clean test
```

Baseline-only or live probe task:

```bash
cd apps/api
./gradlew b06dAvalaiProbe
```

Generated artifacts:

```bash
cd apps/api
ls build/reports/b06d
sed -n '1,220p' build/reports/b06d/latest.md
```

## Expected Observations

Without the live gates and key, `./gradlew b06dAvalaiProbe` must:

- complete successfully,
- write `apps/api/build/reports/b06d/latest.md`,
- record the mock baseline,
- stop before network I/O, and
- list the missing live gates.

With all live gates present, the task must:

- use exactly one input per outbound embedding request,
- stay within `100` requests and `50,000` prompt tokens,
- observe route/model `text-embedding-v4` exactly,
- reject any non-1024 or non-finite embedding response,
- keep the default backend/test suite offline, and
- write the sanitized live summary into `apps/api/build/reports/b06d/latest.md` and the timestamped JSON/Markdown files beside it.

## What To Check After A Live Evaluation

1. `apps/api/build/reports/b06d/latest.md` says `AvalAI v4/1024` rather than `blocked-before-io`.
2. The route/model observation is exactly `text-embedding-v4` and the run did not accept any alias.
3. The requests count is `<= 100` and prompt tokens are `<= 50000`.
4. The live run records 1024 dimensions and no malformed/non-finite output.
5. The live pass gate is only `pass` if Q1/Q2/Q3/Q5 achieve the frozen thresholds, Q4 returns both relevant notes in top 3, and macro MRR is `>= 0.9`.
6. The negative checks all stay green: empty workspace, ACL forbidden, no forbidden sample/other hits, deleted suppression, stale-version suppression, and RLS fail-closed.
7. The AvalAI dashboard shows an expected, bounded credit/charge delta for the run, or the report honestly records charge as unavailable.
8. No generated artifact, log, or report contains the key, raw provider response bodies, raw vectors, or duplicated note-body dumps.