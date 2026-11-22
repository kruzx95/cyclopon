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
    await loadPageDeps(['/js/lib/gpx-utils.js', '/js/pages/landing.js?v=88']);
    renderLanding();
  });

  // ── Official Guide & Documentation Page ──
  Router.register('/guide', async () => {
    await loadPageDeps(['/js/pages/guide.js?v=91']);
    renderGuide();
  });

  Router.register('/panduan', () => Router.navigate('/guide'));

  // ── Public Event Registration ──
  Router.register('/register', async (params) => {
    await loadPageDeps(
      ['/js/lib/utils.js', '/js/libs/qrcode.min.js', '/js/pages/register.js?v=88'],
      ['/css/register.css?v=88']
    );
    renderRegisterPage(params);
  });

  Router.register('/daftar', () => Router.navigate('/register'));

  // ── Rider flow ──
  Router.register('/r/:token', async (params) => {
    const token = params.token;
    if (!token) {
      Router.navigate('/rider');
      return;
    }
    document.getElementById('app').innerHTML = `
      <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px">
        <div style="font-family:'Inter',system-ui,sans-serif;font-size:28px;font-weight:900;letter-spacing:-0.03em;color:#0D1117;margin-bottom:16px">CYCLOPON</div>
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
        if (data.event && data.event.access_pin) {
          sessionStorage.setItem('event_pin_' + data.event.id, data.event.access_pin);
        }
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
    await loadPageDeps(['/js/pages/rider-login.js?v=83'], ['/css/rider.css']);
    renderRiderLogin();
  });

  Router.register('/rider/setup', async () => {
    await loadPageDeps(['/js/lib/gps-keeper.js', '/js/pages/rider-setup.js?v=86'], ['/css/rider.css']);
    renderRiderSetup();
  });

  Router.register('/rider/cockpit', async () => {
    await loadPageDeps(
      ['/js/lib/gpx-utils.js', '/js/lib/utils.js', '/js/lib/gps-keeper.js', '/js/pages/rider-cockpit.js?v=94'],
      ['/css/cockpit.css?v=94']
    );
    renderRiderCockpit();
  });

  Router.register('/cockpit', () => Router.navigate('/rider/cockpit'));

  // ── Live map (public) ──
  Router.register('/watch/:eventId', async (params) => {
    await loadPageDeps(
      ['/js/lib/gpx-utils.js', '/js/lib/utils.js', '/js/pages/live-map.js?v=88'],
      ['/css/map.css?v=88']
    );
    renderLiveMap(params);
  });

  // ── Event Activity & Rider Roster Page (Kuyy.app Style) ──
  Router.register('/events/:id', async (params) => {
    await loadPageDeps(
      ['/js/libs/qrcode.min.js', '/js/pages/event-activity.js?v=88'],
      ['/css/activity.css?v=88']
    );
    renderEventActivity(params);
  });

  Router.register('/activities/:id', async (params) => {
    await loadPageDeps(
      ['/js/libs/qrcode.min.js', '/js/pages/event-activity.js?v=88'],
      ['/css/activity.css?v=88']
    );
    renderEventActivity(params);
  });

  // ── Official Event Results & Brevet Certificate ──
  Router.register('/events/:id/results', async (params) => {
    await loadPageDeps(
      ['/js/lib/utils.js', '/js/pages/event-results.js?v=83'],
      ['/css/results.css?v=83']
    );
    renderEventResults(params);
  });

  // ── Admin panel ──
  Router.register('/admin', async () => {
    await loadPageDeps(
      ['/js/pages/admin-dashboard.js?v=83'],
      ['/css/admin.css?v=83']
    );
    renderAdminLogin();
  });

  Router.register('/admin/dashboard', async () => {
    await loadPageDeps(
      ['/js/pages/admin-dashboard.js?v=83'],
      ['/css/admin.css?v=83']
    );
    renderAdminDashboard();
  });

  Router.register('/admin/sos', async () => {
    await loadPageDeps(
      ['/js/pages/admin-dashboard.js?v=83', '/js/pages/admin-sos.js?v=83'],
      ['/css/admin.css?v=83']
    );
    renderAdminSos();
  });

  Router.register('/admin/event-reports', async (params) => {
    await loadPageDeps(
      ['/js/pages/admin-dashboard.js?v=83', '/js/pages/admin-event-reports.js?v=83'],
      ['/css/admin.css?v=83']
    );
    renderAdminEventReports(params);
  });

  Router.register('/admin/reports', async (params) => {
    Router.navigate('/admin/event-reports');
  });

  Router.register('/admin/events/:id', async (params) => {
    await loadPageDeps(
      ['/js/libs/qrcode.min.js', '/js/pages/admin-dashboard.js', '/js/pages/admin-event.js?v=79'],
      ['/css/admin.css?v=79']
    );
    renderAdminEvent(params);
  });

  // Init router (resolves current URL)
  Router.init();
});
