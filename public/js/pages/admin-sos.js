/* ── Admin SOS Emergency Console ── */
async function renderAdminSos() {
  loadCss('/css/admin.css?v=88');

  // Route guard: check if admin is logged in
  const adminUser = sessionStorage.getItem('adminUser') || localStorage.getItem('adminUser');
  if (!adminUser) {
    Router.navigate('/admin');
    return;
  }
  if (!sessionStorage.getItem('adminUser')) sessionStorage.setItem('adminUser', adminUser);

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="admin-layout">
      ${adminSidebar('sos')}
      <main class="admin-content">
        <div class="page-header">
          <div class="page-header-title-col">
            <span class="page-header-tag">// EMERGENCY RESPONSE &middot; SOS CONSOLE</span>
            <h1>🚨 Pusat Peringatan SOS</h1>
            <p class="sos-page-subtitle">
              Pantau setiap sinyal darurat yang dikirim rider. Segera hubungi rider, buka lokasi terakhirnya, lalu tandai selesai setelah ditangani.
            </p>
          </div>
          <div class="sos-console-toolbar">
            <button class="btn btn-outline" id="sosRefreshBtn" title="Muat ulang data SOS">↻ Segarkan</button>
            <button class="btn btn-outline" id="sosMuteBtn" title="Heningkan atau bunyikan sirene">🔇 Heningkan Sirene</button>
            <button class="btn btn-primary btn-sos-notif" id="sosNotifBtn" title="Aktifkan notifikasi browser">🔔 Aktifkan Notifikasi SOS</button>
          </div>
        </div>

        <div class="sos-stats-grid">
          <div class="sos-stat-card is-alert">
            <div class="sos-stat-lbl">SOS Aktif</div>
            <div class="sos-stat-val" id="sosStatActive">0</div>
            <div class="sos-stat-sub">Menunggu penanganan panitia</div>
          </div>
          <div class="sos-stat-card">
            <div class="sos-stat-lbl">Event Terdampak</div>
            <div class="sos-stat-val" id="sosStatEvents">0</div>
            <div class="sos-stat-sub">Event dengan insiden aktif</div>
          </div>
          <div class="sos-stat-card">
            <div class="sos-stat-lbl">SOS Terlama</div>
            <div class="sos-stat-val" id="sosStatOldest">—</div>
            <div class="sos-stat-sub">Durasi sejak sinyal pertama</div>
          </div>
          <div class="sos-stat-card">
            <div class="sos-stat-lbl">Notifikasi Browser</div>
            <div class="sos-stat-val" id="sosStatNotif">—</div>
            <div class="sos-stat-sub">Status izin di perangkat ini</div>
          </div>
        </div>

        <section class="sos-console-section">
          <div class="sos-console-section-head">
            <h2>Insiden Aktif</h2>
            <input type="search" id="sosSearchInput" class="sos-console-search" placeholder="Cari BIB, nama rider, atau event...">
          </div>
          <div id="sosActiveList"></div>
        </section>

        <section class="sos-console-section">
          <div class="sos-console-section-head">
            <h2>Riwayat SOS Terakhir</h2>
            <span class="sos-console-hint" id="sosHistoryHint">Memuat riwayat...</span>
          </div>
          <div id="sosHistoryList"></div>
        </section>
      </main>
    </div>
  `;

  // ── Initialize Mobile Navigation Drawer ──
  if (typeof setupAdminDrawer === 'function') setupAdminDrawer();

  const activeListEl = document.getElementById('sosActiveList');
  const historyListEl = document.getElementById('sosHistoryList');
  const historyHintEl = document.getElementById('sosHistoryHint');
  const searchInput = document.getElementById('sosSearchInput');
  const muteBtn = document.getElementById('sosMuteBtn');
  const refreshBtn = document.getElementById('sosRefreshBtn');
  const notifBtn = document.getElementById('sosNotifBtn');

  let searchTerm = '';
  let historyAlerts = [];
  let elapsedTimer = null;
  let unsubscribe = null;

  // ── Helpers ──────────────────────────────────────────────────────────────
  function parseAlertDate(value) {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const withZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`;
    const date = new Date(withZone);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatClock(value) {
    const date = parseAlertDate(value);
    if (!date) return '-';
    try {
      return date.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return date.toLocaleString('id-ID');
    }
  }

  function timeAgo(value) {
    const date = parseAlertDate(value);
    if (!date) return '-';
    const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (diffSec < 60) return 'baru saja';
    const mins = Math.floor(diffSec / 60);
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hari lalu`;
  }

  function waLink(alert) {
    if (!alert.rider_phone) return '';
    const cleanPhone = String(alert.rider_phone).replace(/[^0-9]/g, '').replace(/^0/, '62');
    if (!cleanPhone) return '';
    const text = encodeURIComponent(
      `Halo ${alert.rider_name || 'Rider'}, kami Panitia Race Control ${alert.event_name || ''} menerima sinyal SOS Anda (${sosTypeLabel(alert.type)}: ${sosDisplayMessage(alert)}). Apakah Anda membutuhkan bantuan evakuasi/medis?`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  }

  function liveMapLink(alert) {
    if (!alert.event_id) return '';
    return alert.rider_bib
      ? `/watch/${alert.event_id}?bib=${encodeURIComponent(alert.rider_bib)}`
      : `/watch/${alert.event_id}`;
  }

  function gpsLink(alert) {
    if (alert.latitude == null || alert.longitude == null) return '';
    return `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`;
  }

  function gpsText(alert) {
    if (alert.latitude == null || alert.longitude == null) return 'Lokasi GPS tidak tersedia';
    return `${Number(alert.latitude).toFixed(5)}, ${Number(alert.longitude).toFixed(5)}`;
  }

  function matchesSearch(alert) {
    if (!searchTerm) return true;
    const haystack = [
      alert.rider_bib,
      alert.rider_name,
      alert.event_name,
      alert.message,
      alert.type
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(searchTerm);
  }

  // ── Rendering ────────────────────────────────────────────────────────────
  function renderStats(alerts) {
    const activeEl = document.getElementById('sosStatActive');
    const eventsEl = document.getElementById('sosStatEvents');
    const oldestEl = document.getElementById('sosStatOldest');
    const notifEl = document.getElementById('sosStatNotif');
    if (!activeEl || !eventsEl || !oldestEl || !notifEl) return;

    activeEl.textContent = String(alerts.length);

    const eventIds = new Set(alerts.map(a => a.event_id));
    eventsEl.textContent = String(eventIds.size);

    if (alerts.length === 0) {
      oldestEl.textContent = '—';
    } else {
      const oldest = alerts
        .map(a => parseAlertDate(a.created_at))
        .filter(Boolean)
        .sort((a, b) => a - b)[0];
      oldestEl.textContent = oldest ? timeAgo(oldest.toISOString()) : '—';
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      notifEl.textContent = 'TIDAK DIDUKUNG';
    } else if (Notification.permission === 'granted') {
      notifEl.textContent = 'AKTIF';
    } else if (Notification.permission === 'denied') {
      notifEl.textContent = 'DIBLOKIR';
    } else {
      notifEl.textContent = 'BELUM AKTIF';
    }
  }

  function renderActiveList(alerts) {
    if (!activeListEl) return;
    renderStats(alerts);

    if (alerts.length === 0) {
      activeListEl.innerHTML = `
        <div class="sos-empty-state">
          <div class="sos-empty-icon">✅</div>
          <div>
            <h3>Tidak ada SOS aktif</h3>
            <p>Semua sinyal darurat rider sudah ditangani. Halaman ini otomatis diperbarui setiap 3,5 detik.</p>
          </div>
        </div>
      `;
      return;
    }

    const visible = alerts.filter(matchesSearch);
    if (visible.length === 0) {
      activeListEl.innerHTML = `
        <div class="sos-empty-state">
          <div class="sos-empty-icon">🔎</div>
          <div>
            <h3>Tidak ada hasil</h3>
            <p>Tidak ada insiden yang cocok dengan pencarian "${escapeHtml(searchTerm)}".</p>
          </div>
        </div>
      `;
      return;
    }

    activeListEl.innerHTML = visible.map(alert => {
      const bib = alert.rider_bib ? `#${escapeHtml(alert.rider_bib)}` : '#-';
      const name = alert.rider_name ? escapeHtml(alert.rider_name) : 'Rider Tanpa Nama';
      const eventName = alert.event_name ? escapeHtml(alert.event_name) : 'Event tidak diketahui';
      const type = escapeHtml(sosTypeLabel(alert.type));
      const message = escapeHtml(sosDisplayMessage(alert));
      const phone = alert.rider_phone ? escapeHtml(alert.rider_phone) : 'Nomor tidak tersedia';
      const wa = waLink(alert);
      const map = liveMapLink(alert);
      const gps = gpsLink(alert);

      return `
        <article class="sos-console-item">
          <div class="sos-item-head">
            <span class="sos-item-type">${type}</span>
            <span class="sos-item-bib">${bib}</span>
            <strong class="sos-item-name">${name}</strong>
            <span class="sos-item-event">${eventName}</span>
            <span class="sos-item-time" title="${escapeHtml(formatClock(alert.created_at))}">
              ⏱ ${timeAgo(alert.created_at)} <span class="sos-item-clock">· ${escapeHtml(formatClock(alert.created_at))}</span>
            </span>
          </div>
          <p class="sos-item-message">${message}</p>
          <div class="sos-item-meta">
            <span>📞 ${phone}</span>
            <span>📍 ${escapeHtml(gpsText(alert))}</span>
          </div>
          <div class="sos-item-actions">
            ${wa ? `<a href="${wa}" target="_blank" rel="noopener" class="btn-sos-action wa">💬 Hubungi Rider</a>` : ''}
            ${map ? `<a href="${map}" target="_blank" rel="noopener" class="btn-sos-action map">🗺️ Live Map</a>` : ''}
            ${gps ? `<a href="${gps}" target="_blank" rel="noopener" class="btn-sos-action gps">📌 Lokasi GPS</a>` : ''}
            <button type="button" onclick="AdminSosMonitor.resolveAlert(${Number(alert.id)})" class="btn-sos-action resolve">✓ Tandai Selesai</button>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderHistory() {
    if (!historyListEl) return;

    if (!Array.isArray(historyAlerts) || historyAlerts.length === 0) {
      historyHintEl.textContent = 'Belum ada riwayat';
      historyListEl.innerHTML = `
        <div class="sos-empty-state is-compact">
          <div class="sos-empty-icon">🗂️</div>
          <div>
            <h3>Belum ada riwayat SOS</h3>
            <p>Riwayat akan muncul setelah rider pernah mengirim sinyal darurat.</p>
          </div>
        </div>
      `;
      return;
    }

    historyHintEl.textContent = `${historyAlerts.length} insiden terakhir`;

    historyListEl.innerHTML = `
      <div class="sos-history-list">
        ${historyAlerts.map(alert => {
          const resolved = Number(alert.resolved) === 1;
          const bib = alert.rider_bib ? `#${escapeHtml(alert.rider_bib)}` : '#-';
          const name = alert.rider_name ? escapeHtml(alert.rider_name) : 'Rider Tanpa Nama';
          const eventName = alert.event_name ? escapeHtml(alert.event_name) : 'Event tidak diketahui';
          const type = escapeHtml(sosTypeLabel(alert.type));
          const map = liveMapLink(alert);

          return `
            <div class="sos-history-row">
              <span class="sos-history-status ${resolved ? 'is-resolved' : 'is-active'}">
                ${resolved ? '✓ SELESAI' : '🚨 AKTIF'}
              </span>
              <span class="sos-history-bib">${bib}</span>
              <span class="sos-history-name">${name}</span>
              <span class="sos-history-event">${eventName}</span>
              <span class="sos-history-type">${type}</span>
              <span class="sos-history-time" title="${escapeHtml(formatClock(alert.created_at))}">
                ${escapeHtml(formatClock(alert.created_at))} · ${timeAgo(alert.created_at)}
              </span>
              ${map ? `<a href="${map}" target="_blank" rel="noopener" class="sos-history-link">🗺️ Peta</a>` : '<span></span>'}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function syncMuteButton() {
    if (!muteBtn || !window.AdminSosMonitor) return;
    muteBtn.textContent = window.AdminSosMonitor.isMuted
      ? '🔊 Bunyikan Sirene'
      : '🔇 Heningkan Sirene';
  }

  // ── Data loading ─────────────────────────────────────────────────────────
  async function loadHistory() {
    try {
      const res = await fetch('/api/admin/alerts/history?limit=30', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      historyAlerts = Array.isArray(data) ? data : (data.alerts || []);
      renderHistory();
    } catch (err) {
      if (historyHintEl) historyHintEl.textContent = 'Gagal memuat riwayat';
      if (historyListEl) {
        historyListEl.innerHTML = `
          <div class="sos-empty-state is-compact">
            <div class="sos-empty-icon">⚠️</div>
            <div>
              <h3>Riwayat tidak dapat dimuat</h3>
              <p>Periksa koneksi ke server lalu klik "Segarkan".</p>
            </div>
          </div>
        `;
      }
    }
  }

  // ── Events ───────────────────────────────────────────────────────────────
  searchInput?.addEventListener('input', (e) => {
    searchTerm = String(e.target.value || '').trim().toLowerCase();
    renderActiveList(window.AdminSosMonitor ? window.AdminSosMonitor.activeAlerts : []);
  });

  muteBtn?.addEventListener('click', () => {
    if (window.AdminSosMonitor) window.AdminSosMonitor.toggleMute();
    syncMuteButton();
  });

  refreshBtn?.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '⏳ Memuat...';
    try {
      if (window.AdminSosMonitor) await window.AdminSosMonitor.poll();
      await loadHistory();
      showToast('Data SOS diperbarui.', 'success');
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = '↻ Segarkan';
    }
  });

  notifBtn?.addEventListener('click', () => {
    if (window.AdminSosMonitor) window.AdminSosMonitor.requestNotificationPermission();
  });

  // ── Monitor subscription (single shared 3.5s poller) ─────────────────────
  if (window.AdminSosMonitor) {
    window.AdminSosMonitor.init();
    let lastActiveCount = -1;
    unsubscribe = window.AdminSosMonitor.subscribe((alerts) => {
      const list = alerts || [];
      renderActiveList(list);
      syncMuteButton();
      if (window.AdminSosMonitor.updateNotificationButtons) {
        window.AdminSosMonitor.updateNotificationButtons();
      }
      const count = list.length;
      if (lastActiveCount !== -1 && count !== lastActiveCount) {
        loadHistory();
      }
      lastActiveCount = count;
    });
    renderActiveList(window.AdminSosMonitor.activeAlerts || []);
    syncMuteButton();
  } else {
    renderActiveList([]);
  }

  // Keep relative timestamps ("x menit lalu") fresh
  elapsedTimer = setInterval(() => {
    if (window.AdminSosMonitor) {
      renderActiveList(window.AdminSosMonitor.activeAlerts || []);
    }
    renderHistory();
  }, 30000);

  await loadHistory();

  // ── Cleanup ──────────────────────────────────────────────────────────────
  if (typeof Router !== 'undefined' && typeof Router.onUnmount === 'function') {
    Router.onUnmount(() => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (elapsedTimer) {
        clearInterval(elapsedTimer);
        elapsedTimer = null;
      }
    });
  }
}
