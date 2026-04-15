---
description: Validate the active phase against its acceptance criteria
agent: validator
---

Read `.opencode/plans/current-phase.md`, review the changes for the active phase, and validate strictly against:
- goal
- in-scope items
- out-of-scope boundaries
- acceptance criteria
- stated validation command, when present

Always run `npm run workflow:check` before declaring PASS.

Update the Validation section in `.opencode/plans/current-phase.md` with:
- status: PASS or FAIL
- evidence
- blockers
- ready-to-ship: yes or no

Then return a concise validation summary.
