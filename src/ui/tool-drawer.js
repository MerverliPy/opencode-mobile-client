import { escapeHtml, formatSessionTime } from '../lib/utils.js';
import {
  getDiffFile,
  getDiffFiles,
  getDiffLineCount,
  getDiffStatusLabel,
  getToolResultKind,
} from '../lib/tool-results.js';
import { getToolResult, getToolResults } from '../state/session-state.js';

function renderToolResultCard(toolResult) {
  const isDiffResult = getToolResultKind(toolResult) === 'diff';
  const diffFiles = getDiffFiles(toolResult);

  return `
    <button
      class="tool-result-card"
      type="button"
      data-action="${isDiffResult ? 'open-tool-diff' : 'open-tool-file'}"
      data-tool-id="${toolResult.id}"
      aria-label="${escapeHtml(isDiffResult ? `Review diff ${toolResult.path}` : `Open file ${toolResult.path}`)}"
    >
      <div class="tool-result-header">
        <div class="tool-result-copy">
          <p class="tool-path">${escapeHtml(toolResult.path)}</p>
          <p class="tool-summary">${escapeHtml(toolResult.summary)}</p>
        </div>
        <span class="session-status">${escapeHtml(toolResult.label)}</span>
      </div>
      <div class="tool-result-meta">
        <span class="tool-badge">${escapeHtml(toolResult.toolName)}</span>
        ${
          isDiffResult
            ? `<span class="tool-command">${diffFiles.length} ${diffFiles.length === 1 ? 'changed file' : 'changed files'}</span>`
            : ''
        }
        <span class="tool-timestamp">${escapeHtml(formatSessionTime(toolResult.createdAt))}</span>
      </div>
    </button>
  `;
}

function renderFileLines(content) {
  return content
    .split('\n')
    .map(
      (line, index) => `
        <li class="file-line">
          <span class="file-line-number">${index + 1}</span>
          <code class="file-line-copy">${line ? escapeHtml(line) : '&nbsp;'}</code>
        </li>
      `,
    )
    .join('');
}

function renderFileViewer(toolResult) {
  return `
    <div class="file-viewer">
      <div class="file-viewer-meta">
        <span class="meta-pill">${escapeHtml(toolResult.label)}</span>
        <span class="meta-pill">${escapeHtml(toolResult.toolName)}</span>
      </div>
      <section class="file-viewer-surface" aria-label="File contents">
        <ol class="file-line-list">
          ${renderFileLines(toolResult.content)}
        </ol>
      </section>
    </div>
  `;
}

function renderDiffLine(line) {
  const marker = line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ' ';

  return `
    <li class="diff-line is-${line.type}">
      <span class="diff-line-number">${line.oldNumber ?? ''}</span>
      <span class="diff-line-number">${line.newNumber ?? ''}</span>
      <span class="diff-line-marker" aria-hidden="true">${marker}</span>
      <code class="diff-line-copy">${line.text ? escapeHtml(line.text) : '&nbsp;'}</code>
    </li>
  `;
}

function renderDiffFileNavigation(toolResult, activeChangePath) {
  const diffFiles = getDiffFiles(toolResult);

  return `
    <nav class="diff-file-nav" aria-label="Changed files">
      ${diffFiles
        .map((diffFile) => {
          const isActive = diffFile.path === activeChangePath;
          const additions = getDiffLineCount(diffFile, 'add');
          const removals = getDiffLineCount(diffFile, 'remove');

          return `
            <button
              class="diff-file-card${isActive ? ' is-active' : ''}"
              type="button"
              data-action="select-diff-file"
              data-change-path="${escapeHtml(diffFile.path)}"
              aria-label="${escapeHtml(`Review changed file ${diffFile.path}`)}"
              aria-current="${isActive ? 'true' : 'false'}"
            >
              <div class="diff-file-header">
                <p class="tool-path">${escapeHtml(diffFile.path)}</p>
                <span class="session-status">${getDiffStatusLabel(diffFile.status)}</span>
              </div>
              <p class="tool-summary">${escapeHtml(diffFile.summary)}</p>
              <div class="tool-result-meta">
                <span class="tool-badge">+${additions}</span>
                <span class="tool-badge">−${removals}</span>
              </div>
            </button>
          `;
        })
        .join('')}
    </nav>
  `;
}

function renderDiffViewer(toolResult, activeChangePath) {
  const activeDiffFile = getDiffFile(toolResult, activeChangePath);

  if (!activeDiffFile) {
    return '';
  }

  return `
    <div class="diff-viewer">
      ${renderDiffFileNavigation(toolResult, activeDiffFile.path)}

      <section class="diff-viewer-panel">
        <div class="file-viewer-meta">
          <span class="meta-pill">${escapeHtml(getDiffStatusLabel(activeDiffFile.status))}</span>
          <span class="meta-pill">${getDiffLineCount(activeDiffFile, 'add')} additions</span>
          <span class="meta-pill">${getDiffLineCount(activeDiffFile, 'remove')} removals</span>
        </div>

        <div class="diff-viewer-copy">
          <p class="tool-path">${escapeHtml(activeDiffFile.path)}</p>
          <p class="tool-summary">${escapeHtml(activeDiffFile.summary)}</p>
        </div>

        <section class="diff-viewer-surface" aria-label="Diff contents">
          ${(activeDiffFile.hunks ?? [])
            .map(
              (hunk) => `
                <section class="diff-hunk">
                  <p class="diff-hunk-header">${escapeHtml(hunk.header)}</p>
                  <ol class="diff-line-list">
                    ${(hunk.lines ?? []).map(renderDiffLine).join('')}
                  </ol>
                </section>
              `,
            )
            .join('')}
        </section>
      </section>
    </div>
  `;
}

export function renderToolDrawer({ appState, session }) {
  if (!session || !appState.toolDrawer.isOpen) {
    return '';
  }

  const toolResults = getToolResults(session);
  const activeTool = appState.toolDrawer.toolId
    ? getToolResult(session, appState.toolDrawer.toolId)
    : null;
  const isFileView = appState.toolDrawer.view === 'file' && activeTool;
  const isDiffView = appState.toolDrawer.view === 'diff' && activeTool;
  const diffFiles = getDiffFiles(activeTool);
  const activeDiffFile = isDiffView ? getDiffFile(activeTool, appState.toolDrawer.changePath) : null;
  const title = isFileView
    ? activeTool.path
    : isDiffView
      ? activeDiffFile?.path ?? activeTool.path
      : 'Tool output';
  const body = isFileView
    ? activeTool.summary
    : isDiffView
      ? activeDiffFile?.summary ?? `Review ${diffFiles.length} changed ${diffFiles.length === 1 ? 'file' : 'files'} in one vertical flow.`
      : toolResults.length
        ? 'Open file output or diff review without leaving the current task thread.'
        : 'Tool output will appear here after the task creates something readable.';

  return `
    <div class="tool-drawer-layer">
      <button
        class="tool-drawer-scrim"
        type="button"
        data-action="close-tool-drawer"
        aria-label="Close tool drawer"
      ></button>

      <section class="tool-drawer" id="tool-drawer" role="dialog" aria-modal="true" aria-labelledby="tool-drawer-title" aria-describedby="tool-drawer-description">
        <div class="tool-drawer-handle" aria-hidden="true"></div>

        <header class="tool-drawer-header">
          <div class="tool-drawer-copy">
            <p class="eyebrow">${isFileView ? 'File viewer' : isDiffView ? 'Diff review' : 'Tool output'}</p>
            <h3 id="tool-drawer-title">${escapeHtml(title)}</h3>
            <p class="screen-copy" id="tool-drawer-description">${escapeHtml(body)}</p>
          </div>

          <div class="tool-drawer-actions">
            ${
              isFileView || isDiffView
                ? '<button class="ghost-button tool-nav-button" type="button" data-action="back-to-tool-list">All tools</button>'
                : ''
            }
            <button class="secondary-button tool-nav-button" type="button" data-action="close-tool-drawer">Close</button>
          </div>
        </header>

        <div class="tool-drawer-body">
          ${
            isFileView
              ? renderFileViewer(activeTool)
              : isDiffView
                ? renderDiffViewer(activeTool, activeDiffFile?.path)
                : toolResults.length
                  ? `<div class="tool-result-list">${toolResults.map(renderToolResultCard).join('')}</div>`
                  : `
                    <section class="screen-card state-card tool-empty-card">
                      <p class="eyebrow">No tool output</p>
                      <h3>Nothing to inspect yet.</h3>
                      <p class="screen-copy">Generate or continue a mock task reply to create a readable file surface here.</p>
                    </section>
                  `
          }
        </div>
      </section>
    </div>
  `;
}
