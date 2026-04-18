# Add rename and delete actions so local sessions stay manageable on a phone

Status: complete
Release: v1.7.2
Phase file: backlog:session-lifecycle-actions

## Goal
Add bounded rename and delete session lifecycle actions so local phone-based session history remains manageable without losing session integrity.

## Why this phase is next
The prior active phase is complete, all listed release phases in `docs/releases/phase-registry.md` are already complete, and `session-lifecycle-actions` is the highest-priority selectable item under `.opencode/backlog/candidates.yaml`. It is a single-module follow-up with clear validation and a smaller safer scope than deferred search, export/import, or tool-result sharing work.

## Primary files
- src/main.js
- src/ui/screens.js
- src/state/session-state.js
- src/state/storage.js
- tests/quality-gates.smoke.test.js

## Expected max files changed
5

## Risk
Medium. Session rename and delete flows can accidentally corrupt selection or local history if state transitions are not kept deterministic.

## Rollback note
Revert the session lifecycle UI and state changes together if rename/delete causes session loss, incorrect fallback selection, or an inconsistent empty-task state.

## In scope
- add explicit rename and delete controls to the Sessions screen with narrow-screen-safe presentation
- implement rename behavior that preserves messages, tool results, runtime metadata, and current selection state
- implement delete behavior with deterministic fallback session selection or an honest empty Task state when no sessions remain
- add regression coverage for rename and delete behavior only

## Out of scope
- session search or filtered empty states
- session export or import flows
- tool drawer copy/share actions
- cloud sync, account features, or multi-device merge behavior
- broader session list redesign beyond the bounded rename/delete controls needed for this phase

## Tasks
- add bounded rename and delete controls to the Sessions screen
- wire rename updates through session state without changing stored session content or runtime metadata
- wire delete behavior through session state with deterministic fallback handling
- extend regression coverage for rename/delete success and fallback behavior

## Validation command
npm run validate:local && npm run browser:smoke && npm run release:proof

## Validation
Status: PASS
Evidence:
- `npm run workflow:check` passed.
- Required validation command passed: `npm run validate:local && npm run browser:smoke && npm run release:proof`.
- Browser-facing repo proof completed with confirmed artifacts: `sessions-screen.png`, `task-screen.png`, `tool-drawer.png`, `offline-baseline.png`, `offline-state.png`, and `offline-recovered.png`.
- Scope stayed bounded to session rename/delete state, Sessions screen controls, event wiring, and regression coverage in the listed primary files.
- Independent validation reproduction confirmed renamed titles survive hydration: persisting a session with `customTitle` and re-running `hydrateSessions()` preserved `customTitle` and the selected session id after reload.
- Regression coverage includes stored custom-title hydration, explicit rename/delete controls, rename state preservation, and deterministic delete fallback behavior.
Blockers:
- none.
Ready to ship:
- yes

## Acceptance criteria
- The Sessions screen exposes explicit rename and delete controls that remain usable on narrow screens.
- Renaming a session preserves its messages, tool results, runtime metadata, and selection state.
- Deleting the selected session picks a deterministic fallback session or returns Task to an honest empty state.
- Regression coverage proves rename/delete behavior without widening into search, export/import, or tool-drawer share work.

## Release notes
- Added explicit Rename and Delete actions to saved session cards so session history stays manageable on a phone.
- Renamed session titles now persist across reload, and deleting a session keeps fallback selection or empty-state behavior honest.

## Completion summary
- Added bounded rename and delete controls to the Sessions screen without widening into broader session-management redesign.
- Preserved messages, tool results, runtime metadata, and current selection when renaming sessions, including across stored-state hydration.
- Added deterministic delete fallback handling and focused regression coverage for rename, delete, and custom-title hydration behavior.
