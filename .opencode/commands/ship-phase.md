---
description: Finalize a passed phase, synchronize release metadata, commit it, and push to origin main when safe
agent: release-manager
---

Read `.opencode/plans/current-phase.md` and `docs/releases/phase-registry.md`.

Only continue if the current phase validation status is PASS.

Then do the following in order:

1. confirm `Ready to ship` is `yes`
2. when the phase affects user-facing behavior or browser proof is expected, run or confirm `npm run release:proof`
3. synchronize release-state surfaces
4. mark the current phase as `[x]` in `docs/releases/phase-registry.md`
5. finalize the Release notes section in `.opencode/plans/current-phase.md`
6. finalize the Completion summary in `.opencode/plans/current-phase.md`
7. generate a commit title using:
   - `release(<release-tag>): <short phase title>`
8. generate a commit body using:
   - Phase
   - Validation
   - Release notes
   - Completion summary
9. verify the current git branch is `main`
10. if the current branch is not `main`, stop and report:
   - current branch
   - required branch: `main`
   - no push performed
11. if the current branch is `main`:
   - stage the relevant release changes
   - create the git commit
   - push to `origin main`

Return:
- current phase shipped
- release value synchronized
- commit title used
- push result
- next recommended phase
