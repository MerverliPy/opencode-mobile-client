#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "FAIL: $1"
  exit 1
}

pass() {
  echo "PASS: $1"
}

[[ -f ".opencode/plans/current-phase.md" ]] || fail "missing .opencode/plans/current-phase.md"
[[ -f "docs/releases/phase-registry.md" ]] || fail "missing docs/releases/phase-registry.md"
[[ -f "package.json" ]] || fail "missing package.json"

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
[[ -f "${phase_file}" ]] || fail "referenced phase file does not exist: ${phase_file}"
[[ -n "${release_value:-}" ]] || fail "missing Release value in current phase"

pkg_version=$(python - <<'PY'
import json
from pathlib import Path
print(json.loads(Path("package.json").read_text()).get("version",""))
PY
)

[[ -n "${pkg_version:-}" ]] || fail "package.json version missing"

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

grep -q "${release_value}" "${phase_file}" || fail "phase file does not match current release value"
[[ -n "${validation_value:-}" ]] || fail "missing validation status in current phase"
[[ "${validation_value}" =~ ^(pending|PASS|FAIL)$ ]] || fail "unexpected validation status value: ${validation_value}"

if [[ -n "${runtime_tag}" && "${runtime_tag}" != "${release_value}" ]]; then
  fail "runtime releaseTag (${runtime_tag}) does not match current phase release (${release_value})"
fi

if [[ "${pkg_version}" != "${release_value#v}" ]]; then
  fail "package.json version (${pkg_version}) does not match current phase release (${release_value})"
fi

pass "workflow invariants look consistent"
