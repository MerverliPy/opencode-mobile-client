import './styles.css';

const releaseTag = 'v0.2.0';

const screens = {
  sessions: {
    label: 'Sessions',
    kicker: 'Browse',
    title: 'Sessions',
    description: 'Keep the session destination within easy thumb reach, even before session state exists.',
    emptyTitle: 'No sessions to show yet.',
    emptyBody:
      'This phase adds the mobile destination first. Session metadata and saved work remain intentionally out of scope.',
    details: [
      ['Current state', 'Intentional empty placeholder'],
      ['Why it matters', 'The app now has a reliable place to return for session browsing'],
      ['Still out of scope', 'Local persistence and real session history'],
    ],
  },
  task: {
    label: 'Task',
    kicker: 'Work',
    title: 'Task',
    description: 'Task stays central in the navigation model so the main work surface feels easy to reach on iPhone.',
    emptyTitle: 'Task view is ready for content.',
    emptyBody:
      'Conversation flow and composer behavior are held for the next phase. This release focuses only on clear mobile routing.',
    details: [
      ['Current state', 'Empty task placeholder'],
      ['Navigation behavior', 'The bottom bar keeps Task one tap away'],
      ['Still out of scope', 'Messages, streaming output, and composer input'],
    ],
  },
  settings: {
    label: 'Settings',
    kicker: 'Prefs',
    title: 'Settings',
    description: 'Settings completes the primary three-destination shell without adding a desktop-style preferences surface.',
    emptyTitle: 'Settings stay intentionally light.',
    emptyBody:
      'Advanced settings are not part of this phase. The destination exists now so the navigation model feels complete on mobile.',
    details: [
      ['Current state', 'Lightweight placeholder only'],
      ['Why it matters', 'Primary navigation now covers the expected top-level destinations'],
      ['Still out of scope', 'Advanced preferences and install-related UX'],
    ],
  },
};

const navigationOrder = ['sessions', 'task', 'settings'];
const app = document.querySelector('#app');

function getActiveScreenId() {
  const candidate = window.location.hash.replace('#', '');

  if (screens[candidate]) {
    return candidate;
  }

  window.history.replaceState(null, '', '#task');
  return 'task';
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

function renderApp() {
  const activeId = getActiveScreenId();
  const screen = screens[activeId];

  app.innerHTML = `
    <div class="app-shell">
      <header class="top-frame">
        <div class="brand-row">
          <div>
            <p class="eyebrow">OpenCode mobile</p>
            <h1>Navigation shell</h1>
          </div>
          <span class="status-badge">${releaseTag}</span>
        </div>
        <p class="frame-copy">
          Thumb-first navigation keeps Sessions, Task, and Settings obvious on a narrow screen.
        </p>
      </header>

      <main class="screen-area" aria-labelledby="screen-title">
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
      </main>

      <footer class="bottom-frame">
        <nav class="tab-bar" aria-label="Primary navigation">
          ${renderNavigation(activeId)}
        </nav>
      </footer>
    </div>
  `;
}

window.addEventListener('hashchange', renderApp);

renderApp();
