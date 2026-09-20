#!/usr/bin/env bash
# Bounded local notes load smoke (B-04c). Not for CI soak.
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
EMAIL="${EMAIL:-ada@example.com}"
PASSWORD="${PASSWORD:-correct horse battery staple}"
CYCLES="${CYCLES:-50}"
COOKIE_JAR="$(mktemp)"
BODY_FILE="$(mktemp)"
trap 'rm -f "$COOKIE_JAR" "$BODY_FILE"' EXIT

if ! curl -sf "${BASE_URL}/actuator/health" >/dev/null; then
  echo "API not healthy at ${BASE_URL}/actuator/health" >&2
  exit 1
fi

csrf_from_jar() {
  # Netscape cookie jar: name XSRF-TOKEN
  awk '$6 == "XSRF-TOKEN" { print $7; exit }' "$COOKIE_JAR"
}

login() {
  rm -f "$COOKIE_JAR"
  curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" \
    "${BASE_URL}/api/v1/session" >/dev/null
  local csrf
  csrf="$(csrf_from_jar)"
  if [[ -z "${csrf}" ]]; then
    echo "Missing XSRF-TOKEN after login" >&2
    exit 1
  fi
}

workspace_id() {
  curl -sS -b "$COOKIE_JAR" "${BASE_URL}/api/v1/workspaces" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin)["workspaces"][0]["id"])'
}

create_and_get_ms() {
  local ws="$1"
  local csrf
  csrf="$(csrf_from_jar)"
  local start end create_json note_id
  start="$(date +%s%3N)"
  create_json="$(curl -sS -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -H "Content-Type: application/json" \
    -H "X-XSRF-TOKEN: ${csrf}" \
    -d "{\"title\":\"load-${RANDOM}\",\"bodyJson\":{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"load\"}]}]}}" \
    "${BASE_URL}/api/v1/workspaces/${ws}/notes")"
  note_id="$(printf '%s' "$create_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
  curl -sS -b "$COOKIE_JAR" "${BASE_URL}/api/v1/notes/${note_id}" >/dev/null
  end="$(date +%s%3N)"
  echo $((end - start))
}

percentile() {
  local p="$1"
  shift
  python3 - "$p" "$@" <<'PY'
import sys
p = float(sys.argv[1])
vals = sorted(int(x) for x in sys.argv[2:])
if not vals:
    print(0)
    raise SystemExit
idx = min(len(vals) - 1, max(0, int(round((p / 100.0) * (len(vals) - 1)))))
print(vals[idx])
PY
}

echo "B-04c load smoke: BASE_URL=${BASE_URL} CYCLES=${CYCLES}"
wall_start="$(date +%s%3N)"
login
WS="$(workspace_id)"
echo "workspace=${WS}"

success=0
latencies=()
for ((i = 1; i <= CYCLES; i++)); do
  ms="$(create_and_get_ms "$WS")"
  latencies+=("$ms")
  success=$((success + 1))
done
wall_end="$(date +%s%3N)"
wall_ms=$((wall_end - wall_start))

p50="$(percentile 50 "${latencies[@]}")"
p95="$(percentile 95 "${latencies[@]}")"

echo "success=${success}/${CYCLES}"
echo "wall_ms=${wall_ms}"
echo "create_get_p50_ms=${p50}"
echo "create_get_p95_ms=${p95}"
