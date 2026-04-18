---
description: Assemble browser and local release proof for the active phase
agent: release-manager
---

Use the release-manager agent.

Goal:
Assemble release proof for the active phase from the real repo-root helper flow and determine whether `/ship-phase` may proceed.

Process:
1. Read:
   - `.opencode/plans/current-phase.md`
   - `docs/releases/phase-registry.md`
   - `AGENTS.md`
   - `package.json`
2. Run the repo-root release proof helper:
   - `npm run release:proof`
3. Treat the helper as the source of truth for release-proof readiness:
   - it runs local validation from repo root
   - it checks the standard six browser-proof artifacts in `playwright-artifacts/`
4. If the helper reports missing browser proof and the current phase changes user-facing shell behavior, navigation, readability, drawer behavior, installability, accessibility, or offline/recovery behavior:
   - run `npm run browser:smoke`
   - re-run `npm run release:proof`
5. Confirm the required browser artifacts exist in `playwright-artifacts/`.
6. Confirm release metadata is synchronized and `npm run workflow:check` passes.
7. Summarize:
   - commands executed
   - local validation result
   - browser validation result
   - artifact files produced
   - blocker status
   - release metadata status
8. Return one of:
   - `READY_TO_SHIP`
   - `NOT_READY_TO_SHIP`

Decision rules:
- return `READY_TO_SHIP` only if the active phase validation is PASS and all required browser proof exists
- return `NOT_READY_TO_SHIP` if any required validation or proof is missing

Do not modify source files unless explicitly asked.
Do not ship automatically.
