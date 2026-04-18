#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "FAIL: $1"
  exit 1
}

pass() {
  echo "PASS: $1"
}

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

stale_registry_complete_candidates() {
  python - <<'PY'
from pathlib import Path
import re

backlog_text = Path('.opencode/backlog/candidates.yaml').read_text()
registry_text = Path('docs/releases/phase-registry.md').read_text()

match = re.search(r'(?ms)^candidates:\s*(.*?)(?=^(?:deferred_local_first_candidates|archived):|\Z)', backlog_text)
candidate_block = match.group(1) if match else ''
candidate_ids = re.findall(r'(?m)^\s*-\s+id:\s*([A-Za-z0-9._:-]+)\s*$', candidate_block)

stale = []
for candidate_id in candidate_ids:
    pattern = re.compile(rf'(?m)^\s*-\s+\[x\]\s+{re.escape(candidate_id)}\s+—')
    if pattern.search(registry_text):
        stale.append(candidate_id)

print(','.join(stale))
PY
}

[[ -f ".opencode/plans/current-phase.md" ]] || fail "missing .opencode/plans/current-phase.md"
[[ -f "docs/releases/phase-registry.md" ]] || fail "missing docs/releases/phase-registry.md"
[[ -f "package.json" ]] || fail "missing package.json"
[[ -f "package-lock.json" ]] || fail "missing package-lock.json"
[[ -f "README.md" ]] || fail "missing README.md"

phase_file=$(grep -E '^Phase file:' .opencode/plans/current-phase.md | sed 's/^Phase file:[[:space:]]*//')
release_value=$(grep -E '^Release:' .opencode/plans/current-phase.md | sed 's/^Release:[[:space:]]*//')
validation_value=$(python - <<'PY'
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
    print('')
PY
)

[[ -n "${phase_file:-}" ]] || fail "could not resolve phase file from current phase"

if [[ "${phase_file}" == backlog:* ]]; then
  backlog_id="${phase_file#backlog:}"
  [[ -n "${backlog_id}" ]] || fail "backlog phase reference is missing a candidate id"
  [[ -f ".opencode/backlog/candidates.yaml" ]] || fail "missing .opencode/backlog/candidates.yaml for backlog phase reference"
  backlog_candidate_exists "${backlog_id}" || fail "referenced backlog phase does not exist: ${phase_file}"
  phase_reference_type="backlog"
else
  [[ -f "${phase_file}" ]] || fail "referenced phase file does not exist: ${phase_file}"
  phase_reference_type="file"
fi

[[ -n "${release_value:-}" ]] || fail "missing Release value in current phase"

pkg_version=$(python - <<'PY'
import json
from pathlib import Path
print(json.loads(Path('package.json').read_text()).get('version', ''))
PY
)

[[ -n "${pkg_version:-}" ]] || fail "package.json version missing"

readme_release=$(python - <<'PY'
import re
from pathlib import Path
text = Path('README.md').read_text()
match = re.search(r'current release baseline is `([^`]+)`', text, re.IGNORECASE)
print(match.group(1) if match else '')
PY
)

readme_package_version=$(python - <<'PY'
import re
from pathlib import Path
text = Path('README.md').read_text()
match = re.search(r'package\.json` version `([^`]+)`', text)
print(match.group(1) if match else '')
PY
)

[[ -n "${readme_release:-}" ]] || fail "README release baseline could not be parsed"
[[ -n "${readme_package_version:-}" ]] || fail "README package.json version baseline could not be parsed"

if grep -q "const releaseTag =" src/main.js 2>/dev/null; then
  runtime_tag=$(python - <<'PY'
import json
import re
from pathlib import Path

package_version = json.loads(Path('package.json').read_text()).get('version', '')
source = Path('src/main.js').read_text()

template_match = re.search(r"const\s+releaseTag\s*=\s*`v\$\{packageVersion\}`", source)
if template_match:
    print(f"v{package_version}")
else:
    literal_match = re.search(r"const\s+releaseTag\s*=\s*['\"]([^'\"]+)['\"]", source)
    print(literal_match.group(1) if literal_match else '')
PY
)
  [[ -n "${runtime_tag:-}" ]] || fail "runtime releaseTag could not be parsed"
else
  runtime_tag=""
fi

if [[ "${phase_reference_type}" == "file" ]]; then
  grep -q "${release_value}" "${phase_file}" || fail "phase file does not match current release value"
fi

stale_completed_candidates="$(stale_registry_complete_candidates)"
[[ -z "${stale_completed_candidates}" ]] || fail "registry-complete backlog ids remain selectable under candidates: ${stale_completed_candidates}"

grep -q "${release_value}" docs/releases/phase-registry.md || fail "phase registry does not mention current release value"
[[ -n "${validation_value:-}" ]] || fail "missing validation status in current phase"
[[ "${validation_value}" =~ ^(pending|PASS|FAIL)$ ]] || fail "unexpected validation status value: ${validation_value}"

[[ "${readme_release}" == "${release_value}" ]] || fail "README release baseline (${readme_release}) does not match current phase release (${release_value})"
[[ "${readme_package_version}" == "${pkg_version}" ]] || fail "README package version baseline (${readme_package_version}) does not match package.json version (${pkg_version})"

if [[ -n "${runtime_tag}" && "${runtime_tag}" != "v${pkg_version}" ]]; then
  fail "runtime releaseTag (${runtime_tag}) does not match package.json version (v${pkg_version})"
fi

if [[ "${validation_value}" == "PASS" ]]; then
  if [[ -n "${runtime_tag}" && "${runtime_tag}" != "${release_value}" ]]; then
    fail "runtime releaseTag (${runtime_tag}) does not match current phase release (${release_value})"
  fi

  if [[ "${pkg_version}" != "${release_value#v}" ]]; then
    fail "package.json version (${pkg_version}) does not match current phase release (${release_value})"
  fi
fi

if ! npm ci --ignore-scripts --dry-run >/dev/null 2>&1; then
  fail "package-lock.json is out of sync with package.json (npm ci --ignore-scripts --dry-run failed)"
fi

python - <<'PY'
import json
from pathlib import Path
scripts = json.loads(Path('package.json').read_text()).get('scripts', {})
required = ['workflow:check', 'validate:local', 'lint', 'test', 'build', 'preview:host']
missing = [name for name in required if name not in scripts]
if missing:
    raise SystemExit('missing scripts: ' + ', '.join(missing))
PY

pass "workflow invariants look consistent"
