# Repair backlog selection so only true candidates remain selectable

Status: complete
Release: v1.6.0
Phase file: backlog:backlog-selection-determinism

## Goal

Repair backlog selection so only true selectable candidates remain in the active backlog set and completed or deferred work cannot be reselected accidentally.

## Why this phase is next

The prior backlog phase has shipped, all release phases remain complete, and this is now the highest-priority remaining bounded backlog candidate in the same workflow module with clear deterministic validation.

## Primary files

- `.opencode/backlog/candidates.yaml`
- `scripts/dev/autoflow.sh`
- `scripts/dev/repair-backlog-selection.sh`
- `scripts/dev/workflow-check.sh`
- `.opencode/commands/next-phase.md`

## Expected max files changed

5

## Risk

Medium. This changes authoritative backlog selection state, so the repair must stay tightly bounded to candidate counting and selection behavior.

## Rollback note

Revert the backlog-state and selection-logic changes together so candidate eligibility and workflow counting return to the prior behavior as one unit.

## In scope

- ensure only entries under `candidates` are treated as selectable backlog work
- remove shipped backlog work from active candidate selection surfaces
- exclude deferred ideas from active candidate counting and next-phase selection
- keep the repair bounded to workflow state and backlog-selection logic only

## Out of scope

- product runtime or UI changes
- validation-metadata parser changes beyond what is already shipped
- release-proof artifact generation or shipping work for later phases
- dependency upgrades or unrelated workflow refactors

## Tasks

- align backlog candidate counting with the `candidates` section only
- ensure shipped backlog items no longer remain selectable after shipping
- confirm deferred ideas do not influence next-phase selection or autoflow state

## Validation command

`npm run workflow:check && bash scripts/dev/autoflow.sh inspect && npm run repo:doctor`

## Validation

Status: PASS
Evidence:
- `npm run workflow:check` passed on 2026-04-16.
- `bash scripts/dev/autoflow.sh inspect` reported `ACTIVE_CANDIDATE_COUNT=9`, confirming deferred and archived entries are excluded from selectable backlog counting.
- `npm run repo:doctor` passed on 2026-04-16 with the active backlog phase reference intact.
Blockers:
- none
Ready to ship:
- no

## Acceptance criteria

- Only entries under `candidates` are treated as selectable backlog work.
- Shipped backlog items no longer remain under selectable candidates.
- Deferred ideas are excluded from active candidate counting and next-phase selection.
- The repair stays bounded to workflow state and backlog-selection logic.

## Release notes

- Limited selectable backlog counting to the `candidates` section only.
- Preserved deferred backlog ideas outside the active selection surface while keeping archived entries valid for shipped references.

## Completion summary

- Updated backlog counting and selection logic so `deferred_local_first_candidates` no longer inflate active candidate totals.
- Kept backlog-repair normalization preserving deferred entries while moving shipped work out of selectable candidates.
- Clarified next-phase instructions so only `candidates` entries are selectable.
- Archived the shipped backlog candidate and recorded the shipped phase in the registry.
