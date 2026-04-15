# Release File Rules

## Scope

These instructions apply to release files under `docs/releases/`.

## Formatting rules

Each phase file should include:
- Current Phase
- Status
- Release
- Phase file
- Goal
- Why this phase is next
- In scope
- Out of scope
- Primary files
- Expected max files changed
- Acceptance criteria
- Validation
- Release notes
- Completion summary

## Registry rules

- phases should appear in release order
- only one active in-progress phase should exist at a time unless explicitly blocked
- shipped phases must be marked `[x]`
- planned phases must be marked `[ ]`

## Release sync rules

When a phase ships, release naming and shipped-state metadata should agree across:
- the phase file
- `.opencode/plans/current-phase.md`
- `docs/releases/phase-registry.md`
- runtime version display if present
- `package.json` version if used as the shipped app version
