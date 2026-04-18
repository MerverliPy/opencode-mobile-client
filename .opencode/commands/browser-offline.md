---
description: Validate offline and recovery behavior in the local mobile shell
agent: validator
---

Use the validator agent.

Goal:
Re-check offline and recovery behavior when the standard repo-root browser-proof capture needs focused follow-up.

Process:
1. Read:
   - `.opencode/plans/current-phase.md`
   - `AGENTS.md`
2. Prefer `npm run browser:smoke` for the standard release-proof artifact set.
3. Use this command only when offline or recovery evidence needs a targeted re-check beyond the standard capture flow.
4. Keep the repo-root prerequisites truthful:
   - dependencies come from `npm install` at repo root
   - if browser tooling reports missing WebKit binaries, run `npx playwright install webkit` at repo root before retrying
5. Run:
   - `npm run validate:local`
6. Start the local preview server with:
   - `npm run preview:host`
7. Use the validator's browser tooling against the repo-root preview server with a narrow mobile viewport.
8. Open:
   - `http://127.0.0.1:4173/#sessions`
9. Capture a baseline screenshot:
   - `playwright-artifacts/offline-baseline.png`
10. Switch the browser session to offline.
11. Validate:
   - an offline state or message is visible
   - the shell remains understandable
   - existing local shell content stays readable
12. Capture:
   - `playwright-artifacts/offline-state.png`
13. Restore online state.
14. Validate:
   - the recovery or online state is understandable
15. Capture:
   - `playwright-artifacts/offline-recovered.png`
16. Return PASS or FAIL with concise evidence.
17. Do not modify source files unless explicitly asked.

Output format:
- Validation result: PASS|FAIL
- Offline evidence
- Recovery evidence
- Screenshots written
- Findings
