#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if npm ci --ignore-scripts --dry-run >/dev/null 2>&1; then
  echo "repair-lockfile: no lockfile drift detected"
  exit 0
fi

echo "repair-lockfile: package-lock drift detected; regenerating lockfile"
rm -rf node_modules
npm install
npm ci
echo "repair-lockfile: lockfile regenerated and clean install verified"
