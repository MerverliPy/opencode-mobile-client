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
validation_value=$(grep -E '^Status:' .opencode/plans/current-phase.md | head -n 1 | sed 's/^Status:[[:space:]]*//')

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
  runtime_tag=$(grep -E "const releaseTag = " src/main.js | head -n 1 | sed -E "s/.*'([^']+)'.*/\1/")
  [[ -n "${runtime_tag:-}" ]] || fail "runtime releaseTag could not be parsed"
else
  runtime_tag=""
fi

grep -q "${release_value}" "${phase_file}" || fail "phase file does not match current release value"
[[ "${validation_value}" =~ ^(ready|complete|in-progress|blocked)$ ]] || fail "unexpected current phase status value: ${validation_value}"

if [[ -n "${runtime_tag}" && "${runtime_tag}" != "${release_value}" ]]; then
  fail "runtime releaseTag (${runtime_tag}) does not match current phase release (${release_value})"
fi

if [[ "${pkg_version}" != "${release_value#v}" ]]; then
  fail "package.json version (${pkg_version}) does not match current phase release (${release_value})"
fi

pass "workflow invariants look consistent"
