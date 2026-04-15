# Current Phase

Status: complete
Release: v1.6.0
Phase file: backlog:phase-validation-status-normalization

## Goal

Normalize new phase generation so freshly selected phases start with `Validation` status `pending`, matching workflow-check expectations without manual edits.

## Why this phase is next

The previously active backlog phase is complete, all listed release phases are already complete, and the only remaining selectable backlog candidate is `phase-validation-status-normalization`. It is the highest-priority remaining candidate, stays within the workflow module, has a small bounded scope, and has a clear validation path.

## Primary files

- `.opencode/commands/next-phase.md`
- `.opencode/plans/current-phase.md`
- `scripts/dev/workflow-check.sh`

## Expected max files changed

3

## Risk

Low. This phase is limited to workflow template and validation behavior, but mistakes could create mismatched phase-state expectations or weaken validation guarantees.

## Rollback note

Revert the phase template and workflow-check changes so phase generation returns to the prior behavior, then restore the previous current-phase template state if needed.

## In scope

- update phase-generation workflow so new phases write `Validation` status as `pending`
- keep workflow-check strict about accepted validation states
- align generated phase content with documented workflow expectations
- limit changes to the bounded workflow files required for this normalization

## Out of scope

- product UI, runtime, or release metadata changes
- unrelated workflow refactors
- backlog selection logic changes beyond the validation-status normalization needed here
- expanding this task into generic multi-module workflow cleanup

## Tasks

- update the next-phase workflow template to emit `Status: pending` in the `Validation` section for new phases
- update any supporting workflow checks so newly selected phases pass strict validation without manual editing
- confirm no workflow command still emits `Status: not run` for new phases
- verify the required validation command succeeds

## Validation command

`npm run workflow:check && npm run repo:doctor`

## Validation

Status: PASS

Evidence:
- `npm run workflow:check` passed, and the required validation command `npm run workflow:check && npm run repo:doctor` passed.
- `.opencode/commands/next-phase.md` now explicitly requires newly generated backlog phases to write `## Validation` with `Status: pending` and `Evidence: - not run yet`.
- `.opencode/commands/next-phase.md` also requires copied release phases to normalize their `## Validation` section to `Status: pending`, covering release-phase selection without manual edits.
- `scripts/dev/workflow-check.sh` remains strict and accepts only `pending`, `PASS`, or `FAIL`; no workflow command file under `.opencode/commands/` emits `Status: not run` for new phases.

Blockers:
- none

Ready to ship:
- yes

## Acceptance criteria

- next-phase creates backlog or release phases with Validation status set to `pending`
- workflow-check remains strict and does not require manual edits after phase selection
- no workflow command emits `Status: not run` for new phases
- no unrelated workflow or product changes are introduced

## Release notes

- Normalized new phase templates so freshly selected phases start `## Validation` at `Status: pending`.
- Normalized copied release phases to the same pending validation state to avoid manual status edits.

## Completion summary

- Updated `.opencode/commands/next-phase.md` so backlog-generated phases write `Status: pending` with initial validation evidence and copied release phases normalize their validation status the same way.
- Confirmed `npm run workflow:check && npm run repo:doctor` passes with strict validation-state enforcement unchanged.
