# Runtime adapter contract

## Purpose

Define the stable boundary between the mobile UI shell and any runtime implementation.

The UI must talk to runtime adapters through this contract instead of depending on inline backend assumptions.

## Current adapters

- `src/adapters/mock-runtime.js`
- `src/adapters/remote-runtime.js`

## Core identity surface

Every runtime adapter must expose:

- `id: string`
- `sourceLabel: string`
- `createStarterSessionPayload(): object`
- `respond(input): object`

### Required identity rules

- `id` must be stable for persisted-session hydration
- `sourceLabel` must describe the runtime honestly to the user
- adapters must not imply live backend capability unless the active runtime is genuinely configured

## Starter session contract

`createStarterSessionPayload()` must return an object with:

- `toolResults: array`
- optional `diffToolResultId: string`

### Rules

- `toolResults` must be normalized into persisted-session-safe tool result objects
- if `diffToolResultId` is present, it must reference an entry inside `toolResults`
- starter payload generation must not mutate UI state directly

## Response contract

`respond({ prompt, sessionTitle, ... })` must return an object with:

- `assistantMessage: object`
- `toolResults: array`

### Assistant message rules

`assistantMessage` must include:

- `id: string`
- `role: 'assistant'`
- `label: string`
- `text: string`
- optional `toolResultId: string`

### Response rules

- returned tool results must be normalized and persistence-safe
- `toolResultId`, when present, must reference a returned tool result
- response text must remain honest about runtime capabilities
- adapters must not leak transport-only details into baseline UI copy unless the phase explicitly requires it

## Remote runtime extension surface

Remote-capable adapters may additionally expose:

- `mode: 'configured' | 'mock-fallback'`
- `isConfigured: boolean`
- `backendBaseUrl: string`
- `fallbackAdapterId: string`
- `startRun(input): Promise<object>`
- `resumeRun(input): Promise<object>`
- `cancelRun(input): Promise<object>`
- `fetchRunStatus(input): Promise<object>`
- `hydrateCompletedRun(result): object`
- `fetchPreviewLinks(input): Promise<object>`

## Remote operation result contract

Remote operation results must preserve these fields when applicable:

- `ok: boolean`
- `operation: string`
- `status: string`
- `reason: string` when `ok` is false
- `details: string` when useful for debugging
- `requestUrl: string` when a backend request was attempted
- `remoteRun: { runId, status, updatedAt }`
- `assistantResponse: { text, label } | null`

### Rules

- unconfigured remote adapters must fail honestly with an unsupported result instead of pretending success
- missing required inputs such as `runId` must return a deterministic error result
- `hydrateCompletedRun()` must only succeed when the run is completed and assistant output is present

## Persistence and migration rules

- adapter ids are part of the persisted session surface
- changes to persisted runtime metadata require a migration review
- removal or renaming of adapter ids must include backward-compatibility handling or an explicit migration plan

## Validation expectations

Any adapter change should prove:

- `npm run test`
- `npm run build`
- contract coverage for both mock and remote adapters
- honest runtime labeling in the UI when user-visible copy changes
