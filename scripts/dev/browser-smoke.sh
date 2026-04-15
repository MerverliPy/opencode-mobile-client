#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
ARTIFACT_DIR="$REPO_ROOT/playwright-artifacts"

print_usage() {
  printf '%s\n' "Usage: bash scripts/dev/browser-smoke.sh [--start-preview]"
  printf '%s\n' ""
  printf '%s\n' "Runs local validation, prepares browser artifacts output, and"
  printf '%s\n' "prints the repo-root browser smoke steps for Playwright MCP."
}

START_PREVIEW=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --start-preview)
      START_PREVIEW=1
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      printf 'Unknown argument: %s\n\n' "$1" >&2
      print_usage >&2
      exit 1
      ;;
  esac
  shift
done

mkdir -p "$ARTIFACT_DIR"

printf '%s\n' "==> Running local validation"
npm --prefix "$REPO_ROOT" run validate:local

printf '\n%s\n' "==> Browser smoke prep complete"
printf '%s\n' "Artifacts directory: $ARTIFACT_DIR"
printf '%s\n' "Required screenshot targets:"
printf '%s\n' "  - sessions-screen.png"
printf '%s\n' "  - task-screen.png"
printf '%s\n' "  - tool-drawer.png"
printf '\n%s\n' "Next steps:"
printf '%s\n' "  1. Start preview with: npm run preview:host"
printf '%s\n' "  2. Use Playwright MCP against:"
printf '%s\n' "     - http://127.0.0.1:4173/#sessions"
printf '%s\n' "     - http://127.0.0.1:4173/#task"
printf '%s\n' "  3. Save the required screenshots into playwright-artifacts/"

if [ "$START_PREVIEW" -eq 1 ]; then
  printf '\n%s\n' "==> Starting preview server"
  exec npm --prefix "$REPO_ROOT" run preview:host
fi
