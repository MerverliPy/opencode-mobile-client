# Current Phase

Status: pending
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

Status: pending

Evidence:
- not run yet

## Acceptance criteria

- a clean checkout can run `npm ci` without manual repair steps
- the lockfile stays in sync with `package.json` and workflow-check remains green
- no unrelated dependency or source changes are introduced

## Completion summary

- not started
