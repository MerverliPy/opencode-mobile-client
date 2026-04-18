import { normalizeToolResult } from '../lib/tool-results.js';
import { createRemoteRunState, createRepoBindingState, createRuntimeMetadata } from './runtime-metadata.js';

const storageKey = 'opencode-mobile.phase-05';
const legacyStorageKey = 'opencode-mobile.phase-04';
const shellStorageKey = 'opencode-mobile.shell-v1';

export function getStoredShellState(navigationOrder) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(shellStorageKey) ?? 'null');

    return {
      lastScreenId: navigationOrder.includes(stored?.lastScreenId) ? stored.lastScreenId : 'sessions',
    };
  } catch {
    return { lastScreenId: 'sessions' };
  }
}

export function persistShellState(appState) {
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

export function persistSessionState(appState) {
  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        selectedSessionId: appState.selectedSessionId,
        sessions: appState.sessions.map((session) => {
          const nextSession = { ...session };
          delete nextSession.isLoading;
          nextSession.runtimeMetadata = createRuntimeMetadata(session);
          nextSession.remoteRun = createRemoteRunState(session.remoteRun);
          nextSession.repoBinding = createRepoBindingState(session.repoBinding);
          return nextSession;
        }),
      }),
    );
  } catch {
    // Keep the in-memory state usable even if persistence is unavailable.
  }
}

export function hydrateSessions({ appState, renderApp, setUiNotice }) {
  renderApp();

  window.setTimeout(() => {
    let nextSessions;
    let nextSelectedSessionId;

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
          customTitle: typeof session.customTitle === 'string' ? session.customTitle : undefined,
          draft: typeof session.draft === 'string' ? session.draft : '',
          isLoading: false,
          runtimeMetadata: createRuntimeMetadata(session),
          remoteRun: createRemoteRunState(session.remoteRun),
          repoBinding: createRepoBindingState(session.repoBinding),
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
    appState.selectedSessionId = nextSessions.some((session) => session.id === nextSelectedSessionId)
      ? nextSelectedSessionId
      : null;
    appState.isHydratingSessions = false;

    renderApp();
  }, 320);
}
