# Current Phase

Status: complete
Release: v1.2.0
Phase file: docs/releases/phase-10-product-truth-and-version-baseline.md

## Goal

Make the product honest about its current capabilities and align release and version metadata across the repo and runtime.

## Why this phase is next

After shipping accessibility follow-up work, the next highest-risk issue is that the runtime still reads more like a production client than the current shell actually is. Before deeper architecture work, the product should clearly state what is real, what is mock-backed, and which version is actually running.

## In scope

- align visible release metadata and package versioning
- make app copy honest about current shell-only or mock-backed behavior
- clarify the current product position in repo documentation
- remove misleading wording that implies a live backend where none exists
- keep the UX polished while making capability boundaries explicit

## Out of scope

- real backend transport
- authentication
- major UI redesign
- large settings expansion
- broad architecture refactors

## Primary files

- README.md
- package.json
- src/main.js
- index.html

## Expected max files changed

6

## Acceptance criteria

- visible release metadata is internally consistent
- package version and app-visible release are aligned
- documentation clearly states the current product reality
- user-facing copy does not imply a live connected client when the runtime is still shell or mock based
- npm run build passes

## Validation

Status: PASS

Evidence:
- `package.json` remains `1.2.0`, `.opencode/plans/current-phase.md` release is `v1.2.0`, and `src/main.js` now derives the visible runtime badge from `package.json` as `v${packageVersion}`, keeping the app-visible release aligned with the package version.
- `README.md` now explicitly states that the current product is a local-first mobile shell with mock-backed task replies, file viewing, and diff review, and that it is not a live backend client.
- Runtime copy in `src/main.js` now makes the shell-only boundary explicit in Settings, connection messaging, loading state, and composer actions, removing the strongest remaining production-client implication from the task flow.
- `npm run build` passes independently.

Blockers:
- none

Ready to ship:
- yes

## Release notes

- Aligned v1.2.0 release metadata across the app shell, package version, and install surfaces.
- Clarified that the current product is a local-first mobile shell with shell or mock-backed task behavior.

## Completion summary

Phase 10 shipped v1.2.0 by synchronizing visible release metadata and tightening runtime and documentation copy so the product no longer implies a live backend.
