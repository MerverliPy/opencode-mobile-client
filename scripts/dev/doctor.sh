#!/usr/bin/env bash
set -euo pipefail

repo_root=$(pwd)
current_phase_file=".opencode/plans/current-phase.md"
registry_file="docs/releases/phase-registry.md"

[[ -f "$current_phase_file" ]] || { echo "Doctor check failed: missing $current_phase_file"; exit 1; }
[[ -f "$registry_file" ]] || { echo "Doctor check failed: missing $registry_file"; exit 1; }
[[ -f "opencode.json" ]] || { echo "Doctor check failed: missing opencode.json"; exit 1; }
[[ -f "AGENTS.md" ]] || { echo "Doctor check failed: missing AGENTS.md"; exit 1; }

phase_title=$(grep -E '^# ' "$current_phase_file" | head -1 | sed 's/^# //')
release_value=$(grep -E '^Release:' "$current_phase_file" | sed 's/^Release:[[:space:]]*//')
phase_path=$(grep -E '^Phase file:' "$current_phase_file" | sed 's/^Phase file:[[:space:]]*//')
validation_status=$(python - <<'PY'
from pathlib import Path
lines = Path('.opencode/plans/current-phase.md').read_text().splitlines()
in_validation = False
for line in lines:
    if line.strip() == '## Validation':
        in_validation = True
        continue
    if in_validation and line.startswith('## '):
        break
    if in_validation and line.startswith('Status:'):
        print(line.split(':', 1)[1].strip())
        break
else:
    print('unknown')
PY
)
package_version=$(node -p "require('./package.json').version")

printf 'Repo root: %s\n' "$repo_root"
printf 'Package version: %s\n' "$package_version"
printf 'Current phase heading: %s\n' "$phase_title"
printf 'Current release: %s\n' "$release_value"
printf 'Current phase file: %s\n' "$phase_path"
printf 'Validation status: %s\n' "$validation_status"

printf '\nWorkflow files:\n'
for path in \
  opencode.json \
  AGENTS.md \
  .opencode/agents/orchestrator.md \
  .opencode/agents/builder.md \
  .opencode/agents/validator.md \
  .opencode/agents/reviewer.md \
  .opencode/agents/release-manager.md \
  .opencode/commands/next-phase.md \
  .opencode/commands/run-phase.md \
  .opencode/commands/validate-phase.md \
  .opencode/commands/ship-phase.md \
  .opencode/commands/workflow-check.md \
  .opencode/plans/current-phase.md \
  docs/releases/phase-registry.md
  do
  if [[ -f "$path" ]]; then
    printf '  OK  %s\n' "$path"
  else
    printf '  MISS %s\n' "$path"
    exit 1
  fi
done

printf '\nClean-install check:\n'
if npm ci --ignore-scripts --dry-run >/dev/null 2>&1; then
  echo '  OK  npm ci --ignore-scripts --dry-run'
else
  echo '  FAIL npm ci --ignore-scripts --dry-run'
  exit 1
fi

echo
echo 'Doctor check passed.'
