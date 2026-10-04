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
  Router.register('/rider', async () => {
    await loadPageDeps(['/js/pages/rider-login.js'], ['/css/rider.css']);
    renderRiderLogin();
  });

  Router.register('/rider/setup', async () => {
    await loadPageDeps(['/js/pages/rider-setup.js'], ['/css/rider.css']);
    renderRiderSetup();
  });

  Router.register('/rider/cockpit', async () => {
    await loadPageDeps(
      ['/js/lib/gpx-utils.js', '/js/lib/utils.js', '/js/pages/rider-cockpit.js'],
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
