---
description: Validate the mobile shell in a real browser and capture baseline screenshots
agent: validator
---

Use the validator agent.

Goal:
Validate the current mobile shell in a real browser flow using Playwright MCP.

Process:
1. Read:
   - `.opencode/plans/current-phase.md`
   - `AGENTS.md`
2. Run the repo-root browser smoke helper:
   - `npm run browser:smoke`
3. Start the local preview server with:
   - `npm run preview:host`
   - optional single-command start: `npm run browser:smoke -- --start-preview`
4. Use Playwright MCP against:
   - `http://127.0.0.1:4173/#sessions`
   - `http://127.0.0.1:4173/#task`
5. Resize or confirm a narrow mobile viewport before validating UI behavior.
6. Validate at minimum:
   - the Sessions route loads cleanly
   - the Task route loads cleanly
   - no critical primary action depends on horizontal scrolling
   - the shell remains readable on a narrow viewport
   - the tool drawer can open and close without losing task context
7. Prefer accessibility snapshots for structural validation.
8. Capture screenshots into `playwright-artifacts/` for:
   - sessions-screen.png
   - task-screen.png
   - tool-drawer.png
9. Return a strict PASS or FAIL decision.
10. If FAIL:
   - name the failing condition
   - name the affected route
   - name the smallest likely fix
11. Do not modify source files unless explicitly asked.

Output format:
- Validation result: PASS|FAIL
- Routes checked
- Screenshots written
- Findings
