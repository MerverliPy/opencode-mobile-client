# ADR-003: Require browser proof for user-facing shell changes

## Status
Accepted

## Context

The repo already uses local validation and release-proof flows to keep the iPhone-first shell honest.

Pure unit and build checks are not enough for:

- narrow-screen readability
- drawer continuity
- offline and recovery messaging
- install and shell navigation behavior

## Decision

Any phase that changes user-facing shell behavior must keep browser-facing proof in the release workflow.

Local CI may enforce bounded code-quality gates, but browser proof remains part of release readiness rather than a generic always-on hosted CI requirement.

## Consequences

- browser smoke and release proof remain authoritative for UX-sensitive phases
- hosted CI stays fast and bounded
- shipping still requires stronger evidence than pull-request lint/test/build checks alone
