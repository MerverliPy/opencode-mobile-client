---
description: Execute the active phase end-to-end with bounded repairs and strict stop conditions
agent: orchestrator
---

Read:
- `.opencode/plans/current-phase.md`
- `docs/releases/phase-registry.md`
- `.opencode/backlog/candidates.yaml` when it exists
- `AGENTS.md`
- `.opencode/AGENTS.md`

You may also read these command files as behavioral references:
- `.opencode/commands/next-phase.md`
- `.opencode/commands/run-phase.md`
- `.opencode/commands/validate-phase.md`
- `.opencode/commands/fix-validation.md`
- `.opencode/commands/ship-phase.md`

Use `bash scripts/dev/autoflow.sh inspect-json` as the workflow source of truth.

Core rule:
- `/autoflow` is the single-owner controller for the workflow loop.
- Do not hand control back to the operator for `/run-phase`, `/validate-phase`, `/fix-validation`, `/ship-phase`, or `/next-phase` unless a hard stop is reached.
- Do not stop with “recommended next command: /run-phase” when you can safely execute the phase yourself.

Execution overlay:
- normalize weak phase text before implementation instead of guessing
- use planning and task-breakdown discipline to keep the phase bounded
- use builder discipline for incremental implementation
- use validator discipline for strict PASS/FAIL evidence
- use release-manager discipline only after PASS and ready-to-ship evidence

Execution loop:
1. Run:
   - `bash scripts/dev/autoflow.sh inspect-json`
2. If the reported `next_action` is one of the deterministic repair actions below, apply it immediately, rerun the required gate, then rerun `bash scripts/dev/autoflow.sh inspect-json`:
   - `repair-phase-metadata`
     - `bash scripts/dev/repair-phase-metadata.sh`
     - `bash scripts/dev/autoflow.sh rerun-gate workflow-check`
   - `repair-backlog-phase-ref`
     - `bash scripts/dev/repair-backlog-phase-ref.sh`
     - `bash scripts/dev/autoflow.sh rerun-gate workflow-check`
     - `bash scripts/dev/autoflow.sh rerun-gate repo-doctor`
   - `repair-backlog-selection`
     - `bash scripts/dev/repair-backlog-selection.sh`
     - `bash scripts/dev/autoflow.sh rerun-gate workflow-check`
   - `repair-lockfile`
     - `bash scripts/dev/repair-lockfile.sh`
     - `bash scripts/dev/autoflow.sh rerun-gate workflow-check`
   - `repair-working-tree`
     - `bash scripts/dev/repair-working-tree.sh stash-unrelated`
   - `repair-preview-port`
     - `bash scripts/dev/repair-preview-port.sh release --force-restart`
3. Allow at most 2 automatic repair-script attempts in one `/autoflow` run. If another repair-script pass would be required, stop and report the blocker.
4. If the current phase title is the generic `Current Phase` and `phase_file` is `backlog:<candidate-id>`, normalize the H1 in `.opencode/plans/current-phase.md` to the matching backlog candidate title before continuing.
5. If the active phase is underspecified, normalize the goal, scope boundaries, acceptance criteria, and validation command before handing off to implementation. Do not widen scope while doing so.
6. If `next_action` is `next-phase`, execute the next-phase selection logic inline:
   - select the correct next phase
   - overwrite `.opencode/plans/current-phase.md`
   - rerun `bash scripts/dev/autoflow.sh inspect-json`
7. If `next_action` is `run-phase`, execute the active phase inline with builder discipline:
   - read `.opencode/plans/current-phase.md`
   - set top-level `Status:` to `in_progress` when implementation begins
   - implement only the active phase
   - obey in-scope and out-of-scope boundaries exactly
   - prefer the smallest usable increment
   - keep file count at or below the stated maximum when possible
   - avoid future-phase work
   - when a change depends on framework-specific or version-sensitive patterns, verify official docs before changing code
   - after implementation, run the exact `validation_command` from the current phase
8. Immediately after implementation, execute validation inline with validator discipline:
   - always run `npm run workflow:check` first
   - validate strictly against:
     - goal
     - in-scope items
     - out-of-scope boundaries
     - acceptance criteria
     - the stated validation command
   - if user-facing browser proof is relevant, require the repo release-proof flow before declaring ready to ship
   - update `## Validation` in `.opencode/plans/current-phase.md` with:
     - `Status: PASS` or `Status: FAIL`
     - `Evidence:`
     - `Blockers:`
     - `Ready to ship:`
       - `yes` or `no`
   - if validation is PASS, set the top-level phase `Status:` to `complete`
9. If inline validation returns FAIL, allow one bounded fix pass only when the blockers are deterministic and narrow:
   - act with fix-validation discipline
   - address only validator blockers
   - do not expand scope
   - rerun `npm run workflow:check`
   - rerun the exact phase validation command
   - revalidate once
   - if still FAIL, stop and report the blockers
10. If `next_action` is `validate-phase`, run validation inline now instead of delegating.
11. If `next_action` is `fix-validation`, run the bounded validation-fix pass inline now instead of delegating.
12. If `next_action` is `ship-phase`, execute shipping inline with release-manager discipline:
   - continue only if validation is PASS and `Ready to ship:` is `yes`
   - run or confirm `npm run release:proof` when browser proof is relevant
   - synchronize release-state surfaces
   - mark the current phase complete in `docs/releases/phase-registry.md`
   - finalize release notes and completion summary in `.opencode/plans/current-phase.md`
   - generate the release commit title and body
   - verify the current git branch is `main`
   - if on `main`, stage the relevant release changes, commit, and push to `origin main`
   - rerun `bash scripts/dev/autoflow.sh inspect-json`
13. If `next_action` is `stop-no-candidates`, stop and report that the workflow is healthy but no active backlog candidates remain.
14. If `next_action` is `stop-blocked`, stop and report:
   - the exact blocker
   - the failed gate or invariant
   - the manual next command from `bash scripts/dev/autoflow.sh manual-next-command`

Hard limits:
- Do not use the repair loop for ambiguous product/runtime failures.
- Do not silently discard files.
- Do not auto-fix broad test failures.
- Do not exceed 2 automatic repair-script attempts in one run.
- Do not exceed 1 targeted validator-fix attempt in one run.
- Stop immediately if scope drift touches product files outside the active phase.

Return at the end:
- what action(s) ran
- any repair(s) applied
- current phase title
- current validation state
- whether a phase was shipped
- whether another selectable phase remains
- exact next recommended command if manual input is required
