function renderLanding() {
  const app = document.getElementById('app');
  const currentHost = (window.location && window.location.hostname) ? window.location.hostname : '43.173.51.161';
  const traccarServerUrl = `http://${currentHost}:5055`;

  app.innerHTML = `
    <div class="landing-page-wrapper">
      <!-- ── Pro Editorial Top Navigation Bar ── -->
      <nav class="landing-nav">
        <a href="/" data-link class="brand-title">
          <img src="/icons/logo-emblem.svg" alt="CYCLOPON" class="brand-logo-emblem" width="32" height="32">
          <div class="brand-name-group">
            <span class="brand-name">CYCLOPON</span>
          </div>
        </a>

        <div class="nav-actions-group">
          <a href="/guide" data-link class="btn-guide-nav" title="Panduan Lengkap Pengguna & Pesepeda">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
            <span>PANDUAN</span>
          </a>

          <a href="/admin" data-link class="btn-admin-nav">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>PANEL PANITIA</span>
            <span class="admin-nav-arrow">↗</span>
          </a>
        </div>
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
                <h3 class="dossier-event-title" id="dossierEventName">Memuat Event...</h3>
                <div class="dossier-event-location" id="dossierEventLocation">ENDURANCE CIRCUIT</div>
              </div>

              <!-- High-Contrast Metric Triplets -->
              <div class="dossier-metrics-grid">
                <div class="dossier-metric-cell">
                  <div class="metric-cell-val" id="dossierDistance">-</div>
                  <div class="metric-cell-unit">KILOMETER</div>
                  <div class="metric-cell-lbl">TOTAL DISTANCE</div>
                </div>
                <div class="dossier-metric-cell">
                  <div class="metric-cell-val" id="dossierRiders">-</div>
                  <div class="metric-cell-unit">RIDERS</div>
                  <div class="metric-cell-lbl">ON CIRCUIT</div>
                </div>
                <div class="dossier-metric-cell">
                  <div class="metric-cell-val" id="dossierCps">-</div>
                  <div class="metric-cell-unit">CP</div>
                  <div class="metric-cell-lbl">CHECKPOINT</div>
                </div>
              </div>

              <!-- Real-time Pelotone Telemetry Preview -->
              <div class="dossier-peloton-stream">
                <div class="peloton-stream-header">
                  <span>// ACTIVE PELOTON RADAR</span>
                  <span class="peloton-status-text" id="dossierPelotonStatus">STANDBY</span>
                </div>
                <div id="dossierPelotonList">
                  <div style="padding:14px;font-size:12px;color:rgba(255,255,255,0.6);text-align:center">
                    Menghubungkan ke telemetri event...
                  </div>
                </div>
              </div>

              <a href="#" id="btnDossierLaunch" data-link class="btn-dossier-launch">
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
            <a href="/" data-link class="footer-brand-lockup">
              <img src="/icons/logo-emblem.svg" alt="CYCLOPON" class="footer-logo" width="30" height="30">
              <div class="footer-brand-info">
                <span class="footer-brand-title">CYCLOPON</span>
                <span class="footer-brand-tagline">ULTRA-ENDURANCE CYCLING LIVE TELEMETRY</span>
              </div>
            </a>
          </div>

          <div class="footer-right">
            <div class="footer-meta-row">
              <span class="footer-spec-badge">OPEN PROTOCOL 5055</span>
              <span class="footer-dot">·</span>
              <span class="footer-author">ENGINEERED BY RUSHAMIDIWINATA</span>
            </div>
            <div class="footer-copy">
              <span>© 2026 CYCLOPON · REAL-TIME GPS TRACKING ENGINE</span>
            </div>
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
      const streamEl = document.getElementById('dossierPelotonList');
      if (!Array.isArray(events) || !events.length) {
        if (streamEl) {
          streamEl.innerHTML = `
            <div style="padding:14px;font-size:12px;color:rgba(255,255,255,0.6);text-align:center">
              Belum ada event balap yang aktif saat ini.
            </div>
          `;
        }
        return;
      }

      const active = events.filter(e => e.active);
      const targetEvents = active.length ? active : events.slice(0, 1);
      firstEventId = targetEvents[0].id;

      // Update right-column hero dossier card with real event info
      const topEvent = targetEvents[0];
      const dossierName = document.getElementById('dossierEventName');
      const dossierLocation = document.getElementById('dossierEventLocation');
      const dossierCode = document.getElementById('dossierEventCode');
      const dossierLaunch = document.getElementById('btnDossierLaunch');
      const dossierDist = document.getElementById('dossierDistance');

      if (dossierName && topEvent.name) dossierName.textContent = topEvent.name;
      if (dossierLocation) {
        dossierLocation.textContent = topEvent.date ? `EDISI: ${topEvent.date} · RESMI` : 'TASIKMALAYA ENDURANCE CIRCUIT';
      }
      if (dossierCode) {
        dossierCode.textContent = topEvent.active ? 'LIVE EVENT' : 'STAGE 01';
      }
      if (dossierLaunch) dossierLaunch.setAttribute('href', `/watch/${topEvent.id}`);

      // Update Roster Guide section action links with active event info
      const guideRosterBtn = document.getElementById('btnGuideOpenRoster');
      if (guideRosterBtn) {
        guideRosterBtn.setAttribute('href', `/events/${topEvent.id}`);
        guideRosterBtn.innerHTML = `<span>👥 Buka Roster (${escapeHtml(topEvent.name)})</span><span>→</span>`;
      }
      const step1Link = document.getElementById('btnRosterGuideStep1Link');
      if (step1Link) {
        step1Link.setAttribute('href', `/events/${topEvent.id}`);
        step1Link.textContent = `Buka Roster (${escapeHtml(topEvent.name)}) →`;
      }

      // If backend already pre-calculated distance_km
      if (dossierDist && topEvent.distance_km != null && Number(topEvent.distance_km) > 0) {
        dossierDist.textContent = Number(topEvent.distance_km).toFixed(1);
      }

      // Fetch accurate count of riders, checkpoints, and GPX distance for the featured event
      Promise.all([
        fetch(`/api/events/${topEvent.id}/riders`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`/api/events/${topEvent.id}/checkpoints`).then(r => r.ok ? r.json() : []).catch(() => []),
        (topEvent.distance_km == null || Number(topEvent.distance_km) <= 0) && topEvent.gpx_path
          ? fetch(topEvent.gpx_path).then(r => r.ok ? r.text() : '').catch(() => '')
          : Promise.resolve('')
      ]).then(([riders, cps, gpxText]) => {
        const ridersEl = document.getElementById('dossierRiders');
        const cpsEl = document.getElementById('dossierCps');
        const pelotonStatus = document.getElementById('dossierPelotonStatus');
        if (ridersEl) ridersEl.textContent = Array.isArray(riders) ? riders.length : 0;
        if (cpsEl) cpsEl.textContent = Array.isArray(cps) ? cps.length : 0;
        if (pelotonStatus) pelotonStatus.textContent = Array.isArray(riders) && riders.length ? 'ONLINE' : 'STANDBY';

        // Calculate and display accurate total distance
        let finalDistance = Number(topEvent.distance_km || 0);

        // Fallback 1: Parse GPX text if available
        if (finalDistance <= 0 && gpxText) {
          try {
            if (typeof parseGpxData === 'function') {
              const parsed = parseGpxData(gpxText);
              finalDistance = parsed?.stats?.totalKm || 0;
            } else {
              const ptRegex = /<(?:trkpt|rtept)[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"/gi;
              let match;
              const coords = [];
              while ((match = ptRegex.exec(gpxText)) !== null) {
                const lat = parseFloat(match[1]);
                const lon = parseFloat(match[2]);
                if (!isNaN(lat) && !isNaN(lon)) coords.push([lat, lon]);
              }
              if (coords.length > 1) {
                let total = 0;
                for (let i = 1; i < coords.length; i++) {
                  const dLat = (coords[i][0] - coords[i-1][0]) * Math.PI / 180;
                  const dLng = (coords[i][1] - coords[i-1][1]) * Math.PI / 180;
                  const a = Math.sin(dLat/2)**2 + Math.cos(coords[i-1][0]*Math.PI/180)*Math.cos(coords[i][0]*Math.PI/180)*Math.sin(dLng/2)**2;
                  total += 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                }
                finalDistance = Math.round(total * 10) / 10;
              }
            }
          } catch (e) {
            console.warn('[Landing] Error parsing GPX distance:', e);
          }
        }

        // Fallback 2: Maximum checkpoint target km
        if (finalDistance <= 0 && Array.isArray(cps) && cps.length) {
          const maxCp = Math.max(...cps.map(c => Number(c.km_distance || 0)));
          if (maxCp > 0) finalDistance = Math.round(maxCp * 10) / 10;
        }

        if (dossierDist) {
          dossierDist.textContent = finalDistance > 0 ? (Math.round(finalDistance * 10) / 10).toFixed(1) : '-';
        }

        if (streamEl) {
          if (Array.isArray(riders) && riders.length) {
            streamEl.innerHTML = riders.slice(0, 3).map(r => `
              <div class="peloton-rider-row">
                <div class="peloton-rider-meta">
                  <span class="peloton-dot" style="background:${escapeHtml(r.color || '#00E5FF')}"></span>
                  <span class="peloton-bib">#${escapeHtml(r.bib)}</span>
                  <span class="peloton-name">${escapeHtml(r.name)}</span>
                </div>
                <span class="peloton-pace">${r.role === 'sweeper' ? 'SWEEPER' : r.role === 'medic' ? 'MEDIS' : 'PESERTA'}</span>
              </div>
            `).join('');
          } else {
            streamEl.innerHTML = `
              <div style="padding:14px;font-size:12px;color:rgba(255,255,255,0.6);text-align:center">
                Belum ada rider terdaftar pada event ini.
              </div>
            `;
          }
        }
      });

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
                  <span>${escapeHtml(ev.date)}</span>
                </span>
                ${ev.distance_km ? `
                  <span class="event-date-chip" style="font-weight:800;color:#059669;background:#ECFDF5;border-color:#A7F3D0">
                    <span>${ev.distance_km} KM</span>
                  </span>
                ` : ''}
                ${ev.gpx_path ? `
                  <span class="event-gpx-chip">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    <span>GPX LOADED</span>
                  </span>
                ` : ''}
              </div>
              <h3 class="featured-event-title" title="${escapeHtml(ev.name)}">
                <a href="/events/${ev.id}" data-link style="color:inherit;text-decoration:none">${escapeHtml(ev.name)}</a>
              </h3>
            </div>
          </div>

          <div class="featured-event-actions">
            <a href="/events/${ev.id}" data-link class="btn-gpx-chip" style="color:#0D1117;border-color:#0D1117;background:#FFFFFF;font-weight:800" title="Lihat Aktivitas & Roster Peserta (Kuyy Style)">
              <span>👥 DAFTAR &amp; ROSTER</span>
            </a>
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
