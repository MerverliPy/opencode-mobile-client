---
description: Check workflow invariants and release-state consistency
agent: orchestrator
---

Check the following invariants:

- `.opencode/plans/current-phase.md` exists and is readable
- `docs/releases/phase-registry.md` exists and is readable
- the current phase file referenced in `.opencode/plans/current-phase.md` exists
- validation status is present in the current phase file
- shipped-state metadata is internally consistent across:
  - current phase file
  - phase registry
  - README release baseline
  - runtime-visible release tag if present
  - `package.json` version
- `package-lock.json` is synchronized with `package.json`
- required local validation commands referenced by the active workflow exist

Use `bash scripts/dev/workflow-check.sh` as the source of truth for this check.

Return:
- PASS or FAIL
- invariant results
- concrete blockers
- recommended next command
