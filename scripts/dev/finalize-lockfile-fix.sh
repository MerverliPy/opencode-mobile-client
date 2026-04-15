#!/usr/bin/env bash
set -euo pipefail

commit_message="fix(build): regenerate package lock for clean installs"

echo "==> Verifying repo root"
[[ -f package.json ]] || { echo "Missing package.json"; exit 1; }
[[ -f package-lock.json ]] || { echo "Missing package-lock.json"; exit 1; }
[[ -d .git ]] || { echo "Missing .git directory"; exit 1; }

echo "==> Checking for unrelated staged changes"
if ! git diff --cached --quiet; then
  echo "You have staged changes already. Commit or unstage them before running this script."
  exit 1
fi

echo "==> Repairing lockfile from package.json"
rm -rf node_modules
npm install

echo "==> Verifying clean install reproducibility"
rm -rf node_modules
npm ci

echo "==> Running repo validation"
npm run repo:doctor
npm run workflow:check
npm run lint
npm run test
npm run build

echo "==> Checking whether package-lock.json changed"
if git diff --quiet -- package-lock.json; then
  echo "No package-lock.json changes detected."
  echo "Validation passed. Nothing to commit for the lockfile."
  exit 0
fi

echo "==> Creating commit for repaired lockfile"
git add package-lock.json
git commit -m "$commit_message"

echo
echo "Done."
echo "Next:"
echo "  git push origin HEAD"
