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

path = Path('.opencode/plans/current-phase.md')
text = path.read_text()
lines = text.splitlines()

title = ''
status = ''
release = ''
phase_file = ''
validation_status = ''
ready_to_ship = ''
validation_command = ''
primary_files = []

section = None
validation_command_lines = []
validation_lines = []

for line in lines:
    stripped = line.strip()

    if line.startswith('# ') and not title:
        title = line[2:].strip()
    if line.startswith('Status:') and not status:
        status = line.split(':', 1)[1].strip()
    if line.startswith('Release:'):
        release = line.split(':', 1)[1].strip()
    if line.startswith('Phase file:'):
        phase_file = line.split(':', 1)[1].strip()

    if stripped == '## Primary files':
        section = 'primary'
        continue
    if stripped == '## Validation command':
        section = 'validation_command'
        continue
    if stripped == '## Validation':
        section = 'validation'
        continue
    if line.startswith('## '):
        section = None
        continue

    if section == 'primary' and line.lstrip().startswith('- '):
        primary_files.append(line.lstrip()[2:].strip().strip('`'))
    elif section == 'validation_command' and stripped:
        validation_command_lines.append(line.rstrip())
    elif section == 'validation':
        validation_lines.append(line.rstrip())

for raw in validation_command_lines:
    stripped = raw.strip()
    if stripped.startswith('```'):
        continue
    if stripped:
        validation_command = stripped.strip('`').strip()
        break

validation_block = '\n'.join(validation_lines)

match = re.search(r'(?mi)^Status:\s*(.+)$', validation_block)
if match:
    validation_status = match.group(1).strip()

same_line_ready = re.search(r'(?mi)^Ready to ship:\s*(yes|no)\s*$', validation_block)
if same_line_ready:
    ready_to_ship = same_line_ready.group(1).strip().lower()
else:
    marker = re.search(r'(?mi)^Ready to ship:\s*$', validation_block)
    if marker:
        tail = validation_block[marker.end():]
        bullet = re.search(r'(?mi)^-\s*(yes|no)\s*$', tail)
        if bullet:
            ready_to_ship = bullet.group(1).strip().lower()

print(json.dumps({
    'title': title,
    'status': status,
    'release': release,
    'phase_file': phase_file,
    'validation_status': validation_status,
    'ready_to_ship': ready_to_ship,
    'validation_command': validation_command,
    'primary_files': primary_files,
}))
PY
}

backlog_json() {
  python - <<'PY'
from pathlib import Path
import json
import re

path = Path('.opencode/backlog/candidates.yaml')
if not path.exists():
    print(json.dumps({'candidate_count': 0, 'candidate_ids': [], 'all_ids': []}))
    raise SystemExit(0)

text = path.read_text()
registry_path = Path('docs/releases/phase-registry.md')
registry_text = registry_path.read_text() if registry_path.exists() else ''
match = re.search(r'(?ms)^candidates:\s*(.*?)(?=^(?:deferred_local_first_candidates|archived):|\Z)', text)
block = match.group(1) if match else ''
pattern = re.compile(r'(?m)^\s*-\s+id:\s*([A-Za-z0-9._:-]+)\s*$')

raw_candidate_ids = pattern.findall(block)
all_ids = pattern.findall(text)

def registry_complete(candidate_id):
    if not candidate_id:
        return False
    return bool(re.search(rf'(?m)^\s*-\s+\[x\]\s+{re.escape(candidate_id)}\s+—', registry_text))

candidate_ids = [candidate_id for candidate_id in raw_candidate_ids if not registry_complete(candidate_id)]
stale_candidate_ids = [candidate_id for candidate_id in raw_candidate_ids if registry_complete(candidate_id)]

print(json.dumps({
    'candidate_count': len(candidate_ids),
    'candidate_ids': candidate_ids,
    'stale_candidate_ids': stale_candidate_ids,
    'all_ids': all_ids,
}))
PY
}

git_status_json() {
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo '{"dirty": false, "paths": []}'
    return 0
  fi

  python - <<'PY'
import subprocess
import json

proc = subprocess.run(
    ['git', 'status', '--porcelain=v1'],
    capture_output=True,
    text=True,
    check=True,
)

paths = []
for raw in proc.stdout.splitlines():
    if not raw.strip():
        continue
    path = raw[3:]
    if ' -> ' in path:
        path = path.split(' -> ', 1)[1]
    paths.append(path)

print(json.dumps({
    'dirty': bool(paths),
    'paths': paths,
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
path = Path('.opencode/backlog/candidates.yaml')
if not path.exists():
    raise SystemExit(1)

text = path.read_text()
pattern = re.compile(rf'(?m)^\s*-\s+id:\s*{re.escape(backlog_id)}\s*$')
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

allowed = set(phase.get('primary_files', []))
allowed.update({
    '.opencode/plans/current-phase.md',
})

disallowed = [p for p in git_state.get('paths', []) if p not in allowed]
for path in disallowed:
    print(path)
PY
}

manual_next_command_for() {
  local next_action="$1"
  case "$next_action" in
    repair-phase-metadata)
      echo "bash scripts/dev/repair-phase-metadata.sh && npm run workflow:check"
      ;;
    repair-backlog-phase-ref)
      echo "bash scripts/dev/repair-backlog-phase-ref.sh && npm run workflow:check && npm run repo:doctor"
      ;;
    repair-backlog-selection)
      echo "bash scripts/dev/repair-backlog-selection.sh && npm run workflow:check"
      ;;
    repair-lockfile)
      echo "bash scripts/dev/repair-lockfile.sh && npm run workflow:check"
      ;;
    repair-working-tree)
      echo "bash scripts/dev/repair-working-tree.sh stash-unrelated"
      ;;
    repair-preview-port)
      echo "bash scripts/dev/repair-preview-port.sh release --force-restart"
      ;;
    run-phase|validate-phase|fix-validation|ship-phase|next-phase)
      echo "/autoflow"
      ;;
    stop-no-candidates)
      echo "none"
      ;;
    *)
      echo "/phase-status"
      ;;
  esac
}

collect_state() {
  local phase backlog git_state
  phase="$(phase_json)"
  backlog="$(backlog_json)"
  git_state="$(git_status_json)"

  local current_title current_status release phase_file validation_status ready_to_ship validation_command
  current_title="$(python -c 'import json,sys; print(json.loads(sys.argv[1])["title"])' "$phase")"
  current_status="$(python -c 'import json,sys; print(json.loads(sys.argv[1])["status"])' "$phase")"
  release="$(python -c 'import json,sys; print(json.loads(sys.argv[1])["release"])' "$phase")"
  phase_file="$(python -c 'import json,sys; print(json.loads(sys.argv[1])["phase_file"])' "$phase")"
  validation_status="$(python -c 'import json,sys; print(json.loads(sys.argv[1])["validation_status"])' "$phase")"
  ready_to_ship="$(python -c 'import json,sys; print(json.loads(sys.argv[1])["ready_to_ship"])' "$phase")"
  validation_command="$(python -c 'import json,sys; print(json.loads(sys.argv[1])["validation_command"])' "$phase")"

  local branch dirty_tree active_candidate_count stale_candidate_count phase_ref_type drift backlog_id backlog_exists
  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  dirty_tree="$(python -c 'import json,sys; print("yes" if json.loads(sys.argv[1])["dirty"] else "no")' "$git_state")"
  active_candidate_count="$(python -c 'import json,sys; print(json.loads(sys.argv[1])["candidate_count"])' "$backlog")"
  stale_candidate_count="$(python -c 'import json,sys; print(len(json.loads(sys.argv[1]).get("stale_candidate_ids", [])))' "$backlog")"
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

  local disallowed next_action blocker manual_next_command
  disallowed="$(disallowed_dirty_files "$phase" "$git_state" | paste -sd, -)"
  next_action="stop-blocked"
  blocker=""

  if [[ ! "$validation_status" =~ ^(pending|PASS|FAIL)$ ]]; then
    next_action="repair-phase-metadata"
    blocker="unexpected validation status value: $validation_status"
  elif [[ "$phase_ref_type" == "backlog" && "$backlog_exists" == "no" ]]; then
    next_action="repair-backlog-phase-ref"
    blocker="backlog phase reference is missing from candidates.yaml: $phase_file"
  elif [[ "$drift" == "yes" ]]; then
    next_action="repair-lockfile"
    blocker="package-lock.json drift detected"
  elif [[ "$stale_candidate_count" -gt 0 ]]; then
    next_action="repair-backlog-selection"
    blocker="registry-complete backlog ids remain selectable under candidates"
  elif [[ -n "$disallowed" ]]; then
    next_action="repair-working-tree"
    blocker="dirty tree contains files outside phase scope"
  elif [[ "$current_status" == "complete" && "$validation_status" == "PASS" && "$ready_to_ship" == "yes" ]]; then
    next_action="ship-phase"
  elif [[ "$validation_status" == "FAIL" ]]; then
    next_action="fix-validation"
    blocker="validator blockers are present"
  elif [[ "$current_status" == "complete" && "$validation_status" == "pending" ]]; then
    next_action="validate-phase"
  elif [[ "$current_status" == "pending" || "$current_status" == "in_progress" || "$current_status" == "in-progress" ]]; then
    next_action="run-phase"
  elif [[ "$active_candidate_count" -gt 0 ]]; then
    next_action="next-phase"
  else
    next_action="stop-no-candidates"
    blocker="no active backlog candidates remain"
  fi

  manual_next_command="$(manual_next_command_for "$next_action")"

  cat <<EOF
CURRENT_PHASE_TITLE=$current_title
CURRENT_STATUS=$current_status
RELEASE=$release
PHASE_FILE=$phase_file
PHASE_REFERENCE_TYPE=$phase_ref_type
BACKLOG_ID=$backlog_id
BACKLOG_REFERENCE_EXISTS=$backlog_exists
VALIDATION_STATUS=$validation_status
READY_TO_SHIP=$ready_to_ship
VALIDATION_COMMAND=$validation_command
CURRENT_BRANCH=$branch
DIRTY_TREE=$dirty_tree
DISALLOWED_DIRTY_FILES=$disallowed
ACTIVE_CANDIDATE_COUNT=$active_candidate_count
STALE_CANDIDATE_COUNT=$stale_candidate_count
LOCKFILE_DRIFT=$drift
NEXT_ACTION=$next_action
BLOCKER=$blocker
MANUAL_NEXT_COMMAND=$manual_next_command
EOF
}

inspect() {
  collect_state
}

inspect_json() {
  local kv
  kv="$(collect_state)"
  python - <<'PY' "$kv"
import json
import sys

data = {}
for raw in sys.argv[1].splitlines():
    if '=' not in raw:
        continue
    key, value = raw.split('=', 1)
    data[key.lower()] = value
print(json.dumps(data))
PY
}

next_action_only() {
  collect_state | awk -F= '$1 == "NEXT_ACTION" { print $2 }'
}

manual_next_command() {
  collect_state | awk -F= '$1 == "MANUAL_NEXT_COMMAND" { print substr($0, index($0, "=") + 1) }'
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
  inspect-json)
    inspect_json
    ;;
  next-action)
    next_action_only
    ;;
  manual-next-command)
    manual_next_command
    ;;
  rerun-gate)
    rerun_gate "${2:-}"
    ;;
  *)
    fail "usage: bash scripts/dev/autoflow.sh [inspect|inspect-json|next-action|manual-next-command|rerun-gate <gate>]"
    ;;
esac
