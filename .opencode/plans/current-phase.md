# Add the first real backend bridge so the mobile shell can talk to a remote coding runtime

Status: complete
Release: v1.6.0
Phase file: backlog:remote-backend-http-bridge

## Goal

Connect the mobile shell to a configured remote backend for start, resume, cancel, and status operations while preserving an honest mock fallback when remote configuration is absent.

## Why this phase is next

The previous active backlog phase is complete, all listed release phases in `docs/releases/phase-registry.md` are complete, and backlog selection now applies. There is no explicit user-scoped candidate, so deterministic ordering selects `remote-backend-http-bridge` first because it has the highest priority, continues the same `remote-runtime` module follow-up, stays within the bounded five-file scope, and has clear validation.

## Primary files

- `package.json`
- `README.md`
- `src/adapters/remote-runtime.js`
- `src/main.js`
- `tests/quality-gates.smoke.test.js`

## Expected max files changed

5

## Risk

High. This is the first real remote-runtime bridge, so the phase can easily overstate backend capability or break the current mock-only shell if fallback and failure behavior are not kept explicit.

## Rollback note

Revert the backend bridge integration, smoke coverage, and planned release-target metadata together so the app returns to the shipped `v1.6.0` mock-only baseline.

## In scope

- add remote runtime adapter calls to a configured backend base URL for start, resume, cancel, and status operations
- preserve a mock fallback path when remote configuration is missing so local development remains usable
- make backend failure states explicit instead of allowing them to masquerade as successful local execution
- update `package.json` and `README.md` to target the planned `v2.0.0` follow-up without misrepresenting the current shipped baseline

## Out of scope

- repo, branch, or workspace binding surfaces
- preview, share, or voice-input follow-up features
- backend-owned repo/session orchestration beyond the first bounded HTTP bridge
- unrelated tooling, workflow, or multi-module refactors

## Tasks

- implement the first bounded remote-runtime HTTP bridge in `src/adapters/remote-runtime.js`
- connect the mobile shell to use backend start, resume, cancel, and status operations with honest fallback behavior
- update smoke coverage and planned release metadata for the `v2.0.0` target

## Validation command

`npm run workflow:check && npm run test && npm run build`

## Validation

Status: PASS

Evidence:
- `npm run workflow:check` passed before phase validation.
- The required validation command `npm run workflow:check && npm run test && npm run build` passed.
- The changed work stays within the phase scope: `src/adapters/remote-runtime.js`, `src/main.js`, `tests/quality-gates.smoke.test.js`, `package.json`, and `README.md` are the only product/release files changed for the phase.
- `src/adapters/remote-runtime.js` implements configured backend calls for start, resume, cancel, and status operations, while preserving explicit mock-fallback results when no backend base URL is configured.
- `src/main.js` now uses the remote adapter for start, status refresh, reconnect, and cancel flows, and `syncRemoteSessionState` preserves the existing run status on backend errors so failures no longer masquerade as successful execution.
- `tests/quality-gates.smoke.test.js` covers configured backend lifecycle calls, mock-fallback behavior, and explicit backend failure reporting.
- `package.json` and `README.md` now target the planned `v2.0.0` follow-up while preserving the shipped `v1.6.0` baseline.

Blockers:
- none

Ready to ship:
- yes

## Acceptance criteria

- The remote runtime adapter can call a configured backend base URL for start, resume, cancel, and status operations.
- The app preserves a mock fallback when remote configuration is missing so local development is still usable.
- Failure states are explicit and do not masquerade as successful local execution.
- `package.json` and `README.md` are updated to target `v2.0.0`.

## Release notes

- Added the first bounded remote backend bridge for mobile start, resume, cancel, and status operations.
- Preserved honest mock fallback and explicit failure handling when backend configuration is missing or requests fail.

## Completion summary

- Added the first bounded remote-runtime HTTP bridge with explicit configured, fallback, and error result paths for start, resume, cancel, and status operations.
- Connected existing mobile remote-shell actions to the bridge so remote-backed sessions can start and refresh durable run state honestly without expanding the UI beyond this phase.
- Updated smoke coverage and planned release-target metadata for the `v2.0.0` follow-up while preserving the shipped `v1.6.0` baseline.
