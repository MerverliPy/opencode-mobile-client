# Current Phase

Status: ready
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

Status: pending

Evidence:
- pending

Blockers:
- none

Ready to ship:
- no

## Release notes

- pending

## Completion summary

pending
