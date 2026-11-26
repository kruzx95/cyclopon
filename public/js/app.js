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
    await loadPageDeps(['/js/lib/gpx-utils.js', '/js/pages/landing.js?v=108']);
    renderLanding();
  });

  // ── Official Guide & Documentation (embedded tab inside /register) ──
  Router.register('/guide', () => Router.navigate('/register?tab=panduan'));

  Router.register('/panduan', () => Router.navigate('/register?tab=panduan'));

  // ── PWA Install Tutorial Page ──
  Router.register('/install', async () => {
    await loadPageDeps(['/js/pages/install.js?v=11'], ['/css/install.css?v=3']);
    renderInstallPage();
  });

  Router.register('/pwa', () => Router.navigate('/install'));

  // ── Ride Card Studio (event participant verification + server track/GPX -> PNG) ──
  Router.register('/share', async () => {
    await loadPageDeps(
      [
        '/js/lib/card-model.js?v=5',
        '/js/lib/card-map.js?v=2',
        '/js/lib/card-templates.js?v=3',
        '/js/lib/card-renderer.js?v=7',
        '/js/pages/share-card.js?v=16'
      ],
      ['/css/share.css?v=8']
    );
    renderSharePage();
  });

  // ── Public Event Registration & Rider Guide Tabs ──
  Router.register('/register', async (params) => {
    await loadPageDeps(
      ['/js/lib/utils.js', '/js/libs/qrcode.min.js', '/js/pages/guide.js?v=102', '/js/pages/register.js?v=100'],
      ['/css/register.css?v=91']
    );
    renderRegisterPage(params);
  });

  // ── ALA-ALA ULTRA 2027 Dedicated Registration Form ──
  Router.register('/ala-ala-ultra', async () => {
    await loadPageDeps(
      ['/js/lib/utils.js', '/js/pages/ala-ultra-register.js?v=6'],
      ['/css/ala-ultra.css?v=6']
    );
    renderAlaUltraRegisterPage();
  });

  Router.register('/ala2-ultra', () => Router.navigate('/ala-ala-ultra'));

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
        <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:16px">
          <img src="/icons/cyclopon-mark.svg" alt="" width="30" height="30" style="display:block;flex-shrink:0">
          <span style="font-family:'Barlow','Plus Jakarta Sans',system-ui,sans-serif;font-size:28px;font-weight:900;letter-spacing:-0.03em;color:#0D1117">CYCLOPON</span>
        </div>
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
    await loadPageDeps(['/js/pages/rider-login.js?v=86'], ['/css/rider.css?v=94']);
    renderRiderLogin();
  });

  Router.register('/rider/setup', async () => {
    await loadPageDeps(
      ['/js/lib/gps-keeper.js?v=2', '/js/libs/jsqr.min.js', '/js/lib/qr-scanner.js?v=4', '/js/pages/rider-setup.js?v=100'],
      ['/css/rider.css?v=96']
    );
    renderRiderSetup();
  });

  Router.register('/rider/cockpit', async () => {
    await loadPageDeps(
      ['/js/lib/gpx-utils.js', '/js/lib/utils.js', '/js/lib/gps-keeper.js?v=2', '/js/libs/jsqr.min.js', '/js/lib/qr-scanner.js?v=4', '/js/pages/rider-cockpit.js?v=103'],
      ['/css/cockpit.css?v=103', '/css/rider.css?v=96']
    );
    renderRiderCockpit();
  });

  Router.register('/cp/:token', async (params) => {
    await loadPageDeps(
      ['/js/lib/qr-scanner.js?v=4', '/js/pages/cp-checkin.js?v=4'],
      ['/css/rider.css?v=96']
    );
    renderCpCheckinPage(params);
  });

  Router.register('/cockpit', () => Router.navigate('/rider/cockpit'));

  // ── Live map (public) ──
  Router.register('/watch/:eventId', async (params) => {
    await loadPageDeps(
      ['/js/lib/gpx-utils.js', '/js/lib/utils.js', '/js/pages/live-map.js?v=92'],
      ['/css/map.css?v=90']
    );
    renderLiveMap(params);
  });

  // ── Event Activity & Rider Roster Page (Kuyy.app Style) ──
  Router.register('/events/:id', async (params) => {
    await loadPageDeps(
      ['/js/libs/qrcode.min.js', '/js/pages/event-activity.js?v=92'],
      ['/css/activity.css?v=90']
    );
    renderEventActivity(params);
  });

  Router.register('/activities/:id', async (params) => {
    await loadPageDeps(
      ['/js/libs/qrcode.min.js', '/js/pages/event-activity.js?v=92'],
      ['/css/activity.css?v=90']
    );
    renderEventActivity(params);
  });

  // ── Official Event Results & Brevet Certificate ──
  Router.register('/events/:id/results', async (params) => {
    await loadPageDeps(
      ['/js/lib/utils.js', '/js/pages/event-results.js?v=89'],
      ['/css/results.css?v=84']
    );
    renderEventResults(params);
  });

  // ── Admin panel ──
  Router.register('/admin', async () => {
    await loadPageDeps(
      ['/js/pages/admin-dashboard.js?v=91'],
      ['/css/admin.css?v=90']
    );
    renderAdminLogin();
  });

  Router.register('/admin/dashboard', async () => {
    await loadPageDeps(
      ['/js/pages/admin-dashboard.js?v=91'],
      ['/css/admin.css?v=90']
    );
    renderAdminDashboard();
  });

  Router.register('/admin/sos', async () => {
    await loadPageDeps(
      ['/js/pages/admin-dashboard.js?v=91', '/js/pages/admin-sos.js?v=84'],
      ['/css/admin.css?v=90']
    );
    renderAdminSos();
  });

  Router.register('/admin/event-reports', async (params) => {
    await loadPageDeps(
      ['/js/pages/admin-dashboard.js?v=91', '/js/pages/admin-event-reports.js?v=85'],
      ['/css/admin.css?v=90']
    );
    renderAdminEventReports(params);
  });

  Router.register('/admin/reports', async (params) => {
    Router.navigate('/admin/event-reports');
  });

  Router.register('/admin/logs', async (params) => {
    await loadPageDeps(
      ['/js/pages/admin-dashboard.js?v=91', '/js/pages/admin-logs.js?v=86'],
      ['/css/admin.css?v=90']
    );
    renderAdminLogs(params);
  });

  Router.register('/admin/events/:id', async (params) => {
    await loadPageDeps(
      ['/js/libs/qrcode.min.js', '/js/pages/admin-dashboard.js?v=91', '/js/pages/admin-event.js?v=90'],
      ['/css/admin.css?v=93']
    );
    renderAdminEvent(params);
  });

  Router.register('/admin/ala-ultra', async () => {
    await loadPageDeps(
      ['/js/pages/admin-dashboard.js?v=91', '/js/pages/admin-ala-ultra.js?v=7'],
      ['/css/admin.css?v=92']
    );
    renderAdminAlaUltra();
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
