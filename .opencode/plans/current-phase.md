# Restore clean-checkout browser proof with repo-owned Playwright resolution

Status: complete
Release: v1.7.1
Phase file: backlog:browser-proof-clean-checkout-runner

## Goal
Restore a clean-checkout browser-proof path so `npm run browser:smoke` and `npm run release:proof` no longer depend on hidden tool-managed Playwright paths.

## Why this phase is next
All listed release phases are already complete. Under selectable backlog `candidates`, this is the highest-priority item, stays in the same `browser-validation` module as the just-completed work, and is a smaller bounded repair before broader command-surface or release-truth follow-ups.

## Primary files
- scripts/dev/browser-smoke.sh
- package.json
- package-lock.json
- opencode.json

## Expected max files changed
4

## Risk
Moderate. Browser-proof tooling can become flaky or misleading if dependency resolution or bootstrap behavior expands beyond the bounded clean-checkout runner path.

## Rollback note
Revert the runner resolution changes and keep browser-proof claims unshipped until fresh clean-checkout evidence exists again.

## In scope
- removing hidden `.opencode/node_modules/...` Playwright assumptions from `npm run browser:smoke`
- using repo-owned dependency or config resolution for browser-proof execution, or failing with a clear actionable bootstrap message
- keeping the standard six screenshot artifacts written to `playwright-artifacts/`
- ensuring `npm run release:proof` passes immediately after a successful browser smoke run

## Out of scope
- browser-proof command documentation alignment
- release-truth metadata refresh beyond this runner repair
- unrelated UI, product, backend, or CI changes
- generic multi-module workflow refactors

## Tasks
- Trace the current hidden Playwright import path used by `npm run browser:smoke`.
- Replace it with repo-owned dependency or config resolution, or add an explicit bootstrap failure path.
- Keep screenshot artifact output aligned with the existing six standard browser-proof captures.
- Verify `npm run release:proof` succeeds directly after a successful smoke run.

## Validation command
npm run browser:smoke && npm run release:proof

## Validation
Status: PASS

Evidence:
- `npm run workflow:check` passed before phase validation.
- `npm run browser:smoke && npm run release:proof` passed from repo root after switching browser smoke to repo-owned Playwright resolution.
- Browser smoke generated the six required artifacts in `playwright-artifacts/`: `sessions-screen.png`, `task-screen.png`, `tool-drawer.png`, `offline-baseline.png`, `offline-state.png`, and `offline-recovered.png`.
- Phase changes stayed bounded to `scripts/dev/browser-smoke.sh`, `package.json`, and `package-lock.json`.

Blockers:
- none

Ready to ship:
- yes

## Release notes
- Browser smoke now resolves Playwright from the repo root instead of a hidden `.opencode/node_modules` path.
- Missing root dependencies or WebKit browser binaries now fail with explicit bootstrap guidance while preserving the standard screenshot and release-proof flow.

## Acceptance criteria
- `npm run browser:smoke` no longer imports Playwright from hidden tool-managed paths.
- The runner uses repo-owned dependency or config resolution, or exits with a clear actionable bootstrap failure message.
- Running `npm run browser:smoke` writes the six standard screenshot artifacts to `playwright-artifacts/`.
- `npm run release:proof` passes immediately after a successful browser smoke run.

## Completion summary
Shipped `v1.7.1` by moving `npm run browser:smoke` onto repo-owned Playwright resolution, adding explicit bootstrap guidance for missing dependencies or browser binaries, and confirming release proof succeeds with the standard six screenshot artifacts.
