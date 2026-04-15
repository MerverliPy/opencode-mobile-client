import './styles.css';

const releaseTag = 'v1.1.0';
const storageKey = 'opencode-mobile.phase-05';
const legacyStorageKey = 'opencode-mobile.phase-04';
const shellStorageKey = 'opencode-mobile.shell-v1';
const retryPrompt = 'Continue from the interrupted reply using the visible context.';

const screens = {
  sessions: {
    label: 'Sessions',
    kicker: 'Browse',
    title: 'Sessions',
    description: 'Recent work stays local to this device, and the shell is now tuned for installable relaunches on mobile.',
  },
  task: {
    label: 'Task',
    kicker: 'Work',
    title: 'Task',
    description:
      'The selected session keeps chat, tool output, file viewing, and diff review together in one relaunch-friendly mobile work surface.',
  },
  settings: {
    label: 'Settings',
    kicker: 'Prefs',
    title: 'Settings',
    description: 'Settings stays intentionally light while the shell now exposes install and connection guidance for mobile use.',
    emptyTitle: 'Settings still stay lightweight.',
    emptyBody:
      'Advanced preferences and broader app controls are still outside the active phase, even though install guidance now exists in the shell.',
    details: [
      ['Current state', 'Lightweight placeholder'],
      ['What changed this phase', 'The shell now exposes install readiness and honest online or offline guidance'],
      ['Still out of scope', 'Advanced settings, push notifications, and native wrapper work'],
    ],
  },
};

const navigationOrder = ['sessions', 'task', 'settings'];
const app = document.querySelector('#app');
const initialShellState = getStoredShellState();

const appState = {
  sessions: [],
  selectedSessionId: null,
  isHydratingSessions: true,
  ui: {
    notice: null,
  },
  shell: {
    isOnline: window.navigator.onLine,
    isStandalone: isStandaloneMode(),
    installPromptEvent: null,
    lastScreenId: initialShellState.lastScreenId,
  },
  toolDrawer: {
    isOpen: false,
    view: 'list',
    toolId: null,
    changePath: null,
  },
};

const responseTimers = new Map();
let shouldScrollTaskToEnd = false;
let shouldFocusComposer = false;
let shouldFocusDrawerClose = false;
let shouldRestoreTaskFocus = false;

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-6)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function compactText(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}

function isStandaloneMode() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function getStoredShellState() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(shellStorageKey) ?? 'null');

    return {
      lastScreenId: navigationOrder.includes(stored?.lastScreenId) ? stored.lastScreenId : 'sessions',
    };
  } catch {
    return { lastScreenId: 'sessions' };
  }
}

function persistShellState() {
  try {
    window.localStorage.setItem(
      shellStorageKey,
      JSON.stringify({
        lastScreenId: appState.shell.lastScreenId,
      }),
    );
  } catch {
    // Keep shell state in memory if local storage is unavailable.
  }
}

function getConnectionTone() {
  return appState.shell.isOnline ? 'online' : 'offline';
}

function getConnectionLabel() {
  return appState.shell.isOnline ? 'Online' : 'Offline';
}

function getConnectionMessage() {
  return appState.shell.isOnline
    ? 'Connected and ready. Recent local work still stays available if the connection drops.'
    : 'You are offline. Existing local sessions stay readable, but new network-backed work may be limited until connection returns.';
}

function getInstallHint() {
  if (appState.shell.isStandalone) {
    return 'Installed to Home Screen';
  }

  if (appState.shell.installPromptEvent) {
    return 'Install ready';
  }

  return 'Add to Home Screen available';
}

function getInstallBody() {
  if (appState.shell.isStandalone) {
    return 'This app now launches like an installed mobile app and keeps your last screen close at hand.';
  }

  if (appState.shell.installPromptEvent) {
    return 'This device can install the current shell for quicker relaunches and a more app-like experience.';
  }

  return 'Use Safari or browser share controls to add this client to your Home Screen for faster relaunches.';
}

function trimText(value, maxLength = 96) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function setUiNotice({ tone = 'info', title, body }) {
  appState.ui.notice = title && body ? { tone, title, body } : null;
}

function clearUiNotice() {
  appState.ui.notice = null;
}

function focusMainContent() {
  const mainContent = app.querySelector('#main-content');

  if (!(mainContent instanceof HTMLElement)) {
    return;
  }

  mainContent.focus({ preventScroll: true });
  mainContent.scrollIntoView({ block: 'start' });
}

function renderUiNotice() {
  const notice = appState.ui.notice;

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

function slugifySegment(value) {
  return (
    compactText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'mobile-output'
  );
}

function createToolResult({
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

function createDiffToolResult({ label = 'Review diff', toolName = 'git_diff', path, summary, files }) {
  return createToolResult({
    kind: 'diff',
    label,
    toolName,
    path,
    summary,
    files,
  });
}

function createStarterToolResult() {
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

function createStarterDiffResult() {
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

function createStarterMessages(diffToolResultId) {
  return [
    {
      id: createId('msg'),
      role: 'assistant',
      label: 'OpenCode',
      text:
        'This session now stays local to the device, so you can move between Sessions and Task without dropping the current thread.',
    },
    {
      id: createId('msg'),
      role: 'assistant',
      label: 'OpenCode',
      text: 'A starter diff review is ready, and the tools drawer still keeps file output nearby without leaving this thread.',
      toolResultId: diffToolResultId,
    },
    {
      id: createId('msg'),
      role: 'notice',
      label: 'Interrupted',
      tone: 'interrupted',
      text:
        'If a reply gets interrupted, the retry prompt is still available inside this session without clearing your draft.',
      actionLabel: 'Use retry prompt',
    },
  ];
}

function getToolResultKind(toolResult) {
  return toolResult?.kind === 'diff' ? 'diff' : 'file';
}

function getDiffFiles(toolResult) {
  return getToolResultKind(toolResult) === 'diff' && Array.isArray(toolResult?.files)
    ? toolResult.files
    : [];
}

function getDiffFile(toolResult, changePath) {
  const diffFiles = getDiffFiles(toolResult);

  if (!diffFiles.length) {
    return null;
  }

  return diffFiles.find((file) => file.path === changePath) ?? diffFiles[0];
}

function getDiffStatusLabel(status) {
  if (status === 'A') {
    return 'Added';
  }

  if (status === 'D') {
    return 'Deleted';
  }

  return 'Modified';
}

function getDiffLineCount(diffFile, type) {
  return (diffFile?.hunks ?? []).reduce(
    (count, hunk) =>
      count + (hunk.lines ?? []).filter((line) => (type ? line.type === type : true)).length,
    0,
  );
}

function normalizeDiffFile(diffFile) {
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

function normalizeToolResult(toolResult) {
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
    files: kind === 'diff'
      ? (Array.isArray(toolResult.files) ? toolResult.files.map(normalizeDiffFile).filter(Boolean) : [])
      : [],
    createdAt: Number(toolResult.createdAt) || Date.now(),
  };
}

function persistSessionState() {
  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        selectedSessionId: appState.selectedSessionId,
        sessions: appState.sessions.map(({ isLoading, ...session }) => session),
      }),
    );
  } catch {
    // Keep the in-memory state usable even if persistence is unavailable.
  }
}

function getSelectedSession() {
  return appState.sessions.find((session) => session.id === appState.selectedSessionId) ?? null;
}

function getToolResults(session) {
  return Array.isArray(session?.toolResults) ? session.toolResults : [];
}

function getToolResult(session, toolId) {
  return getToolResults(session).find((toolResult) => toolResult.id === toolId) ?? null;
}

function resetToolDrawer() {
  appState.toolDrawer.isOpen = false;
  appState.toolDrawer.view = 'list';
  appState.toolDrawer.toolId = null;
  appState.toolDrawer.changePath = null;
}

function getSessionTitle(session) {
  const firstUserMessage = session.messages.find(
    (message) => message.role === 'user' && compactText(message.text),
  );

  if (!firstUserMessage) {
    return 'New session';
  }

  return trimText(compactText(firstUserMessage.text), 42);
}

function getSessionPreview(session) {
  const previewMessage = [...session.messages]
    .reverse()
    .find((message) => message.role !== 'notice' && compactText(message.text));

  if (!previewMessage) {
    return 'Start a session to keep recent work close on mobile.';
  }

  return trimText(compactText(previewMessage.text), 112);
}

function getVisibleMessageCount(session) {
  return session.messages.filter((message) => message.role !== 'notice').length;
}

function formatSessionTime(timestamp) {
  const value = Number(timestamp);

  if (!Number.isFinite(value)) {
    return 'recently';
  }

  const elapsed = Date.now() - value;

  if (elapsed < 60_000) {
    return 'just now';
  }

  if (elapsed < 3_600_000) {
    return `${Math.max(1, Math.round(elapsed / 60_000))}m ago`;
  }

  if (elapsed < 86_400_000) {
    return `${Math.max(1, Math.round(elapsed / 3_600_000))}h ago`;
  }

  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(value);
}

function setSelectedSession(sessionId) {
  appState.selectedSessionId = appState.sessions.some((session) => session.id === sessionId)
    ? sessionId
    : null;
  resetToolDrawer();
  persistSessionState();
}

function updateSessionById(sessionId, updater) {
  let updatedSession = null;

  appState.sessions = appState.sessions
    .map((session) => {
      if (session.id !== sessionId) {
        return session;
      }

      updatedSession = updater(session);
      return updatedSession;
    })
    .sort((first, second) => second.updatedAt - first.updatedAt);

  persistSessionState();
  return updatedSession;
}

function createSession() {
  const now = Date.now();
  const starterToolResult = createStarterToolResult();
  const starterDiffResult = createStarterDiffResult();
  const session = {
    id: createId('session'),
    createdAt: now,
    updatedAt: now,
    draft: '',
    isLoading: false,
    messages: createStarterMessages(starterDiffResult.id),
    toolResults: [starterDiffResult, starterToolResult],
  };

  appState.sessions = [session, ...appState.sessions];
  appState.selectedSessionId = session.id;
  resetToolDrawer();
  persistSessionState();
  return session;
}

function hydrateSessions() {
  renderApp();

  window.setTimeout(() => {
    let nextSessions = [];
    let nextSelectedSessionId = null;

    try {
      const storedValue =
        window.localStorage.getItem(storageKey) ?? window.localStorage.getItem(legacyStorageKey);
      const stored = JSON.parse(storedValue ?? 'null');
      const rawSessions = Array.isArray(stored?.sessions) ? stored.sessions : [];

      nextSessions = rawSessions
        .filter((session) => session && typeof session.id === 'string' && Array.isArray(session.messages))
        .map((session) => ({
          id: session.id,
          createdAt: Number(session.createdAt) || Date.now(),
          updatedAt: Number(session.updatedAt) || Date.now(),
          draft: typeof session.draft === 'string' ? session.draft : '',
          isLoading: false,
          toolResults: Array.isArray(session.toolResults)
            ? session.toolResults.map(normalizeToolResult).filter(Boolean)
            : [],
          messages: session.messages
            .filter(
              (message) =>
                message &&
                typeof message.id === 'string' &&
                typeof message.role === 'string' &&
                typeof message.label === 'string' &&
                typeof message.text === 'string',
            )
            .map((message) => ({ ...message })),
        }))
        .sort((first, second) => second.updatedAt - first.updatedAt);

      nextSelectedSessionId =
        typeof stored?.selectedSessionId === 'string' ? stored.selectedSessionId : null;
    } catch {
      nextSessions = [];
      nextSelectedSessionId = null;
      setUiNotice({
        tone: 'warning',
        title: 'Saved sessions could not be restored.',
        body: 'You can keep using the app and start a fresh session, but previous local state was unavailable on this device.',
      });
    }

    appState.sessions = nextSessions;
    appState.selectedSessionId = nextSessions.some(
      (session) => session.id === nextSelectedSessionId,
    )
      ? nextSelectedSessionId
      : null;
    appState.isHydratingSessions = false;

    renderApp();
  }, 320);
}

function navigateTo(screenId) {
  if (screenId !== 'task') {
    resetToolDrawer();
  }

  appState.shell.lastScreenId = navigationOrder.includes(screenId) ? screenId : 'sessions';
  persistShellState();

  const nextHash = `#${screenId}`;

  if (window.location.hash === nextHash) {
    renderApp();
    return;
  }

  window.location.hash = nextHash;
}

function getActiveScreenId() {
  const candidate = window.location.hash.replace('#', '');

  if (screens[candidate]) {
    return candidate;
  }

  const fallbackScreen = navigationOrder.includes(appState.shell.lastScreenId)
    ? appState.shell.lastScreenId
    : 'sessions';

  window.history.replaceState(null, '', `#${fallbackScreen}`);
  return fallbackScreen;
}

function syncViewportHeight() {
  const height = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${height}px`);
}

function resizeComposer(textarea) {
  if (!textarea) {
    return;
  }

  textarea.style.height = '0px';
  textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
}

function syncComposerControls() {
  const composerInput = app.querySelector('#composer-input');
  const sendButton = app.querySelector('.send-button');
  const session = getSelectedSession();

  resizeComposer(composerInput);

  if (sendButton) {
    sendButton.disabled = !session || !session.draft.trim() || session.isLoading;
  }
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

function renderShellStatusBanner() {
  return `
    <section class="shell-status-banner is-${getConnectionTone()}" aria-live="polite">
      <div class="shell-status-copy">
        <p class="eyebrow">Connection</p>
        <p class="shell-status-title">${getConnectionLabel()}</p>
        <p class="shell-status-text">${getConnectionMessage()}</p>
      </div>
      <span class="shell-status-pill">${getInstallHint()}</span>
    </section>
  `;
}

function renderInstallCard() {
  const action = appState.shell.installPromptEvent ? 'prompt-install' : '';

  return `
    <section class="screen-card install-card">
      <p class="eyebrow">Install</p>
      <div class="hero-heading install-heading">
        <div>
          <h3>${appState.shell.isStandalone ? 'Installed and relaunch-ready' : 'Keep OpenCode close on iPhone'}</h3>
          <p class="screen-copy">${getInstallBody()}</p>
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

function renderNavigation(activeId) {
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

function renderMessage(message) {
  const session = getSelectedSession();
  const toolResult = message.toolResultId ? getToolResult(session, message.toolResultId) : null;
  const isDiffResult = getToolResultKind(toolResult) === 'diff';
  const isToolDrawerOpen = appState.toolDrawer.isOpen;
  const isActiveTool = isToolDrawerOpen && appState.toolDrawer.toolId === toolResult?.id;

  return `
    <li class="message-row is-${message.role}${message.tone ? ` is-${message.tone}` : ''}">
      <article class="message-bubble">
        <div class="message-meta">
          <span class="message-label">${message.label}</span>
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

function renderLoadingMessage() {
  const session = getSelectedSession();

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
        <p class="loading-copy">Thinking through the next reply while keeping this thread readable.</p>
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

function renderSessionCard(session) {
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

function renderSessionsScreen() {
  if (appState.isHydratingSessions) {
    return `
      ${renderShellStatusBanner()}
      ${renderInstallCard()}

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
      ${renderShellStatusBanner()}
      ${renderInstallCard()}

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
    ${renderShellStatusBanner()}
    ${renderInstallCard()}

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
      ${appState.sessions.map(renderSessionCard).join('')}
    </section>
  `;
}

function renderTaskNoSessionState() {
  const hasSessions = appState.sessions.length > 0;

  return `
    ${renderShellStatusBanner()}

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

function renderTaskScreen() {
  if (appState.isHydratingSessions) {
    return `
      ${renderShellStatusBanner()}

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

  const session = getSelectedSession();

  if (!session) {
    return renderTaskNoSessionState();
  }

  const messageCount = getVisibleMessageCount(session);
  const toolResults = getToolResults(session);
  const latestToolResult = toolResults[0] ?? null;
  const latestDiffResult = toolResults.find((toolResult) => getToolResultKind(toolResult) === 'diff') ?? null;
  const latestDiffFileCount = getDiffFiles(latestDiffResult).length;

  return `
    ${renderShellStatusBanner()}

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
        ${session.messages.map(renderMessage).join('')}
        ${renderLoadingMessage()}
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
          <button class="send-button" type="submit" aria-label="${session.isLoading ? 'Sending reply' : 'Send reply'}" ${
            session.draft.trim() && !session.isLoading ? '' : 'disabled'
          }>
            ${session.isLoading ? 'Sending' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  `;
}

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

function renderToolDrawer(session) {
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
                    <p class="screen-copy">Send or continue a task reply to generate a readable file surface here.</p>
                  </section>
                `
          }
        </div>
      </section>
    </div>
  `;
}

function renderPlaceholderScreen(screen) {
  return `
    ${renderShellStatusBanner()}
    ${renderInstallCard()}

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

function buildAssistantReply(prompt) {
  return `Working from your latest message:\n\n${prompt}\n\nMobile takeaways:\n- the current thread stays visible while you inspect tool output\n- file content now opens in a drawer with a clear return path\n- wrapped lines and larger touch targets keep common mobile actions easier to use`;
}

function createGeneratedToolResult(session, prompt) {
  const promptSummary = trimText(compactText(prompt), 42);

  return createToolResult({
    path: `notes/${slugifySegment(promptSummary)}.md`,
    summary: 'Prepared a mobile-friendly file snapshot for the latest task context.',
    content: [
      `# ${getSessionTitle(session)}`,
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
}

function createGeneratedDiffResult(session, prompt) {
  const promptSummary = trimText(compactText(prompt), 36);

  return createDiffToolResult({
    path: `reviews/${slugifySegment(promptSummary)}.diff`,
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
        path: `notes/${slugifySegment(promptSummary)}-review.md`,
        status: 'A',
        summary: 'Captures the latest mobile review notes as a new file.',
        hunks: [
          {
            header: '@@ -0,0 +1,7 @@',
            lines: [
              { type: 'add', oldNumber: null, newNumber: 1, text: `# Review notes for ${getSessionTitle(session)}` },
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
}

function finishAssistantReply(sessionId, prompt) {
  responseTimers.delete(sessionId);

  const updatedSession = updateSessionById(sessionId, (session) => {
    const toolResult = createGeneratedToolResult(session, prompt);
    const diffResult = createGeneratedDiffResult(session, prompt);

    return {
      ...session,
      isLoading: false,
      updatedAt: Date.now(),
      toolResults: [diffResult, toolResult, ...getToolResults(session)],
      messages: [
        ...session.messages,
        {
          id: createId('msg'),
          role: 'assistant',
          label: 'OpenCode',
          text: buildAssistantReply(prompt),
          toolResultId: diffResult.id,
        },
      ],
    };
  });

  if (updatedSession && appState.selectedSessionId === sessionId && getActiveScreenId() === 'task') {
    shouldScrollTaskToEnd = true;
  }

  renderApp();
}

function submitDraft() {
  const session = getSelectedSession();
  const prompt = session?.draft.trim() ?? '';

  if (!session || !prompt || session.isLoading) {
    return;
  }

  if (responseTimers.has(session.id)) {
    window.clearTimeout(responseTimers.get(session.id));
    responseTimers.delete(session.id);
  }

  updateSessionById(session.id, (currentSession) => ({
    ...currentSession,
    draft: '',
    isLoading: true,
    updatedAt: Date.now(),
    messages: [
      ...currentSession.messages,
      {
        id: createId('msg'),
        role: 'user',
        label: 'You',
        text: prompt,
      },
    ],
  }));

  shouldScrollTaskToEnd = true;
  renderApp();

  const responseTimer = window.setTimeout(() => {
    finishAssistantReply(session.id, prompt);
  }, 900);

  responseTimers.set(session.id, responseTimer);
}

function appendRetryPrompt() {
  const session = getSelectedSession();

  if (!session) {
    return;
  }

  session.draft = session.draft.trim() ? `${session.draft.trim()}\n\n${retryPrompt}` : retryPrompt;
  persistSessionState();
  shouldFocusComposer = true;
  renderApp();
}

function handleCreateSession() {
  createSession();
  shouldScrollTaskToEnd = true;
  shouldFocusComposer = true;
  navigateTo('task');
}

function renderApp() {
  const activeId = getActiveScreenId();
  const selectedSession = getSelectedSession();

  appState.shell.lastScreenId = activeId;
  appState.shell.isStandalone = isStandaloneMode();
  persistShellState();

  if (activeId !== 'task' && appState.toolDrawer.isOpen) {
    resetToolDrawer();
  }

  let frameTitle = screens[activeId].title;
  let frameCopy = screens[activeId].description;

  if (activeId === 'sessions') {
    frameCopy = appState.isHydratingSessions
      ? 'Local sessions are loading for this device.'
      : appState.sessions.length
        ? 'Saved work is easy to reopen without leaving the mobile shell.'
        : 'Start the first local session to make the client feel persistent on mobile.';
  }

  if (activeId === 'task') {
    frameTitle = selectedSession ? getSessionTitle(selectedSession) : 'Task';
    frameCopy = selectedSession
      ? 'The selected session stays available while you move between Sessions and Task.'
      : 'Pick or create a session before composing in the task view.';
  }

  app.innerHTML = `
    <div class="app-shell">
      <a class="skip-link" href="#main-content">Skip to content</a>

      <header class="top-frame">
        <div class="brand-row">
          <div>
            <p class="eyebrow">OpenCode mobile</p>
            <h1>${frameTitle}</h1>
          </div>
          <div class="header-status-group">
            <span class="status-badge status-badge-${getConnectionTone()}">${getConnectionLabel()}</span>
            <span class="status-badge">${releaseTag}</span>
          </div>
        </div>
        <p class="frame-copy">${frameCopy}</p>
      </header>

      <main id="main-content" class="screen-area${activeId === 'task' ? ' is-task' : ''}" aria-labelledby="screen-title" tabindex="-1">
        ${renderUiNotice()}
        ${
          activeId === 'sessions'
            ? renderSessionsScreen()
            : activeId === 'task'
              ? renderTaskScreen()
              : renderPlaceholderScreen(screens[activeId])
        }
      </main>

      <footer class="bottom-frame">
        <nav class="tab-bar" aria-label="Primary navigation">
          ${renderNavigation(activeId)}
        </nav>
      </footer>

      ${activeId === 'task' ? renderToolDrawer(selectedSession) : ''}
    </div>
  `;

  const composerInput = app.querySelector('#composer-input');
  syncComposerControls();

  if (shouldFocusDrawerClose) {
    shouldFocusDrawerClose = false;
    window.requestAnimationFrame(() => {
      app.querySelector('[data-action="close-tool-drawer"]')?.focus();
    });
  }

  if (shouldRestoreTaskFocus && activeId === 'task') {
    shouldRestoreTaskFocus = false;
    window.requestAnimationFrame(() => {
      app.querySelector('[data-action="open-tool-drawer"], #composer-input, [data-action="open-sessions"]')?.focus();
    });
  }

  if (shouldFocusComposer && composerInput) {
    shouldFocusComposer = false;
    window.requestAnimationFrame(() => composerInput.focus());
  }

  if (activeId === 'task' && shouldScrollTaskToEnd) {
    shouldScrollTaskToEnd = false;
    const screenArea = app.querySelector('.screen-area');

    window.requestAnimationFrame(() => {
      screenArea?.scrollTo({ top: screenArea.scrollHeight, behavior: 'smooth' });
    });
  }
}

app.addEventListener('input', (event) => {
  if (!(event.target instanceof HTMLTextAreaElement) || event.target.id !== 'composer-input') {
    return;
  }

  const session = getSelectedSession();

  if (!session) {
    return;
  }

  session.draft = event.target.value;
  persistSessionState();
  syncComposerControls();
});

app.addEventListener('focusin', (event) => {
  if (!(event.target instanceof HTMLTextAreaElement) || event.target.id !== 'composer-input') {
    return;
  }

  resizeComposer(event.target);

  window.requestAnimationFrame(() => {
    event.target.scrollIntoView({ block: 'nearest' });
  });
});

app.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }

  if (appState.toolDrawer.isOpen) {
    event.preventDefault();
    resetToolDrawer();
    shouldRestoreTaskFocus = true;
    renderApp();
    return;
  }

  if (appState.ui.notice) {
    event.preventDefault();
    clearUiNotice();
    renderApp();
  }
});

app.addEventListener('submit', (event) => {
  if (!(event.target instanceof HTMLFormElement) || event.target.id !== 'composer-form') {
    return;
  }

  event.preventDefault();
  submitDraft();
});

app.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const skipLink = event.target.closest('.skip-link');

  if (skipLink) {
    event.preventDefault();
    focusMainContent();
    return;
  }

  const actionButton = event.target.closest('[data-action="use-retry-prompt"]');
  const dismissNoticeButton = event.target.closest('[data-action="dismiss-ui-notice"]');
  const createSessionButton = event.target.closest('[data-action="create-session"]');
  const openSessionsButton = event.target.closest('[data-action="open-sessions"]');
  const openTaskButton = event.target.closest('[data-action="open-task"]');
  const openSelectedSessionButton = event.target.closest('[data-action="open-selected-session"]');
  const openToolDrawerButton = event.target.closest('[data-action="open-tool-drawer"]');
  const openToolFileButton = event.target.closest('[data-action="open-tool-file"]');
  const openToolDiffButton = event.target.closest('[data-action="open-tool-diff"]');
  const closeToolDrawerButton = event.target.closest('[data-action="close-tool-drawer"]');
  const backToToolListButton = event.target.closest('[data-action="back-to-tool-list"]');
  const promptInstallButton = event.target.closest('[data-action="prompt-install"]');
  const diffFileButton = event.target.closest('[data-action="select-diff-file"]');
  const sessionButton = event.target.closest('[data-action="select-session"]');

  if (dismissNoticeButton) {
    clearUiNotice();
    renderApp();
    return;
  }

  if (promptInstallButton && appState.shell.installPromptEvent) {
    const promptEvent = appState.shell.installPromptEvent;
    appState.shell.installPromptEvent = null;
    promptEvent.prompt();
    promptEvent.userChoice
      .then((choice) => {
        setUiNotice({
          tone: choice.outcome === 'accepted' ? 'success' : 'info',
          title: choice.outcome === 'accepted' ? 'Install started.' : 'Install dismissed.',
          body:
            choice.outcome === 'accepted'
              ? 'OpenCode can now relaunch more like an app from your Home Screen.'
              : 'You can still install later from the browser add-to-home controls.',
        });
      })
      .finally(() => {
        renderApp();
      });
    renderApp();
    return;
  }

  if (closeToolDrawerButton) {
    resetToolDrawer();
    shouldRestoreTaskFocus = true;
    renderApp();
    return;
  }

  if (backToToolListButton) {
    appState.toolDrawer.isOpen = true;
    appState.toolDrawer.view = 'list';
    appState.toolDrawer.toolId = null;
    appState.toolDrawer.changePath = null;
    renderApp();
    return;
  }

  if (openToolDrawerButton) {
    appState.toolDrawer.isOpen = true;
    appState.toolDrawer.view = 'list';
    appState.toolDrawer.toolId = null;
    appState.toolDrawer.changePath = null;
    shouldFocusDrawerClose = true;
    renderApp();
    return;
  }

  if (openToolFileButton instanceof HTMLElement) {
    const { toolId } = openToolFileButton.dataset;

    if (toolId && getToolResult(getSelectedSession(), toolId)) {
      appState.toolDrawer.isOpen = true;
      appState.toolDrawer.view = 'file';
      appState.toolDrawer.toolId = toolId;
      appState.toolDrawer.changePath = null;
      shouldFocusDrawerClose = true;
      renderApp();
    }

    return;
  }

  if (openToolDiffButton instanceof HTMLElement) {
    const { toolId } = openToolDiffButton.dataset;
    const toolResult = toolId ? getToolResult(getSelectedSession(), toolId) : null;
    const firstDiffFile = getDiffFiles(toolResult)[0] ?? null;

    if (toolResult && getToolResultKind(toolResult) === 'diff') {
      appState.toolDrawer.isOpen = true;
      appState.toolDrawer.view = 'diff';
      appState.toolDrawer.toolId = toolId;
      appState.toolDrawer.changePath = firstDiffFile?.path ?? null;
      shouldFocusDrawerClose = true;
      renderApp();
    }

    return;
  }

  if (diffFileButton instanceof HTMLElement) {
    const { changePath } = diffFileButton.dataset;

    if (changePath) {
      appState.toolDrawer.changePath = changePath;
      renderApp();
    }

    return;
  }

  if (createSessionButton) {
    handleCreateSession();
    return;
  }

  if (openSessionsButton) {
    navigateTo('sessions');
    return;
  }

  if (openTaskButton) {
    navigateTo('task');
    return;
  }

  if (openSelectedSessionButton && getSelectedSession()) {
    navigateTo('task');
    return;
  }

  if (sessionButton instanceof HTMLElement) {
    const { sessionId } = sessionButton.dataset;

    if (sessionId) {
      setSelectedSession(sessionId);
      shouldScrollTaskToEnd = true;
      navigateTo('task');
    }

    return;
  }

  if (!actionButton) {
    return;
  }

  appendRetryPrompt();
});

window.addEventListener('hashchange', renderApp);
window.addEventListener('resize', syncViewportHeight);
window.addEventListener('online', () => {
  appState.shell.isOnline = true;
  setUiNotice({
    tone: 'success',
    title: 'Back online.',
    body: 'Network-backed actions can resume, and local sessions stayed available while you were away.',
  });
  renderApp();
});
window.addEventListener('offline', () => {
  appState.shell.isOnline = false;
  setUiNotice({
    tone: 'warning',
    title: 'You are offline.',
    body: 'Saved local sessions remain readable, but new network-backed work may be limited until connection returns.',
  });
  renderApp();
});
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  appState.shell.installPromptEvent = event;
  renderApp();
});
window.addEventListener('appinstalled', () => {
  appState.shell.installPromptEvent = null;
  appState.shell.isStandalone = true;
  setUiNotice({
    tone: 'success',
    title: 'Installed to Home Screen.',
    body: 'The client can now relaunch more like a mobile app with the same local shell state.',
  });
  renderApp();
});
window.visualViewport?.addEventListener('resize', syncViewportHeight);
window.visualViewport?.addEventListener('scroll', syncViewportHeight);

syncViewportHeight();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      setUiNotice({
        tone: 'warning',
        title: 'Offline relaunch support is limited.',
        body: 'The app is still usable now, but offline shell setup did not finish. Try reloading again when the connection is stable.',
      });
      renderApp();
    });
  });
}
hydrateSessions();
