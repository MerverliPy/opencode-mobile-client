---
description: Validate offline and recovery behavior in the local mobile shell
agent: validator
---

Use the validator agent.

Goal:
Re-check offline and recovery behavior when the standard repo-owned browser-proof capture needs focused follow-up.

Process:
1. Read:
   - `.opencode/plans/current-phase.md`
   - `AGENTS.md`
2. Prefer `npm run browser:smoke` for the standard release-proof artifact set.
3. Use this command only when offline or recovery evidence needs a targeted re-check beyond the standard capture flow.
4. Run:
   - `npm run validate:local`
5. Start the local preview server with:
   - `npm run preview:host`
6. Open:
   - `http://127.0.0.1:4173/#sessions`
7. Capture a baseline screenshot:
   - `playwright-artifacts/offline-baseline.png`
8. Switch the browser session to offline.
9. Validate:
   - an offline state or message is visible
   - the shell remains understandable
   - existing local shell content stays readable
10. Capture:
   - `playwright-artifacts/offline-state.png`
11. Restore online state.
12. Validate:
   - the recovery or online state is understandable
13. Capture:
   - `playwright-artifacts/offline-recovered.png`
14. Return PASS or FAIL with concise evidence.
15. Do not modify source files unless explicitly asked.

Output format:
- Validation result: PASS|FAIL
- Offline evidence
- Recovery evidence
- Screenshots written
- Findings
