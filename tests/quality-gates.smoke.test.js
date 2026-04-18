import { afterEach, describe, expect, it, vi } from 'vitest';

import { createMockRuntimeAdapter } from '../src/adapters/mock-runtime.js';
import { createRemoteRuntimeAdapter } from '../src/adapters/remote-runtime.js';
import { currentSessionRemoteLinks, createRemoteLinkState, normalizeExternalLink } from '../src/lib/remote-links.js';
import { renderSessionsScreen, renderTaskScreen } from '../src/ui/screens.js';
import {
  createBlockedLinkNotice,
  createInvalidLinkNotice,
  createUiNotice,
  createUnavailableLinkNotice,
  createUnsupportedLinkNotice,
} from '../src/lib/ui-notices.js';
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
  createRemoteAssistantMessage,
  createStarterMessages,
  deleteSessionById,
  filterSessionsByQuery,
  findRemoteAssistantMessage,
  getRemoteResponseLifecycleState,
  getRepoBindingLabel,
  getRepoBindingStatus,
  getRepoWorkspaceLabel,
  createRuntimeMetadata,
  getSessionEditableTitle,
  getSelectedSession,
  getSessionPreview,
  getSessionTitle,
  getToolResult,
  getToolResults,
  getVisibleMessageCount,
  isRemoteSession,
  renameSessionById,
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

  it('hydrates stored custom session titles so renamed sessions survive reload', () => {
    const renderApp = vi.fn();
    const setUiNotice = vi.fn();
    const appState = {
      sessions: [],
      selectedSessionId: null,
      isHydratingSessions: true,
    };
    const storedState = JSON.stringify({
      selectedSessionId: 'session-1',
      sessions: [
        {
          id: 'session-1',
          createdAt: 10,
          updatedAt: 20,
          customTitle: 'Renamed phone review flow',
          draft: '',
          toolResults: [],
          messages: [{ id: 'msg-1', role: 'user', label: 'You', text: 'Original prompt title' }],
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

    expect(setUiNotice).not.toHaveBeenCalled();
    expect(appState.sessions).toHaveLength(1);
    expect(appState.sessions[0].customTitle).toBe('Renamed phone review flow');
    expect(getSessionEditableTitle(appState.sessions[0])).toBe('Renamed phone review flow');
    expect(getSessionTitle(appState.sessions[0])).toBe('Renamed phone review flow');
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

  it('renders explicit rename and delete controls on saved session cards', () => {
    const appState = {
      isHydratingSessions: false,
      selectedSessionId: 'session-1',
      sessions: [
        {
          id: 'session-1',
          createdAt: 10,
          updatedAt: 30,
          draft: '',
          isLoading: false,
          runtimeMetadata: { runtimeId: 'mock-local' },
          remoteRun: { runId: null, status: 'idle', updatedAt: null },
          repoBinding: { owner: '', repo: '', branch: '', workspace: '' },
          messages: [{ id: 'msg-1', role: 'user', label: 'You', text: 'Review the mobile shell state' }],
          toolResults: [],
        },
      ],
      shell: { isOnline: true, isStandalone: false, installPromptEvent: null },
    };

    const html = renderSessionsScreen({ appState });

    expect(html).toContain('data-action="select-session"');
    expect(html).toContain('data-action="rename-session"');
    expect(html).toContain('data-action="delete-session"');
    expect(html).toContain('Rename');
    expect(html).toContain('Delete');
  });

  it('filters sessions by local metadata and restores all sessions when the query clears', () => {
    const sessions = [
      {
        id: 'session-1',
        customTitle: 'Renamed phone review flow',
        repoBinding: { owner: '', repo: '', branch: '', workspace: '' },
        messages: [{ id: 'msg-1', role: 'assistant', label: 'OpenCode', text: 'Latest local shell summary' }],
      },
      {
        id: 'session-2',
        repoBinding: { owner: 'acme', repo: 'search', branch: 'main', workspace: 'ios-lab' },
        messages: [{ id: 'msg-2', role: 'assistant', label: 'OpenCode', text: 'Repo-bound mobile handoff' }],
      },
    ];

    expect(filterSessionsByQuery(sessions, 'review').map((session) => session.id)).toEqual(['session-1']);
    expect(filterSessionsByQuery(sessions, 'acme/search').map((session) => session.id)).toEqual(['session-2']);
    expect(filterSessionsByQuery(sessions, '')).toHaveLength(2);
  });

  it('renders only matching sessions and exposes a clear-search control', () => {
    const appState = {
      isHydratingSessions: false,
      selectedSessionId: 'session-1',
      ui: { sessionSearchQuery: 'repo-bound' },
      sessions: [
        {
          id: 'session-1',
          createdAt: 10,
          updatedAt: 30,
          draft: '',
          isLoading: false,
          customTitle: 'Repo-bound handoff',
          runtimeMetadata: { runtimeId: 'mock-local' },
          remoteRun: { runId: null, status: 'idle', updatedAt: null },
          repoBinding: { owner: 'acme', repo: 'mobile', branch: 'main', workspace: '' },
          messages: [{ id: 'msg-1', role: 'assistant', label: 'OpenCode', text: 'Matching session preview' }],
          toolResults: [],
        },
        {
          id: 'session-2',
          createdAt: 20,
          updatedAt: 40,
          draft: '',
          isLoading: false,
          customTitle: 'Draft inbox',
          runtimeMetadata: { runtimeId: 'mock-local' },
          remoteRun: { runId: null, status: 'idle', updatedAt: null },
          repoBinding: { owner: '', repo: '', branch: '', workspace: '' },
          messages: [{ id: 'msg-2', role: 'assistant', label: 'OpenCode', text: 'Non-matching session preview' }],
          toolResults: [],
        },
      ],
      shell: { isOnline: true, isStandalone: false, installPromptEvent: null },
    };

    const html = renderSessionsScreen({ appState });

    expect(html).toContain('value="repo-bound"');
    expect(html).toContain('data-action="clear-session-search"');
    expect(html).toContain('Repo-bound handoff');
    expect(html).not.toContain('Draft inbox');
  });

  it('renders a distinct empty-filter state without dropping the current task handoff', () => {
    const appState = {
      isHydratingSessions: false,
      selectedSessionId: 'session-1',
      ui: { sessionSearchQuery: 'no-match' },
      sessions: [
        {
          id: 'session-1',
          createdAt: 10,
          updatedAt: 30,
          draft: '',
          isLoading: false,
          customTitle: 'Phone review thread',
          runtimeMetadata: { runtimeId: 'mock-local' },
          remoteRun: { runId: null, status: 'idle', updatedAt: null },
          repoBinding: { owner: '', repo: '', branch: '', workspace: '' },
          messages: [{ id: 'msg-1', role: 'assistant', label: 'OpenCode', text: 'Saved thread preview' }],
          toolResults: [],
        },
      ],
      shell: { isOnline: true, isStandalone: false, installPromptEvent: null },
    };

    const html = renderSessionsScreen({ appState });

    expect(html).toContain('Filtered state');
    expect(html).toContain('No sessions match');
    expect(html).toContain('data-action="clear-session-search"');
    expect(html).toContain('data-action="open-selected-session"');
    expect(html).not.toContain('No local sessions yet.');
  });

  it('renames a session without altering its stored content or selected state', () => {
    const localStorage = createLocalStorage();
    const session = {
      id: 'session-1',
      createdAt: 10,
      updatedAt: 30,
      draft: 'keep draft',
      isLoading: false,
      runtimeMetadata: { runtimeId: 'remote-runtime' },
      remoteRun: { runId: 'run-1', status: 'awaiting_input', updatedAt: 123 },
      repoBinding: { owner: 'acme', repo: 'mobile', branch: 'main', workspace: 'ws-1' },
      messages: [
        { id: 'msg-1', role: 'user', label: 'You', text: 'Original session prompt for mobile review' },
        { id: 'msg-2', role: 'assistant', label: 'OpenCode', text: 'Stored assistant reply' },
      ],
      toolResults: [{ id: 'tool-1', path: 'notes/mobile.md' }],
    };
    const appState = {
      sessions: [session],
      selectedSessionId: 'session-1',
      toolDrawer: { isOpen: false, view: 'list', toolId: null, changePath: null },
    };

    let updatedSession;
    withWindow({ localStorage }, () => {
      updatedSession = renameSessionById(appState, 'session-1', 'Renamed phone review flow');
    });

    expect(appState.selectedSessionId).toBe('session-1');
    expect(updatedSession).toMatchObject({
      id: 'session-1',
      customTitle: 'Renamed phone review flow',
      draft: 'keep draft',
      runtimeMetadata: { runtimeId: 'remote-runtime' },
      remoteRun: { runId: 'run-1', status: 'awaiting_input', updatedAt: 123 },
      repoBinding: { owner: 'acme', repo: 'mobile', branch: 'main', workspace: 'ws-1' },
      messages: session.messages,
      toolResults: session.toolResults,
    });
    expect(getSessionEditableTitle(updatedSession)).toBe('Renamed phone review flow');
    expect(getSessionTitle(updatedSession)).toBe('Renamed phone review flow');
  });

  it('deletes the selected session with deterministic fallback and clears selection when none remain', () => {
    const localStorage = createLocalStorage();
    const appState = {
      sessions: [
        {
          id: 'session-3',
          createdAt: 30,
          updatedAt: 300,
          draft: '',
          isLoading: false,
          runtimeMetadata: { runtimeId: 'mock-local' },
          remoteRun: { runId: null, status: 'idle', updatedAt: null },
          repoBinding: { owner: '', repo: '', branch: '', workspace: '' },
          messages: [{ id: 'msg-3', role: 'assistant', label: 'OpenCode', text: 'Newest session' }],
          toolResults: [],
        },
        {
          id: 'session-2',
          createdAt: 20,
          updatedAt: 200,
          draft: '',
          isLoading: false,
          runtimeMetadata: { runtimeId: 'mock-local' },
          remoteRun: { runId: null, status: 'idle', updatedAt: null },
          repoBinding: { owner: '', repo: '', branch: '', workspace: '' },
          messages: [{ id: 'msg-2', role: 'assistant', label: 'OpenCode', text: 'Selected session' }],
          toolResults: [],
        },
      ],
      selectedSessionId: 'session-2',
      toolDrawer: { isOpen: true, view: 'diff', toolId: 'tool-1', changePath: 'src/main.js' },
    };

    let deletionResult;
    withWindow({ localStorage }, () => {
      deletionResult = deleteSessionById(appState, 'session-2');
    });

    expect(deletionResult).toEqual({ deletedSessionId: 'session-2', selectedSessionId: 'session-3' });
    expect(appState.sessions.map((session) => session.id)).toEqual(['session-3']);
    expect(appState.selectedSessionId).toBe('session-3');
    expect(appState.toolDrawer).toEqual({ isOpen: false, view: 'list', toolId: null, changePath: null });

    withWindow({ localStorage }, () => {
      deletionResult = deleteSessionById(appState, 'session-3');
    });

    expect(deletionResult).toEqual({ deletedSessionId: 'session-3', selectedSessionId: null });
    expect(appState.sessions).toEqual([]);
    expect(appState.selectedSessionId).toBe(null);
  });

  it('derives repo binding labels and bounded binding status from session state', () => {
    const unboundSession = {
      repoBinding: { owner: '', repo: '', branch: '', workspace: '' },
      remoteRun: { runId: null, status: 'idle', updatedAt: null },
    };
    const boundSession = {
      repoBinding: { owner: 'acme', repo: 'mobile', branch: 'main', workspace: 'ws-1' },
      remoteRun: { runId: null, status: 'idle', updatedAt: null },
    };
    const activeRunSession = {
      repoBinding: { owner: 'acme', repo: 'mobile', branch: 'main', workspace: 'ws-1' },
      remoteRun: { runId: 'run-9', status: 'running', updatedAt: 100 },
    };

    expect(getRepoBindingLabel(unboundSession)).toBe('');
    expect(getRepoWorkspaceLabel(unboundSession)).toBe('');
    expect(getRepoBindingStatus(unboundSession)).toBe('unbound');

    expect(getRepoBindingLabel(boundSession)).toBe('acme/mobile · main');
    expect(getRepoWorkspaceLabel(boundSession)).toBe('ws-1');
    expect(getRepoBindingStatus(boundSession)).toBe('bound');

    expect(getRepoBindingStatus(activeRunSession)).toBe('bound-active');
  });

  it('creates a remote runtime contract with explicit mock fallback operations', async () => {
    const adapter = createRemoteRuntimeAdapter();

    expect(adapter.id).toBe('remote-runtime');
    expect(adapter.mode).toBe('mock-fallback');
    expect(adapter.isConfigured).toBe(false);
    expect(adapter.fallbackAdapterId).toBe('mock-local');
    expect(adapter.createStarterSessionPayload().toolResults.length).toBeGreaterThan(0);
    expect(adapter.respond({ prompt: 'check', sessionTitle: 'Remote draft' }).assistantMessage.text).toContain('Mock adapter reply');
    await expect(adapter.startRun({ prompt: 'check', sessionId: 'session-1' })).resolves.toEqual({
      ok: false,
      status: 'unsupported',
      operation: 'startRun',
      reason: 'remote backend not configured',
      prompt: 'check',
      sessionId: 'session-1',
      repoBinding: null,
    });
    await expect(adapter.resumeRun({ runId: 'run-1', sessionId: 'session-1' })).resolves.toMatchObject({ operation: 'resumeRun' });
    await expect(adapter.cancelRun({ runId: 'run-1', sessionId: 'session-1' })).resolves.toMatchObject({ operation: 'cancelRun' });
    await expect(adapter.fetchRunStatus({ runId: 'run-1', sessionId: 'session-1' })).resolves.toMatchObject({ operation: 'fetchRunStatus' });
    await expect(adapter.fetchPreviewLinks({ runId: 'run-1', sessionId: 'session-1' })).resolves.toEqual({
      ok: false,
      status: 'unsupported',
      operation: 'fetchPreviewLinks',
      reason: 'remote backend not configured',
      runId: 'run-1',
      sessionId: 'session-1',
      previews: [],
    });
  });

  it('calls a configured backend base URL for remote run lifecycle operations', async () => {
    const fetchImpl = vi.fn(async (requestUrl, options = {}) => {
      if (requestUrl === 'https://runtime.example/runs' && options.method === 'POST') {
        return {
          ok: true,
          status: 200,
          async text() {
            return JSON.stringify({
              status: 'queued',
              run: {
                runId: 'run-started',
                status: 'queued',
                updatedAt: 101,
              },
            });
          },
        };
      }

      if (requestUrl === 'https://runtime.example/runs/run-started?sessionId=session-1' && options.method === 'GET') {
        return {
          ok: true,
          status: 200,
          async text() {
            return JSON.stringify({
              status: 'running',
              run: {
                runId: 'run-started',
                status: 'running',
                updatedAt: 202,
              },
            });
          },
        };
      }

      if (requestUrl === 'https://runtime.example/runs/run-started/resume' && options.method === 'POST') {
        return {
          ok: true,
          status: 200,
          async text() {
            return JSON.stringify({
              status: 'awaiting_input',
              run: {
                runId: 'run-started',
                status: 'awaiting_input',
                updatedAt: 303,
              },
            });
          },
        };
      }

      if (requestUrl === 'https://runtime.example/runs/run-started/cancel' && options.method === 'POST') {
        return {
          ok: true,
          status: 200,
          async text() {
            return JSON.stringify({
              status: 'cancelled',
              run: {
                runId: 'run-started',
                status: 'cancelled',
                updatedAt: 404,
              },
            });
          },
        };
      }

      return {
        ok: false,
        status: 404,
        async text() {
          return JSON.stringify({ error: 'missing route' });
        },
      };
    });
    const adapter = createRemoteRuntimeAdapter({
      backend: {
        baseUrl: 'https://runtime.example/',
        headers: {
          authorization: 'Bearer demo-token',
        },
        fetchImpl,
      },
    });

    const startResult = await adapter.startRun({
      prompt: 'Ship the mobile bridge',
      sessionId: 'session-1',
      repoBinding: { owner: 'acme', repo: 'mobile', branch: 'main', workspace: 'ws-1' },
    });
    const statusResult = await adapter.fetchRunStatus({ runId: 'run-started', sessionId: 'session-1' });
    const resumeResult = await adapter.resumeRun({ runId: 'run-started', sessionId: 'session-1' });
    const cancelResult = await adapter.cancelRun({ runId: 'run-started', sessionId: 'session-1' });
    expect(adapter.isConfigured).toBe(true);
    expect(adapter.mode).toBe('configured');
    expect(adapter.backendBaseUrl).toBe('https://runtime.example');
    expect(startResult).toMatchObject({
      ok: true,
      operation: 'startRun',
      status: 'queued',
      remoteRun: { runId: 'run-started', status: 'queued', updatedAt: 101 },
      prompt: 'Ship the mobile bridge',
      sessionId: 'session-1',
    });
    expect(statusResult).toMatchObject({
      ok: true,
      operation: 'fetchRunStatus',
      status: 'running',
      remoteRun: { runId: 'run-started', status: 'running', updatedAt: 202 },
    });
    expect(resumeResult).toMatchObject({
      ok: true,
      operation: 'resumeRun',
      status: 'awaiting_input',
      remoteRun: { runId: 'run-started', status: 'awaiting_input', updatedAt: 303 },
    });
    expect(cancelResult).toMatchObject({
      ok: true,
      operation: 'cancelRun',
      status: 'cancelled',
      remoteRun: { runId: 'run-started', status: 'cancelled', updatedAt: 404 },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      'https://runtime.example/runs',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: 'Bearer demo-token',
        }),
      }),
    );
  });

  it('reports backend failures honestly when configured requests fail', async () => {
    const adapter = createRemoteRuntimeAdapter({
      backend: {
        baseUrl: 'https://runtime.example',
        fetchImpl: vi.fn(async () => ({
          ok: false,
          status: 503,
          async text() {
            return JSON.stringify({ error: 'runtime unavailable' });
          },
        })),
      },
    });

    await expect(adapter.startRun({ prompt: 'hello', sessionId: 'session-1' })).resolves.toMatchObject({
      ok: false,
      status: 'error',
      operation: 'startRun',
      reason: 'remote backend request failed',
      details: 'runtime unavailable',
    });
  });

  it('hydrates backend-owned assistant output only from completed remote runs', async () => {
    const adapter = createRemoteRuntimeAdapter({
      backend: {
        baseUrl: 'https://runtime.example',
        fetchImpl: vi.fn(async () => ({
          ok: true,
          status: 200,
          async text() {
            return JSON.stringify({
              status: 'completed',
              run: { runId: 'run-55', status: 'completed', updatedAt: 550 },
              response: { text: 'Backend-owned final reply', label: 'OpenCode' },
            });
          },
        })),
      },
    });

    const result = await adapter.fetchRunStatus({ runId: 'run-55', sessionId: 'session-1' });
    const hydration = adapter.hydrateCompletedRun(result);
    const message = createRemoteAssistantMessage({
      runId: hydration.remoteRun.runId,
      text: hydration.assistantResponse.text,
      label: hydration.assistantResponse.label,
    });
    const session = {
      runtimeMetadata: { runtimeId: 'remote-runtime' },
      remoteRun: hydration.remoteRun,
      messages: [message],
    };

    expect(hydration).toMatchObject({
      ok: true,
      status: 'completed',
      remoteRun: { runId: 'run-55', status: 'completed', updatedAt: 550 },
      assistantResponse: { text: 'Backend-owned final reply', label: 'OpenCode' },
    });
    expect(isRemoteSession(session)).toBe(true);
    expect(findRemoteAssistantMessage(session, 'run-55')).toEqual(message);
    expect(getRemoteResponseLifecycleState(session)).toBe('hydrated');
  });

  it('keeps remote sessions honest when runs complete without assistant output', () => {
    const adapter = createRemoteRuntimeAdapter();
    const hydration = adapter.hydrateCompletedRun({
      ok: true,
      status: 'completed',
      runId: 'run-66',
      payload: {
        status: 'completed',
        run: { runId: 'run-66', status: 'completed', updatedAt: 660 },
      },
    });
    const session = {
      runtimeMetadata: { runtimeId: 'remote-runtime' },
      remoteRun: { runId: 'run-66', status: 'completed', updatedAt: 660 },
      isLoading: false,
      messages: [],
    };

    expect(hydration).toMatchObject({
      ok: false,
      status: 'completed',
      reason: 'completed remote run did not return assistant output',
    });
    expect(getRemoteResponseLifecycleState(session)).toBe('missing');
    expect(findRemoteAssistantMessage(session, 'run-66')).toBe(null);
  });

  it('treats failed remote runs as failed instead of pending once loading stops', () => {
    const session = {
      runtimeMetadata: { runtimeId: 'remote-runtime' },
      remoteRun: { runId: 'run-88', status: 'failed', updatedAt: 880 },
      isLoading: false,
      messages: [],
    };

    expect(getRemoteResponseLifecycleState(session)).toBe('failed');
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

  it('keeps extracted remote link helpers honest for preview and share data', () => {
    expect(normalizeExternalLink(' https://preview.example/app ', 'Preview 1')).toEqual({
      label: 'Preview 1',
      url: 'https://preview.example/app',
    });
    expect(
      normalizeExternalLink(
        { href: 'https://share.example/session', name: 'Shared session' },
        'Read-only share',
      ),
    ).toEqual({
      label: 'Shared session',
      url: 'https://share.example/session',
    });
    expect(normalizeExternalLink({ href: '   ' }, 'Preview 1')).toBe(null);

    expect(
      createRemoteLinkState({
        previewLinks: ['https://preview.example/app', { url: 'https://preview.example/admin', label: 'Admin' }],
        links: { share: { href: 'https://share.example/session', title: 'Review share' } },
      }),
    ).toEqual({
      previews: [
        { label: 'Preview 1', url: 'https://preview.example/app' },
        { label: 'Admin', url: 'https://preview.example/admin' },
      ],
      share: { label: 'Review share', url: 'https://share.example/session' },
    });

    expect(
      currentSessionRemoteLinks({
        remoteLinks: {
          previews: ['https://preview.example/app', { url: 'https://preview.example/admin', label: 'Admin' }, { href: '   ' }],
          share: { link: 'https://share.example/session' },
        },
      }),
    ).toEqual({
      previews: [
        { label: 'Preview 1', url: 'https://preview.example/app' },
        { label: 'Admin', url: 'https://preview.example/admin' },
      ],
      share: { label: 'Read-only share', url: 'https://share.example/session' },
    });
  });

  it('keeps extracted ui notice helpers honest for bounded shell messaging', () => {
    expect(createUiNotice({ tone: 'info', title: 'Heads up', body: 'Stay on task.' })).toEqual({
      tone: 'info',
      title: 'Heads up',
      body: 'Stay on task.',
    });
    expect(createUiNotice({ title: 'Missing body' })).toBe(null);
    expect(createUnavailableLinkNotice('Preview link')).toEqual({
      tone: 'warning',
      title: 'Link unavailable.',
      body: 'Preview link is not available for this session yet.',
    });
    expect(createInvalidLinkNotice('Preview link').body).toContain('kept the state honest');
    expect(createUnsupportedLinkNotice('Share link').body).toContain('http or https');
    expect(createBlockedLinkNotice('Preview link').body).toContain('browser blocked the new tab request');
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

  it('renders durable remote run states and reconnect controls in the task shell', () => {
    const remoteSession = {
      id: 'session-remote',
      createdAt: 10,
      updatedAt: 30,
      draft: '',
      isLoading: false,
      runtimeMetadata: { runtimeId: 'remote-runtime' },
      remoteRun: { runId: 'run-42', status: 'awaiting_input', updatedAt: 30 },
      remoteLinks: {
        previews: [{ label: 'Preview app', url: 'https://preview.example/app' }],
        share: { label: 'Read-only share', url: 'https://share.example/session/run-42' },
      },
      repoBinding: { owner: 'acme', repo: 'mobile', branch: 'main', workspace: 'ws-1' },
      messages: [{ id: 'msg-1', role: 'assistant', label: 'OpenCode', text: 'Remote session status is visible.' }],
      toolResults: [],
    };
    const appState = {
      isHydratingSessions: false,
      selectedSessionId: 'session-remote',
      sessions: [remoteSession],
      shell: { isOnline: true, isStandalone: false, installPromptEvent: null },
      toolDrawer: { isOpen: false, view: 'list', toolId: null, changePath: null },
    };
    const screens = {
      task: {
        description: 'Local shell description',
      },
    };

    const html = renderTaskScreen({ appState, screens });

    expect(html).toContain('Remote run state');
    expect(html).toContain('Repo binding');
    expect(html).toContain('Repo + active run');
    expect(html).toContain('Awaiting input');
    expect(html).toContain('data-action="reconnect-remote-run"');
    expect(html).toContain('data-action="cancel-remote-run"');
    expect(html).toContain('Run run-42');
    expect(html).toContain('acme/mobile · main');
    expect(html).toContain('Workspace ws-1');
    expect(html).toContain('Remote shell');
    expect(html).toContain('Remote preview');
    expect(html).toContain('Preview app');
    expect(html).toContain('Read-only share');
    expect(html).toContain('Backend response pending');
    expect(html).toContain('data-action="open-preview-link"');
    expect(html).toContain('data-action="open-share-link"');
    expect(html).not.toContain('Local only');
  });

  it('renders completed remote response ownership honestly in the task shell', () => {
    const remoteMessage = createRemoteAssistantMessage({
      runId: 'run-77',
      text: 'Backend-owned final reply',
    });
    const remoteSession = {
      id: 'session-remote-complete',
      createdAt: 10,
      updatedAt: 30,
      draft: '',
      isLoading: false,
      runtimeMetadata: { runtimeId: 'remote-runtime' },
      remoteRun: { runId: 'run-77', status: 'completed', updatedAt: 30 },
      remoteLinks: { previews: [], share: null },
      repoBinding: { owner: 'acme', repo: 'mobile', branch: 'main', workspace: 'ws-3' },
      messages: [remoteMessage],
      toolResults: [],
    };

    const html = renderTaskScreen({
      appState: {
        isHydratingSessions: false,
        selectedSessionId: 'session-remote-complete',
        sessions: [remoteSession],
        shell: { isOnline: true, isStandalone: false, installPromptEvent: null },
        toolDrawer: { isOpen: false, view: 'list', toolId: null, changePath: null },
      },
      screens: {
        task: { description: 'Local shell description' },
      },
    });

    expect(html).toContain('Backend response attached');
    expect(html).toContain('Backend-owned final reply');
    expect(html).toContain('This session now shows the backend-owned assistant response inside the thread.');
    expect(html).toContain('aria-label="Send to remote run"');
  });

  it('renders remote composer labels without mock wording while loading', () => {
    const remoteSession = {
      id: 'session-remote-loading',
      createdAt: 10,
      updatedAt: 30,
      draft: 'Continue the remote task',
      isLoading: true,
      runtimeMetadata: { runtimeId: 'remote-runtime' },
      remoteRun: { runId: 'run-90', status: 'running', updatedAt: 30 },
      remoteLinks: { previews: [], share: null },
      repoBinding: { owner: 'acme', repo: 'mobile', branch: 'main', workspace: 'ws-4' },
      messages: [{ id: 'msg-1', role: 'user', label: 'You', text: 'Continue the remote task' }],
      toolResults: [],
    };

    const html = renderTaskScreen({
      appState: {
        isHydratingSessions: false,
        selectedSessionId: 'session-remote-loading',
        sessions: [remoteSession],
        shell: { isOnline: true, isStandalone: false, installPromptEvent: null },
        toolDrawer: { isOpen: false, view: 'list', toolId: null, changePath: null },
        voiceEntry: { isSupported: false, isListening: false },
      },
      screens: {
        task: { description: 'Local shell description' },
      },
    });

    expect(html).toContain('aria-label="Waiting for remote response"');
    expect(html).not.toContain('Generate mock reply');
    expect(html).not.toContain('Generating mock reply');
  });

  it('shows honest empty preview and share states when returned links are absent', () => {
    const remoteSession = {
      id: 'session-remote-empty-links',
      createdAt: 10,
      updatedAt: 30,
      draft: '',
      isLoading: false,
      runtimeMetadata: { runtimeId: 'remote-runtime' },
      remoteRun: { runId: 'run-43', status: 'running', updatedAt: 30 },
      remoteLinks: { previews: [], share: null },
      repoBinding: { owner: 'acme', repo: 'mobile', branch: 'main', workspace: 'ws-2' },
      messages: [{ id: 'msg-1', role: 'assistant', label: 'OpenCode', text: 'Remote run without returned links.' }],
      toolResults: [],
    };
    const appState = {
      isHydratingSessions: false,
      selectedSessionId: 'session-remote-empty-links',
      sessions: [remoteSession],
      shell: { isOnline: true, isStandalone: false, installPromptEvent: null },
      toolDrawer: { isOpen: false, view: 'list', toolId: null, changePath: null },
    };
    const screens = {
      task: {
        description: 'Local shell description',
      },
    };

    const html = renderTaskScreen({ appState, screens });

    expect(html).toContain('No preview link is available yet.');
    expect(html).toContain('No read-only share link is available yet.');
    expect(html).toContain('No preview returned');
    expect(html).toContain('No share link returned');
  });

  it('keeps local sessions honest without remote shell controls', () => {
    const localSession = {
      id: 'session-local',
      createdAt: 10,
      updatedAt: 30,
      draft: '',
      isLoading: false,
      runtimeMetadata: { runtimeId: 'mock-local' },
      remoteRun: { runId: null, status: 'idle', updatedAt: null },
      repoBinding: { owner: '', repo: '', branch: '', workspace: '' },
      messages: [{ id: 'msg-1', role: 'assistant', label: 'OpenCode', text: 'Local session remains honest.' }],
      toolResults: [],
    };
    const appState = {
      isHydratingSessions: false,
      selectedSessionId: 'session-local',
      sessions: [localSession],
      shell: { isOnline: true, isStandalone: false, installPromptEvent: null },
      toolDrawer: { isOpen: false, view: 'list', toolId: null, changePath: null },
    };
    const screens = {
      task: {
        description: 'Local shell description',
      },
    };

    const html = renderTaskScreen({ appState, screens });

    expect(html).toContain('Local only');
    expect(html).toContain('Repo binding');
    expect(html).toContain('Unbound');
    expect(html).not.toContain('Remote run state');
    expect(html).not.toContain('data-action="reconnect-remote-run"');
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

  it('renders an honest unavailable voice-entry action when speech recognition is missing', () => {
    const session = {
      id: 'session-voice',
      createdAt: 10,
      updatedAt: 30,
      draft: '',
      isLoading: false,
      runtimeMetadata: { runtimeId: 'mock-local' },
      remoteRun: { runId: null, status: 'idle', updatedAt: null },
      repoBinding: { owner: '', repo: '', branch: '', workspace: '' },
      messages: [{ id: 'msg-1', role: 'assistant', label: 'OpenCode', text: 'Say something.' }],
      toolResults: [],
    };
    const html = renderTaskScreen({
      appState: {
        isHydratingSessions: false,
        selectedSessionId: 'session-voice',
        sessions: [session],
        shell: { isOnline: true, isStandalone: false, installPromptEvent: null },
        toolDrawer: { isOpen: false, view: 'list', toolId: null, changePath: null },
        voiceEntry: { isSupported: false, isListening: false },
      },
      screens: {
        task: { description: 'Local shell description' },
      },
    });

    expect(html).toContain('Voice unavailable');
    expect(html).toContain('data-action="start-voice-entry"');
  });
});
