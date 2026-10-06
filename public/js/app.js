/**
 * CycloPon App Entry Point
 * Registers all routes and initialises the SPA router.
 * Page scripts and CSS are loaded lazily on first navigation.
 */

async function loadPageDeps(scripts, cssList) {
  if (cssList) cssList.forEach(loadCss);
  if (scripts) await loadScripts(scripts);
}

document.addEventListener('DOMContentLoaded', () => {

  // ── Landing page ──
  Router.register('/', async () => {
    await loadPageDeps(['/js/pages/landing.js']);
    renderLanding();
  });

  // ── Rider flow ──
  Router.register('/r/:token', async (params) => {
    const token = params.token;
    if (!token) {
      Router.navigate('/rider');
      return;
    }
    document.getElementById('app').innerHTML = `
      <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px">
        <div style="font-size:56px;margin-bottom:16px">🚴‍♂️</div>
        <h2 style="font-size:20px;font-weight:800;color:var(--text-primary)">Menghubungkan Akun Rider...</h2>
        <p style="color:var(--text-secondary);font-size:14px;margin-top:6px">Memvalidasi akses Magic Link Anda</p>
      </div>
    `;
    try {
      const res = await fetch(`/api/auth/token/${encodeURIComponent(token)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem('riderConfig', JSON.stringify(data));
        localStorage.setItem('riderConfig', JSON.stringify(data));
        showToast(`Selamat datang, ${data.rider.name}!`, 'success');
        Router.navigate('/rider/setup');
      } else {
        showToast(data.error || 'Tautan Magic Link tidak valid.', 'error');
        Router.navigate('/rider');
      }
    } catch {
      showToast('Koneksi bermasalah saat login.', 'error');
      Router.navigate('/rider');
    }
  });

  Router.register('/rider', async () => {
    await loadPageDeps(['/js/pages/rider-login.js'], ['/css/rider.css']);
    renderRiderLogin();
  });

  Router.register('/rider/setup', async () => {
    await loadPageDeps(['/js/lib/gps-keeper.js', '/js/pages/rider-setup.js'], ['/css/rider.css']);
    renderRiderSetup();
  });

  Router.register('/rider/cockpit', async () => {
    await loadPageDeps(
      ['/js/lib/gpx-utils.js', '/js/lib/utils.js', '/js/lib/gps-keeper.js', '/js/pages/rider-cockpit.js'],
      ['/css/cockpit.css']
    );
    renderRiderCockpit();
  });

  // ── Live map (public) ──
  Router.register('/watch/:eventId', async (params) => {
    await loadPageDeps(
      ['/js/lib/gpx-utils.js', '/js/lib/utils.js', '/js/pages/live-map.js'],
      ['/css/map.css']
    );
    renderLiveMap(params);
  });

  // ── Official Event Results & Brevet Certificate ──
  Router.register('/events/:id/results', async (params) => {
    await loadPageDeps(
      ['/js/lib/utils.js', '/js/pages/event-results.js'],
      ['/css/results.css']
    );
    renderEventResults(params);
  });

  // ── Admin panel ──
  Router.register('/admin', async () => {
    await loadPageDeps(
      ['/js/pages/admin-dashboard.js'],
      ['/css/admin.css']
    );
    renderAdminLogin();
  });

  Router.register('/admin/dashboard', async () => {
    await loadPageDeps(
      ['/js/pages/admin-dashboard.js'],
      ['/css/admin.css']
    );
    renderAdminDashboard();
  });

  Router.register('/admin/notifications', async () => {
    await loadPageDeps(
      ['/js/pages/admin-dashboard.js', '/js/pages/admin-notifications.js'],
      ['/css/admin.css']
    );
    renderAdminNotifications();
  });

  Router.register('/admin/events/:id', async (params) => {
    await loadPageDeps(
      ['/js/pages/admin-dashboard.js', '/js/pages/admin-event.js'],
      ['/css/admin.css']
    );
    renderAdminEvent(params);
  });

  // Init router (resolves current URL)
  Router.init();
});
