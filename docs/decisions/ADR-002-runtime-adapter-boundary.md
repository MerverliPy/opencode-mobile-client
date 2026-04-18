# ADR-002: Preserve an explicit runtime adapter boundary

## Status
Accepted

## Context

The mobile client supports a local mock runtime today and a remote runtime bridge shape for later transport work.

Without a stable adapter boundary, product code would drift back toward inline synthetic response generation or transport-specific assumptions in the UI layer.

## Decision

Keep runtime behavior behind explicit adapters and preserve a documented contract for both mock and remote runtimes.

The runtime contract is defined in `docs/contracts/runtime-adapter-contract.md` and covered by `tests/runtime-adapters.contract.test.js`.

## Consequences

- UI flows can evolve without hard-coding backend behavior
- mock and remote runtimes must preserve stable session and tool-result surfaces
- runtime adapter ids become migration-sensitive persisted data
- future transport work must extend the contract instead of bypassing it
