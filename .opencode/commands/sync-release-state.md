---
description: Synchronize release metadata across shipped-state surfaces without implementing product work
agent: release-manager
---

Read:
- `.opencode/plans/current-phase.md`
- `docs/releases/phase-registry.md`
- `package.json`

If present, also inspect runtime-visible release metadata in product code.

Synchronize these surfaces so they agree on the active shipped release:
- `docs/releases/phase-registry.md`
- `.opencode/plans/current-phase.md`
- runtime-visible release tag
- `package.json` version

Rules:
- do not change product behavior
- do not ship a phase
- do not create a commit automatically
- report every file updated and the final synchronized release value
