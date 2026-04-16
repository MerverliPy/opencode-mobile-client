# Normalize workflow validation metadata so phase state parses consistently

Status: complete
Release: v1.6.0
Phase file: backlog:workflow-validation-metadata-alignment

## Goal

Normalize active-phase validation metadata so the workflow parsers agree on one authoritative phase state without changing product behavior.

## Why this phase is next

This backlog candidate remains the active incomplete phase. All release phases in the registry are already complete, and the current phase is neither completed nor explicitly replaced by new user scope, so it must stay selected.

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

Status: PASS
Evidence:
- `npm run workflow:check` passed on 2026-04-16.
- `npm run repo:doctor` passed on 2026-04-16 and reported `Validation status: pending` from the active phase file before validation finalization.
- `bash scripts/dev/autoflow.sh inspect` reported non-empty `VALIDATION_STATUS=pending` and `READY_TO_SHIP=no`, confirming the parser reads the canonical validation block shape.
Blockers:
- none
Ready to ship:
- no

## Acceptance criteria

- The canonical active-phase validation keys are consistent across phase templates and workflow parsers.
- `npm run workflow:check` and `npm run repo:doctor` both read the active validation status correctly.
- `bash scripts/dev/autoflow.sh inspect` reports a non-empty validation status and ready-to-ship value when present.
- The phase stays bounded to workflow metadata and parser alignment only.

## Release notes

- Confirmed the active workflow surfaces already share one canonical validation metadata shape.
- Recorded authoritative PASS evidence for workflow parsing without changing product behavior.

## Completion summary

- Verified that `.opencode/commands/next-phase.md`, `scripts/dev/workflow-check.sh`, `scripts/dev/doctor.sh`, and `scripts/dev/autoflow.sh` already use the same canonical validation block shape.
- Confirmed the phase validation command passes without product-code changes.
- Archived the shipped backlog candidate and recorded the shipped phase in the registry.
