#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
ARTIFACT_DIR="$REPO_ROOT/playwright-artifacts"
REQUIRED_ARTIFACTS=(
  "sessions-screen.png"
  "task-screen.png"
  "tool-drawer.png"
  "offline-baseline.png"
  "offline-state.png"
  "offline-recovered.png"
)

print_usage() {
  printf '%s\n' "Usage: bash scripts/dev/release-proof.sh"
  printf '%s\n' ""
  printf '%s\n' "Runs local validation, checks the standard browser-proof artifacts,"
  printf '%s\n' "and reports whether release proof is complete from repo root."
}

if [ "$#" -gt 0 ]; then
  case "$1" in
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
fi

mkdir -p "$ARTIFACT_DIR"

printf '%s\n' "==> Running local validation"
npm --prefix "$REPO_ROOT" run validate:local

missing_artifacts=()

for artifact in "${REQUIRED_ARTIFACTS[@]}"; do
  if [ ! -f "$ARTIFACT_DIR/$artifact" ]; then
    missing_artifacts+=("$artifact")
  fi
done

printf '\n%s\n' "==> Release proof summary"
printf '%s\n' "Artifacts directory: $ARTIFACT_DIR"

if [ "${#missing_artifacts[@]}" -gt 0 ]; then
  printf '%s\n' "Status: NOT_READY_TO_SHIP"
  printf '%s\n' "Missing artifacts:"
  for artifact in "${missing_artifacts[@]}"; do
    printf '  - %s\n' "$artifact"
  done
  printf '\n%s\n' "Next steps:"
  printf '%s\n' "  - Run npm run browser:smoke for route and drawer browser proof"
  printf '%s\n' "  - Run /browser-offline for offline and recovery proof"
  printf '%s\n' "  - Re-run npm run release:proof"
  exit 1
fi

printf '%s\n' "Status: READY_TO_SHIP"
printf '%s\n' "Artifacts confirmed:"
for artifact in "${REQUIRED_ARTIFACTS[@]}"; do
  printf '  - %s\n' "$artifact"
done
