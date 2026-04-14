---
description: Finalize a passed phase, commit it with release metadata, and push to origin main when safe
agent: release-manager
---

Read `.opencode/plans/current-phase.md` and `docs/releases/phase-registry.md`.

Only continue if the current phase validation status is PASS.

Then do the following in order:

1. mark the current phase as `[x]` in `docs/releases/phase-registry.md`
2. finalize the Release notes section in `.opencode/plans/current-phase.md`
3. finalize the Completion summary in `.opencode/plans/current-phase.md`
4. generate a commit title using:
   - `release(<release-tag>): <short phase title>`
5. generate a commit body using:
   - Phase
   - Validation
   - Release notes
   - Completion summary
6. verify the current git branch is `main`
7. if the current branch is not `main`, stop and report:
   - current branch
   - required branch: `main`
   - no push performed
8. if the current branch is `main`:
   - stage the relevant release changes
   - create the git commit
   - push to `origin main`

Return:
- current phase shipped
- commit title used
- push result
- next recommended phase
