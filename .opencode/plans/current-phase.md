# Refresh Vite and related lockfile entries to reduce known development-server advisories

Status: complete
Release: v1.6.0
Phase file: backlog:vite-security-refresh

## Goal

Refresh the Vite-related dependency set to reduce or remove the currently reported development-server advisories while keeping local validation and preview workflows working.

## Why this phase is next

All listed release phases are complete, the previous backlog phase is complete, and this is the highest-priority remaining bounded backlog candidate with single-module tooling scope and clear validation.

## Primary files

- `package.json`
- `package-lock.json`
- `vite.config.js`
- `README.md`

## Expected max files changed

4

## Risk

Low to medium. Dependency refresh work can introduce tooling or preview compatibility regressions if versions drift beyond current repo assumptions.

## Rollback note

Revert the Vite-related dependency, lockfile, config, and documentation changes if the refresh regresses validation or preview behavior.

## In scope

- refresh Vite and related lockfile entries
- make only the minimal compatibility updates needed for the refresh
- document any unavoidable advisory tradeoff honestly in `README.md`
- validate the refresh with audit and local repo checks

## Out of scope

- unrelated product or UI changes
- broad tooling upgrades outside the Vite-related dependency set
- refactors unrelated to dependency compatibility
- multi-module backlog work or future remote-runtime features

## Tasks

- inspect the current Vite-related advisory surface
- update the chosen Vite-related dependency set and lockfile entries
- make any minimal compatibility adjustment required in `vite.config.js`
- document any unavoidable advisory tradeoff in `README.md` if needed
- run the phase validation command and record the result

## Validation command

`npm audit --json && npm run validate:local`

## Validation

Status: PASS
Evidence:
- `npm run workflow:check` passed on 2026-04-16 before and during phase validation.
- `npm audit --json` reported 0 vulnerabilities after upgrading `vite` to `^6.4.2` and refreshing the lockfile to patched `esbuild` transitive entries.
- `npm run validate:local` passed on 2026-04-16, including workflow check, lint, tests, and production build.
- `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort` started successfully at `http://127.0.0.1:4173/`, confirming preview-oriented workflow compatibility.
Blockers:
- none
Ready to ship:
- no

## Acceptance criteria

- The chosen Vite-related dependency set reduces or removes the currently reported moderate advisories.
- Local validation and preview-oriented workflow commands still work after the refresh.
- Any unavoidable advisory tradeoff is documented honestly in `README.md`.
- The phase stays bounded to dependency and compatibility updates.

## Release notes

- Upgraded the repo to `vite@^6.4.2` and refreshed the lockfile to pull in patched transitive build tooling.
- Cleared the previously reported moderate Vite and esbuild development-server advisories without changing product behavior.

## Completion summary

- Upgraded `vite` from `^5.4.19` to `^6.4.2` and refreshed the lockfile to remove the reported moderate advisories.
- Kept the phase bounded to dependency and compatibility work without product or UI changes.
- Confirmed workflow, lint, test, build, audit, and preview startup behavior remain healthy.
- Archived the shipped backlog candidate and recorded the shipped phase in the registry.
