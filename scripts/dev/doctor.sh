#!/usr/bin/env bash
set -euo pipefail

backlog_candidate_exists() {
  local backlog_id="$1"
  BACKLOG_ID="$backlog_id" python - <<'PY'
import os
import re
from pathlib import Path

candidate_id = os.environ['BACKLOG_ID']
text = Path('.opencode/backlog/candidates.yaml').read_text()
pattern = rf'(?m)^\s*-\s+id:\s*{re.escape(candidate_id)}\s*$'
raise SystemExit(0 if re.search(pattern, text) else 1)
PY
}

playwright_browser_readiness() {
  python - <<'PY'
import json
import shutil
import subprocess
from pathlib import Path

result = {
    'module_installed': False,
    'webkit_ready': False,
    'executable_path': '',
    'bootstrap_hint': '',
}

package_lock_present = Path('node_modules/playwright/package.json').is_file()
cli_present = Path('node_modules/.bin/playwright').is_file()
result['module_installed'] = package_lock_present and cli_present

if result['module_installed']:
    probe = subprocess.run(
        [
            'node',
            '--input-type=module',
            '-e',
            "import fs from 'node:fs'; import { webkit } from 'playwright'; const executablePath = webkit.executablePath(); if (executablePath && fs.existsSync(executablePath)) { console.log(executablePath); process.exit(0); } console.error(executablePath || ''); process.exit(1);",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if probe.returncode == 0:
        result['webkit_ready'] = True
        result['executable_path'] = probe.stdout.strip()
    else:
        result['bootstrap_hint'] = 'Run `npx playwright install webkit` from repo root before `npm run browser:smoke`.'
else:
    result['bootstrap_hint'] = 'Run `npm install` from repo root before browser-proof commands.'

print(json.dumps(result))
PY
}

repo_root=$(pwd)
current_phase_file=".opencode/plans/current-phase.md"
registry_file="docs/releases/phase-registry.md"

[[ -f "$current_phase_file" ]] || { echo "Doctor check failed: missing $current_phase_file"; exit 1; }
[[ -f "$registry_file" ]] || { echo "Doctor check failed: missing $registry_file"; exit 1; }
[[ -f ".opencode/backlog/candidates.yaml" ]] || { echo "Doctor check failed: missing .opencode/backlog/candidates.yaml"; exit 1; }
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
browser_readiness_json=$(playwright_browser_readiness)
browser_module_installed=$(BROWSER_READINESS_JSON="$browser_readiness_json" python - <<'PY'
import json
import os
print('yes' if json.loads(os.environ['BROWSER_READINESS_JSON'])['module_installed'] else 'no')
PY
)
webkit_ready=$(BROWSER_READINESS_JSON="$browser_readiness_json" python - <<'PY'
import json
import os
print('yes' if json.loads(os.environ['BROWSER_READINESS_JSON'])['webkit_ready'] else 'no')
PY
)
webkit_executable_path=$(BROWSER_READINESS_JSON="$browser_readiness_json" python - <<'PY'
import json
import os
print(json.loads(os.environ['BROWSER_READINESS_JSON'])['executable_path'])
PY
)
browser_bootstrap_hint=$(BROWSER_READINESS_JSON="$browser_readiness_json" python - <<'PY'
import json
import os
print(json.loads(os.environ['BROWSER_READINESS_JSON'])['bootstrap_hint'])
PY
)

phase_display="$phase_path"

if [[ "$phase_path" == backlog:* ]]; then
  backlog_id="${phase_path#backlog:}"
  [[ -n "$backlog_id" ]] || { echo "Doctor check failed: backlog phase reference is missing a candidate id"; exit 1; }
  backlog_candidate_exists "$backlog_id" || { echo "Doctor check failed: unknown backlog phase reference $phase_path"; exit 1; }
  phase_display="$phase_path (virtual backlog reference)"
fi

printf 'Repo root: %s\n' "$repo_root"
printf 'Package version: %s\n' "$package_version"
printf 'Current phase heading: %s\n' "$phase_title"
printf 'Current release: %s\n' "$release_value"
printf 'Current phase file: %s\n' "$phase_display"
printf 'Validation status: %s\n' "$validation_status"

printf '\nBrowser-proof readiness:\n'
if [[ "$browser_module_installed" == "yes" ]]; then
  echo '  OK  Playwright package is installed.'
else
  echo '  WARN Playwright package is not installed.'
fi

if [[ "$webkit_ready" == "yes" ]]; then
  printf '  OK  WebKit runtime is installed at %s\n' "$webkit_executable_path"
else
  echo '  WARN WebKit runtime is not installed yet.'
fi

if [[ -n "$browser_bootstrap_hint" ]]; then
  printf '  INFO %s\n' "$browser_bootstrap_hint"
fi

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
