# OpenCode Mobile Client — Repo Rules

## Project intent

Build an iPhone-first OpenCode mobile client that is genuinely useful on a phone, not a compressed desktop clone.

This repository currently represents a mobile shell and client foundation. Do not imply live backend capability unless the active phase explicitly adds it.

## Operating model

This repository is phase-driven.

Default workflow:
1. select the next phase
2. load the selected phase into `.opencode/plans/current-phase.md`
3. implement only that phase
4. validate against that phase
5. fix only validator-identified blockers when needed
6. ship only after validation passes
7. keep release surfaces synchronized

## Universal rules

- Work from `.opencode/plans/current-phase.md`
- Do not implement future-phase work
- Keep changes as small as possible while still completing the phase
- Preserve readability over cleverness
- Avoid speculative abstractions
- Do not silently redesign architecture
- Prefer one coherent release over broad partial work

## Product constraints

- iPhone-first
- portrait-first
- one-handed use matters
- safe-area awareness matters
- keyboard behavior is top-tier UX
- long outputs must remain readable on narrow screens
- avoid horizontal scrolling for primary content
- interruption, loading, and recovery states must remain understandable

## Agent model

- `orchestrator` controls phase selection and workflow state
- `builder` implements only the active phase
- `validator` determines PASS or FAIL without helping the phase pass
- `reviewer` performs a strict read-only review of changed work when requested
- `release-manager` syncs shipped-state metadata, creates the release commit, and pushes when safe
