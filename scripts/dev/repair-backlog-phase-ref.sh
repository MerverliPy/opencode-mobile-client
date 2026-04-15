#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

python - <<'PY'
from pathlib import Path
import re

phase_path = Path(".opencode/plans/current-phase.md")
backlog_path = Path(".opencode/backlog/candidates.yaml")

phase_text = phase_path.read_text()
backlog_text = backlog_path.read_text() if backlog_path.exists() else ""

phase_file_match = re.search(r'(?m)^Phase file:\s*(.+)\s*$', phase_text)
title_match = re.search(r'(?m)^#\s+(.+?)\s*$', phase_text)
status_match = re.search(r'(?m)^Status:\s*(.+)\s*$', phase_text)
validation_match = re.search(r'(?ms)^## Validation\s+Status:\s*(.+?)\s*$', phase_text)

if not phase_file_match:
    raise SystemExit("repair-backlog-phase-ref: missing Phase file line")

phase_file = phase_file_match.group(1).strip()
if not phase_file.startswith("backlog:"):
    print("repair-backlog-phase-ref: current phase is not a backlog virtual reference; no changes needed")
    raise SystemExit(0)

backlog_id = phase_file.split(":", 1)[1].strip()
if not backlog_id:
    raise SystemExit("repair-backlog-phase-ref: missing backlog candidate id")

if re.search(rf'(?m)^  - id:\s*{re.escape(backlog_id)}\s*$', backlog_text):
    print(f"repair-backlog-phase-ref: backlog id already present: {backlog_id}")
    raise SystemExit(0)

title = title_match.group(1).strip() if title_match else backlog_id
phase_status = status_match.group(1).strip().lower() if status_match else "pending"
validation_status = validation_match.group(1).strip() if validation_match else "pending"
shipped = "true" if phase_status == "complete" and validation_status == "PASS" else "false"

if "archived:" not in backlog_text:
    backlog_text = backlog_text.rstrip() + "\n\narchived:\n"

entry = (
    f"  - id: {backlog_id}\n"
    f"    title: {title}\n"
    f"    module: workflow\n"
    f"    shipped: {shipped}\n"
)

backlog_text = backlog_text.rstrip() + "\n" + entry
backlog_path.write_text(backlog_text.rstrip() + "\n")
print(f"repair-backlog-phase-ref: appended archived stub for backlog:{backlog_id}")
PY
