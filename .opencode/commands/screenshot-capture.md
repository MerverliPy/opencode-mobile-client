---
description: Capture a named browser screenshot artifact for a requested route or shell state
agent: validator
---

Use the validator agent unless another agent is explicitly requested.

Goal:
Capture a named screenshot artifact for a requested route or visible shell state using Playwright MCP.

Note:
- Use `npm run browser:smoke` when the goal is to regenerate the standard release-proof screenshot set.
- Use this command only for one-off requested captures outside that standard set.

Required inputs from the prompt:
- route or URL
- desired state to capture
- output filename

Process:
1. Run:
   - `npm run build`
2. Start:
   - `npm run preview:host`
3. Open the requested route in Playwright MCP.
4. Use a narrow mobile viewport unless the prompt says otherwise.
5. Wait until the requested visible state is actually present.
6. Capture:
   - one structural accessibility snapshot
   - one screenshot saved to `playwright-artifacts/<requested-filename>`
7. Return:
   - the exact file path
   - the route captured
   - the state that was visible
8. Do not modify source files unless explicitly asked.

Output format:
- Route captured
- State captured
- Screenshot path
- Notes
