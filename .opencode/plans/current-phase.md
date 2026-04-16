# Normalize workflow validation metadata so phase state parses consistently

Status: pending
Release: v1.6.0
Phase file: backlog:workflow-validation-metadata-alignment

## Goal

Normalize active-phase validation metadata so the workflow parsers agree on one authoritative phase state without changing product behavior.

## Why this phase is next

All listed release phases are already complete. The user scoped this planning pass to the full audit fix order, and this candidate is the first bounded workflow repair in that order with the highest priority, smallest safe scope, and clearest deterministic validation.

## Primary files

- `.opencode/commands/next-phase.md`
- `scripts/dev/workflow-check.sh`
- `scripts/dev/doctor.sh`
- `scripts/dev/autoflow.sh`

## Expected max files changed

4

## Risk

Medium. This work changes authoritative workflow parsing, so the repair must stay tightly bounded and keep all workflow commands reading the same validation shape.

## Rollback note

Revert the parser and template-alignment changes together so workflow metadata generation and workflow-state inspection return to the prior implementation as one unit.

## In scope

- align the canonical validation block shape used by backlog phase templates and workflow parsers
- ensure `npm run workflow:check` and `npm run repo:doctor` read the same validation status keys
- ensure `bash scripts/dev/autoflow.sh inspect` reads validation status and ready-to-ship values consistently when present
- keep the repair bounded to workflow metadata and parser logic only

## Out of scope

- product runtime or UI changes
- backlog archival or selection repairs beyond validation-metadata parsing
- release-proof artifact generation or shipping work
- dependency upgrades or unrelated refactors

## Tasks

- define one canonical validation metadata shape for active-phase files
- align workflow parser scripts and next-phase template instructions with that canonical shape
- confirm pending, PASS, and FAIL validation states remain readable across workflow commands

## Validation command

`npm run workflow:check && npm run repo:doctor && bash scripts/dev/autoflow.sh inspect`

## Validation

Status: pending
Evidence:
- not run yet
Blockers:
- not validated yet
Ready to ship:
- no

## Acceptance criteria

- The canonical active-phase validation keys are consistent across phase templates and workflow parsers.
- `npm run workflow:check` and `npm run repo:doctor` both read the active validation status correctly.
- `bash scripts/dev/autoflow.sh inspect` reports a non-empty validation status and ready-to-ship value when present.
- The phase stays bounded to workflow metadata and parser alignment only.

## Completion summary

- not started
