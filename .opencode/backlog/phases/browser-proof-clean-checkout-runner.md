# Restore clean-checkout browser proof with repo-owned Playwright resolution

Status: pending
Release: v1.7.0
Phase file: backlog:browser-proof-clean-checkout-runner

## Goal
Make `npm run browser:smoke` reproducible from a clean checkout by removing the hidden `.opencode/node_modules` Playwright dependency path.

## Why this phase is next
The repo cannot currently reproduce its own browser-proof path from a clean checkout. That blocks truthful release proof.

## Primary files
- scripts/dev/browser-smoke.sh
- package.json
- package-lock.json
- opencode.json

## Expected max files changed
4

## Risk
Moderate. The phase touches the browser-proof runner and dependency ownership, but stays bounded to the validation surface.

## Rollback note
Revert the four phase files together if the repaired runner causes broader validation regressions.

## In scope
- replace the hidden Playwright module path with repo-owned dependency or config resolution
- add a clear actionable preflight failure if browser tooling still needs bootstrap work
- keep artifact names and repo-root commands stable

## Out of scope
- broad Playwright test suites
- unrelated UI refactors
- backend or auth work
- changing the screenshot set

## Tasks
- make `scripts/dev/browser-smoke.sh` resolve browser tooling from a repo-owned path
- update manifest ownership in `package.json` and `package-lock.json`
- align `opencode.json` only as needed so runner ownership is truthful
- preserve the existing six screenshot artifacts and release-proof flow

## Validation command
npm run browser:smoke && npm run release:proof

## Validation
Status: pending
Evidence:
- not run yet
Blockers:
- not validated yet
Ready to ship:
- no

## Acceptance criteria
- `npm run browser:smoke` no longer imports Playwright from hidden tool-managed paths
- the runner uses repo-owned dependency or config resolution, or exits with a clear actionable bootstrap failure message
- running `npm run browser:smoke` writes the six standard screenshot artifacts to `playwright-artifacts/`
- `npm run release:proof` passes immediately after a successful browser smoke run

## Completion summary
pending
