# OpenCode Mobile Client — Project Rules

## Project intent

Build an iPhone-first OpenCode mobile client that is genuinely useful on a phone, not a compressed desktop clone.

The primary delivery target is a PWA-quality mobile client with:
- app-like navigation
- readable conversation flows
- strong composer ergonomics
- usable tool/file/diff surfaces on narrow screens
- installability and mobile reliability

## Operating model

This repository is phase-driven.

The authoritative workflow is:
1. select the next phase
2. load the selected phase into `.opencode/plans/current-phase.md`
3. implement only that phase
4. validate against that phase
5. ship only after validation passes

## Scope discipline

Always obey these rules:
- Work from `.opencode/plans/current-phase.md`
- Do not implement work from future phases
- Do not silently redesign the architecture
- Do not introduce extra infrastructure unless required by the current phase
- Keep changes as small as possible while still completing the phase
- Prefer one coherent release over broad partial work

## Product constraints

- iPhone-first
- portrait-first
- one-handed use matters
- top and bottom bars must remain safe-area aware
- keyboard behavior is a top-tier UX concern
- long outputs must remain readable on narrow screens
- avoid horizontal scrolling for primary content
- mobile interactions must remain understandable under interruption, loading, and recovery states

## Documentation rules

When phase state changes:
- update `.opencode/plans/current-phase.md`
- update `docs/releases/phase-registry.md`

When validation runs:
- write PASS or FAIL in the current phase file
- include concise evidence

When a phase ships:
- mark the phase complete in the registry
- write a completion summary
- suggest release notes and a commit title
- do not perform a push unless explicitly asked

## Preferred implementation behavior

- Build the smallest useful increment
- Keep file count low
- Respect the phase's max-files-changed guidance
- Preserve readability over cleverness
- Avoid premature abstraction
- Do not add placeholder complexity for future phases unless the current phase requires it

## Agent roles

- `orchestrator` selects and advances work
- `builder` implements only the active phase
- `validator` checks phase compliance and release readiness
- `release-manager` closes the phase and prepares ship metadata
