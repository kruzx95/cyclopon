async function renderLiveMap(params) {
  loadCss('/css/map.css');

  const eventId = params.eventId;
  const app     = document.getElementById('app');

  app.innerHTML = `
    <div class="map-layout">
      <div class="map-container">
        <div class="map-top-bar">
          <div class="map-top-badge">
            <span class="live-indicator">
              <span class="live-dot pulse" id="liveDot"></span>
              LIVE
            </span>
          </div>
          <div class="map-top-badge" id="eventBadge" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            Memuat...
          </div>
        </div>
        <div id="leaflet-map"></div>
      </div>
      <aside class="map-sidebar">
        <div class="map-sidebar-header">
          <h2 id="sidebarTitle">Leaderboard</h2>
          <p id="sidebarSub">Memuat rider...</p>
        </div>
        <div class="leaderboard" id="leaderboard">
          <div style="padding:24px;text-align:center;color:var(--text-secondary);font-size:14px">
            ⏳ Menunggu posisi pertama...
          </div>
        </div>
      </aside>
    </div>
  `;

  // ── Load Leaflet & plugins ──
  await loadScripts([
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js',
    '/js/lib/gpx-utils.js'
  ]);
  loadCss('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
  loadCss('https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css');
  loadCss('https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css');

  // ── Fetch event + riders ──
  let event, riders;
  try {
    const [evRes, rRes] = await Promise.all([
      fetch(`/api/events/${eventId}`),
      fetch(`/api/events/${eventId}/riders`)
    ]);
    if (!evRes.ok) throw new Error('Event tidak ditemukan');
    event  = await evRes.json();
    riders = await rRes.json();
  } catch (err) {
    app.innerHTML = `<div style="padding:48px;text-align:center;color:var(--text-secondary)">⚠️ ${err.message}</div>`;
    return;
  }

  document.getElementById('eventBadge').textContent = event.name;
  document.getElementById('sidebarTitle').textContent = event.name;
  document.getElementById('sidebarSub').textContent = `${riders.length} rider terdaftar`;
  document.title = `${event.name} — CycloPon Live`;

  // ── Init Leaflet map with dark tiles ──
  const map = L.map('leaflet-map', { zoomControl: true }).setView([-2.5, 118], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // ── Load GPX route ──
  let routeCoords = [];
  let routeKm     = 0;

  if (event.gpx_path) {
    try {
      const gpxText = await fetch(event.gpx_path).then(r => r.text());
      routeCoords   = parseGpxToCoords(gpxText);
      routeKm       = totalRouteKm(routeCoords);

      if (routeCoords.length) {
        const poly = L.polyline(routeCoords, { color: '#00E5FF', weight: 3, opacity: 0.8 }).addTo(map);
        map.fitBounds(poly.getBounds(), { padding: [40, 40] });

        // Start / Finish flags
        const flagIcon = (label, bg) => L.divIcon({
          html: `<div style="background:${bg};color:#0D1117;font-weight:800;font-size:10px;padding:3px 8px;border-radius:100px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.4)">${label}</div>`,
          className: '', iconAnchor: [0, 8]
        });
        L.marker(routeCoords[0], { icon: flagIcon('▶ START', '#3FB950') }).addTo(map);
        L.marker(routeCoords[routeCoords.length - 1], { icon: flagIcon('🏁 FINISH', '#FF6B35') }).addTo(map);
      }
    } catch { /* GPX load failed silently */ }
  }

  // ── Rider state ──
  const riderById    = {};  // traccar_device_id → rider
  const markerById   = {};  // traccar_device_id → Leaflet marker
  const progressById = {};  // traccar_device_id → { progressPct, distanceKm }

  riders.forEach(r => {
    if (r.traccar_device_id) riderById[r.traccar_device_id] = r;
  });

  // ── Marker cluster group ──
  const clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 50,
    disableClusteringAtZoom: 16,
    iconCreateFunction: cluster => {
      const n = cluster.getChildCount();
      return L.divIcon({
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:rgba(13,17,23,0.92);
          border:2px solid #00E5FF;
          display:flex;align-items:center;justify-content:center;
          color:#00E5FF;font-weight:800;font-size:13px;
          box-shadow:0 0 14px rgba(0,229,255,0.25)
        ">${n}</div>`,
        className: '', iconSize: [36, 36], iconAnchor: [18, 18]
      });
    }
  });
  map.addLayer(clusterGroup);

  function createRiderIcon(rider) {
    return L.divIcon({
      html: `
        <div style="position:relative;width:20px;height:20px">
          <div style="
            width:14px;height:14px;border-radius:50%;
            background:${rider.color};
            border:2.5px solid rgba(255,255,255,0.85);
            box-shadow:0 0 10px ${rider.color}80,0 2px 4px rgba(0,0,0,0.5);
            position:absolute;top:3px;left:3px;
          "></div>
          <div style="
            position:absolute;top:-20px;left:50%;transform:translateX(-50%);
            background:rgba(13,17,23,0.88);
            color:${rider.color};font-size:10px;font-weight:800;
            padding:1px 7px;border-radius:100px;white-space:nowrap;
            border:1px solid ${rider.color}60;
          ">#${rider.bib}</div>
        </div>
      `,
      className: '', iconSize: [20, 20], iconAnchor: [10, 10]
    });
  }

  // ── Leaderboard updater ──
  function updateLeaderboard() {
    const entries = Object.entries(progressById)
      .map(([deviceId, prog]) => ({ rider: riderById[deviceId], ...prog }))
      .filter(e => e.rider)
      .sort((a, b) => b.distanceKm - a.distanceKm || b.progressPct - a.progressPct);

    if (!entries.length) return;

    document.getElementById('leaderboard').innerHTML = entries.map((e, i) => `
      <div class="leaderboard-item fade-in" onclick="panToRider(${e.rider.traccar_device_id})">
        <div class="leaderboard-rank ${i < 3 ? 'top' : ''}">${i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}</div>
        <div class="rider-avatar" style="background:${e.rider.color}">${e.rider.bib}</div>
        <div class="leaderboard-info">
          <div class="leaderboard-name">${e.rider.name}</div>
          <div class="leaderboard-bib">#${e.rider.bib}</div>
        </div>
        <div class="leaderboard-stat">
          <div class="leaderboard-km">${e.distanceKm} km</div>
          <div class="leaderboard-pct">${e.progressPct}%</div>
        </div>
      </div>
    `).join('');
  }

  window.panToRider = deviceId => {
    const m = markerById[deviceId];
    if (m) { map.setView(m.getLatLng(), 15); }
  };

  // ── WebSocket connection to Traccar proxy ──
  function connectWs() {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws    = new WebSocket(`${proto}//${window.location.host}/traccar-ws`);
    const dot   = document.getElementById('liveDot');

    if (dot) { dot.className = 'live-dot connecting'; dot.classList.remove('pulse'); }

    ws.onopen = () => {
      if (dot) { dot.className = 'live-dot pulse'; }
      console.log('[LiveMap] WebSocket connected');
    };

    ws.onmessage = e => {
      try {
        const data = JSON.parse(e.data);
        if (!data.positions) return;

        data.positions.forEach(pos => {
          const rider = riderById[pos.deviceId];
          if (!rider) return;

          const latlng = [pos.latitude, pos.longitude];

          // Remove old marker from cluster
          if (markerById[pos.deviceId]) {
            clusterGroup.removeLayer(markerById[pos.deviceId]);
          }

          // Create new marker
          const marker = L.marker(latlng, { icon: createRiderIcon(rider) });
          marker.bindPopup(`
            <div style="min-width:160px">
              <div style="font-weight:700;font-size:15px;margin-bottom:4px">${rider.name}</div>
              <div style="color:#8B949E;font-size:12px">BIB: <strong style="color:${rider.color}">#${rider.bib}</strong></div>
              ${pos.speed != null ? `<div style="color:#8B949E;font-size:12px;margin-top:2px">Speed: <strong style="color:#E6EDF3">${Math.round(pos.speed)} km/h</strong></div>` : ''}
              <div style="color:#8B949E;font-size:11px;margin-top:6px">${new Date(pos.fixTime || pos.deviceTime).toLocaleTimeString('id-ID')}</div>
            </div>
          `);

          clusterGroup.addLayer(marker);
          markerById[pos.deviceId] = marker;

          // Update progress
          if (routeCoords.length) {
            progressById[pos.deviceId] = findNearestRoutePoint(pos.latitude, pos.longitude, routeCoords, routeKm);
          } else {
            progressById[pos.deviceId] = { progressPct: 0, distanceKm: 0 };
          }
        });

        updateLeaderboard();
      } catch (err) {
        console.error('[LiveMap] WS parse error:', err);
      }
    };

    ws.onclose = () => {
      if (dot) { dot.className = 'live-dot offline'; }
      console.log('[LiveMap] WebSocket closed, reconnecting in 5s...');
      setTimeout(connectWs, 5000);
    };

    ws.onerror = err => console.error('[LiveMap] WS error:', err);
  }

  connectWs();
}
