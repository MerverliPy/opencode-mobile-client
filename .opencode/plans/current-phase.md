# Guard phase selection against registry-complete backlog ids

Status: pending
Release: v1.7.2
Phase file: backlog:registry-complete-selection-guard-hardening

## Goal
Prevent backlog ids already recorded as complete or shipped in the registry from remaining selectable under `candidates`.

## Why this phase is next
The completed preview-host portability pass has now been shipped, and the next highest-value gap is the workflow guard that still allows registry-complete backlog ids to remain selectable.

## Primary files
- .opencode/backlog/candidates.yaml
- scripts/dev/workflow-check.sh
- scripts/dev/autoflow.sh
- scripts/dev/repair-backlog-selection.sh

## Expected max files changed
4

## Risk
Low. The repair is bounded to workflow-state truth and backlog-selection guards.

## Rollback note
Revert the workflow guard changes together if they block bounded candidate selection or misclassify active backlog items as shipped.

## In scope
- detect registry-complete backlog ids that still remain under selectable `candidates`
- archive registry-complete backlog ids during backlog repair
- make `workflow:check` fail on stale selectable completed backlog state
- keep `/autoflow` aligned with the corrected candidate truth

## Out of scope
- unrelated product code changes
- release baseline changes
- preview-host behavior changes
- browser-proof runner changes outside workflow-state truth

## Tasks
- add a registry cross-check to `scripts/dev/workflow-check.sh`
- extend `scripts/dev/repair-backlog-selection.sh` so registry-complete backlog ids are archived automatically
- update `scripts/dev/autoflow.sh` inspection output so stale completed backlog entries no longer look selectable
- keep the change bounded to workflow-state truth and deterministic backlog selection

## Validation command
npm run workflow:check && bash scripts/dev/autoflow.sh inspect && npm run repo:doctor

## Validation
Status: pending

Evidence:
- not run yet

Blockers:
- not validated yet

Ready to ship:
- no

## Acceptance criteria
- `workflow:check` fails when a registry-complete backlog id remains under selectable `candidates`.
- `scripts/dev/repair-backlog-selection.sh` archives backlog ids already marked complete or shipped in the registry.
- `scripts/dev/autoflow.sh` reports corrected backlog state and does not rely on stale selectable candidates.
- The repair stays bounded to workflow-state truth and backlog-selection guards only.

## Completion summary
Pending.
