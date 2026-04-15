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

Status: PASS

Evidence:
- `src/main.js` keeps the skip link in the app shell (`<a class="skip-link" href="#main-content">`) and retains a valid main content target (`<main id="main-content" ... tabindex="-1">`), matching the phase goal and in-scope target behavior.
- `src/styles.css` updates `.skip-link` to be visually hidden by default (`transform` off-screen plus `opacity: 0`) and only visible on `:focus`/`:focus-visible`, which is consistent with the focus-only presentation requirement.
- `src/main.js` adds `focusMainContent()` and intercepts skip-link activation to focus and scroll the main region directly, addressing the correct jump-target requirement without broader shell or navigation changes.
- Scope stayed within Phase 09 boundaries: only `src/main.js` and `src/styles.css` changed for implementation, with no broader accessibility redesign, shell redesign, navigation changes, unrelated typography work, or new features.
- Manual validation passed on the required flows: normal mobile launch does not show the skip link persistently, keyboard/accessibility focus reveals it, activation lands on the main content region, and iPhone shell/top spacing remains intact.
- `npm run build` passes, confirming the phase result is independently usable as a release increment.

Blockers:
- none

Ready to ship:
- yes

## Release notes

- Hid the shell skip link during normal mobile launch and revealed it only on focus.
- Made skip-link activation focus and scroll to the main content region reliably.

## Acceptance criteria

- the skip link is not persistently visible during normal mobile launch
- the skip link still exists in the app shell
- the skip link becomes visible when focused
- activating the skip link moves focus or scroll position to the main content area
- the change does not break the shell layout or top spacing on iPhone

## Completion summary

Phase 09 polished the shell skip link by keeping it available for accessibility flows while removing its persistent visual presence from normal mobile launch.
