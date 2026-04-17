# Replace manual browser-proof handoff with a repeatable repo-owned screenshot capture path

Status: complete
Release: v1.7.0
Phase file: backlog:browser-proof-automation

## Goal
Replace the remaining manual browser-proof screenshot handoff with a repeatable repo-owned capture path so release proof can be reproduced from repository commands instead of ad hoc operator steps.

## Why this phase is next
All listed release phases are already complete, and this is the only selectable backlog entry under `candidates`. It is a bounded follow-up to the existing browser-proof workflow and improves deterministic validation without expanding into unrelated product work.

## Primary files
- scripts/dev/browser-smoke.sh
- scripts/dev/release-proof.sh
- .opencode/commands/browser-smoke.md
- .opencode/commands/browser-offline.md
- .opencode/commands/screenshot-capture.md

## Expected max files changed
5

## Risk
Moderate. Browser-proof automation can become flaky or over-broad if it expands beyond the standard proof path.

## Rollback note
Revert to the current manual screenshot handoff while preserving the existing browser-proof and release-proof command surfaces.

## In scope
- a repeatable repo-owned screenshot capture path for standard browser-proof artifacts
- wiring the existing browser-proof workflow to deterministic artifact generation
- bounded command and workflow doc updates needed for the capture path
- keeping release proof truthful about what was actually captured

## Out of scope
- full end-to-end test suite expansion
- hosted browser providers or CI browser infrastructure
- unrelated UI or product behavior changes
- authentication, backend transport, or remote runtime redesign
- broad multi-module workflow refactors

## Tasks
- Define the smallest repo-owned capture flow that replaces manual screenshot handoff for standard browser proof.
- Update the browser-proof command surfaces so the capture flow is explicit and repeatable.
- Ensure release proof consumes the same deterministic artifact path instead of assuming manual operator steps.
- Keep the phase bounded to browser-proof workflow automation and truthful validation messaging.

## Validation command
npm run workflow:check && npm run browser:smoke && npm run release:proof

## Validation
Status: PASS

Evidence:
- `npm run workflow:check` passed during validation.
- Required validation command `npm run workflow:check && npm run browser:smoke && npm run release:proof` passed, and `npm run release:proof` reported `READY_TO_SHIP` after confirming `sessions-screen.png`, `task-screen.png`, `tool-drawer.png`, `offline-baseline.png`, `offline-state.png`, and `offline-recovered.png`.
- Reviewed phase diff for `scripts/dev/browser-smoke.sh`, `scripts/dev/release-proof.sh`, `.opencode/commands/browser-smoke.md`, `.opencode/commands/browser-offline.md`, and `.opencode/commands/screenshot-capture.md`: the browser-proof flow now generates the standard artifacts from a repo-owned capture path and release proof checks the same artifact path.
- Changes stayed bounded to the five in-scope workflow/script/doc files plus phase-tracking release metadata; no unrelated product, backend, or CI files were introduced.

Blockers:
- none

Ready to ship:
- yes

## Release notes
- Browser proof now captures the standard Sessions, Task, tool-drawer, and offline recovery screenshots from a repo-owned flow.
- Release proof now checks the same automated artifact set instead of relying on a manual screenshot handoff.

## Acceptance criteria
- The standard browser-proof screenshot path is runnable from repo-owned workflow commands.
- Required browser-proof artifacts are produced through the repeatable capture path instead of a manual handoff.
- Release proof reports readiness based on the same artifact path used by browser-proof capture.
- The phase remains bounded to browser-proof workflow automation and does not expand into unrelated product changes.

## Completion summary
Shipped the browser-proof automation follow-up on `v1.7.0` by moving the standard release-proof screenshots onto a repeatable repo-owned capture flow and aligning release proof with the same artifact path.
