# Phase 14 — CI and release verification

Release: v1.6.0
Status: complete

## Goal

Add a bounded browser-validation foundation for the iPhone-first shell using Playwright MCP, without expanding into a full end-to-end suite or cloud-browser infrastructure.

## Why this phase is next

Phase 13 added enforceable local quality gates for pure logic and core shell helpers. The next highest-value gap is browser-level validation for the mobile shell: route loading, drawer behavior, screenshot capture, and offline/online proof that still fits the repo's phase-driven workflow.

## In scope

- add Playwright MCP configuration to `opencode.json`
- keep Playwright tools disabled globally and enabled only for `validator`
- add browser workflow commands:
  - `/browser-smoke`
  - `/browser-offline`
  - `/screenshot-capture`
  - `/release-proof`
- add stable local preview and bundled validation scripts in `package.json`
- ignore browser artifact output in `.gitignore`
- keep the implementation compatible with remote SSH/iPhone-driven workflows by defaulting to headless WebKit
- keep workflow-state and release-verification surfaces truthful while Phase 14 is in progress
- update local workflow invariant checks so browser-proof validation can run before release metadata is finalized at ship time

## Out of scope

- Browserbase or other hosted browser providers
- GitHub MCP
- GitHub Actions workflow files
- visual regression baselines
- Percy/Chromatic-style approval workflows
- live backend transport validation
- authentication flows
- broad Playwright test suites committed into `tests/`
- unrelated UI refactors

## Primary files

- `opencode.json`
- `package.json`
- `.gitignore`
- `.opencode/plans/current-phase.md`
- `.opencode/commands/browser-smoke.md`
- `.opencode/commands/browser-offline.md`
- `.opencode/commands/screenshot-capture.md`
- `.opencode/commands/release-proof.md`
- `docs/releases/phase-14-ci-and-release-verification.md`
- `docs/releases/phase-registry.md`
- `scripts/dev/workflow-check.sh`

## Expected max files changed

11

## Acceptance criteria

- `opencode.json` can start a local Playwright MCP server in headless WebKit mode
- Playwright MCP tools are disabled globally and enabled only for `validator`
- `/browser-smoke` exists and instructs the validator to run local validation, start preview, inspect the mobile shell, and capture screenshots
- `/browser-offline` exists and validates offline/online shell messaging and recovery
- `/screenshot-capture` exists and captures named screenshot artifacts for a requested route or state
- `/release-proof` exists and determines whether shipping may proceed
- `package.json` provides:
  - `npm run validate:local`
  - `npm run preview:host`
- browser artifacts are ignored by git
- existing local validation still passes:
  - `npm run workflow:check`
  - `npm run lint`
  - `npm run test`
  - `npm run build`

## Validation command

`npm run validate:local`

## Phase 14 validation checklist

The validator must treat this checklist as the release-proof baseline for this phase.

### Local verification

- [ ] `npm run workflow:check` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] `npm run validate:local` passes as the combined gate

### Browser verification

- [ ] local preview starts successfully with `npm run preview:host`
- [ ] `/#sessions` loads in a real browser at a narrow mobile viewport
- [ ] `/#task` loads in a real browser at a narrow mobile viewport
- [ ] primary controls remain usable on a narrow viewport
- [ ] no critical primary flow depends on horizontal scrolling
- [ ] shell copy remains readable in a narrow viewport
- [ ] tool drawer can open and close without losing task context

### Offline and recovery verification

- [ ] offline state is visible and understandable
- [ ] existing local shell content remains readable while offline
- [ ] recovery state after reconnect is visible and understandable

### Artifact proof

- [ ] `playwright-artifacts/sessions-screen.png` exists
- [ ] `playwright-artifacts/task-screen.png` exists
- [ ] `playwright-artifacts/tool-drawer.png` exists
- [ ] `playwright-artifacts/offline-baseline.png` exists
- [ ] `playwright-artifacts/offline-state.png` exists
- [ ] `playwright-artifacts/offline-recovered.png` exists

### Decision rule

This phase is PASS only if:
- all local verification checks pass
- all browser verification checks pass
- all offline and recovery checks pass
- all required artifact files exist
- no blocker remains in the current phase file

If any required check fails, the validator must return FAIL.

## Validation

Status: PASS

Evidence:
- Fresh repo-root browser-proof revalidation passed on the repaired runner via `npm run browser:smoke` and `npm run release:proof` from the shipped `v1.7.2` baseline.
- `npm run browser:smoke` completed `npm run validate:local` successfully, started the preview server at `http://127.0.0.1:4173/`, opened the shell in mobile WebKit at `390x844`, and rechecked the `/#task` and `/#sessions` routes without requiring horizontal scrolling.
- The current runner-backed proof flow confirmed task-context preservation by opening and closing the tool drawer on `/#task`, then captured the standard screenshots `task-screen.png`, `tool-drawer.png`, and `sessions-screen.png`.
- The same runner-backed proof flow verified the offline and recovery states on `/#sessions` and captured `offline-baseline.png`, `offline-state.png`, and `offline-recovered.png`.
- `npm run release:proof` reran `npm run validate:local`, confirmed all six required screenshots in `playwright-artifacts/`, and reported `Status: READY_TO_SHIP`.

Blockers:
- none

Ready to ship:
- yes

## Ship-phase criteria

The release-manager may ship this phase only when all of the following are true:

- current phase validation status is `PASS`
- current phase blockers are `none`
- current phase `Ready to ship` is `yes`
- release metadata stays synchronized across:
  - `.opencode/plans/current-phase.md`
  - `docs/releases/phase-registry.md`
  - `package.json`
  - runtime release tag surfaces validated by `npm run workflow:check`
- browser proof artifacts were generated during validation for the current phase
- browser findings do not show any unresolved critical usability issue on the narrow mobile shell
- the release notes section is no longer `pending`
- the completion summary is no longer `pending`

### Ship-phase refusal conditions

The release-manager must refuse to ship if any of the following is true:

- validator returned FAIL
- browser artifacts are missing
- local validation passed but browser validation was skipped
- release metadata is inconsistent
- the phase includes user-facing shell behavior but no browser proof was recorded

### Required ship evidence summary

Before shipping, the release-manager must summarize:

- commands run
- validation result
- screenshots written
- any known limitations accepted for the phase
- confirmation that release metadata is synchronized

## Release notes

- Added validator-scoped Playwright MCP browser proof commands and local preview/validation scripts for the mobile shell workflow.
- Captured narrow-viewport route, drawer, and offline/recovery browser artifacts required for release proof.

## Completion summary

- Phase 14 established a bounded Playwright MCP release-proof workflow for the iPhone-first local shell and validated that the current Sessions and Task experiences remain readable, drawer-safe, and understandable through offline recovery.
