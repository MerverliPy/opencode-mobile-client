#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

pass() {
  echo "PASS: $*"
}

[[ -f .opencode/plans/current-phase.md ]] || fail "missing .opencode/plans/current-phase.md"
[[ -f scripts/dev/autoflow.sh ]] || fail "missing scripts/dev/autoflow.sh"

PHASE_JSON="$(python - <<'PY'
from pathlib import Path
import json
import re

path = Path('.opencode/plans/current-phase.md')
text = path.read_text()
lines = text.splitlines()

title = ''
top_status = ''
phase_file = ''
release = ''
primary_files = []
validation_command = ''
validation_status = ''
ready_to_ship = ''
evidence = []
blockers = []
completion_summary = []

section = None
validation_command_lines = []
validation_lines = []
completion_lines = []

for line in lines:
    stripped = line.strip()

    if line.startswith('# ') and not title:
        title = line[2:].strip()
    if line.startswith('Status:') and not top_status:
        top_status = line.split(':', 1)[1].strip()
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
    if stripped == '## Completion summary':
        section = 'completion'
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
    elif section == 'completion':
        completion_lines.append(line.rstrip())

for raw in validation_command_lines:
    stripped = raw.strip()
    if stripped.startswith('```'):
        continue
    if stripped:
        validation_command = stripped.strip('`').strip()
        break

validation_block = '\n'.join(validation_lines)

m = re.search(r'(?mi)^Status:\s*(.+)$', validation_block)
if m:
    validation_status = m.group(1).strip()

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

current = None
for raw in validation_lines:
    stripped = raw.strip()
    if stripped == 'Evidence:':
        current = 'evidence'
        continue
    if stripped == 'Blockers:':
        current = 'blockers'
        continue
    if stripped == 'Ready to ship:':
        current = None
        continue
    if raw.startswith('## '):
        current = None
        continue
    if stripped.startswith('- '):
        item = stripped[2:].strip()
        if current == 'evidence':
            evidence.append(item)
        elif current == 'blockers':
            blockers.append(item)

for raw in completion_lines:
    stripped = raw.strip()
    if stripped.startswith('- '):
        completion_summary.append(stripped[2:].strip())

print(json.dumps({
    "title": title,
    "top_status": top_status,
    "phase_file": phase_file,
    "release": release,
    "primary_files": primary_files,
    "validation_command": validation_command,
    "validation_status": validation_status,
    "ready_to_ship": ready_to_ship,
    "evidence": evidence,
    "blockers": blockers,
    "completion_summary": completion_summary,
}))
PY
)"

STATE_JSON="$(bash scripts/dev/autoflow.sh inspect-json)"

CHANGED_FILES="$(git diff --name-only HEAD)"
STAGED_FILES="$(git diff --cached --name-only)"
UNTRACKED_FILES="$(git ls-files --others --exclude-standard)"

python - "$PHASE_JSON" "$STATE_JSON" "$CHANGED_FILES" "$STAGED_FILES" "$UNTRACKED_FILES" <<'PY'
import json
import sys
from pathlib import PurePosixPath

phase = json.loads(sys.argv[1])
state = json.loads(sys.argv[2])
changed = [p for p in sys.argv[3].splitlines() if p.strip()]
staged = [p for p in sys.argv[4].splitlines() if p.strip()]
untracked = [p for p in sys.argv[5].splitlines() if p.strip()]

title = phase.get("title", "")
top_status = phase.get("top_status", "")
phase_file = phase.get("phase_file", "")
primary_files = set(phase.get("primary_files", []))
validation_command = phase.get("validation_command", "")
validation_status = phase.get("validation_status", "")
ready_to_ship = phase.get("ready_to_ship", "")
evidence = phase.get("evidence", [])
blockers = phase.get("blockers", [])
completion_summary = phase.get("completion_summary", [])

all_changed = sorted(set(changed + staged + untracked))

always_allowed = {
    ".opencode/plans/current-phase.md",
}

shipping_allowed = {
    ".opencode/backlog/candidates.yaml",
    "docs/releases/phase-registry.md",
}

def is_release_file(path: str) -> bool:
    p = PurePosixPath(path)
    return str(p).startswith("docs/releases/")

def is_allowed(path: str) -> bool:
    if path in primary_files or path in always_allowed:
        return True
    if is_release_file(path):
        return True
    if path in shipping_allowed:
        return True
    return False

scope_violations = [p for p in all_changed if not is_allowed(p)]

release_metadata_touched = any(
    p == ".opencode/backlog/candidates.yaml" or is_release_file(p)
    for p in all_changed
)

errors = []
notes = []

if scope_violations:
    errors.append(
        "changed files outside active phase scope: " + ", ".join(scope_violations)
    )
else:
    notes.append("changed files stayed within allowed phase/shipping surfaces")

if not validation_command:
    errors.append("missing validation command in current phase")
if validation_status not in {"PASS", "FAIL"}:
    errors.append(f"validation status is not finalized: {validation_status or 'missing'}")
placeholder_evidence = {"not run yet", "pending", "not validated yet"}
real_evidence = [e for e in evidence if e and e.lower() not in placeholder_evidence]
if not real_evidence:
    errors.append("validation evidence was not updated with concrete run output")
else:
    notes.append("validation evidence is populated")

if title == "Current Phase":
    errors.append("phase title is still generic 'Current Phase'")
if validation_status == "PASS" and top_status != "complete":
    errors.append("phase validation passed but top-level Status is not complete")
if validation_status == "FAIL" and top_status == "complete":
    errors.append("phase validation failed but top-level Status is complete")
if validation_status == "FAIL":
    real_blockers = [b for b in blockers if b and b.lower() not in {"none", "not validated yet"}]
    if not real_blockers:
        errors.append("validation failed but blocker list was not updated")
if validation_status == "PASS":
    if not completion_summary or completion_summary == ["pending"]:
        errors.append("phase passed but completion summary was not updated")
    else:
        notes.append("completion summary is populated")

if release_metadata_touched:
    if not (validation_status == "PASS" and ready_to_ship == "yes" and top_status == "complete"):
        errors.append(
            "release metadata changed before shipping conditions were met "
            "(need validation PASS, Ready to ship yes, and top-level Status complete)"
        )
    else:
        notes.append("release metadata changes are consistent with shipping state")

state_validation_status = state.get("validation_status", "")
state_next_action = state.get("next_action", "")
if validation_status and state_validation_status and validation_status != state_validation_status:
    errors.append(
        f"phase file validation status ({validation_status}) disagrees with autoflow state ({state_validation_status})"
    )
else:
    notes.append(f"autoflow state agrees on validation status: {validation_status or 'missing'}")

summary = {
    "title": title,
    "phase_file": phase_file,
    "top_status": top_status,
    "validation_status": validation_status,
    "ready_to_ship": ready_to_ship,
    "next_action": state_next_action,
    "changed_files": all_changed,
    "errors": errors,
    "notes": notes,
}

print(json.dumps(summary, indent=2))

if errors:
    raise SystemExit(1)
PY

pass "autoflow post-run audit passed"
