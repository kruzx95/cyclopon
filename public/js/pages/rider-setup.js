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
        <h1 style="font-size:20px;font-weight:700">Setup Traccar Client</h1>
      </div>

      <!-- Success banner -->
      <div class="fade-in" style="background:rgba(63,185,80,0.1);border:1px solid var(--color-green);border-radius:var(--radius-md);padding:14px 18px;margin-bottom:20px">
        <p style="color:var(--color-green);font-weight:700;font-size:14px">✅ Login berhasil!</p>
        <p style="font-size:13px;margin-top:4px;color:var(--text-secondary)">
          Halo <strong style="color:var(--text-primary)">${rider.name}</strong>
          &nbsp;(BIB <strong style="color:${rider.color}">#${rider.bib}</strong>)
          &nbsp;— Event: <strong style="color:var(--text-primary)">${event.name}</strong>
        </p>
      </div>

      <p style="color:var(--text-secondary);font-size:14px;line-height:1.6;margin-bottom:20px">
        Ikuti langkah di bawah untuk mengaktifkan live tracking.
        Setelah selesai, <strong>layar HP bisa dimatikan</strong> — tracking tetap berjalan otomatis.
      </p>

      <!-- Config box -->
      <div class="setup-config-box fade-in" style="margin-bottom:24px">
        <div class="setup-config-header">Konfigurasi Traccar Client</div>
        <div class="config-row">
          <span class="config-label">Server URL</span>
          <span class="config-value">${osmandUrl}</span>
        </div>
        <div class="config-row">
          <span class="config-label">Device Identifier</span>
          <span class="config-value">${traccar.deviceIdentifier}</span>
        </div>
        <div class="config-row">
          <span class="config-label">Interval (detik)</span>
          <span class="config-value">${traccar.interval}</span>
        </div>
        <div class="config-row">
          <span class="config-label">Accuracy</span>
          <span class="config-value">High</span>
        </div>
      </div>

      <!-- Steps -->
      <h2 style="font-size:15px;font-weight:700;margin-bottom:14px">Langkah-langkah:</h2>

      <div class="setup-step fade-in">
        <div class="step-number">1</div>
        <div>
          <p style="font-weight:600;margin-bottom:6px">Install Traccar Client</p>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">
            Download aplikasi gratis dari toko aplikasi di HP Anda:
          </p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <a href="https://play.google.com/store/apps/details?id=org.traccar.client" target="_blank" rel="noopener"
               class="btn btn-outline" style="font-size:12px;padding:8px 14px">
              🤖 Play Store (Android)
            </a>
            <a href="https://apps.apple.com/app/traccar-client/id898772423" target="_blank" rel="noopener"
               class="btn btn-outline" style="font-size:12px;padding:8px 14px">
              🍎 App Store (iOS)
            </a>
          </div>
        </div>
      </div>

      <div class="setup-step fade-in">
        <div class="step-number">2</div>
        <div>
          <p style="font-weight:600;margin-bottom:6px">Buka Traccar Client → Pengaturan (⚙️)</p>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">Isi field berikut sesuai konfigurasi di atas:</p>
          <ul style="font-size:13px;color:var(--text-secondary);padding-left:16px;line-height:2.2">
            <li><strong style="color:var(--text-primary)">Device Identifier:</strong>
              <code style="color:var(--color-yellow);background:rgba(255,230,0,0.1);border:1px solid rgba(255,230,0,0.25);padding:1px 8px;border-radius:4px">${traccar.deviceIdentifier}</code>
            </li>
            <li><strong style="color:var(--text-primary)">Server URL:</strong>
              <code style="color:var(--color-yellow);background:rgba(255,230,0,0.1);border:1px solid rgba(255,230,0,0.25);padding:1px 8px;border-radius:4px">${osmandUrl}</code>
            </li>
            <li><strong style="color:var(--text-primary)">Frequency:</strong>
              <code style="color:var(--color-yellow);background:rgba(255,230,0,0.1);border:1px solid rgba(255,230,0,0.25);padding:1px 8px;border-radius:4px">${traccar.interval} detik</code>
            </li>
            <li><strong style="color:var(--text-primary)">Accuracy:</strong>
              <code style="color:var(--color-yellow);background:rgba(255,230,0,0.1);border:1px solid rgba(255,230,0,0.25);padding:1px 8px;border-radius:4px">High</code>
            </li>
          </ul>
        </div>
      </div>

      <div class="setup-step fade-in">
        <div class="step-number">3</div>
        <div>
          <p style="font-weight:600;margin-bottom:4px">Tekan tombol <span style="color:var(--color-green)">▶ Start</span></p>
          <p style="font-size:13px;color:var(--text-secondary)">
            Tunggu sampai status berubah jadi <span style="color:var(--color-green);font-weight:700">Online</span>.
            Posisi Anda akan langsung muncul di peta.
          </p>
        </div>
      </div>

      <div class="setup-step fade-in" style="border-color:rgba(255,230,0,0.3);background:rgba(255,230,0,0.03)">
        <div class="step-number" style="background:var(--color-green);color:#080A0F">4</div>
        <div>
          <p style="font-weight:600;margin-bottom:4px">Matikan layar — tracking tetap jalan! 🎉</p>
          <p style="font-size:13px;color:var(--text-secondary)">
            Traccar Client berjalan sebagai background service.
            Posisi dikirim setiap <strong>${traccar.interval} detik</strong> meski layar mati.
          </p>
        </div>
      </div>

      <!-- CTA -->
      <div style="margin-top:28px;text-align:center;padding-bottom:32px">
        <a class="btn btn-primary fade-in" style="font-size:15px;padding:16px 36px"
           href="/watch/${event.id}" data-link>
          🗺️ &nbsp;Lihat Live Map Event
        </a>
      </div>
    </div>
  `;
}
