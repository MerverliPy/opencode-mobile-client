#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

python - <<'PY'
from pathlib import Path

path = Path(".opencode/plans/current-phase.md")
lines = path.read_text().splitlines()

in_validation = False
found_status = False
found_ready = False
changed = False

for i, line in enumerate(lines):
    if line.strip() == "## Validation":
        in_validation = True
        continue
    if in_validation and line.startswith("## "):
        if not found_status:
            lines.insert(i, "Status: pending")
            lines.insert(i + 1, "")
            lines.insert(i + 2, "Evidence:")
            lines.insert(i + 3, "- not run yet")
            lines.insert(i + 4, "")
            lines.insert(i + 5, "Blockers:")
            lines.insert(i + 6, "- none")
            lines.insert(i + 7, "")
            lines.insert(i + 8, "Ready to ship:")
            lines.insert(i + 9, "- no")
            changed = True
        elif not found_ready:
            lines.insert(i, "")
            lines.insert(i + 1, "Ready to ship:")
            lines.insert(i + 2, "- no")
            changed = True
        break
    if in_validation and line.startswith("Status:"):
        current = line.split(":", 1)[1].strip()
        if current not in {"pending", "PASS", "FAIL"}:
            lines[i] = "Status: pending"
            changed = True
        found_status = True
    if in_validation and line.strip() == "Ready to ship:":
        found_ready = True

if not changed:
    print("repair-phase-metadata: no changes needed")
else:
    path.write_text("\n".join(lines) + "\n")
    print("repair-phase-metadata: normalized .opencode/plans/current-phase.md")
PY
