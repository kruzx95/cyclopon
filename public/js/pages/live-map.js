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

          <!-- Time Machine Replay Button -->
          <button class="header-action-btn" id="btnToggleReplay" title="Buka Kontrol Replay Time Machine">
            ⏮️ <span class="action-btn-label">Replay</span>
          </button>

          <!-- Fit Route Button -->
          <button class="header-action-btn" id="btnFitRoute" title="Pusatkan peta ke seluruh rute GPX">
            🎯 <span class="action-btn-label">Fit Rute</span>
          </button>

          <!-- Elevation Profile Toggle -->
          <button class="header-action-btn active" id="btnToggleElevation" title="Tampilkan / Sembunyikan Profil Elevasi Komoot">
            ⛰️ <span class="action-btn-label">Elevasi</span>
          </button>

          <!-- Toggle Leaderboard -->
          <button class="header-action-btn active" id="btnToggleSidebar" title="Tampilkan / Sembunyikan Leaderboard">
            📊 <span class="action-btn-label">Leaderboard</span>
            <span class="badge badge-yellow" id="headerRiderCount">0</span>
          </button>

          <!-- Official Results Link -->
          <a class="header-action-btn" href="/events/${eventId}/results" data-link title="Lihat Rekap Hasil Resmi & Sertifikat Brevet">
            🏆 <span class="action-btn-label">Hasil & Brevet</span>
          </a>
        </div>
      </header>

      <!-- ── Dynamic Safety & Emergency Alert Bar ── -->
      <div id="liveEmergencyBar" class="live-emergency-bar" style="display:none">
        <div class="emergency-info-cluster">
          <span class="emergency-badge">🚨 SOS DARURAT</span>
          <span id="emergencyText">Memuat informasi darurat...</span>
        </div>
        <div class="emergency-actions">
          <button class="btn-emergency-focus" id="btnFocusEmergency">🎯 Fokus Lokasi</button>
          <button class="btn-emergency-resolve" id="btnResolveEmergency">✓ Selesai</button>
        </div>
      </div>

      <!-- ── Time Machine Replay Control Bar ── -->
      <div id="replayControlBar" class="replay-control-bar" style="display:none">
        <div class="replay-bar-inner">
          <button class="replay-btn replay-play-btn" id="btnReplayPlay" title="Play / Pause Replay">▶</button>
          <div class="replay-time-display">
            <span class="replay-badge">REPLAY</span>
            <span id="replayClock" class="replay-clock">--:--:--</span>
          </div>

          <div class="replay-slider-wrap">
            <span class="replay-time-bound" id="replayStartTime">00:00</span>
            <input type="range" class="replay-slider" id="replaySlider" min="0" max="100" value="0" step="0.2">
            <span class="replay-time-bound" id="replayEndTime">00:00</span>
          </div>

          <div class="replay-speed-group">
            <button class="replay-speed-btn active" data-speed="1">1x</button>
            <button class="replay-speed-btn" data-speed="5">5x</button>
            <button class="replay-speed-btn" data-speed="15">15x</button>
            <button class="replay-speed-btn" data-speed="60">60x</button>
          </div>

          <button class="replay-btn replay-exit-btn" id="btnExitReplay" title="Kembali ke Mode Live">🔴 Live</button>
        </div>
      </div>

      <!-- ── Head-to-Head Comparison Modal ── -->
      <div id="h2hModalBackdrop" class="h2h-modal-backdrop" style="display:none">
        <div class="h2h-modal" id="h2hModalContent"></div>
      </div>

      <!-- ── Viewport Grid (Map + Sidebar) ── -->
      <div class="map-viewport" id="mapViewport">
        <div class="map-container elev-open" id="mapContainer">
          <div id="leaflet-map"></div>

          <!-- ── Komoot Elevation Profile Drawer ── -->
          <div class="elevation-drawer" id="elevationDrawer">
            <div class="elev-header">
              <div class="elev-metrics-group">
                <div class="elev-metric">
                  <div class="elev-metric-val"><span id="elevStatDist">-</span><span class="elev-unit">km</span></div>
                  <div class="elev-metric-lbl">Distance</div>
                </div>
                <div class="elev-metric">
                  <div class="elev-metric-val" id="elevStatTime">-</div>
                  <div class="elev-metric-lbl">Est. time</div>
                </div>
                <div class="elev-metric">
                  <div class="elev-metric-val"><span id="elevStatGain">-</span><span class="elev-unit">m</span></div>
                  <div class="elev-metric-lbl">Elevation gain</div>
                </div>
                <div class="elev-metric">
                  <div class="elev-metric-val"><span id="elevStatLoss">-</span><span class="elev-unit">m</span></div>
                  <div class="elev-metric-lbl">Elevation loss</div>
                </div>
                <div class="elev-metric">
                  <div class="elev-pill-badge diff-moderate" id="elevStatDiff">Moderate</div>
                  <div class="elev-metric-lbl">Difficulty</div>
                </div>
                <div class="elev-metric">
                  <div class="elev-pill-badge speed-badge" id="elevStatSpeed">Moderate: 20 km/h</div>
                  <div class="elev-metric-lbl">Speed</div>
                </div>
              </div>

              <div class="elev-header-controls">
                <div class="elev-badge-pill">
                  <span>Elevation</span>
                </div>
                <button class="elev-btn-icon" id="btnCloseElevation" title="Tutup Profil Elevasi">✕</button>
              </div>
            </div>

            <div class="elev-chart-wrapper" id="elevChartBox">
              <canvas id="elevationCanvas"></canvas>
              <div class="elev-tooltip" id="elevTooltip"></div>
            </div>
          </div>
        </div>

        <!-- Leaderboard Sidebar -->
        <aside class="map-sidebar" id="mapSidebar">
          <div class="map-sidebar-header">
            <div class="sidebar-title-row">
              <h2 id="sidebarTitle">Leaderboard</h2>
              <span class="badge badge-yellow" id="sidebarRiderBadge">0 Rider</span>
            </div>
            <!-- Sort Toggle Button Group -->
            <div class="sidebar-sort-group">
              <button class="sort-tab-btn active" id="btnSortBib" title="Urutkan tetap berdasarkan nomor BIB agar kartu tidak lompat-lompat">
                🔢 No. BIB (Diam)
              </button>
              <button class="sort-tab-btn" id="btnSortRank" title="Urutkan berdasarkan posisi terdepan lomba">
                🏆 Live Rank
              </button>
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

  // ── Fetch event + riders + checkpoints + splits ──
  let event, riders;
  let checkpoints = [];
  const splitsCache = {};
  try {
    const [evRes, rRes, cpRes, spRes] = await Promise.all([
      fetch(`/api/events/${eventId}`),
      fetch(`/api/events/${eventId}/riders`),
      fetch(`/api/events/${eventId}/checkpoints`),
      fetch(`/api/events/${eventId}/splits`)
    ]);
    if (!evRes.ok) {
      if (evRes.status === 404) throw new Error('Event tidak ditemukan.');
      const errData = await evRes.json().catch(() => ({}));
      throw new Error(errData.error || `Tidak dapat terhubung ke server (HTTP ${evRes.status}). Pastikan server backend sedang aktif.`);
    }
    event       = await evRes.json();
    riders      = await rRes.json();
    checkpoints = cpRes.ok ? await cpRes.json() : [];
    const initialSplits = spRes.ok ? await spRes.json() : [];
    initialSplits.forEach(sp => {
      splitsCache[`${sp.rider_id}_${sp.checkpoint_id}`] = sp;
    });
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

  // ── Auto-Mapping Rider & Device State ──
  const riderById    = {};  // numeric deviceId → rider
  const bibToRider   = {};  // "001" or "BIB-001" → rider
  const markerById    = {};  // numeric deviceId → Leaflet marker
  const progressById  = {};  // numeric deviceId → { progressPct, distanceKm, speed, lastTime }
  const telemetryById = {}; // numeric deviceId → { history: [], movingAvg, currentSpeed, remainingKm, etaTime, etaDuration, etaBadgeClass, isFinished }
  let searchQuery     = '';

  riders.forEach(r => {
    const cleanBib = String(r.bib).trim();
    bibToRider[cleanBib] = r;
    bibToRider[`BIB-${cleanBib}`] = r;
    bibToRider[`BIB${cleanBib}`] = r;
    if (r.traccar_device_id) {
      riderById[r.traccar_device_id] = r;
    }
  });

  // ── Sidebar Toggle & Fit Route Handlers ──
  const mapViewport = document.getElementById('mapViewport');
  const btnToggleSidebar = document.getElementById('btnToggleSidebar');

  btnToggleSidebar.addEventListener('click', () => {
    const isCollapsed = mapViewport.classList.toggle('sidebar-collapsed');
    btnToggleSidebar.classList.toggle('active', !isCollapsed);
    setTimeout(() => {
      map.invalidateSize();
      redrawElevationChart();
    }, 310);
  });

  let polylineBounds = null;
  document.getElementById('btnFitRoute').addEventListener('click', () => {
    if (polylineBounds) {
      map.fitBounds(polylineBounds, { padding: [40, 40] });
    } else {
      map.setView([-2.5, 118], 5);
    }
  });

  // ── Komoot Elevation Drawer & Chart Engine ──
  const btnToggleElevation = document.getElementById('btnToggleElevation');
  const btnCloseElevation  = document.getElementById('btnCloseElevation');
  const elevationDrawer    = document.getElementById('elevationDrawer');
  const mapContainer       = document.getElementById('mapContainer');
  const canvas             = document.getElementById('elevationCanvas');
  const tooltip            = document.getElementById('elevTooltip');

  let gpxData         = null;
  let activeHoverDist = null;
  let scrubMarker     = null;
  let routeCoords     = [];
  let routeKm         = 0;

  const scrubIcon = L.divIcon({
    html: `<div style="
      width:18px;height:18px;border-radius:50%;
      background:#2B4E30;border:3px solid #FFFFFF;
      box-shadow:0 0 16px rgba(43,78,48,0.7), 0 0 0 4px rgba(43,78,48,0.35);
      animation:pulse 1s infinite alternate;
    "></div>`,
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });

  function toggleElevation(show) {
    const isVisible = typeof show === 'boolean' ? show : elevationDrawer.classList.contains('collapsed');
    elevationDrawer.classList.toggle('collapsed', !isVisible);
    mapContainer.classList.toggle('elev-open', isVisible);
    if (btnToggleElevation) btnToggleElevation.classList.toggle('active', isVisible);
    if (isVisible && gpxData) {
      setTimeout(redrawElevationChart, 50);
    }
  }

  if (btnToggleElevation) btnToggleElevation.addEventListener('click', () => toggleElevation());
  if (btnCloseElevation) btnCloseElevation.addEventListener('click', () => toggleElevation(false));

  function getGradeColor(gradePct) {
    // ── Earthy Sage Palette Gradient: sage → amber → rust ──
    if (gradePct >= 8) {
      return {
        stroke: '#B85C2B',          // Deep Rust — steep climb
        fill: 'rgba(184, 92, 43, 0.38)',
        badgeBg: 'rgba(184, 92, 43, 0.22)',
        badgeColor: '#C27438'
      };
    }
    if (gradePct >= 4) {
      return {
        stroke: '#C27438',          // Amber Sand — moderate
        fill: 'rgba(194, 116, 56, 0.32)',
        badgeBg: 'rgba(194, 116, 56, 0.22)',
        badgeColor: '#D1A980'
      };
    }
    return {
      stroke: '#2B4E30',            // Deep Sage — gentle / flat
      fill: 'rgba(43, 78, 48, 0.28)',
      badgeBg: 'rgba(43, 78, 48, 0.18)',
      badgeColor: '#748873'
    };
  }

  function findNearestPointByDist(pts, targetKm) {
    if (!pts || !pts.length) return null;
    let low = 0;
    let high = pts.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (pts[mid].distKm < targetKm) low = mid + 1;
      else high = mid - 1;
    }
    const idx = Math.min(pts.length - 1, Math.max(0, low));
    return pts[idx];
  }

  function redrawElevationChart() {
    if (!canvas || !gpxData || !gpxData.points || gpxData.points.length < 2) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width  = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;

    const padL = 48;
    const padR = 20;
    const padT = 16;
    const padB = 24;
    const plotW = Math.max(10, w - padL - padR);
    const plotH = Math.max(10, h - padT - padB);

    const totalDist = gpxData.stats.totalKm || 1;
    const minEle = gpxData.stats.minEle;
    const maxEle = gpxData.stats.maxEle;
    const eleSpan = Math.max(50, maxEle - minEle);
    const yMin = Math.max(0, Math.floor((minEle - eleSpan * 0.08) / 50) * 50);
    const yMax = Math.ceil((maxEle + eleSpan * 0.08) / 50) * 50;

    const getX = dist => padL + (dist / totalDist) * plotW;
    const getY = ele => padT + (1 - (ele - yMin) / (yMax - yMin)) * plotH;
    const baselineY = padT + plotH;

    ctx.clearRect(0, 0, w, h);

    // ── Horizontal Grid Lines & Elevation Labels ──
    const yTicks = 4;
    ctx.font = '500 10px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= yTicks; i++) {
      const ele = Math.round(yMin + (i / yTicks) * (yMax - yMin));
      const y = getY(ele);

      ctx.beginPath();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();

      ctx.fillText(`${ele.toLocaleString()} m`, padL - 8, y);
    }

    // ── Vertical Distance Grid Lines & Ticks ──
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const distStep = totalDist > 120 ? 20 : (totalDist > 60 ? 10 : 5);
    for (let d = 0; d <= totalDist; d += distStep) {
      const x = getX(d);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, baselineY);
      ctx.stroke();

      ctx.fillText(`${d} km`, x, baselineY + 6);
    }
    if (totalDist % distStep > distStep * 0.4) {
      const finalX = getX(totalDist);
      ctx.fillText(`${Math.round(totalDist)} km`, finalX, baselineY + 6);
    }

    ctx.setLineDash([]); // Reset dashed lines

    // ── Draw Elevation Profile with Komoot Gradient Slices ──
    const pts = gpxData.points;
    const step = Math.max(1, Math.floor(pts.length / 400));

    for (let i = step; i < pts.length; i += step) {
      const p0 = pts[i - step];
      const p1 = pts[i];
      const x0 = getX(p0.distKm);
      const y0 = getY(p0.ele);
      const x1 = getX(p1.distKm);
      const y1 = getY(p1.ele);

      const colors = getGradeColor(p1.gradePct);

      // Vertical slice fill
      const grad = ctx.createLinearGradient(0, Math.min(y0, y1), 0, baselineY);
      grad.addColorStop(0, colors.fill);
      grad.addColorStop(1, 'rgba(16, 185, 129, 0.02)');

      ctx.beginPath();
      ctx.moveTo(x0, baselineY);
      ctx.lineTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x1, baselineY);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Top line segment
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // ── Komoot Start (A) & Finish (B) Badges ──
    const drawBadge = (label, bg, x, y) => {
      ctx.beginPath();
      ctx.arc(x, y, 8.5, 0, Math.PI * 2);
      ctx.fillStyle = bg;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.font = 'bold 9px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y);
    };

    drawBadge('A', '#2B4E30', padL + 10, padT + 12);
    drawBadge('B', '#966025', padL + plotW - 10, padT + 12);

    // ── Live Riders on Elevation Curve ──
    Object.entries(progressById).forEach(([devId, prog]) => {
      const rider = riderById[devId];
      if (!rider || prog.distanceKm == null) return;
      const rDist = Math.max(0, Math.min(totalDist, prog.distanceKm));
      const rPt = findNearestPointByDist(pts, rDist);
      if (!rPt) return;

      const rx = getX(rDist);
      const ry = getY(rPt.ele);
      const rColor = rider.color || '#FFE600';

      // Outer glow
      ctx.beginPath();
      ctx.arc(rx, ry, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = rColor;
      ctx.shadowColor = rColor;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner white dot
      ctx.beginPath();
      ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      // BIB tag above dot
      ctx.font = '800 9px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`#${rider.bib}`, rx, ry - 6);
    });

    // ── Checkpoint Markers on Elevation Profile ──
    if (checkpoints && checkpoints.length && pts.length) {
      checkpoints.forEach((cp, idx) => {
        if (cp.km_distance > totalDist) return;
        const cpx = getX(cp.km_distance);
        const cpPt = findNearestPointByDist(pts, cp.km_distance);
        if (!cpPt) return;
        const cpy = getY(cpPt.ele);

        // Vertical dashed guide line
        ctx.beginPath();
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = 'rgba(116, 136, 115, 0.8)';
        ctx.lineWidth = 1.3;
        ctx.moveTo(cpx, padT);
        ctx.lineTo(cpx, baselineY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Deep Sage glow circle on elevation contour
        ctx.beginPath();
        ctx.arc(cpx, cpy, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#2B4E30';
        ctx.shadowColor = '#2B4E30';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label above
        ctx.font = '800 9px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#334338';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`🚩 CP${idx + 1} (${cp.km_distance}k)`, cpx, padT + 12);
      });
    }

    // ── Hover Crosshair & Scrubbing Indicator ──
    if (activeHoverDist != null) {
      const hPt = findNearestPointByDist(pts, activeHoverDist);
      if (hPt) {
        const hx = getX(hPt.distKm);
        const hy = getY(hPt.ele);

        // Vertical guide line
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#D1A980';
        ctx.lineWidth = 1.5;
        ctx.moveTo(hx, padT);
        ctx.lineTo(hx, baselineY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Highlight circle on curve
        ctx.beginPath();
        ctx.arc(hx, hy, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = '#D1A980';
        ctx.shadowColor = '#D1A980';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(hx, hy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }
    }
  }

  // ── Scrubbing Handlers (Mouse & Touch) ──
  function handleScrub(clientX) {
    if (!gpxData || !gpxData.points || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const padL = 48;
    const padR = 20;
    const plotW = rect.width - padL - padR;
    const totalDist = gpxData.stats.totalKm;

    const mx = clientX - rect.left;
    if (mx < padL || mx > rect.width - padR) {
      endScrub();
      return;
    }

    const distRatio = Math.max(0, Math.min(1, (mx - padL) / plotW));
    const targetKm = distRatio * totalDist;
    activeHoverDist = targetKm;

    const pt = findNearestPointByDist(gpxData.points, targetKm);
    if (!pt) return;

    redrawElevationChart();

    // Update floating tooltip
    const colors = getGradeColor(pt.gradePct);
    tooltip.innerHTML = `
      <div class="elev-tooltip-row">
        <span><strong>${pt.distKm}</strong> km</span>
        <span style="opacity:0.4">·</span>
        <span><strong>${Math.round(pt.ele)}</strong> m</span>
        <span class="elev-tooltip-grade" style="background:${colors.badgeBg};color:${colors.badgeColor}">
          ${pt.gradePct >= 0 ? '+' : ''}${pt.gradePct}%
        </span>
      </div>
    `;
    tooltip.style.display = 'block';
    const tooltipX = Math.max(40, Math.min(rect.width - 40, mx));
    tooltip.style.left = `${tooltipX}px`;

    // Sync to Leaflet Map Marker
    if (!scrubMarker) {
      scrubMarker = L.marker([pt.lat, pt.lng], { icon: scrubIcon, zIndexOffset: 2000 }).addTo(map);
    } else {
      scrubMarker.setLatLng([pt.lat, pt.lng]);
      if (!map.hasLayer(scrubMarker)) scrubMarker.addTo(map);
    }
  }

  function endScrub() {
    activeHoverDist = null;
    if (tooltip) tooltip.style.display = 'none';
    if (scrubMarker && map.hasLayer(scrubMarker)) {
      map.removeLayer(scrubMarker);
    }
    redrawElevationChart();
  }

  if (canvas) {
    canvas.addEventListener('mousemove', e => handleScrub(e.clientX));
    canvas.addEventListener('mouseleave', endScrub);
    canvas.addEventListener('touchstart', e => {
      if (e.touches.length) handleScrub(e.touches[0].clientX);
    }, { passive: true });
    canvas.addEventListener('touchmove', e => {
      if (e.touches.length) handleScrub(e.touches[0].clientX);
    }, { passive: true });
    canvas.addEventListener('touchend', endScrub);
  }

  let resizeTimeout = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      map.invalidateSize();
      redrawElevationChart();
    }, 120);
  });

  // ── Load GPX route & Komoot Stats ──
  if (event.gpx_path) {
    try {
      const gpxText = await fetch(event.gpx_path).then(r => r.text());
      gpxData       = parseGpxData(gpxText);
      routeCoords   = gpxData.coords;
      routeKm       = gpxData.stats.totalKm;

      if (routeCoords.length) {
        // Warm halo/casing — soft cream border so route stands out on any tile layer
        L.polyline(routeCoords, {
          color: '#E5E0D8',
          weight: 6.5,
          opacity: 0.80,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);

        // Core route polyline — Deep Sage Forest (#2B4E30) matches palette & is clearly readable on standard maps
        const poly = L.polyline(routeCoords, {
          color: '#2B4E30',
          weight: 3.5,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);

        polylineBounds = poly.getBounds();
        map.fitBounds(polylineBounds, { padding: [40, 40] });

        // Start / Finish button markers — unified cohesive button style
        const startPt = routeCoords[0];
        const endPt   = routeCoords[routeCoords.length - 1];
        const isLoop  = Math.abs(startPt[0] - endPt[0]) < 0.0005 && Math.abs(startPt[1] - endPt[1]) < 0.0005;

        if (isLoop) {
          const loopIcon = L.divIcon({
            className: 'route-flag-marker',
            html: `
              <div class="route-flag-btn btn-loop">
                <span class="route-flag-chip chip-start">▶</span>
                <span class="route-flag-label">START / FINISH</span>
                <span class="route-flag-chip chip-finish">🏁</span>
              </div>
            `,
            iconSize: [0, 0],
            iconAnchor: [15, 14]
          });
          L.marker(startPt, { icon: loopIcon, zIndexOffset: 850 }).addTo(map);
        } else {
          const startIcon = L.divIcon({
            className: 'route-flag-marker',
            html: `
              <div class="route-flag-btn btn-start">
                <span class="route-flag-chip">▶</span>
                <span class="route-flag-label">START</span>
              </div>
            `,
            iconSize: [0, 0],
            iconAnchor: [15, 14]
          });
          const finishIcon = L.divIcon({
            className: 'route-flag-marker',
            html: `
              <div class="route-flag-btn btn-finish">
                <span class="route-flag-chip">🏁</span>
                <span class="route-flag-label">FINISH</span>
              </div>
            `,
            iconSize: [0, 0],
            iconAnchor: [15, 14]
          });

          L.marker(startPt, { icon: startIcon, zIndexOffset: 850 }).addTo(map);
          L.marker(endPt, { icon: finishIcon, zIndexOffset: 850 }).addTo(map);
        }
        renderCheckpointMarkers();

        document.getElementById('eventStats').textContent = `${routeKm} km · ${riders.length} Rider · ${checkpoints.length} CP`;

        // ── Populate Komoot Elevation Metrics ──
        document.getElementById('elevStatDist').textContent = gpxData.stats.totalKm;
        document.getElementById('elevStatTime').textContent = gpxData.stats.estTime;
        document.getElementById('elevStatGain').textContent = `+${gpxData.stats.elevGain.toLocaleString()}`;
        document.getElementById('elevStatLoss').textContent = `-${gpxData.stats.elevLoss.toLocaleString()}`;

        const diffEl = document.getElementById('elevStatDiff');
        diffEl.textContent = gpxData.stats.difficulty;
        diffEl.className = `elev-pill-badge diff-${gpxData.stats.difficulty.toLowerCase()}`;

        document.getElementById('elevStatSpeed').textContent = `${gpxData.stats.difficulty}: ${gpxData.stats.avgSpeed}`;

        setTimeout(redrawElevationChart, 60);
      } else {
        document.getElementById('eventStats').textContent = `${riders.length} Rider`;
        toggleElevation(false);
      }
    } catch (err) {
      console.warn('GPX parse error:', err);
      document.getElementById('eventStats').textContent = `${riders.length} Rider`;
      toggleElevation(false);
    }
  } else {
    document.getElementById('eventStats').textContent = `Belum ada rute GPX · ${riders.length} Rider`;
    toggleElevation(false);
  }

  // ── Marker cluster group ──
  const clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 50,
    disableClusteringAtZoom: 16,
    iconCreateFunction: cluster => {
      const n = cluster.getChildCount();
      return L.divIcon({
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:rgba(255,255,255,0.96);
          border:2.5px solid var(--color-sage);
          display:flex;align-items:center;justify-content:center;
          color:var(--color-sage);font-weight:900;font-size:13px;
          box-shadow:0 3px 12px rgba(28,40,38,0.15)
        ">${n}</div>`,
        className: '', iconSize: [36, 36], iconAnchor: [18, 18]
      });
    }
  });
  map.addLayer(clusterGroup);

  // ── Checkpoint Markers & Cut-Off Time (COT) Engine ──
  const cpMarkers = [];
  function renderCheckpointMarkers() {
    cpMarkers.forEach(m => map.removeLayer(m));
    cpMarkers.length = 0;

    if (!checkpoints || !checkpoints.length) return;

    checkpoints.forEach((cp, idx) => {
      let lat = cp.latitude;
      let lng = cp.longitude;
      if ((lat == null || lng == null) && gpxData && gpxData.points && gpxData.points.length) {
        const nearestPt = findNearestPointByDist(gpxData.points, cp.km_distance);
        if (nearestPt) {
          lat = nearestPt.lat;
          lng = nearestPt.lon;
        }
      }

      if (lat != null && lng != null) {
        const cpIcon = L.divIcon({
          html: `
            <div class="cp-map-marker" style="
              background: rgba(255, 255, 255, 0.96);
              border: 2px solid var(--color-sage);
              color: var(--color-sage);
              padding: 3px 8px;
              border-radius: 6px;
              font-size: 11px;
              font-weight: 800;
              white-space: nowrap;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
              display: flex;
              align-items: center;
              gap: 4px;
              cursor: pointer;
            ">
              <span>🚩</span>
              <span>${cp.name}</span>
              <span style="color:#FFF;background:var(--color-sage);padding:1px 5px;border-radius:4px;font-size:10px">${cp.km_distance}K</span>
            </div>
          `,
          className: '',
          iconAnchor: [30, 14]
        });

        const popupHtml = `
          <div style="font-family:Inter,sans-serif;min-width:180px">
            <div style="font-size:11px;font-weight:800;color:var(--color-sage);text-transform:uppercase;letter-spacing:0.5px">CHECKPOINT ${idx + 1}</div>
            <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin:4px 0">${cp.name}</div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);border-top:1px solid var(--border);padding-top:6px;margin-top:6px">
              <span>Jarak: <strong style="color:var(--color-sage)">${cp.km_distance} km</strong></span>
              <span>COT: <strong style="color:var(--color-red)">${cp.close_time || '—'}</strong></span>
            </div>
          </div>
        `;

        const m = L.marker([lat, lng], { icon: cpIcon }).addTo(map);
        m.bindPopup(popupHtml);
        cpMarkers.push(m);
      }
    });
  }

  function checkCotStatus(arrivalDate, openTimeStr, closeTimeStr) {
    if (!closeTimeStr) return 'IN_TIME';
    try {
      if (closeTimeStr.includes(':')) {
        const parts = closeTimeStr.split(':');
        const closeDate = new Date(arrivalDate);
        closeDate.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), parseInt(parts[2] || 0, 10), 0);
        return arrivalDate.getTime() <= closeDate.getTime() ? 'IN_TIME' : 'OVER_COT';
      } else {
        const closeDate = new Date(closeTimeStr);
        if (!isNaN(closeDate.getTime())) {
          return arrivalDate.getTime() <= closeDate.getTime() ? 'IN_TIME' : 'OVER_COT';
        }
      }
    } catch (e) {
      console.warn('COT check parse error:', e);
    }
    return 'IN_TIME';
  }

  function createRiderIcon(rider, isOffRoute) {
    const color = isOffRoute ? '#EF4444' : (rider.color || '#FFE600');
    const offRouteTag = isOffRoute
      ? `<div style="
          position:absolute;top:-34px;left:50%;transform:translateX(-50%);
          background:#EF4444;color:#FFFFFF;font-size:9px;font-weight:900;
          padding:1px 6px;border-radius:100px;white-space:nowrap;
          box-shadow:0 0 12px #EF4444;animation:pulse 1.2s infinite;
        ">⚠️ NYASAR</div>`
      : '';

    return L.divIcon({
      html: `
        <div style="position:relative;width:20px;height:20px">
          ${offRouteTag}
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
    if (elapsedSec <= 300) return { text: 'Idle', color: '#D1A980', dot: '🟠' };
    return { text: 'Blank Spot', color: '#94A3B8', dot: '⚪' };
  }

  // ── Core Function: Update Single Rider Position ──
  function updateRiderPosition(deviceId, pos) {
    const rider = riderById[deviceId];
    if (!rider) return;

    const latlng = [pos.latitude, pos.longitude];
    const fixTime = pos.fixTime || pos.deviceTime || new Date().toISOString();

    // 1. Determine base speed in km/h
    let speedKmh = null;
    if (pos.speed != null) {
      const raw = Number(pos.speed);
      if (!isNaN(raw)) {
        speedKmh = Math.max(0, Math.round(pos.isKmh ? raw : (raw * 1.852)));
      }
    }

    // 2. Nearest-point route calculation & Off-Route detection
    let calc = { progressPct: 0, distanceKm: 0 };
    if (routeCoords.length) {
      calc = findNearestRoutePoint(pos.latitude, pos.longitude, routeCoords, routeKm);
    }

    // Auto-detect Checkpoint crossing & record split time
    if (checkpoints && checkpoints.length && calc.distanceKm > 0) {
      checkpoints.forEach(cp => {
        const cacheKey = `${rider.id}_${cp.id}`;
        if (!splitsCache[cacheKey] && calc.distanceKm >= cp.km_distance) {
          const now = new Date(fixTime || Date.now());
          const cotStatus = checkCotStatus(now, cp.open_time, cp.close_time);
          const arrivalIso = now.toISOString();

          splitsCache[cacheKey] = {
            rider_id: rider.id,
            checkpoint_id: cp.id,
            cp_name: cp.name,
            km_distance: cp.km_distance,
            arrival_time: arrivalIso,
            status: cotStatus
          };

          fetch(`/api/events/${eventId}/splits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rider_id: rider.id,
              checkpoint_id: cp.id,
              arrival_time: arrivalIso,
              status: cotStatus
            })
          }).then(res => res.json()).then(saved => {
            if (saved && saved.id) splitsCache[cacheKey] = saved;
          }).catch(e => console.warn('Gagal simpan split:', e));

          const clockStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const cotMsg = cotStatus === 'IN_TIME' ? '✅ Lolos COT' : '⏱️ Melebihi COT';
          showToast(`🚩 #${rider.bib} ${rider.name} tiba di ${cp.name} (${clockStr}) — ${cotMsg}!`, cotStatus === 'IN_TIME' ? 'success' : 'warning');
        }
      });
    }

    let offRoute = { isOffRoute: false, deviationMeters: 0 };
    if (routeCoords.length && typeof checkOffRoute === 'function') {
      offRoute = checkOffRoute(pos.latitude, pos.longitude, routeCoords, 100);
    }

    let batteryLevel = null;
    if (pos.attributes && pos.attributes.batteryLevel != null) {
      batteryLevel = Math.round(Number(pos.attributes.batteryLevel));
    } else if (pos.battery != null) {
      batteryLevel = Math.round(Number(pos.battery));
    }

    // 3. Initialize or retrieve rider telemetry state
    if (!telemetryById[deviceId]) {
      telemetryById[deviceId] = {
        history: [],
        movingAvg: 0,
        currentSpeed: 0,
        remainingKm: 0,
        etaTime: '-',
        etaDuration: '-',
        etaBadgeClass: 'eta-idle',
        batteryLevel: null,
        isOffRoute: false,
        deviationMeters: 0,
        isFinished: false
      };
    }
    const telem = telemetryById[deviceId];
    if (batteryLevel != null) telem.batteryLevel = batteryLevel;
    telem.isOffRoute = offRoute.isOffRoute;
    telem.deviationMeters = offRoute.deviationMeters;

    // Periodic telemetry history logging (every ~4s per rider)
    if (rider && rider.id && !isReplayActive) {
      const nowMs = Date.now();
      const lastLogged = lastHistoryLogByRider[rider.id] || 0;
      if (nowMs - lastLogged >= 4000) {
        lastHistoryLogByRider[rider.id] = nowMs;
        fetch(`/api/events/${eventId}/history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rider_id: rider.id,
            latitude: pos.latitude,
            longitude: pos.longitude,
            speed: speedKmh,
            distance_km: calc.distanceKm,
            recorded_at: fixTime
          })
        }).catch(() => {});
      }
    }

    // 4. Compute ground speed from distance delta if speed is missing or 0 while advancing
    const nowMs = new Date(fixTime).getTime() || Date.now();
    const prevPt = telem.history[telem.history.length - 1];
    if (prevPt) {
      const dtHr = (nowMs - prevPt.timeMs) / 3600000;
      const dDistKm = calc.distanceKm - prevPt.distanceKm;
      if (dtHr > 0.001 && dDistKm > 0) {
        const derivedSpeed = Math.round((dDistKm / dtHr) * 10) / 10;
        if (speedKmh == null || (speedKmh === 0 && derivedSpeed > 1)) {
          speedKmh = Math.min(90, Math.max(0, Math.round(derivedSpeed)));
        }
      }
    }
    if (speedKmh == null) speedKmh = 0;

    // 5. Push into rolling history window (up to 8 points)
    telem.history.push({
      timeMs: nowMs,
      distanceKm: calc.distanceKm,
      speed: speedKmh
    });
    if (telem.history.length > 8) telem.history.shift();

    // 6. Calculate Moving Average Speed (filtering out stops)
    const validMoving = telem.history.filter(h => h.speed > 2);
    if (validMoving.length >= 2) {
      const first = validMoving[0];
      const last = validMoving[validMoving.length - 1];
      const dtHr = (last.timeMs - first.timeMs) / 3600000;
      const dKm = last.distanceKm - first.distanceKm;
      if (dtHr > 0.001 && dKm > 0) {
        telem.movingAvg = Math.round((dKm / dtHr) * 10) / 10;
      } else {
        const sum = validMoving.reduce((acc, h) => acc + h.speed, 0);
        telem.movingAvg = Math.round((sum / validMoving.length) * 10) / 10;
      }
    } else if (validMoving.length === 1) {
      telem.movingAvg = validMoving[0].speed;
    } else {
      telem.movingAvg = speedKmh > 0 ? speedKmh : 0;
    }

    telem.currentSpeed = speedKmh;

    // 7. Route distance remaining & ETA calculation
    const totalDist = routeKm || (gpxData && gpxData.stats ? gpxData.stats.totalKm : 0);
    const remainingKm = Math.max(0, Math.round((totalDist - calc.distanceKm) * 10) / 10);
    telem.remainingKm = remainingKm;

    const isFinished = calc.progressPct >= 99 || (totalDist > 0 && remainingKm <= 0.15);
    telem.isFinished = isFinished;

    if (isFinished) {
      telem.etaTime = 'FINISH';
      telem.etaDuration = 'Tiba di Finish';
      telem.etaBadgeClass = 'eta-finished';
    } else if (totalDist > 0 && remainingKm > 0) {
      const speedRef = telem.movingAvg > 3 ? telem.movingAvg : (telem.currentSpeed > 3 ? telem.currentSpeed : 0);
      if (speedRef >= 3) {
        const hoursLeft = remainingKm / speedRef;
        const etaDate = new Date(Date.now() + (hoursLeft * 3600 * 1000));
        const hh = String(etaDate.getHours()).padStart(2, '0');
        const mm = String(etaDate.getMinutes()).padStart(2, '0');
        telem.etaTime = `${hh}:${mm}`;

        const totalMin = Math.round(hoursLeft * 60);
        if (totalMin < 60) {
          telem.etaDuration = `~${totalMin}m`;
        } else {
          const h = Math.floor(totalMin / 60);
          const m = totalMin % 60;
          telem.etaDuration = m > 0 ? `~${h}j ${m}m` : `~${h}j`;
        }
        telem.etaBadgeClass = 'eta-active';
      } else {
        telem.etaTime = 'Diam';
        telem.etaDuration = 'Berhenti';
        telem.etaBadgeClass = 'eta-idle';
      }
    } else {
      telem.etaTime = '-';
      telem.etaDuration = '-';
      telem.etaBadgeClass = 'eta-idle';
    }

    // Remove old marker from cluster
    if (markerById[deviceId]) {
      clusterGroup.removeLayer(markerById[deviceId]);
    }

    const status = getRiderStatus(fixTime);
    const batBadge = telem.batteryLevel != null
      ? `<span class="battery-pill ${telem.batteryLevel < 20 ? 'battery-low' : 'battery-good'}">
           ${telem.batteryLevel < 20 ? '🪫' : '🔋'} ${telem.batteryLevel}%
         </span>`
      : '';

    // Create new marker with comprehensive telemetry popup
    const marker = L.marker(latlng, { icon: createRiderIcon(rider, telem.isOffRoute) });
    marker.bindPopup(`
      <div class="rider-map-popup">
        <div class="popup-header">
          <div class="popup-title-group">
            <div class="popup-rider-name">${rider.name}</div>
            <div class="popup-rider-bib" style="color:${rider.color || 'var(--color-yellow)'}">BIB #${rider.bib}</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            ${batBadge}
            <span class="popup-status-badge" style="background:${status.color}22;color:${status.color};border:1px solid ${status.color}55">
              ${status.dot} ${status.text}
            </span>
          </div>
        </div>

        ${telem.isOffRoute ? `
          <div style="background:rgba(239,68,68,0.2);color:#B91C1C;border:1px solid #EF4444;border-radius:6px;padding:6px 10px;font-size:11px;font-weight:800;margin-bottom:10px;text-align:center">
            ⚠️ PERINGATAN: KELUAR DARI RUTE RESMI (+${telem.deviationMeters} meter)
          </div>
        ` : ''}

        <div class="popup-metrics-grid">
          <div class="popup-metric-box">
            <div class="popup-metric-label">⚡ Kecepatan</div>
            <div class="popup-metric-value">${telem.currentSpeed} <span class="popup-metric-unit">km/h</span></div>
            <div class="popup-metric-sub">Avg: ${telem.movingAvg || telem.currentSpeed} km/h</div>
          </div>

          <div class="popup-metric-box">
            <div class="popup-metric-label">📏 Jarak Ditempuh</div>
            <div class="popup-metric-value">${calc.distanceKm} <span class="popup-metric-unit">km</span></div>
            <div class="popup-metric-sub">Sisa: ${telem.remainingKm} km</div>
          </div>

          <div class="popup-metric-box full-width">
            <div class="popup-metric-label">🏁 Estimasi Finish (ETA)</div>
            <div class="popup-metric-value highlight">
              ${isFinished ? '🏁 Selesai di Garis Finish' : `${telem.etaTime} (${telem.etaDuration})`}
            </div>
            <div class="popup-metric-sub">
              ${isFinished ? 'Rute 100% tuntas' : `Ritme rata-rata ${telem.movingAvg || telem.currentSpeed || 20} km/h`}
            </div>
          </div>
        </div>

        ${checkpoints && checkpoints.length ? `
          <div class="popup-cp-splits">
            <div class="popup-cp-title">🚩 CHECKPOINTS & CUT-OFF TIME</div>
            <div class="popup-cp-grid">
              ${checkpoints.map((cp, idx) => {
                const sp = splitsCache[`${rider.id}_${cp.id}`];
                if (sp) {
                  const d = new Date(sp.arrival_time);
                  const tStr = !isNaN(d.getTime()) ? d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : sp.arrival_time;
                  const isPass = sp.status === 'IN_TIME';
                  return `<div class="cp-split-chip ${isPass ? 'split-pass' : 'split-fail'}" title="${cp.name}">
                    <span>${cp.name.split(' ')[0] || `CP${idx+1}`}: <strong>${tStr}</strong></span>
                    <span>${isPass ? '✓' : '⚠️ COT'}</span>
                  </div>`;
                } else {
                  return `<div class="cp-split-chip split-pending" title="${cp.name}">
                    <span>${cp.name.split(' ')[0] || `CP${idx+1}`}: ${cp.km_distance}km</span>
                  </div>`;
                }
              }).join('')}
            </div>
          </div>
        ` : ''}

        <div class="popup-footer">
          Update: <strong>${formatTimeAgo(fixTime)}</strong>
        </div>
      </div>
    `);

    clusterGroup.addLayer(marker);
    markerById[deviceId] = marker;

    // Save state for leaderboard
    progressById[deviceId] = {
      ...calc,
      speed: telem.currentSpeed,
      movingAvg: telem.movingAvg,
      remainingKm: telem.remainingKm,
      etaTime: telem.etaTime,
      etaDuration: telem.etaDuration,
      etaBadgeClass: telem.etaBadgeClass,
      batteryLevel: telem.batteryLevel,
      isOffRoute: telem.isOffRoute,
      deviationMeters: telem.deviationMeters,
      isFinished: telem.isFinished,
      lastTime: fixTime
    };

    updateLeaderboard();
  }

  // ── Leaderboard Sort Mode Toggle State ──
  let leaderboardSortMode = 'bib'; // 'bib' (default, cards stay static & fixed) or 'rank' (sorted by distance)

  const btnSortBib = document.getElementById('btnSortBib');
  const btnSortRank = document.getElementById('btnSortRank');
  if (btnSortBib && btnSortRank) {
    btnSortBib.addEventListener('click', () => {
      leaderboardSortMode = 'bib';
      btnSortBib.classList.add('active');
      btnSortRank.classList.remove('active');
      updateLeaderboard();
    });
    btnSortRank.addEventListener('click', () => {
      leaderboardSortMode = 'rank';
      btnSortRank.classList.add('active');
      btnSortBib.classList.remove('active');
      updateLeaderboard();
    });
  }

  // ── Leaderboard renderer & search filter ──
  function updateLeaderboard() {
    // 1. Calculate live race ranks based on distance
    const rankByDevId = {};
    const sortedRanks = Object.entries(progressById)
      .map(([devId, prog]) => ({ devId, ...prog }))
      .sort((a, b) => b.distanceKm - a.distanceKm || b.progressPct - a.progressPct);

    sortedRanks.forEach((item, idx) => {
      rankByDevId[item.devId] = idx + 1;
    });

    let entries = Object.entries(progressById)
      .map(([deviceId, prog]) => ({ rider: riderById[deviceId], ...prog }))
      .filter(e => e.rider);

    // 2. Sort according to user preference
    if (leaderboardSortMode === 'bib') {
      // Sort by BIB number (stays completely fixed & static)
      entries.sort((a, b) => {
        const numA = parseInt(String(a.rider.bib).replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(String(b.rider.bib).replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });
    } else {
      // Sort by distance (race rank leader)
      entries.sort((a, b) => b.distanceKm - a.distanceKm || b.progressPct - a.progressPct);
    }

    // 3. Search filter
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

    // Clear placeholder message if it was shown
    const emptyPlaceholder = leaderboardEl.querySelector(':scope > div:not(.leaderboard-item)');
    if (emptyPlaceholder) emptyPlaceholder.remove();

    entries.forEach((e, i) => {
      const devId = e.rider.traccar_device_id;
      const raceRank = rankByDevId[devId] || (i + 1);
      const rankDisplay = raceRank <= 3 ? ['🥇','🥈','🥉'][raceRank - 1] : `#${raceRank}`;
      const status = getRiderStatus(e.lastTime);
      const isMoving = e.speed > 2;

      let card = document.getElementById(`rider-card-${devId}`);
      if (!card) {
        card = document.createElement('div');
        card.id = `rider-card-${devId}`;
        card.className = 'leaderboard-item';
        card.onclick = () => panToRider(devId);
        card.innerHTML = `
          <div class="leaderboard-rank ${raceRank <= 3 ? 'top' : ''}">${rankDisplay}</div>
          <div class="rider-avatar" style="background:${e.rider.color || '#FFE600'}">${e.rider.bib}</div>
          <div class="leaderboard-info">
            <div class="leaderboard-name-row">
              <span class="leaderboard-name">${e.rider.name}</span>
              <span class="leaderboard-bib-tag">#${e.rider.bib}</span>
              <button class="btn-compare-rider ${comparingRiderId === e.rider.id ? 'active' : ''}" onclick="event.stopPropagation(); triggerCompareRider(${e.rider.id})" title="Bandingkan rider">
                ⚔️ ${comparingRiderId === e.rider.id ? 'Batal' : 'VS'}
              </button>
            </div>
            <div class="leaderboard-telemetry-row">
              <span class="telemetry-pill speed-pill ${isMoving ? 'moving' : 'idle'}">
                ⚡ <span class="val-speed">${e.speed}</span> km/h
              </span>
              <span class="telemetry-pill eta-pill ${e.etaBadgeClass || 'eta-idle'}">
                🏁 <span class="val-eta">${e.isFinished ? 'Finish' : `${e.etaTime} (${e.etaDuration})`}</span>
              </span>
              <span class="offroute-pill" style="display:${e.isOffRoute ? 'inline-flex' : 'none'}">
                ⚠️ NYASAR (+<span class="val-deviation">${e.deviationMeters}</span>m)
              </span>
              <span class="battery-pill ${e.batteryLevel != null && e.batteryLevel < 20 ? 'battery-low' : 'battery-good'}" style="display:${e.batteryLevel != null ? 'inline-flex' : 'none'}">
                <span class="val-bat-icon">${e.batteryLevel != null && e.batteryLevel < 20 ? '🪫' : '🔋'}</span> <span class="val-bat">${e.batteryLevel != null ? e.batteryLevel : ''}</span>%
              </span>
              ${(() => {
                const rSplits = checkpoints ? checkpoints.map(cp => splitsCache[`${e.rider.id}_${cp.id}`]).filter(Boolean) : [];
                const latSp = rSplits.length ? rSplits[rSplits.length - 1] : null;
                if (!latSp) return '';
                const arrD = new Date(latSp.arrival_time);
                const tStr = !isNaN(arrD.getTime()) ? arrD.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : latSp.arrival_time;
                const isPass = latSp.status === 'IN_TIME';
                return `<span class="cp-pill ${isPass ? 'cp-in-time' : 'cp-over-cot'}">🚩 ${latSp.cp_name || 'CP'}: ${tStr} (${isPass ? '✓' : '⚠️ COT'})</span>`;
              })()}
            </div>
            <div class="leaderboard-status-sub">
              <span class="val-status" style="font-size:10px;color:${status.color}">${status.dot} ${status.text}</span>
              <span class="time-ago-sub">• <span class="val-timeago">${formatTimeAgo(e.lastTime)}</span></span>
            </div>
          </div>
          <div class="leaderboard-stat">
            <div class="leaderboard-km"><span class="val-km">${e.distanceKm}</span> <span class="km-unit">km</span></div>
            <div class="leaderboard-progress-bar-wrap">
              <div class="leaderboard-progress-bar-fill" style="width:${e.progressPct}%;background:${e.rider.color || 'var(--color-yellow)'}"></div>
            </div>
            <div class="leaderboard-pct"><span class="val-pct">${e.progressPct}</span>%</div>
          </div>
        `;
        leaderboardEl.appendChild(card);
      } else {
        // In-place updates: zero flickering, zero vertical jumping!
        const btnComp = card.querySelector('.btn-compare-rider');
        if (btnComp) {
          btnComp.className = `btn-compare-rider ${comparingRiderId === e.rider.id ? 'active' : ''}`;
          btnComp.innerHTML = `⚔️ ${comparingRiderId === e.rider.id ? 'Batal' : 'VS'}`;
        }

        const rankEl = card.querySelector('.leaderboard-rank');
        if (rankEl) {
          rankEl.textContent = rankDisplay;
          rankEl.className = `leaderboard-rank ${raceRank <= 3 ? 'top' : ''}`;
        }

        const speedPill = card.querySelector('.speed-pill');
        if (speedPill) {
          speedPill.className = `telemetry-pill speed-pill ${isMoving ? 'moving' : 'idle'}`;
          const valSpeed = speedPill.querySelector('.val-speed');
          if (valSpeed) valSpeed.textContent = e.speed;
        }

        const etaPill = card.querySelector('.eta-pill');
        if (etaPill) {
          etaPill.className = `telemetry-pill eta-pill ${e.etaBadgeClass || 'eta-idle'}`;
          const valEta = etaPill.querySelector('.val-eta');
          if (valEta) valEta.textContent = e.isFinished ? 'Finish' : `${e.etaTime} (${e.etaDuration})`;
        }

        const offRoutePill = card.querySelector('.offroute-pill');
        if (offRoutePill) {
          offRoutePill.style.display = e.isOffRoute ? 'inline-flex' : 'none';
          const valDev = offRoutePill.querySelector('.val-deviation');
          if (valDev) valDev.textContent = e.deviationMeters;
        }

        const batPill = card.querySelector('.battery-pill');
        if (batPill) {
          batPill.style.display = e.batteryLevel != null ? 'inline-flex' : 'none';
          batPill.className = `battery-pill ${e.batteryLevel != null && e.batteryLevel < 20 ? 'battery-low' : 'battery-good'}`;
          const valBatIcon = batPill.querySelector('.val-bat-icon');
          if (valBatIcon) valBatIcon.textContent = e.batteryLevel != null && e.batteryLevel < 20 ? '🪫' : '🔋';
          const valBat = batPill.querySelector('.val-bat');
          if (valBat) valBat.textContent = e.batteryLevel != null ? e.batteryLevel : '';
        }

        // Checkpoint in-place update
        const rSplits = checkpoints ? checkpoints.map(cp => splitsCache[`${e.rider.id}_${cp.id}`]).filter(Boolean) : [];
        const latSp = rSplits.length ? rSplits[rSplits.length - 1] : null;
        let cpPill = card.querySelector('.cp-pill');
        if (latSp) {
          const arrD = new Date(latSp.arrival_time);
          const tStr = !isNaN(arrD.getTime()) ? arrD.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : latSp.arrival_time;
          const isPass = latSp.status === 'IN_TIME';
          if (!cpPill) {
            const telemRow = card.querySelector('.leaderboard-telemetry-row');
            if (telemRow) {
              cpPill = document.createElement('span');
              telemRow.appendChild(cpPill);
            }
          }
          if (cpPill) {
            cpPill.style.display = 'inline-flex';
            cpPill.className = `cp-pill ${isPass ? 'cp-in-time' : 'cp-over-cot'}`;
            cpPill.innerHTML = `🚩 ${latSp.cp_name || 'CP'}: ${tStr} (${isPass ? '✓' : '⚠️ COT'})`;
          }
        } else if (cpPill) {
          cpPill.style.display = 'none';
        }

        const statusEl = card.querySelector('.val-status');
        if (statusEl) {
          statusEl.textContent = `${status.dot} ${status.text}`;
          statusEl.style.color = status.color;
        }

        const timeAgoEl = card.querySelector('.val-timeago');
        if (timeAgoEl) timeAgoEl.textContent = formatTimeAgo(e.lastTime);

        const kmEl = card.querySelector('.val-km');
        if (kmEl) kmEl.textContent = e.distanceKm;

        const pctEl = card.querySelector('.val-pct');
        if (pctEl) pctEl.textContent = e.progressPct;

        const barFill = card.querySelector('.leaderboard-progress-bar-fill');
        if (barFill) barFill.style.width = `${e.progressPct}%`;

        // Reorder card DOM position smoothly
        leaderboardEl.appendChild(card);
      }
    });

    redrawElevationChart();
  }

  if (canvas) {
    canvas.addEventListener('click', e => {
      if (!gpxData || !gpxData.points) return;
      const rect = canvas.getBoundingClientRect();
      const padL = 48;
      const padR = 20;
      const plotW = rect.width - padL - padR;
      const totalDist = gpxData.stats.totalKm;
      const mx = e.clientX - rect.left;
      if (mx < padL || mx > rect.width - padR) return;
      const targetKm = ((mx - padL) / plotW) * totalDist;
      const pt = findNearestPointByDist(gpxData.points, targetKm);
      if (pt) {
        map.panTo([pt.lat, pt.lng]);
      }
    });
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

    const baseBatteries = [94, 78, 17]; // Rider 3 has low battery (17%) to demonstrate low battery alert

    const simState = demoRiders.map((r, idx) => {
      const devId = r.traccar_device_id || (idx + 9001);
      r.traccar_device_id = devId;
      riderById[devId] = r;
      bibToRider[r.bib] = r;

      // Stagger initial progress along route
      const staggerIndex = Math.min(Math.floor((idx + 1) * (routeCoords.length / (demoRiders.length + 3))), routeCoords.length - 2);
      return {
        rider: r,
        devId,
        currentIndex: staggerIndex,
        baseSpeed: 24 + (idx * 3.5),
        stepSize: Math.max(1, Math.floor(routeCoords.length / 100)) + (idx * 2),
        battery: baseBatteries[idx % baseBatteries.length],
        tick: 0
      };
    });

    function advanceSim() {
      simState.forEach(sim => {
        sim.tick++;
        sim.currentIndex = (sim.currentIndex + sim.stepSize) % routeCoords.length;
        const pt = routeCoords[sim.currentIndex];

        // Rider 2 occasionally simulates a wrong turn off-route (+150m) to test warning pill
        const isOffRouteSim = (sim.rider.bib === '002' || sim.rider.bib === '2') && (sim.tick % 8 >= 4);
        const latOffset = isOffRouteSim ? 0.0015 : (Math.random() - 0.5) * 0.00015;
        const lngOffset = isOffRouteSim ? 0.0015 : (Math.random() - 0.5) * 0.00015;

        const lat = pt[0] + latOffset;
        const lng = pt[1] + lngOffset;
        const currentSpeed = Math.round(sim.baseSpeed + (Math.random() - 0.5) * 3);

        updateRiderPosition(sim.devId, {
          latitude: lat,
          longitude: lng,
          speed: currentSpeed,
          isKmh: true,
          battery: sim.battery,
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

  // ── Active SOS Alerts System ──
  const emergencyBar        = document.getElementById('liveEmergencyBar');
  const emergencyText       = document.getElementById('emergencyText');
  const btnFocusEmergency   = document.getElementById('btnFocusEmergency');
  const btnResolveEmergency = document.getElementById('btnResolveEmergency');
  let currentAlerts         = [];
  let alertMarkers          = {};
  let notifiedAlertIds      = new Set();

  function playEmergencyChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch (err) {}
  }

  async function checkActiveAlerts() {
    try {
      const res = await fetch(`/api/events/${eventId}/alerts?active=1`);
      if (!res.ok) return;
      currentAlerts = await res.json();

      // Clear old alert markers
      Object.values(alertMarkers).forEach(m => map.removeLayer(m));
      alertMarkers = {};

      if (currentAlerts.length > 0) {
        const topAlert = currentAlerts[0];
        if (emergencyBar) emergencyBar.style.display = 'flex';
        if (emergencyText) {
          emergencyText.innerHTML = `
            <strong>#${topAlert.rider_bib || '?'} ${topAlert.rider_name || 'Rider'}</strong>
            — ${topAlert.type}: ${topAlert.message || 'Butuh bantuan segera'}
            <span style="opacity:0.75;margin-left:4px">(${formatTimeAgo(topAlert.created_at)})</span>
          `;
        }

        if (!notifiedAlertIds.has(topAlert.id)) {
          notifiedAlertIds.add(topAlert.id);
          playEmergencyChime();
        }

        // Add beacon markers on map
        currentAlerts.forEach(a => {
          if (a.latitude && a.longitude) {
            const sosIcon = L.divIcon({
              html: `<div class="sos-map-marker-beacon">🚨</div>`,
              className: '',
              iconSize: [28, 28],
              iconAnchor: [14, 14]
            });
            const m = L.marker([a.latitude, a.longitude], { icon: sosIcon, zIndexOffset: 3000 }).addTo(map);
            m.bindPopup(`
              <div style="color:#080A0F;padding:4px">
                <strong style="color:#EF4444;font-size:13px">🚨 SINYAL SOS DARURAT</strong><br>
                <strong>#${a.rider_bib || '?'} ${a.rider_name || 'Rider'}</strong><br>
                <span>Jenis: <strong>${a.type}</strong></span><br>
                <p style="margin:4px 0 8px 0;font-size:12px">${a.message || '-'}</p>
                <button onclick="resolveAlertDirect(${a.id})" style="background:#10B981;color:#FFF;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-weight:700;font-size:11px">
                  ✓ Tandai Kasus Selesai
                </button>
              </div>
            `);
            alertMarkers[a.id] = m;
          }
        });
      } else {
        if (emergencyBar) emergencyBar.style.display = 'none';
      }
    } catch (err) {
      console.warn('Alerts check error:', err);
    }
  }

  if (btnFocusEmergency) {
    btnFocusEmergency.addEventListener('click', () => {
      if (currentAlerts.length > 0) {
        const a = currentAlerts[0];
        if (a.latitude && a.longitude) {
          map.setView([a.latitude, a.longitude], 16);
          if (alertMarkers[a.id]) alertMarkers[a.id].openPopup();
        } else {
          showToast('Koordinat GPS darurat tidak tersedia.', 'info');
        }
      }
    });
  }

  if (btnResolveEmergency) {
    btnResolveEmergency.addEventListener('click', async () => {
      if (currentAlerts.length > 0) {
        const topAlert = currentAlerts[0];
        await resolveAlertDirect(topAlert.id);
      }
    });
  }

  window.resolveAlertDirect = async id => {
    try {
      const res = await fetch(`/api/alerts/${id}/resolve`, { method: 'PUT' });
      if (res.ok) {
        showToast('Kasus darurat berhasil diselesaikan ✓', 'success');
        checkActiveAlerts();
      }
    } catch (err) {
      showToast('Gagal update status alert', 'error');
    }
  };

  checkActiveAlerts();
  const alertCheckInterval = setInterval(checkActiveAlerts, 8000);


  // ── Time Machine Replay State & Handlers ──
  let isReplayActive = false;
  let isReplayPlaying = false;
  let replaySpeed = 1;
  let replayTimer = null;
  let replayHistory = [];
  let replayMinTime = 0;
  let replayMaxTime = 0;
  let replayCurrentTime = 0;
  const lastHistoryLogByRider = {};

  const replayControlBar = document.getElementById('replayControlBar');
  const btnToggleReplay = document.getElementById('btnToggleReplay');
  const btnReplayPlay = document.getElementById('btnReplayPlay');
  const replayClock = document.getElementById('replayClock');
  const replaySlider = document.getElementById('replaySlider');
  const replayStartTime = document.getElementById('replayStartTime');
  const replayEndTime = document.getElementById('replayEndTime');
  const btnExitReplay = document.getElementById('btnExitReplay');

  async function enterReplayMode() {
    isReplayActive = true;
    btnToggleReplay.classList.add('active');
    replayControlBar.style.display = 'block';

    try {
      const res = await fetch(`/api/events/${eventId}/history`);
      replayHistory = res.ok ? await res.json() : [];
    } catch {
      replayHistory = [];
    }

    // If history is empty, synthesize a replay history trail from GPX route
    if (!replayHistory.length && routeCoords.length) {
      const simRiders = riders.length ? riders : [
        { id: 1, bib: '001', name: 'Ahmad Rider', color: '#D1A980' },
        { id: 2, bib: '002', name: 'Budi Santoso', color: '#748873' }
      ];
      const baseStart = Date.now() - (7200 * 1000); // 2 hours ago
      simRiders.forEach((r, rIdx) => {
        const totalSteps = 40;
        for (let s = 0; s <= totalSteps; s++) {
          const coordIdx = Math.min(routeCoords.length - 1, Math.floor((s / totalSteps) * (routeCoords.length - (rIdx * 12))));
          const pt = routeCoords[coordIdx];
          const distKm = Math.round(((coordIdx / routeCoords.length) * (routeKm || 100)) * 10) / 10;
          const recTime = new Date(baseStart + (s * 180 * 1000) + (rIdx * 60 * 1000)).toISOString();
          replayHistory.push({
            rider_id: r.id,
            rider_name: r.name,
            rider_bib: r.bib,
            rider_color: r.color,
            latitude: pt[0],
            longitude: pt[1],
            speed: 25 + (rIdx * 2) + (s % 5),
            distance_km: distKm,
            recorded_at: recTime
          });
        }
      });
      replayHistory.sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
    }

    if (!replayHistory.length) {
      showToast('Belum ada data rekaman race untuk replay.', 'warning');
      exitReplayMode();
      return;
    }

    replayMinTime = new Date(replayHistory[0].recorded_at).getTime();
    replayMaxTime = new Date(replayHistory[replayHistory.length - 1].recorded_at).getTime();
    if (replayMaxTime <= replayMinTime) replayMaxTime = replayMinTime + 3600000;

    replayStartTime.textContent = new Date(replayMinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    replayEndTime.textContent = new Date(replayMaxTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    replayCurrentTime = replayMinTime;
    replaySlider.value = 0;
    applyReplayFrame(replayCurrentTime);
    showToast('Mode Time Machine Replay aktif! Geser slider atau tekan Play ⏱️', 'info');
  }

  function exitReplayMode() {
    isReplayActive = false;
    isReplayPlaying = false;
    if (replayTimer) clearInterval(replayTimer);
    replayTimer = null;
    btnToggleReplay.classList.remove('active');
    replayControlBar.style.display = 'none';
    btnReplayPlay.textContent = '▶';
    showToast('Kembali ke mode Live tracking 🔴', 'success');
  }

  function applyReplayFrame(timestampMs) {
    replayClock.textContent = new Date(timestampMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const riderPoints = {};
    replayHistory.forEach(h => {
      const ptTime = new Date(h.recorded_at).getTime();
      if (ptTime <= timestampMs) {
        if (!riderPoints[h.rider_id] || ptTime > riderPoints[h.rider_id].timeMs) {
          riderPoints[h.rider_id] = { ...h, timeMs: ptTime };
        }
      }
    });

    Object.values(riderPoints).forEach(pt => {
      const rider = riders.find(r => r.id === pt.rider_id) || {
        id: pt.rider_id,
        bib: pt.rider_bib,
        name: pt.rider_name,
        color: pt.rider_color,
        traccar_device_id: pt.rider_id
      };
      const devId = rider.traccar_device_id || pt.rider_id;
      riderById[devId] = rider;

      updateRiderPosition(devId, {
        latitude: pt.latitude,
        longitude: pt.longitude,
        speed: pt.speed,
        isKmh: true,
        fixTime: pt.recorded_at
      });
    });
  }

  function toggleReplayPlay() {
    if (isReplayPlaying) {
      isReplayPlaying = false;
      if (replayTimer) clearInterval(replayTimer);
      replayTimer = null;
      btnReplayPlay.textContent = '▶';
    } else {
      isReplayPlaying = true;
      btnReplayPlay.textContent = '⏸';
      const stepMs = 1000 * replaySpeed * 2.5;
      replayTimer = setInterval(() => {
        replayCurrentTime += stepMs;
        if (replayCurrentTime >= replayMaxTime) {
          replayCurrentTime = replayMaxTime;
          toggleReplayPlay();
        }
        const pct = ((replayCurrentTime - replayMinTime) / (replayMaxTime - replayMinTime)) * 100;
        replaySlider.value = Math.min(100, Math.max(0, pct));
        applyReplayFrame(replayCurrentTime);
      }, 150);
    }
  }

  btnToggleReplay?.addEventListener('click', () => {
    if (isReplayActive) exitReplayMode();
    else enterReplayMode();
  });
  btnReplayPlay?.addEventListener('click', toggleReplayPlay);
  btnExitReplay?.addEventListener('click', exitReplayMode);

  replaySlider?.addEventListener('input', e => {
    const pct = parseFloat(e.target.value) / 100;
    replayCurrentTime = replayMinTime + (pct * (replayMaxTime - replayMinTime));
    applyReplayFrame(replayCurrentTime);
  });

  document.querySelectorAll('.replay-speed-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      document.querySelectorAll('.replay-speed-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      replaySpeed = parseFloat(e.target.dataset.speed) || 1;
      if (isReplayPlaying) {
        toggleReplayPlay();
        toggleReplayPlay();
      }
    });
  });

  // ── Head-to-Head Comparison State & Engine ──
  let comparingRiderId = null;

  window.triggerCompareRider = function(riderId) {
    if (!comparingRiderId) {
      comparingRiderId = riderId;
      const rA = riders.find(r => r.id === riderId);
      showToast(`Rider 1 (#${rA ? rA.bib : riderId}) dipilih! Klik tombol 'VS' pada rider lain untuk membandingkan.`, 'info');
      updateLeaderboard();
      return;
    }

    if (comparingRiderId === riderId) {
      comparingRiderId = null;
      showToast('Pemilihan pembanding dibatalkan.', 'info');
      updateLeaderboard();
      return;
    }

    const riderA = riders.find(r => r.id === comparingRiderId);
    const riderB = riders.find(r => r.id === riderId);
    comparingRiderId = null;
    updateLeaderboard();

    if (!riderA || !riderB) return;
    openH2hModal(riderA, riderB);
  };

  function openH2hModal(riderA, riderB) {
    const devA = riderA.traccar_device_id || riderA.id;
    const devB = riderB.traccar_device_id || riderB.id;
    const progA = progressById[devA] || { distanceKm: 0, speed: 0, movingAvg: 0, progressPct: 0, etaTime: '-', etaDuration: '-' };
    const progB = progressById[devB] || { distanceKm: 0, speed: 0, movingAvg: 0, progressPct: 0, etaTime: '-', etaDuration: '-' };

    const distGap = Math.round(Math.abs(progA.distanceKm - progB.distanceKm) * 10) / 10;
    let gapLeader = null;
    if (progA.distanceKm > progB.distanceKm) gapLeader = `${riderA.name} (#${riderA.bib}) memimpin +${distGap} km`;
    else if (progB.distanceKm > progA.distanceKm) gapLeader = `${riderB.name} (#${riderB.bib}) memimpin +${distGap} km`;
    else gapLeader = 'Keduanya seimbang (Grup Sama)';

    const modalBackdrop = document.getElementById('h2hModalBackdrop');
    const modalContent = document.getElementById('h2hModalContent');

    modalContent.innerHTML = `
      <div class="h2h-header">
        <div class="h2h-title">⚔️ Head-to-Head Perbandingan Rider</div>
        <button class="h2h-close-btn" id="btnCloseH2h">✕</button>
      </div>

      <div class="h2h-battle-strip">
        <div class="h2h-rider-card rider-a">
          <div class="h2h-rider-avatar" style="background:${riderA.color || '#FFE600'}">#${riderA.bib}</div>
          <div>
            <div class="h2h-rider-name">${riderA.name}</div>
            <div class="h2h-rider-sub">BIB #${riderA.bib}</div>
          </div>
        </div>

        <div class="h2h-vs-badge">VS</div>

        <div class="h2h-rider-card rider-b">
          <div class="h2h-rider-avatar" style="background:${riderB.color || '#D1A980'}">#${riderB.bib}</div>
          <div>
            <div class="h2h-rider-name">${riderB.name}</div>
            <div class="h2h-rider-sub">BIB #${riderB.bib}</div>
          </div>
        </div>
      </div>

      <div class="h2h-gap-highlight">
        🏆 ${gapLeader}
      </div>

      <div class="h2h-stats-list">
        <div class="h2h-stat-row">
          <div class="h2h-val">${progA.distanceKm} km (${progA.progressPct}%)</div>
          <div class="h2h-lbl">Jarak Ditempuh</div>
          <div class="h2h-val val-b">${progB.distanceKm} km (${progB.progressPct}%)</div>
        </div>

        <div class="h2h-stat-row">
          <div class="h2h-val">${progA.speed} km/h</div>
          <div class="h2h-lbl">Kecepatan Saat Ini</div>
          <div class="h2h-val val-b">${progB.speed} km/h</div>
        </div>

        <div class="h2h-stat-row">
          <div class="h2h-val">${progA.movingAvg || progA.speed} km/h</div>
          <div class="h2h-lbl">Rata-rata Bergerak</div>
          <div class="h2h-val val-b">${progB.movingAvg || progB.speed} km/h</div>
        </div>

        <div class="h2h-stat-row">
          <div class="h2h-val">${progA.etaTime} (${progA.etaDuration})</div>
          <div class="h2h-lbl">Estimasi Finish (ETA)</div>
          <div class="h2h-val val-b">${progB.etaTime} (${progB.etaDuration})</div>
        </div>
      </div>

      <div class="h2h-actions">
        <button class="btn btn-primary" style="flex:1" id="btnFocusBothRiders">🎯 Lihat Kedua Rider di Peta</button>
        <button class="btn btn-outline" style="flex:1" id="btnCloseH2hFooter">Tutup</button>
      </div>
    `;

    modalBackdrop.style.display = 'flex';

    document.getElementById('btnCloseH2h').onclick = () => { modalBackdrop.style.display = 'none'; };
    document.getElementById('btnCloseH2hFooter').onclick = () => { modalBackdrop.style.display = 'none'; };
    modalBackdrop.onclick = e => { if (e.target === modalBackdrop) modalBackdrop.style.display = 'none'; };

    document.getElementById('btnFocusBothRiders').onclick = () => {
      modalBackdrop.style.display = 'none';
      const mA = markerById[devA];
      const mB = markerById[devB];
      if (mA && mB) {
        const bounds = L.latLngBounds([mA.getLatLng(), mB.getLatLng()]);
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
      } else if (mA) {
        map.setView(mA.getLatLng(), 15);
      } else if (mB) {
        map.setView(mB.getLatLng(), 15);
      }
    };
  }

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
