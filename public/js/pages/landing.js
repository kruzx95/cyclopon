function ensureLandingGuideStyles() {
  if (document.getElementById('landingGuideStyles')) return;
  const style = document.createElement('style');
  style.id = 'landingGuideStyles';
  style.textContent = `
    .landing-guide-section {
      margin: 36px 0;
      padding: 26px 22px;
      background: #FFFFFF;
      border: 1.5px solid #E5E7EB;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
    }
    .landing-guide-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      margin-bottom: 22px;
      padding-bottom: 18px;
      border-bottom: 1px solid #F3F4F6;
    }
    .guide-mono-tag {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      font-weight: 800;
      color: #16A34A;
      letter-spacing: 0.05em;
      display: block;
      margin-bottom: 6px;
    }
    .guide-main-title {
      font-size: 21px;
      font-weight: 900;
      color: #0D1117;
      letter-spacing: -0.02em;
      margin: 0 0 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .guide-subtitle {
      font-size: 13.5px;
      color: #4B5563;
      margin: 0;
      line-height: 1.5;
      max-width: 640px;
    }
    .guide-store-badges {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
    .store-badge-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: #0D1117;
      color: #FFFFFF !important;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .store-badge-btn:hover {
      background: #1C3E24;
    }
    .guide-steps-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 22px;
    }
    .guide-step-card {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      padding: 18px;
      display: flex;
      flex-direction: column;
    }
    .guide-step-card.primary-step {
      border-color: #CBD5E1;
      background: #F8FAFC;
    }
    .guide-step-card.alert-step {
      border-color: #FED7AA;
      background: #FFFBF5;
    }
    .step-card-num {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10px;
      font-weight: 800;
      color: #64748B;
      letter-spacing: 0.06em;
      margin-bottom: 6px;
    }
    .step-card-title {
      font-size: 15px;
      font-weight: 800;
      color: #0D1117;
      margin-bottom: 8px;
    }
    .step-card-desc {
      font-size: 13px;
      color: #475569;
      line-height: 1.5;
      margin: 0 0 12px;
    }
    .step-code-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #0D1117;
      color: #00E5FF;
      padding: 10px 14px;
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .btn-copy-code {
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #FFFFFF;
      padding: 5px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      touch-action: manipulation;
    }
    .btn-copy-code.copied {
      background: #16A34A;
      border-color: #16A34A;
    }
    .step-card-hint {
      font-size: 11.5px;
      color: #64748B;
      line-height: 1.4;
    }
    .step-bib-example {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .bib-pill {
      background: #0D1117;
      color: #FFFFFF;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 4px;
    }
    .bib-sep {
      font-size: 12px;
      color: #94A3B8;
      font-weight: 600;
    }
    .step-action-link {
      font-size: 12.5px;
      font-weight: 800;
      color: #0D1117;
      text-decoration: underline;
      margin-top: auto;
      padding-top: 8px;
    }
    .step-checklist {
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 12.5px;
      color: #334155;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .sub-switches {
      display: flex;
      gap: 6px;
      margin-top: 4px;
    }
    .switch-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      background: #DCFCE7;
      color: #166534;
    }
    .step-warning-box {
      background: #FEF3C7;
      border-left: 3px solid #F59E0B;
      padding: 10px 12px;
      border-radius: 4px;
      font-size: 12px;
      color: #92400E;
      line-height: 1.5;
    }
    .guide-alternative-box {
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .alt-box-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .alt-box-icon {
      font-size: 24px;
    }
    .alt-box-title {
      font-size: 14px;
      font-weight: 800;
      color: #0D1117;
      margin-bottom: 2px;
    }
    .alt-box-desc {
      font-size: 12.5px;
      color: #64748B;
      line-height: 1.4;
    }
    .btn-alt-cockpit {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #0D1117;
      color: #FFFFFF !important;
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 12.5px;
      font-weight: 800;
      text-decoration: none;
      white-space: nowrap;
      flex-shrink: 0;
    }
    @media (max-width: 768px) {
      .landing-guide-section {
        padding: 18px 14px;
        margin: 24px 0;
      }
      .landing-guide-header {
        flex-direction: column;
        gap: 14px;
      }
      .guide-main-title {
        font-size: 18px;
      }
      .guide-steps-grid {
        grid-template-columns: 1fr;
      }
      .guide-alternative-box {
        flex-direction: column;
        align-items: flex-start;
      }
      .btn-alt-cockpit {
        width: 100%;
        justify-content: center;
      }
    }
  `;
  document.head.appendChild(style);
}

function renderLanding() {
  ensureLandingGuideStyles();
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

        <!-- ── Panduan Setup Smartphone Rider (Traccar Client) ── -->
        <section class="landing-guide-section" id="traccarGuideSection">
          <div class="landing-guide-header">
            <div class="guide-tag-wrap">
              <span class="guide-mono-tag">// PANDUAN APLIKASI · PESEPEDA (RIDER)</span>
              <h2 class="guide-main-title">
                <span class="guide-phone-icon">📲</span> Cara Menghubungkan GPS Smartphone (Traccar Client)
              </h2>
              <p class="guide-subtitle">
                Pesepeda cukup menggunakan aplikasi gratis <strong>Traccar Client</strong> resmi.
                Layar HP bisa dimatikan sepenuhnya dan disimpan aman di saku jersey selama bersepeda.
              </p>
            </div>
            <div class="guide-store-badges">
              <a href="https://play.google.com/store/apps/details?id=org.traccar.client" target="_blank" rel="noopener" class="store-badge-btn" title="Download di Google Play Store">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.609 1.814L13.793 12 3.61 22.186c-.378-.403-.61-.976-.61-1.621V3.435c0-.645.232-1.218.61-1.621zM15.207 13.414l2.564 2.564-11.89 6.837 9.326-9.401zm0-2.828L5.881 1.185l11.89 6.837-2.564 2.564zm1.414 1.414l3.657 2.102c.866.498.866 1.31 0 1.808l-3.657 2.102-2.146-2.146 2.146-2.146z"/>
                </svg>
                <span>Google Play</span>
              </a>
              <a href="https://apps.apple.com/app/traccar-client/id843156976" target="_blank" rel="noopener" class="store-badge-btn" title="Download di Apple App Store">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.77 1.04-1.84.93-2.91-.9.04-2 .61-2.65 1.37-.57.66-.99 1.74-.86 2.78 1.01.08 1.96-.47 2.58-1.24z"/>
                </svg>
                <span>App Store</span>
              </a>
            </div>
          </div>

          <div class="guide-steps-grid">
            <!-- Step 1: Server URL -->
            <div class="guide-step-card primary-step">
              <div class="step-card-num">LANGKAH 1</div>
              <div class="step-card-title">Atur Server URL</div>
              <p class="step-card-desc">Buka menu <strong>Settings</strong> di aplikasi Traccar Client, pilih <strong>Server URL</strong> dan masukkan alamat server berikut:</p>
              <div class="step-code-box">
                <code id="traccarServerUrlDisplay">${traccarServerUrl}</code>
                <button id="btnCopyServerUrl" class="btn-copy-code" title="Salin ke Clipboard">
                  <span id="copyUrlText">Salin URL</span>
                </button>
              </div>
              <div class="step-card-hint">
                💡 <em>Wajib gunakan awalan <code>http://</code> dan sertakan port <code>:5055</code></em>
              </div>
            </div>

            <!-- Step 2: Device Identifier -->
            <div class="guide-step-card">
              <div class="step-card-num">LANGKAH 2</div>
              <div class="step-card-title">Atur Device Identifier</div>
              <p class="step-card-desc">Ganti angka default dengan nomor BIB resmi Anda yang terdaftar:</p>
              <div class="step-bib-example">
                <span class="bib-pill">BIB-001</span>
                <span class="bib-sep">atau</span>
                <span class="bib-pill">BIB-012</span>
              </div>
              <p class="step-card-desc" style="margin-top:8px">
                Format: <code>BIB-</code> diikuti nomor peserta Anda.
              </p>
              <a href="/rider" data-link class="step-action-link">Cek Nomor BIB / Login Rider →</a>
            </div>

            <!-- Step 3: Optimal Tuning -->
            <div class="guide-step-card">
              <div class="step-card-num">LANGKAH 3</div>
              <div class="step-card-title">Pengaturan Akurasi & Hemat Baterai</div>
              <ul class="step-checklist">
                <li><strong>Location accuracy:</strong> <code>Highest</code> (Akurasi Satelit GPS)</li>
                <li><strong>Interval:</strong> <code>10</code> detik (uji coba) atau <code>30</code> detik (ultra brevet)</li>
                <li><strong>Distance:</strong> <code>50</code> – <code>75</code> meter</li>
                <li><strong>Advanced Settings (Aktifkan):</strong>
                  <div class="sub-switches">
                    <span class="switch-badge">✓ Offline Buffering: ON</span>
                    <span class="switch-badge">✓ Stop Detection: ON</span>
                  </div>
                </li>
              </ul>
            </div>

            <!-- Step 4: Continuous Tracking & Android Permission -->
            <div class="guide-step-card alert-step">
              <div class="step-card-num">LANGKAH 4 (KRUSIAL)</div>
              <div class="step-card-title">Continuous Tracking & Izin Android</div>
              <p class="step-card-desc">Kembali ke layar utama, geser saklar <strong>Continuous tracking</strong> ke posisi <strong>ON (Hijau)</strong>.</p>
              <div class="step-warning-box">
                <strong>⚠️ Peringatan Izin Lokasi Android:</strong><br>
                Saat dialog muncul, WAJIB pilih: <strong>"Allow all the time" (Izinkan sepanjang waktu)</strong>.<br>
                <em>(Jika memilih 'Only while using app', GPS mati saat layar mati di saku jersey).</em>
              </div>
              <div class="step-card-hint" style="margin-top:8px">
                ✅ Tekan <strong>"Send location"</strong> sekali untuk uji coba kirim koordinat awal.
              </div>
            </div>
          </div>

          <!-- Alternative Option Box: No App Needed / Cockpit HUD -->
          <div class="guide-alternative-box">
            <div class="alt-box-left">
              <span class="alt-box-icon">🌐</span>
              <div>
                <div class="alt-box-title">Opsi Alternatif: Rider Cockpit HUD Langsung dari Browser</div>
                <div class="alt-box-desc">
                  Tidak ingin menginstal aplikasi? Rider juga bisa melacak posisi GPS dan memantau speedometer/live grade langsung via browser web Chrome/Safari.
                </div>
              </div>
            </div>
            <a href="/rider" data-link class="btn-alt-cockpit">
              <span>Buka Rider Cockpit</span>
              <span>→</span>
            </a>
          </div>
        </section>

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

  // Traccar Server URL Copy to Clipboard
  const btnCopy = document.getElementById('btnCopyServerUrl');
  const copyText = document.getElementById('copyUrlText');
  btnCopy?.addEventListener('click', () => {
    const handleSuccess = () => {
      btnCopy.classList.add('copied');
      if (copyText) copyText.textContent = '✓ Tersalin!';
      setTimeout(() => {
        btnCopy.classList.remove('copied');
        if (copyText) copyText.textContent = 'Salin URL';
      }, 2000);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(traccarServerUrl).then(handleSuccess).catch(() => {
        const tempInput = document.createElement('input');
        tempInput.value = traccarServerUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        handleSuccess();
      });
    } else {
      const tempInput = document.createElement('input');
      tempInput.value = traccarServerUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      handleSuccess();
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
