# Current Phase

Status: complete
Release: v1.5.0
Phase file: docs/releases/phase-09-release-state-and-doc-truth.md

## Goal
Make the repository truthful again by reconciling current phase state, package version, runtime-visible release metadata, and release documentation.

## Why this phase is next
Further agent-driven shipping is unsafe while the runtime and package surface read as `v1.5.0` but the active workflow files still point at older planning state and stale duplicate phase history.

## Agent workflow
- Orchestrator: lock a bounded truth-reset scope and file budget before edits.
- Builder: update only release-state and documentation files listed below.
- Validator: confirm metadata alignment and run the repo build.
- Reviewer: reject scope creep into feature work.
- Release-manager: update registry and phase summaries only after validator PASS.

## In scope
- reconcile package version and runtime-visible release metadata
- repair or supersede stale phase state
- restore a trustworthy current-phase file
- make release docs honest about what is actually shipped
- keep app behavior materially unchanged

## Out of scope
- PWA behavior changes
- copy redesign beyond release truth
- new tooling
- CI work
- feature delivery

## Primary files
- package.json
- src/main.js
- .opencode/plans/current-phase.md
- docs/releases/phase-registry.md
- docs/releases/phase-09-release-state-and-doc-truth.md
- README.md

## Expected max files changed
8

## Acceptance criteria
- package version, current phase, and release docs agree
- runtime-visible release metadata matches package version
- current-phase points at a real phase file
- post-phase claims are no longer misleading
- npm run build passes

## Validation
Status: PASS
Evidence:
- `package.json` is `1.5.0`, `src/main.js` derives the runtime `releaseTag` from that version, and this phase file still matches the active phase path recorded in `.opencode/plans/current-phase.md`.
- `docs/releases/phase-10-product-truth-and-version-baseline.md` now matches the shipped completion state already represented in `docs/releases/phase-registry.md`.
- The previously shipped `v1.1.0` skip-link follow-up is preserved in `docs/releases/phase-09-v1-1-history.md`, and the registry now points to that superseded historical record.
- The previously cited future-phase mobile-preview files and artifacts are not present in the current worktree.
- `npm run workflow:check` and `npm run build` both pass after these doc-sync edits.
Blockers:
- none
Ready to ship:
- yes

## Release notes
- Reconciled `v1.5.0` release metadata across the current phase, registry, README, and runtime-visible surfaces.
- Preserved the earlier shipped `v1.1.0` skip-link follow-up as a superseded historical record.

## Completion summary
Phase 09 shipped `v1.5.0` by restoring truthful release-state documentation and synchronizing the repo's shipped metadata without changing app behavior.
