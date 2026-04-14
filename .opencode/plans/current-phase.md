# Current Phase

Status: complete
Release: v0.1.0
Phase file: docs/releases/phase-01-app-shell.md

## Goal

Create the first running mobile app shell for the OpenCode client project.

## Why this phase is next

The project needs a working shell before navigation and task surfaces can be built.

## In scope

- initial app shell
- mobile-first layout foundation
- portrait-first assumptions
- safe top and bottom frame structure
- blank placeholder screen for initial launch

## Out of scope

- real sessions
- conversation rendering
- composer behavior
- tool output surfaces
- diff viewing
- install prompts

## Primary files

- app shell entry files
- global layout files
- root screen files
- app-level style tokens or theme files

## Expected max files changed

8

## Acceptance criteria

- app opens into a stable mobile shell
- top and bottom framing do not feel desktop-derived
- shell clearly targets narrow screens
- result is usable as the starting point for the next phase

## Validation

Status: PASS

Evidence:
- `npm run build` passes and produces a working app bundle for the shell.
- `index.html`, `src/main.js`, and `src/styles.css` implement a single-column mobile shell with safe-area-aware top and bottom framing.
- Delivered UI is a blank placeholder launch screen only; no sessions, conversation rendering, composer, tool surfaces, diff viewing, or install prompts were added.
- File count remains within the phase guidance and the result is a usable foundation for Phase 02 navigation work.

Blockers:
- none

Ready to ship:
- yes

## Release notes

- Added the first runnable mobile app shell using a minimal Vite setup.
- Added safe-area-aware top and bottom framing with a blank placeholder launch screen.

## Completion summary

Phase 01 shipped a stable portrait-first shell that opens into a readable mobile frame and provides the base for Phase 02 navigation work.
