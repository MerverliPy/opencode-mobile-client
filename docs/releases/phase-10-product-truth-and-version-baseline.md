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
- `README.md` documents the product as a local-first mobile shell and explicitly says task replies, file views, and diff review are shell or mock-backed experiences rather than a live backend client.
- `src/main.js` derives the app-visible `releaseTag` from `package.json` and keeps runtime messaging explicit about shell-only, mock-backed behavior.
- `npm run build` passes.

Blockers:
- none

Ready to ship:
- yes

## Release notes

- Clarified the shipped product reality as a local-first, mock-backed mobile shell.
- Aligned package versioning and app-visible release metadata around the shipped baseline.

## Completion summary

Phase 10 shipped `v1.2.0` by making the product and repo honest about current shell-only capabilities while aligning visible release metadata.
