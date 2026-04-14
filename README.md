# OpenCode Mobile Client

An iPhone-first mobile UI for OpenCode, designed for useful daily mobile use and shipped in small, ready-to-use releases.

## Product direction

This project is a mobile-first OpenCode client optimized for:
- one-handed iPhone use
- readable long-running agent output
- compact task execution on narrow screens
- staged delivery through small release phases
- PWA-first deployment with room for a later native wrapper if justified

## Working model

This repository is operated through OpenCode phase commands.

The normal workflow is:
1. `/phase-status`
2. `/next-phase`
3. `/run-phase`
4. `/validate-phase`
5. `/ship-phase`

## Delivery rules

- One phase at a time
- One release per phase
- Every phase must end in a usable state
- No hidden scope expansion
- Current phase state lives in `.opencode/plans/current-phase.md`
- Release tracking lives in `docs/releases/phase-registry.md`

## UX rules

- iPhone-first, portrait-first
- Safe-area-aware top and bottom surfaces
- No critical action hidden behind dense menus
- Thumb-friendly primary actions
- No desktop-style multi-panel layouts in early releases
- Prefer clarity over feature count

## Repository structure

- `AGENTS.md` — project operating rules for OpenCode
- `opencode.json` — project-local OpenCode configuration
- `.opencode/agents/` — workflow-specific agents
- `.opencode/commands/` — slash commands for phase execution
- `.opencode/plans/current-phase.md` — authoritative current phase file
- `docs/releases/` — release phases and registry
