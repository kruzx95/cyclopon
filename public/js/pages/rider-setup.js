function renderRiderSetup() {
  loadCss('/css/rider.css');

  const configStr = sessionStorage.getItem('riderConfig');
  if (!configStr) { Router.navigate('/rider'); return; }

  const { rider, event, traccar } = JSON.parse(configStr);
  const hostClean = traccar.serverUrl.replace(/^https?:\/\//, '').split(':')[0];
  const osmandUrl = `http://${hostClean}:${traccar.osmandPort}`;

  document.getElementById('app').innerHTML = `
    <div style="max-width:600px;margin:0 auto;padding:24px;min-height:100vh">

      <!-- Header -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <a href="/" data-link style="color:var(--text-secondary);font-size:22px;text-decoration:none;line-height:1">←</a>
        <h1 style="font-size:20px;font-weight:800">Setup Traccar Client</h1>
      </div>

      <!-- Success banner -->
      <div class="fade-in" style="background:rgba(16,185,129,0.1);border:1px solid var(--color-green);border-radius:var(--radius-md);padding:14px 18px;margin-bottom:20px">
        <p style="color:var(--color-green);font-weight:800;font-size:14px">✅ Login Berhasil!</p>
        <p style="font-size:13px;margin-top:4px;color:var(--text-secondary)">
          Halo <strong style="color:var(--text-primary)">${rider.name}</strong>
          &nbsp;(BIB <strong style="color:var(--color-yellow)">#${rider.bib}</strong>)
          &nbsp;— Event: <strong style="color:var(--text-primary)">${event.name}</strong>
        </p>
      </div>

      <p style="color:var(--text-secondary);font-size:14px;line-height:1.6;margin-bottom:20px">
        Ikuti 4 langkah cepat di bawah. Gunakan tombol <strong>📋 Salin</strong> agar tidak salah ketik di aplikasi Traccar.
        Setelah aktif, <strong>layar HP bisa dimatikan</strong> — pelacakan tetap berjalan otomatis.
      </p>

      <!-- Config box with Quick Copy -->
      <div class="setup-config-box fade-in" style="margin-bottom:24px">
        <div class="setup-config-header" style="display:flex;align-items:center;justify-content:space-between">
          <span>Konfigurasi Traccar Client</span>
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

      <!-- Steps -->
      <h2 style="font-size:15px;font-weight:800;margin-bottom:14px">Langkah-langkah di HP:</h2>

      <div class="setup-step fade-in">
        <div class="step-number">1</div>
        <div>
          <p style="font-weight:700;margin-bottom:6px">Install Aplikasi Traccar Client</p>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">
            Download gratis dari toko aplikasi resmi:
          </p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <a href="https://play.google.com/store/apps/details?id=org.traccar.client" target="_blank" rel="noopener"
               class="btn btn-outline" style="font-size:12px;padding:8px 14px">
              🤖 Google Play Store (Android)
            </a>
            <a href="https://apps.apple.com/app/traccar-client/id898772423" target="_blank" rel="noopener"
               class="btn btn-outline" style="font-size:12px;padding:8px 14px">
              🍎 Apple App Store (iPhone/iOS)
            </a>
          </div>
        </div>
      </div>

      <div class="setup-step fade-in">
        <div class="step-number">2</div>
        <div>
          <p style="font-weight:700;margin-bottom:6px">Buka Traccar Client → Masuk ke Pengaturan (⚙️)</p>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">Isi field berikut sesuai data konfigurasi di atas:</p>
          <ul style="font-size:13px;color:var(--text-secondary);padding-left:16px;line-height:2.2">
            <li><strong style="color:var(--text-primary)">Device Identifier:</strong>
              <code style="color:var(--color-yellow);background:rgba(255,230,0,0.1);border:1px solid rgba(255,230,0,0.25);padding:1px 8px;border-radius:4px">${traccar.deviceIdentifier}</code>
            </li>
            <li><strong style="color:var(--text-primary)">Server URL:</strong>
              <code style="color:var(--color-yellow);background:rgba(255,230,0,0.1);border:1px solid rgba(255,230,0,0.25);padding:1px 8px;border-radius:4px">${osmandUrl}</code>
            </li>
            <li><strong style="color:var(--text-primary)">Location accuracy:</strong>
              <code style="color:var(--color-yellow);background:rgba(255,230,0,0.1);border:1px solid rgba(255,230,0,0.25);padding:1px 8px;border-radius:4px">High</code>
            </li>
            <li><strong style="color:var(--text-primary)">Frequency:</strong>
              <code style="color:var(--color-yellow);background:rgba(255,230,0,0.1);border:1px solid rgba(255,230,0,0.25);padding:1px 8px;border-radius:4px">${traccar.interval} detik</code>
            </li>
          </ul>
        </div>
      </div>

      <div class="setup-step fade-in">
        <div class="step-number">3</div>
        <div>
          <p style="font-weight:700;margin-bottom:4px">Aktifkan Saklar <span style="color:var(--color-green)">Service status (▶ Start)</span></p>
          <p style="font-size:13px;color:var(--text-secondary)">
            Aktifkan tombol switch di layar utama Traccar. Status akan mulai mengirimkan lokasi GPS Anda ke server.
          </p>
        </div>
      </div>

      <div class="setup-step fade-in" style="border-color:rgba(255,230,0,0.35);background:rgba(255,230,0,0.03)">
        <div class="step-number" style="background:var(--color-green);color:#080A0F">4</div>
        <div>
          <p style="font-weight:800;color:#FFFFFF;margin-bottom:4px">Kunci / Matikan Layar HP Anda! 🎉</p>
          <p style="font-size:13px;color:var(--text-secondary);line-height:1.5">
            Traccar Client berjalan sebagai <em>background service resmi OS</em>.
            GPS tetap terkirim setiap <strong>${traccar.interval} detik</strong> dan sangat hemat baterai meskipun HP dikantongi.
          </p>
        </div>
      </div>

      <!-- Emergency SOS Card -->
      <div class="rider-sos-card fade-in">
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

      <!-- CTA -->
      <div style="margin-top:20px;text-align:center;padding-bottom:32px">
        <a class="btn btn-primary fade-in" style="font-size:15px;padding:16px 36px"
           href="/watch/${event.id}" data-link>
          🗺️ &nbsp;Lihat Posisi di Live Map
        </a>
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

  // Copy individual fields
  document.querySelectorAll('.copy-field-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
        showToast(`Tersalin: ${text} ✓`, 'success');
      } catch {
        showToast('Gagal menyalin otomatis. Silakan salin manual.', 'error');
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

    // Try to get instant coordinate via browser geolocation
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

      // Update SOS button state
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

