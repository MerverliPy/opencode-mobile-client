# Refresh release-truth surfaces after browser-proof repair with clean evidence

Status: pending
Release: v1.7.0
Phase file: backlog:browser-proof-release-truth-revalidation

## Goal
Update release-truth files only after the repaired browser-proof path passes with fresh clean-checkout evidence.

## Why this phase is next
The repo currently records PASS evidence for browser-proof automation that is not reproducible from a clean checkout.

## Primary files
- .opencode/plans/current-phase.md
- docs/releases/phase-14-ci-and-release-verification.md
- docs/releases/phase-registry.md

## Expected max files changed
3

## Risk
Low. This is release-truth synchronization only.

## Rollback note
Revert the three truth surfaces together if validator evidence does not support the updated claim.

## In scope
- refresh validation evidence after the repaired runner passes
- correct stale PASS claims if they are still unsupported
- keep release notes and completion summaries factual and short

## Out of scope
- browser runner implementation
- command doc rewrites
- unrelated release history edits
- version-bump redesign

## Tasks
- rerun workflow and browser proof gates
- update the active phase validation block with fresh evidence
- refresh phase-14 and registry truth only after validation is real

## Validation command
npm run workflow:check && npm run browser:smoke && npm run release:proof

## Validation
Status: pending
Evidence:
- not run yet
Blockers:
- not validated yet
Ready to ship:
- no

## Acceptance criteria
- the active phase validation block records fresh PASS or FAIL evidence based on the repaired runner, not stale claims
- `docs/releases/phase-14-ci-and-release-verification.md` reflects real clean-checkout validation evidence
- `docs/releases/phase-registry.md` no longer overstates browser-proof completion before fresh proof exists
- release notes and completion summary remain short, factual, and synchronized with validator evidence

## Completion summary
pending
