# Runtime and storage migration checklist

Use this checklist whenever a change affects:

- adapter ids
- persisted runtime metadata
- storage keys
- session shape
- repo binding shape
- remote run shape
- renamed or removed user-facing session actions

## Required questions

- What persisted fields change?
- Can older local data still hydrate safely?
- Does the change require a migration shim?
- Does the change require a fallback for old adapter ids?
- What user-visible behavior changes if older stored data is present?
- What rollback path exists if shipped migration logic is wrong?

## Required implementation checks

- preserve backward hydration where practical
- prefer additive fields over destructive shape changes
- keep safe defaults for missing fields
- do not silently discard valid stored sessions without an explicit product reason
- keep runtime source labeling honest after migration

## Required validation

- `npm run test`
- `npm run build`
- manual verification of at least one older stored-state sample when persistence changes materially
- release notes mention migration-sensitive behavior when applicable

## Ship checklist

Before shipping a migration-sensitive change, confirm:

- old local state can still load safely, or the loss is explicitly documented
- runtime metadata defaults remain valid
- changed actions remain understandable on a phone
- rollback instructions are written when the change is not trivially reversible
