import { version as packageVersion } from '../package.json';
import './styles.css';

import { createMockRuntimeAdapter } from './adapters/mock-runtime.js';
import { createRemoteRuntimeAdapter } from './adapters/remote-runtime.js';
import { getDiffFiles, getToolResultKind } from './lib/tool-results.js';
import { createId } from './lib/utils.js';
import { createSession, getSelectedSession, getSessionTitle, getToolResult, getToolResults, resetToolDrawer, setSelectedSession, updateSessionById } from './state/session-state.js';
import { getConnectionLabel, getConnectionTone, isStandaloneMode } from './state/shell-state.js';
import { getStoredShellState, hydrateSessions, persistSessionState, persistShellState } from './state/storage.js';
import { renderNavigation, renderPlaceholderScreen, renderSessionsScreen, renderTaskScreen, renderUiNotice } from './ui/screens.js';
import { renderToolDrawer } from './ui/tool-drawer.js';

const releaseTag = `v${packageVersion}`;
const retryPrompt = 'Continue from the interrupted reply using the visible context.';
const runtimeAdapter = createMockRuntimeAdapter();
const remoteRuntimeBaseUrl = typeof import.meta.env?.VITE_REMOTE_RUNTIME_BASE_URL === 'string'
  ? import.meta.env.VITE_REMOTE_RUNTIME_BASE_URL.trim()
  : '';
const remoteRuntimeAdapter = createRemoteRuntimeAdapter({
  backend: remoteRuntimeBaseUrl
    ? {
        baseUrl: remoteRuntimeBaseUrl,
      }
    : null,
});

const remoteRunTransitions = {
  queued: {
    reconnect: 'running',
    notice: {
      tone: 'info',
      title: 'Remote run reconnected.',
      body: 'The mobile shell resumed the queued durable run state so you can keep following it from this session.',
    },
  },
  running: {
    reconnect: 'awaiting_input',
    notice: {
      tone: 'info',
      title: 'Remote run refreshed.',
      body: 'The session still points at an active remote run. The phone remains a shell for reconnect and status, not the executor.',
    },
  },
  awaiting_input: {
    reconnect: 'running',
    notice: {
      tone: 'info',
      title: 'Remote run resumed.',
      body: 'The session stays attached to the durable run so you can continue from mobile without losing context.',
    },
  },
  failed: {
    reconnect: 'awaiting_input',
    notice: {
      tone: 'warning',
      title: 'Remote run reopened.',
      body: 'The failed run is now marked as waiting for input so you can decide the next step from the mobile shell.',
    },
  },
  cancelled: {
    reconnect: 'queued',
    notice: {
      tone: 'info',
      title: 'Cancelled run reattached.',
      body: 'This session is linked to the stored durable run again for review, while execution still remains remote-only.',
    },
  },
  completed: {
    reconnect: 'completed',
    notice: {
      tone: 'success',
      title: 'Completed run reopened.',
      body: 'The completed remote run remains visible for review from the mobile shell.',
    },
  },
  idle: {
    reconnect: 'queued',
    notice: {
      tone: 'info',
      title: 'Remote run attached.',
      body: 'A durable remote run state is now attached to this session so reconnect controls stay visible on mobile.',
    },
  },
};

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
      'The selected session keeps local mock-adapter replies, tool output, file viewing, and diff review together in one relaunch-friendly mobile work surface.',
  },
  settings: {
    label: 'Settings',
    kicker: 'Prefs',
    title: 'Settings',
    description: 'Settings stays intentionally light while this release makes the active runtime source and shell-only status clearer on mobile.',
    emptyTitle: 'Settings still stay lightweight.',
    emptyBody:
      'Advanced preferences and broader app controls are still outside the active phase while this release focuses on an explicit runtime seam and honest shell status messaging.',
    details: [
      ['Active runtime', runtimeAdapter.sourceLabel],
      ['Current state', 'Local shell with mock-backed task surfaces'],
      ['What changed this release', 'Replies and generated tool output now flow through an explicit adapter boundary'],
      ['Still out of scope', 'Live backend transport, authentication, and advanced settings'],
    ],
  },
};

const navigationOrder = ['sessions', 'task', 'settings'];
const app = document.querySelector('#app');
const initialShellState = getStoredShellState(navigationOrder);

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

function setUiNotice({ tone = 'info', title, body }) {
  appState.ui.notice = title && body ? { tone, title, body } : null;
}

function clearUiNotice() {
  appState.ui.notice = null;
}

function syncRemoteSessionState(sessionId, operation, fallbackStatus, { successNotice, fallbackNotice, errorNotice }) {
  const session = getSelectedSession(appState);

  if (!session || session.id !== sessionId) {
    return;
  }

  const nextRun = operation.ok
    ? operation.remoteRun ?? {
        runId: session.remoteRun?.runId ?? null,
        status: fallbackStatus,
        updatedAt: Date.now(),
      }
    : operation.status === 'unsupported'
      ? {
          runId: session.remoteRun?.runId ?? null,
          status: fallbackStatus,
          updatedAt: Date.now(),
        }
      : {
          runId: session.remoteRun?.runId ?? null,
          status: typeof session.remoteRun?.status === 'string' && session.remoteRun.status ? session.remoteRun.status : 'idle',
          updatedAt: session.remoteRun?.updatedAt ?? Date.now(),
        };

  updateSessionById(appState, sessionId, (currentSession) => ({
    ...currentSession,
    updatedAt: Date.now(),
    runtimeMetadata: {
      ...(currentSession.runtimeMetadata ?? {}),
      runtimeId: remoteRuntimeAdapter.id,
    },
    remoteRun: {
      runId: typeof nextRun.runId === 'string' && nextRun.runId ? nextRun.runId : currentSession.remoteRun?.runId ?? null,
      status: typeof nextRun.status === 'string' && nextRun.status ? nextRun.status : fallbackStatus,
      updatedAt: Number(nextRun.updatedAt) || Date.now(),
    },
  }));

  if (operation.ok) {
    setUiNotice(successNotice);
  } else if (operation.status === 'unsupported') {
    setUiNotice(fallbackNotice);
  } else {
    setUiNotice({
      ...errorNotice,
      body: `${errorNotice.body} ${operation.details ? `Reason: ${operation.details}.` : ''}`.trim(),
    });
  }

  renderApp();
}

function focusMainContent() {
  const mainContent = app.querySelector('#main-content');

  if (!(mainContent instanceof HTMLElement)) {
    return;
  }

  mainContent.focus({ preventScroll: true });
  mainContent.scrollIntoView({ block: 'start' });
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

function navigateTo(screenId) {
  if (screenId !== 'task') {
    resetToolDrawer(appState);
  }

  appState.shell.lastScreenId = navigationOrder.includes(screenId) ? screenId : 'sessions';
  persistShellState(appState);

  const nextHash = `#${screenId}`;

  if (window.location.hash === nextHash) {
    renderApp();
    return;
  }

  window.location.hash = nextHash;
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
  const session = getSelectedSession(appState);

  resizeComposer(composerInput);

  if (sendButton) {
    sendButton.disabled = !session || !session.draft.trim() || session.isLoading;
  }
}

async function finishAssistantReply(sessionId, prompt) {
  responseTimers.delete(sessionId);

  const sessionBeforeUpdate = getSelectedSession(appState);

  const updatedSession = updateSessionById(appState, sessionId, (session) => {
    const { assistantMessage, toolResults } = runtimeAdapter.respond({
      prompt,
      sessionTitle: getSessionTitle(session),
    });

    return {
      ...session,
      isLoading: false,
      updatedAt: Date.now(),
      toolResults: [...toolResults, ...getToolResults(session)],
      messages: [
        ...session.messages,
        assistantMessage,
      ],
    };
  });

  if (updatedSession && appState.selectedSessionId === sessionId && getActiveScreenId() === 'task') {
    shouldScrollTaskToEnd = true;
  }

  if (sessionBeforeUpdate?.runtimeMetadata?.runtimeId === remoteRuntimeAdapter.id || sessionBeforeUpdate?.remoteRun?.runId) {
    const operation = await remoteRuntimeAdapter.startRun({
      prompt,
      sessionId,
      repoBinding: sessionBeforeUpdate.repoBinding ?? null,
    });

    syncRemoteSessionState(sessionId, operation, 'queued', {
      successNotice: {
        tone: 'success',
        title: 'Remote run started.',
        body: 'The mobile shell created a remote run and now tracks its durable state without pretending this phone is the executor.',
      },
      fallbackNotice: {
        tone: 'info',
        title: 'Remote shell fallback stayed active.',
        body: 'No backend base URL is configured, so the mobile shell kept the remote session honest with stored mock-backed state only.',
      },
      errorNotice: {
        tone: 'warning',
        title: 'Remote run could not start.',
        body: 'The backend request failed, so the mobile shell did not pretend the run started successfully.',
      },
    });
    return;
  }

  renderApp();
}

function submitDraft() {
  const session = getSelectedSession(appState);
  const prompt = session?.draft.trim() ?? '';

  if (!session || !prompt || session.isLoading) {
    return;
  }

  if (responseTimers.has(session.id)) {
    window.clearTimeout(responseTimers.get(session.id));
    responseTimers.delete(session.id);
  }

  updateSessionById(appState, session.id, (currentSession) => ({
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
  const session = getSelectedSession(appState);

  if (!session) {
    return;
  }

  session.draft = session.draft.trim() ? `${session.draft.trim()}\n\n${retryPrompt}` : retryPrompt;
  persistSessionState(appState);
  shouldFocusComposer = true;
  renderApp();
}

function createRemoteShellSession() {
  const session = createSession(appState, runtimeAdapter);
  const remoteRunId = createId('run');

  updateSessionById(appState, session.id, (currentSession) => ({
    ...currentSession,
    updatedAt: Date.now(),
    runtimeMetadata: {
      ...(currentSession.runtimeMetadata ?? {}),
      runtimeId: remoteRuntimeAdapter.id,
    },
    remoteRun: {
      runId: remoteRunId,
      status: 'queued',
      updatedAt: Date.now(),
    },
    repoBinding: {
      owner: 'demo',
      repo: 'mobile-shell',
      branch: 'remote-run-shell',
      workspace: 'iphone-preview',
    },
    messages: [
      ...currentSession.messages,
      {
        id: createId('msg'),
        role: 'assistant',
        label: 'OpenCode',
        text: 'This session now shows a durable remote run shell state. Reconnect and cancel stay visible here without claiming live backend transport.',
      },
    ],
  }));
}

function handleCreateSession() {
  createSession(appState, runtimeAdapter);
  shouldScrollTaskToEnd = true;
  shouldFocusComposer = true;
  navigateTo('task');
}

function handleCreateRemoteSession() {
  createRemoteShellSession();
  shouldScrollTaskToEnd = true;
  shouldFocusComposer = true;
  navigateTo('task');
}

async function handleReconnectRemoteRun() {
  const session = getSelectedSession(appState);

  if (!session) {
    return;
  }

  const runId = typeof session.remoteRun?.runId === 'string' ? session.remoteRun.runId : '';
  const status = typeof session.remoteRun?.status === 'string' ? session.remoteRun.status : 'idle';
  const nextState = remoteRunTransitions[status] ?? remoteRunTransitions.idle;
  const ensuredRunId = runId || createId('run');
  const statusOperation = await remoteRuntimeAdapter.fetchRunStatus({ runId: ensuredRunId, sessionId: session.id });

  if (statusOperation.ok) {
    syncRemoteSessionState(session.id, statusOperation, statusOperation.remoteRun?.status ?? status, {
      successNotice: {
        tone: 'info',
        title: 'Remote status refreshed.',
        body: 'The mobile shell checked the latest backend run state and updated the stored remote status.',
      },
      fallbackNotice: nextState.notice,
      errorNotice: {
        tone: 'warning',
        title: 'Remote status check failed.',
        body: 'The shell could not confirm the latest backend run state before reconnecting.',
      },
    });
  }

  if (statusOperation.ok) {
    return;
  }

  const operation = await remoteRuntimeAdapter.resumeRun({ runId: ensuredRunId, sessionId: session.id });

  syncRemoteSessionState(session.id, operation, nextState.reconnect, {
    successNotice: nextState.notice,
    fallbackNotice: {
      ...nextState.notice,
      body: `${nextState.notice.body} Backend transport is still not configured, so the shell only updates stored mobile state.`,
    },
    errorNotice: {
      tone: 'warning',
      title: 'Remote reconnect failed.',
      body: 'The mobile shell kept the durable run visible, but the backend resume request did not succeed.',
    },
  });
}

async function handleCancelRemoteRun() {
  const session = getSelectedSession(appState);

  if (!session || typeof session.remoteRun?.runId !== 'string' || !session.remoteRun.runId) {
    return;
  }

  const operation = await remoteRuntimeAdapter.cancelRun({ runId: session.remoteRun.runId, sessionId: session.id });

  syncRemoteSessionState(session.id, operation, 'cancelled', {
    successNotice: {
      tone: 'warning',
      title: 'Remote run cancelled.',
      body: 'The current remote run was cancelled from the mobile shell.',
    },
    fallbackNotice: {
      tone: 'warning',
      title: 'Remote run marked cancelled.',
      body: 'The mobile shell marked the stored durable run as cancelled. Backend transport is still not configured, so this remains an honest shell-only control.',
    },
    errorNotice: {
      tone: 'warning',
      title: 'Remote cancel failed.',
      body: 'The backend cancel request failed, so the shell kept the run visible instead of pretending cancellation succeeded.',
    },
  });
}

function renderApp() {
  const activeId = getActiveScreenId();
  const selectedSession = getSelectedSession(appState);

  appState.shell.lastScreenId = activeId;
  appState.shell.isStandalone = isStandaloneMode();
  persistShellState(appState);

  if (activeId !== 'task' && appState.toolDrawer.isOpen) {
    resetToolDrawer(appState);
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
            <p class="eyebrow">OpenCode mobile shell</p>
            <h1>${frameTitle}</h1>
          </div>
          <div class="header-status-group">
            <span class="status-badge status-badge-${getConnectionTone(appState)}">${getConnectionLabel(appState)}</span>
            <span class="status-badge">${releaseTag}</span>
          </div>
        </div>
        <p class="frame-copy">${frameCopy}</p>
      </header>

      <main id="main-content" class="screen-area${activeId === 'task' ? ' is-task' : ''}" aria-labelledby="screen-title" tabindex="-1">
        ${renderUiNotice(appState.ui.notice)}
        ${
          activeId === 'sessions'
            ? renderSessionsScreen({ appState })
            : activeId === 'task'
              ? renderTaskScreen({ appState, screens })
              : renderPlaceholderScreen({ appState, screen: screens[activeId] })
        }
      </main>

      <footer class="bottom-frame">
        <nav class="tab-bar" aria-label="Primary navigation">
          ${renderNavigation({ activeId, navigationOrder, screens })}
        </nav>
      </footer>

      ${activeId === 'task' ? renderToolDrawer({ appState, session: selectedSession }) : ''}
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

  const session = getSelectedSession(appState);

  if (!session) {
    return;
  }

  session.draft = event.target.value;
  persistSessionState(appState);
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
    resetToolDrawer(appState);
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
  const createRemoteSessionButton = event.target.closest('[data-action="create-remote-session"]');
  const openSessionsButton = event.target.closest('[data-action="open-sessions"]');
  const openTaskButton = event.target.closest('[data-action="open-task"]');
  const openSelectedSessionButton = event.target.closest('[data-action="open-selected-session"]');
  const reconnectRemoteRunButton = event.target.closest('[data-action="reconnect-remote-run"]');
  const cancelRemoteRunButton = event.target.closest('[data-action="cancel-remote-run"]');
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
    resetToolDrawer(appState);
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

    if (toolId && getToolResult(getSelectedSession(appState), toolId)) {
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
    const toolResult = toolId ? getToolResult(getSelectedSession(appState), toolId) : null;
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

  if (createRemoteSessionButton) {
    handleCreateRemoteSession();
    return;
  }

  if (reconnectRemoteRunButton) {
    handleReconnectRemoteRun();
    return;
  }

  if (cancelRemoteRunButton) {
    handleCancelRemoteRun();
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

  if (openSelectedSessionButton && getSelectedSession(appState)) {
    navigateTo('task');
    return;
  }

  if (sessionButton instanceof HTMLElement) {
    const { sessionId } = sessionButton.dataset;

    if (sessionId) {
      setSelectedSession(appState, sessionId);
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
    body: 'Connection returned. This release still behaves as a local mobile shell, and any saved sessions remained on this device while you were away.',
  });
  renderApp();
});
window.addEventListener('offline', () => {
  appState.shell.isOnline = false;
  setUiNotice({
    tone: 'warning',
    title: 'You are offline.',
    body: 'Saved local sessions remain readable, but this release does not connect to a live backend and some reload or install-related checks may wait until connection returns.',
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

hydrateSessions({ appState, renderApp, setUiNotice });
