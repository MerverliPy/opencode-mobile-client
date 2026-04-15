---
description: Continue the phase workflow automatically with a bounded repair loop and strict stop conditions
agent: orchestrator
---

Read:
- `.opencode/plans/current-phase.md`
- `docs/releases/phase-registry.md`
- `.opencode/backlog/candidates.yaml` when it exists
- `AGENTS.md`

Use `bash scripts/dev/autoflow.sh inspect` as the source of truth for the current workflow state.

Execution model:
1. Run:
   - `bash scripts/dev/autoflow.sh inspect`
2. If the reported `NEXT_ACTION` is `repair-phase-metadata`, run:
   - `bash scripts/dev/repair-phase-metadata.sh`
   - `bash scripts/dev/autoflow.sh rerun-gate workflow-check`
   - then rerun `bash scripts/dev/autoflow.sh inspect`
3. If the reported `NEXT_ACTION` is `repair-backlog-phase-ref`, run:
   - `bash scripts/dev/repair-backlog-phase-ref.sh`
   - `bash scripts/dev/autoflow.sh rerun-gate workflow-check`
   - `bash scripts/dev/autoflow.sh rerun-gate repo-doctor`
   - then rerun `bash scripts/dev/autoflow.sh inspect`
4. If the reported `NEXT_ACTION` is `repair-backlog-selection`, run:
   - `bash scripts/dev/repair-backlog-selection.sh`
   - `bash scripts/dev/autoflow.sh rerun-gate workflow-check`
   - then rerun `bash scripts/dev/autoflow.sh inspect`
5. If the reported `NEXT_ACTION` is `repair-lockfile`, run:
   - `bash scripts/dev/repair-lockfile.sh`
   - `bash scripts/dev/autoflow.sh rerun-gate workflow-check`
   - then rerun `bash scripts/dev/autoflow.sh inspect`
6. If the reported `NEXT_ACTION` is `repair-working-tree`, run:
   - `bash scripts/dev/repair-working-tree.sh stash-unrelated`
   - then rerun `bash scripts/dev/autoflow.sh inspect`
7. If the reported `NEXT_ACTION` is `repair-preview-port`, run:
   - `bash scripts/dev/repair-preview-port.sh release --force-restart`
   - then rerun `bash scripts/dev/autoflow.sh inspect`
8. Allow at most 2 automatic repair attempts in one `/autoflow` run. If another repair would be required, stop and report the blocker.
9. If the reported `NEXT_ACTION` is `ship-phase`, delegate:
   - `/ship-phase`
   - then rerun `bash scripts/dev/autoflow.sh inspect`
10. If the reported `NEXT_ACTION` is `next-phase`, delegate:
    - `/next-phase`
    - then rerun `bash scripts/dev/autoflow.sh inspect`
11. If the reported `NEXT_ACTION` is `run-phase`, delegate:
    - `/run-phase`
    - `/validate-phase`
    - then rerun `bash scripts/dev/autoflow.sh inspect`
12. If the reported `NEXT_ACTION` is `stop-no-candidates`, stop and report that the workflow is healthy but no active backlog candidates remain.
13. If the reported `NEXT_ACTION` is `stop-blocked`, stop and report the exact blocker, the failed gate, and the next recommended manual command.
14. Never auto-ship unless validation is PASS and the current phase says `Ready to ship: yes`.

Hard limits:
- Do not use the repair loop for ambiguous product/runtime failures.
- Do not silently discard files.
- Do not auto-fix broad test failures.
- Do not exceed 2 repair attempts in one run.
- Stop immediately if scope drift touches product files outside the active phase.

Return at the end:
- what action(s) ran
- any repair(s) applied
- current phase title
- current validation state
- whether a phase was shipped
- whether another selectable phase remains
- exact next recommended command if manual input is required
