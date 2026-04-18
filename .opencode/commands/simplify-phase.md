---
description: Propose a bounded post-pass simplification plan without changing behavior
agent: reviewer
---

Read `.opencode/plans/current-phase.md` and inspect the active phase changes in read-only mode.

Goal:
Identify simplifications that reduce complexity without widening scope or changing user-visible behavior.

Rules:
- remain read-only
- do not propose future-phase features
- do not turn simplification into a redesign
- prefer deletions, clearer naming, smaller helpers, and duplicated-path reduction
- keep iPhone-first behavior, runtime honesty, and current validation expectations intact

Return:
- simplification candidates
- files affected
- expected risk for each candidate
- whether each candidate is safe before ship, safer after ship, or not worth doing
