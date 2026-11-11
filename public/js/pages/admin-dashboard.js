/* Admin sidebar helper — shared by dashboard and event pages */
function adminSidebar(activeKey) {
  let adminName = 'Admin';
  try {
    const userStr = sessionStorage.getItem('adminUser');
    if (userStr) {
      const u = JSON.parse(userStr);
      adminName = u.name || u.email || 'Admin';
    }
  } catch {}

  return `
    <!-- ── Mobile Top Bar (visible on mobile only) ── -->
    <div class="admin-mobile-topbar">
      <div style="display:flex;align-items:center;gap:8px">
        <img src="/icons/logo-emblem.svg" alt="CYCLOPON" width="24" height="24" style="border-radius:6px">
        <a href="/" data-link class="admin-mobile-brand">CYCLOPON</a>
        <span style="font-family:ui-monospace,monospace;font-size:10px;font-weight:900;background:#0D1117;color:#FFFFFF;padding:2px 6px;border-radius:4px;letter-spacing:0.04em">RC-OPS</span>
      </div>
      <button class="admin-hamburger" id="adminHamburger" aria-label="Buka menu navigasi" title="Menu Navigasi">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- ── Mobile Drawer Overlay ── -->
    <div class="admin-drawer-overlay" id="adminDrawerOverlay"></div>

    <!-- ── Mobile Slide-Out Drawer ── -->
    <div class="admin-drawer" id="adminDrawer">
      <div class="admin-drawer-header">
        <div style="display:flex;align-items:center;gap:8px">
          <img src="/icons/logo-emblem.svg" alt="CYCLOPON" width="24" height="24" style="border-radius:6px">
          <div>
            <span style="font-family:ui-monospace,monospace;font-size:9.5px;font-weight:800;color:#6B7280;display:block;letter-spacing:0.08em">// RACE CONTROL</span>
            <span class="admin-drawer-brand">CYCLOPON</span>
          </div>
        </div>
        <button class="admin-drawer-close" id="adminDrawerClose" aria-label="Tutup menu">✕</button>
      </div>
      <div class="admin-drawer-user">
        <span style="font-size:14px">🛡️</span>
        <span style="font-family:ui-monospace,monospace;font-size:12px;font-weight:800;color:#0D1117;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${adminName}</span>
      </div>
      <nav class="admin-drawer-nav">
        <a href="/admin/dashboard" data-link class="${activeKey === 'dashboard' ? 'active' : ''}">
          <span>📊</span> Dashboard
        </a>
        <a href="/admin/notifications" data-link class="${activeKey === 'notifications' ? 'active' : ''}">
          <span>📢</span> Notifikasi Panitia
        </a>
        <a href="/" data-link>
          <span>🏠</span> Beranda
        </a>
      </nav>
      <div class="admin-drawer-footer">
        <button onclick="logoutAdmin()" class="admin-drawer-logout">🚪 Keluar (Logout)</button>
      </div>
    </div>

    <!-- ── Desktop Sidebar ── -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <img src="/icons/logo-emblem.svg" alt="CYCLOPON" width="32" height="32" style="border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.3)">
          <div>
            <span class="sidebar-logo-tag" style="margin-bottom:2px">// RACE CONTROL</span>
            <h2 style="margin:0;font-size:18px">CYCLOPON</h2>
          </div>
        </div>
        <small>COMMISSAIRE PANEL</small>
      </div>
      <div class="sidebar-user">
        <div class="sidebar-user-avatar">🛡️</div>
        <div style="flex:1;min-width:0">
          <div style="font-family:ui-monospace,monospace;font-size:9.5px;color:#6B7280;font-weight:800;letter-spacing:0.04em">ACCREDITATION</div>
          <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#0D1117;font-weight:800;font-size:12.5px">${adminName}</div>
        </div>
      </div>
      <nav class="sidebar-nav">
        <a href="/admin/dashboard" data-link class="${activeKey === 'dashboard' ? 'active' : ''}" style="justify-content:space-between">
          <span style="display:flex;align-items:center;gap:8px">📊 Dashboard</span>
          <span class="sidebar-sos-badge" style="display:none">0 SOS</span>
        </a>
        <a href="/admin/notifications" data-link class="${activeKey === 'notifications' ? 'active' : ''}" style="justify-content:space-between">
          <span style="display:flex;align-items:center;gap:8px">📢 Notifikasi Panitia</span>
          <span class="sidebar-sos-badge" style="display:none">0 SOS</span>
        </a>
        <a href="/" data-link>🏠 &nbsp;Beranda</a>
      </nav>
      <div class="sidebar-footer">
        <button onclick="logoutAdmin()" class="btn-logout" aria-label="Keluar dari akun admin">
          🚪 Keluar (Logout)
        </button>
      </div>
    </aside>
  `;
}

/* ── Race Control Global SOS Monitor & Siren System ── */
const AdminSosMonitor = {
  intervalId: null,
  activeAlerts: [],
  isMuted: false,
  audioCtx: null,
  sirenOsc: null,
  sirenGain: null,
  sirenTimer: null,
  isSirenPlaying: false,
  knownAlertIds: new Set(),

  init() {
    if (!sessionStorage.getItem('adminUser')) {
      this.stop();
      return;
    }

    // Refresh immediately in case we changed routes
    this.updateBadges(this.activeAlerts.length);
    if (this.activeAlerts.length > 0) {
      this.renderBanner(this.activeAlerts);
      this.renderDashboardCard(this.activeAlerts);
    }

    if (this.intervalId) return;

    this.poll();
    this.intervalId = setInterval(() => this.poll(), 3500);

    // Audio gesture unlock
    if (!window._adminSosUserGestureAttached) {
      window._adminSosUserGestureAttached = true;
      const unlockAudio = () => {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
      };
      window.addEventListener('click', unlockAudio);
      window.addEventListener('keydown', unlockAudio);
    }
  },

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.stopSiren();
    this.hideBanner();
    this.updateBadges(0);
    this.activeAlerts = [];
    this.knownAlertIds.clear();
  },

  async poll() {
    if (!window.location.pathname.startsWith('/admin') || !sessionStorage.getItem('adminUser')) {
      this.stop();
      return;
    }
    try {
      const res = await fetch('/api/admin/alerts/active', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) this.stop();
        return;
      }
      const data = await res.json();
      const alerts = Array.isArray(data) ? data : (data.alerts || []);
      this.handleAlertsUpdate(alerts);
    } catch (e) {
      // transient network error, retry next tick
    }
  },

  handleAlertsUpdate(alerts) {
    const freshAlerts = alerts.filter(a => !this.knownAlertIds.has(a.id));
    this.activeAlerts = alerts;

    alerts.forEach(a => this.knownAlertIds.add(a.id));

    this.updateBadges(alerts.length);

    if (alerts.length > 0) {
      this.renderBanner(alerts);
      this.renderDashboardCard(alerts);

      if (freshAlerts.length > 0) {
        freshAlerts.forEach(a => {
          const riderLabel = a.rider_name ? `Rider #${a.rider_bib} (${a.rider_name})` : `Rider #${a.rider_bib || '?'}`;
          this.notifyDesktop(`🚨 SOS RACE CONTROL: ${riderLabel}`, `${a.event_name}: ${a.message || a.type}`);
        });

        if (!this.isMuted) {
          this.startSiren();
        }
      } else if (!this.isMuted && !this.isSirenPlaying) {
        this.startSiren();
      }
    } else {
      this.stopSiren();
      this.hideBanner();
      this.renderDashboardCard([]);
      this.knownAlertIds.clear();
    }
  },

  updateBadges(count) {
    const badges = document.querySelectorAll('.sidebar-sos-badge');
    badges.forEach(b => {
      if (count > 0) {
        b.textContent = `🚨 ${count} SOS`;
        b.style.display = 'inline-block';
      } else {
        b.style.display = 'none';
      }
    });
  },

  renderBanner(alerts) {
    const mainContent = document.querySelector('.admin-content');
    if (!mainContent) return;

    let bar = document.getElementById('adminGlobalSosBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'adminGlobalSosBar';
      bar.className = 'admin-global-sos-bar';
      mainContent.insertBefore(bar, mainContent.firstChild);
    } else {
      bar.style.display = 'flex';
    }

    const latest = alerts[0];
    const riderDisplay = latest.rider_name
      ? `BIB #${latest.rider_bib || '-'} &bull; ${escapeHtml(latest.rider_name)}`
      : `BIB #${latest.rider_bib || 'Rider'}`;
    const alertMsg = escapeHtml(latest.message || latest.type || 'Panggilan Darurat');
    const extraCount = alerts.length > 1 ? ` (+${alerts.length - 1} SOS lainnya)` : '';

    let waBtn = '';
    if (latest.rider_phone) {
      const cleanPhone = latest.rider_phone.replace(/[^0-9]/g, '').replace(/^0/, '62');
      const waText = encodeURIComponent(`Halo ${latest.rider_name || 'Rider'}, kami Panitia Race Control ${latest.event_name} menerima sinyal darurat SOS Anda (${latest.message || latest.type}). Apakah Anda memerlukan evakuasi/medis?`);
      waBtn = `
        <a href="https://wa.me/${cleanPhone}?text=${waText}" target="_blank" rel="noopener" class="btn-sos-action" style="background:#25D366;color:#FFFFFF">
          💬 WA Rider
        </a>
      `;
    }

    const mapUrl = latest.rider_bib
      ? `/watch/${latest.event_id}?bib=${encodeURIComponent(latest.rider_bib)}`
      : `/watch/${latest.event_id}`;

    bar.innerHTML = `
      <div class="sos-bar-content">
        <span class="sos-bar-badge">🚨 SOS RACE CONTROL</span>
        <div class="sos-bar-text">
          <strong>${riderDisplay} (${escapeHtml(latest.event_name)})</strong>:
          <span>${alertMsg}${extraCount}</span>
        </div>
      </div>
      <div class="sos-bar-actions">
        ${waBtn}
        <a href="${mapUrl}" target="_blank" rel="noopener" class="btn-sos-action map">
          🗺️ Buka Peta
        </a>
        <button onclick="AdminSosMonitor.resolveAlert(${latest.id})" class="btn-sos-action resolve">
          ✓ Selesaikan
        </button>
        <button onclick="AdminSosMonitor.toggleMute()" class="btn-sos-action mute">
          ${this.isMuted ? '🔊 Bunyikan' : '🔇 Heningkan'}
        </button>
      </div>
    `;
  },

  hideBanner() {
    const bar = document.getElementById('adminGlobalSosBar');
    if (bar) bar.style.display = 'none';
  },

  renderDashboardCard(alerts) {
    const container = document.getElementById('dashboardActiveAlertsContainer');
    if (!container) return;

    if (!alerts || alerts.length === 0) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    container.innerHTML = `
      <div class="dashboard-sos-card">
        <div class="dashboard-sos-header">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:24px;animation:pulse-red 1s infinite">🚨</span>
            <div>
              <h2 style="font-size:16px;font-weight:800;color:var(--color-red);margin:0">
                PERINGATAN SOS AKTIF (${alerts.length} Insiden Menunggu Penanganan)
              </h2>
              <small style="color:var(--text-secondary);font-size:12px">
                Rider membutuhkan pertolongan evakuasi, medis, atau mekanik dari panitia/marshal.
              </small>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <button onclick="AdminSosMonitor.toggleMute()" class="btn btn-outline" style="font-size:12px;padding:6px 12px;color:var(--color-red);border-color:rgba(239,68,68,0.4)">
              ${this.isMuted ? '🔊 Bunyikan Sirene' : '🔇 Heningkan Sirene'}
            </button>
          </div>
        </div>
        <div class="dashboard-sos-list">
          ${alerts.map(a => {
            const rName = a.rider_name ? `${escapeHtml(a.rider_name)}` : 'Rider Tanpa Nama';
            const rBib = a.rider_bib ? `#${escapeHtml(a.rider_bib)}` : '-';
            const phone = a.rider_phone ? escapeHtml(a.rider_phone) : '-';
            const mapUrl = a.rider_bib ? `/watch/${a.event_id}?bib=${encodeURIComponent(a.rider_bib)}` : `/watch/${a.event_id}`;
            let waBtn = '';
            if (a.rider_phone) {
              const cleanPhone = a.rider_phone.replace(/[^0-9]/g, '').replace(/^0/, '62');
              const waText = encodeURIComponent(`Halo ${a.rider_name || 'Rider'}, kami Panitia Race Control ${a.event_name} menerima sinyal SOS Anda (${a.message || a.type}).`);
              waBtn = `<a href="https://wa.me/${cleanPhone}?text=${waText}" target="_blank" rel="noopener" class="btn btn-outline" style="padding:6px 12px;font-size:12px;color:#25D366;border-color:rgba(37,211,102,0.4)">💬 WA Rider</a>`;
            }
            return `
              <div class="dashboard-sos-item">
                <div style="flex:1;min-width:0;width:100%">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
                    <span style="font-weight:900;color:var(--color-red);font-size:14px">${rBib}</span>
                    <strong style="color:var(--text-primary);font-size:14px">${rName}</strong>
                    <span style="background:rgba(239,68,68,0.12);color:var(--color-red);font-weight:800;font-size:11px;padding:2px 8px;border-radius:4px;border:1px solid rgba(239,68,68,0.25)">
                      ${escapeHtml(a.type || 'SOS')}
                    </span>
                    <span style="font-size:12px;color:var(--text-secondary)">· Event: <b>${escapeHtml(a.event_name)}</b></span>
                  </div>
                  <div style="font-size:13px;color:var(--text-primary);margin-bottom:6px">
                    <strong>Pesan:</strong> ${escapeHtml(a.message || '-')}
                  </div>
                  <div style="font-size:11px;color:var(--text-secondary);display:flex;gap:12px;flex-wrap:wrap">
                    <span>📞 Telp: ${phone}</span>
                    <span>📍 GPS: ${a.latitude ? a.latitude.toFixed(5) : '-'}, ${a.longitude ? a.longitude.toFixed(5) : '-'}</span>
                    <span>⏰ Waktu: ${a.created_at ? new Date(a.created_at).toLocaleTimeString('id-ID') : '-'}</span>
                  </div>
                </div>
                <div class="dashboard-sos-actions">
                  ${waBtn}
                  <a href="${mapUrl}" target="_blank" rel="noopener" class="btn btn-outline" style="padding:6px 12px;font-size:12px">🗺️ Live Map</a>
                  <button onclick="AdminSosMonitor.resolveAlert(${a.id})" class="btn btn-primary" style="padding:6px 14px;font-size:12px;background:#10B981;border-color:#10B981">✓ Tandai Selesai</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  async resolveAlert(alertId) {
    if (!confirm('Tandai peringatan darurat SOS ini sebagai SELESAI / TERTANGANI?')) return;
    try {
      const res = await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'PUT',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Peringatan SOS berhasil diselesaikan.', 'success');
        this.poll();
      } else {
        showToast(data.error || 'Gagal menyelesaikan SOS', 'error');
      }
    } catch (e) {
      showToast('Koneksi terputus saat menyelesaikan SOS', 'error');
    }
  },

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopSiren();
      showToast('Sirene darurat diheningkan.', 'info');
    } else {
      showToast('Sirene darurat diaktifkan kembali.', 'info');
      if (this.activeAlerts.length > 0) {
        this.startSiren();
      }
    }
    if (this.activeAlerts.length > 0) {
      this.renderBanner(this.activeAlerts);
      this.renderDashboardCard(this.activeAlerts);
    }
  },

  startSiren() {
    if (this.isMuted || this.isSirenPlaying) return;
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtxClass();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.sirenOsc = this.audioCtx.createOscillator();
      this.sirenGain = this.audioCtx.createGain();

      this.sirenOsc.type = 'sawtooth';
      this.sirenGain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);

      this.sirenOsc.frequency.setValueAtTime(960, this.audioCtx.currentTime);
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.audioCtx.destination);
      this.sirenOsc.start();
      this.isSirenPlaying = true;

      let isHi = true;
      this.sirenTimer = setInterval(() => {
        if (!this.isSirenPlaying || !this.audioCtx) return;
        const t = this.audioCtx.currentTime;
        if (isHi) {
          this.sirenOsc.frequency.setValueAtTime(770, t);
          isHi = false;
        } else {
          this.sirenOsc.frequency.setValueAtTime(960, t);
          isHi = true;
        }
      }, 400);
    } catch (e) {
      console.warn('[AdminSosMonitor] Web Audio siren error:', e);
    }
  },

  stopSiren() {
    if (this.sirenTimer) {
      clearInterval(this.sirenTimer);
      this.sirenTimer = null;
    }
    if (this.sirenOsc) {
      try {
        this.sirenOsc.stop();
        this.sirenOsc.disconnect();
      } catch {}
      this.sirenOsc = null;
    }
    if (this.sirenGain) {
      try {
        this.sirenGain.disconnect();
      } catch {}
      this.sirenGain = null;
    }
    this.isSirenPlaying = false;
  },

  playTestAlarm() {
    this.isMuted = false;
    this.startSiren();
    showToast('🔊 Sirene darurat panitia aktif selama 3 detik...', 'info');

    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            this.notifyDesktop('🚨 UJI COBA NOTIFIKASI PANITIA', 'Sistem Peringatan Darurat CycloPon berfungsi sempurna!');
          }
        });
      } else if (Notification.permission === 'granted') {
        this.notifyDesktop('🚨 UJI COBA NOTIFIKASI PANITIA', 'Sistem Peringatan Darurat CycloPon berfungsi sempurna!');
      }
    }

    setTimeout(() => {
      if (this.activeAlerts.length === 0) {
        this.stopSiren();
      }
    }, 3000);
  },

  notifyDesktop(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/icons/icon-192.png',
          tag: 'cyclopon-sos-alert',
          requireInteraction: true
        });
      } catch {}
    }
  }
};
window.AdminSosMonitor = AdminSosMonitor;

function logoutAdmin() {
  if (confirm('Keluar dari Admin Panel?')) {
    if (window.AdminSosMonitor) window.AdminSosMonitor.stop();
    sessionStorage.removeItem('adminUser');
    localStorage.removeItem('adminUser');
    showToast('Berhasil logout dari Admin.', 'info');
    Router.navigate('/admin');
  }
}
window.logoutAdmin = logoutAdmin;

/* ── Admin Login ── */
function renderAdminLogin() {
  loadCss('/css/admin.css');

  // If already logged in, redirect directly to dashboard
  if (sessionStorage.getItem('adminUser')) {
    Router.navigate('/admin/dashboard');
    return;
  }

  document.getElementById('app').innerHTML = `
    <div class="admin-login-wrapper">
      <div class="admin-login-card fade-in">
        <!-- Top Nav -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <a href="/" data-link style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:6px;background:#FFFFFF;border:1.5px solid #0D1117;font-size:11.5px;font-weight:800;color:#0D1117;text-decoration:none;transition:all 0.15s ease">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>BERANDA</span>
          </a>
          <span class="login-pass-badge">
            🛡️ RACE CONTROL HQ
          </span>
        </div>

        <!-- Header Center -->
        <div style="margin-bottom:22px">
          <span class="login-pass-tag">// COMMISSAIRE ACCREDITATION PASS</span>
          <h1 style="font-size:22px;font-weight:900;color:#0D1117;letter-spacing:-0.03em;line-height:1.2;text-transform:uppercase;margin:4px 0">Akses Administrator</h1>
          <p style="font-size:13px;color:#4B5563;margin:0">Masuk ke panel Race Control &amp; Manajemen Event</p>
        </div>

        <form id="adminLoginForm">
          <div style="margin-bottom:14px">
            <label for="adminEmail" style="display:block;font-family:ui-monospace,monospace;font-size:11px;font-weight:800;color:#6B7280;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:6px">USERNAME / EMAIL</label>
            <div class="admin-input-group">
              <span class="admin-input-icon">👤</span>
              <input class="admin-input-field" type="text" id="adminEmail" placeholder="admin atau email" value="admin" required autocomplete="username">
            </div>
          </div>
          <div style="margin-bottom:16px">
            <label for="adminPassword" style="display:block;font-family:ui-monospace,monospace;font-size:11px;font-weight:800;color:#6B7280;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:6px">PASSWORD</label>
            <div class="admin-input-group">
              <span class="admin-input-icon">🔒</span>
              <input class="admin-input-field" type="password" id="adminPassword" placeholder="••••••••" value="admin" required autocomplete="current-password">
            </div>
          </div>

          <div class="admin-dev-box">
            💡 <strong>Mode Dev:</strong> user <code>admin</code>, pass <code>admin</code>
          </div>

          <p id="loginError" style="color:#DC2626;font-size:13px;margin-bottom:10px;min-height:18px;text-align:center;font-weight:700"></p>

          <button class="btn btn-primary" type="submit" id="loginSubmit" style="width:100%;padding:13px;font-size:13.5px;letter-spacing:0.04em">
            MASUK KE ADMIN PANEL →
          </button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('adminLoginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email    = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    const errEl    = document.getElementById('loginError');
    const btn      = document.getElementById('loginSubmit');
    errEl.textContent = '';
    btn.textContent = 'Masuk...';
    btn.disabled = true;

    try {
      const res  = await fetch('/api/auth/admin/login', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ email, password }),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem('adminUser', JSON.stringify(data.user));
        localStorage.setItem('adminUser', JSON.stringify(data.user));
        Router.navigate('/admin/dashboard');
      } else {
        errEl.textContent = data.error || 'Login gagal.';
        btn.textContent = 'Masuk ke Admin Panel';
        btn.disabled = false;
      }
    } catch {
      errEl.textContent = 'Tidak dapat terhubung ke server.';
      btn.textContent = 'Masuk ke Admin Panel';
      btn.disabled = false;
    }
  });
}

/* ── Admin Dashboard ── */
async function renderAdminDashboard() {
  loadCss('/css/admin.css');

  // Route guard: check if admin is logged in
  if (!sessionStorage.getItem('adminUser')) {
    Router.navigate('/admin');
    return;
  }
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="admin-layout">
      ${adminSidebar('dashboard')}
      <main class="admin-content">
        <div class="page-header">
          <div class="page-header-title-col">
            <span class="page-header-tag">// RACE CONTROL HQ · TELEMETRY OVERVIEW</span>
            <h1>Dashboard Event</h1>
          </div>
          <button class="btn btn-primary" id="btnNewEvent">+ Event Baru</button>
        </div>

        <!-- Dedicated Emergency SOS Incident Card for Race Control -->
        <div id="dashboardActiveAlertsContainer" style="display:none;margin-bottom:24px"></div>

        <!-- Real-Time Visitor & Spectator Traffic Analytics -->
        <div class="traffic-analytics-card" id="trafficAnalyticsCard">
          <div class="traffic-card-header">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:20px">📊</span>
              <div>
                <h2 style="font-size:15px;font-weight:900;color:#0D1117;text-transform:uppercase;letter-spacing:-0.02em;margin:0">Analitik Trafik Pengunjung &amp; Penonton Live</h2>
                <small style="font-size:11px;color:#6B7280;font-weight:600">Data real-time dari koneksi penonton dan log kunjungan web</small>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="live-pulse-dot" id="trafficLivePulse"></span>
              <span id="trafficLiveBadge" style="font-family:ui-monospace,monospace;font-size:11px;font-weight:800;color:#047857">SINKRONISASI REALTIME...</span>
            </div>
          </div>
          <div class="traffic-metrics-grid">
            <div class="traffic-metric-item">
              <div class="traffic-metric-lbl">Penonton Live Sekarang</div>
              <div class="traffic-metric-val" id="metricLiveViewers">0</div>
              <div class="traffic-metric-sub">Koneksi WebSocket Aktif</div>
            </div>
            <div class="traffic-metric-item">
              <div class="traffic-metric-lbl">Puncak Serentak (Peak)</div>
              <div class="traffic-metric-val" id="metricPeakViewers">0</div>
              <div class="traffic-metric-sub">Rekor Penonton Bersamaan</div>
            </div>
            <div class="traffic-metric-item">
              <div class="traffic-metric-lbl">Pengunjung Unik Hari Ini</div>
              <div class="traffic-metric-val" id="metricTodayVisitors">0</div>
              <div class="traffic-metric-sub">Perangkat Unik Berbeda</div>
            </div>
            <div class="traffic-metric-item">
              <div class="traffic-metric-lbl">Total Tayangan Halaman</div>
              <div class="traffic-metric-val" id="metricTodayViews">0</div>
              <div class="traffic-metric-sub">Total Kunjungan Hari Ini</div>
            </div>
          </div>
          <div class="traffic-sub-bar" id="trafficSubBar" style="display:none">
            <div style="font-size:12px;color:#4B5563;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span>🔥</span> <strong>Halaman Terpopuler Hari Ini:</strong>
              <span id="trafficTopPagesList" style="color:#0D1117;font-weight:700">--</span>
            </div>
          </div>
        </div>

        <!-- Diagnostic Trial & VPS Pre-Deployment Report Widget -->
        <div class="diagnostic-report-card" id="diagnosticReportCard">
          <div class="diagnostic-card-header">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:22px">🔬</span>
              <div>
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-family:ui-monospace,monospace;font-size:10px;font-weight:900;color:#6B7280">// PRE-DEPLOYMENT TRIAL</span>
                  <span id="diagnosticStatusBadge" class="diagnostic-badge status-idle">MEMERIKSA LAPORAN...</span>
                </div>
                <h2 style="font-size:15px;font-weight:900;color:#0D1117;text-transform:uppercase;letter-spacing:-0.02em;margin:2px 0 0 0">
                  Hasil Uji Coba Lapangan &amp; Diagnostik VPS
                </h2>
              </div>
            </div>
            <div class="diagnostic-header-actions">
              <button id="btnRunDiagnostic" class="btn btn-outline" style="font-size:12px;padding:7px 13px;border-color:#0D1117;color:#0D1117;display:inline-flex;align-items:center;gap:6px" title="Jalankan simulasi uji beban telemetri, WebSocket, dan sistem darurat">
                <span id="btnRunDiagnosticIcon">🚀</span> <span id="btnRunDiagnosticLabel">Jalankan Uji Coba</span>
              </button>
              <button id="btnViewFullReport" class="btn btn-primary" style="font-size:12px;padding:7px 14px;display:inline-flex;align-items:center;gap:6px">
                <span>📄</span> <span>Baca Laporan Lengkap</span>
              </button>
            </div>
          </div>

          <div class="diagnostic-metrics-grid" id="diagnosticMetricsGrid">
            <div class="diagnostic-metric-item">
              <div class="diagnostic-metric-lbl">Kecepatan Tulis Telemetri</div>
              <div class="diagnostic-metric-val" id="diagMetricIngest">--</div>
              <div class="diagnostic-metric-sub" id="diagMetricIngestSub">Batch Ingestion SQLite WAL</div>
            </div>
            <div class="diagnostic-metric-item">
              <div class="diagnostic-metric-lbl">WebSocket Fan-Out Broadcast</div>
              <div class="diagnostic-metric-val" id="diagMetricWs">--</div>
              <div class="diagnostic-metric-sub" id="diagMetricWsSub">30 Penonton Simultan</div>
            </div>
            <div class="diagnostic-metric-item">
              <div class="diagnostic-metric-lbl">Pipa Darurat SOS</div>
              <div class="diagnostic-metric-val" id="diagMetricSos">--</div>
              <div class="diagnostic-metric-sub" id="diagMetricSosSub">Respon Asinkron Non-blocking</div>
            </div>
            <div class="diagnostic-metric-item">
              <div class="diagnostic-metric-lbl">Penggunaan Memori RAM</div>
              <div class="diagnostic-metric-val" id="diagMetricMemory">--</div>
              <div class="diagnostic-metric-sub" id="diagMetricMemorySub">Jejak Heap &amp; Delta RSS</div>
            </div>
          </div>

          <div class="diagnostic-footer-bar" id="diagnosticFooterBar">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:11.5px;color:#4B5563">
              <div>
                <span>🕒 <strong>Uji Terakhir:</strong> <span id="diagTestedAtText">Memeriksa riwayat...</span></span>
                <span style="margin:0 6px">·</span>
                <span>⏱️ <strong>Durasi:</strong> <span id="diagDurationText">-</span></span>
              </div>
              <div>
                <span>🖥️ <strong>Lingkungan:</strong> <span id="diagEnvText">Node.js · SQLite WAL Mode</span></span>
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-family:ui-monospace,monospace;font-size:11px;font-weight:900;color:#6B7280">// EVENT LIST</span>
            <h2 style="font-size:16px;font-weight:900;color:#0D1117;margin:0;text-transform:uppercase">Daftar Event Balapan</h2>
          </div>
        </div>

        <div class="events-grid" id="eventsGrid">
          <p style="color:#6B7280;font-weight:600">Memuat data event...</p>
        </div>
      </main>
    </div>
  `;

  document.getElementById('btnNewEvent').addEventListener('click', () => Router.navigate('/admin/events/new'));

  // ── Mobile Hamburger Drawer ──
  const hamburger = document.getElementById('adminHamburger');
  const drawer    = document.getElementById('adminDrawer');
  const overlay   = document.getElementById('adminDrawerOverlay');
  const closeBtn  = document.getElementById('adminDrawerClose');

  function openDrawer() {
    drawer.classList.add('open');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  if (hamburger) hamburger.addEventListener('click', openDrawer);
  if (closeBtn)  closeBtn.addEventListener('click', closeDrawer);
  if (overlay)   overlay.addEventListener('click', closeDrawer);

  // Close drawer when a nav link is clicked
  const drawerLinks = drawer ? drawer.querySelectorAll('a[data-link]') : [];
  drawerLinks.forEach(link => link.addEventListener('click', closeDrawer));

  // Initialize Race Control SOS Monitor
  AdminSosMonitor.init();

  // ── Real-Time Traffic Metrics Polling ──
  let trafficInterval = null;
  async function fetchTrafficMetrics() {
    try {
      const res = await fetch('/api/admin/metrics/traffic', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;

      const liveEl = document.getElementById('metricLiveViewers');
      const peakEl = document.getElementById('metricPeakViewers');
      const visitorsEl = document.getElementById('metricTodayVisitors');
      const viewsEl = document.getElementById('metricTodayViews');
      const badgeEl = document.getElementById('trafficLiveBadge');
      const subBar = document.getElementById('trafficSubBar');
      const topPagesEl = document.getElementById('trafficTopPagesList');

      if (liveEl) liveEl.textContent = Number(data.liveViewers || 0).toLocaleString();
      if (peakEl) peakEl.textContent = Number(data.peakViewers || 0).toLocaleString();
      if (visitorsEl) visitorsEl.textContent = Number(data.todayUniqueVisitors || 0).toLocaleString();
      if (viewsEl) viewsEl.textContent = Number(data.todayViews || 0).toLocaleString();

      if (badgeEl) {
        if (data.liveViewers > 0) {
          badgeEl.textContent = `${data.liveViewers} Penonton Online`;
          badgeEl.style.color = 'var(--color-sage)';
        } else {
          badgeEl.textContent = 'Standby (0 Live)';
          badgeEl.style.color = 'var(--text-secondary)';
        }
      }

      if (data.topPages && data.topPages.length && subBar && topPagesEl) {
        subBar.style.display = 'block';
        topPagesEl.innerHTML = data.topPages.map(p => `
          <span style="background:#FFFFFF;border:1px solid var(--border-subtle);padding:2px 8px;border-radius:4px;margin-right:6px">
            <code>${p.path}</code> (${p.views}x)
          </span>
        `).join('');
      }
    } catch (e) {
      console.warn('[Admin Dashboard] Gagal mengambil metrik trafik:', e);
    }
  }

  fetchTrafficMetrics();
  trafficInterval = setInterval(fetchTrafficMetrics, 5000);

  // ── Pre-Deployment Diagnostic Report Controller ──
  let cachedReportData = null;

  function renderDiagnosticMarkdown(md) {
    if (!md) return '<p>Tidak ada konten laporan.</p>';
    let text = escapeHtml(md);

    // Code blocks
    text = text.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headings
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Blockquotes
    text = text.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Horizontal rules
    text = text.replace(/^---$/gim, '<hr>');

    // Bold & Italic
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Markdown Tables
    text = text.replace(/((?:^\|.+?\|\r?\n)+)/gm, (match) => {
      const lines = match.trim().split('\n').filter(l => l.trim().startsWith('|'));
      if (lines.length < 2) return match;
      let tableHtml = '<table>';
      lines.forEach((line, idx) => {
        if (line.includes('---')) return;
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        if (idx === 0) {
          tableHtml += '<thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
        } else {
          tableHtml += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
        }
      });
      tableHtml += '</tbody></table>';
      return tableHtml;
    });

    // Lists
    text = text.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
    text = text.replace(/(<li>[\s\S]*?<\/li>)/gm, '<ul>$1</ul>');
    text = text.replace(/<\/ul>\s*<ul>/g, '');

    // Paragraphs
    return text.split('\n\n').map(p => {
      p = p.trim();
      if (!p) return '';
      if (p.startsWith('<h') || p.startsWith('<table') || p.startsWith('<pre') || p.startsWith('<blockquote') || p.startsWith('<ul') || p.startsWith('<hr')) {
        return p;
      }
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');
  }

  function openDiagnosticReportModal(markdown, parsed) {
    let modalOverlay = document.getElementById('diagnosticReportModalOverlay');
    if (modalOverlay) modalOverlay.remove();

    modalOverlay = document.createElement('div');
    modalOverlay.id = 'diagnosticReportModalOverlay';
    modalOverlay.className = 'report-modal-overlay';
    modalOverlay.innerHTML = `
      <div class="report-modal-card">
        <div class="report-modal-header">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:22px">📊</span>
            <div>
              <h3 style="font-size:16px;font-weight:900;color:#0D1117;margin:0">Laporan Diagnostik Kesiapan VPS</h3>
              <small style="font-size:11.5px;color:#6B7280;font-weight:600">${escapeHtml(parsed?.testedAt || 'Hasil Pengujian Terkini')}</small>
            </div>
          </div>
          <button id="btnCloseReportModal" style="background:transparent;border:none;font-size:20px;cursor:pointer;color:#6B7280;padding:4px 8px" title="Tutup">✕</button>
        </div>
        <div class="report-modal-body">
          ${renderDiagnosticMarkdown(markdown)}
        </div>
        <div class="report-modal-footer">
          <div style="font-size:12px;color:#6B7280">
            <span>Status: <strong>${escapeHtml(parsed?.verdict || 'SIAP')}</strong></span>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <button id="btnDownloadReportMd" class="btn btn-outline" style="font-size:12px;padding:7px 12px">📥 Unduh Berkas .md</button>
            <button id="btnCloseReportFooter" class="btn btn-primary" style="font-size:12px;padding:7px 14px">Tutup</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);
    document.body.style.overflow = 'hidden';

    const closeModal = () => {
      modalOverlay.remove();
      document.body.style.overflow = '';
    };

    document.getElementById('btnCloseReportModal').addEventListener('click', closeModal);
    document.getElementById('btnCloseReportFooter').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    document.getElementById('btnDownloadReportMd').addEventListener('click', () => {
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cyclopon-diagnostic-report-${new Date().toISOString().substring(0, 10)}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  async function fetchDiagnosticReport() {
    try {
      const res = await fetch('/api/admin/reports/latest', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;

      const badge = document.getElementById('diagnosticStatusBadge');
      const ingestVal = document.getElementById('diagMetricIngest');
      const wsVal = document.getElementById('diagMetricWs');
      const sosVal = document.getElementById('diagMetricSos');
      const memVal = document.getElementById('diagMetricMemory');
      const testedAt = document.getElementById('diagTestedAtText');
      const duration = document.getElementById('diagDurationText');
      const envText = document.getElementById('diagEnvText');

      if (!data.hasReport || !data.parsed) {
        if (badge) {
          badge.className = 'diagnostic-badge status-idle';
          badge.textContent = 'BELUM DIUJI';
        }
        if (testedAt) testedAt.textContent = 'Belum pernah dijalankan';
        return;
      }

      cachedReportData = data;
      const p = data.parsed;

      if (badge) {
        badge.className = `diagnostic-badge ${p.isReady ? 'status-ready' : 'status-warn'}`;
        badge.textContent = p.isReady ? '🟢 100% SIAP VPS' : '🟡 CATATAN PERBAIKAN';
      }

      if (ingestVal) ingestVal.textContent = p.metricsSummary?.ingest || '--';
      if (wsVal) wsVal.textContent = p.metricsSummary?.wsFanOut?.split(',')[0] || '--';
      if (sosVal) sosVal.textContent = p.metricsSummary?.sos || '--';
      if (memVal) memVal.textContent = p.metricsSummary?.memory?.split('(')[0]?.trim() || '--';

      if (testedAt) testedAt.textContent = p.testedAt || '-';
      if (duration) duration.textContent = p.duration || '-';
      if (envText && p.system) {
        envText.textContent = `${p.system.node} · ${p.system.os} · WAL [${p.system.walMode}]`;
      }
    } catch (e) {
      console.warn('[Admin Dashboard] Gagal mengambil laporan diagnostik:', e);
    }
  }

  fetchDiagnosticReport();

  // Run Diagnostic Trial Button
  const btnRun = document.getElementById('btnRunDiagnostic');
  const btnRunLabel = document.getElementById('btnRunDiagnosticLabel');
  const btnRunIcon = document.getElementById('btnRunDiagnosticIcon');

  if (btnRun) {
    btnRun.addEventListener('click', async () => {
      if (btnRun.disabled) return;
      btnRun.disabled = true;
      if (btnRunIcon) btnRunIcon.textContent = '⏳';
      if (btnRunLabel) btnRunLabel.textContent = 'Menjalankan Simulasi...';
      showToast('🚀 Memulai simulasi uji diagnostik sistem... Harap tunggu sebentar.', 'info');

      try {
        const res = await fetch('/api/admin/reports/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        const result = await res.json();
        if (res.ok && result.success) {
          showToast('✅ Uji diagnostik selesai! Laporan telah diperbarui.', 'success');
          await fetchDiagnosticReport();
        } else {
          showToast(result.error || 'Gagal menjalankan uji diagnostik.', 'error');
        }
      } catch (err) {
        showToast('Koneksi terputus saat menjalankan uji diagnostik.', 'error');
      } finally {
        btnRun.disabled = false;
        if (btnRunIcon) btnRunIcon.textContent = '🚀';
        if (btnRunLabel) btnRunLabel.textContent = 'Jalankan Uji Coba';
      }
    });
  }

  // View Full Report Modal Button
  const btnViewReport = document.getElementById('btnViewFullReport');
  if (btnViewReport) {
    btnViewReport.addEventListener('click', () => {
      if (!cachedReportData || !cachedReportData.markdown) {
        showToast('Belum ada laporan tersedia. Jalankan pengujian terlebih dahulu.', 'info');
        return;
      }
      openDiagnosticReportModal(cachedReportData.markdown, cachedReportData.parsed);
    });
  }

  window.addEventListener('popstate', () => {
    if (trafficInterval) clearInterval(trafficInterval);
  }, { once: true });

  try {
    const events = await fetch('/api/events', { credentials: 'include' }).then(r => r.json());
    const grid   = document.getElementById('eventsGrid');

    if (!Array.isArray(events) || !events.length) {
      grid.innerHTML = `
        <div class="card" style="text-align:center;padding:40px;grid-column:1/-1">
          <div style="font-size:48px;margin-bottom:12px">🏁</div>
          <p style="color:var(--text-secondary);margin-bottom:16px">Belum ada event. Buat event pertama Anda!</p>
          <button class="btn btn-primary" onclick="Router.navigate('/admin/events/new')">+ Buat Event</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = events.map(ev => `
      <div class="event-card">
        <div>
          <div class="event-card-header">
            <h3 title="${escapeHtml(ev.name)}">${escapeHtml(ev.name)}</h3>
            <span class="badge ${ev.active ? 'badge-active' : 'badge-finished'}">${ev.active ? '● AKTIF' : 'SELESAI'}</span>
          </div>
          <div class="event-meta">
            <div class="event-meta-row">
              <span>📅 Tanggal:</span>
              <strong style="color:#0D1117">${ev.date}</strong>
            </div>
            <div class="event-meta-row">
              <span>📍 Lintasan:</span>
              <strong style="color:${ev.gpx_path ? '#047857' : '#D97706'}">${ev.gpx_path ? '✅ GPX Terpasang' : '⚠️ Belum Ada GPX'}</strong>
            </div>
          </div>
        </div>
        <div class="event-actions">
          <button class="btn btn-primary" style="font-size:12px;padding:7px 14px"
                  onclick="Router.navigate('/admin/events/${ev.id}')">⚙️ Kelola Event</button>
          <a class="btn btn-outline" style="font-size:12px;padding:7px 14px"
             href="/watch/${ev.id}?admin=1" target="_blank" rel="noopener">🗺️ Live Map</a>
          <a class="btn btn-outline" style="font-size:12px;padding:7px 14px"
             href="/events/${ev.id}/results" target="_blank" rel="noopener">🏆 Hasil &amp; Brevet</a>
        </div>
      </div>
    `).join('');
  } catch (err) {
    document.getElementById('eventsGrid').innerHTML =
      `<p style="color:var(--color-red)">Gagal memuat event: ${err.message}</p>`;
  }
}
