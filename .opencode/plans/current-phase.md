# Add optional voice prompt entry for remote coding requests on iPhone

Status: complete
Release: v1.6.0
Phase file: backlog:mobile-voice-prompt-entry

## Goal

Add an optional voice prompt entry path for remote coding requests on iPhone so spoken input can feed the same mobile composer workflow without implying transcription support when it is unavailable.

## Why this phase is next

The previous active phase is complete, all listed implementation releases are already complete, and the higher-priority backlog candidates remaining under `candidates` are already marked complete in `docs/releases/phase-registry.md`. `mobile-voice-prompt-entry` is the next remaining selectable backlog candidate with bounded scope, clear mobile value, and a straightforward validation path.

## Primary files

- `package.json`
- `README.md`
- `src/main.js`
- `src/ui/screens.js`
- `tests/quality-gates.smoke.test.js`

## Expected max files changed

5

## Risk

Medium. Voice entry touches mobile input behavior and browser capability boundaries, so the feature must stay optional, degrade honestly, and avoid forking the existing composer workflow.

## Rollback note

Revert the voice-entry changes if dictated prompts stop flowing through the existing composer path, unsupported browsers imply transcription is available, or the mobile shell becomes less predictable for typed input.

## In scope

- add an explicit optional voice-entry action for prompt capture on iPhone
- degrade honestly when transcription support is unavailable or denied
- land dictated text in the same composer flow as typed input
- update version targeting and README surfaces only as required by this bounded phase
- add focused smoke coverage for voice-entry behavior

## Out of scope

- backend orchestration changes beyond feeding the existing prompt flow
- repo binding, preview/share, or other remote-session expansion work
- mandatory voice-first UX or replacing typed input
- unrelated shell redesign or multi-module follow-up work

## Tasks

- add a bounded voice-entry trigger in the mobile shell UI
- keep unsupported or unavailable transcription states explicit and honest
- route dictated text into the existing composer path without creating a separate workflow
- update `package.json` and `README.md` for the target release boundary described by the candidate
- add focused smoke coverage for the new voice-entry behavior
- run the validation command and record the result

## Validation command

`npm run workflow:check && npm run test && npm run build`

## Validation

Status: PASS
Evidence:
- `npm run workflow:check` passed during validator review on 2026-04-16.
- The stated validation command `npm run workflow:check && npm run test && npm run build` passed during validator review on 2026-04-16.
- `src/main.js` adds a bounded optional speech-recognition path that appends dictated text to the existing composer draft and reports unsupported or denied states explicitly through UI notices.
- `src/ui/screens.js` adds a single optional voice-entry control in the existing composer footer without replacing typed input or expanding into a separate workflow.
- `package.json` and `README.md` now target `v2.3.0`, matching the phase acceptance criterion.
- `tests/quality-gates.smoke.test.js` adds focused coverage for the honest unavailable voice-entry state, and the phase stays within the listed implementation files.
Blockers:
- none
Ready to ship:
- yes

## Acceptance criteria

- The mobile shell can accept a dictated prompt through an explicit voice entry action.
- Voice entry is clearly optional and degrades honestly when transcription is unavailable.
- The resulting prompt lands in the same composer path as typed input and does not fork a separate workflow.
- `package.json` and `README.md` are updated to target `v2.3.0`.

## Release notes

- Added an optional voice-entry control in the task composer that uses browser speech recognition when available.
- Kept unavailable or denied voice states honest and routed dictated text into the existing draft flow.

## Completion summary

- Added an optional voice-entry action in the task composer so dictated prompts can feed the same draft path as typed input.
- Kept unsupported and denied speech-recognition states explicit through existing notice handling rather than implying guaranteed transcription support.
- Updated release-target metadata to `v2.3.0` and added focused smoke coverage for the new bounded behavior.
