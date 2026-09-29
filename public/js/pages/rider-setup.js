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

      <!-- CTA -->
      <div style="margin-top:28px;text-align:center;padding-bottom:32px">
        <a class="btn btn-primary fade-in" style="font-size:15px;padding:16px 36px"
           href="/watch/${event.id}" data-link>
          🗺️ &nbsp;Lihat Posisi di Live Map
        </a>
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
}
