async function renderLiveMap(params) {
  loadCss('/css/map.css');

  const eventId = params.eventId;
  const app     = document.getElementById('app');

  app.innerHTML = `
    <div class="live-map-wrapper">
      <!-- ── Unified Top Navigation Bar ── -->
      <header class="live-map-header">
        <div class="header-left">
          <a href="/" data-link class="header-logo" title="Kembali ke Beranda CycloPon">
            <span class="logo-icon">🚴</span>
            <span class="logo-text">CycloPon</span>
          </a>
          <div class="live-status-pill">
            <span class="live-dot pulse" id="liveDot"></span>
            <span>LIVE</span>
          </div>
          <div class="event-info-cluster">
            <h1 class="header-event-title" id="eventBadge">Memuat Event...</h1>
            <span class="header-event-stats" id="eventStats">Menghitung...</span>
          </div>
        </div>

        <div class="header-right">
          <!-- Segmented Layer Selector -->
          <div class="layer-pill-group">
            <button class="layer-pill-btn active" id="btnLayerDark" title="Ganti ke Tampilan Gelap (Dark Mode)">
              🌙 <span class="layer-btn-label">Dark</span>
            </button>
            <button class="layer-pill-btn" id="btnLayerCycle" title="Ganti ke Peta Rute Sepeda (CyclOSM)">
              🚴 <span class="layer-btn-label">Sepeda</span>
            </button>
            <button class="layer-pill-btn" id="btnLayerSat" title="Ganti ke Citra Satelit">
              🛰️ <span class="layer-btn-label">Satelit</span>
            </button>
          </div>

          <!-- Simulator Button (Demo Mode) -->
          <button class="header-action-btn" id="btnSimulator" title="Uji simulasi pergerakan rider langsung di rute GPX">
            🎮 <span class="action-btn-label" id="simBtnLabel">Simulasi</span>
          </button>

          <!-- Fit Route Button -->
          <button class="header-action-btn" id="btnFitRoute" title="Pusatkan peta ke seluruh rute GPX">
            🎯 <span class="action-btn-label">Fit Rute</span>
          </button>

          <!-- Toggle Leaderboard -->
          <button class="header-action-btn active" id="btnToggleSidebar" title="Tampilkan / Sembunyikan Leaderboard">
            📊 <span class="action-btn-label">Leaderboard</span>
            <span class="badge badge-yellow" id="headerRiderCount">0</span>
          </button>
        </div>
      </header>

      <!-- ── Viewport Grid (Map + Sidebar) ── -->
      <div class="map-viewport" id="mapViewport">
        <div class="map-container">
          <div id="leaflet-map"></div>
        </div>

        <!-- Leaderboard Sidebar -->
        <aside class="map-sidebar" id="mapSidebar">
          <div class="map-sidebar-header">
            <div class="sidebar-title-row">
              <h2 id="sidebarTitle">Leaderboard</h2>
              <span class="badge badge-yellow" id="sidebarRiderBadge">0 Rider</span>
            </div>
            <div class="sidebar-search-box">
              <span class="search-icon-placeholder">🔍</span>
              <input type="text" class="sidebar-search-input" id="riderSearchInput" placeholder="Cari nama atau nomor BIB...">
            </div>
          </div>
          <div class="leaderboard" id="leaderboard">
            <div style="padding:28px 16px;text-align:center;color:var(--text-secondary);font-size:13px">
              ⏳ Menunggu sinyal GPS rider...<br>
              <small style="opacity:0.7;display:block;margin-top:6px">Klik tombol <strong>🎮 Simulasi</strong> di atas untuk demo.</small>
            </div>
          </div>
        </aside>
      </div>
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
    app.innerHTML = `
      <div style="padding:60px 20px;text-align:center;color:var(--text-secondary)">
        <h2 style="font-size:24px;color:var(--color-red);margin-bottom:12px">⚠️ Gagal Memuat Peta</h2>
        <p>${err.message}</p>
        <a href="/" data-link style="display:inline-block;margin-top:20px;color:var(--color-yellow);text-decoration:none">← Kembali ke Beranda</a>
      </div>
    `;
    return;
  }

  // Update header titles & count
  document.getElementById('eventBadge').textContent = event.name;
  document.getElementById('sidebarTitle').textContent = event.name;
  document.getElementById('sidebarRiderBadge').textContent = `${riders.length} Rider`;
  document.getElementById('headerRiderCount').textContent = riders.length;
  document.title = `${event.name} — CycloPon Live`;

  // ── Init Leaflet Map with Zoom Control on Bottom-Right ──
  const map = L.map('leaflet-map', {
    zoomControl: false,
    attributionControl: true
  }).setView([-2.5, 118], 5);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // ── Tile Layers ──
  const darkLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    className: 'dark-tile'
  });

  const cycleLayer = L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap | <a href="https://www.cyclosm.org">CyclOSM</a>'
  });

  const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: '© Esri'
  });

  // Default to Dark layer
  let currentLayer = darkLayer;
  darkLayer.addTo(map);

  function switchTileLayer(layer, activeBtn) {
    if (currentLayer === layer) return;
    map.removeLayer(currentLayer);
    layer.addTo(map);
    currentLayer = layer;

    document.querySelectorAll('.layer-pill-btn').forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');
  }

  document.getElementById('btnLayerDark').addEventListener('click', e => {
    switchTileLayer(darkLayer, e.currentTarget);
  });
  document.getElementById('btnLayerCycle').addEventListener('click', e => {
    switchTileLayer(cycleLayer, e.currentTarget);
  });
  document.getElementById('btnLayerSat').addEventListener('click', e => {
    switchTileLayer(satLayer, e.currentTarget);
  });

  // ── Sidebar Toggle & Fit Route Handlers ──
  const mapViewport = document.getElementById('mapViewport');
  const btnToggleSidebar = document.getElementById('btnToggleSidebar');

  btnToggleSidebar.addEventListener('click', () => {
    const isCollapsed = mapViewport.classList.toggle('sidebar-collapsed');
    btnToggleSidebar.classList.toggle('active', !isCollapsed);
    setTimeout(() => map.invalidateSize(), 300);
  });

  let polylineBounds = null;
  document.getElementById('btnFitRoute').addEventListener('click', () => {
    if (polylineBounds) {
      map.fitBounds(polylineBounds, { padding: [40, 40] });
    } else {
      map.setView([-2.5, 118], 5);
    }
  });

  // ── Load GPX route ──
  let routeCoords = [];
  let routeKm     = 0;

  if (event.gpx_path) {
    try {
      const gpxText = await fetch(event.gpx_path).then(r => r.text());
      routeCoords   = parseGpxToCoords(gpxText);
      routeKm       = totalRouteKm(routeCoords);

      if (routeCoords.length) {
        const poly = L.polyline(routeCoords, { color: '#FFE600', weight: 4, opacity: 0.95 }).addTo(map);
        polylineBounds = poly.getBounds();
        map.fitBounds(polylineBounds, { padding: [40, 40] });

        // Start / Finish flags
        const flagIcon = (label, bg) => L.divIcon({
          html: `<div style="background:${bg};color:#080A0F;font-weight:900;font-size:10px;padding:4px 10px;border-radius:100px;white-space:nowrap;box-shadow:0 3px 12px rgba(0,0,0,0.6)">${label}</div>`,
          className: '', iconAnchor: [0, 8]
        });
        L.marker(routeCoords[0], { icon: flagIcon('▶ START', '#10B981') }).addTo(map);
        L.marker(routeCoords[routeCoords.length - 1], { icon: flagIcon('🏁 FINISH', '#EF4444') }).addTo(map);

        document.getElementById('eventStats').textContent = `${routeKm} km · ${riders.length} Rider`;
      } else {
        document.getElementById('eventStats').textContent = `${riders.length} Rider`;
      }
    } catch {
      document.getElementById('eventStats').textContent = `${riders.length} Rider`;
    }
  } else {
    document.getElementById('eventStats').textContent = `Belum ada rute GPX · ${riders.length} Rider`;
  }

  // ── Auto-Mapping Rider & Device State ──
  const riderById    = {};  // numeric deviceId → rider
  const bibToRider   = {};  // "001" or "BIB-001" → rider
  const markerById   = {};  // numeric deviceId → Leaflet marker
  const progressById = {};  // numeric deviceId → { progressPct, distanceKm, speed, lastTime }
  let searchQuery    = '';

  riders.forEach(r => {
    const cleanBib = String(r.bib).trim();
    bibToRider[cleanBib] = r;
    bibToRider[`BIB-${cleanBib}`] = r;
    bibToRider[`BIB${cleanBib}`] = r;
    if (r.traccar_device_id) {
      riderById[r.traccar_device_id] = r;
    }
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
          background:rgba(8,10,15,0.94);
          border:2px solid #FFE600;
          display:flex;align-items:center;justify-content:center;
          color:#FFE600;font-weight:900;font-size:13px;
          box-shadow:0 0 16px rgba(255,230,0,0.4)
        ">${n}</div>`,
        className: '', iconSize: [36, 36], iconAnchor: [18, 18]
      });
    }
  });
  map.addLayer(clusterGroup);

  function createRiderIcon(rider) {
    const color = rider.color || '#FFE600';
    return L.divIcon({
      html: `
        <div style="position:relative;width:20px;height:20px">
          <div style="
            width:14px;height:14px;border-radius:50%;
            background:${color};
            border:2.5px solid rgba(255,255,255,0.95);
            box-shadow:0 0 10px ${color}80,0 2px 5px rgba(0,0,0,0.6);
            position:absolute;top:3px;left:3px;
          "></div>
          <div style="
            position:absolute;top:-20px;left:50%;transform:translateX(-50%);
            background:rgba(8,10,15,0.9);
            color:${color};font-size:10px;font-weight:800;
            padding:1px 7px;border-radius:100px;white-space:nowrap;
            border:1px solid ${color}60;
          ">#${rider.bib}</div>
        </div>
      `,
      className: '', iconSize: [20, 20], iconAnchor: [10, 10]
    });
  }

  // ── Helper: Format Time Ago & Status ──
  function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Belum ada data';
    const elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
    if (elapsedSec < 60) return `${elapsedSec}d lalu`;
    const min = Math.floor(elapsedSec / 60);
    if (min < 60) return `${min}m lalu`;
    const hr = Math.floor(min / 60);
    return `${hr}j lalu`;
  }

  function getRiderStatus(timestamp) {
    if (!timestamp) return { text: 'Offline', color: '#94A3B8', dot: '⚪' };
    const elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
    if (elapsedSec <= 90) return { text: 'Online', color: '#10B981', dot: '🟢' };
    if (elapsedSec <= 300) return { text: 'Idle', color: '#FFE600', dot: '🟡' };
    return { text: 'Blank Spot', color: '#94A3B8', dot: '⚪' };
  }

  // ── Core Function: Update Single Rider Position ──
  function updateRiderPosition(deviceId, pos) {
    const rider = riderById[deviceId];
    if (!rider) return;

    const latlng = [pos.latitude, pos.longitude];
    const fixTime = pos.fixTime || pos.deviceTime || new Date().toISOString();
    const speed = pos.speed != null ? Math.round(pos.speed) : null;

    // Remove old marker from cluster
    if (markerById[deviceId]) {
      clusterGroup.removeLayer(markerById[deviceId]);
    }

    const status = getRiderStatus(fixTime);

    // Create new marker with popup
    const marker = L.marker(latlng, { icon: createRiderIcon(rider) });
    marker.bindPopup(`
      <div style="min-width:170px">
        <div style="font-weight:800;font-size:15px;margin-bottom:4px;display:flex;align-items:center;justify-content:space-between">
          <span>${rider.name}</span>
          <span style="font-size:11px;color:${status.color}">${status.dot} ${status.text}</span>
        </div>
        <div style="color:#94A3B8;font-size:12px">BIB: <strong style="color:${rider.color || '#FFE600'}">#${rider.bib}</strong></div>
        ${speed != null ? `<div style="color:#94A3B8;font-size:12px;margin-top:2px">Kecepatan: <strong style="color:#FFFFFF">${speed} km/h</strong></div>` : ''}
        <div style="color:#94A3B8;font-size:11px;margin-top:6px">Update: <strong>${formatTimeAgo(fixTime)}</strong></div>
      </div>
    `);

    clusterGroup.addLayer(marker);
    markerById[deviceId] = marker;

    // Nearest-point route calculation
    if (routeCoords.length) {
      const calc = findNearestRoutePoint(pos.latitude, pos.longitude, routeCoords, routeKm);
      progressById[deviceId] = { ...calc, speed, lastTime: fixTime };
    } else {
      progressById[deviceId] = { progressPct: 0, distanceKm: 0, speed, lastTime: fixTime };
    }

    updateLeaderboard();
  }

  // ── Leaderboard renderer & search filter ──
  function updateLeaderboard() {
    let entries = Object.entries(progressById)
      .map(([deviceId, prog]) => ({ rider: riderById[deviceId], ...prog }))
      .filter(e => e.rider)
      .sort((a, b) => b.distanceKm - a.distanceKm || b.progressPct - a.progressPct);

    // If search filter active
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      entries = entries.filter(e =>
        e.rider.name.toLowerCase().includes(q) ||
        String(e.rider.bib).includes(q)
      );
    }

    const leaderboardEl = document.getElementById('leaderboard');
    if (!entries.length) {
      leaderboardEl.innerHTML = `
        <div style="padding:28px 16px;text-align:center;color:var(--text-secondary);font-size:13px">
          ${searchQuery ? 'Tidak ada rider yang cocok dengan pencarian.' : '⏳ Menunggu sinyal GPS rider...<br><small style="opacity:0.7;display:block;margin-top:6px">Klik tombol <strong>🎮 Simulasi</strong> di atas untuk demo.</small>'}
        </div>
      `;
      return;
    }

    leaderboardEl.innerHTML = entries.map((e, i) => {
      const status = getRiderStatus(e.lastTime);
      return `
        <div class="leaderboard-item fade-in" onclick="panToRider(${e.rider.traccar_device_id})">
          <div class="leaderboard-rank ${i < 3 ? 'top' : ''}">${i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}</div>
          <div class="rider-avatar" style="background:${e.rider.color || '#FFE600'}">${e.rider.bib}</div>
          <div class="leaderboard-info">
            <div class="leaderboard-name">${e.rider.name}</div>
            <div class="leaderboard-bib" style="display:flex;align-items:center;gap:6px">
              <span>#${e.rider.bib}</span>
              <span style="font-size:10px;color:${status.color}">${status.dot} ${formatTimeAgo(e.lastTime)}</span>
            </div>
          </div>
          <div class="leaderboard-stat">
            <div class="leaderboard-km">${e.distanceKm} km</div>
            <div class="leaderboard-pct">${e.progressPct}%</div>
          </div>
        </div>
      `;
    }).join('');
  }

  document.getElementById('riderSearchInput').addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    updateLeaderboard();
  });

  window.panToRider = deviceId => {
    const m = markerById[deviceId];
    if (m) {
      map.setView(m.getLatLng(), 15);
      m.openPopup();
    }
  };

  // ── Simulator Mode (Demo GPS) ──
  let simIntervalId = null;
  let isSimulating  = false;

  function startSimulator() {
    if (!routeCoords || routeCoords.length < 2) {
      showToast('Upload file GPX rute event terlebih dahulu untuk simulasi.', 'error');
      return;
    }

    isSimulating = true;
    document.getElementById('btnSimulator').classList.add('active');
    document.getElementById('simBtnLabel').textContent = 'Stop Demo';
    showToast('Simulasi GPS rider dimulai! 🚴‍♂️', 'success');

    // Use registered event riders or create realistic demo riders
    const demoRiders = riders.length ? riders : [
      { id: 101, bib: '001', name: 'Ahmad Rider (Simulasi)', color: '#FFE600' },
      { id: 102, bib: '002', name: 'Budi Santoso (Simulasi)', color: '#10B981' },
      { id: 103, bib: '003', name: 'Citra Dewi (Simulasi)', color: '#FF6B35' }
    ];

    const simState = demoRiders.map((r, idx) => {
      const devId = r.traccar_device_id || (idx + 9001);
      r.traccar_device_id = devId;
      riderById[devId] = r;
      return {
        rider: r,
        devId,
        currentIndex: Math.min(idx * 4, routeCoords.length - 1),
        speed: 26 + (idx * 2) + Math.random() * 4,
        stepSize: Math.max(1, Math.floor(routeCoords.length / 80)) + idx
      };
    });

    function advanceSim() {
      simState.forEach(sim => {
        sim.currentIndex = (sim.currentIndex + sim.stepSize) % routeCoords.length;
        const pt = routeCoords[sim.currentIndex];
        const lat = pt[0] + (Math.random() - 0.5) * 0.00015;
        const lng = pt[1] + (Math.random() - 0.5) * 0.00015;

        updateRiderPosition(sim.devId, {
          latitude: lat,
          longitude: lng,
          speed: sim.speed + (Math.random() - 0.5) * 3,
          fixTime: new Date().toISOString()
        });
      });
    }

    advanceSim();
    simIntervalId = setInterval(advanceSim, 2500);
  }

  function stopSimulator() {
    isSimulating = false;
    if (simIntervalId) clearInterval(simIntervalId);
    simIntervalId = null;
    document.getElementById('btnSimulator').classList.remove('active');
    document.getElementById('simBtnLabel').textContent = 'Simulasi';
    showToast('Simulasi GPS dihentikan.', 'info');
  }

  document.getElementById('btnSimulator').addEventListener('click', () => {
    if (isSimulating) stopSimulator();
    else startSimulator();
  });

  // ── WebSocket Connection to Traccar Proxy ──
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

        // 1. Auto-Mapping Traccar Devices to Riders by BIB Number!
        if (data.devices && Array.isArray(data.devices)) {
          data.devices.forEach(dev => {
            const rawUnique = String(dev.uniqueId || '').trim();
            const cleanUnique = rawUnique.replace(/^BIB-?/i, '');
            const matchedRider = bibToRider[rawUnique] || bibToRider[cleanUnique] || bibToRider[`BIB-${cleanUnique}`];
            if (matchedRider) {
              matchedRider.traccar_device_id = dev.id;
              riderById[dev.id] = matchedRider;
              console.log(`[LiveMap] Auto-mapped Traccar device ${dev.id} (${rawUnique}) to rider #${matchedRider.bib} (${matchedRider.name})`);
            }
          });
        }

        // 2. Process incoming positions
        if (data.positions && Array.isArray(data.positions)) {
          data.positions.forEach(pos => {
            let rider = riderById[pos.deviceId];

            // Auto-fallback mapping by device ID string
            if (!rider && bibToRider[String(pos.deviceId)]) {
              rider = bibToRider[String(pos.deviceId)];
              riderById[pos.deviceId] = rider;
            }

            if (!rider) return;

            updateRiderPosition(pos.deviceId, pos);
          });
        }
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
