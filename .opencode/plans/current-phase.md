# Extract bounded shell helpers from src/main.js to reduce maintenance risk

Status: complete
Release: v1.6.0
Phase file: backlog:main-shell-helper-extraction

## Goal

Extract a bounded set of pure shell helpers from `src/main.js` so the file becomes safer to review and maintain without changing current shell behavior.

## Why this phase is next

The session-state normalization backlog phase has shipped, all listed release phases remain complete, and this is the next highest-priority bounded candidate with clear validation and smaller scope than broader remote-runtime work.

## Primary files

- `src/main.js`
- `src/lib/remote-links.js`
- `src/lib/ui-notices.js`
- `tests/quality-gates.smoke.test.js`

## Expected max files changed

4

## Risk

Medium. Extracting helpers from the main shell can accidentally change wiring or state behavior if the work expands beyond pure helper boundaries.

## Rollback note

Revert the helper extraction if shell behavior, remote link validation, or UI notice messaging changes unexpectedly.

## In scope

- move a bounded set of pure helpers out of `src/main.js`
- keep remote link validation behavior honest and unchanged
- keep UI notice behavior intact while improving maintainability
- update smoke coverage only as needed for the bounded extraction

## Out of scope

- broad shell redesign or architecture changes
- product behavior changes beyond preserving current helper behavior
- unrelated state, remote-runtime, or release metadata work
- multi-module follow-up work outside the listed files

## Tasks

- identify the smallest pure helper set in `src/main.js` suitable for extraction
- extract remote link and/or UI notice helpers into bounded modules
- update `src/main.js` call sites without widening scope
- confirm smoke coverage still protects the extracted behavior
- run the phase validation command and record the result

## Validation command

`npm run workflow:check && npm run test && npm run build`

## Validation

Status: PASS
Evidence:
- `npm run workflow:check` passed on 2026-04-16.
- The stated validation command `npm run workflow:check && npm run test && npm run build` passed on 2026-04-16.
- `src/main.js` now delegates bounded remote-link and UI-notice helpers to `src/lib/remote-links.js` and `src/lib/ui-notices.js` without widening scope beyond the listed phase files.
- `tests/quality-gates.smoke.test.js` adds focused coverage for extracted helper behavior, keeping remote-link validation and notice messaging honest.
Blockers:
- none
Ready to ship:
- no

## Acceptance criteria

- A bounded set of pure helpers moves out of `src/main.js` without changing current shell behavior.
- Remote link validation and UI notice behavior remain honest and covered by smoke tests.
- The phase avoids speculative architecture changes or broader shell refactors.
- The resulting extraction keeps the task shell readable and mobile-safe.

## Release notes

- Extracted remote-link normalization helpers from `src/main.js` into `src/lib/remote-links.js`.
- Extracted UI-notice creation helpers into `src/lib/ui-notices.js` without changing shell behavior.

## Completion summary

- Updated `src/main.js` to use the bounded helper modules while preserving current shell behavior.
- Added focused smoke coverage for remote-link normalization and UI-notice helper behavior.
- Archived the shipped backlog candidate and recorded the shipped phase in the release registry.
