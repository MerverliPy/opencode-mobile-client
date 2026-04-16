#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT_UNDER_TEST="$ROOT_DIR/scripts/dev/autoflow.sh"
BENCH_RUNS="${AUTOFLOW_BENCH_RUNS:-5}"
DETERMINISM_RUNS="${AUTOFLOW_DETERMINISM_RUNS:-10}"
MAX_P95_MS="${AUTOFLOW_MAX_P95_MS:-8000}"

TOTAL=0
PASSED=0
FAILED=0

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

[[ -f "$SCRIPT_UNDER_TEST" ]] || fail "missing $SCRIPT_UNDER_TEST"
[[ -f "$ROOT_DIR/package.json" ]] || fail "missing $ROOT_DIR/package.json"
[[ -f "$ROOT_DIR/package-lock.json" ]] || fail "missing $ROOT_DIR/package-lock.json"

TEMP_ROOT="$(mktemp -d)"
cleanup() {
  rm -rf "$TEMP_ROOT"
}
trap cleanup EXIT

record_pass() {
  local name="$1"
  local detail="$2"
  TOTAL=$((TOTAL + 1))
  PASSED=$((PASSED + 1))
  printf 'PASS  %-34s %s\n' "$name" "$detail"
}

record_fail() {
  local name="$1"
  local detail="$2"
  TOTAL=$((TOTAL + 1))
  FAILED=$((FAILED + 1))
  printf 'FAIL  %-34s %s\n' "$name" "$detail"
}

new_sandbox() {
  local name="$1"
  local dir="$TEMP_ROOT/$name"
  mkdir -p "$dir/.opencode/plans" "$dir/.opencode/backlog" "$dir/scripts/dev" "$dir/docs/releases" "$dir/src"
  cp "$SCRIPT_UNDER_TEST" "$dir/scripts/dev/autoflow.sh"
  cp "$ROOT_DIR/package.json" "$dir/package.json"
  cp "$ROOT_DIR/package-lock.json" "$dir/package-lock.json"
  chmod +x "$dir/scripts/dev/autoflow.sh"

  cat > "$dir/docs/releases/phase-registry.md" <<'MD'
# Phase Registry

- [x] Baseline release
MD

  (
    cd "$dir"
    git init -q
    git config user.name "Autoflow Harness"
    git config user.email "autoflow-harness@example.invalid"
    git add .
    git commit -qm "baseline"
  )

  printf '%s\n' "$dir"
}

write_backlog() {
  local dir="$1"
  local mode="$2"
  case "$mode" in
    with-candidate)
      cat > "$dir/.opencode/backlog/candidates.yaml" <<'YAML'
selection_order:
  - explicit_user_scope
  - highest_priority
  - same_module_followup
  - smallest_safe_scope
  - clearest_validation

constraints:
  max_files_changed: 4
  prefer_single_module: true
  avoid_generic_tasks: true

candidates:
  - id: clean-install-reproducibility
    title: Restore deterministic clean installs so repo setup and workflow gates are trustworthy
    module: tooling
    priority: 10
    files:
      - package.json
      - package-lock.json
      - scripts/dev/repair-lockfile.sh
    validation: npm ci --ignore-scripts && npm run validate:local
    acceptance:
      - clean checkout installs work

archived: []
YAML
      ;;
    without-candidates)
      cat > "$dir/.opencode/backlog/candidates.yaml" <<'YAML'
selection_order:
  - explicit_user_scope

constraints:
  max_files_changed: 4

candidates: []

archived: []
YAML
      ;;
    missing-ref)
      cat > "$dir/.opencode/backlog/candidates.yaml" <<'YAML'
selection_order:
  - explicit_user_scope

constraints:
  max_files_changed: 4

candidates:
  - id: some-other-phase
    title: Different phase
    module: tooling
    priority: 1
    files:
      - package.json
    validation: npm run workflow:check
    acceptance:
      - placeholder

archived: []
YAML
      ;;
    *)
      fail "unknown backlog mode: $mode"
      ;;
  esac
}

write_phase() {
  local dir="$1"
  local title="$2"
  local status="$3"
  local phase_file="$4"
  local validation_status="$5"
  local ready_to_ship="$6"
  cat > "$dir/.opencode/plans/current-phase.md" <<MD
# $title
Status: $status
Release: v1.6.0
Phase file: $phase_file

## Goal
Restore deterministic clean installs.

## Primary files
- package.json
- package-lock.json
- scripts/dev/repair-lockfile.sh

## Validation command
npm ci --ignore-scripts && npm run validate:local

## Validation
Status: $validation_status
Evidence:
- not run yet
Blockers:
- none
Ready to ship:
- $ready_to_ship

## Acceptance criteria
- clean install works

## Completion summary
- pending
MD
}

mutate_package_json_for_drift() {
  local dir="$1"
  python - "$dir/package.json" <<'PY'
from pathlib import Path
import json
import sys

path = Path(sys.argv[1])
data = json.loads(path.read_text())
deps = data.setdefault('devDependencies', {})
deps['left-pad'] = '^1.3.0'
path.write_text(json.dumps(data, indent=2) + '\n')
PY
}

make_dirty_out_of_scope() {
  local dir="$1"
  mkdir -p "$dir/src"
  printf '// dirty harness change\n' >> "$dir/src/main.js"
}

state_json() {
  local dir="$1"
  if (cd "$dir" && bash scripts/dev/autoflow.sh inspect-json >/tmp/autoflow_state.json 2>/dev/null); then
    cat /tmp/autoflow_state.json
  else
    (
      cd "$dir"
      bash scripts/dev/autoflow.sh inspect
    ) | python - <<'PY'
import json
import sys

data = {}
for raw in sys.stdin.read().splitlines():
    if '=' not in raw:
        continue
    key, value = raw.split('=', 1)
    data[key.lower()] = value
print(json.dumps(data))
PY
  fi
}

json_field() {
  local json="$1"
  local key="$2"
  python - "$json" "$key" <<'PY'
import json
import sys
print(json.loads(sys.argv[1]).get(sys.argv[2], ''))
PY
}

run_case_expect_action() {
  local name="$1"
  local backlog_mode="$2"
  local title="$3"
  local status="$4"
  local phase_file="$5"
  local validation_status="$6"
  local ready_to_ship="$7"
  local expected_action="$8"
  local mutation="${9:-none}"

  local dir json actual blocker
  dir="$(new_sandbox "$name")"
  write_backlog "$dir" "$backlog_mode"
  write_phase "$dir" "$title" "$status" "$phase_file" "$validation_status" "$ready_to_ship"

  case "$mutation" in
    none) ;;
    drift)
      mutate_package_json_for_drift "$dir"
      ;;
    dirty-out-of-scope)
      make_dirty_out_of_scope "$dir"
      ;;
    *)
      fail "unknown mutation: $mutation"
      ;;
  esac

  json="$(state_json "$dir")"
  actual="$(json_field "$json" next_action)"
  blocker="$(json_field "$json" blocker)"

  if [[ "$actual" == "$expected_action" ]]; then
    record_pass "$name" "next_action=$actual"
  else
    record_fail "$name" "expected=$expected_action actual=$actual blocker=${blocker:-none}"
  fi
}

run_determinism_case() {
  local name="determinism"
  local dir digest_count
  dir="$(new_sandbox "$name")"
  write_backlog "$dir" with-candidate
  write_phase "$dir" "Restore deterministic clean installs so repo setup and workflow gates are trustworthy" "pending" "backlog:clean-install-reproducibility" "pending" "no"

  digest_count="$(python - "$dir" "$DETERMINISM_RUNS" <<'PY'
import hashlib
import json
import subprocess
import sys

repo = sys.argv[1]
runs = int(sys.argv[2])

def get_state():
    proc = subprocess.run(
        ['bash', 'scripts/dev/autoflow.sh', 'inspect-json'],
        cwd=repo,
        text=True,
        capture_output=True,
    )
    if proc.returncode == 0:
        payload = proc.stdout
    else:
        proc = subprocess.run(
            ['bash', 'scripts/dev/autoflow.sh', 'inspect'],
            cwd=repo,
            text=True,
            capture_output=True,
            check=True,
        )
        data = {}
        for raw in proc.stdout.splitlines():
            if '=' in raw:
                key, value = raw.split('=', 1)
                data[key.lower()] = value
        payload = json.dumps(data, sort_keys=True)
    data = json.loads(payload)
    normalized = json.dumps(data, sort_keys=True, separators=(',', ':'))
    return hashlib.sha1(normalized.encode()).hexdigest(), data.get('next_action', '')

hashes = []
actions = []
for _ in range(runs):
    digest, action = get_state()
    hashes.append(digest)
    actions.append(action)

print(json.dumps({
    'unique_hashes': len(set(hashes)),
    'unique_actions': sorted(set(actions)),
}))
PY
)"

  local unique_hashes unique_actions
  unique_hashes="$(json_field "$digest_count" unique_hashes)"
  unique_actions="$(python - "$digest_count" <<'PY'
import json
import sys
print(','.join(json.loads(sys.argv[1]).get('unique_actions', [])))
PY
)"

  if [[ "$unique_hashes" == "1" && "$unique_actions" == "run-phase" ]]; then
    record_pass "$name" "stable across $DETERMINISM_RUNS runs"
  else
    record_fail "$name" "unique_hashes=$unique_hashes unique_actions=$unique_actions"
  fi
}

run_performance_case() {
  local name="performance"
  local dir metrics p95_ms median_ms max_ms bad_actions
  dir="$(new_sandbox "$name")"
  write_backlog "$dir" with-candidate
  write_phase "$dir" "Restore deterministic clean installs so repo setup and workflow gates are trustworthy" "pending" "backlog:clean-install-reproducibility" "pending" "no"

  metrics="$(python - "$dir" "$BENCH_RUNS" <<'PY'
import json
import math
import subprocess
import sys
import time

repo = sys.argv[1]
runs = int(sys.argv[2])

durations = []
actions = []

for _ in range(runs):
    start = time.perf_counter()
    proc = subprocess.run(
        ['bash', 'scripts/dev/autoflow.sh', 'inspect-json'],
        cwd=repo,
        text=True,
        capture_output=True,
    )
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    durations.append(elapsed_ms)
    if proc.returncode == 0:
        data = json.loads(proc.stdout)
    else:
        start = time.perf_counter()
        proc = subprocess.run(
            ['bash', 'scripts/dev/autoflow.sh', 'inspect'],
            cwd=repo,
            text=True,
            capture_output=True,
            check=True,
        )
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        durations[-1] = elapsed_ms
        data = {}
        for raw in proc.stdout.splitlines():
            if '=' in raw:
                key, value = raw.split('=', 1)
                data[key.lower()] = value
    actions.append(data.get('next_action', ''))

sorted_ms = sorted(durations)
index_95 = max(0, math.ceil(len(sorted_ms) * 0.95) - 1)
summary = {
    'median_ms': sorted_ms[len(sorted_ms) // 2],
    'p95_ms': sorted_ms[index_95],
    'max_ms': max(sorted_ms),
    'bad_actions': [a for a in actions if a != 'run-phase'],
}
print(json.dumps(summary))
PY
)"

  p95_ms="$(json_field "$metrics" p95_ms)"
  median_ms="$(json_field "$metrics" median_ms)"
  max_ms="$(json_field "$metrics" max_ms)"
  bad_actions="$(python - "$metrics" <<'PY'
import json
import sys
print(','.join(json.loads(sys.argv[1]).get('bad_actions', [])))
PY
)"

  if [[ -n "$bad_actions" ]]; then
    record_fail "$name" "unexpected actions=$bad_actions"
  elif (( p95_ms <= MAX_P95_MS )); then
    record_pass "$name" "median=${median_ms}ms p95=${p95_ms}ms max=${max_ms}ms"
  else
    record_fail "$name" "median=${median_ms}ms p95=${p95_ms}ms max=${max_ms}ms threshold=${MAX_P95_MS}ms"
  fi
}

printf 'Autoflow harness against: %s\n\n' "$SCRIPT_UNDER_TEST"

run_case_expect_action "accuracy-pending"          with-candidate     "Restore deterministic clean installs so repo setup and workflow gates are trustworthy" "pending"   "backlog:clean-install-reproducibility" "pending" "no"  "run-phase"
run_case_expect_action "accuracy-ship-phase"       with-candidate     "Restore deterministic clean installs so repo setup and workflow gates are trustworthy" "complete"  "backlog:clean-install-reproducibility" "PASS"    "yes" "ship-phase"
run_case_expect_action "accuracy-bad-metadata"     with-candidate     "Restore deterministic clean installs so repo setup and workflow gates are trustworthy" "pending"   "backlog:clean-install-reproducibility" "BROKEN"  "no"  "repair-phase-metadata"
run_case_expect_action "accuracy-missing-backlog"  missing-ref        "Restore deterministic clean installs so repo setup and workflow gates are trustworthy" "pending"   "backlog:clean-install-reproducibility" "pending" "no"  "repair-backlog-phase-ref"
run_case_expect_action "accuracy-lock-drift"       with-candidate     "Restore deterministic clean installs so repo setup and workflow gates are trustworthy" "pending"   "backlog:clean-install-reproducibility" "pending" "no"  "repair-lockfile"       drift
run_case_expect_action "accuracy-dirty-tree"       with-candidate     "Restore deterministic clean installs so repo setup and workflow gates are trustworthy" "pending"   "backlog:clean-install-reproducibility" "pending" "no"  "repair-working-tree"   dirty-out-of-scope
run_case_expect_action "accuracy-no-candidates"    without-candidates "Standalone maintenance"                                                     "done"      "notes/manual"                          "PASS"    "no"  "stop-no-candidates"
run_determinism_case
run_performance_case

printf '\nSummary: %d passed, %d failed, %d total\n' "$PASSED" "$FAILED" "$TOTAL"

if (( FAILED > 0 )); then
  exit 1
fi
