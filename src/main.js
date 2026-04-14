import './styles.css';

document.querySelector('#app').innerHTML = `
  <div class="app-shell">
    <header class="top-frame">
      <div class="brand-row">
        <div>
          <p class="eyebrow">OpenCode</p>
          <h1>Mobile shell</h1>
        </div>
        <span class="status-badge">Phase 01</span>
      </div>
      <p class="frame-copy">Portrait-first foundation for narrow screens.</p>
    </header>

    <main class="launch-screen" aria-label="Initial launch placeholder">
      <section class="hero-card">
        <p class="eyebrow">Initial launch</p>
        <h2>Blank task surface, ready for the next phase.</h2>
        <p>
          This first release establishes the app shell, safe top and bottom framing, and a readable
          mobile layout without adding sessions, task output, or tool views yet.
        </p>
      </section>

      <section class="placeholder-card" aria-hidden="true">
        <div class="placeholder-notch"></div>
        <div class="placeholder-line short"></div>
        <div class="placeholder-line"></div>
        <div class="placeholder-line"></div>
        <div class="placeholder-block"></div>
      </section>
    </main>

    <footer class="bottom-frame">
      <div class="bottom-panel">
        <span class="online-dot"></span>
        <div>
          <p class="eyebrow">Shell status</p>
          <p class="bottom-copy">Stable mobile frame in place.</p>
        </div>
      </div>
    </footer>
  </div>
`;
