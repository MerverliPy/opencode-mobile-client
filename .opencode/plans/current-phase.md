# Harden browser-proof bootstrap and doctor alignment so Playwright remediation is deterministic on clean machines

Status: complete
Release: v1.7.2
Phase file: backlog:browser-proof-playwright-bootstrap

## Goal
Make the repo-owned browser-proof flow fail with one deterministic remediation path on clean machines and keep doctor output aligned with the real helper behavior.

## Why this phase is next
- The current shipped release baseline remains `v1.7.2`.
- Browser-proof is still a release-critical surface and is the highest-priority selectable follow-up under `.opencode/backlog/candidates.yaml`.
- This phase is bounded to browser-proof bootstrap and doctor alignment and does not reopen already shipped browser-proof runner work more broadly.

## Primary files
- scripts/dev/browser-smoke.sh
- scripts/dev/doctor.sh
- .opencode/commands/browser-smoke.md

## Expected max files changed
3

## Risk
Medium. Browser-proof helpers are release-facing workflow surfaces, so incorrect remediation guidance can create false failures or false confidence.

## Rollback note
Revert browser-smoke bootstrap messaging, doctor alignment, and command guidance together if the helper flow becomes less deterministic or less truthful.

## In scope
- make `scripts/dev/browser-smoke.sh` emit one deterministic remediation path when Playwright browser binaries are missing
- align `scripts/dev/doctor.sh` with the actual browser-proof prerequisite story
- align `.opencode/commands/browser-smoke.md` with the repo-owned helper behavior only

## Out of scope
- screenshot freshness policy
- CI expansion
- release metadata redesign
- unrelated shell or runtime changes

## Tasks
- tighten missing-Playwright remediation behavior in the repo-owned browser-smoke helper
- make doctor output reflect browser-proof readiness truthfully
- update browser-smoke command guidance so it matches the actual helper path exactly

## Validation command
npm run workflow:check && npm run repo:doctor && npm run browser:smoke && npm run release:proof

## Validation
Status: PASS
Evidence:
- `npm run workflow:check` passed.
- Required validation flow passed in the installed environment: `npm run repo:doctor`, `npm run browser:smoke`, and `npm run release:proof`; `release:proof` returned `READY_TO_SHIP` and confirmed all standard screenshots.
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/... npm run repo:doctor` reported the same WebKit remediation the helper expects: `Run \`npx playwright install webkit\` from repo root before \`npm run browser:smoke\`.`
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/... npm run browser:smoke` failed before capture with the deterministic remediation path: `Playwright WebKit runtime is missing. Run \`npx playwright install webkit\` from repo root, then retry \`npm run browser:smoke\`.`
- `.opencode/commands/browser-smoke.md` now matches the repo-owned helper path, and browser-proof capture completed successfully through the repo flow.
Hard blockers:
- none
Optional follow-ups:
- none
Ready to ship:
- yes

## Acceptance criteria
- `npm run browser:smoke` fails with one deterministic remediation path when Playwright browser binaries are missing.
- `npm run repo:doctor` reports browser-proof readiness in language that matches the actual helper behavior.
- `.opencode/commands/browser-smoke.md` matches the repo-owned helper exactly.
- The phase does not widen into CI redesign, screenshot freshness policy, or unrelated shell work.

## Release notes
- Browser-proof now fails before capture with one explicit `npx playwright install webkit` remediation path when the Playwright WebKit runtime is missing.
- Doctor and browser-smoke command guidance now report the same repo-root Playwright prerequisite story.

## Completion summary
- Added a Playwright WebKit readiness check to `browser:smoke` so missing runtimes fail early with one deterministic remediation path.
- Aligned `repo:doctor`, browser-smoke command guidance, and archived backlog phase metadata with the shipped browser-proof flow.
