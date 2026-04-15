import { escapeHtml, formatSessionTime } from '../lib/utils.js';
import { getDiffFiles, getToolResultKind } from '../lib/tool-results.js';
import {
  getSelectedSession,
  getSessionPreview,
  getSessionTitle,
  getToolResult,
  getToolResults,
  getVisibleMessageCount,
} from '../state/session-state.js';
import {
  getConnectionLabel,
  getConnectionMessage,
  getConnectionTone,
  getInstallBody,
  getInstallHint,
} from '../state/shell-state.js';

export function renderUiNotice(notice) {
  if (!notice) {
    return '';
  }

  return `
    <section class="app-notice is-${notice.tone}" role="${notice.tone === 'error' ? 'alert' : 'status'}" aria-live="${notice.tone === 'error' ? 'assertive' : 'polite'}">
      <div class="app-notice-copy">
        <p class="eyebrow">${escapeHtml(notice.tone)}</p>
        <p class="app-notice-title">${escapeHtml(notice.title)}</p>
        <p class="app-notice-body">${escapeHtml(notice.body)}</p>
      </div>
      <button class="ghost-button notice-dismiss-button" type="button" data-action="dismiss-ui-notice">Dismiss</button>
    </section>
  `;
}

function renderDetails(details) {
  return details
    .map(
      ([label, value]) => `
        <li class="detail-row">
          <span class="detail-label">${label}</span>
          <span class="detail-value">${value}</span>
        </li>
      `,
    )
    .join('');
}

function renderShellStatusBanner(appState) {
  return `
    <section class="shell-status-banner is-${getConnectionTone(appState)}" aria-live="polite">
      <div class="shell-status-copy">
        <p class="eyebrow">Connection</p>
        <p class="shell-status-title">${getConnectionLabel(appState)}</p>
        <p class="shell-status-text">${getConnectionMessage(appState)}</p>
      </div>
      <span class="shell-status-pill">${getInstallHint(appState)}</span>
    </section>
  `;
}

function renderInstallCard(appState) {
  const action = appState.shell.installPromptEvent ? 'prompt-install' : '';

  return `
    <section class="screen-card install-card">
      <p class="eyebrow">Install</p>
      <div class="hero-heading install-heading">
        <div>
          <h3>${appState.shell.isStandalone ? 'Installed and relaunch-ready' : 'Keep OpenCode close on iPhone'}</h3>
          <p class="screen-copy">${getInstallBody(appState)}</p>
        </div>
        <span class="location-chip">${appState.shell.isStandalone ? 'Standalone' : 'PWA shell'}</span>
      </div>
      <div class="state-actions">
        ${
          action
            ? '<button class="primary-button" type="button" data-action="prompt-install">Install app</button>'
            : '<button class="secondary-button" type="button" disabled>Use browser add-to-home action</button>'
        }
      </div>
    </section>
  `;
}

export function renderNavigation({ activeId, navigationOrder, screens }) {
  return navigationOrder
    .map((screenId) => {
      const screen = screens[screenId];
      const isActive = screenId === activeId;

      return `
        <a
          class="nav-link${isActive ? ' is-active' : ''}"
          href="#${screenId}"
          ${isActive ? 'aria-current="page"' : ''}
        >
          <span class="nav-kicker">${screen.kicker}</span>
          <span class="nav-label">${screen.label}</span>
        </a>
      `;
    })
    .join('');
}

function renderMessage({ appState, message, session }) {
  const toolResult = message.toolResultId ? getToolResult(session, message.toolResultId) : null;
  const isDiffResult = getToolResultKind(toolResult) === 'diff';
  const isToolDrawerOpen = appState.toolDrawer.isOpen;
  const isActiveTool = isToolDrawerOpen && appState.toolDrawer.toolId === toolResult?.id;

  return `
    <li class="message-row is-${message.role}${message.tone ? ` is-${message.tone}` : ''}">
      <article class="message-bubble">
        <div class="message-meta">
          <span class="message-label">${escapeHtml(message.label)}</span>
        </div>
        <pre class="message-copy">${escapeHtml(message.text)}</pre>
        ${
          toolResult
            ? `
              <section class="message-tool-card" aria-label="Attached tool output">
                <div class="message-tool-meta">
                  <span class="tool-badge">Tool output</span>
                  <span class="tool-command">${escapeHtml(toolResult.toolName)}</span>
                </div>
                <p class="tool-path">${escapeHtml(toolResult.path)}</p>
                <p class="tool-summary">${escapeHtml(toolResult.summary)}</p>
                <div class="tool-action-row">
                   <button
                     class="secondary-button tool-inline-button"
                     type="button"
                     data-action="${isDiffResult ? 'open-tool-diff' : 'open-tool-file'}"
                     data-tool-id="${toolResult.id}"
                     aria-label="${escapeHtml(isDiffResult ? `Review diff ${toolResult.path}` : `Open file ${toolResult.path}`)}"
                     aria-haspopup="dialog"
                     aria-controls="tool-drawer"
                     aria-expanded="${isActiveTool ? 'true' : 'false'}"
                   >
                     ${isDiffResult ? 'Review diff' : 'Open file'}
                   </button>
                  <button class="ghost-button tool-inline-button" type="button" data-action="open-tool-drawer" aria-label="Open all tool output" aria-haspopup="dialog" aria-controls="tool-drawer" aria-expanded="${isToolDrawerOpen && appState.toolDrawer.view === 'list' ? 'true' : 'false'}">
                    All tools
                  </button>
                </div>
              </section>
            `
            : ''
        }
        ${
          message.actionLabel
            ? `<button class="inline-action" type="button" data-action="use-retry-prompt">${message.actionLabel}</button>`
            : ''
        }
      </article>
    </li>
  `;
}

function renderLoadingMessage(session) {
  if (!session?.isLoading) {
    return '';
  }

  return `
    <li class="message-row is-assistant is-loading" aria-live="polite">
      <article class="message-bubble" role="status">
        <div class="message-meta">
          <span class="message-label">OpenCode</span>
          <span class="loading-dots" aria-hidden="true"><span></span><span></span><span></span></span>
        </div>
        <p class="loading-copy">Generating a local mock reply while keeping this thread readable.</p>
      </article>
    </li>
  `;
}

function renderLoadingCard(eyebrow, title, body) {
  return `
    <section class="screen-card state-card">
      <p class="eyebrow">${eyebrow}</p>
      <h3>${title}</h3>
      <div class="loading-inline" role="status" aria-live="polite">
        <span class="loading-dots" aria-hidden="true"><span></span><span></span><span></span></span>
        <p class="loading-copy">${body}</p>
      </div>
    </section>
  `;
}

function renderSessionCard({ appState, session }) {
  const isActive = session.id === appState.selectedSessionId;
  const messageCount = getVisibleMessageCount(session);
  const statusLabel = session.isLoading ? 'Replying' : isActive ? 'Current' : 'Open';

  return `
    <button
      class="screen-card session-item${isActive ? ' is-active' : ''}"
      type="button"
      data-action="select-session"
      data-session-id="${session.id}"
      aria-label="${escapeHtml(`Open session ${getSessionTitle(session)}. Updated ${formatSessionTime(session.updatedAt)}.`)}"
    >
      <div class="session-item-header">
        <div class="session-item-copy">
          <p class="session-title">${escapeHtml(getSessionTitle(session))}</p>
          <p class="session-meta">Updated ${escapeHtml(formatSessionTime(session.updatedAt))} · ${messageCount} ${
            messageCount === 1 ? 'message' : 'messages'
          }</p>
        </div>
        <span class="session-status${session.isLoading ? ' is-loading' : ''}">${statusLabel}</span>
      </div>
      <p class="session-preview">${escapeHtml(getSessionPreview(session))}</p>
    </button>
  `;
}

export function renderSessionsScreen({ appState }) {
  if (appState.isHydratingSessions) {
    return `
      ${renderShellStatusBanner(appState)}
      ${renderInstallCard(appState)}

      <section class="screen-card hero-card">
        <p class="eyebrow">Sessions</p>
        <div class="hero-heading">
          <h2 id="screen-title">Recent sessions</h2>
          <span class="location-chip">Local state</span>
        </div>
        <p class="screen-copy">Loading saved work from this device so the list stays easy to reopen on mobile.</p>
      </section>

      ${renderLoadingCard('Loading', 'Checking local sessions', 'Saved work is being restored for this device.')}
    `;
  }

  if (!appState.sessions.length) {
    return `
      ${renderShellStatusBanner(appState)}
      ${renderInstallCard(appState)}

      <section class="screen-card hero-card">
        <p class="eyebrow">Sessions</p>
        <div class="hero-heading">
          <h2 id="screen-title">Recent sessions</h2>
          <span class="location-chip">Local state</span>
        </div>
        <p class="screen-copy">Start the first session here, then jump back into Task without losing the current mobile flow.</p>
      </section>

      <section class="screen-card state-card">
        <p class="eyebrow">Empty state</p>
        <h3>No local sessions yet.</h3>
        <p class="screen-copy">This device is ready for saved in-app work, but nothing has been started yet.</p>
        <div class="state-actions">
          <button class="primary-button" type="button" data-action="create-session">Start first session</button>
          <button class="secondary-button" type="button" data-action="open-task">Open Task</button>
        </div>
      </section>
    `;
  }

  return `
    ${renderShellStatusBanner(appState)}
    ${renderInstallCard(appState)}

    <section class="screen-card hero-card">
      <p class="eyebrow">Sessions</p>
      <div class="hero-heading">
        <h2 id="screen-title">Recent sessions</h2>
        <span class="location-chip">${appState.sessions.length} saved</span>
      </div>
      <p class="screen-copy">Recent work stays on this device so it is easy to reopen with one tap while keeping the app thumb-friendly.</p>
      <div class="state-actions">
        <button class="primary-button" type="button" data-action="create-session">New session</button>
        ${
          appState.selectedSessionId
            ? '<button class="secondary-button" type="button" data-action="open-selected-session">Open current</button>'
            : ''
        }
      </div>
    </section>

    <section class="session-list" aria-label="Saved sessions">
      ${appState.sessions.map((session) => renderSessionCard({ appState, session })).join('')}
    </section>
  `;
}

function renderTaskNoSessionState(appState) {
  const hasSessions = appState.sessions.length > 0;

  return `
    ${renderShellStatusBanner(appState)}

    <section class="screen-card hero-card">
      <p class="eyebrow">Task view</p>
      <div class="hero-heading">
        <h2 id="screen-title">Choose a session</h2>
        <span class="location-chip">No session</span>
      </div>
      <p class="screen-copy">Task stays ready for focused mobile work, but it now waits for a selected session first.</p>
    </section>

    <section class="screen-card state-card">
      <p class="eyebrow">No-session state</p>
      <h3>${hasSessions ? 'Pick a session to keep going.' : 'Start a session to begin.'}</h3>
      <p class="screen-copy">${
        hasSessions
          ? 'Open a saved session from the Sessions tab or start a fresh one before composing.'
          : 'Create the first local session so your work can survive normal in-app navigation.'
      }</p>
      <div class="state-actions">
        <button class="primary-button" type="button" data-action="create-session">${
          hasSessions ? 'Start new session' : 'Start first session'
        }</button>
        <button class="secondary-button" type="button" data-action="open-sessions">Browse sessions</button>
      </div>
    </section>
  `;
}

export function renderTaskScreen({ appState, screens }) {
  if (appState.isHydratingSessions) {
    return `
      ${renderShellStatusBanner(appState)}

      <section class="screen-card hero-card">
        <p class="eyebrow">Task view</p>
        <div class="hero-heading">
          <h2 id="screen-title">Task</h2>
          <span class="location-chip">Loading</span>
        </div>
        <p class="screen-copy">Task is waiting for local sessions to finish loading from this device.</p>
      </section>

      ${renderLoadingCard('Loading', 'Restoring task state', 'A selected session will appear here once local state finishes loading.')}
    `;
  }

  const session = getSelectedSession(appState);

  if (!session) {
    return renderTaskNoSessionState(appState);
  }

  const messageCount = getVisibleMessageCount(session);
  const toolResults = getToolResults(session);
  const latestToolResult = toolResults[0] ?? null;
  const latestDiffResult = toolResults.find((toolResult) => getToolResultKind(toolResult) === 'diff') ?? null;
  const latestDiffFileCount = getDiffFiles(latestDiffResult).length;

  return `
    ${renderShellStatusBanner(appState)}

    <section class="screen-card hero-card">
      <p class="eyebrow">Task view</p>
      <div class="hero-heading">
        <h2 id="screen-title">${escapeHtml(getSessionTitle(session))}</h2>
        <span class="location-chip">Current session</span>
      </div>
      <p class="screen-copy">${screens.task.description}</p>
      <div class="session-meta-pills">
        <span class="meta-pill">Updated ${escapeHtml(formatSessionTime(session.updatedAt))}</span>
        <span class="meta-pill">${messageCount} ${messageCount === 1 ? 'message' : 'messages'}</span>
        <span class="meta-pill">${toolResults.length} ${toolResults.length === 1 ? 'tool output' : 'tool outputs'}</span>
        ${
          latestDiffResult
            ? `<span class="meta-pill">${latestDiffFileCount} ${
                latestDiffFileCount === 1 ? 'changed file' : 'changed files'
              }</span>`
            : ''
        }
        <span class="meta-pill">Local only</span>
      </div>
      <div class="state-actions">
        <button class="secondary-button" type="button" data-action="open-sessions">Sessions</button>
        ${
          toolResults.length
            ? '<button class="ghost-button" type="button" data-action="open-tool-drawer">Tools</button>'
            : ''
        }
        <button class="ghost-button" type="button" data-action="create-session">New session</button>
      </div>
    </section>

    <section class="screen-card conversation-card" aria-label="Task conversation" aria-busy="${session.isLoading ? 'true' : 'false'}">
      <div class="conversation-summary">
        <p class="eyebrow">Readable output</p>
        <p class="conversation-copy">${
          latestDiffResult
            ? `Diff review opens in the drawer, so you can inspect ${latestDiffFileCount} changed ${
                latestDiffFileCount === 1 ? 'file' : 'files'
              } without losing the task thread.`
            : latestToolResult
              ? `Tool output opens in a drawer, so you can inspect ${escapeHtml(latestToolResult.path)} without losing the thread.`
              : 'This selected session stays readable, copy-friendly, and available while you move back to Sessions.'
        }</p>
      </div>

      <ol class="message-list">
        ${session.messages.map((message) => renderMessage({ appState, message, session })).join('')}
        ${renderLoadingMessage(session)}
      </ol>
    </section>

    <div class="composer-dock">
      <form class="screen-card composer-card" id="composer-form">
        <label class="composer-label" for="composer-input">Message</label>
        <textarea
          class="composer-input"
          id="composer-input"
          name="message"
          rows="1"
          maxlength="1200"
          placeholder="Continue this session, summarize output, or continue the interrupted reply."
          aria-describedby="composer-hint"
        >${escapeHtml(session.draft)}</textarea>
        <div class="composer-footer">
          <p class="composer-hint" id="composer-hint">Drafts stay with this session while you browse the rest of the app.</p>
          <button class="send-button" type="submit" aria-label="${session.isLoading ? 'Generating mock reply' : 'Generate mock reply'}" ${
            session.draft.trim() && !session.isLoading ? '' : 'disabled'
          }>
            ${session.isLoading ? 'Generating' : 'Generate'}
          </button>
        </div>
      </form>
    </div>
  `;
}

export function renderPlaceholderScreen({ appState, screen }) {
  return `
    ${renderShellStatusBanner(appState)}
    ${renderInstallCard(appState)}

    <section class="screen-card hero-card">
      <p class="eyebrow">Current destination</p>
      <div class="hero-heading">
        <h2 id="screen-title">${screen.title}</h2>
        <span class="location-chip">${screen.kicker}</span>
      </div>
      <p class="screen-copy">${screen.description}</p>
    </section>

    <section class="screen-card state-card">
      <p class="eyebrow">Empty state</p>
      <h3>${screen.emptyTitle}</h3>
      <p class="screen-copy">${screen.emptyBody}</p>
    </section>

    <section class="screen-card detail-card" aria-label="Destination details">
      <ul class="detail-list">
        ${renderDetails(screen.details)}
      </ul>
    </section>
  `;
}
