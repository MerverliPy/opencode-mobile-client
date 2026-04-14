---
description: Finalize a passed phase and prepare release metadata
agent: release-manager
---

Read `.opencode/plans/current-phase.md` and `docs/releases/phase-registry.md`.

Only continue if the current phase validation status is PASS.

Then:
- mark the current phase as `[x]` in `docs/releases/phase-registry.md`
- finalize the Completion summary in `.opencode/plans/current-phase.md`
- add concise release notes
- suggest a commit title
- state the next recommended phase

Do not push or merge unless explicitly asked.
