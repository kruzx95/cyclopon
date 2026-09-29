/* Admin sidebar helper — shared by dashboard and event pages */
function adminSidebar(activeKey) {
  return `
    <aside class="sidebar">
      <div class="sidebar-logo">
        <h2>🚴 CycloPon</h2>
        <small>Admin Panel</small>
      </div>
      <nav class="sidebar-nav">
        <a href="/admin/dashboard" data-link class="${activeKey === 'dashboard' ? 'active' : ''}">
          📊 &nbsp;Dashboard
        </a>
        <a href="/" data-link>🏠 &nbsp;Beranda</a>
      </nav>
    </aside>
  `;
}

/* ── Admin Login ── */
function renderAdminLogin() {
  loadCss('/css/admin.css');
  document.getElementById('app').innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(ellipse at top,rgba(0,229,255,0.05) 0%,transparent 50%)">
      <div class="card fade-in" style="width:100%;max-width:400px">
        <div style="text-align:center;margin-bottom:32px">
          <div style="font-size:48px">🚴</div>
          <h1 style="font-size:22px;font-weight:700;color:var(--color-cyan);margin-top:10px">CycloPon Admin</h1>
          <p style="color:var(--text-secondary);font-size:13px;margin-top:4px">Login dengan akun Traccar Server Anda</p>
        </div>
        <form id="adminLoginForm">
          <div class="form-group">
            <label for="adminEmail">Email</label>
            <input class="input" type="email" id="adminEmail" placeholder="admin@example.com" required autocomplete="username">
          </div>
          <div class="form-group">
            <label for="adminPassword">Password</label>
            <input class="input" type="password" id="adminPassword" placeholder="••••••••" required autocomplete="current-password">
          </div>
          <p id="loginError" style="color:var(--color-red);font-size:13px;margin-bottom:10px;min-height:18px"></p>
          <button class="btn btn-primary" type="submit" id="loginSubmit" style="width:100%;padding:14px;font-size:15px">
            Masuk ke Admin Panel
          </button>
        </form>
        <p style="text-align:center;margin-top:20px">
          <a href="/" data-link style="color:var(--text-secondary);font-size:13px;text-decoration:none">← Kembali ke beranda</a>
        </p>
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
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="admin-layout">
      ${adminSidebar('dashboard')}
      <main class="admin-content">
        <div class="page-header">
          <h1>Dashboard Event</h1>
          <button class="btn btn-primary" id="btnNewEvent">+ Event Baru</button>
        </div>
        <div class="events-grid" id="eventsGrid">
          <p style="color:var(--text-secondary)">Memuat data event...</p>
        </div>
      </main>
    </div>
  `;

  document.getElementById('btnNewEvent').addEventListener('click', () => Router.navigate('/admin/events/new'));

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
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
          <h3 style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ev.name}</h3>
          <span class="badge ${ev.active ? 'badge-green' : 'badge-orange'}">${ev.active ? 'Aktif' : 'Selesai'}</span>
        </div>
        <p class="event-meta">📅 ${ev.date} &nbsp;·&nbsp; ${ev.gpx_path ? '✅ GPX' : '⚠️ Belum ada GPX'}</p>
        <div class="event-actions">
          <button class="btn btn-outline" style="font-size:12px;padding:7px 14px"
                  onclick="Router.navigate('/admin/events/${ev.id}')">⚙️ Kelola</button>
          <a class="btn btn-outline" style="font-size:12px;padding:7px 14px"
             href="/watch/${ev.id}" target="_blank" rel="noopener">🗺️ Live Map</a>
        </div>
      </div>
    `).join('');
  } catch (err) {
    document.getElementById('eventsGrid').innerHTML =
      `<p style="color:var(--color-red)">Gagal memuat event: ${err.message}</p>`;
  }
}
