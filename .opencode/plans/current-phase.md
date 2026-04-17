# Make remote runs own assistant responses instead of the local mock path

Status: ready
Release: v1.7.0
Phase file: backlog:remote-response-ownership
Validation status: pending

## Goal
Make remote-mode sessions use backend-owned assistant responses instead of generating user-visible output from the local/mock path when remote runtime is active.

## Why this phase is next
The repository is now validation-clean and release-proof clean. The highest remaining product gap is execution truth: remote lifecycle state exists, but the visible response path is still partially local. This phase closes that mismatch and makes remote mode honest end-to-end.

## Primary files
- src/main.js
- src/adapters/remote-runtime.js
- src/state/session-state.js
- src/ui/screens.js
- tests/quality-gates.smoke.test.js
- README.md

## Expected max files changed
6

## Risk
Moderate. This phase changes the response source-of-truth for remote sessions and could create ambiguous fallbacks if not handled explicitly.

## Rollback note
Revert to the current local/mock response path behind an explicit fallback branch while preserving remote lifecycle metadata and UI state.

## In scope
- remote-mode response ownership
- remote run completion hydration
- honest running/completed/failed UI states
- explicit fallback rules
- regression coverage for remote response truthfulness

## Out of scope
- streaming token transport
- provider OAuth or auth redesign
- preview/share redesign
- CI workflow changes
- collaboration features

## Tasks
- Refactor src/main.js so remote-enabled sessions do not synthesize the final assistant reply from the local mock adapter during an active remote run.
- Extend src/adapters/remote-runtime.js with a response hydration contract for completed runs.
- Persist remote response lifecycle state in src/state/session-state.js.
- Update src/ui/screens.js to render honest queued, running, completed, and failed remote states.
- Add tests proving remote mode does not silently downgrade to fake local success.
- Update README.md so the remote behavior matches reality.

## Validation command
npm run workflow:check && npm run test && npm run build && npm run release:proof

## Validation
pending

Status: pending

Evidence:
- not run yet

Blockers:
- none

Ready to ship:
- no
## Acceptance criteria
- Remote-enabled sessions do not create final user-visible assistant output from the local mock path while a remote run is active.
- Completed remote runs can hydrate backend-owned assistant output into the session.
- Backend failures render explicit failure states and do not masquerade as successful local execution.
- Local/mock fallback only happens when remote mode is unavailable by configuration or intentionally disabled.
- The UI clearly distinguishes local sessions from remote sessions.
- All validation commands pass.

## Completion summary
pending
