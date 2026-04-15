#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

phase_json() {
  python - <<'PY'
from pathlib import Path
import json
import re

path = Path(".opencode/plans/current-phase.md")
text = path.read_text()
lines = text.splitlines()

title = ""
status = ""
release = ""
phase_file = ""
validation_status = ""
ready_to_ship = ""
primary_files = []

if lines:
    for line in lines:
        if line.startswith("# "):
            title = line[2:].strip()
            break

for line in lines:
    if line.startswith("Status:") and not status:
        status = line.split(":", 1)[1].strip()
    if line.startswith("Release:"):
        release = line.split(":", 1)[1].strip()
    if line.startswith("Phase file:"):
        phase_file = line.split(":", 1)[1].strip()

in_primary = False
in_validation = False

for line in lines:
    if line.strip() == "## Primary files":
        in_primary = True
        in_validation = False
        continue
    if line.strip() == "## Validation":
        in_validation = True
        in_primary = False
        continue
    if line.startswith("## "):
        in_primary = False
        if in_validation and line.strip() != "## Validation":
            in_validation = False
    if in_primary and line.lstrip().startswith("- "):
        primary_files.append(line.lstrip()[2:].strip("`").strip())
    if in_validation and line.startswith("Status:") and not validation_status:
        validation_status = line.split(":", 1)[1].strip()
    if in_validation and line.strip() == "Ready to ship:":
        continue
    if in_validation and line.lstrip().startswith("- ") and ready_to_ship == "":
        # first bullet after "Ready to ship:" is yes/no in this repo layout
        pass

# robust ready_to_ship parse
for i, line in enumerate(lines):
    if line.strip() == "Ready to ship:":
        for follow in lines[i+1:]:
            if follow.startswith("## "):
                break
            stripped = follow.strip()
            if stripped.startswith("- "):
                ready_to_ship = stripped[2:].strip().lower()
                break
        break

print(json.dumps({
    "title": title,
    "status": status,
    "release": release,
    "phase_file": phase_file,
    "validation_status": validation_status,
    "ready_to_ship": ready_to_ship,
    "primary_files": primary_files,
}))
PY
}

backlog_json() {
  python - <<'PY'
from pathlib import Path
import json
import re

path = Path(".opencode/backlog/candidates.yaml")
if not path.exists():
    print(json.dumps({"candidate_count": 0, "candidate_ids": [], "all_ids": []}))
    raise SystemExit(0)

text = path.read_text()

candidate_match = re.search(r'(?ms)^candidates:\s*($begin:math:display$$end:math:display$|.*?)(?=^archived:|\Z)', text)
candidate_block = candidate_match.group(1) if candidate_match else ""
candidate_ids = re.findall(r'(?m)^  - id:\s*([A-Za-z0-9._:-]+)\s*$', candidate_block)

all_ids = re.findall(r'(?m)^  - id:\s*([A-Za-z0-9._:-]+)\s*$', text)

print(json.dumps({
    "candidate_count": len(candidate_ids),
    "candidate_ids": candidate_ids,
    "all_ids": all_ids,
}))
PY
}

git_status_json() {
  python - <<'PY'
import subprocess
import json

proc = subprocess.run(
    ["git", "status", "--porcelain=v1"],
    capture_output=True,
    text=True,
    check=True,
)

paths = []
for raw in proc.stdout.splitlines():
    if not raw.strip():
        continue
    path = raw[3:]
    if " -> " in path:
        path = path.split(" -> ", 1)[1]
    paths.append(path)

print(json.dumps({
    "dirty": bool(paths),
    "paths": paths,
}))
PY
}

lock_drift() {
  if npm ci --ignore-scripts --dry-run >/dev/null 2>&1; then
    echo "no"
  else
    echo "yes"
  fi
}

phase_reference_type() {
  local phase_file="$1"
  if [[ "$phase_file" == backlog:* ]]; then
    echo "backlog"
  else
    echo "file"
  fi
}

backlog_reference_exists() {
  local backlog_id="$1"
  python - "$backlog_id" <<'PY'
from pathlib import Path
import re
import sys

backlog_id = sys.argv[1]
path = Path(".opencode/backlog/candidates.yaml")
if not path.exists():
    raise SystemExit(1)

text = path.read_text()
pattern = re.compile(rf'(?m)^  - id:\s*{re.escape(backlog_id)}\s*$')
raise SystemExit(0 if pattern.search(text) else 1)
PY
}

disallowed_dirty_files() {
  local phase_json_str="$1"
  local git_json_str="$2"
  python - "$phase_json_str" "$git_json_str" <<'PY'
import json
import sys

phase = json.loads(sys.argv[1])
git_state = json.loads(sys.argv[2])

allowed = set(phase.get("primary_files", []))
allowed.add(".opencode/plans/current-phase.md")

disallowed = [p for p in git_state.get("paths", []) if p not in allowed]

for path in disallowed:
    print(path)
PY
}

inspect() {
  local phase backlog git_state
  phase="$(phase_json)"
  backlog="$(backlog_json)"
  git_state="$(git_status_json)"

  local current_title current_status release phase_file validation_status ready_to_ship primary_files_count
  current_title="$(python -c 'import json,sys; print(json.loads(sys.argv[1])["title"])' "$phase")"
  current_status="$(python -c 'import json,sys; print(json.loads(sys.argv[1])["status"])' "$phase")"
  release="$(python -c 'import json,sys; print(json.loads(sys.argv[1])["release"])' "$phase")"
  phase_file="$(python -c 'import json,sys; print(json.loads(sys.argv[1])["phase_file"])' "$phase")"
  validation_status="$(python -c 'import json,sys; print(json.loads(sys.argv[1])["validation_status"])' "$phase")"
  ready_to_ship="$(python -c 'import json,sys; print(json.loads(sys.argv[1])["ready_to_ship"])' "$phase")"

  local branch dirty_tree active_candidate_count phase_ref_type drift backlog_id backlog_exists
  branch="$(git rev-parse --abbrev-ref HEAD)"
  dirty_tree="$(python -c 'import json,sys; print("yes" if json.loads(sys.argv[1])["dirty"] else "no")' "$git_state")"
  active_candidate_count="$(python -c 'import json,sys; print(json.loads(sys.argv[1])["candidate_count"])' "$backlog")"
  phase_ref_type="$(phase_reference_type "$phase_file")"
  drift="$(lock_drift)"
  backlog_id=""
  backlog_exists="n/a"

  if [[ "$phase_ref_type" == "backlog" ]]; then
    backlog_id="${phase_file#backlog:}"
    if backlog_reference_exists "$backlog_id"; then
      backlog_exists="yes"
    else
      backlog_exists="no"
    fi
  fi

  local disallowed
  disallowed="$(disallowed_dirty_files "$phase" "$git_state" | paste -sd, -)"
  local next_action="stop-blocked"
  local blocker=""

  if [[ ! "$validation_status" =~ ^(pending|PASS|FAIL)$ ]]; then
    next_action="repair-phase-metadata"
    blocker="unexpected validation status value: $validation_status"
  elif [[ "$phase_ref_type" == "backlog" && "$backlog_exists" == "no" ]]; then
    next_action="repair-backlog-phase-ref"
    blocker="backlog phase reference is missing from candidates.yaml: $phase_file"
  elif [[ "$drift" == "yes" ]]; then
    next_action="repair-lockfile"
    blocker="package-lock.json drift detected"
  elif [[ -n "$disallowed" ]]; then
    next_action="repair-working-tree"
    blocker="dirty tree contains files outside phase scope"
  elif [[ "$current_status" == "complete" && "$validation_status" == "PASS" && "$ready_to_ship" == "yes" ]]; then
    next_action="ship-phase"
  elif [[ "$current_status" == "pending" || "$current_status" == "in_progress" || "$current_status" == "in-progress" || "$validation_status" == "FAIL" ]]; then
    next_action="run-phase"
  elif [[ "$active_candidate_count" -gt 0 ]]; then
    next_action="next-phase"
  else
    next_action="stop-no-candidates"
    blocker="no active backlog candidates remain"
  fi

  echo "CURRENT_PHASE_TITLE=$current_title"
  echo "CURRENT_STATUS=$current_status"
  echo "RELEASE=$release"
  echo "PHASE_FILE=$phase_file"
  echo "PHASE_REFERENCE_TYPE=$phase_ref_type"
  echo "BACKLOG_ID=$backlog_id"
  echo "BACKLOG_REFERENCE_EXISTS=$backlog_exists"
  echo "VALIDATION_STATUS=$validation_status"
  echo "READY_TO_SHIP=$ready_to_ship"
  echo "CURRENT_BRANCH=$branch"
  echo "DIRTY_TREE=$dirty_tree"
  echo "DISALLOWED_DIRTY_FILES=$disallowed"
  echo "ACTIVE_CANDIDATE_COUNT=$active_candidate_count"
  echo "LOCKFILE_DRIFT=$drift"
  echo "NEXT_ACTION=$next_action"
  echo "BLOCKER=$blocker"
}

rerun_gate() {
  local gate="${1:-}"
  case "$gate" in
    workflow-check)
      npm run workflow:check
      ;;
    repo-doctor)
      npm run repo:doctor
      ;;
    validate-local)
      npm run validate:local
      ;;
    browser-smoke)
      npm run browser:smoke
      ;;
    release-proof)
      npm run release:proof
      ;;
    preview-host)
      npm run preview:host
      ;;
    *)
      fail "unsupported gate: $gate"
      ;;
  esac
}

case "${1:-inspect}" in
  inspect)
    inspect
    ;;
  rerun-gate)
    rerun_gate "${2:-}"
    ;;
  *)
    fail "usage: bash scripts/dev/autoflow.sh [inspect|rerun-gate <gate>]"
    ;;
esac
