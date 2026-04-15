# Current Phase

Status: ready
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
