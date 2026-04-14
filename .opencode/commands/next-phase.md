---
description: Select the correct next implementation phase and load it into the current phase file
agent: orchestrator
---

Read `docs/releases/phase-registry.md` and `.opencode/plans/current-phase.md`.

If a phase is already in progress and not complete, keep that phase active unless it is explicitly blocked or the user asked to switch.

Otherwise:
- choose the first incomplete phase in `docs/releases/phase-registry.md`
- open the corresponding file in `docs/releases/`
- copy its full contents into `.opencode/plans/current-phase.md`
- mark that phase as `[~]` in the registry if it was `[ ]`

Then respond with:
- active phase title
- release tag
- goal
- in-scope summary
- out-of-scope summary
- recommended next command

Do not implement code in this command.
