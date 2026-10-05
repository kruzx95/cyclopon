/* ── Admin Notifications Page ── */
async function renderAdminNotifications() {
  loadCss('/css/admin.css');

  // Route guard: check if admin is logged in
  if (!sessionStorage.getItem('adminUser')) {
    Router.navigate('/admin');
    return;
  }

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="admin-layout">
      ${adminSidebar('notifications')}
      <main class="admin-content">
        <div class="page-header">
          <div>
            <h1>📢 Pengaturan Notifikasi Panitia</h1>
            <p style="color:var(--text-secondary);font-size:13px;margin-top:4px">
              Kirimkan peringatan darurat SOS dan status Over Cut-Off Time (COT) secara instan ke grup Telegram atau Webhook.
            </p>
          </div>
          <div>
            <button class="btn btn-outline" onclick="Router.navigate('/admin/dashboard')" style="font-size:13px;padding:8px 14px">
              ← Kembali ke Dashboard
            </button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:minmax(0, 1fr) 340px;gap:24px;align-items:start">
          <!-- Main Form Card -->
          <div class="card">
            <h2 style="font-size:16px;font-weight:700;margin-bottom:20px;display:flex;align-items:center;gap:8px">
              <span>✈️</span> Konfigurasi Telegram Bot & Webhook
            </h2>

            <form id="notifForm">
              <!-- Telegram Section -->
              <div style="background:rgba(242,132,47,0.06);border:1px solid rgba(242,132,47,0.25);border-radius:var(--radius-md);padding:16px;margin-bottom:20px">
                <h3 style="font-size:14px;color:var(--color-orange);margin-bottom:12px;display:flex;align-items:center;gap:6px">
                  <span>🤖</span> Telegram Bot Panitia
                </h3>

                <div class="form-group" style="margin-bottom:14px">
                  <label for="tgToken" style="display:flex;justify-content:space-between">
                    <span>Bot Token API</span>
                    <span id="tokenStatusBadge" style="font-size:11px;color:var(--text-secondary)"></span>
                  </label>
                  <input class="input" type="text" id="tgToken" placeholder="Contoh: 7123456789:AAHkL..." autocomplete="off">
                  <small style="color:var(--text-secondary);font-size:11px;display:block;margin-top:4px">
                    Didapatkan dari <a href="https://t.me/BotFather" target="_blank" rel="noopener" style="color:var(--color-orange)">@BotFather</a> di Telegram.
                  </small>
                </div>

                <div class="form-group" style="margin-bottom:0">
                  <label for="tgChatId">Telegram Chat ID / Group ID</label>
                  <input class="input" type="text" id="tgChatId" placeholder="Contoh: -1001234567890 atau @nama_channel">
                  <small style="color:var(--text-secondary);font-size:11px;display:block;margin-top:4px">
                    ID pengguna atau grup panitia (grup biasanya diawali tanda minus <code>-</code> atau <code>-100</code>).
                  </small>
                </div>
              </div>

              <!-- Webhook Section -->
              <div style="background:rgba(69,91,138,0.18);border:1px solid rgba(69,91,138,0.35);border-radius:var(--radius-md);padding:16px;margin-bottom:20px">
                <h3 style="font-size:14px;color:var(--text-primary);margin-bottom:12px;display:flex;align-items:center;gap:6px">
                  <span>🔗</span> Generic Webhook (Discord / Slack / API)
                </h3>

                <div class="form-group" style="margin-bottom:0">
                  <label for="webhookUrl">Webhook URL</label>
                  <input class="input" type="url" id="webhookUrl" placeholder="https://discord.com/api/webhooks/... atau https://hooks.slack.com/...">
                  <small style="color:var(--text-secondary);font-size:11px;display:block;margin-top:4px">
                    Menerima payload JSON <code>cyclopon.sos_alert</code> & <code>cyclopon.over_cot</code>.
                  </small>
                </div>
              </div>

              <!-- Trigger Toggles -->
              <div style="margin-bottom:24px">
                <h3 style="font-size:14px;font-weight:700;margin-bottom:12px">Kondisi Pengiriman Otomatis</h3>
                <div style="display:flex;flex-direction:column;gap:10px">
                  <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px">
                    <input type="checkbox" id="chkSos" checked style="width:18px;height:18px;accent-color:var(--color-red)">
                    <span>🚨 <b>Kirim Peringatan SOS</b> (Kecelakaan, Medis, Kerusakan Sepeda, Evakuasi DNF)</span>
                  </label>
                  <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px">
                    <input type="checkbox" id="chkCot" checked style="width:18px;height:18px;accent-color:var(--color-orange)">
                    <span>⏱️ <b>Kirim Peringatan Over Cut-Off Time (COT)</b> saat rider melewati batas waktu pos</span>
                  </label>
                </div>
              </div>

              <!-- Action Buttons -->
              <div style="display:flex;gap:12px;flex-wrap:wrap">
                <button type="submit" id="btnSaveNotif" class="btn btn-primary" style="padding:12px 24px">
                  💾 Simpan Pengaturan
                </button>
                <button type="button" id="btnTestNotif" class="btn btn-outline" style="padding:12px 20px;border-color:var(--color-orange);color:var(--color-orange)">
                  ⚡ Kirim Pesan Uji Coba
                </button>
              </div>
            </form>

            <!-- Test Result Banner -->
            <div id="testResultBox" style="display:none;margin-top:20px;padding:14px;border-radius:var(--radius-sm);font-size:13px"></div>
          </div>

          <!-- Quick Guide Sidebar -->
          <div class="card" style="border-color:var(--border)">
            <h3 style="font-size:14px;font-weight:700;color:var(--color-orange);margin-bottom:14px;display:flex;align-items:center;gap:6px">
              <span>📖</span> Panduan Setup Telegram
            </h3>
            <ol style="margin-left:18px;font-size:12px;line-height:1.7;color:var(--text-secondary)">
              <li>Buka Telegram dan cari akun resmi <b style="color:var(--text-primary)">@BotFather</b>.</li>
              <li>Kirimkan perintah <code>/newbot</code> dan ikuti instruksi hingga mendapatkan <b>HTTP API Token</b>.</li>
              <li>Buat grup panitia (atau chat pribadi), lalu masukkan bot yang baru dibuat ke dalam grup tersebut.</li>
              <li>Jadikan bot sebagai <b>Administrator</b> di grup agar dapat mengirim pesan dengan lancar.</li>
              <li>Cari tahu Chat ID grup Anda menggunakan bot bantuan seperti <b style="color:var(--text-primary)">@userinfobot</b> atau <b style="color:var(--text-primary)">@getidsbot</b>.</li>
              <li>Salin Token & Chat ID ke formulir di samping, lalu klik <b>Simpan</b> dan <b>Kirim Pesan Uji Coba</b>!</li>
            </ol>

            <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);font-size:12px;color:var(--text-secondary)">
              💡 <i>Pengaturan ini otomatis tersimpan di database lokal SQLite dan dapat diisi juga melalui file <code>.env</code>.</i>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  // Fetch current settings
  try {
    const res = await fetch('/api/admin/notifications/settings');
    if (res.ok) {
      const data = await res.json();
      const tokenInput = document.getElementById('tgToken');
      const badge = document.getElementById('tokenStatusBadge');

      if (data.hasTelegramToken) {
        tokenInput.value = data.telegramTokenMasked;
        badge.innerHTML = '<span style="color:var(--color-green)">● Token Tersimpan</span>';
      } else {
        badge.innerHTML = '<span style="color:var(--text-secondary)">Belum dikonfigurasi</span>';
      }

      document.getElementById('tgChatId').value = data.telegramChatId || '';
      document.getElementById('webhookUrl').value = data.webhookUrl || '';
      document.getElementById('chkSos').checked = data.notifySos !== false;
      document.getElementById('chkCot').checked = data.notifyCot !== false;
    }
  } catch (err) {
    showToast('Gagal memuat pengaturan notifikasi: ' + err.message, 'error');
  }

  // Handle Save
  document.getElementById('notifForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSaveNotif');
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    const payload = {
      telegramToken:  document.getElementById('tgToken').value.trim(),
      telegramChatId: document.getElementById('tgChatId').value.trim(),
      webhookUrl:     document.getElementById('webhookUrl').value.trim(),
      notifySos:      document.getElementById('chkSos').checked,
      notifyCot:      document.getElementById('chkCot').checked
    };

    try {
      const res = await fetch('/api/admin/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Pengaturan notifikasi berhasil disimpan!', 'success');
        if (data.settings?.hasTelegramToken) {
          document.getElementById('tgToken').value = data.settings.telegramTokenMasked;
          document.getElementById('tokenStatusBadge').innerHTML = '<span style="color:var(--color-green)">● Token Tersimpan</span>';
        }
      } else {
        showToast(data.error || 'Gagal menyimpan', 'error');
      }
    } catch (err) {
      showToast('Gagal terhubung ke server', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Simpan Pengaturan';
    }
  });

  // Handle Test Send
  document.getElementById('btnTestNotif').addEventListener('click', async () => {
    const btn = document.getElementById('btnTestNotif');
    const resultBox = document.getElementById('testResultBox');
    btn.disabled = true;
    btn.textContent = '⚡ Mengirim Tes...';
    resultBox.style.display = 'none';

    const payload = {
      telegramToken:  document.getElementById('tgToken').value.trim(),
      telegramChatId: document.getElementById('tgChatId').value.trim(),
      webhookUrl:     document.getElementById('webhookUrl').value.trim()
    };

    try {
      const res = await fetch('/api/admin/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      let html = '';
      if (data.results?.telegram) {
        if (data.results.telegram.success) {
          html += `<div style="color:var(--color-green);margin-bottom:6px">✅ <b>Telegram:</b> Pesan uji coba berhasil terkirim ke chat ID!</div>`;
        } else {
          html += `<div style="color:var(--color-red);margin-bottom:6px">❌ <b>Telegram:</b> Gagal (${escapeHtml(data.results.telegram.error)})</div>`;
        }
      }
      if (data.results?.webhook) {
        if (data.results.webhook.success) {
          html += `<div style="color:var(--color-green)">✅ <b>Webhook:</b> Payload ping berhasil terkirim ke URL!</div>`;
        } else {
          html += `<div style="color:var(--color-red)">❌ <b>Webhook:</b> Gagal (${escapeHtml(data.results.webhook.error)})</div>`;
        }
      }

      resultBox.innerHTML = html;
      resultBox.style.display = 'block';
      resultBox.style.background = data.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
      resultBox.style.border = data.success ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)';

      if (data.success) {
        showToast('Pesan uji coba berhasil terkirim!', 'success');
      } else {
        showToast('Uji coba selesai dengan catatan.', 'info');
      }
    } catch (err) {
      showToast('Gagal menjalankan tes: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '⚡ Kirim Pesan Uji Coba';
    }
  });
}
