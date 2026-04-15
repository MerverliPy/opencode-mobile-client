# Current Phase

Status: complete
Release: v1.6.0
Phase file: backlog:clean-install-reproducibility

## Goal

Restore deterministic clean installs so `npm ci` works from a clean checkout and the repo's setup and validation workflow can be trusted again.

## Why this phase is next

The previously active phase is complete, all listed release phases in `docs/releases/phase-registry.md` are already complete, and the next selectable backlog item is `clean-install-reproducibility`. It has the highest priority in `candidates`, stays within a small tooling scope, and has a clear validation path.

## Primary files

- `package-lock.json`
- `package.json`
- `scripts/dev/repair-lockfile.sh`

## Expected max files changed

3

## Risk

Medium. Dependency and lockfile changes can affect setup, validation, and local workflow behavior if the repair is broader than intended.

## Rollback note

Revert the lockfile and related tooling changes together so the repository returns to its prior dependency and setup state.

## In scope

- restore a clean-checkout path where `npm ci` succeeds without manual lockfile repair
- keep the fix bounded to the listed tooling and dependency files
- preserve workflow-check and local validation expectations while repairing install determinism

## Out of scope

- product UI or runtime changes
- unrelated dependency upgrades or security refresh work beyond what is required for deterministic installs
- broader workflow refactors or backlog selection changes
- multi-module cleanup outside the install reproducibility issue

## Tasks

- identify the minimal dependency or lockfile mismatch causing `npm ci` to fail in a clean checkout
- update the lockfile and only the necessary supporting package metadata or repair script behavior
- verify the clean-install path and local validation command succeed without manual intervention

## Validation command

`npm ci --ignore-scripts && npm run validate:local`

## Validation

Status: PASS

Evidence:
- `npm run workflow:check` passed.
- The required validation command `npm ci --ignore-scripts && npm run validate:local` passed.
- `scripts/dev/repair-lockfile.sh` now regenerates drift with `npm install --package-lock-only --ignore-scripts` and re-verifies with `npm ci --ignore-scripts`, keeping repair bounded to install metadata.
- Current implementation changes are limited to `scripts/dev/repair-lockfile.sh` plus this validation update; no out-of-scope product or runtime files were changed.
- Acceptance criteria are met: a clean install succeeds without manual repair, workflow-check remains green, and no unrelated dependency or source changes were introduced.

Blockers:
- none

Ready to ship:
- yes

## Acceptance criteria

- a clean checkout can run `npm ci` without manual repair steps
- the lockfile stays in sync with `package.json` and workflow-check remains green
- no unrelated dependency or source changes are introduced

## Release notes

- Kept lockfile repair scoped to package-lock metadata regeneration instead of a full install rewrite.
- Re-verified clean installs with `--ignore-scripts` to match the phase validation path.

## Completion summary

- Updated `scripts/dev/repair-lockfile.sh` so drift repair regenerates only `package-lock.json` metadata and then verifies with `npm ci --ignore-scripts`.
- Confirmed `npm run workflow:check` and `npm ci --ignore-scripts && npm run validate:local` pass with no product or runtime changes.
