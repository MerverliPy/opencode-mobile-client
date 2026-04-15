# Current Phase

Status: ready
Release: v1.3.0
Phase file: docs/releases/phase-11-shell-modularization-foundation.md

## Goal

Reduce implementation risk by splitting the single-file shell into small maintainable modules while preserving current behavior.

## Why this phase is next

Once product truth is corrected, the next major risk is implementation concentration inside src/main.js. Before adding a cleaner runtime seam, the shell should become easier to reason about, test, and change safely.

## In scope

- extract session and shell state helpers into dedicated modules
- extract local storage and hydration logic into dedicated modules
- extract tool drawer and diff viewer helpers into dedicated modules
- keep current UX and interaction behavior materially unchanged
- keep the app boot path simple and readable

## Out of scope

- behavior redesign
- real backend integration
- new major product features
- CSS framework migration
- broad visual restyling

## Primary files

- src/main.js
- src/app/*
- src/state/*
- src/ui/*
- src/lib/*

## Expected max files changed

10

## Acceptance criteria

- src/main.js becomes primarily composition and bootstrapping
- core shell responsibilities are extracted into small focused modules
- current mobile UX still behaves the same from a user perspective
- no major feature scope is added
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
