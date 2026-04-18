# ADR-001: Keep Open as the workflow control plane

## Status
Accepted

## Context

The repository already has repo-owned workflow state and enforcement surfaces:

- `.opencode/plans/current-phase.md`
- `docs/releases/phase-registry.md`
- `.opencode/backlog/candidates.yaml`
- `.opencode/commands/*`
- `scripts/dev/autoflow.sh`
- `scripts/dev/workflow-check.sh`
- `scripts/dev/release-proof.sh`

Agent Skills Main adds useful execution discipline, but it does not replace the repo-specific phase engine, repair flow, release-proof checks, or backlog truth.

## Decision

Open remains the control plane.

Agent Skills style and skill overlays may shape agent behavior, but they must not replace:

- workflow state files
- backlog truth
- release metadata
- deterministic shell-based checks

## Consequences

- workflow truth remains repo-owned and auditable
- agent prompts can become stricter without displacing real enforcement
- `/autoflow` remains the single-owner workflow loop
- future agent-skill imports should prefer additive commands, ADRs, and checklists over runtime replacement
