#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

allowed_files() {
  python - <<'PY'
from pathlib import Path

path = Path(".opencode/plans/current-phase.md")
lines = path.read_text().splitlines()

in_primary = False
allowed = [".opencode/plans/current-phase.md"]

for line in lines:
    if line.strip() == "## Primary files":
        in_primary = True
        continue
    if in_primary and line.startswith("## "):
        break
    if in_primary and line.lstrip().startswith("- "):
        allowed.append(line.lstrip()[2:].strip("`").strip())

for item in allowed:
    print(item)
PY
}

changed_files() {
  git status --porcelain=v1 | while IFS= read -r raw; do
    [[ -z "$raw" ]] && continue
    path="${raw:3}"
    if [[ "$path" == *" -> "* ]]; then
      path="${path##* -> }"
    fi
    printf '%s\n' "$path"
  done
}

inspect_tree() {
  local allowed changed disallowed
  allowed="$(allowed_files | paste -sd, -)"
  changed="$(changed_files | paste -sd, -)"
  disallowed="$(python - <<'PY'
import subprocess
from pathlib import Path

allowed = set(Path("/tmp/autoflow_allowed.tmp").read_text().splitlines())
proc = subprocess.run(["git", "status", "--porcelain=v1"], capture_output=True, text=True, check=True)

for raw in proc.stdout.splitlines():
    if not raw.strip():
        continue
    path = raw[3:]
    if " -> " in path:
        path = path.split(" -> ", 1)[1]
    if path not in allowed:
        print(path)
PY
)"
  echo "ALLOWED_FILES=$allowed"
  echo "CHANGED_FILES=$changed"
  echo "DISALLOWED_FILES=$(printf '%s' "$disallowed" | paste -sd, -)"
}

stash_unrelated() {
  local ts
  ts="$(date +%Y%m%d%H%M%S)"

  mapfile -t allowed < <(allowed_files)
  if [[ "${#allowed[@]}" -gt 0 ]]; then
    git add -- "${allowed[@]}" 2>/dev/null || true
  fi

  if git diff --quiet && git diff --cached --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
    echo "repair-working-tree: working tree already clean"
    exit 0
  fi

  git stash push --keep-index -u -m "autoflow-unrelated-$ts"
  git stash list -1
}

printf '%s\n' "$(allowed_files)" > /tmp/autoflow_allowed.tmp
trap 'rm -f /tmp/autoflow_allowed.tmp' EXIT

case "${1:-inspect}" in
  inspect)
    inspect_tree
    ;;
  stash-unrelated)
    stash_unrelated
    ;;
  *)
    echo "usage: bash scripts/dev/repair-working-tree.sh [inspect|stash-unrelated]" >&2
    exit 1
    ;;
esac
