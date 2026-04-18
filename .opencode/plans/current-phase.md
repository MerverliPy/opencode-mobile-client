# Align browser-proof command surfaces with the real runner and proof flow

Status: complete
Release: v1.7.2
Phase file: backlog:browser-proof-command-surface-alignment

## Goal
Make the browser-proof command docs describe the real supported repo-root execution path instead of a split MCP-versus-script story.

## Why this phase is next
The clean-checkout runner repair shipped on v1.7.1, so the next highest-priority selectable backlog candidate in the same browser-validation module is the bounded command-truth follow-up.

## Primary files
- .opencode/commands/browser-smoke.md
- .opencode/commands/browser-offline.md
- .opencode/commands/screenshot-capture.md
- .opencode/commands/release-proof.md

## Expected max files changed
4

## Risk
Low. This is command-truth alignment only.

## Rollback note
Revert the four command docs together if the updated wording causes scope drift.

## In scope
- align browser smoke, offline, screenshot, and release-proof command docs to the real repo-owned runner
- document actual prerequisites and artifact expectations
- keep commands single-purpose and bounded

## Out of scope
- runner implementation changes
- phase registry edits
- release notes edits
- unrelated workflow refactors

## Tasks
- rewrite the four command docs to match the repaired runner
- remove unsupported hidden dependency claims
- keep artifact names and route expectations consistent with the implementation

## Validation command
npm run workflow:check && npm run browser:smoke && npm run release:proof

## Validation
Status: PASS

Evidence:
- Reviewed the four in-scope command docs only; changes stayed bounded to command-truth guidance with no runner, registry, or broader workflow refactors.
- `.opencode/commands/browser-smoke.md` and `.opencode/commands/release-proof.md` now match the real repo-root helpers, including repo-root dependency/bootstrap guidance, preview URL `http://127.0.0.1:4173`, and the standard six `playwright-artifacts/` screenshots checked by the scripts.
- `.opencode/commands/browser-offline.md` and `.opencode/commands/screenshot-capture.md` now describe targeted follow-up against the repo-root preview path and no longer depend on a hidden or split execution story.
- `npm run workflow:check` passed before declaring PASS.
- The stated validation command `npm run workflow:check && npm run browser:smoke && npm run release:proof` passed, and `npm run release:proof` reported `READY_TO_SHIP` after confirming `sessions-screen.png`, `task-screen.png`, `tool-drawer.png`, `offline-baseline.png`, `offline-state.png`, and `offline-recovered.png`.

Blockers:
- none

Ready to ship:
- yes

## Release notes
- Browser-proof command docs now point to the repo-root `npm run browser:smoke` and `npm run release:proof` helpers.
- Command guidance now documents the real prerequisites, preview URL, and standard screenshot artifacts without hidden dependency claims.

## Acceptance criteria
- each browser-proof command document matches the real supported repo-root execution path
- documented prerequisites and artifact expectations match implemented runner behavior
- the command set no longer claims an unsupported or hidden execution dependency
- the phase stays bounded to command truth and operator guidance only

## Completion summary
Shipped `v1.7.2` by aligning the browser-proof command docs with the repo-root runner and release-proof flow, including truthful prerequisites and artifact expectations.
