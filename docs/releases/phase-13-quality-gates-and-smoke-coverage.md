# Current Phase

Status: complete
Release: v1.5.0
Phase file: docs/releases/phase-13-quality-gates-and-smoke-coverage.md

## Goal

Add enforceable quality gates so the shell can be changed with more confidence.

## Why this phase is next

After the shell becomes modular and adapter-backed, the repo should stop depending mostly on manual validation and build-only confidence. This phase adds repeatable local verification.

## In scope

- add linting
- add test scripts
- add focused smoke tests for pure logic and core shell behavior
- validate storage hydration or normalization logic
- validate adapter normalization or mock behavior
- keep validation commands straightforward for the existing workflow

## Out of scope

- large end-to-end browser automation
- visual regression tooling
- backend contract testing
- performance benchmarking suite
- unrelated refactors

## Primary files

- package.json
- eslint.config.*
- vitest.config.*
- tests/*
- src/state/*
- src/adapters/*
- src/lib/*

## Expected max files changed

10

## Acceptance criteria

- npm run lint exists and passes
- npm run test exists and passes
- npm run build still passes
- smoke coverage exists for the highest-risk pure logic areas
- validation commands are simple enough to run inside the repo workflow

## Validation

Status: PASS

Evidence:
- `package.json` now provides `npm run lint` and `npm run test`, `eslint.config.js` adds a minimal local lint gate, and the active release metadata is aligned to `v1.5.0` / `1.5.0` for workflow use.
- `tests/quality-gates.smoke.test.js` adds focused smoke coverage for the highest-risk pure-logic areas in this shell release: storage hydration and legacy fallback, shell and session persistence behavior, tool-result normalization and diff helpers, session-state helpers, shell-state helpers, and mock adapter behavior.
- `scripts/dev/workflow-check.sh` now supports the active phase's pre-validation `pending` state while still enforcing release and runtime metadata consistency, keeping local validation commands straightforward inside the repo workflow.
- `npm run workflow:check`, `npm run lint`, `npm run test`, and `npm run build` all pass.
- The implemented changes stay within phase scope and do not add end-to-end browser automation, visual regression tooling, backend contract testing, performance benchmarking, or unrelated refactors.

Blockers:
- none

Ready to ship:
- yes

## Release notes

- Added local `lint`, `test`, `build`, and workflow checks that now run cleanly for the phase release.
- Added focused smoke coverage for storage, session and shell helpers, tool-result normalization, and mock adapter behavior.

## Completion summary

Phase 13 shipped v1.5.0 by adding enforceable local quality gates and focused smoke coverage for the shell's highest-risk pure-logic paths.
