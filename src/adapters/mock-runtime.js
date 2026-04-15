import { createDiffToolResult, createStarterDiffResult, createStarterToolResult, createToolResult } from '../lib/tool-results.js';
import { compactText, createId, slugifySegment, trimText } from '../lib/utils.js';

/**
 * Runtime adapter contract:
 * - expose a stable id and source label
 * - generate assistant reply text
 * - generate any related tool or diff payloads
 */
export function createMockRuntimeAdapter() {
  return {
    id: 'mock-local',
    sourceLabel: 'Local mock adapter',
    createStarterSessionPayload() {
      const starterDiffResult = createStarterDiffResult();
      const starterToolResult = createStarterToolResult();

      return {
        diffToolResultId: starterDiffResult.id,
        toolResults: [starterDiffResult, starterToolResult],
      };
    },
    respond({ prompt, sessionTitle }) {
      const promptSummary = trimText(compactText(prompt), 42);
      const diffPromptSummary = trimText(compactText(prompt), 36);
      const fileToolResult = createToolResult({
        path: `notes/${slugifySegment(promptSummary)}.md`,
        summary: 'Prepared a mobile-friendly file snapshot for the latest task context.',
        content: [
          `# ${sessionTitle}`,
          '',
          'Latest prompt',
          prompt,
          '',
          'Mobile review notes',
          '- Tool output now opens in a drawer instead of replacing the task screen.',
          '- File content wraps so long lines remain readable on narrow screens.',
          '- Close returns directly to the same conversation.',
        ].join('\n'),
      });

      const diffToolResult = createDiffToolResult({
        path: `reviews/${slugifySegment(diffPromptSummary)}.diff`,
        summary: 'Prepared a mobile diff snapshot for the latest task context.',
        files: [
          {
            path: 'src/main.js',
            status: 'M',
            summary: 'Updates the task thread so diff review opens in the mobile drawer.',
            hunks: [
              {
                header: '@@ -1050,3 +1050,4 @@ function buildAssistantReply(prompt) {',
                lines: [
                  { type: 'context', oldNumber: 1050, newNumber: 1050, text: 'function buildAssistantReply(prompt) {' },
                  { type: 'context', oldNumber: 1051, newNumber: 1051, text: '  return `Working from your latest message:' },
                  { type: 'remove', oldNumber: 1053, newNumber: null, text: '- file content now opens in a drawer with a clear return path' },
                  { type: 'add', oldNumber: null, newNumber: 1053, text: '- diff review and file content stay in the drawer with a clear return path' },
                  { type: 'add', oldNumber: null, newNumber: 1054, text: '- changed files stay readable in one stacked mobile flow' },
                ],
              },
            ],
          },
          {
            path: `notes/${slugifySegment(diffPromptSummary)}-review.md`,
            status: 'A',
            summary: 'Captures the latest mobile review notes as a new file.',
            hunks: [
              {
                header: '@@ -0,0 +1,7 @@',
                lines: [
                  { type: 'add', oldNumber: null, newNumber: 1, text: `# Review notes for ${sessionTitle}` },
                  { type: 'add', oldNumber: null, newNumber: 2, text: '' },
                  { type: 'add', oldNumber: null, newNumber: 3, text: 'Prompt' },
                  { type: 'add', oldNumber: null, newNumber: 4, text: prompt },
                  { type: 'add', oldNumber: null, newNumber: 5, text: '' },
                  { type: 'add', oldNumber: null, newNumber: 6, text: '- Review additions and removals in one vertical mobile flow.' },
                ],
              },
            ],
          },
        ],
      });

      return {
        assistantMessage: {
          id: createId('msg'),
          role: 'assistant',
          label: 'OpenCode',
          text: `Mock adapter reply based on your latest message:\n\n${prompt}\n\nCurrent mobile takeaways:\n- the current thread stays visible while you inspect tool output\n- file content now opens in a drawer with a clear return path\n- wrapped lines and larger touch targets keep common mobile actions easier to use`,
          toolResultId: diffToolResult.id,
        },
        toolResults: [diffToolResult, fileToolResult],
      };
    },
  };
}
