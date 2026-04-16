# Add durable remote run lifecycle states and reconnect controls to the mobile shell

Status: complete
Release: v1.6.0
Phase file: backlog:remote-run-shell-state

## Goal

Add honest mobile-shell surfaces for durable remote run lifecycle state so iPhone users can understand, reconnect to, and control long-lived remote work without pretending the phone is the executor.

## Why this phase is next

The previous active phase is complete, all listed release phases in `docs/releases/phase-registry.md` are already complete, and backlog selection now applies. There is no explicit user-scoped candidate, so deterministic backlog ordering selects `remote-run-shell-state` first because it has the highest priority, stays in the same `remote-runtime` module as the completed follow-up, fits the bounded five-file scope, and has clear validation.

## Primary files

- `package.json`
- `README.md`
- `src/main.js`
- `src/ui/screens.js`
- `tests/quality-gates.smoke.test.js`

## Expected max files changed

5

## Risk

Medium. Remote run state UI can easily drift into implying backend capability that does not exist yet or regress honest local/mock session behavior if scope is not kept tight.

## Rollback note

Revert the mobile shell lifecycle-state surfaces, reconnect controls, smoke coverage, and release-target metadata together so the app returns to the current shipped local/mock baseline.

## In scope

- render durable remote run lifecycle states for queued, running, awaiting input, failed, cancelled, and completed runs
- add visible reconnect and cancel controls in the mobile shell for remote-backed sessions
- keep existing local/mock sessions rendering honestly when no remote run exists
- update `package.json` and `README.md` for the planned `v1.8.0` target without misrepresenting the current shipped baseline

## Out of scope

- implementing the first real backend HTTP bridge or any real remote execution
- adding repo, branch, or workspace binding UI beyond what already exists
- preview/share surfaces, voice input, or other later backlog candidates
- unrelated tooling, workflow, or multi-module refactors

## Tasks

- add bounded shell-state rendering for durable remote lifecycle statuses
- expose deterministic reconnect and cancel actions for remote sessions
- update planned release metadata and smoke coverage while preserving honest local/mock behavior

## Validation command

`npm run workflow:check && npm run test && npm run build`

## Validation

Status: PASS

Evidence:
- `npm run workflow:check` passed before phase validation.
- The required validation command `npm run workflow:check && npm run test && npm run build` passed.
- `src/ui/screens.js` now renders bounded durable remote run states for queued, running, awaiting input, failed, cancelled, and completed remote shell sessions, with visible reconnect and cancel controls.
- `src/main.js` now keeps remote shell actions honest by updating stored remote lifecycle state and showing clear notices without claiming live backend transport.
- Existing local/mock sessions still render as local-only sessions when no remote run exists, and smoke coverage verifies both remote and local task-shell behavior.
- `package.json` and `README.md` now target the planned `v1.8.0` follow-up while preserving the shipped `v1.6.0` baseline.

Blockers:
- none

Ready to ship:
- yes

## Acceptance criteria

- the task surface can render durable remote run states without pretending the phone is the executor
- reconnect and cancel actions are visible and deterministic from the mobile shell
- existing local/mock sessions still render honestly when no remote run exists
- `package.json` and `README.md` are updated to target `v1.8.0`

## Release notes

- Added durable remote run lifecycle state surfaces to the mobile shell with honest reconnect and cancel controls.
- Preserved truthful local/mock session behavior while introducing bounded remote-backed session state for mobile follow-up work.

## Completion summary

- Added bounded remote run lifecycle state rendering to the task shell with reconnect and cancel controls for remote-backed sessions.
- Kept local/mock sessions honest while adding a small remote shell session entry path and shell-only lifecycle updates that do not imply live backend execution.
- Updated smoke coverage plus planned release metadata in `package.json` and `README.md` for the `v1.8.0` target.
