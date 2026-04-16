# Add repo, branch, and workspace binding surfaces so remote sessions are tied to real coding targets

Status: complete
Release: v1.6.0
Phase file: backlog:repo-binding-surface

## Goal

Add the first bounded repo and workspace binding surfaces so remote sessions can show and persist real coding targets without expanding into later preview, sharing, or voice-input work.

## Why this phase is next

The previous active backlog phase is complete, all listed release phases in `docs/releases/phase-registry.md` are complete, and backlog selection now applies. There is no explicit user-scoped candidate, so deterministic ordering selects `repo-binding-surface` because it is the highest-priority remaining candidate, stays within the bounded six-file limit, and has clear validation.

## Primary files

- `package.json`
- `README.md`
- `src/main.js`
- `src/ui/screens.js`
- `src/state/session-state.js`
- `tests/quality-gates.smoke.test.js`

## Expected max files changed

6

## Risk

Medium. This phase changes session metadata shape and user-visible binding state, so existing sessions must remain readable and the UI must stay honest about what is and is not bound.

## Rollback note

Revert the repo-binding session metadata changes, binding-state UI surfaces, and related release-target metadata together so the app returns to the current shipped `v1.6.0` baseline safely.

## In scope

- persist repo owner, repo name, branch, and workspace metadata in session state
- show whether a session is unbound, bound to a repo, or bound to a repo plus active run
- preserve readability and safe upgrade behavior for existing local sessions
- update `package.json` and `README.md` to target the planned `v2.1.0` follow-up

## Out of scope

- remote preview or share surfaces
- voice prompt entry
- backend-owned repo cloning or broader workspace orchestration beyond session metadata and binding status
- unrelated tooling, workflow, or multi-module refactors

## Tasks

- extend session-state persistence so repo and workspace metadata can be stored and older sessions upgrade safely
- add bounded mobile UI surfaces for repo and run binding status in `src/main.js` and `src/ui/screens.js`
- update smoke coverage and planned release-target metadata for the `v2.1.0` follow-up

## Validation command

`npm run workflow:check && npm run test && npm run build`

## Validation

Status: PASS

Evidence:
- `npm run workflow:check` passed before phase validation.
- The required validation command `npm run workflow:check && npm run test && npm run build` passed.
- The phase stayed within scope across `src/state/session-state.js`, `src/ui/screens.js`, `src/main.js`, `tests/quality-gates.smoke.test.js`, `package.json`, and `README.md`.
- Session-state helpers now expose bounded repo binding labels and status so stored metadata can render consistently for unbound, repo-bound, and repo-plus-active-run sessions.
- Task and session surfaces now show repo binding state, repo or branch labels, and workspace metadata without expanding into preview, share, or voice-input work.
- Smoke coverage verifies repo binding status derivation and the new repo binding UI alongside existing remote-run behavior.
- `package.json` and `README.md` now target the planned `v2.1.0` follow-up while preserving the shipped `v1.6.0` baseline.

Blockers:
- none

Ready to ship:
- yes

## Acceptance criteria

- A session can persist repo name, owner, branch, and workspace metadata.
- The mobile UI shows whether a session is unbound, bound to a repo, or bound to a repo plus active run.
- Existing local sessions remain readable and upgrade safely to the new metadata shape.
- `package.json` and `README.md` are updated to target `v2.1.0`.

## Release notes

- Added bounded repo, branch, and workspace binding surfaces so remote sessions can show their coding target on mobile.
- Preserved readable local-session upgrades while exposing unbound, repo-bound, and repo-plus-active-run status honestly in the shell.

## Completion summary

- Added bounded repo-binding state helpers and mobile UI surfaces so sessions clearly show whether they are unbound, repo bound, or repo bound with an active run.
- Kept existing session persistence and legacy-session normalization readable while exposing repo, branch, and workspace context in task and session views.
- Updated smoke coverage and planned release targeting to `v2.1.0` without expanding into later preview, share, or voice-input phases.
