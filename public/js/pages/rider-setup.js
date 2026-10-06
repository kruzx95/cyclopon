function renderRiderSetup() {
  loadCss('/css/rider.css');

  const configStr = sessionStorage.getItem('riderConfig') || localStorage.getItem('riderConfig');
  if (!configStr) {
    Router.navigate('/rider');
    return;
  }

  let config;
  try {
    config = JSON.parse(configStr);
  } catch {
    sessionStorage.removeItem('riderConfig');
    localStorage.removeItem('riderConfig');
    Router.navigate('/rider');
    return;
  }

  const { rider, event, traccar } = config;
  const hostClean = traccar.serverUrl.replace(/^https?:\/\//, '').split(':')[0];
  const osmandUrl = `http://${hostClean}:${traccar.osmandPort}`;

  const app = document.getElementById('app');
  app.innerHTML = `
    <div style="max-width:780px;margin:0 auto;padding:28px 16px;min-height:100vh">

      <!-- ── Top Hub Header ── -->
      <div class="rider-hub-header">
        <div class="hub-header-left">
          <a href="/" data-link class="hub-back-btn" title="Kembali ke Beranda">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Beranda</span>
          </a>
          <div class="hub-brand-group">
            <div class="brand-logo-emblem">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="5.5" cy="17.5" r="3.5"/>
                <circle cx="18.5" cy="17.5" r="3.5"/>
                <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h4"/>
              </svg>
            </div>
            <h1 class="hub-title">Rider <span class="hub-title-accent">Hub</span></h1>
          </div>
        </div>
        <div class="hub-header-right">
          ${rider.role && rider.role !== 'rider' ? `
            <span class="hub-role-badge ${rider.role}">
              ${rider.role === 'sweeper' ? '🧹 SWEEPER' : (rider.role === 'marshall' ? '🏍️ MARSHALL' : rider.role.toUpperCase())}
            </span>
          ` : ''}
          <span class="hub-bib-badge">
            BIB #${rider.bib}
          </span>
          <button id="btnRiderLogout" class="hub-logout-btn" title="Keluar dari sesi rider">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Keluar</span>
          </button>
        </div>
      </div>

      <!-- ── Welcome Banner ── -->
      <div class="rider-welcome-card fade-in">
        <div class="rider-avatar-halo" style="--rider-color: ${rider.color || '#2B4E30'}">
          <div class="rider-avatar-inner" style="background: ${rider.color || '#2B4E30'}">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="5.5" cy="17.5" r="3.5"/>
              <circle cx="18.5" cy="17.5" r="3.5"/>
              <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h4"/>
            </svg>
          </div>
        </div>
        <div class="rider-welcome-info">
          <div class="rider-greeting-row">
            <h2 class="rider-welcome-name">Halo, ${rider.name}</h2>
            <span class="rider-event-tag">🏁 ${event.name}</span>
          </div>
          <p class="rider-welcome-meta">
            Tanggal: <strong>${event.date}</strong> &nbsp;·&nbsp; Status: <span style="color:#047857;font-weight:700">Terdaftar Aktif</span>
          </p>
        </div>
        <div class="rider-device-pill" title="ID Perangkat Traccar Client">
          <span class="device-label">DEVICE ID</span>
          <span class="device-val">${traccar.deviceIdentifier}</span>
        </div>
      </div>

      <!-- ── 5 Main Action Hub Cards ── -->
      <div style="margin-bottom:30px">
        <div style="font-size:12px;font-weight:800;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:14px">
          Pilihan Menu Rider
        </div>

        <div class="hub-actions-grid">

          <!-- Action 1: Cockpit HUD -->
          <div class="hub-action-card fade-in">
            <div class="hub-action-top">
              <div class="hub-action-header-row">
                <div class="hub-action-badge emerald">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <span class="hub-action-tag emerald">REKOMENDASI</span>
              </div>
              <div class="hub-action-title">Cockpit HUD</div>
              <p class="hub-action-desc">
                Layar speedometer handlebar, timer batas Cut-Off Time (COT), peringatan off-route, dan anti-layar mati.
              </p>
            </div>
            <a href="/rider/cockpit" data-link class="btn-hub-primary">
              <span>Buka Layar Kemudi →</span>
            </a>
          </div>

          <!-- Action 2: Pocket Tracker (In-Browser Background GPS) -->
          <div id="cardPocketTracker" class="hub-action-card fade-in">
            <div class="hub-action-top">
              <div class="hub-action-header-row">
                <div class="hub-action-badge sand">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <span class="hub-action-tag sand">LATAR BELAKANG</span>
              </div>
              <div class="hub-action-title">Lacak di Kantong</div>
              <p class="hub-action-desc">
                Lacak langsung dari browser tanpa aplikasi Traccar tambahan! Audio sunyi menjaga GPS tetap aktif saat HP dikunci di saku jersey.
              </p>
              <div id="setupPocketStatusBox" style="display:none;background:rgba(4,120,87,0.08);border:1px solid rgba(4,120,87,0.25);padding:8px 12px;border-radius:10px;font-size:11px;color:#047857;margin-top:10px">
                <span id="setupPocketDot">🟢</span> <strong>Melacak di Latar Belakang</strong>
                <div id="setupPocketDetail" style="margin-top:3px;font-size:10px;opacity:0.9">Terkirim: 0 titik • Akurasi: --m</div>
              </div>
            </div>
            <button id="btnTogglePocketSetup" class="btn-hub-secondary">
              Mulai Lacak di Kantong
            </button>
          </div>

          <!-- Action 3: Setup Traccar Instructions -->
          <div class="hub-action-card fade-in">
            <div class="hub-action-top">
              <div class="hub-action-header-row">
                <div class="hub-action-badge sage">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="3" ry="3"/>
                    <line x1="12" y1="18" x2="12.01" y2="18"/>
                  </svg>
                </div>
                <span class="hub-action-tag sage">HEMAT BATERAI</span>
              </div>
              <div class="hub-action-title">Setup Traccar</div>
              <p class="hub-action-desc">
                Panduan konfigurasi aplikasi resmi Traccar Client agar HP dapat dikantongi dengan layar mati & baterai hemat.
              </p>
            </div>
            <button id="btnScrollSetup" class="btn-hub-secondary">
              Lihat Parameter Setup ▾
            </button>
          </div>

          <!-- Action 4: Live Map -->
          <div class="hub-action-card fade-in">
            <div class="hub-action-top">
              <div class="hub-action-header-row">
                <div class="hub-action-badge sky">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                    <line x1="8" y1="2" x2="8" y2="18"/>
                    <line x1="16" y1="6" x2="16" y2="22"/>
                  </svg>
                </div>
                <span class="hub-action-tag sky">PENONTON</span>
              </div>
              <div class="hub-action-title">Live Map Event</div>
              <p class="hub-action-desc">
                Peta pelacakan langsung spectator untuk memantau rute dan posisi semua rider di lintasan.
              </p>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <a href="/watch/${event.id}" data-link class="btn-hub-secondary">
                Buka Live Map →
              </a>
              <button id="btnShareTrackingSetup" class="btn-hub-primary" style="font-size:12px;padding:10px">
                📲 Bagikan Link Tracking
              </button>
            </div>
          </div>

          <!-- Action 5: Download GPX Route -->
          <div class="hub-action-card fade-in">
            <div class="hub-action-top">
              <div class="hub-action-header-row">
                <div class="hub-action-badge earth">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </div>
                <span class="hub-action-tag earth">BIKE COMPUTER</span>
              </div>
              <div class="hub-action-title">File GPX Rute</div>
              <p class="hub-action-desc">
                Unduh file GPX rute event untuk disinkronkan ke bike computer (Garmin, Wahoo, Hammerhead).
              </p>
            </div>
            <a href="/api/events/${event.id}/gpx/download" download class="btn-hub-secondary">
              📥 Unduh GPX Rute
            </a>
          </div>

        </div>
      </div>

      <!-- ── Traccar Configuration Box Section ── -->
      <div id="traccarConfigSection" style="margin-bottom:34px">
        <div style="font-size:12px;font-weight:800;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px">
          ⚙️ Parameter Konfigurasi Traccar Client
        </div>

        <div class="setup-config-card fade-in">
          <div class="setup-config-header">
            <span class="setup-config-title">Konfigurasi HP Rider</span>
            <button id="btnCopyAll" class="btn-hub-secondary" style="width:auto;padding:5px 12px;font-size:11px;border-radius:10px">
              📋 Salin Semua
            </button>
          </div>

          <div class="config-row">
            <span class="config-label">Server URL</span>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="config-value">${osmandUrl}</span>
              <button class="copy-field-btn" data-copy="${osmandUrl}" title="Salin Server URL">📋</button>
            </div>
          </div>

          <div class="config-row">
            <span class="config-label">Device Identifier</span>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="config-value">${traccar.deviceIdentifier}</span>
              <button class="copy-field-btn" data-copy="${traccar.deviceIdentifier}" title="Salin Device Identifier">📋</button>
            </div>
          </div>

          <div class="config-row">
            <span class="config-label">Interval (detik)</span>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="config-value">${traccar.interval}</span>
              <button class="copy-field-btn" data-copy="${traccar.interval}" title="Salin Interval">📋</button>
            </div>
          </div>

          <div class="config-row">
            <span class="config-label">Accuracy</span>
            <span class="config-value">High</span>
          </div>
        </div>

        <!-- ── 4 Step Activation Guide Card ── -->
        <div class="setup-steps-container-card fade-in">
          <div class="steps-card-header">
            <div class="steps-header-left">
              <span class="steps-mono-tag">// PANDUAN AKTIVASI SAKU JERSEY</span>
              <h3 class="steps-card-title">4 Langkah Pengaturan GPS</h3>
            </div>
            <span class="steps-protocol-badge">OSMAND 5055</span>
          </div>

          <div class="steps-list-body">
            <!-- Step 1 -->
            <div class="step-row-item">
              <div class="step-badge-num">01</div>
              <div class="step-content-col">
                <div class="step-item-title">Install Aplikasi Traccar Client</div>
                <div class="step-item-desc">Unduh gratis di smartphone Anda melalui store resmi sebelum memulai rute:</div>
                <div class="step-store-buttons">
                  <a href="https://play.google.com/store/apps/details?id=org.traccar.client" target="_blank" rel="noopener" class="btn-store-chip">
                    🤖 Google Play Store
                  </a>
                  <a href="https://apps.apple.com/app/traccar-client/id898772423" target="_blank" rel="noopener" class="btn-store-chip">
                    🍎 Apple App Store
                  </a>
                </div>
              </div>
            </div>

            <!-- Step 2 -->
            <div class="step-row-item">
              <div class="step-badge-num">02</div>
              <div class="step-content-col">
                <div class="step-item-title">Buka Traccar → Masuk ke Pengaturan (⚙️)</div>
                <div class="step-item-desc">
                  Salin dan tempelkan <strong>Server URL</strong> dan <strong>Device Identifier</strong> dari kotak konfigurasi di atas ke dalam kolom aplikasi.
                </div>
              </div>
            </div>

            <!-- Step 3 -->
            <div class="step-row-item">
              <div class="step-badge-num">03</div>
              <div class="step-content-col">
                <div class="step-item-title">Aktifkan Saklar Service Status (▶ Start)</div>
                <div class="step-item-desc">
                  Traccar Client akan mulai mengirimkan koordinat GPS Anda secara otomatis ke server CycloPon secara real-time.
                </div>
              </div>
            </div>

            <!-- Step 4 -->
            <div class="step-row-item step-completed-row">
              <div class="step-badge-num step-badge-done">04</div>
              <div class="step-content-col">
                <div class="step-item-title">Siap Gowes! Layar HP Bisa Dimatikan 🎉</div>
                <div class="step-item-desc">
                  Pelacakan tetap aktif di background walau HP dikantongi di jersey. Atau pasang di handlebar dan gunakan <strong>Cockpit HUD</strong>!
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Emergency SOS Container Card ── -->
      <div class="rider-sos-container-card fade-in">
        <div class="sos-card-header">
          <div class="sos-header-left">
            <span class="sos-mono-tag">// SAFETY PROTOCOL · EVACUATION &amp; MEDICAL</span>
            <h3 class="sos-card-title">Pusat Bantuan &amp; Keselamatan Rider</h3>
          </div>
          <span class="sos-priority-badge">PRIORITY LEVEL 1</span>
        </div>
        <p class="sos-card-desc">
          Jika Anda mengalami kecelakaan, cedera fisik, atau kendala mekanikal berat di tengah rute dan membutuhkan evakuasi panitia segera:
        </p>
        <button id="btnOpenSosModal" class="btn-sos-emergency-trigger">
          <span class="sos-pulse-dot"></span>
          <span>🚨 KIRIM SINYAL DARURAT (SOS)</span>
          <span class="sos-arrow">→</span>
        </button>
      </div>

    </div>

    <!-- SOS Modal Container -->
    <div id="sosModalOverlay" class="sos-modal-overlay" style="display:none">
      <div class="sos-modal-content">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:22px">🚨</span>
            <h3 style="font-size:17px;font-weight:800;color:#EF4444;margin:0">Kirim Sinyal SOS Darurat</h3>
          </div>
          <button id="btnCloseSosModal" style="background:none;border:none;color:var(--text-secondary);font-size:20px;cursor:pointer">✕</button>
        </div>
        <p style="font-size:12px;color:var(--text-secondary);margin-bottom:14px">
          Pemberitahuan darurat ini akan langsung dibroadcast ke panitia, tim medis, dan ditampilkan di layar Live Map utama.
        </p>

        <label style="font-size:12px;font-weight:700;color:var(--text-primary);display:block;margin-bottom:6px">Pilih Jenis Situasi:</label>
        <div class="sos-type-grid">
          <button type="button" class="sos-type-btn active" data-type="MEDICAL">
            <strong>🚑 Medis / Cedera</strong>
            <small>Kram parah / pusing / luka</small>
          </button>
          <button type="button" class="sos-type-btn" data-type="CRASH">
            <strong>💥 Tabrakan / Jatuh</strong>
            <small>Butuh penanganan ambulans</small>
          </button>
          <button type="button" class="sos-type-btn" data-type="MECHANICAL">
            <strong>🚲 Kerusakan Sepeda</strong>
            <small>Patah rantai / frame / roda</small>
          </button>
          <button type="button" class="sos-type-btn" data-type="EVACUATION">
            <strong>⚠️ Evakuasi DNF</strong>
            <small>Tidak bisa lanjut gowes</small>
          </button>
        </div>

        <div style="margin-top:12px;margin-bottom:16px">
          <label style="font-size:12px;font-weight:700;color:var(--text-primary);display:block;margin-bottom:6px">Catatan Tambahan (Opsional):</label>
          <input type="text" id="sosMessageInput" placeholder="Contoh: Turunan setelah jembatan KM 45"
                 style="width:100%;padding:10px 12px;background:#FFFFFF;border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-size:13px">
        </div>

        <div style="display:flex;gap:10px">
          <button type="button" id="btnCancelSos" class="btn btn-outline" style="flex:1;padding:12px">Batal</button>
          <button type="button" id="btnSubmitSos" class="btn" style="flex:2;background:#EF4444;color:#FFF;font-weight:800;padding:12px;box-shadow:0 0 15px rgba(239,68,68,0.5)">
            🚨 KIRIM SEKARANG
          </button>
        </div>
      </div>
    </div>
  `;

  // ── Logout rider ──
  document.getElementById('btnRiderLogout').addEventListener('click', () => {
    if (confirm('Keluar dari sesi rider?')) {
      sessionStorage.removeItem('riderConfig');
      localStorage.removeItem('riderConfig');
      showToast('Berhasil logout rider.', 'info');
      Router.navigate('/rider');
    }
  });

  // Scroll to setup
  document.getElementById('btnScrollSetup').addEventListener('click', () => {
    const el = document.getElementById('traccarConfigSection');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  });

  // ── Share Live Tracking Link ──
  const btnShareSetup = document.getElementById('btnShareTrackingSetup');
  if (btnShareSetup) {
    btnShareSetup.addEventListener('click', async () => {
      const shareUrl = `${window.location.origin}/watch/${event.id}?bib=${encodeURIComponent(rider.bib)}`;
      const shareText = `🚴 Pantau posisi gowes saya (${rider.name} - BIB #${rider.bib}) secara langsung di ${event.name} via CycloPon Live Map:\n${shareUrl}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: `Live Tracking ${rider.name} - CycloPon`,
            text: shareText,
            url: shareUrl
          });
          showToast('Tautan pelacakan berhasil dibagikan!', 'success');
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          showToast('✓ Tautan Live Tracking disalin ke clipboard!', 'success');
        } catch {
          prompt('Salin link tracking ini:', shareUrl);
        }
      } else {
        prompt('Salin link tracking ini:', shareUrl);
      }
    });
  }

  // Copy individual fields
  document.querySelectorAll('.copy-field-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
        showToast(`Tersalin: ${text} ✓`, 'success');
      } catch {
        showToast('Gagal menyalin.', 'error');
      }
    });
  });

  // Copy all configuration as clean text
  document.getElementById('btnCopyAll').addEventListener('click', async () => {
    const allText = `Server URL: ${osmandUrl}\nDevice Identifier: ${traccar.deviceIdentifier}\nFrequency: ${traccar.interval} detik\nAccuracy: High`;
    try {
      await navigator.clipboard.writeText(allText);
      showToast('Semua konfigurasi berhasil disalin! ✓', 'success');
    } catch {
      showToast('Gagal menyalin.', 'error');
    }
  });

  // ── Pocket Tracker (Background GPS Keep-Alive) in Setup Hub ──
  const btnTogglePocket = document.getElementById('btnTogglePocketSetup');
  const statusBox = document.getElementById('setupPocketStatusBox');
  const statusDetail = document.getElementById('setupPocketDetail');
  const cardPocket = document.getElementById('cardPocketTracker');

  function updateSetupPocketUI(isActive, status = null) {
    if (isActive) {
      btnTogglePocket.textContent = '⏹️ Hentikan Lacak di Kantong';
      btnTogglePocket.className = 'btn btn-primary';
      btnTogglePocket.style.background = '#059669';
      btnTogglePocket.style.borderColor = '#059669';
      statusBox.style.display = 'block';
      if (cardPocket) cardPocket.style.borderColor = '#059669';
      if (status) {
        const acc = status.accuracy ? `±${Math.round(status.accuracy)}m` : 'Mencari...';
        statusDetail.textContent = `Terkirim: ${status.pointsSent} titik • Akurasi: ${acc} • Jarak: ${(status.distanceKm || 0).toFixed(1)} km`;
      }
    } else {
      btnTogglePocket.textContent = 'Mulai Lacak di Kantong';
      btnTogglePocket.className = 'btn btn-outline';
      btnTogglePocket.style.background = '';
      btnTogglePocket.style.borderColor = '';
      statusBox.style.display = 'none';
      if (cardPocket) cardPocket.style.borderColor = '';
    }
  }

  // Sync state if already active
  if (window.GpsKeeper && GpsKeeper.isActive()) {
    updateSetupPocketUI(true, GpsKeeper.getStatus());
  }

  btnTogglePocket?.addEventListener('click', async () => {
    if (window.GpsKeeper && GpsKeeper.isActive()) {
      GpsKeeper.stop();
      updateSetupPocketUI(false);
      showToast('🎒 Pelacakan di kantong dihentikan.', 'info');
    } else if (window.GpsKeeper) {
      updateSetupPocketUI(true);
      showToast('🎒 Mode Kantong Aktif! HP dapat dikunci di kantong jersey.', 'success');
      await GpsKeeper.start({
        rider,
        event,
        traccar: config.traccar,
        onStatus: (status) => {
          updateSetupPocketUI(true, status);
        }
      });
    } else {
      showToast('Modul GPS Keeper sedang dimuat...', 'info');
    }
  });

  // ── SOS Modal Logic ──
  const modalOverlay = document.getElementById('sosModalOverlay');
  const btnOpenSos   = document.getElementById('btnOpenSosModal');
  const btnCloseSos  = document.getElementById('btnCloseSosModal');
  const btnCancelSos = document.getElementById('btnCancelSos');
  const btnSubmitSos = document.getElementById('btnSubmitSos');
  let selectedType   = 'MEDICAL';

  btnOpenSos.addEventListener('click', () => {
    modalOverlay.style.display = 'flex';
  });

  function closeSosModal() {
    modalOverlay.style.display = 'none';
  }

  btnCloseSos.addEventListener('click', closeSosModal);
  btnCancelSos.addEventListener('click', closeSosModal);

  document.querySelectorAll('.sos-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sos-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedType = btn.dataset.type;
    });
  });

  btnSubmitSos.addEventListener('click', async () => {
    btnSubmitSos.disabled = true;
    btnSubmitSos.textContent = '⏳ Mengirim Sinyal GPS...';

    const message = document.getElementById('sosMessageInput').value.trim();

    let lat = null;
    let lng = null;

    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 10000
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (err) {
        console.warn('Geolocation warning/denied:', err);
      }
    }

    try {
      const res = await fetch(`/api/events/${event.id}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rider_id: rider.id,
          type: selectedType,
          latitude: lat,
          longitude: lng,
          message: message || `Bantuan darurat (${selectedType}) dari rider #${rider.bib}`
        })
      });

      if (!res.ok) throw new Error('Gagal mengirim sinyal darurat');

      closeSosModal();
      showToast('🚨 Sinyal SOS Darurat berhasil dikirim ke panitia!', 'success');

      btnOpenSos.innerHTML = '<span>✅</span><span>SINYAL SOS AKTIF (PANITIA TERNOTIFIKASI)</span>';
      btnOpenSos.style.background = '#10B981';
      btnOpenSos.style.animation = 'none';
    } catch (err) {
      showToast(err.message || 'Gagal mengirim SOS', 'error');
      btnSubmitSos.disabled = false;
      btnSubmitSos.textContent = '🚨 KIRIM SEKARANG';
    }
  });
}
