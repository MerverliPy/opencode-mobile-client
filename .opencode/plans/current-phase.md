# Define the remote runtime contract and durable run model for mobile remote coding

Status: complete
Release: v1.6.0
Phase file: backlog:remote-runtime-contract

## Goal

Define the first bounded remote-runtime contract so the mobile app can evolve from a mock-backed local shell toward a real remote-coding client without claiming backend capability that does not yet exist.

## Why this phase is next

The previously active phase is complete, all listed release phases in `docs/releases/phase-registry.md` are already complete, and backlog selection now applies. There is no explicit user-scoped candidate. `remote-runtime-contract` is the highest-priority selectable candidate, stays within a single module, remains within the backlog max-files constraint, and is the smallest safe next step with clear validation toward the planned `v1.7.0` follow-up.

## Primary files

- `package.json`
- `README.md`
- `src/adapters/remote-runtime.js`
- `src/state/session-state.js`
- `src/state/storage.js`
- `tests/quality-gates.smoke.test.js`

## Expected max files changed

6

## Risk

Medium. This phase changes shared runtime and session contracts plus release metadata, so drifting beyond contract definition could accidentally imply backend behavior or destabilize existing local sessions.

## Rollback note

Revert the remote-runtime adapter, session-state shape updates, smoke coverage, and release metadata together so the app returns to the current shipped local/mock baseline.

## In scope

- define a `remote-runtime` adapter with explicit methods for start, resume, cancel, fetch status, and fetch preview links
- persist remote run identifiers, remote status, and repo binding metadata in session state without breaking existing local sessions
- preserve the current mock runtime as the fallback when no remote backend is configured
- update `package.json` and `README.md` for the planned `v1.7.0` target

## Out of scope

- implementing a real backend HTTP bridge or remote execution
- adding shell UI lifecycle surfaces such as reconnect controls or durable run state rendering
- repo-binding UI beyond the session metadata needed for the contract
- voice input, preview/share UI, or other later backlog candidates
- unrelated product, tooling, or multi-module refactors

## Tasks

- add the bounded remote-runtime contract surface and keep mock fallback behavior explicit
- extend session state to safely store remote run and repo binding metadata
- update release/readme metadata for the planned target and cover the new contract with smoke validation

## Validation command

`npm run workflow:check && npm run test && npm run build`

## Validation

Status: PASS

Evidence:
- `npm run workflow:check` passed before phase validation.
- The required validation command `npm run workflow:check && npm run test && npm run build` passed.
- `src/adapters/remote-runtime.js` now defines explicit `startRun`, `resumeRun`, `cancelRun`, `fetchRunStatus`, and `fetchPreviewLinks` methods while preserving mock-backed starter payload and response behavior through fallback delegation.
- Session persistence now normalizes `runtimeMetadata`, `remoteRun`, and `repoBinding` data so legacy stored sessions remain readable and newly created sessions can carry remote contract metadata safely.
- `package.json` and `README.md` now advertise the planned `v1.7.0` target without misrepresenting the currently shipped `v1.6.0` local/mock release baseline.

Blockers:
- none

Ready to ship:
- yes

## Acceptance criteria

- a new `remote-runtime` adapter exists with explicit methods for start, resume, cancel, fetch status, and fetch preview links
- session state can persist remote run identifiers, remote status, and repo binding metadata without corrupting existing local sessions
- the current mock runtime remains available as a fallback when no remote backend is configured
- `package.json` and `README.md` are updated to target `v1.7.0`

## Release notes

- Added a bounded remote runtime contract with explicit durable-run methods while keeping mock responses as the honest fallback.
- Extended stored session metadata for remote run and repo binding state without changing the shipped local-first product baseline.

## Completion summary

- Added `src/adapters/remote-runtime.js` and smoke coverage for explicit remote lifecycle contract methods plus mock fallback behavior.
- Extended session creation and persistence so runtime id, remote run state, and repo binding metadata survive storage and legacy hydration safely.
- Updated phase metadata, `README.md`, and `package.json` to record the planned `v1.7.0` target while keeping the shipped `v1.6.0` baseline truthful.
