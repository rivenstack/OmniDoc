#!/usr/bin/env bash
# Bounded local ingestion smoke (B-05c). Not a soak test and never calls providers.
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
EMAIL="${EMAIL:-ada@example.com}"
PASSWORD="${PASSWORD:-correct horse battery staple}"
CYCLES="${CYCLES:-5}"
POLL_LIMIT="${POLL_LIMIT:-50}"
POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS:-0.2}"
IMPORT_FILE="${IMPORT_FILE:-load/fixtures/b05c-sample.md}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f -- "$COOKIE_JAR"' EXIT

bounded_integer() {
  local name="$1"
  local value="$2"
  local maximum="$3"
  if [[ ! "$value" =~ ^[1-9][0-9]*$ ]] || (( value > maximum )); then
    echo "$name must be an integer from 1 through $maximum" >&2
    exit 2
  fi
}

bounded_integer CYCLES "$CYCLES" 25
bounded_integer POLL_LIMIT "$POLL_LIMIT" 100

if [[ ! -f "$IMPORT_FILE" ]]; then
  echo "Import fixture not found: $IMPORT_FILE" >&2
  exit 2
fi
if ! curl -sf "${BASE_URL}/actuator/health" >/dev/null; then
  echo "API not healthy at ${BASE_URL}/actuator/health" >&2
  exit 1
fi

curl -sS --fail-with-body -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" \
  "${BASE_URL}/api/v1/session" >/dev/null

csrf="$(awk '$6 == "XSRF-TOKEN" { print $7; exit }' "$COOKIE_JAR")"
if [[ -z "$csrf" ]]; then
  echo "Missing XSRF-TOKEN after login" >&2
  exit 1
fi

workspace_id="$(curl -sS --fail-with-body -b "$COOKIE_JAR" "${BASE_URL}/api/v1/workspaces" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["workspaces"][0]["id"])')"

percentile() {
  local p="$1"
  shift
  python3 - "$p" "$@" <<'PY'
import sys
p = float(sys.argv[1])
values = sorted(int(value) for value in sys.argv[2:])
index = min(len(values) - 1, max(0, round((p / 100) * (len(values) - 1))))
print(values[index])
PY
}

cleanup_note() {
  local note_id="$1"
  curl -sS --fail-with-body -b "$COOKIE_JAR" \
    -H "X-XSRF-TOKEN: ${csrf}" \
    -H "OmniDoc-Workspace-Id: ${workspace_id}" \
    -X POST "${BASE_URL}/api/v1/notes/${note_id}/soft-delete" >/dev/null
  curl -sS --fail-with-body -b "$COOKIE_JAR" \
    -H "X-XSRF-TOKEN: ${csrf}" \
    -H "OmniDoc-Workspace-Id: ${workspace_id}" \
    -X POST "${BASE_URL}/api/v1/notes/${note_id}/purge" >/dev/null
}

echo "B-05c ingestion smoke: BASE_URL=${BASE_URL} CYCLES=${CYCLES} workspace=${workspace_id}"
wall_start="$(date +%s%3N)"
success=0
latencies=()

for ((cycle = 1; cycle <= CYCLES; cycle++)); do
  start="$(date +%s%3N)"
  enqueue_json="$(curl -sS --fail-with-body -b "$COOKIE_JAR" \
    -H "X-XSRF-TOKEN: ${csrf}" \
    -H "OmniDoc-Workspace-Id: ${workspace_id}" \
    -F "file=@${IMPORT_FILE};type=text/markdown" \
    "${BASE_URL}/api/v1/ingestion-jobs")"
  job_id="$(printf '%s' "$enqueue_json" | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["completedUnits"] == 0 and data["totalUnits"] == 4; print(data["jobId"])')"

  status=""
  completed=""
  note_id=""
  for ((poll = 1; poll <= POLL_LIMIT; poll++)); do
    poll_json="$(curl -sS --fail-with-body -b "$COOKIE_JAR" \
      -H "OmniDoc-Workspace-Id: ${workspace_id}" \
      "${BASE_URL}/api/v1/ingestion-jobs/${job_id}")"
    IFS=$'\t' read -r status completed note_id <<< "$(printf '%s' "$poll_json" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data["status"], data["completedUnits"], data.get("noteId") or "", sep="\t")')"
    if [[ "$status" == "ready" || "$status" == "partial" ]]; then
      break
    fi
    if [[ "$status" == "failed" ]]; then
      echo "Job ${job_id} failed: ${poll_json}" >&2
      exit 1
    fi
    sleep "$POLL_INTERVAL_SECONDS"
  done

  if [[ "$completed" != "4" || -z "$note_id" ]]; then
    echo "Job ${job_id} did not reach a 4/4 terminal state after ${POLL_LIMIT} polls" >&2
    exit 1
  fi
  cleanup_note "$note_id"
  end="$(date +%s%3N)"
  latencies+=("$((end - start))")
  success=$((success + 1))
done

wall_end="$(date +%s%3N)"
echo "success=${success}/${CYCLES}"
echo "wall_ms=$((wall_end - wall_start))"
echo "enqueue_to_terminal_p50_ms=$(percentile 50 "${latencies[@]}")"
echo "enqueue_to_terminal_p95_ms=$(percentile 95 "${latencies[@]}")"
