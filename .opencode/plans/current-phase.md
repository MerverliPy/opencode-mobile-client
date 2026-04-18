# Add session search and empty-filter states so larger local histories remain usable

Status: complete
Release: v1.7.2
Phase file: backlog:session-search-filter

## Goal
Add a bounded session search input and filtered empty state to the Sessions screen so larger local histories remain usable on a phone without changing session lifecycle or storage scope.

## Why this phase is next
- The prior active phase is complete.
- All listed release phases are already complete in `docs/releases/phase-registry.md`.
- `session-search-filter` is the highest-priority selectable item under `.opencode/backlog/candidates.yaml`.
- It is a same-module follow-up with smaller safer scope and clearer validation than deferred export/import or tool-result sharing work.

## Primary files
- src/main.js
- src/ui/screens.js
- src/state/session-state.js
- tests/quality-gates.smoke.test.js

## Expected max files changed
4

## Risk
Medium. Search/filter wiring can accidentally desync visible sessions from selected-session state or create misleading empty states on narrow screens.

## Rollback note
Revert the Sessions search/filter UI and related state updates together if filtering breaks selection, current task handoff, or honest empty-filter behavior.

## In scope
- add a bounded search input to the Sessions screen using existing local session metadata
- show a distinct empty-filter state when sessions exist but no sessions match the current query
- preserve selected-session state and current task handoff while filtering visible sessions
- add regression coverage for query, clear, and empty-filter behavior only

## Out of scope
- rename/delete session lifecycle behavior beyond the already shipped controls
- session export/import or backup flows
- tool drawer copy/share actions
- broader session list redesign, sorting changes, or cloud/multi-device sync behavior

## Tasks
- add a narrow-screen-safe search input and filtered empty-state UI to the Sessions screen
- wire session filtering through existing session metadata without mutating stored sessions
- ensure filtering does not corrupt selected-session state or break the current task handoff
- extend regression coverage for query, clear, and empty-filter behavior

## Validation command
npm run validate:local && npm run browser:smoke && npm run release:proof

## Validation
Status: PASS
Evidence:
- `npm run workflow:check` passed.
- `npm run validate:local` passed (`eslint`, `vitest`, and `vite build`).
- `npm run browser:smoke` passed and refreshed the required screenshot artifacts in `playwright-artifacts/`.
- `npm run release:proof` returned `Status: READY_TO_SHIP` with all required proof artifacts confirmed.
Blockers:
- none
Ready to ship:
- yes

## Acceptance criteria
- The Sessions screen exposes a search input that narrows visible sessions using existing session metadata.
- The UI shows a distinct empty-filter state when sessions exist but none match the current query.
- Filtering does not corrupt selected-session state or break the current task handoff.
- Regression coverage proves query, clear, and empty-filter behavior without widening into export/import or tool-drawer share work.

## Release notes
- Added a bounded Sessions search field that filters visible local sessions by existing titles, previews, and repo metadata on mobile.
- Added a distinct filtered empty state with a clear-search recovery path while preserving selected-session access in Task.
- Added smoke coverage for query matching, clear behavior, and filtered empty-state rendering.

## Completion summary
- Added a bounded Sessions search input that filters visible sessions by existing local metadata without mutating stored sessions.
- Added a distinct filtered empty state with a clear-search path while preserving selected-session handoff to Task.
- Extended smoke coverage for search query matching, clear behavior, and the empty-filter state only.
