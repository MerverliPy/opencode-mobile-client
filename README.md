# OpenCode Mobile Client

An iPhone-first mobile shell for OpenCode, designed for useful daily mobile use and shipped in small, ready-to-use releases.

## Release baseline

The current release baseline is `v1.6.0`, aligned with the `package.json` version `1.6.0` and the runtime release badge.

Phase 14 reconciled older duplicate release docs, release-proof workflow state, and browser-validation commands around that baseline. Treat `.opencode/plans/current-phase.md` and `docs/releases/phase-registry.md` as the authoritative workflow surfaces.

The running app is still a local-first mobile shell with mock-backed task replies, file viewing, diff review, installability, and offline-aware shell behavior.

The next planned release target is `v1.8.0`, which is scoped to adding durable remote run lifecycle states and reconnect controls in the mobile shell while keeping the shipped app honest about its current mock-backed, local-first behavior.

## Current product reality

This repository currently ships a local-first mobile shell, not a live backend client.

- sessions and shell state persist on the current device
- task replies, file views, and diff review are shell or mock-backed experiences for mobile workflow validation
- online and offline indicators reflect browser connectivity and install or reload conditions, not a live OpenCode session
- the product is being delivered in small phases before any real transport or authentication work exists

## Product direction

This project is a mobile-first OpenCode shell optimized for:
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

Use `npm run repo:doctor` before starting a new phase when you want a fast health check for release-state truth, clean-install reproducibility, and workflow-file presence.

## Delivery rules

- One phase at a time
- One release per phase
- Every phase must end in a usable state
- No hidden scope expansion
- Current phase state lives in `.opencode/plans/current-phase.md`
- Release tracking lives in `docs/releases/phase-registry.md`
- `/ship-phase` creates the release commit automatically
- `/ship-phase` pushes to `origin main` only when the current branch is already `main`

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
- `.opencode/backlog/candidates.yaml` — deterministic next-phase candidate list for post-release work
- `.opencode/commands/` — slash commands for phase execution
- `.opencode/plans/current-phase.md` — authoritative current phase file
- `docs/releases/` — release phases and registry
