import { afterEach, describe, expect, it, vi } from 'vitest';

import { createMockRuntimeAdapter } from '../src/adapters/mock-runtime.js';
import { createRemoteRuntimeAdapter } from '../src/adapters/remote-runtime.js';
import {
  getDiffFile,
  getDiffFiles,
  getDiffLineCount,
  getDiffStatusLabel,
  getToolResultKind,
  normalizeDiffFile,
  normalizeToolResult,
} from '../src/lib/tool-results.js';
import {
  createStarterMessages,
  createRuntimeMetadata,
  getSelectedSession,
  getSessionPreview,
  getSessionTitle,
  getToolResult,
  getToolResults,
  getVisibleMessageCount,
} from '../src/state/session-state.js';
import {
  getConnectionLabel,
  getConnectionMessage,
  getConnectionTone,
  getInstallBody,
  getInstallHint,
  isStandaloneMode,
} from '../src/state/shell-state.js';
import { getStoredShellState, hydrateSessions, persistSessionState, persistShellState } from '../src/state/storage.js';

function createLocalStorage(initialEntries = {}) {
  const store = new Map(Object.entries(initialEntries));

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, nextValue) {
      store.set(key, nextValue);
    },
    readJson(key) {
      return JSON.parse(store.get(key));
    },
  };
}

function withWindow(windowValue, callback) {
  const previousWindow = globalThis.window;
  globalThis.window = windowValue;

  try {
    return callback();
  } finally {
    globalThis.window = previousWindow;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Phase 13 smoke coverage', () => {
  it('hydrates stored sessions with normalized tool results', () => {
    const renderApp = vi.fn();
    const setUiNotice = vi.fn();
    const appState = {
      sessions: [],
      selectedSessionId: null,
      isHydratingSessions: true,
    };
    const storedState = JSON.stringify({
      selectedSessionId: 'session-2',
      sessions: [
        {
          id: 'session-1',
          createdAt: 10,
          updatedAt: 10,
          draft: 'older draft',
          toolResults: [{ id: 'bad-tool' }],
          messages: [{ id: 'msg-1', role: 'user', label: 'You', text: 'older' }],
        },
        {
          id: 'session-2',
          createdAt: 20,
          updatedAt: 30,
          draft: null,
          toolResults: [
            {
              id: 'tool-1',
              kind: 'diff',
              path: 'reviews/mobile.diff',
              summary: 'Stored diff',
              files: [
                {
                  path: 'src/main.js',
                  summary: 'Changed file',
                  hunks: [{ header: '@@ -1 +1 @@', lines: [{ type: 'add', text: 'const x = 1;' }] }],
                },
              ],
            },
          ],
          messages: [{ id: 'msg-2', role: 'assistant', label: 'OpenCode', text: 'latest' }],
        },
      ],
    });

    withWindow(
      {
        localStorage: createLocalStorage({ 'opencode-mobile.phase-05': storedState }),
        setTimeout(callback) {
          callback();
          return 1;
        },
      },
      () => {
        hydrateSessions({ appState, renderApp, setUiNotice });
      },
    );

    expect(renderApp).toHaveBeenCalledTimes(2);
    expect(setUiNotice).not.toHaveBeenCalled();
    expect(appState.isHydratingSessions).toBe(false);
    expect(appState.sessions).toHaveLength(2);
    expect(appState.sessions[0].id).toBe('session-2');
    expect(appState.sessions[0].draft).toBe('');
    expect(appState.sessions[0].isLoading).toBe(false);
    expect(appState.sessions[0].runtimeMetadata).toEqual({
      runtimeId: 'mock-local',
      remoteRun: { runId: null, status: 'idle', updatedAt: null },
      repoBinding: { owner: '', repo: '', branch: '', workspace: '' },
    });
    expect(appState.sessions[0].remoteRun).toEqual({ runId: null, status: 'idle', updatedAt: null });
    expect(appState.sessions[0].repoBinding).toEqual({ owner: '', repo: '', branch: '', workspace: '' });
    expect(appState.sessions[0].toolResults).toHaveLength(1);
    expect(appState.sessions[0].toolResults[0].kind).toBe('diff');
    expect(appState.sessions[0].toolResults[0].files[0].status).toBe('M');
    expect(appState.selectedSessionId).toBe('session-2');
  });

  it('shows a warning when stored sessions cannot be parsed', () => {
    const renderApp = vi.fn();
    const setUiNotice = vi.fn();
    const appState = {
      sessions: [{ id: 'existing' }],
      selectedSessionId: 'existing',
      isHydratingSessions: true,
    };

    withWindow(
      {
        localStorage: createLocalStorage({ 'opencode-mobile.phase-05': '{not-json' }),
        setTimeout(callback) {
          callback();
          return 1;
        },
      },
      () => {
        hydrateSessions({ appState, renderApp, setUiNotice });
      },
    );

    expect(appState.sessions).toEqual([]);
    expect(appState.selectedSessionId).toBe(null);
    expect(appState.isHydratingSessions).toBe(false);
    expect(setUiNotice).toHaveBeenCalledWith({
      tone: 'warning',
      title: 'Saved sessions could not be restored.',
      body: 'You can keep using the app and start a fresh session, but previous local state was unavailable on this device.',
    });
  });

  it('returns stable mock adapter metadata and tool surfaces', () => {
    const adapter = createMockRuntimeAdapter();
    const starterPayload = adapter.createStarterSessionPayload();
    const response = adapter.respond({
      prompt: 'Review the narrow screen diff changes for this task.',
      sessionTitle: 'Mobile review',
    });

    expect(adapter.id).toBe('mock-local');
    expect(adapter.sourceLabel).toBe('Local mock adapter');
    expect(starterPayload.toolResults).toHaveLength(2);
    expect(starterPayload.toolResults[0].kind).toBe('diff');
    expect(starterPayload.diffToolResultId).toBe(starterPayload.toolResults[0].id);
    expect(response.assistantMessage.label).toBe('OpenCode');
    expect(response.assistantMessage.text).toContain('Mock adapter reply based on your latest message');
    expect(response.toolResults).toHaveLength(2);
    expect(response.toolResults[0].kind).toBe('diff');
    expect(response.toolResults[1].kind).toBe('file');
    expect(response.toolResults[0].files.length).toBeGreaterThan(0);
  });

  it('hydrates sessions from the legacy storage key when current storage is absent', () => {
    const renderApp = vi.fn();
    const setUiNotice = vi.fn();
    const appState = {
      sessions: [],
      selectedSessionId: null,
      isHydratingSessions: true,
    };
    const legacyState = JSON.stringify({
      selectedSessionId: 'legacy-session',
      sessions: [
        {
          id: 'legacy-session',
          createdAt: 1,
          updatedAt: 2,
          draft: 'legacy draft',
          toolResults: [],
          messages: [{ id: 'legacy-msg', role: 'assistant', label: 'OpenCode', text: 'legacy session' }],
        },
      ],
    });

    withWindow(
      {
        localStorage: createLocalStorage({ 'opencode-mobile.phase-04': legacyState }),
        setTimeout(callback) {
          callback();
          return 1;
        },
      },
      () => {
        hydrateSessions({ appState, renderApp, setUiNotice });
      },
    );

    expect(setUiNotice).not.toHaveBeenCalled();
    expect(appState.sessions).toHaveLength(1);
    expect(appState.sessions[0].id).toBe('legacy-session');
    expect(appState.selectedSessionId).toBe('legacy-session');
  });

  it('reads and persists shell state with safe mobile fallbacks', () => {
    const localStorage = createLocalStorage({
      'opencode-mobile.shell-v1': JSON.stringify({ lastScreenId: 'task' }),
    });

    expect(
      withWindow({ localStorage }, () => getStoredShellState(['sessions', 'task', 'settings'])),
    ).toEqual({ lastScreenId: 'task' });

    expect(
      withWindow(
        { localStorage: createLocalStorage({ 'opencode-mobile.shell-v1': JSON.stringify({ lastScreenId: 'invalid' }) }) },
        () => getStoredShellState(['sessions', 'task', 'settings']),
      ),
    ).toEqual({ lastScreenId: 'sessions' });

    expect(
      withWindow({ localStorage: createLocalStorage({ 'opencode-mobile.shell-v1': '{bad-json' }) }, () => getStoredShellState(['sessions', 'task'])),
    ).toEqual({ lastScreenId: 'sessions' });

    withWindow(
      { localStorage },
      () => {
        persistShellState({ shell: { lastScreenId: 'settings' } });
      },
    );

    expect(localStorage.readJson('opencode-mobile.shell-v1')).toEqual({ lastScreenId: 'settings' });
  });

  it('persists session state without storing transient loading flags', () => {
    const localStorage = createLocalStorage();

    withWindow(
      { localStorage },
      () => {
        persistSessionState({
          selectedSessionId: 'session-1',
          sessions: [
            {
              id: 'session-1',
              draft: 'keep draft',
              isLoading: true,
              runtimeMetadata: { runtimeId: 'remote-runtime' },
              remoteRun: { runId: 'run-1', status: 'queued', updatedAt: 123 },
              repoBinding: { owner: 'acme', repo: 'mobile', branch: 'main', workspace: 'sandbox-1' },
              messages: [{ id: 'msg-1', role: 'user', label: 'You', text: 'hello' }],
              toolResults: [],
            },
          ],
        });
      },
    );

    expect(localStorage.readJson('opencode-mobile.phase-05')).toEqual({
      selectedSessionId: 'session-1',
      sessions: [
        {
          id: 'session-1',
          draft: 'keep draft',
          runtimeMetadata: {
            runtimeId: 'remote-runtime',
            remoteRun: { runId: 'run-1', status: 'queued', updatedAt: 123 },
            repoBinding: { owner: 'acme', repo: 'mobile', branch: 'main', workspace: 'sandbox-1' },
          },
          remoteRun: { runId: 'run-1', status: 'queued', updatedAt: 123 },
          repoBinding: { owner: 'acme', repo: 'mobile', branch: 'main', workspace: 'sandbox-1' },
          messages: [{ id: 'msg-1', role: 'user', label: 'You', text: 'hello' }],
          toolResults: [],
        },
      ],
    });
  });

  it('normalizes diff files and helper lookups for stored diff data', () => {
    const normalized = normalizeDiffFile({
      path: 'src/main.js',
      hunks: [
        null,
        {
          header: '@@ -1 +1 @@',
          lines: [
            { type: 'add', oldNumber: 'bad', newNumber: 3, text: 'const next = true;' },
            { type: 'other', oldNumber: 1, newNumber: 1, text: 'const stable = true;' },
            { type: 'remove', text: 'const old = false;' },
            { type: 'add' },
          ],
        },
      ],
    });

    expect(normalized).toEqual({
      path: 'src/main.js',
      status: 'M',
      summary: 'Changed file',
      hunks: [
        {
          header: '@@ -1 +1 @@',
          lines: [
            { type: 'add', oldNumber: null, newNumber: 3, text: 'const next = true;' },
            { type: 'context', oldNumber: 1, newNumber: 1, text: 'const stable = true;' },
            { type: 'remove', oldNumber: null, newNumber: null, text: 'const old = false;' },
          ],
        },
      ],
    });
    expect(getDiffStatusLabel(normalized.status)).toBe('Modified');
    expect(getDiffLineCount(normalized, 'add')).toBe(1);
    expect(getDiffLineCount(normalized, 'remove')).toBe(1);
    expect(getDiffLineCount(normalized)).toBe(3);
    expect(normalizeDiffFile({ summary: 'missing path' })).toBe(null);
  });

  it('normalizes diff-style tool results and falls back to safe defaults', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123456);

    const toolResult = normalizeToolResult({
      id: 'tool-123',
      path: 'reviews/mobile.diff',
      summary: 'Review snapshot',
      files: [
        {
          path: 'src/styles.css',
          status: 'A',
          summary: 'New styles',
          hunks: [{ header: '@@ -0,0 +1 @@', lines: [{ type: 'add', newNumber: 1, text: '.shell { }' }] }],
        },
      ],
    });

    expect(toolResult).toMatchObject({
      id: 'tool-123',
      kind: 'diff',
      label: 'Review diff',
      toolName: 'git_diff',
      path: 'reviews/mobile.diff',
      summary: 'Review snapshot',
      content: '',
      createdAt: 123456,
    });
    expect(getToolResultKind(toolResult)).toBe('diff');
    expect(getDiffFiles(toolResult)).toHaveLength(1);
    expect(getDiffFile(toolResult, 'src/styles.css')?.path).toBe('src/styles.css');
    expect(getDiffFile(toolResult, 'missing.js')?.path).toBe('src/styles.css');
    expect(normalizeToolResult({ id: 'bad', summary: 'Missing path' })).toBe(null);
  });

  it('derives session titles, previews, counts, and tool lookups from local state', () => {
    const session = {
      id: 'session-1',
      messages: [
        { id: 'msg-1', role: 'notice', label: 'Notice', text: 'Heads up' },
        { id: 'msg-2', role: 'user', label: 'You', text: '   Review    this mobile shell title with extra spacing   ' },
        { id: 'msg-3', role: 'assistant', label: 'OpenCode', text: 'First reply' },
        { id: 'msg-4', role: 'assistant', label: 'OpenCode', text: '   Latest reply stays readable on narrow screens.   ' },
      ],
      toolResults: [{ id: 'tool-9', path: 'notes/review.md' }],
    };
    const appState = {
      sessions: [session, { id: 'session-2', messages: [], toolResults: [] }],
      selectedSessionId: 'session-1',
    };

    expect(getSessionTitle(session)).toBe('Review this mobile shell title with extra…');
    expect(getSessionPreview(session)).toBe('Latest reply stays readable on narrow screens.');
    expect(getVisibleMessageCount(session)).toBe(3);
    expect(getSelectedSession(appState)).toBe(session);
    expect(getToolResults(session)).toEqual(session.toolResults);
    expect(getToolResult(session, 'tool-9')).toEqual(session.toolResults[0]);
    expect(getToolResult(session, 'missing')).toBe(null);
    expect(createStarterMessages('diff-tool-1')[1].toolResultId).toBe('diff-tool-1');
  });

  it('creates a remote runtime contract with explicit mock fallback operations', () => {
    const adapter = createRemoteRuntimeAdapter();

    expect(adapter.id).toBe('remote-runtime');
    expect(adapter.mode).toBe('mock-fallback');
    expect(adapter.isConfigured).toBe(false);
    expect(adapter.fallbackAdapterId).toBe('mock-local');
    expect(adapter.createStarterSessionPayload().toolResults.length).toBeGreaterThan(0);
    expect(adapter.respond({ prompt: 'check', sessionTitle: 'Remote draft' }).assistantMessage.text).toContain('Mock adapter reply');
    expect(adapter.startRun({ prompt: 'check', sessionId: 'session-1' })).toEqual({
      ok: false,
      status: 'unsupported',
      operation: 'startRun',
      reason: 'remote backend not configured',
      prompt: 'check',
      sessionId: 'session-1',
      repoBinding: null,
    });
    expect(adapter.resumeRun({ runId: 'run-1', sessionId: 'session-1' }).operation).toBe('resumeRun');
    expect(adapter.cancelRun({ runId: 'run-1', sessionId: 'session-1' }).operation).toBe('cancelRun');
    expect(adapter.fetchRunStatus({ runId: 'run-1', sessionId: 'session-1' }).operation).toBe('fetchRunStatus');
    expect(adapter.fetchPreviewLinks({ runId: 'run-1', sessionId: 'session-1' })).toEqual({
      ok: false,
      status: 'unsupported',
      operation: 'fetchPreviewLinks',
      reason: 'remote backend not configured',
      runId: 'run-1',
      sessionId: 'session-1',
      previews: [],
    });
  });

  it('normalizes remote runtime metadata for legacy and bound sessions', () => {
    expect(createRuntimeMetadata({})).toEqual({
      runtimeId: 'mock-local',
      remoteRun: { runId: null, status: 'idle', updatedAt: null },
      repoBinding: { owner: '', repo: '', branch: '', workspace: '' },
    });

    expect(
      createRuntimeMetadata({
        runtimeMetadata: { runtimeId: 'remote-runtime' },
        remoteRun: { runId: 'run-7', status: 'running', updatedAt: 77 },
        repoBinding: { owner: 'acme', repo: 'client', branch: 'feature/mobile', workspace: 'ws-9' },
      }),
    ).toEqual({
      runtimeId: 'remote-runtime',
      remoteRun: { runId: 'run-7', status: 'running', updatedAt: 77 },
      repoBinding: { owner: 'acme', repo: 'client', branch: 'feature/mobile', workspace: 'ws-9' },
    });
  });

  it('keeps shell-state labels and install hints honest for mobile shell conditions', () => {
    const onlineAppState = {
      shell: {
        isOnline: true,
        isStandalone: false,
        installPromptEvent: { prompt: () => {} },
      },
    };
    const offlineAppState = {
      shell: {
        isOnline: false,
        isStandalone: true,
        installPromptEvent: null,
      },
    };

    expect(getConnectionTone(onlineAppState)).toBe('online');
    expect(getConnectionLabel(onlineAppState)).toBe('Online');
    expect(getConnectionMessage(onlineAppState)).toContain('local shell');
    expect(getInstallHint(onlineAppState)).toBe('Install ready');
    expect(getInstallBody(onlineAppState)).toContain('install the current shell');

    expect(getConnectionTone(offlineAppState)).toBe('offline');
    expect(getConnectionLabel(offlineAppState)).toBe('Offline');
    expect(getConnectionMessage(offlineAppState)).toContain('You are offline.');
    expect(getInstallHint(offlineAppState)).toBe('Installed to Home Screen');
    expect(getInstallBody(offlineAppState)).toContain('installed mobile app');
  });

  it('detects standalone runtime mode from browser display mode or navigator state', () => {
    expect(
      withWindow(
        {
          matchMedia() {
            return { matches: true };
          },
          navigator: { standalone: false },
        },
        () => isStandaloneMode(),
      ),
    ).toBe(true);

    expect(
      withWindow(
        {
          matchMedia() {
            return { matches: false };
          },
          navigator: { standalone: true },
        },
        () => isStandaloneMode(),
      ),
    ).toBe(true);

    expect(
      withWindow(
        {
          matchMedia() {
            return { matches: false };
          },
          navigator: { standalone: false },
        },
        () => isStandaloneMode(),
      ),
    ).toBe(false);
  });
});
