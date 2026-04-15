---
description: Select the correct next implementation phase and load it into the current phase file
agent: orchestrator
---

Read `docs/releases/phase-registry.md` and `.opencode/plans/current-phase.md`.

If the current phase is complete and shipped, choose the first incomplete phase in `docs/releases/phase-registry.md`.

If a phase is already in progress and not complete, keep that phase active unless it is explicitly blocked or the user asked to switch.

Copy the selected phase file from `docs/releases/` into `.opencode/plans/current-phase.md`.

If the selected phase was `[ ]`, mark it `[~]` in the registry.

Then respond with:
- active phase title
- release tag
- goal
- in-scope summary
- out-of-scope summary
- recommended next command

Do not implement code in this command.
