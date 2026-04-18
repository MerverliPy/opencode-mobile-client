#!/usr/bin/env bash
set -euo pipefail

python <<'PY'
from pathlib import Path

path = Path('.opencode/backlog/candidates.yaml')
text = path.read_text()

if 'candidates:' not in text or 'archived:' not in text:
    raise SystemExit('Expected candidates: and archived: sections in .opencode/backlog/candidates.yaml')

header = text[:text.index('candidates:')]
archived_tail = text[text.index('archived:'):]

new_candidates = '''candidates:
  - id: browser-proof-clean-checkout-runner
    title: Restore clean-checkout browser proof with repo-owned Playwright resolution
    module: browser-validation
    priority: 20
    release_bump: patch
    target_release: v1.7.1
    execution_flow: /autoflow
    expected_max_files_changed: 4
    drivers:
      - "`npm run browser:smoke` currently imports Playwright from `.opencode/node_modules/...`, which does not exist in a clean checkout."
      - "Release proof cannot be trusted until the repo-owned runner resolves its own browser tooling or fails with an explicit bootstrap requirement."
    files:
      - scripts/dev/browser-smoke.sh
      - package.json
      - package-lock.json
      - opencode.json
    validation: npm run browser:smoke && npm run release:proof
    acceptance:
      - "`npm run browser:smoke` no longer imports Playwright from hidden tool-managed paths."
      - The runner uses repo-owned dependency or config resolution, or exits with a clear actionable bootstrap failure message.
      - Running `npm run browser:smoke` writes the six standard screenshot artifacts to `playwright-artifacts/`.
      - "`npm run release:proof` passes immediately after a successful browser smoke run."

  - id: browser-proof-command-surface-alignment
    title: Align browser-proof command surfaces with the real runner and proof flow
    module: browser-validation
    priority: 19
    release_bump: patch
    target_release: v1.7.2
    execution_flow: /autoflow
    expected_max_files_changed: 4
    drivers:
      - "The browser-proof command docs currently describe a workflow that is split between Playwright MCP expectations and a separate repo-root runner."
      - "The repo should expose one truthful operator path for browser smoke, offline capture, screenshot capture, and release proof."
    files:
      - .opencode/commands/browser-smoke.md
      - .opencode/commands/browser-offline.md
      - .opencode/commands/screenshot-capture.md
      - .opencode/commands/release-proof.md
    validation: npm run workflow:check && npm run browser:smoke && npm run release:proof
    acceptance:
      - Each browser-proof command document matches the real supported repo-root execution path.
      - The documented prerequisites and artifact expectations match the implemented runner behavior.
      - The command set no longer claims an unsupported or hidden execution dependency.
      - The scope stays bounded to command truth and operator guidance only.

  - id: browser-proof-release-truth-revalidation
    title: Refresh release-truth surfaces after browser-proof repair with clean evidence
    module: browser-validation
    priority: 18
    release_bump: patch
    target_release: v1.7.3
    execution_flow: /autoflow
    expected_max_files_changed: 3
    drivers:
      - "The repo currently records PASS evidence for browser-proof automation that is not reproducible from a clean checkout."
      - "Release-truth files must be corrected only after the repaired browser-proof path passes with fresh artifacts."
    files:
      - .opencode/plans/current-phase.md
      - docs/releases/phase-14-ci-and-release-verification.md
      - docs/releases/phase-registry.md
    validation: npm run workflow:check && npm run browser:smoke && npm run release:proof
    acceptance:
      - The active phase validation block records fresh PASS or FAIL evidence based on the repaired runner, not stale claims.
      - `docs/releases/phase-14-ci-and-release-verification.md` reflects the real clean-checkout validation evidence.
      - `docs/releases/phase-registry.md` no longer overstates browser-proof completion before fresh proof exists.
      - Release notes and completion summary remain short, factual, and synchronized with validator evidence.

  - id: preview-host-portability-hardening
    title: Remove machine-specific preview host assumptions from phone testing
    module: tooling
    priority: 17
    release_bump: patch
    target_release: v1.7.4
    execution_flow: /autoflow
    expected_max_files_changed: 2
    drivers:
      - "`vite.config.js` currently hard-codes a machine-specific host allowance, which makes phone testing less portable across environments."
      - The preview path should stay safe by default while allowing explicit operator configuration for alternate LAN or Tailscale hosts.
    files:
      - vite.config.js
      - README.md
    validation: npm run validate:local && npm run preview:host
    acceptance:
      - Preview host configuration no longer depends on one machine-specific hostname.
      - Localhost and `127.0.0.1` preview behavior remain unchanged.
      - Alternate phone-testing hosts can be enabled through explicit configuration rather than source edits per machine.
      - The phase stays bounded to preview-host portability and documentation only.
'''

legacy_archived = '''  - id: browser-proof-automation
    title: Replace manual browser-proof handoff with a repeatable repo-owned screenshot capture path
    module: browser-validation
    shipped: true
'''

if '\n  - id: browser-proof-automation\n' not in archived_tail:
    archived_tail = archived_tail.replace('archived:\n', 'archived:\n' + legacy_archived + '\n', 1)

path.write_text(header + new_candidates + '\n' + archived_tail)
PY

printf '%s\n' 'Seeded browser-proof remediation candidates into .opencode/backlog/candidates.yaml'
