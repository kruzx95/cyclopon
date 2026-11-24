/**
 * CycloPon App Entry Point
 * Registers all routes and initialises the SPA router.
 * Page scripts and CSS are loaded lazily on first navigation.
 */

async function loadPageDeps(scripts, cssList) {
  if (cssList) cssList.forEach(loadCss);
  if (scripts) await loadScripts(scripts);
}

// Capture PWA native install prompt globally so /install can trigger it anytime
window.__deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__deferredInstallPrompt = e;
  window.dispatchEvent(new CustomEvent('cyclopon:pwa-prompt-ready'));
});

document.addEventListener('DOMContentLoaded', () => {

  // ── Landing page ──
  Router.register('/', async () => {
    await loadPageDeps(['/js/lib/gpx-utils.js', '/js/pages/landing.js?v=100']);
    renderLanding();
  });

  // ── Official Guide & Documentation Page ──
  Router.register('/guide', async () => {
    await loadPageDeps(['/js/pages/guide.js?v=96']);
    renderGuide();
  });

  Router.register('/panduan', () => Router.navigate('/guide'));

  // ── PWA Install Tutorial Page ──
  Router.register('/install', async () => {
    await loadPageDeps(['/js/pages/install.js?v=2'], ['/css/install.css?v=2']);
    renderInstallPage();
  });

  Router.register('/pwa', () => Router.navigate('/install'));

  // ── Activity Share Studio (GPX/TCX -> PNG card, parsed in the browser) ──
  Router.register('/share', async () => {
    await loadPageDeps(
      [
        '/js/lib/card-model.js',
        '/js/lib/card-map.js',
        '/js/lib/card-templates.js',
        '/js/lib/card-renderer.js',
        '/js/pages/share-card.js?v=4'
      ],
      ['/css/share.css?v=2']
    );
    renderSharePage();
  });

  // ── Public Event Registration ──
  Router.register('/register', async (params) => {
    await loadPageDeps(
      ['/js/lib/utils.js', '/js/libs/qrcode.min.js', '/js/pages/register.js?v=93'],
      ['/css/register.css?v=89']
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

  Router.register('/login', () => Router.navigate('/rider'));

  Router.register('/rider', async () => {
    await loadPageDeps(['/js/pages/rider-login.js?v=83'], ['/css/rider.css']);
    renderRiderLogin();
  });

  Router.register('/rider/setup', async () => {
    await loadPageDeps(['/js/lib/gps-keeper.js', '/js/pages/rider-setup.js?v=94'], ['/css/rider.css?v=93']);
    renderRiderSetup();
  });

  Router.register('/rider/cockpit', async () => {
    await loadPageDeps(
      ['/js/lib/gpx-utils.js', '/js/lib/utils.js', '/js/lib/gps-keeper.js', '/js/pages/rider-cockpit.js?v=102'],
      ['/css/cockpit.css?v=102']
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
      ['/js/libs/qrcode.min.js', '/js/pages/event-activity.js?v=89'],
      ['/css/activity.css?v=88']
    );
    renderEventActivity(params);
  });

  Router.register('/activities/:id', async (params) => {
    await loadPageDeps(
      ['/js/libs/qrcode.min.js', '/js/pages/event-activity.js?v=89'],
      ['/css/activity.css?v=88']
    );
    renderEventActivity(params);
  });

  // ── Official Event Results & Brevet Certificate ──
  Router.register('/events/:id/results', async (params) => {
    await loadPageDeps(
      ['/js/lib/utils.js', '/js/pages/event-results.js?v=84'],
      ['/css/results.css?v=83']
    );
    renderEventResults(params);
  });

  // ── Admin panel ──
  Router.register('/admin', async () => {
    await loadPageDeps(
      ['/js/pages/admin-dashboard.js?v=86'],
      ['/css/admin.css?v=83']
    );
    renderAdminLogin();
  });

  Router.register('/admin/dashboard', async () => {
    await loadPageDeps(
      ['/js/pages/admin-dashboard.js?v=86'],
      ['/css/admin.css?v=83']
    );
    renderAdminDashboard();
  });

  Router.register('/admin/sos', async () => {
    await loadPageDeps(
      ['/js/pages/admin-dashboard.js?v=86', '/js/pages/admin-sos.js?v=83'],
      ['/css/admin.css?v=83']
    );
    renderAdminSos();
  });

  Router.register('/admin/event-reports', async (params) => {
    await loadPageDeps(
      ['/js/pages/admin-dashboard.js?v=86', '/js/pages/admin-event-reports.js?v=83'],
      ['/css/admin.css?v=83']
    );
    renderAdminEventReports(params);
  });

  Router.register('/admin/reports', async (params) => {
    Router.navigate('/admin/event-reports');
  });

  Router.register('/admin/logs', async (params) => {
    await loadPageDeps(
      ['/js/pages/admin-dashboard.js?v=87', '/js/pages/admin-logs.js?v=85'],
      ['/css/admin.css?v=85']
    );
    renderAdminLogs(params);
  });

  Router.register('/admin/events/:id', async (params) => {
    await loadPageDeps(
      ['/js/libs/qrcode.min.js', '/js/pages/admin-dashboard.js?v=86', '/js/pages/admin-event.js?v=82'],
      ['/css/admin.css?v=80']
    );
    renderAdminEvent(params);
  });

  // Init router (resolves current URL)
  Router.init();

  // ── Global Mobile Navigation Drawer Controller ──
  function initMobileNav() {
    const drawer = document.getElementById('mobileNavDrawer');
    if (!drawer) return;

    function openDrawer() {
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.classList.add('mobile-drawer-open');
    }

    function closeDrawer() {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('mobile-drawer-open');
    }

    document.addEventListener('click', (e) => {
      const openBtn = e.target.closest('.mobile-menu-btn');
      if (openBtn) {
        e.preventDefault();
        openDrawer();
        return;
      }

      const closeTrigger = e.target.closest('.mobile-nav-close, .mobile-nav-backdrop, .mobile-nav-item');
      if (closeTrigger && drawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });

    window.addEventListener('popstate', closeDrawer);
  }
  initMobileNav();
});
