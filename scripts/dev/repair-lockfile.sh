#!/usr/bin/env bash
set -euo pipefail

echo "Repairing package-lock.json from package.json ..."
rm -rf node_modules
npm install

echo
echo "Verifying clean-install reproducibility ..."
rm -rf node_modules
npm ci

echo
echo "Running local validation ..."
npm run repo:doctor
npm run workflow:check
npm run lint
npm run test
npm run build

echo
echo "Lockfile repair and validation complete."
