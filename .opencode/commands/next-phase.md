---
description: Select the correct next implementation phase and load it into the current phase file
agent: orchestrator
---

Read in this order:
- `.opencode/plans/current-phase.md`
- `docs/releases/phase-registry.md`
- `.opencode/backlog/candidates.yaml` when it exists

Selection rules:
1. If the current phase is still in progress or failed, keep it active unless the user explicitly changes scope.
2. If the current release phase is complete and there is another incomplete release phase in `docs/releases/phase-registry.md`, select that release phase.
3. If all listed release phases are already complete, select the next work item from `.opencode/backlog/candidates.yaml`.
4. When selecting from backlog candidates, apply this deterministic order:
   - explicit user scope
   - highest priority
   - same module follow-up
   - smallest safe scope
   - clearest validation
5. Never select a generic or multi-module task when a smaller bounded candidate exists.

When the chosen work item is a release phase file in `docs/releases/`, copy that file into `.opencode/plans/current-phase.md`.

When the chosen work item is a backlog candidate, overwrite `.opencode/plans/current-phase.md` with a bounded implementation phase using this structure:
- `# Current Phase`
- `Status: pending`
- `Release: <current shipped release>`
- `Phase file: backlog:<candidate-id>`
- `## Goal`
- `## Why this phase is next`
- `## Primary files`
- `## Expected max files changed`
- `## Risk`
- `## Rollback note`
- `## In scope`
- `## Out of scope`
- `## Tasks`
- `## Validation command`
- `## Validation`
- under `## Validation`, write `Status: pending`
- under `## Validation`, include `Evidence:` followed by `- not run yet`
- `## Acceptance criteria`
- `## Completion summary`

When copying a release phase file into `.opencode/plans/current-phase.md`, normalize the copied phase so its `## Validation` section starts with `Status: pending` for a newly selected active phase.

If the selected release phase was `[ ]`, mark it `[~]` in the registry.

Then respond with:
- active phase title
- release tag
- why it was selected
- in-scope summary
- out-of-scope summary
- validation command
- recommended next command

Do not implement code in this command.
