# Align browser-proof command surfaces with the real runner and proof flow

Status: pending
Release: v1.7.0
Phase file: backlog:browser-proof-command-surface-alignment

## Goal
Make the browser-proof command docs describe the real supported repo-root execution path instead of a split MCP-versus-script story.

## Why this phase is next
Once the runner is truthful, the operator commands must match it exactly or the workflow will drift again.

## Primary files
- .opencode/commands/browser-smoke.md
- .opencode/commands/browser-offline.md
- .opencode/commands/screenshot-capture.md
- .opencode/commands/release-proof.md

## Expected max files changed
4

## Risk
Low. This is command-truth alignment only.

## Rollback note
Revert the four command docs together if the updated wording causes scope drift.

## In scope
- align browser smoke, offline, screenshot, and release-proof command docs to the real repo-owned runner
- document actual prerequisites and artifact expectations
- keep commands single-purpose and bounded

## Out of scope
- runner implementation changes
- phase registry edits
- release notes edits
- unrelated workflow refactors

## Tasks
- rewrite the four command docs to match the repaired runner
- remove unsupported hidden dependency claims
- keep artifact names and route expectations consistent with the implementation

## Validation command
npm run workflow:check && npm run browser:smoke && npm run release:proof

## Validation
Status: pending
Evidence:
- not run yet
Blockers:
- not validated yet
Ready to ship:
- no

## Acceptance criteria
- each browser-proof command document matches the real supported repo-root execution path
- documented prerequisites and artifact expectations match implemented runner behavior
- the command set no longer claims an unsupported or hidden execution dependency
- the phase stays bounded to command truth and operator guidance only

## Completion summary
pending
