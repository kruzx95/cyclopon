function renderLanding() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="landing-page-wrapper">
      <!-- ── Clean Solid Top Nav ── -->
      <nav class="landing-nav">
        <a href="/" data-link class="brand-title">
          <span style="font-size:20px">🚴</span>
          <span>Cyclo<span class="brand-accent">Pon</span></span>
        </a>
        <a href="/admin" data-link class="btn btn-outline" style="font-size:13px;padding:8px 16px">
          ⚙️ &nbsp;Admin Panel
        </a>
      </nav>

      <!-- ── Hero Section (Solid Dark Background, No Blurry Gradients) ── -->
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
          <button id="btnRider" class="btn btn-primary" style="font-size:15px;padding:16px 28px">
            🚴‍♂️ &nbsp;Masuk Sebagai Rider
          </button>
          <button id="btnWatchMap" class="btn btn-outline" style="font-size:15px;padding:16px 28px">
            🗺️ &nbsp;Pantau Live Map
          </button>
        </div>

        <!-- Featured Active Event Container -->
        <div id="activeEventContainer" style="width:100%;max-width:580px;display:none">
          <div style="font-size:12px;font-weight:800;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;text-align:left">
            Event Sedang Berlangsung:
          </div>
          <div id="activeEventList"></div>
        </div>

        <!-- 3 Feature Highlight Cards -->
        <div class="landing-features-grid">
          <div class="feature-item-card">
            <div class="feature-item-icon">🔋</div>
            <div class="feature-item-title">Interval 30 Detik</div>
            <div class="feature-item-desc">Hemat daya baterai smartphone secara maksimal untuk kegiatan rute ratusan kilometer.</div>
          </div>

          <div class="feature-item-card">
            <div class="feature-item-icon">📱</div>
            <div class="feature-item-title">Layar Mati Tetap Jalan</div>
            <div class="feature-item-desc">Memanfaatkan background service resmi Traccar Client di Android dan iOS tanpa henti.</div>
          </div>

          <div class="feature-item-card">
            <div class="feature-item-icon">📊</div>
            <div class="feature-item-title">Rute GPX & Leaderboard</div>
            <div class="feature-item-desc">Visualisasi rute GPX interaktif dengan kalkulasi jarak tempuh (km) dan ranking real-time.</div>
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
      container.style.display = 'block';

      list.innerHTML = targetEvents.map(ev => `
        <div class="featured-event-box">
          <div style="min-width:0;flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span class="live-status-pill" style="padding:2px 8px;font-size:10px">
                <span class="live-dot pulse"></span>
                <span>LIVE</span>
              </span>
              <span style="font-size:12.5px;font-weight:700;color:var(--text-secondary)">📅 ${ev.date}</span>
            </div>
            <div style="font-size:16px;font-weight:900;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${ev.name}
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
            <a href="/api/events/${ev.id}/gpx/download" download class="btn btn-outline" style="padding:10px 14px;font-size:13px" title="Unduh Rute GPX Resmi">
              📍 GPX
            </a>
            <a href="/watch/${ev.id}" data-link class="btn btn-primary" style="padding:10px 18px;font-size:13px">
              Buka Peta →
            </a>
          </div>
        </div>
      `).join('');
    })
    .catch(() => {});
}
