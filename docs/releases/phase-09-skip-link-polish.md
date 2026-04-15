# Current Phase

Status: ready
Release: v1.1.0
Phase file: docs/releases/phase-09-skip-link-polish.md

## Goal

Keep the accessibility skip link in the app shell, but hide it from the normal mobile layout until it receives focus, and ensure it jumps correctly to the main content region.

## Why this phase is next

The visible skip link is not a functional blocker, but it weakens the first-run mobile presentation and makes the installed app feel less polished. This should be corrected without removing the accessibility benefit.

## In scope

- skip link visibility behavior
- focus-only presentation for the skip link
- correct jump target to the main content area
- verification that the skip link remains usable for keyboard and accessibility flows
- iPhone validation that the link does not appear persistently on normal launch

## Out of scope

- broader accessibility redesign
- shell layout redesign
- navigation changes
- typography changes unrelated to the skip link
- new features

## Primary files

- app shell or root layout file
- accessibility or global style file
- main content container or landmark file

## Expected max files changed

4

## Risk

Low. This is a targeted accessibility and shell polish fix.

## Rollback note

If the focused skip link becomes unusable after the change, revert to the previous implementation and restore visible behavior temporarily rather than removing the link.

## Tasks

- identify the current skip link implementation
- confirm the app has a valid main content target
- update the skip link so it is visually hidden by default
- ensure the skip link becomes clearly visible on focus
- ensure activation jumps to the main content region correctly
- verify the installed mobile app no longer shows the skip link on normal launch

## Validation command

Manual validation on iPhone and desktop browser:
- launch app normally
- confirm skip link is not persistently visible
- navigate with keyboard or accessibility focus
- confirm skip link appears when focused
- activate it
- confirm focus or jump lands on the main content region

## Validation

Status: not run

Evidence:
- pending

Blockers:
- none

Ready to ship:
- no

## Acceptance criteria

- the skip link is not persistently visible during normal mobile launch
- the skip link still exists in the app shell
- the skip link becomes visible when focused
- activating the skip link moves focus or scroll position to the main content area
- the change does not break the shell layout or top spacing on iPhone

## Completion summary

Not started.
