# Remove machine-specific preview host assumptions from phone testing

Status: complete
Release: v1.7.2
Phase file: backlog:preview-host-portability-hardening

## Goal
Remove machine-specific preview host assumptions so phone testing stays portable while preserving the current localhost and `127.0.0.1` preview behavior.

## Why this phase is next
All listed release phases are complete, and this is the highest-priority remaining selectable backlog candidate under `candidates`.

## Primary files
- vite.config.js
- README.md

## Expected max files changed
2

## Risk
Low. This phase is bounded to preview-host portability and related documentation.

## Rollback note
Revert the preview host configuration and README updates together if the change alters default local preview behavior.

## In scope
- remove the machine-specific preview host assumption from the current phone-testing path
- preserve existing localhost and `127.0.0.1` preview behavior
- allow alternate phone-testing hosts through explicit configuration instead of per-machine source edits
- document the bounded operator-facing preview host setup

## Out of scope
- unrelated product code changes
- broader preview or dev-server redesign
- browser-proof workflow changes outside preview host portability
- machine-specific source edits for individual environments

## Tasks
- update preview host configuration so it no longer depends on one machine-specific hostname
- document how operators can enable alternate phone-testing hosts explicitly
- verify localhost and `127.0.0.1` behavior remain unchanged

## Validation command
npm run validate:local && npm run preview:host

## Validation
Status: PASS

Evidence:
- `npm run workflow:check` passed within `npm run validate:local`, and `lint`, `test`, and `build` all succeeded after replacing the hard-coded preview host allowance with explicit `OPENCODE_ALLOWED_HOSTS` parsing.
- `vite.config.js` now derives `server.allowedHosts` and `preview.allowedHosts` from the optional comma-separated `OPENCODE_ALLOWED_HOSTS` environment variable, removing the previous machine-specific hostname from source control.
- `README.md` now documents the default localhost/`127.0.0.1` path and shows explicit operator examples for enabling alternate LAN or Tailscale hosts without per-machine source edits.
- `npm run preview:host` initially failed only because port `4173` was already in use; after the bounded preview-port repair released the port, `npm run preview:host` started successfully and advertised local and network preview URLs, confirming default preview behavior still works.

Blockers:
- none

Ready to ship:
- yes

## Release notes
- Replaced the hard-coded preview host allowlist with explicit `OPENCODE_ALLOWED_HOSTS` configuration for portable phone testing.
- Documented how to keep default local preview behavior or opt into alternate LAN and Tailscale hosts without editing source files.

## Acceptance criteria
- Preview host configuration no longer depends on one machine-specific hostname.
- Localhost and `127.0.0.1` preview behavior remain unchanged.
- Alternate phone-testing hosts can be enabled through explicit configuration rather than source edits per machine.
- The phase stays bounded to preview-host portability and documentation only.

## Completion summary
Removed the machine-specific preview host assumption from the Vite config, preserved default local preview behavior, and documented explicit host configuration for portable phone testing.
