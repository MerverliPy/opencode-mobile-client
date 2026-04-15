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

## Agent boundaries

- orchestrator may update workflow state but must not implement product code
- builder may implement product code but must not mark phases shipped
- validator must not implement product fixes
- reviewer must remain read-only
- release-manager may finalize release state only after PASS

## Command behavior

- commands should be small, explicit, and single-purpose
- commands should report blockers clearly
- commands should stop rather than guessing when a release invariant fails
