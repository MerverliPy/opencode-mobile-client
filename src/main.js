import { version as packageVersion } from '../package.json';
import './styles.css';

import { createMockRuntimeAdapter } from './adapters/mock-runtime.js';
import { createRemoteRuntimeAdapter } from './adapters/remote-runtime.js';
import { currentSessionRemoteLinks, createRemoteLinkState } from './lib/remote-links.js';
import { getDiffFiles, getToolResultKind } from './lib/tool-results.js';
import {
  createBlockedLinkNotice,
  createInvalidLinkNotice,
  createUiNotice,
  createUnavailableLinkNotice,
  createUnsupportedLinkNotice,
} from './lib/ui-notices.js';
import { createId } from './lib/utils.js';
import {
  createRemoteAssistantMessage,
  deleteSessionById,
  findRemoteAssistantMessage,
  createSession,
  getSessionById,
  getSelectedSession,
  isRemoteSession,
  getSessionTitle,
  getToolResult,
  getToolResults,
  getSessionEditableTitle,
  resetToolDrawer,
  renameSessionById,
  setSelectedSession,
  updateSessionById,
} from './state/session-state.js';
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

function createVoiceEntryState() {
  const recognitionApi = window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;

  return {
    isSupported: typeof recognitionApi === 'function',
    isListening: false,
    recognitionApi,
    controller: null,
  };
}

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
  voiceEntry: createVoiceEntryState(),
};

const responseTimers = new Map();
let shouldScrollTaskToEnd = false;
let shouldFocusComposer = false;
let shouldFocusDrawerClose = false;
let shouldRestoreTaskFocus = false;

function setUiNotice({ tone = 'info', title, body }) {
  appState.ui.notice = createUiNotice({ tone, title, body });
}

function clearUiNotice() {
  appState.ui.notice = null;
}

function openExternalLink(url, label) {
  const normalizedUrl = typeof url === 'string' ? url.trim() : '';

  if (!normalizedUrl) {
    setUiNotice(createUnavailableLinkNotice(label));
    renderApp();
    return;
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    setUiNotice(createInvalidLinkNotice(label));
    renderApp();
    return;
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    setUiNotice(createUnsupportedLinkNotice(label));
    renderApp();
    return;
  }

  const openedWindow = window.open(parsedUrl.toString(), '_blank', 'noopener,noreferrer');

  if (!openedWindow) {
    setUiNotice(createBlockedLinkNotice(label));
    renderApp();
  }
}

function syncRemoteSessionState(sessionId, operation, fallbackStatus, { successNotice, fallbackNotice, errorNotice }) {
  const session = getSessionById(appState, sessionId);

  if (!session) {
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
          status: 'failed',
          updatedAt: Date.now(),
        };

  const nextRemoteLinks = operation.ok
    ? createRemoteLinkState(operation.payload)
    : currentSessionRemoteLinks(session);

  updateSessionById(appState, sessionId, (currentSession) => ({
    ...currentSession,
    isLoading: operation.ok ? currentSession.isLoading : false,
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
    remoteLinks: currentSessionRemoteLinks({ ...currentSession, remoteLinks: nextRemoteLinks }),
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

function clearResponseTimer(sessionId) {
  if (!responseTimers.has(sessionId)) {
    return;
  }

  window.clearTimeout(responseTimers.get(sessionId));
  responseTimers.delete(sessionId);
}

function finalizeRemoteAssistantHydration(sessionId, result) {
  const hydration = remoteRuntimeAdapter.hydrateCompletedRun(result);

  updateSessionById(appState, sessionId, (session) => {
    const nextMessages = [...session.messages];
    const runId = hydration.remoteRun?.runId ?? session.remoteRun?.runId ?? null;
    const existingRemoteMessage = findRemoteAssistantMessage(session, runId);
    const remoteAssistantMessage = hydration.ok
      ? createRemoteAssistantMessage({
          runId,
          text: hydration.assistantResponse?.text,
          label: hydration.assistantResponse?.label,
        })
      : null;

    if (remoteAssistantMessage && !existingRemoteMessage) {
      nextMessages.push(remoteAssistantMessage);
    }

    return {
      ...session,
      isLoading: false,
      updatedAt: Date.now(),
      messages: nextMessages,
      remoteRun: {
        runId,
        status: hydration.remoteRun?.status ?? session.remoteRun?.status ?? 'idle',
        updatedAt: hydration.remoteRun?.updatedAt ?? Date.now(),
      },
    };
  });

  if (hydration.ok) {
    setUiNotice({
      tone: 'success',
      title: 'Remote response loaded.',
      body: 'The completed backend-owned assistant response is now attached to this session.',
    });
  } else if (hydration.status === 'completed') {
    setUiNotice({
      tone: 'warning',
      title: 'Remote run completed without response output.',
      body: 'The shell kept the run marked complete instead of inventing a local success message.',
    });
  }
}

function buildRemotePendingNotice(operation) {
  if (operation.ok) {
    return {
      tone: 'info',
      title: 'Remote run is active.',
      body: 'This session is waiting for backend-owned output, so the shell does not generate a local assistant reply.',
    };
  }

  if (operation.status === 'unsupported') {
    return {
      tone: 'info',
      title: 'Remote shell fallback stayed active.',
      body: 'Remote backend transport is unavailable by configuration, so no fake local success reply was generated for this remote session.',
    };
  }

  return {
    tone: 'warning',
    title: 'Remote run failed to start.',
    body: 'The backend request failed, and the shell kept the session honest instead of fabricating a local assistant success.',
  };
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

function stopVoiceEntry() {
  const voiceEntry = appState.voiceEntry;

  if (!voiceEntry?.controller) {
    if (voiceEntry) {
      voiceEntry.isListening = false;
    }
    return;
  }

  const controller = voiceEntry.controller;
  voiceEntry.controller = null;
  voiceEntry.isListening = false;
  controller.onresult = null;
  controller.onerror = null;
  controller.onend = null;
  controller.stop();
}

function applyVoiceTranscript(transcript) {
  const session = getSelectedSession(appState);
  const normalizedTranscript = typeof transcript === 'string' ? transcript.replace(/\s+/g, ' ').trim() : '';

  if (!session || !normalizedTranscript) {
    return;
  }

  session.draft = session.draft.trim() ? `${session.draft.trim()} ${normalizedTranscript}` : normalizedTranscript;
  persistSessionState(appState);
  shouldFocusComposer = true;
}

function handleVoiceEntryError(errorCode) {
  const blocked = errorCode === 'not-allowed' || errorCode === 'service-not-allowed';

  setUiNotice({
    tone: blocked ? 'warning' : 'info',
    title: blocked ? 'Microphone access was denied.' : 'Voice entry is unavailable right now.',
    body: blocked
      ? 'Voice input stays optional. You can continue by typing in the same message composer.'
      : 'Speech recognition is not currently available, so the mobile shell keeps typed input as the reliable path.',
  });
}

function startVoiceEntry() {
  const voiceEntry = appState.voiceEntry;
  const session = getSelectedSession(appState);

  if (!session) {
    return;
  }

  if (!voiceEntry?.isSupported || typeof voiceEntry.recognitionApi !== 'function') {
    setUiNotice({
      tone: 'info',
      title: 'Voice entry is not supported here.',
      body: 'This browser does not expose speech recognition, so you can keep using the same composer by typing instead.',
    });
    renderApp();
    return;
  }

  if (voiceEntry.isListening) {
    stopVoiceEntry();
    setUiNotice({
      tone: 'info',
      title: 'Voice entry stopped.',
      body: 'You can keep editing the same draft by typing or start voice entry again.',
    });
    renderApp();
    return;
  }

  const recognition = new voiceEntry.recognitionApi();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  voiceEntry.controller = recognition;
  voiceEntry.isListening = true;

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results ?? [])
      .map((result) => result?.[0]?.transcript ?? '')
      .join(' ');

    applyVoiceTranscript(transcript);
    setUiNotice({
      tone: 'success',
      title: 'Voice entry added to draft.',
      body: 'The dictated text now sits in the same composer flow as typed input.',
    });
  };

  recognition.onerror = (event) => {
    handleVoiceEntryError(event?.error ?? 'unknown');
  };

  recognition.onend = () => {
    voiceEntry.controller = null;
    voiceEntry.isListening = false;
    renderApp();
  };

  setUiNotice({
    tone: 'info',
    title: 'Voice entry started.',
    body: 'Speak your prompt now. The transcript will return to the same composer draft.',
  });

  recognition.start();
  renderApp();
}

async function finishAssistantReply(sessionId, prompt) {
  clearResponseTimer(sessionId);

  const sessionBeforeUpdate = getSelectedSession(appState);

  if (isRemoteSession(sessionBeforeUpdate)) {
    const operation = await remoteRuntimeAdapter.startRun({
      prompt,
      sessionId,
      repoBinding: sessionBeforeUpdate?.repoBinding ?? null,
    });

    updateSessionById(appState, sessionId, (session) => ({
      ...session,
      isLoading: operation.ok,
      updatedAt: Date.now(),
      runtimeMetadata: {
        ...(session.runtimeMetadata ?? {}),
        runtimeId: remoteRuntimeAdapter.id,
      },
      remoteRun: {
        runId: operation.remoteRun?.runId ?? session.remoteRun?.runId ?? null,
        status: operation.remoteRun?.status ?? (operation.status === 'unsupported' ? 'idle' : 'failed'),
        updatedAt: operation.remoteRun?.updatedAt ?? Date.now(),
      },
    }));

    setUiNotice(buildRemotePendingNotice(operation));

    if (operation.ok && operation.remoteRun?.status === 'completed') {
      finalizeRemoteAssistantHydration(sessionId, operation);
    }

    if (appState.selectedSessionId === sessionId && getActiveScreenId() === 'task') {
      shouldScrollTaskToEnd = true;
    }

    renderApp();
    return;
  }

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

  renderApp();
}

function submitDraft() {
  const session = getSelectedSession(appState);
  const prompt = session?.draft.trim() ?? '';

  if (!session || !prompt || session.isLoading) {
    return;
  }

  clearResponseTimer(session.id);

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
    remoteLinks: {
      previews: [],
      share: null,
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

function handleRenameSession(sessionId) {
  const session = getSessionById(appState, sessionId);

  if (!session) {
    return;
  }

  const currentTitle = getSessionEditableTitle(session);
  const nextTitle = window.prompt('Rename session', currentTitle);

  if (typeof nextTitle !== 'string') {
    return;
  }

  const renamedSession = renameSessionById(appState, sessionId, nextTitle);

  if (!renamedSession) {
    setUiNotice({
      tone: 'warning',
      title: 'Session name was not changed.',
      body: 'Enter a non-empty session name to keep this saved thread manageable on mobile.',
    });
  } else {
    setUiNotice({
      tone: 'success',
      title: 'Session renamed.',
      body: 'The saved session name was updated without altering its messages, tools, or runtime state.',
    });
  }

  renderApp();
}

function handleDeleteSession(sessionId) {
  const session = getSessionById(appState, sessionId);

  if (!session) {
    return;
  }

  const confirmed = window.confirm(`Delete "${getSessionEditableTitle(session)}"? This removes the saved local session from this device.`);

  if (!confirmed) {
    return;
  }

  const deletion = deleteSessionById(appState, sessionId);

  if (!deletion) {
    return;
  }

  setUiNotice({
    tone: 'warning',
    title: 'Session deleted.',
    body: deletion.selectedSessionId
      ? 'The saved session was removed, and the next available session is now selected.'
      : 'The saved session was removed, and Task now returns to an honest empty state until you start or choose another session.',
  });

  if (!deletion.selectedSessionId && getActiveScreenId() === 'task') {
    shouldRestoreTaskFocus = false;
  }

  renderApp();
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
    if (statusOperation.remoteRun?.status === 'completed') {
      finalizeRemoteAssistantHydration(session.id, statusOperation);
      renderApp();
      return;
    }

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

  if (operation.ok && operation.remoteRun?.status === 'completed') {
    finalizeRemoteAssistantHydration(session.id, operation);
  }
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
  const openPreviewLinkButton = event.target.closest('[data-action="open-preview-link"]');
  const openShareLinkButton = event.target.closest('[data-action="open-share-link"]');
  const startVoiceEntryButton = event.target.closest('[data-action="start-voice-entry"]');
  const sessionButton = event.target.closest('[data-action="select-session"]');
  const renameSessionButton = event.target.closest('[data-action="rename-session"]');
  const deleteSessionButton = event.target.closest('[data-action="delete-session"]');

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

  if (openPreviewLinkButton instanceof HTMLElement) {
    openExternalLink(openPreviewLinkButton.dataset.url, openPreviewLinkButton.dataset.label || 'Preview link');
    return;
  }

  if (openShareLinkButton instanceof HTMLElement) {
    openExternalLink(openShareLinkButton.dataset.url, openShareLinkButton.dataset.label || 'Read-only share link');
    return;
  }

  if (startVoiceEntryButton) {
    startVoiceEntry();
    return;
  }

  if (renameSessionButton instanceof HTMLElement) {
    const { sessionId } = renameSessionButton.dataset;

    if (sessionId) {
      handleRenameSession(sessionId);
    }

    return;
  }

  if (deleteSessionButton instanceof HTMLElement) {
    const { sessionId } = deleteSessionButton.dataset;

    if (sessionId) {
      handleDeleteSession(sessionId);
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
