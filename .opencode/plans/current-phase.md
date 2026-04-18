# Refresh release-truth surfaces after browser-proof repair with clean evidence

Status: complete
Release: v1.7.2
Phase file: backlog:browser-proof-release-truth-revalidation

## Goal
Refresh browser-proof release-truth surfaces so the repo records fresh evidence from the repaired runner instead of stale claims.

## Why this phase is next
The `browser-proof-command-surface-alignment` follow-up is already complete, and the next highest-priority selectable backlog candidate in the same browser-validation module is to rerun proof and synchronize release-truth files with the real result.

## Primary files
- .opencode/plans/current-phase.md
- docs/releases/phase-14-ci-and-release-verification.md
- docs/releases/phase-registry.md

## Expected max files changed
3

## Risk
Low. This phase is limited to fresh browser-proof evidence and release-truth synchronization.

## Rollback note
Revert these release-truth updates together if the fresh proof summary is recorded incorrectly.

## In scope
- rerun the repaired browser-proof flow to capture fresh evidence
- update Phase 14 release-proof documentation to match the real clean-checkout result
- synchronize registry and phase release-truth statements with validator evidence
- keep release notes and completion summary short and factual

## Out of scope
- browser runner implementation changes
- product code changes
- new proof tooling or workflow redesign
- unrelated release metadata edits

## Tasks
- run the workflow and browser-proof commands needed to capture fresh evidence
- update `docs/releases/phase-14-ci-and-release-verification.md` with the real current proof result
- update `docs/releases/phase-registry.md` only as needed to keep browser-proof completion claims truthful
- record concise validation, release notes, and completion summary in this phase file

## Validation command
npm run workflow:check && npm run browser:smoke && npm run release:proof

## Validation
Status: PASS

Evidence:
- `npm run workflow:check` passed once the active backlog phase was aligned to the current shipped release baseline `v1.7.2`, matching the existing README, registry, package, and runtime truth surfaces.
- `npm run browser:smoke` passed through the repaired repo-owned browser-proof flow and completed `npm run validate:local` (`workflow:check`, `lint`, `test`, and `build`) before capturing the standard six browser-proof screenshots in `playwright-artifacts/`.
- `npm run release:proof` passed with `Status: READY_TO_SHIP` and confirmed `sessions-screen.png`, `task-screen.png`, `tool-drawer.png`, `offline-baseline.png`, `offline-state.png`, and `offline-recovered.png`.
- `docs/releases/phase-14-ci-and-release-verification.md` now records the current runner-backed browser-proof result instead of stale pre-repair detail.

Blockers:
- none

Ready to ship:
- yes

## Release notes
- Refreshed Phase 14 browser-proof evidence using the repaired repo-owned runner and the current six-artifact proof flow.
- Prepared registry truth updates for the confirmed `v1.7.2` browser-proof baseline.

## Acceptance criteria
- The active phase validation block records fresh PASS or FAIL evidence based on the repaired runner, not stale claims.
- `docs/releases/phase-14-ci-and-release-verification.md` reflects the real clean-checkout validation evidence.
- `docs/releases/phase-registry.md` no longer overstates browser-proof completion before fresh proof exists.
- Release notes and completion summary remain short, factual, and synchronized with validator evidence.

## Completion summary
Refreshed the `v1.7.2` browser-proof truth surfaces by rerunning the repaired proof flow and recording the current clean evidence in the release-facing workflow files.
