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
    <div style="max-width:760px;margin:0 auto;padding:24px 16px;min-height:100vh">

      <!-- Top Hub Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px">
        <div style="display:flex;align-items:center;gap:10px">
          <a href="/" data-link style="color:var(--text-secondary);font-size:20px;text-decoration:none" title="Beranda">🏠</a>
          <h1 style="font-size:18px;font-weight:800;color:var(--text-primary)">
            🚴 CycloPon <span style="color:var(--color-yellow)">Rider Hub</span>
          </h1>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="background:rgba(255,230,0,0.1);border:1px solid rgba(255,230,0,0.3);padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;color:var(--color-yellow)">
            BIB #${rider.bib}
          </span>
          <button id="btnRiderLogout" class="btn btn-outline" style="font-size:12px;padding:6px 12px;color:var(--color-red);border-color:rgba(239,68,68,0.35)">
            🚪 Keluar
          </button>
        </div>
      </div>

      <!-- Welcome Banner -->
      <div class="card fade-in" style="margin-bottom:24px;border-color:rgba(0,229,255,0.25);background:linear-gradient(135deg,rgba(0,229,255,0.06) 0%,rgba(13,17,23,0.9) 100%)">
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          <span style="width:20px;height:20px;border-radius:50%;background:${rider.color || '#00E5FF'};box-shadow:0 0 10px ${rider.color || '#00E5FF'};display:inline-block"></span>
          <div style="flex:1;min-width:200px">
            <h2 style="font-size:17px;font-weight:800;color:#FFF;margin-bottom:4px">
              Halo, ${rider.name}
            </h2>
            <p style="font-size:13px;color:var(--text-secondary)">
              Event: <strong style="color:var(--color-yellow)">${event.name}</strong> &nbsp;·&nbsp; Tanggal: ${event.date}
            </p>
          </div>
          <div>
            <span class="badge badge-cyan" style="font-size:11px">Device: ${traccar.deviceIdentifier}</span>
          </div>
        </div>
      </div>

      <!-- 3 Main Action Hub Cards -->
      <div style="margin-bottom:28px">
        <h2 style="font-size:14px;font-weight:800;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:14px">
          Pilihan Menu Rider
        </h2>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px">

          <!-- Action 1: Cockpit HUD -->
          <div class="card fade-in" style="display:flex;flex-direction:column;justify-content:space-between;border-color:rgba(255,230,0,0.3);background:rgba(255,230,0,0.03);padding:20px">
            <div>
              <div style="font-size:32px;margin-bottom:8px">🚴</div>
              <h3 style="font-size:16px;font-weight:800;color:var(--color-yellow);margin-bottom:6px">Cockpit HUD</h3>
              <p style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-bottom:16px">
                Layar speedometer besar di handlebar, timer batas Cut-Off Time (COT), peringatan off-route, dan anti-layar mati.
              </p>
            </div>
            <a href="/rider/cockpit" data-link class="btn btn-primary" style="font-size:13px;padding:12px;text-align:center;text-decoration:none">
              Buka Layar Kemudi →
            </a>
          </div>

          <!-- Action 2: Traccar Setup Instructions -->
          <div class="card fade-in" style="display:flex;flex-direction:column;justify-content:space-between;padding:20px">
            <div>
              <div style="font-size:32px;margin-bottom:8px">📱</div>
              <h3 style="font-size:16px;font-weight:800;color:var(--text-primary);margin-bottom:6px">Setup Traccar</h3>
              <p style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-bottom:16px">
                Panduan konfigurasi aplikasi pelacak GPS agar HP dapat dikantongi dengan layar mati & baterai hemat.
              </p>
            </div>
            <button id="btnScrollSetup" class="btn btn-outline" style="font-size:13px;padding:12px">
              Lihat Parameter Setup ▾
            </button>
          </div>

          <!-- Action 3: Live Map -->
          <div class="card fade-in" style="display:flex;flex-direction:column;justify-content:space-between;padding:20px">
            <div>
              <div style="font-size:32px;margin-bottom:8px">🗺️</div>
              <h3 style="font-size:16px;font-weight:800;color:var(--text-primary);margin-bottom:6px">Live Map Event</h3>
              <p style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-bottom:16px">
                Peta pelacakan langsung spectator untuk memantau rute dan posisi semua rider di lintasan.
              </p>
            </div>
            <a href="/watch/${event.id}" data-link class="btn btn-outline" style="font-size:13px;padding:12px;text-align:center;text-decoration:none">
              Buka Live Map →
            </a>
          </div>

        </div>
      </div>

      <!-- Traccar Configuration Box Section -->
      <div id="traccarConfigSection" style="margin-bottom:32px">
        <h2 style="font-size:14px;font-weight:800;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px">
          ⚙️ Parameter Konfigurasi Traccar Client
        </h2>

        <div class="setup-config-box fade-in" style="margin-bottom:20px">
          <div class="setup-config-header" style="display:flex;align-items:center;justify-content:space-between">
            <span>Konfigurasi HP Rider</span>
            <button id="btnCopyAll" class="btn btn-outline" style="font-size:11px;padding:4px 10px;border-radius:6px;border-color:rgba(255,230,0,0.35);color:var(--color-yellow)">
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

        <!-- 4 Step Guide -->
        <div class="setup-step fade-in">
          <div class="step-number">1</div>
          <div>
            <p style="font-weight:700;margin-bottom:4px">Install Aplikasi Traccar Client</p>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:10px">Download gratis di HP Anda:</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <a href="https://play.google.com/store/apps/details?id=org.traccar.client" target="_blank" rel="noopener" class="btn btn-outline" style="font-size:12px;padding:6px 12px">
                🤖 Google Play Store
              </a>
              <a href="https://apps.apple.com/app/traccar-client/id898772423" target="_blank" rel="noopener" class="btn btn-outline" style="font-size:12px;padding:6px 12px">
                🍎 Apple App Store
              </a>
            </div>
          </div>
        </div>

        <div class="setup-step fade-in">
          <div class="step-number">2</div>
          <div>
            <p style="font-weight:700;margin-bottom:4px">Buka Traccar Client → Masuk ke Pengaturan (⚙️)</p>
            <p style="font-size:13px;color:var(--text-secondary)">
              Paste <strong>Server URL</strong> dan <strong>Device Identifier</strong> di atas.
            </p>
          </div>
        </div>

        <div class="setup-step fade-in">
          <div class="step-number">3</div>
          <div>
            <p style="font-weight:700;margin-bottom:4px">Aktifkan Saklar <span style="color:var(--color-green)">Service status (▶ Start)</span></p>
            <p style="font-size:13px;color:var(--text-secondary)">
              Status akan mulai mengirimkan lokasi GPS Anda secara otomatis ke server CycloPon.
            </p>
          </div>
        </div>

        <div class="setup-step fade-in" style="border-color:rgba(16,185,129,0.3);background:rgba(16,185,129,0.03)">
          <div class="step-number" style="background:var(--color-green);color:#080A0F">4</div>
          <div>
            <p style="font-weight:800;color:#FFF;margin-bottom:4px">Siap Gowes! Layar HP Bisa Dimatikan 🎉</p>
            <p style="font-size:13px;color:var(--text-secondary);line-height:1.5">
              Pelacakan tetap aktif di background walau HP dikantongi. Atau pasang di handlebar dan buka <strong>Cockpit HUD</strong>!
            </p>
          </div>
        </div>
      </div>

      <!-- Emergency SOS Card -->
      <div class="rider-sos-card fade-in" style="margin-bottom:32px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-size:18px">🚨</span>
          <strong style="color:#EF4444;font-size:14px;letter-spacing:0.02em">Pusat Bantuan & Keselamatan Rider</strong>
        </div>
        <p style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-bottom:14px">
          Jika Anda mengalami kecelakaan, cedera fisik, atau masalah mekanikal berat di tengah rute dan butuh bantuan evakuasi segera:
        </p>
        <button id="btnOpenSosModal" class="btn-sos-emergency">
          <span>🚨</span>
          <span>KIRIM SINYAL DARURAT (SOS)</span>
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
                 style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:var(--radius-sm);color:#FFF;font-size:13px">
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
