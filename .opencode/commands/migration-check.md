---
description: Review runtime or storage changes for migration risk before shipping
agent: reviewer
---

Read:
- `.opencode/plans/current-phase.md`
- `docs/migrations/runtime-and-storage-migration-checklist.md`
- changed files under `src/adapters/`, `src/state/`, and related storage/runtime surfaces when present

Use this command when the active phase changes:
- adapter ids
- persisted runtime metadata
- storage keys
- session shape
- repo binding shape
- remote run shape
- renamed or removed user-facing session actions

Return:
- migration risk: low, medium, or high
- persisted surfaces affected
- backward-compatibility expectations
- rollback expectations
- release-note requirement: yes or no
- hard blockers
- optional follow-ups

Remain read-only.
Do not implement code in this command.
