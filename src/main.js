import './styles.css';

const releaseTag = 'v0.4.0';
const storageKey = 'opencode-mobile.phase-04';
const retryPrompt = 'Continue from the interrupted reply using the visible context.';

const screens = {
  sessions: {
    label: 'Sessions',
    kicker: 'Browse',
    title: 'Sessions',
    description: 'Recent work now stays local to this device so it is easy to reopen without losing the mobile flow.',
  },
  task: {
    label: 'Task',
    kicker: 'Work',
    title: 'Task',
    description: 'The selected session keeps readable output and the composer together in one thumb-friendly work surface.',
  },
  settings: {
    label: 'Settings',
    kicker: 'Prefs',
    title: 'Settings',
    description: 'Settings stays intentionally light while sessions and task state become more practical on mobile.',
    emptyTitle: 'Settings remain lightweight.',
    emptyBody:
      'Advanced preferences, install prompts, and broader app controls are still outside the active phase.',
    details: [
      ['Current state', 'Lightweight placeholder'],
      ['What changed this phase', 'Sessions and local mobile state now stay available in-app'],
      ['Still out of scope', 'Advanced settings and install UX'],
    ],
  },
};

const navigationOrder = ['sessions', 'task', 'settings'];
const app = document.querySelector('#app');

const appState = {
  sessions: [],
  selectedSessionId: null,
  isHydratingSessions: true,
};

const responseTimers = new Map();
let shouldScrollTaskToEnd = false;
let shouldFocusComposer = false;

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

function trimText(value, maxLength = 96) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function createStarterMessages() {
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
      role: 'notice',
      label: 'Interrupted',
      tone: 'interrupted',
      text:
        'If a reply gets interrupted, the retry prompt is still available inside this session without clearing your draft.',
      actionLabel: 'Use retry prompt',
    },
  ];
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
  const session = {
    id: createId('session'),
    createdAt: now,
    updatedAt: now,
    draft: '',
    isLoading: false,
    messages: createStarterMessages(),
  };

  appState.sessions = [session, ...appState.sessions];
  appState.selectedSessionId = session.id;
  persistSessionState();
  return session;
}

function hydrateSessions() {
  renderApp();

  window.setTimeout(() => {
    let nextSessions = [];
    let nextSelectedSessionId = null;

    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null');
      const rawSessions = Array.isArray(stored?.sessions) ? stored.sessions : [];

      nextSessions = rawSessions
        .filter((session) => session && typeof session.id === 'string' && Array.isArray(session.messages))
        .map((session) => ({
          id: session.id,
          createdAt: Number(session.createdAt) || Date.now(),
          updatedAt: Number(session.updatedAt) || Date.now(),
          draft: typeof session.draft === 'string' ? session.draft : '',
          isLoading: false,
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

  window.history.replaceState(null, '', '#sessions');
  return 'sessions';
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
  return `
    <li class="message-row is-${message.role}${message.tone ? ` is-${message.tone}` : ''}">
      <article class="message-bubble">
        <div class="message-meta">
          <span class="message-label">${message.label}</span>
        </div>
        <pre class="message-copy">${escapeHtml(message.text)}</pre>
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
        <p class="loading-copy">Thinking through the next reply…</p>
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

  return `
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
        <span class="meta-pill">Local only</span>
      </div>
      <div class="state-actions">
        <button class="secondary-button" type="button" data-action="open-sessions">Sessions</button>
        <button class="ghost-button" type="button" data-action="create-session">New session</button>
      </div>
    </section>

    <section class="screen-card conversation-card" aria-label="Task conversation">
      <div class="conversation-summary">
        <p class="eyebrow">Readable output</p>
        <p class="conversation-copy">This selected session stays readable, copy-friendly, and available while you move back to Sessions.</p>
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
        >${escapeHtml(session.draft)}</textarea>
        <div class="composer-footer">
          <p class="composer-hint">Drafts stay with this session while you browse the rest of the app.</p>
          <button class="send-button" type="submit" ${
            session.draft.trim() && !session.isLoading ? '' : 'disabled'
          }>
            ${session.isLoading ? 'Sending' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  `;
}

function renderPlaceholderScreen(screen) {
  return `
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
  return `Working from your latest message:\n\n${prompt}\n\nSession-friendly takeaways:\n- the current thread stays available while you move between tabs\n- saved session metadata stays lightweight and readable on a phone\n- wrapped output still avoids horizontal scrolling in the primary task surface`;
}

function finishAssistantReply(sessionId, prompt) {
  responseTimers.delete(sessionId);

  const updatedSession = updateSessionById(sessionId, (session) => ({
    ...session,
    isLoading: false,
    updatedAt: Date.now(),
    messages: [
      ...session.messages,
      {
        id: createId('msg'),
        role: 'assistant',
        label: 'OpenCode',
        text: buildAssistantReply(prompt),
      },
    ],
  }));

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
      <header class="top-frame">
        <div class="brand-row">
          <div>
            <p class="eyebrow">OpenCode mobile</p>
            <h1>${frameTitle}</h1>
          </div>
          <span class="status-badge">${releaseTag}</span>
        </div>
        <p class="frame-copy">${frameCopy}</p>
      </header>

      <main class="screen-area${activeId === 'task' ? ' is-task' : ''}" aria-labelledby="screen-title">
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
    </div>
  `;

  const composerInput = app.querySelector('#composer-input');
  syncComposerControls();

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

  const actionButton = event.target.closest('[data-action="use-retry-prompt"]');
  const createSessionButton = event.target.closest('[data-action="create-session"]');
  const openSessionsButton = event.target.closest('[data-action="open-sessions"]');
  const openTaskButton = event.target.closest('[data-action="open-task"]');
  const openSelectedSessionButton = event.target.closest('[data-action="open-selected-session"]');
  const sessionButton = event.target.closest('[data-action="select-session"]');

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
window.visualViewport?.addEventListener('resize', syncViewportHeight);
window.visualViewport?.addEventListener('scroll', syncViewportHeight);

syncViewportHeight();
hydrateSessions();
