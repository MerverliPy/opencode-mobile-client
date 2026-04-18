# Workflow Rules

## Scope

These instructions apply to workflow files, agents, commands, and phase-planning state under `.opencode/`.

## Workflow invariants

- `.opencode/plans/current-phase.md` is the authoritative active-phase file
- `docs/releases/phase-registry.md` must reflect shipped and in-progress state accurately
- a phase must not ship unless validation status is PASS
- shipped-state surfaces must stay synchronized:
  - `docs/releases/phase-registry.md`
  - `.opencode/plans/current-phase.md`
  - runtime-visible release tag if present
  - `package.json` version if it represents shipped versioning

## Control-plane rule

Open's workflow files and scripts are authoritative.
Agent-skills behavior is an overlay for how agents reason and execute inside that workflow.

Do not:
- replace repo workflow state with generic plans
- invent a separate task runtime
- bypass `scripts/dev/autoflow.sh`, `scripts/dev/workflow-check.sh`, or `scripts/dev/release-proof.sh`
- mark shipped state complete from inference alone

## Agent boundaries

- orchestrator may update workflow state but must not implement product code
- builder may implement product code but must not mark phases shipped
- validator must not implement product fixes
- reviewer must remain read-only
- release-manager may finalize release state only after PASS

## Role-to-discipline mapping

- orchestrator
  - spec normalization
  - planning and task breakdown
  - context engineering
- builder
  - incremental implementation
  - test-driven or verification-first execution
  - source-driven development when patterns are version-sensitive
  - frontend UI discipline for user-facing work
- reviewer
  - correctness
  - scope compliance
  - maintainability
  - security
  - performance
  - accessibility
- validator
  - strict PASS/FAIL evidence
  - release-readiness checks
  - browser-proof expectations for relevant user-facing work
- release-manager
  - shipping discipline
  - concise docs and release notes
  - safe git and versioning behavior

## Command behavior

- commands should be small, explicit, and single-purpose
- commands should report blockers clearly
- commands should stop rather than guessing when a release invariant fails
- commands should prefer the smallest deterministic next action
- commands should not widen phase scope to make validation easier

## Anti-drift rules

- do not silently convert a phase into a broader redesign
- do not add polish outside the active acceptance criteria
- do not treat future-phase ideas as implied requirements
- do not use review or validation to request speculative architecture work
- when a phase file is underspecified, normalize it before implementation instead of guessing
