---
description: Implement only the active phase
agent: builder
---

Read `.opencode/plans/current-phase.md` and implement only the active phase.

Execution discipline:
- obey in-scope and out-of-scope boundaries exactly
- restate the goal before coding
- identify the smallest implementation path
- keep file count at or below the stated maximum when possible
- prefer incremental, easily verifiable changes
- prefer test-first or verification-first execution when practical
- avoid future-phase work
- use the phase validation command as the implementation target
- when a change depends on framework-specific or version-sensitive patterns, verify official docs before changing code
- summarize changed files, validation run, remaining work, and notable risks at the end

Optional operator note:
$ARGUMENTS
