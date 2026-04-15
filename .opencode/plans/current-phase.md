# Current Phase

Status: complete
Release: v1.6.0
Phase file: backlog:browser-proof-runner

## Goal

Add repo-root browser-proof and release-proof helper entry points so SSH/iPhone workflows have one repeatable way to run preview proof and release proof tasks.

## Why this phase is next

All implementation release phases are already complete. Using the registry as the workflow authority, the previously active backlog item is complete, so the next still-needed backlog candidate is `browser-proof-runner`: its `done_when` conditions are not satisfied, it has the highest remaining backlog priority, and its validation path is explicit.

## Primary files

- `package.json`
- `scripts/dev/browser-smoke.sh`
- `scripts/dev/release-proof.sh`
- `.opencode/commands/browser-smoke.md`
- `.opencode/commands/release-proof.md`

## Expected max files changed

4

## Risk

Low to medium. This phase is workflow-facing rather than product-facing, but mistakes could create misleading command entry points or artifact paths for browser and release proof flows.

## Rollback note

If the new helper entry points prove confusing or unstable, remove the added npm scripts and helper wrappers and revert the command docs to the previous manual flow.

## In scope

- add a repo-root browser smoke helper script
- add a repo-root release proof helper script
- add matching npm script entry points in `package.json`
- update browser and release proof command docs to reference the repo-root helpers consistently
- keep proof artifacts directed to `playwright-artifacts/`

## Out of scope

- product UI or runtime behavior changes
- expanding browser coverage beyond the helper entry points needed for the documented SSH/iPhone workflow
- changing shipped release metadata
- unrelated workflow refactors

## Tasks

- add `scripts/dev/browser-smoke.sh`
- add `scripts/dev/release-proof.sh`
- wire `browser:smoke` and `release:proof` npm scripts in `package.json`
- update `.opencode/commands/browser-smoke.md` to reference the repo-root helper
- update `.opencode/commands/release-proof.md` to reference the repo-root helper
- verify the local validation command succeeds

## Validation command

`npm run validate:local`

## Validation

Status: PASS

Evidence:
- `npm run workflow:check` passed.
- The required validation command `npm run validate:local` passed (workflow check, lint, test, and build all succeeded).
- `npm run browser:smoke` ran from repo root, created/targeted `playwright-artifacts/`, and clearly orchestrated the browser smoke flow.
- `npm run release:proof` ran from repo root and returned `Status: READY_TO_SHIP` with the required browser artifacts confirmed in `playwright-artifacts/`.
- The changed implementation stays within the active phase scope: `package.json`, the two repo-root helper scripts, and the two command docs.

Blockers:
- none

Ready to ship:
- yes

## Acceptance criteria

- `npm run browser:smoke` exists and runs or clearly orchestrates the repo-root browser smoke flow
- `npm run release:proof` exists and runs or clearly orchestrates the repo-root release proof flow
- both helper scripts work from repo root
- browser-proof artifacts are written into `playwright-artifacts/`
- command docs reference the new helper entry points consistently

## Release notes

- Added repo-root `browser:smoke` and `release:proof` helper entry points for repeatable SSH/iPhone proof flows.
- Standardized command docs and proof artifact output under `playwright-artifacts/`.

## Completion summary

- Added repo-root browser smoke and release proof helper scripts, wired matching npm scripts, and updated the command docs to use the new entry points consistently.
- Validation passed through `npm run workflow:check`, `npm run validate:local`, `npm run browser:smoke`, and `npm run release:proof` with the expected artifacts present in `playwright-artifacts/`.
