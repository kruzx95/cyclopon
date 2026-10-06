function renderLanding() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="landing-page-wrapper">
      <!-- ── Clean Solid Top Nav ── -->
      <nav class="landing-nav">
        <a href="/" data-link class="brand-title">
          <div class="brand-logo-emblem">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="5.5" cy="17.5" r="3.5"/>
              <circle cx="18.5" cy="17.5" r="3.5"/>
              <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h4"/>
            </svg>
          </div>
          <span>Cyclo<span class="brand-accent">Pon</span></span>
        </a>
        <a href="/admin" data-link class="btn-admin-nav">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>Admin Panel</span>
        </a>
      </nav>

      <!-- ── Hero Section ── -->
      <main class="landing-hero fade-in">
        <div class="hero-tag">
          <span>🏆</span>
          <span>Live GPS Cycling Tracker</span>
        </div>

        <h1 class="hero-title">
          Pantau Setiap Kilometer<br>
          <span class="title-accent">Secara Real-Time</span>
        </h1>

        <p class="hero-subtitle">
          Platform pelacakan langsung rute GPX dan posisi rider untuk kegiatan bersepeda jarak jauh.
          Layar HP mati, pelacakan tetap berjalan otomatis & hemat baterai.
        </p>

        <!-- CTA Buttons -->
        <div class="hero-cta-row">
          <button id="btnRider" class="btn-hero-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="5.5" cy="17.5" r="3.5"/>
              <circle cx="18.5" cy="17.5" r="3.5"/>
              <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h4"/>
            </svg>
            <span>Masuk Sebagai Rider</span>
          </button>
          <button id="btnWatchMap" class="btn-hero-secondary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
              <line x1="8" y1="2" x2="8" y2="18"/>
              <line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
            <span>Pantau Live Map</span>
          </button>
        </div>

        <!-- ── Featured Active Event Container ── -->
        <div id="activeEventContainer" class="featured-event-container" style="display:none">
          <div class="featured-section-header">
            <div class="featured-section-title-wrap">
              <div class="featured-section-tag">
                <span class="live-radar-dot"></span>
                <span>LIVE RACE RADAR</span>
              </div>
              <h2 class="featured-section-title">
                <span class="mobile-radar-dot"></span>Event Sedang Berlangsung
              </h2>
            </div>
            <div id="activeEventCountBadge"></div>
          </div>

          <div id="activeEventList" class="featured-event-list"></div>
        </div>

        <!-- ── 3 Feature Highlight Cards with Athletic Tech Spec Aesthetics ── -->
        <div class="landing-features-grid">
          <div class="feature-item-card">
            <div class="feature-card-header">
              <div class="feature-item-badge emerald">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="7" width="16" height="10" rx="2" ry="2"/>
                  <line x1="22" y1="11" x2="22" y2="13"/>
                  <polygon points="10 9 7 13 11 13 9 16" fill="currentColor"/>
                </svg>
              </div>
              <span class="feature-card-tag emerald">30s GPS SYNC</span>
            </div>
            <div class="feature-item-title">Interval 30 Detik</div>
            <div class="feature-item-desc">Hemat daya baterai smartphone secara maksimal untuk kegiatan rute ratusan kilometer tanpa boros powerbank.</div>
            <div class="feature-card-footer">
              <span class="feature-stat-pill">🔋 200–600 km Ultra Ready</span>
            </div>
          </div>

          <div class="feature-item-card">
            <div class="feature-card-header">
              <div class="feature-item-badge sand">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="3" ry="3"/>
                  <line x1="12" y1="18" x2="12.01" y2="18"/>
                  <path d="M9 6h6"/>
                </svg>
              </div>
              <span class="feature-card-tag sand">BG SERVICE</span>
            </div>
            <div class="feature-item-title">Layar Mati Tetap Jalan</div>
            <div class="feature-item-desc">Memanfaatkan background service resmi Traccar Client di Android dan iOS di saku jersey tanpa risiko aplikasi terhenti.</div>
            <div class="feature-card-footer">
              <span class="feature-stat-pill">📱 OsmAnd Protocol 5055</span>
            </div>
          </div>

          <div class="feature-item-card">
            <div class="feature-card-header">
              <div class="feature-item-badge sage">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <span class="feature-card-tag sage">LIVE TELEMETRI</span>
            </div>
            <div class="feature-item-title">Rute GPX & Leaderboard</div>
            <div class="feature-item-desc">Visualisasi rute GPX interaktif, kalkulasi deviasi off-route, profil tanjakan elevasi, dan peringkat penonton real-time.</div>
            <div class="feature-card-footer">
              <span class="feature-stat-pill">⏱️ Split COT & Replay Map</span>
            </div>
          </div>
        </div>
      </main>

      <!-- ── Footer ── -->
      <footer class="landing-footer">
        <p>CycloPon Live Tracker · Rushamidiwinata</p>
      </footer>
    </div>
  `;

  document.getElementById('btnRider').addEventListener('click', () => Router.navigate('/rider'));

  let firstEventId = null;
  document.getElementById('btnWatchMap').addEventListener('click', () => {
    if (firstEventId) {
      Router.navigate(`/watch/${firstEventId}`);
    } else {
      Router.navigate('/watch/1');
    }
  });

  // Fetch active events for direct access
  fetch('/api/events')
    .then(r => r.json())
    .then(events => {
      if (!Array.isArray(events) || !events.length) return;

      const active = events.filter(e => e.active);
      const targetEvents = active.length ? active : events.slice(0, 1);
      firstEventId = targetEvents[0].id;

      const container = document.getElementById('activeEventContainer');
      const list = document.getElementById('activeEventList');
      const countBadge = document.getElementById('activeEventCountBadge');
      container.style.display = 'block';

      if (countBadge) {
        countBadge.innerHTML = `<span class="count-pill"><b>${targetEvents.length}</b> Event Aktif</span>`;
      }

      list.innerHTML = targetEvents.map(ev => `
        <div class="featured-event-card">
          <div class="event-card-left">
            <div class="event-route-icon-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                <line x1="8" y1="2" x2="8" y2="18"></line>
                <line x1="16" y1="6" x2="16" y2="22"></line>
              </svg>
            </div>
            <div class="event-info-col">
              <div class="featured-event-meta">
                <span class="event-live-pill">
                  <span class="pulse-dot"></span>
                  <span>LIVE TRACKING</span>
                </span>
                <span class="event-date-chip">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <span>${ev.date}</span>
                </span>
                ${ev.gpx_path ? `
                  <span class="event-gpx-chip">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    <span>Rute GPX</span>
                  </span>
                ` : ''}
              </div>
              <h3 class="featured-event-title" title="${ev.name}">
                ${ev.name}
              </h3>
            </div>
          </div>

          <div class="featured-event-actions">
            ${ev.gpx_path ? `
              <a href="/api/events/${ev.id}/gpx/download" download class="btn-gpx-chip" title="Unduh File GPX Resmi">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>GPX</span>
              </a>
            ` : ''}
            <a href="/watch/${ev.id}" data-link class="btn-watch-action" title="Buka Live Map Penonton">
              <span>Buka Peta</span>
              <svg class="btn-arrow-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
          </div>
        </div>
      `).join('');
    })
    .catch(() => {});
}
