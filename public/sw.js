const CACHE_NAME = 'cyclopon-v25';

// Core shell assets to cache on install
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/css/global.css',
  '/css/admin.css',
  '/css/rider.css',
  '/css/map.css',
  '/css/cockpit.css',
  '/css/results.css',
  '/js/router.js',
  '/js/lib/utils.js',
  '/js/lib/gpx-utils.js',
  '/js/lib/gps-keeper.js',
  '/js/libs/html2canvas.min.js',
  '/js/app.js',
  '/js/pages/landing.js',
  '/js/pages/rider-login.js',
  '/js/pages/rider-setup.js',
  '/js/pages/rider-cockpit.js',
  '/js/pages/live-map.js',
  '/js/pages/event-results.js',
  '/js/pages/admin-dashboard.js',
  '/js/pages/admin-notifications.js',
  '/js/pages/admin-event.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

// Install — cache shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching shell assets');
        // Use addAll but don't fail install if one fails (e.g. missing page)
        return Promise.allSettled(SHELL_ASSETS.map(url => cache.add(url)));
      })
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // WebSocket — skip (browser handles directly)
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return;

  // API calls — network only, offline fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'Server tidak terjangkau (Offline). Pastikan server backend sedang aktif (npm run dev).' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // GPX files — network-first, cache fallback
  if (url.pathname.startsWith('/gpx/')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // CDN resources (Leaflet, fonts) — cache-first
  if (url.hostname !== self.location.hostname) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        });
      })
    );
    return;
  }

  // Local app assets — network-first, cache fallback, then index.html
  event.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match('/index.html')))
  );
});
