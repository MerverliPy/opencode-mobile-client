import { createId } from './utils.js';

export function createToolResult({
  kind = 'file',
  label = 'Read file',
  toolName = 'read_file',
  path,
  summary,
  content = '',
  files = [],
}) {
  return {
    id: createId('tool'),
    kind,
    label,
    toolName,
    path,
    summary,
    content,
    files,
    createdAt: Date.now(),
  };
}

export function createDiffToolResult({ label = 'Review diff', toolName = 'git_diff', path, summary, files }) {
  return createToolResult({
    kind: 'diff',
    label,
    toolName,
    path,
    summary,
    files,
  });
}

export function createStarterToolResult() {
  return createToolResult({
    path: 'notes/local-session-guide.md',
    summary: 'A starter file shows how tool output now opens in a narrow mobile drawer.',
    content: [
      '# Local session guide',
      '',
      'This starter file is ready so the mobile tool drawer has something immediate to inspect.',
      '',
      '- Open and close tool output without leaving Task.',
      '- File lines wrap to stay readable on a phone.',
      '- Closing the drawer returns to the same conversation context.',
    ].join('\n'),
  });
}

export function createStarterDiffResult() {
  return createDiffToolResult({
    path: 'reviews/mobile-diff-review.diff',
    summary: 'Three changed files are ready for narrow-screen review.',
    files: [
      {
        path: 'src/main.js',
        status: 'M',
        summary: 'Adds a task entry point that opens diff review without leaving the thread.',
        hunks: [
          {
            header: '@@ -660,6 +660,11 @@ function renderTaskScreen() {',
            lines: [
              { type: 'context', oldNumber: 660, newNumber: 660, text: '  const toolResults = getToolResults(session);' },
              { type: 'remove', oldNumber: 661, newNumber: null, text: '  const latestToolResult = toolResults[0] ?? null;' },
              {
                type: 'add',
                oldNumber: null,
                newNumber: 661,
                text: "  const latestReview = toolResults.find((toolResult) => toolResult.kind === 'diff') ?? toolResults[0] ?? null;",
              },
              {
                type: 'add',
                oldNumber: null,
                newNumber: 662,
                text: '  const reviewCount = getDiffFiles(latestReview).length;',
              },
            ],
          },
        ],
      },
      {
        path: 'src/styles.css',
        status: 'M',
        summary: 'Keeps added and removed lines stacked and readable on a phone.',
        hunks: [
          {
            header: '@@ -702,0 +703,12 @@ .diff-viewer-surface {',
            lines: [
              { type: 'add', oldNumber: null, newNumber: 703, text: '.diff-line {' },
              { type: 'add', oldNumber: null, newNumber: 704, text: '  display: grid;' },
              { type: 'add', oldNumber: null, newNumber: 705, text: '  grid-template-columns: 3.3rem 3.3rem 1rem minmax(0, 1fr);' },
              { type: 'add', oldNumber: null, newNumber: 706, text: '  gap: 0.55rem;' },
              { type: 'add', oldNumber: null, newNumber: 707, text: '  overflow-wrap: anywhere;' },
              { type: 'add', oldNumber: null, newNumber: 708, text: '}' },
            ],
          },
        ],
      },
      {
        path: 'notes/mobile-review-checklist.md',
        status: 'A',
        summary: 'Adds a short checklist for reviewing changes from an iPhone.',
        hunks: [
          {
            header: '@@ -0,0 +1,6 @@',
            lines: [
              { type: 'add', oldNumber: null, newNumber: 1, text: '# Mobile review checklist' },
              { type: 'add', oldNumber: null, newNumber: 2, text: '' },
              { type: 'add', oldNumber: null, newNumber: 3, text: '- Start from the changed-file list.' },
              { type: 'add', oldNumber: null, newNumber: 4, text: '- Read additions and removals in one vertical flow.' },
              { type: 'add', oldNumber: null, newNumber: 5, text: '- Close the drawer to return directly to Task.' },
            ],
          },
        ],
      },
    ],
  });
}

export function getToolResultKind(toolResult) {
  return toolResult?.kind === 'diff' ? 'diff' : 'file';
}

export function getDiffFiles(toolResult) {
  return getToolResultKind(toolResult) === 'diff' && Array.isArray(toolResult?.files)
    ? toolResult.files
    : [];
}

export function getDiffFile(toolResult, changePath) {
  const diffFiles = getDiffFiles(toolResult);

  if (!diffFiles.length) {
    return null;
  }

  return diffFiles.find((file) => file.path === changePath) ?? diffFiles[0];
}

export function getDiffStatusLabel(status) {
  if (status === 'A') {
    return 'Added';
  }

  if (status === 'D') {
    return 'Deleted';
  }

  return 'Modified';
}

export function getDiffLineCount(diffFile, type) {
  return (diffFile?.hunks ?? []).reduce(
    (count, hunk) => count + (hunk.lines ?? []).filter((line) => (type ? line.type === type : true)).length,
    0,
  );
}

export function normalizeDiffFile(diffFile) {
  if (!diffFile || typeof diffFile.path !== 'string') {
    return null;
  }

  return {
    path: diffFile.path,
    status: typeof diffFile.status === 'string' ? diffFile.status : 'M',
    summary: typeof diffFile.summary === 'string' ? diffFile.summary : 'Changed file',
    hunks: Array.isArray(diffFile.hunks)
      ? diffFile.hunks
          .map((hunk) => {
            if (!hunk || typeof hunk.header !== 'string') {
              return null;
            }

            return {
              header: hunk.header,
              lines: Array.isArray(hunk.lines)
                ? hunk.lines
                    .filter((line) => line && typeof line.text === 'string')
                    .map((line) => ({
                      type: line.type === 'add' || line.type === 'remove' ? line.type : 'context',
                      oldNumber: Number.isFinite(line.oldNumber) ? line.oldNumber : null,
                      newNumber: Number.isFinite(line.newNumber) ? line.newNumber : null,
                      text: line.text,
                    }))
                : [],
            };
          })
          .filter(Boolean)
      : [],
  };
}

export function normalizeToolResult(toolResult) {
  if (
    !toolResult ||
    typeof toolResult.id !== 'string' ||
    typeof toolResult.path !== 'string' ||
    typeof toolResult.summary !== 'string'
  ) {
    return null;
  }

  const kind = toolResult.kind === 'diff' || Array.isArray(toolResult.files) ? 'diff' : 'file';

  return {
    id: toolResult.id,
    kind,
    label: typeof toolResult.label === 'string' ? toolResult.label : kind === 'diff' ? 'Review diff' : 'Read file',
    toolName: typeof toolResult.toolName === 'string' ? toolResult.toolName : kind === 'diff' ? 'git_diff' : 'read_file',
    path: toolResult.path,
    summary: toolResult.summary,
    content: typeof toolResult.content === 'string' ? toolResult.content : '',
    files:
      kind === 'diff'
        ? (Array.isArray(toolResult.files) ? toolResult.files.map(normalizeDiffFile).filter(Boolean) : [])
        : [],
    createdAt: Number(toolResult.createdAt) || Date.now(),
  };
}
