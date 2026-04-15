# Current Phase

Status: complete
Release: v1.6.0
Phase file: docs/releases/phase-14-ci-and-release-verification.md

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

## Phase 14 validation checklist

- [ ] `npm run validate:local` passes
- [ ] local preview starts with `npm run preview:host`
- [ ] `/#sessions` loads at a narrow mobile viewport
- [ ] `/#task` loads at a narrow mobile viewport
- [ ] tool drawer interaction is preserved in browser validation
- [ ] offline state is understandable
- [ ] recovery state is understandable
- [ ] required browser artifacts are present in `playwright-artifacts/`

## Ship criteria

This phase is shippable only when:
- Validation status is `PASS`
- Blockers are `none`
- Ready to ship is `yes`
- browser proof artifacts exist
- release metadata remains synchronized

## Validation

Status: PASS

Evidence:
- `npm run validate:local` passed: `workflow:check`, `lint`, `test`, and `build` all succeeded.
- `npm run preview:host` served the local build at `http://127.0.0.1:4173/`.
- Real-browser validation at a narrow mobile viewport (`390x844`) passed for `/#sessions` and `/#task`; accessibility snapshots loaded cleanly, the runtime badge showed `v1.6.0`, and layout metrics show `scrollWidth === viewport width` on both routes, so no critical primary action depended on horizontal scrolling.
- The task flow preserved context: the tool drawer opened on `/#task`, remained readable in the narrow viewport, and closed back to the same task session without losing task context. No browser console errors were recorded.
- Offline and recovery validation passed on `/#sessions`: the offline warning/message was visible, saved local shell content remained readable while offline, and the recovered-online success message was visible after reconnect.
- Required browser artifacts are present in `playwright-artifacts/`: `sessions-screen.png`, `task-screen.png`, `tool-drawer.png`, `offline-baseline.png`, `offline-state.png`, and `offline-recovered.png`.

Blockers:
- none

Ready to ship:
- yes

## Release notes

- Added validator-scoped Playwright MCP browser proof commands and local preview/validation scripts for the mobile shell workflow.
- Captured narrow-viewport route, drawer, and offline/recovery browser artifacts required for release proof.

## Completion summary

- Phase 14 established a bounded Playwright MCP release-proof workflow for the iPhone-first local shell and validated that the current Sessions and Task experiences remain readable, drawer-safe, and understandable through offline recovery.
