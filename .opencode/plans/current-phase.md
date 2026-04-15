# Current Phase

Status: complete
Release: v1.6.0
Phase file: backlog:backlog-lifecycle-gating

## Goal

Treat `Phase file: backlog:<id>` as a virtual backlog reference in workflow validation and repo diagnostics so backlog phases no longer require fake repo-root shim files.

## Why this phase is next

The previous backlog phase failed because `workflow:check` only accepted real filesystem paths, which forced an out-of-scope shim file. You explicitly changed scope to fix backlog-phase validation behavior, all release phases are already complete, and the smallest matching backlog candidate is the workflow-focused `backlog-lifecycle-gating` follow-up.

## Primary files

- `scripts/dev/workflow-check.sh`
- `scripts/dev/doctor.sh`
- `backlog:browser-proof-runner`

## Expected max files changed

3

## Risk

Low. This phase is limited to workflow validation and diagnostic handling for backlog phase references, but a mistake could loosen release-phase checks if the virtual backlog path handling is too broad.

## Rollback note

If this phase causes workflow validation drift, restore strict path checking for release phase files and revisit backlog reference handling with a narrower parser.

## In scope

- update `workflow:check` so `Phase file: backlog:<id>` is treated as a virtual backlog reference rather than a required real file path
- update `repo:doctor` so it reports backlog phase references correctly without expecting a real file at that path
- remove the fake repo-root `backlog:browser-proof-runner` shim file if it exists
- preserve existing release-phase path validation for real `docs/releases/...` phase files

## Out of scope

- redoing or expanding the browser helper scripts
- changing the current shipped release metadata
- redesigning backlog selection behavior beyond this validation fix
- unrelated workflow command refactors
- product code changes

## Tasks

- detect backlog-style `Phase file:` values in `scripts/dev/workflow-check.sh`
- validate backlog references against backlog metadata rather than filesystem path existence
- update `scripts/dev/doctor.sh` to display backlog references as virtual phase targets
- delete the fake `backlog:browser-proof-runner` file if present
- verify both workflow validation and repo diagnostics succeed with the backlog reference format

## Validation command

`npm run workflow:check && npm run repo:doctor`

## Validation

Status: PASS

Evidence:
- `npm run workflow:check` passed with `Phase file: backlog:backlog-lifecycle-gating`.
- The stated validation command `npm run workflow:check && npm run repo:doctor` passed, and `repo:doctor` reported the backlog phase reference as a virtual backlog reference.
- `scripts/dev/workflow-check.sh` now validates backlog phase references against `.opencode/backlog/candidates.yaml` while preserving real file checks for non-backlog phase files.
- `scripts/dev/doctor.sh` now reports backlog phase references without requiring a repo-root shim file.
- The fake repo-root `backlog:browser-proof-runner` file is no longer present.
- The active change set is limited to `.opencode/plans/current-phase.md`, `scripts/dev/workflow-check.sh`, and `scripts/dev/doctor.sh`, so no browser helper scripts were changed in this phase.

Blockers:
- none

Ready to ship:
- yes

## Acceptance criteria

- `npm run workflow:check` passes when `.opencode/plans/current-phase.md` uses `Phase file: backlog:<id>`
- `npm run repo:doctor` reports the backlog phase reference without requiring a real repo-root file at that path
- `backlog:browser-proof-runner` is removed if present
- real release phase files still require valid filesystem paths
- no browser helper scripts are changed in this phase

## Release notes

- Treated `Phase file: backlog:<id>` as a virtual backlog reference in `workflow:check` and `repo:doctor`.
- Removed the need for repo-root backlog shim files during backlog-phase validation.

## Completion summary

- Backlog lifecycle gating now validates backlog phase references against backlog metadata and reports them cleanly in repo diagnostics while preserving strict file-path checks for real release phase files.
