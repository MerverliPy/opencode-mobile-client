---
description: Apply the minimum necessary fixes for validator-identified blockers only
agent: builder
---

Read `.opencode/plans/current-phase.md`.

Only address items listed under Validation blockers or explicit FAIL evidence.

Requirements:
- fix only the minimum necessary issues
- do not expand scope
- do not add unrelated polish
- prefer the smallest deterministic fix first
- preserve behavior outside the failing acceptance criteria
- rerun only the relevant failing gates plus required workflow checks
- summarize exactly what validator blockers were addressed
- summarize anything still unresolved
- do not mark the phase shipped or rewrite release metadata

Optional operator note:
$ARGUMENTS
