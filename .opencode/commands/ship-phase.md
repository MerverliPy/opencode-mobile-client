---
description: Finalize a passed phase, synchronize release metadata, commit it, and push to origin main when safe
agent: release-manager
---

Read `.opencode/plans/current-phase.md` and `docs/releases/phase-registry.md`.

Only continue if the current phase validation status is PASS.

Then do the following in order:

1. synchronize release-state surfaces
2. mark the current phase as `[x]` in `docs/releases/phase-registry.md`
3. finalize the Release notes section in `.opencode/plans/current-phase.md`
4. finalize the Completion summary in `.opencode/plans/current-phase.md`
5. generate a commit title using:
   - `release(<release-tag>): <short phase title>`
6. generate a commit body using:
   - Phase
   - Validation
   - Release notes
   - Completion summary
7. verify the current git branch is `main`
8. if the current branch is not `main`, stop and report:
   - current branch
   - required branch: `main`
   - no push performed
9. if the current branch is `main`:
   - stage the relevant release changes
   - create the git commit
   - push to `origin main`

Return:
- current phase shipped
- release value synchronized
- commit title used
- push result
- next recommended phase
