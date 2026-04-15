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
  - runtime-visible release tag if present
  - `package.json` version
- required local validation commands referenced by the active workflow exist or are clearly absent

Return:
- PASS or FAIL
- invariant results
- concrete blockers
- recommended next command
