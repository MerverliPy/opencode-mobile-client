# Current Phase

Status: complete
Release: v1.4.0
Phase file: docs/releases/phase-12-runtime-adapter-boundary.md

## Goal

Replace inline synthetic runtime generation with a clear adapter boundary so the client stops faking backend behavior inside the UI layer.

## Why this phase is next

The product can remain usable as a mock-backed shell, but the runtime contract needs to be explicit. This phase creates the seam needed for future real transport work without pretending that transport already exists.

## In scope

- introduce a runtime adapter contract
- route reply generation and tool or diff payload generation through the adapter
- keep a default mock adapter for current local usability
- make the active adapter source visible in the UI or developer-facing state
- remove direct inline synthetic generation from the main UI flow

## Out of scope

- live backend transport
- authentication
- remote persistence
- websocket or streaming implementation
- multi-device sync

## Primary files

- src/main.js
- src/adapters/*
- src/app/*
- src/state/*
- README.md

## Expected max files changed

8

## Acceptance criteria

- reply and tool output creation flow through an explicit adapter layer
- the mock adapter remains usable for local demo and shell testing
- the UI no longer hides that mock behavior behind production-like language
- future transport work has a clear integration seam
- npm run build passes

## Validation

Status: PASS

Evidence:
- `src/adapters/mock-runtime.js` now defines the explicit mock runtime seam, including `createStarterSessionPayload()` for starter tool and diff payloads and `respond()` for follow-up assistant reply, file, and diff generation.
- `src/state/session-state.js` creates starter session payloads through `runtimeAdapter.createStarterSessionPayload()`, and `src/main.js` routes follow-up reply and generated tool output through `runtimeAdapter.respond(...)`, removing direct inline synthetic generation from the main UI flow.
- The active adapter source is visible in Settings as `Local mock adapter`, while task and loading copy continue to describe the experience as local and mock-backed rather than implying live backend behavior.
- The implemented product changes stay within the active phase scope (`src/main.js`, `src/state/session-state.js`, `src/adapters/mock-runtime.js`) and do not add live transport, authentication, remote persistence, streaming, or sync behavior.
- `npm run build` passes.

Blockers:
- none

Ready to ship:
- yes

## Release notes

- Routed starter and follow-up mock reply, file, and diff generation through an explicit mock runtime adapter.
- Exposed the active runtime source in-app while keeping shell copy honest about local mock-backed behavior.

## Completion summary

Phase 12 shipped v1.4.0 by moving mock runtime generation behind an explicit adapter seam while preserving the local mobile shell experience.
