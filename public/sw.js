const CACHE_NAME = 'cyclopon-v83';

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
  '/css/activity.css',
  '/css/register.css',
  '/js/router.js',
  '/js/lib/utils.js',
  '/js/lib/gpx-utils.js',
  '/js/lib/gps-keeper.js',
  '/js/libs/html2canvas.min.js',
  '/js/app.js',
  '/js/pages/landing.js',
  '/js/pages/guide.js',
  '/js/pages/register.js',
  '/js/pages/rider-login.js',
  '/js/pages/rider-setup.js',
  '/js/pages/rider-cockpit.js',
  '/js/pages/live-map.js',
  '/js/pages/event-results.js',
  '/js/pages/event-activity.js',
  '/js/pages/admin-dashboard.js',
  '/js/pages/admin-sos.js',
  '/js/pages/admin-event.js',
  '/img/traccar-guide/traccar-settings-full.png',
  '/img/traccar-guide/traccar-continuous-tracking.png',
  '/img/traccar-guide/traccar-location-permission.png',
  '/manifest.json',
  '/icons/logo.svg',
  '/icons/logo-emblem.svg',
  '/icons/logo-emblem-dark.svg',
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

// Notification click — focus an existing admin tab or open the dashboard
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/admin/sos';
  const destination = new URL(targetUrl, self.location.origin).href;

  event.waitUntil((async () => {
    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windowClients) {
      try {
        const clientUrl = new URL(client.url);
        if (clientUrl.pathname.startsWith('/admin')) {
          // Bring the admin console to the foreground and show the alert page
          // the notification points at, instead of just focusing whatever tab
          // happened to be open.
          if ('navigate' in client && client.url !== destination) {
            await client.navigate(destination);
          }
          await client.focus();
          return;
        }
      } catch {}
    }
    await self.clients.openWindow(destination);
  })());
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

  // GPX files — network-first, cache fallback (only cache authorized responses)
  if (url.pathname.startsWith('/gpx/')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone)).catch(() => {});
          } else {
            // Never keep a 403 (locked event) response around as a cached route.
            caches.open(CACHE_NAME).then(c => c.delete(request)).catch(() => {});
          }
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

  // Uploaded media (sponsor logos, rider avatars) — network-first, never fallback to index.html
  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(request))
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
      .catch(() => caches.match(request, { ignoreSearch: true }).then(cached => cached || caches.match('/index.html')))
  );
});
