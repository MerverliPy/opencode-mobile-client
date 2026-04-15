---
description: Validate offline and recovery behavior in the local mobile shell
agent: validator
---

Use the validator agent.

Goal:
Validate offline and recovery behavior for the local mobile shell using Playwright MCP.

Process:
1. Read:
   - `.opencode/plans/current-phase.md`
   - `AGENTS.md`
2. Run:
   - `npm run validate:local`
3. Start the local preview server with:
   - `npm run preview:host`
4. Open:
   - `http://127.0.0.1:4173/#sessions`
5. Capture a baseline screenshot:
   - `playwright-artifacts/offline-baseline.png`
6. Switch the browser session to offline.
7. Validate:
   - an offline state or message is visible
   - the shell remains understandable
   - existing local shell content stays readable
8. Capture:
   - `playwright-artifacts/offline-state.png`
9. Restore online state.
10. Validate:
   - the recovery or online state is understandable
11. Capture:
   - `playwright-artifacts/offline-recovered.png`
12. Return PASS or FAIL with concise evidence.
13. Do not modify source files unless explicitly asked.

Output format:
- Validation result: PASS|FAIL
- Offline evidence
- Recovery evidence
- Screenshots written
- Findings
