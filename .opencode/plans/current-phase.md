# Add remote preview link and read-only share surfaces so phone-based review is practical

Status: complete
Release: v1.6.0
Phase file: backlog:remote-preview-share-surface

## Goal

Add the first bounded remote preview and read-only share surfaces so mobile review is practical once a remote session is bound, without expanding into voice entry or broader backend orchestration work.

## Why this phase is next

All listed release phases in `docs/releases/phase-registry.md` are complete, the previous backlog follow-up phase is already complete, and the user explicitly scoped this `/autoflow` run to `remote-preview-share-surface`. That explicit user scope takes priority in backlog selection and remains a bounded five-file follow-up with clear validation.

## Primary files

- `package.json`
- `README.md`
- `src/main.js`
- `src/ui/screens.js`
- `tests/quality-gates.smoke.test.js`

## Expected max files changed

5

## Risk

Medium. This phase adds user-visible preview and share surfaces, so the UI must stay honest when backend data is missing and must not imply unsupported share capabilities.

## Rollback note

Revert the preview-link and read-only share UI surfaces together with the related release-target metadata so the app returns cleanly to the shipped `v1.6.0` baseline.

## In scope

- render remote preview links from a bound remote run
- expose a read-only share link surface without claiming backend support that does not exist
- fail honestly when preview or share data is absent from backend responses
- update `package.json` and `README.md` to target the planned `v2.2.0` follow-up

## Out of scope

- voice prompt entry
- repo cloning, workspace orchestration, or new backend contracts beyond consuming returned preview or share data
- editable collaboration or write-capable sharing flows
- unrelated tooling, workflow, or multi-module refactors

## Tasks

- add bounded mobile surfaces for preview and read-only share links in the existing session and run UI
- keep missing preview or share data explicit instead of implying support that is not present
- update smoke coverage and planned release-target metadata for the `v2.2.0` follow-up

## Validation command

`npm run workflow:check && npm run test && npm run build`

## Validation

Status: PASS

Evidence:
- `npm run workflow:check` passed before phase validation.
- The required validation command `npm run workflow:check && npm run test && npm run build` passed.
- The phase stayed within scope across `src/main.js`, `src/ui/screens.js`, `tests/quality-gates.smoke.test.js`, `package.json`, and `README.md`.
- Remote task surfaces now render preview-link and read-only share sections that stay explicit when backend links are missing and open returned links without implying editable collaboration support.
- Remote sessions can now render stored preview and share links when those links are present on session state, while preserving honest fallback behavior when links are unavailable.
- Smoke coverage verifies visible preview/share UI and honest empty-link states for remote sessions.
- No voice-entry, collaboration-editing, or broader backend-contract work was added in this phase.
- `package.json` and `README.md` now target the planned `v2.2.0` follow-up while preserving the shipped `v1.6.0` baseline.

Blockers:
- none

Ready to ship:
- yes

## Acceptance criteria

- The app can render and open remote preview links from a bound remote run.
- The UI can display a read-only share link surface without claiming backend support that does not exist.
- Preview and share surfaces fail honestly when the backend does not return them.
- `package.json` and `README.md` are updated to target `v2.2.0`.

## Release notes

- Added bounded remote preview-link and read-only share surfaces so phone-based review can open backend-returned destinations directly from a remote session.
- Kept preview and share states honest by showing explicit unavailable states when the backend does not return links and by avoiding any claim of editable collaboration support.

## Completion summary

- Added preview-link and read-only share sections to the remote task shell so mobile review can open returned destinations without losing session context.
- Kept the implementation bounded to active-phase files while rendering stored preview and share links honestly when they are available on remote sessions.
- Updated smoke coverage and planned release targeting to `v2.2.0` without expanding into voice entry or broader backend orchestration work.
