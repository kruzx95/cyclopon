function renderLanding() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="landing-page-wrapper">
      <!-- ── Pro Editorial Top Navigation Bar ── -->
      <nav class="landing-nav">
        <a href="/" data-link class="brand-title">
          <div class="brand-logo-emblem">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="5.5" cy="17.5" r="3.5"/>
              <circle cx="18.5" cy="17.5" r="3.5"/>
              <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h4"/>
            </svg>
          </div>
          <div class="brand-name-group">
            <span class="brand-name">CYCLOPON</span>
            <span class="brand-spec-label">// PRO GPS TELEMETRY</span>
          </div>
        </a>

        <!-- System Status Badge (Desktop/Tablet) -->
        <div class="nav-system-status">
          <span class="system-radar-dot"></span>
          <span class="mono-label">LIVE FEED: OSMAND 5055</span>
        </div>

        <a href="/admin" data-link class="btn-admin-nav">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>PANEL PANITIA</span>
          <span class="admin-nav-arrow">↗</span>
        </a>
      </nav>

      <!-- ── Split Editorial Hero Section ── -->
      <main class="landing-hero fade-in">
        <div class="hero-split-grid">
          <!-- Left Column: High-Impact Editorial Statement -->
          <div class="hero-editorial-col">
            <div class="hero-tech-badge">
              <span class="badge-hash">#</span>
              <span class="badge-text">RACING DOSSIER // ULTRA-ENDURANCE TELEMETRY</span>
            </div>

            <h1 class="hero-title">
              PANTAU SETIAP KILOMETER.<br>
              <span class="title-accent">DETIK DEMI DETIK.</span>
            </h1>

            <p class="hero-subtitle">
              Platform live tracking GPS ultra-presisi untuk event sepeda jarak jauh & brevet.
              Layar HP mati di saku jersey, telemetri tetap berjalan otomatis tanpa jeda & hemat baterai.
            </p>

            <!-- High-Contrast Action CTAs -->
            <div class="hero-cta-row">
              <button id="btnRider" class="btn-hero-primary">
                <span>MASUK SEBAGAI RIDER</span>
                <span class="cta-arrow-icon">→</span>
              </button>
              <button id="btnWatchMap" class="btn-hero-secondary">
                <span class="cta-pulse-dot"></span>
                <span>PANTAU LIVE MAP</span>
              </button>
            </div>

            <!-- Pro Specification Strip -->
            <div class="hero-spec-strip">
              <div class="spec-strip-item">
                <span class="spec-strip-val">30s</span>
                <span class="spec-strip-lbl">POLL INTERVAL</span>
              </div>
              <div class="spec-strip-sep">/</div>
              <div class="spec-strip-item">
                <span class="spec-strip-val">0%</span>
                <span class="spec-strip-lbl">SCREEN WAKE</span>
              </div>
              <div class="spec-strip-sep">/</div>
              <div class="spec-strip-item">
                <span class="spec-strip-val">GPX</span>
                <span class="spec-strip-lbl">OFF-ROUTE ALERT</span>
              </div>
              <div class="spec-strip-sep">/</div>
              <div class="spec-strip-item">
                <span class="spec-strip-val">COT</span>
                <span class="spec-strip-lbl">SPLIT TIME CHECK</span>
              </div>
            </div>
          </div>

          <!-- Right Column: Interactive Race Cockpit Dossier Card -->
          <div class="hero-dossier-col">
            <div class="hero-dossier-card" id="heroDossierCard">
              <div class="dossier-card-topbar">
                <div class="dossier-live-tag">
                  <span class="live-radar-dot"></span>
                  <span>LIVE COCKPIT FEED</span>
                </div>
                <span class="dossier-stage-code" id="dossierEventCode">STAGE 01</span>
              </div>

              <div class="dossier-event-header">
                <h3 class="dossier-event-title" id="dossierEventName">Tour de Gang</h3>
                <div class="dossier-event-location">TASIKMALAYA ENDURANCE CIRCUIT</div>
              </div>

              <!-- High-Contrast Metric Triplets -->
              <div class="dossier-metrics-grid">
                <div class="dossier-metric-cell">
                  <div class="metric-cell-val" id="dossierDistance">31.5</div>
                  <div class="metric-cell-unit">KILOMETER</div>
                  <div class="metric-cell-lbl">TOTAL DISTANCE</div>
                </div>
                <div class="dossier-metric-cell">
                  <div class="metric-cell-val" id="dossierRiders">3</div>
                  <div class="metric-cell-unit">RIDERS</div>
                  <div class="metric-cell-lbl">ON CIRCUIT</div>
                </div>
                <div class="dossier-metric-cell">
                  <div class="metric-cell-val" id="dossierCps">1</div>
                  <div class="metric-cell-unit">CP</div>
                  <div class="metric-cell-lbl">CHECKPOINT</div>
                </div>
              </div>

              <!-- Real-time Pelotone Telemetry Preview -->
              <div class="dossier-peloton-stream">
                <div class="peloton-stream-header">
                  <span>// ACTIVE PELOTON RADAR</span>
                  <span class="peloton-status-text">ONLINE</span>
                </div>
                <div class="peloton-rider-row">
                  <div class="peloton-rider-meta">
                    <span class="peloton-dot rider-leader"></span>
                    <span class="peloton-bib">#001</span>
                    <span class="peloton-name">Ahmad Pelari</span>
                  </div>
                  <span class="peloton-pace">28.4 km/h · ON ROUTE</span>
                </div>
                <div class="peloton-rider-row">
                  <div class="peloton-rider-meta">
                    <span class="peloton-dot rider-chaser"></span>
                    <span class="peloton-bib">#002</span>
                    <span class="peloton-name">Budi Santoso</span>
                  </div>
                  <span class="peloton-pace">26.1 km/h · ON ROUTE</span>
                </div>
                <div class="peloton-rider-row">
                  <div class="peloton-rider-meta">
                    <span class="peloton-dot rider-sweeper"></span>
                    <span class="peloton-bib">🧹</span>
                    <span class="peloton-name">Doni Sweeper</span>
                  </div>
                  <span class="peloton-pace">22.0 km/h · LAST RIDER</span>
                </div>
              </div>

              <a href="/watch/1" id="btnDossierLaunch" data-link class="btn-dossier-launch">
                <span>BUKA RADAR EVENT INI</span>
                <span class="dossier-launch-arrow">→</span>
              </a>
            </div>
          </div>
        </div>

        <!-- ── Active Competitions & Brevets Container ── -->
        <div id="activeEventContainer" class="featured-event-container" style="display:none">
          <div class="featured-section-header">
            <div class="featured-section-title-wrap">
              <span class="section-mono-tag">// LIVE RACE RADAR · ACTIVE CALENDAR</span>
              <h2 class="featured-section-title">
                <span class="mobile-radar-dot"></span>Event Sedang Berlangsung
              </h2>
            </div>
            <div id="activeEventCountBadge"></div>
          </div>

          <div id="activeEventList" class="featured-event-list"></div>
        </div>

        <!-- ── 3 Pro Technical Equipment Spec Cards ── -->
        <div class="landing-features-grid">
          <div class="feature-item-card">
            <div class="feature-spec-header">
              <span class="feature-spec-idx">SPEC 01 // TELEMETRY</span>
              <span class="feature-spec-code">SYNC-30S</span>
            </div>
            <div class="feature-item-title">Interval 30 Detik Presisi</div>
            <div class="feature-item-desc">
              Keseimbangan optimal antara akurasi telemetri GPS dan efisiensi baterai smartphone untuk rute ultra 200–600 km tanpa perlu powerbank cadangan.
            </div>
            <div class="feature-spec-footer">
              <div class="feature-spec-stat">
                <span class="spec-kpi-lbl">PROTOCOL:</span>
                <span class="spec-kpi-val">OSMAND 5055</span>
              </div>
              <div class="feature-spec-stat">
                <span class="spec-kpi-lbl">TARGET:</span>
                <span class="spec-kpi-val">14+ HOURS LIFE</span>
              </div>
            </div>
          </div>

          <div class="feature-item-card">
            <div class="feature-spec-header">
              <span class="feature-spec-idx">SPEC 02 // HARDWARE</span>
              <span class="feature-spec-code">ZERO-WAKE</span>
            </div>
            <div class="feature-item-title">Layar Mati Tetap Berjalan</div>
            <div class="feature-item-desc">
              Background service native resmi Traccar Client pada Android & iOS. Simpan smartphone di saku jersey tanpa resiko terhenti akibat battery management OS.
            </div>
            <div class="feature-spec-footer">
              <div class="feature-spec-stat">
                <span class="spec-kpi-lbl">BACKGROUND:</span>
                <span class="spec-kpi-val">OS-INDEPENDENT</span>
              </div>
              <div class="feature-spec-stat">
                <span class="spec-kpi-lbl">SOCKET:</span>
                <span class="spec-kpi-val">PERSISTENT WS</span>
              </div>
            </div>
          </div>

          <div class="feature-item-card">
            <div class="feature-spec-header">
              <span class="feature-spec-idx">SPEC 03 // INTELLIGENCE</span>
              <span class="feature-spec-code">GPX-ENGINE</span>
            </div>
            <div class="feature-item-title">GPX Off-Route & Split COT</div>
            <div class="feature-item-desc">
              Deteksi otomatis deviasi (+100m nyasar), pencatatan Cut-Off Time di setiap pos checkpoint, serta Time Machine Replay untuk monitoring komprehensif panitia.
            </div>
            <div class="feature-spec-footer">
              <div class="feature-spec-stat">
                <span class="spec-kpi-lbl">TOLERANCE:</span>
                <span class="spec-kpi-val">100M ROUTE HALO</span>
              </div>
              <div class="feature-spec-stat">
                <span class="spec-kpi-lbl">REPLAY:</span>
                <span class="spec-kpi-val">UP TO 60X SPEED</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- ── Pro Editorial Footer ── -->
      <footer class="landing-footer">
        <div class="footer-inner">
          <div class="footer-left">
            <span class="footer-brand">CYCLOPON</span>
            <span class="footer-tagline">ULTRA-ENDURANCE CYCLING LIVE TELEMETRY</span>
          </div>
          <div class="footer-right">
            <span>ENGINEERED BY RUSHAMIDIWINATA</span>
            <span class="footer-dot">·</span>
            <span>OPEN TELEMETRY PROTOCOL 5055</span>
          </div>
        </div>
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

      // Update right-column hero dossier card with real event info
      const topEvent = targetEvents[0];
      const dossierName = document.getElementById('dossierEventName');
      const dossierLaunch = document.getElementById('btnDossierLaunch');
      if (dossierName && topEvent.name) dossierName.textContent = topEvent.name;
      if (dossierLaunch) dossierLaunch.setAttribute('href', `/watch/${topEvent.id}`);

      const container = document.getElementById('activeEventContainer');
      const list = document.getElementById('activeEventList');
      const countBadge = document.getElementById('activeEventCountBadge');
      container.style.display = 'block';

      if (countBadge) {
        countBadge.innerHTML = `<span class="count-pill"><b>${targetEvents.length}</b> EVENT AKTIF</span>`;
      }

      list.innerHTML = targetEvents.map((ev, idx) => `
        <div class="featured-event-card">
          <div class="event-card-left">
            <div class="event-route-icon-badge">
              <span class="event-stage-index">#${String(idx + 1).padStart(2, '0')}</span>
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
                    <span>GPX LOADED</span>
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
                <span>GPX DOSSIER</span>
              </a>
            ` : ''}
            <a href="/watch/${ev.id}" data-link class="btn-watch-action" title="Buka Live Map Penonton">
              <span>BUKA RADAR</span>
              <svg class="btn-arrow-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
          </div>
        </div>
      `).join('');
    })
    .catch(() => {});
}
