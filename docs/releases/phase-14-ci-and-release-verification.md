# Current Phase

Status: ready
Release: v1.6.0
Phase file: docs/releases/phase-14-ci-and-release-verification.md

## Goal

Automate the core release verification path so broken releases are harder to ship.

## Why this phase is next

Once local lint, test, and build commands exist, the next step is to run them automatically on GitHub so release confidence does not depend on memory or manual discipline alone.

## In scope

- add GitHub Actions CI for install, lint, test, and build
- run CI on push and pull request
- keep the workflow small and understandable
- document the release verification path briefly if needed
- preserve the existing small-release workflow

## Out of scope

- deployment automation
- preview environment infrastructure
- code coverage services
- release tagging automation
- large CI matrix expansion

## Primary files

- .github/workflows/ci.yml
- package.json
- README.md

## Expected max files changed

4

## Acceptance criteria

- CI runs on GitHub for the main verification path
- CI fails when lint, test, or build fail
- local verification commands still match CI behavior
- the repo remains easy to operate from the existing workflow
- npm run lint && npm run test && npm run build passes locally

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
