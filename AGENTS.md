# OpenCode Mobile Client — Hybrid Repo Rules

## Project intent

Build an iPhone-first OpenCode mobile client that is genuinely useful on a phone, not a compressed desktop clone.

This repository currently represents a mobile shell and client foundation. Do not imply live backend capability unless the active phase explicitly adds it.

## Control plane

Open remains the workflow control plane for this repository.

Authoritative workflow surfaces:
- `.opencode/plans/current-phase.md`
- `docs/releases/phase-registry.md`
- `.opencode/backlog/candidates.yaml`
- `.opencode/commands/*`
- `scripts/dev/autoflow.sh`
- `scripts/dev/workflow-check.sh`
- `scripts/dev/release-proof.sh`

Do not replace those repo-owned controls with generic agent behavior.

## Operating model

This repository is phase-driven.

Default workflow:
1. select the next phase
2. load the selected phase into `.opencode/plans/current-phase.md`
3. implement only that phase
4. validate against that phase
5. fix only validator-identified blockers when needed
6. ship only after validation passes
7. keep release surfaces synchronized

## Hybrid execution overlay

Use Agent Skills Main as a behavior overlay, not as a replacement runtime.

Rules:
- treat the current phase file as the active spec
- tighten unclear phases before implementation rather than guessing
- break work into the smallest verifiable implementation slices
- prefer test-first or verification-first changes when practical
- when a change depends on framework-specific or version-sensitive patterns, verify against official documentation before changing code
- for user-facing behavior, preserve mobile UX, narrow-screen readability, and safe-area correctness
- use strict review, validation, and ship discipline before marking work complete

## Universal rules

- Work from `.opencode/plans/current-phase.md`
- Do not implement future-phase work
- Keep changes as small as possible while still completing the phase
- Preserve readability over cleverness
- Avoid speculative abstractions
- Do not silently redesign architecture
- Prefer one coherent release over broad partial work
- Surface assumptions instead of silently inventing requirements
- When uncertain, choose the smaller shippable scope

## Product constraints

- iPhone-first
- portrait-first
- one-handed use matters
- safe-area awareness matters
- keyboard behavior is top-tier UX
- long outputs must remain readable on narrow screens
- avoid horizontal scrolling for primary content
- interruption, loading, and recovery states must remain understandable

## Agent model

- `orchestrator` controls phase selection and workflow state
- `builder` implements only the active phase
- `validator` determines PASS or FAIL without helping the phase pass
- `reviewer` performs a strict read-only review of changed work when requested
- `release-manager` syncs shipped-state metadata, creates the release commit, and pushes when safe

## Role overlays

Apply these discipline overlays inside the existing Open workflow:

- `orchestrator`
  - spec normalization
  - planning and task breakdown
  - context engineering
- `builder`
  - incremental implementation
  - test-driven or verification-first implementation
  - source-driven development for version-sensitive changes
  - frontend UI engineering for mobile-facing work
  - debugging and error recovery for narrow deterministic fixes
- `reviewer`
  - code review and quality
  - security and hardening
  - performance and accessibility review
- `validator`
  - strict scope validation
  - acceptance-criteria validation
  - browser-proof expectation for user-facing behavior when required
- `release-manager`
  - shipping and launch discipline
  - concise documentation and release notes
  - safe git workflow and versioning rules

## Non-negotiable boundary

Keep Open's workflow state, scripts, and release controls as the source of truth.
Import discipline from Agent Skills Main into prompts and commands only.
