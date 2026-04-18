# Phase Registry

Legend:
- `[ ]` not started
- `[~]` in progress
- `[x]` complete
- `[-]` blocked

Authority notes:
- `.opencode/plans/current-phase.md` and this registry are the active workflow source of truth.
- The runtime and package metadata currently advertise the shipped `v1.7.2` release baseline. `preview-host-portability-hardening` preserved portable phone-testing preview hosts for that baseline after `browser-proof-release-truth-revalidation`, `browser-proof-command-surface-alignment`, and `browser-proof-clean-checkout-runner` repaired the browser-proof release surfaces; `remote-response-ownership` established the prior `v1.7.0` baseline, and Phase 14 established the earlier `v1.6.0` baseline.
- The previously shipped `v1.1.0` skip-link follow-up that once used Phase 09 numbering is preserved at `docs/releases/phase-09-v1-1-history.md` as a superseded historical record.

## Implementation releases
- [x] Phase 01 — App shell foundation
- [x] Phase 02 — iPhone navigation shell
- [x] Phase 03 — Conversation view and composer
- [x] Phase 04 — Sessions and local state
- [x] Phase 05 — Tool drawer and file viewer
- [x] Phase 06 — Mobile diff review
- [x] Phase 07 — PWA install and offline-aware shell
- [x] Phase 08 — Accessibility and release polish
- [x] Phase 09 — Release state and doc truth
- [x] Phase 10 — Product truth and version baseline
- [x] Phase 11 — Shell modularization foundation
- [x] Phase 12 — Runtime adapter boundary
- [x] Phase 13 — Quality gates and smoke coverage
- [x] Phase 14 — CI and release verification

## Backlog follow-up phases
- [x] backlog-lifecycle-gating — Prevent completed backlog items from being reselected by the phase workflow
- [x] browser-proof-runner — Add repo-root browser-proof and release-proof helpers for SSH/iPhone workflows
- [x] phase-validation-status-normalization — Normalize new phase templates so validation status starts as pending
- [x] clean-install-reproducibility — Restore deterministic clean installs so repo setup and workflow gates are trustworthy
- [x] remote-runtime-contract — Define the remote runtime contract and durable run model for mobile remote coding
- [x] remote-run-shell-state — Add durable remote run lifecycle states and reconnect controls to the mobile shell
- [x] remote-backend-http-bridge — Add the first real backend bridge so the mobile shell can talk to a remote coding runtime
- [x] repo-binding-surface — Add repo, branch, and workspace binding surfaces so remote sessions are tied to real coding targets
- [x] remote-preview-share-surface — Add remote preview link and read-only share surfaces so phone-based review is practical
- [x] workflow-validation-metadata-alignment — Normalize workflow validation metadata so phase state parses consistently
- [x] backlog-selection-determinism — Repair backlog selection so only true candidates remain selectable
- [x] workflow-gate-revalidation-evidence — Re-run workflow gates and capture authoritative evidence after workflow repairs
- [x] vite-security-refresh — Refresh Vite and related lockfile entries to reduce known development-server advisories
- [x] session-state-normalization-deduplication — Deduplicate session-state normalization helpers so runtime metadata cannot drift
- [x] main-shell-helper-extraction — Extract bounded shell helpers from src/main.js to reduce maintenance risk
- [x] mobile-voice-prompt-entry — Add optional voice prompt entry for remote coding requests on iPhone
- [x] remote-response-ownership — v1.7.0 — Make remote runs own assistant responses instead of the local mock path
- [x] browser-proof-automation — Replace manual browser-proof handoff with a repeatable repo-owned screenshot capture path
- [x] browser-proof-clean-checkout-runner — v1.7.1 — Restore clean-checkout browser proof with repo-owned Playwright resolution
- [x] browser-proof-command-surface-alignment — v1.7.2 — Align browser-proof command surfaces with the real runner and proof flow
- [x] browser-proof-release-truth-revalidation — v1.7.2 — Refresh release-truth surfaces after browser-proof repair with clean evidence
- [x] preview-host-portability-hardening — v1.7.2 — Remove machine-specific preview host assumptions from phone testing
- [x] registry-complete-selection-guard-hardening — v1.7.2 — Guard phase selection against registry-complete backlog ids

## In progress
