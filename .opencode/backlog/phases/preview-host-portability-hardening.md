# Remove machine-specific preview host assumptions from phone testing

Status: pending
Release: v1.7.0
Phase file: backlog:preview-host-portability-hardening

## Goal
Make phone preview access portable across environments by removing machine-specific host assumptions from the Vite preview configuration.

## Why this phase is next
The current preview host path is tied to one machine-specific allowance, which is unnecessary operational friction for phone testing.

## Primary files
- vite.config.js
- README.md

## Expected max files changed
2

## Risk
Low. This is bounded to preview-host configuration and operator documentation.

## Rollback note
Revert both files together if the change weakens safe default local behavior.

## In scope
- replace machine-specific preview host assumptions with explicit configurable behavior
- preserve localhost and `127.0.0.1` behavior
- document the operator path for alternate phone-testing hosts

## Out of scope
- app UI changes
- dependency updates
- release-truth edits
- remote runtime work

## Tasks
- harden `vite.config.js` so alternate hosts are opt-in instead of hard-coded per machine
- document the supported operator configuration in `README.md`

## Validation command
npm run validate:local && npm run preview:host

## Validation
Status: pending
Evidence:
- not run yet
Blockers:
- not validated yet
Ready to ship:
- no

## Acceptance criteria
- preview host configuration no longer depends on one machine-specific hostname
- localhost and `127.0.0.1` preview behavior remain unchanged
- alternate phone-testing hosts can be enabled through explicit configuration rather than source edits per machine
- the phase stays bounded to preview-host portability and documentation only

## Completion summary
pending
