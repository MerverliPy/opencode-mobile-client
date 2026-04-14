import './styles.css';

const releaseTag = 'v0.3.0';
const retryPrompt = 'Continue from the interrupted reply using the visible context.';

const screens = {
  sessions: {
    label: 'Sessions',
    kicker: 'Browse',
    title: 'Sessions',
    description: 'Session history stays out of scope for this phase, but the destination remains easy to reach with one hand.',
    emptyTitle: 'No saved sessions yet.',
    emptyBody:
      'Phase 03 focuses on the task conversation and composer. Real session lists and persistence still wait for the next phase.',
    details: [
      ['Current state', 'Intentional placeholder'],
      ['What is live now', 'Primary navigation and the task conversation view'],
      ['Still out of scope', 'Saved sessions and local state'],
    ],
  },
  task: {
    label: 'Task',
    kicker: 'Work',
    title: 'Task',
    description: 'Readable output and a thumb-friendly composer now share the same narrow-screen work surface.',
  },
  settings: {
    label: 'Settings',
    kicker: 'Prefs',
    title: 'Settings',
    description: 'Settings stays intentionally light while the core task experience becomes usable on mobile.',
    emptyTitle: 'Settings remain lightweight.',
    emptyBody:
      'Advanced preferences, install prompts, and broader app controls are still outside the active phase.',
    details: [
      ['Current state', 'Lightweight placeholder'],
      ['What changed this phase', 'The task destination became the first useful work surface'],
      ['Still out of scope', 'Advanced settings and install UX'],
    ],
  },
};

const initialTaskMessages = [
  {
    id: 'msg-1',
    role: 'assistant',
    label: 'OpenCode',
    text:
      'The task screen now keeps long output in a readable vertical flow so it feels phone-native instead of squeezed from desktop.',
  },
  {
    id: 'msg-2',
    role: 'assistant',
    label: 'OpenCode',
    text:
      'Copy-friendly output sample:\n- wrapped paragraphs stay readable\n- line breaks are preserved\n- long paths can wrap without forcing horizontal scroll\n\nsrc/mobile/task/conversation-view/example-output.txt',
  },
  {
    id: 'msg-3',
    role: 'notice',
    label: 'Interrupted',
    tone: 'interrupted',
    text:
      'The previous reply was interrupted, but the visible context is still here. You can reuse a retry prompt without losing your current draft.',
    actionLabel: 'Use retry prompt',
  },
];

const navigationOrder = ['sessions', 'task', 'settings'];
const app = document.querySelector('#app');

const taskState = {
  draft: '',
  isLoading: false,
  messages: structuredClone(initialTaskMessages),
};

let nextMessageId = initialTaskMessages.length + 1;
let responseTimer = null;
let shouldScrollTaskToEnd = false;
let shouldFocusComposer = false;

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getActiveScreenId() {
  const candidate = window.location.hash.replace('#', '');

  if (screens[candidate]) {
    return candidate;
  }

  window.history.replaceState(null, '', '#task');
  return 'task';
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

  resizeComposer(composerInput);

  if (sendButton) {
    sendButton.disabled = !taskState.draft.trim();
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
  if (!taskState.isLoading) {
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

function renderTaskScreen() {
  return `
    <section class="screen-card hero-card">
      <p class="eyebrow">Task view</p>
      <div class="hero-heading">
        <h2 id="screen-title">Conversation</h2>
        <span class="location-chip">Live draft</span>
      </div>
      <p class="screen-copy">${screens.task.description}</p>
    </section>

    <section class="screen-card conversation-card" aria-label="Task conversation">
      <div class="conversation-summary">
        <p class="eyebrow">Readable output</p>
        <p class="conversation-copy">Long responses stay stacked vertically, selectable, and narrow-screen friendly.</p>
      </div>

      <ol class="message-list">
        ${taskState.messages.map(renderMessage).join('')}
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
          placeholder="Ask for the next step, summarize output, or continue the interrupted reply."
        >${escapeHtml(taskState.draft)}</textarea>
        <div class="composer-footer">
          <p class="composer-hint">Drafts stay editable while the conversation scrolls above.</p>
          <button class="send-button" type="submit" ${taskState.draft.trim() ? '' : 'disabled'}>
            Send
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
  return `Working from your latest message:\n\n${prompt}\n\nNext mobile-friendly takeaways:\n- keep the primary output in one vertical flow\n- let wrapped text stay selectable for copy and share\n- keep the composer pinned close to the bottom thumb zone`;
}

function finishAssistantReply(prompt) {
  taskState.isLoading = false;
  taskState.messages.push({
    id: `msg-${nextMessageId++}`,
    role: 'assistant',
    label: 'OpenCode',
    text: buildAssistantReply(prompt),
  });
  shouldScrollTaskToEnd = true;
  renderApp();
}

function submitDraft() {
  const prompt = taskState.draft.trim();

  if (!prompt || taskState.isLoading) {
    return;
  }

  taskState.messages.push({
    id: `msg-${nextMessageId++}`,
    role: 'user',
    label: 'You',
    text: prompt,
  });

  taskState.draft = '';
  taskState.isLoading = true;
  shouldScrollTaskToEnd = true;
  renderApp();

  if (responseTimer) {
    window.clearTimeout(responseTimer);
  }

  responseTimer = window.setTimeout(() => {
    finishAssistantReply(prompt);
  }, 900);
}

function renderApp() {
  const activeId = getActiveScreenId();
  const screen = screens[activeId];
  const frameTitle = activeId === 'task' ? 'Conversation view' : screen.title;
  const frameCopy =
    activeId === 'task'
      ? 'Readable output and a bottom composer stay together in a thumb-first task surface.'
      : 'The task destination now carries the primary mobile work surface while other top-level screens remain intentionally light.';

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
        ${activeId === 'task' ? renderTaskScreen() : renderPlaceholderScreen(screen)}
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

  taskState.draft = event.target.value;
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

  if (!actionButton) {
    return;
  }

  taskState.draft = taskState.draft.trim()
    ? `${taskState.draft.trim()}\n\n${retryPrompt}`
    : retryPrompt;
  shouldFocusComposer = true;
  renderApp();
});

window.addEventListener('hashchange', renderApp);
window.addEventListener('resize', syncViewportHeight);
window.visualViewport?.addEventListener('resize', syncViewportHeight);
window.visualViewport?.addEventListener('scroll', syncViewportHeight);

syncViewportHeight();
renderApp();
