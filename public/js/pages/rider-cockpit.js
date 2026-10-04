/**
 * CycloPon Rider Live Cockpit HUD (/rider/cockpit)
 * Mobile-first handlebar display with speedometer, telemetry, COT countdown, mini-map & SOS.
 */

let cockpitActive = false;
let cockpitWakeLock = null;
let cockpitWs = null;
let cockpitMap = null;
let cockpitRiderMarker = null;
let cockpitRoutePolyline = null;
let cockpitSimTimer = null;
let cockpitGeoWatchId = null;

async function renderRiderCockpit() {
  document.body.classList.add('cockpit-active');
  cockpitActive = true;

  // Retrieve saved rider configuration
  let configStr = sessionStorage.getItem('riderConfig') || localStorage.getItem('riderConfig');
  let config = null;

  if (configStr) {
    try {
      config = JSON.parse(configStr);
    } catch {
      config = null;
    }
  }

  // Fallback demo config if no session exists
  const isDemo = !config;
  if (isDemo) {
    config = {
      rider: { id: 999, bib: '101', name: 'Rider Demo', phone: '08123456789' },
      event: { id: 1, name: 'Audax Rinjani 200 BRM', gpx_path: null },
      traccar: { deviceIdentifier: 'BIB-101', serverUrl: 'http://localhost:5055', osmandPort: 5055, interval: 10 }
    };
  }

  const { rider, event } = config;

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="cockpit-container">

      <!-- Top Bar -->
      <div class="cockpit-topbar">
        <div class="cockpit-rider-info">
          <a href="/rider/setup" data-link style="color:var(--cockpit-muted);text-decoration:none;font-size:16px;margin-right:2px" title="Kembali ke Setup">←</a>
          <span class="cockpit-bib-badge">BIB #${rider.bib}</span>
          <span class="cockpit-rider-name" title="${rider.name}">${rider.name}</span>
        </div>
        <div class="cockpit-top-actions">
          <button id="btnToggleWakeLock" class="cockpit-pill-btn" title="Toggle Screen Wake Lock">
            <span class="wake-icon">💡</span> <span id="wakeStatusText">Layar</span>
          </button>
          <button id="btnToggleSim" class="cockpit-pill-btn" title="Toggle Ride Simulator">
            🎮 <span id="simStatusText">Sim</span>
          </button>
          <button id="btnToggleFullscreen" class="cockpit-pill-btn" title="Fullscreen HUD">
            ⛶
          </button>
        </div>
      </div>

      <!-- Off-Route Warning Alert Banner -->
      <div id="cockpitOffRouteAlert" class="cockpit-offroute-banner">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:24px">⚠️</span>
          <div>
            <div style="font-size:14px;letter-spacing:0.02em">KELUAR DARI RUTE RESMI!</div>
            <div id="cockpitDeviationText" style="font-size:12px;font-weight:600;opacity:0.9">Deviasi: +0m</div>
          </div>
        </div>
        <button id="btnDismissOffRoute" style="background:rgba(0,0,0,0.25);border:none;color:#FFF;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer">
          Tutup
        </button>
      </div>

      <!-- Speedometer Hero Card -->
      <div class="cockpit-speedo-card">
        <div class="cockpit-speed-number" id="cockpitSpeedVal">0.0</div>
        <div class="cockpit-speed-unit">KM/JAM</div>
        <div class="cockpit-speed-sub">
          <span>Max: <strong id="cockpitMaxSpeed">0.0</strong> km/h</span>
          <span>•</span>
          <span>Avg: <strong id="cockpitAvgSpeed">0.0</strong> km/h</span>
          <span>•</span>
          <span>Baterai: <strong id="cockpitBattery">--%</strong></span>
        </div>
      </div>

      <!-- Primary Metrics Grid -->
      <div class="cockpit-grid">
        <div class="cockpit-stat-box">
          <div class="cockpit-stat-label">
            <span>📍</span> Jarak Tempuh
          </div>
          <div class="cockpit-stat-value">
            <span id="cockpitDistCovered">0.0</span><span class="cockpit-stat-unit">km</span>
          </div>
          <div class="cockpit-stat-sub" id="cockpitTotalDistSub">Total Rute: -- km</div>
        </div>

        <div class="cockpit-stat-box">
          <div class="cockpit-stat-label">
            <span>🏁</span> Sisa Jarak
          </div>
          <div class="cockpit-stat-value">
            <span id="cockpitDistRemaining">--</span><span class="cockpit-stat-unit">km</span>
          </div>
          <div class="cockpit-stat-sub" id="cockpitProgressPct">Progress: 0%</div>
        </div>

        <div class="cockpit-stat-box">
          <div class="cockpit-stat-label">
            <span>⏱️</span> Waktu Bergerak
          </div>
          <div class="cockpit-stat-value" id="cockpitMovingTime" style="font-size:22px">
            00:00:00
          </div>
          <div class="cockpit-stat-sub">Elapsed Time</div>
        </div>

        <div class="cockpit-stat-box">
          <div class="cockpit-stat-label">
            <span>⚡</span> Status Sinyal
          </div>
          <div class="cockpit-stat-value" id="cockpitGpsStatus" style="font-size:18px;color:var(--cockpit-green)">
            GPS Standby
          </div>
          <div class="cockpit-stat-sub" id="cockpitCoordsSub">-7.0000, 110.0000</div>
        </div>
      </div>

      <!-- Target Checkpoint & COT Widget -->
      <div class="cockpit-cp-card" id="cockpitCpCard">
        <div class="cockpit-cp-header">
          <div class="cockpit-cp-title">
            <span>🚩</span>
            <span id="cockpitCpName">Menunggu Data Checkpoint...</span>
          </div>
          <span id="cockpitCpPill" class="cockpit-cp-status-pill safe">ON TRACK</span>
        </div>

        <div class="cockpit-cp-progress-bar">
          <div class="cockpit-cp-progress-fill" id="cockpitCpProgressFill"></div>
        </div>

        <div class="cockpit-cp-details">
          <div class="cockpit-cp-detail-box">
            <div class="cockpit-cp-detail-lbl">Jarak ke Pos</div>
            <div class="cockpit-cp-detail-val" id="cockpitCpDist">-- km</div>
          </div>
          <div class="cockpit-cp-detail-box">
            <div class="cockpit-cp-detail-lbl">Target COT</div>
            <div class="cockpit-cp-detail-val" id="cockpitCpCot">--:--</div>
          </div>
          <div class="cockpit-cp-detail-box">
            <div class="cockpit-cp-detail-lbl">Estimasi Tiba</div>
            <div class="cockpit-cp-detail-val" id="cockpitCpEta">--:--</div>
          </div>
        </div>
      </div>

      <!-- Mini Breadcrumb Map -->
      <div class="cockpit-map-card">
        <div class="cockpit-map-header">
          <span>🗺️ MINI TRACK BREADCRUMB</span>
          <button id="btnRecenterMap" style="background:none;border:none;color:var(--cockpit-yellow);font-size:11px;font-weight:700;cursor:pointer">
            📍 Pusatkan
          </button>
        </div>
        <div id="cockpitMiniMap" class="cockpit-mini-map"></div>
      </div>

    </div>

    <!-- Sticky Bottom Emergency Action Bar -->
    <div class="cockpit-bottom-bar">
      <button id="btnCockpitSos" class="cockpit-sos-btn">
        <span style="font-size:20px">🚨</span>
        <span>KIRIM SOS DARURAT</span>
      </button>
      <a href="/watch/${event.id}" data-link class="cockpit-nav-btn" title="Buka Spectator Map">
        <span>🗺️</span>
        <span>Live Map</span>
      </a>
    </div>

    <!-- SOS Modal Overlay -->
    <div id="cockpitSosModalOverlay" class="sos-modal-overlay" style="display:none">
      <div class="sos-modal-content">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:22px">🚨</span>
            <h3 style="font-size:17px;font-weight:800;color:#EF4444;margin:0">Kirim Sinyal SOS Darurat</h3>
          </div>
          <button id="btnCloseCockpitSos" style="background:none;border:none;color:var(--cockpit-muted);font-size:20px;cursor:pointer">✕</button>
        </div>
        <p style="font-size:12px;color:var(--cockpit-muted);margin-bottom:14px">
          Sinyal SOS beserta posisi GPS Anda akan langsung dibroadcast ke panitia dan tim medis.
        </p>

        <label style="font-size:12px;font-weight:700;color:var(--cockpit-text);display:block;margin-bottom:6px">Pilih Jenis Situasi:</label>
        <div class="sos-type-grid">
          <button type="button" class="sos-type-btn active" data-type="MEDICAL">
            <strong>🚑 Medis / Cedera</strong>
            <small>Kram parah / dehidrasi</small>
          </button>
          <button type="button" class="sos-type-btn" data-type="CRASH">
            <strong>💥 Tabrakan / Jatuh</strong>
            <small>Butuh ambulans</small>
          </button>
          <button type="button" class="sos-type-btn" data-type="MECHANICAL">
            <strong>🚲 Masalah Sepeda</strong>
            <small>Patah rantai / ban sobek</small>
          </button>
          <button type="button" class="sos-type-btn" data-type="EVACUATION">
            <strong>⚠️ Evakuasi DNF</strong>
            <small>Menyerah / tidak kuat</small>
          </button>
        </div>

        <div style="margin-top:12px;margin-bottom:16px">
          <label style="font-size:12px;font-weight:700;color:var(--cockpit-text);display:block;margin-bottom:6px">Catatan Lokasi:</label>
          <input type="text" id="cockpitSosMsgInput" placeholder="Contoh: Pinggir warung KM 82"
                 style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:var(--radius-sm);color:#FFF;font-size:13px">
        </div>

        <div style="display:flex;gap:10px">
          <button type="button" id="btnCancelCockpitSos" class="btn btn-outline" style="flex:1;padding:12px">Batal</button>
          <button type="button" id="btnConfirmCockpitSos" class="btn" style="flex:2;background:#EF4444;color:#FFF;font-weight:800;padding:12px;box-shadow:0 0 15px rgba(239,68,68,0.5)">
            🚨 KIRIM SEKARANG
          </button>
        </div>
      </div>
    </div>
  `;

  // ── State Variables ──
  let routeCoords = [];
  let checkpoints = [];
  let totalKm = 0;
  let currentLat = null;
  let currentLng = null;
  let currentSpeed = 0;
  let maxSpeed = 0;
  let speedSamples = [];
  let coveredKm = 0;
  let startTime = Date.now();
  let timerInterval = null;

  // ── 1. Wake Lock API ──
  const btnWakeLock = document.getElementById('btnToggleWakeLock');
  const wakeStatusText = document.getElementById('wakeStatusText');

  async function activateWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        cockpitWakeLock = await navigator.wakeLock.request('screen');
        cockpitWakeLock.addEventListener('release', () => {
          btnWakeLock.classList.remove('wake-active');
          wakeStatusText.textContent = 'Layar Mati';
        });
        btnWakeLock.classList.add('wake-active');
        wakeStatusText.textContent = 'Layar ON';
      } catch (err) {
        console.warn('[Cockpit WakeLock] Failed to request:', err);
        btnWakeLock.classList.remove('wake-active');
        wakeStatusText.textContent = 'No Lock';
      }
    } else {
      wakeStatusText.textContent = 'No Sup';
    }
  }

  async function releaseWakeLock() {
    if (cockpitWakeLock) {
      try {
        await cockpitWakeLock.release();
        cockpitWakeLock = null;
      } catch { /* ignore */ }
    }
    btnWakeLock.classList.remove('wake-active');
    wakeStatusText.textContent = 'Layar Mati';
  }

  btnWakeLock.addEventListener('click', () => {
    if (cockpitWakeLock) releaseWakeLock();
    else activateWakeLock();
  });

  // Re-acquire lock on tab visibility change
  document.addEventListener('visibilitychange', () => {
    if (cockpitActive && document.visibilityState === 'visible' && !cockpitWakeLock) {
      activateWakeLock();
    }
  });

  // Attempt initial wake lock
  activateWakeLock();

  // ── 2. Fullscreen Toggle ──
  const btnFullscreen = document.getElementById('btnToggleFullscreen');
  btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      btnFullscreen.textContent = '✕';
    } else {
      document.exitFullscreen().catch(() => {});
      btnFullscreen.textContent = '⛶';
    }
  });

  // ── 3. Elapsed Time Clock ──
  const movingTimeEl = document.getElementById('cockpitMovingTime');
  timerInterval = setInterval(() => {
    if (!cockpitActive) return;
    const diffSec = Math.floor((Date.now() - startTime) / 1000);
    const hrs = String(Math.floor(diffSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
    const secs = String(diffSec % 60).padStart(2, '0');
    if (movingTimeEl) movingTimeEl.textContent = `${hrs}:${mins}:${secs}`;
  }, 1000);

  // ── 4. Fetch Event & Checkpoints & GPX ──
  try {
    const [eventRes, cpRes] = await Promise.all([
      fetch(`/api/events/${event.id}`).then(r => r.json()).catch(() => null),
      fetch(`/api/events/${event.id}/checkpoints`).then(r => r.json()).catch(() => [])
    ]);

    if (cpRes && Array.isArray(cpRes)) {
      checkpoints = cpRes.sort((a, b) => a.km_distance - b.km_distance);
    }

    if (eventRes && eventRes.gpx_path) {
      try {
        const gpxText = await fetch(eventRes.gpx_path).then(r => r.text());
        const parsed = parseGpxData(gpxText);
        routeCoords = parsed.coords || [];
        totalKm = parsed.stats?.totalKm || totalRouteKm(routeCoords);
      } catch (e) {
        console.warn('[Cockpit] Failed to parse GPX:', e);
      }
    }
  } catch (err) {
    console.warn('[Cockpit] Init fetch error:', err);
  }

  // Fallback coords for demo or empty route
  if (!routeCoords.length) {
    routeCoords = [
      [-6.9147, 107.6098],
      [-6.9170, 107.6150],
      [-6.9200, 107.6200],
      [-6.9250, 107.6300],
      [-6.9300, 107.6400]
    ];
    totalKm = 25.0;
  }

  document.getElementById('cockpitTotalDistSub').textContent = `Total Rute: ${totalKm} km`;

  // ── 5. Setup Mini Map (Leaflet) ──
  await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
  loadCss('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');

  if (window.L && document.getElementById('cockpitMiniMap')) {
    const center = routeCoords[0] || [-6.9147, 107.6098];
    cockpitMap = L.map('cockpitMiniMap', {
      center: center,
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(cockpitMap);

    // Draw route polyline
    cockpitRoutePolyline = L.polyline(routeCoords, {
      color: '#FFE600',
      weight: 4,
      opacity: 0.8
    }).addTo(cockpitMap);

    // Add Checkpoint markers to mini-map
    checkpoints.forEach(cp => {
      if (cp.lat && cp.lng) {
        const cpIcon = L.divIcon({
          className: 'cp-mini-icon',
          html: `<div style="background:#00E5FF;color:#000;font-size:10px;font-weight:900;padding:2px 5px;border-radius:4px;border:1px solid #FFF;white-space:nowrap">${cp.name}</div>`,
          iconSize: [60, 20],
          iconAnchor: [30, 10]
        });
        L.marker([cp.lat, cp.lng], { icon: cpIcon }).addTo(cockpitMap);
      }
    });

    // Rider marker
    const riderIcon = L.divIcon({
      className: 'rider-mini-icon',
      html: `<div style="width:18px;height:18px;border-radius:50%;background:#00E5FF;border:3px solid #FFF;box-shadow:0 0 12px #00E5FF"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    cockpitRiderMarker = L.marker(center, { icon: riderIcon }).addTo(cockpitMap);
    cockpitMap.setView(center, 15);
  }

  document.getElementById('btnRecenterMap').addEventListener('click', () => {
    if (cockpitMap && currentLat && currentLng) {
      cockpitMap.setView([currentLat, currentLng], 15);
    }
  });

  // ── 6. Telemetry Update Handler ──
  function updateTelemetry(lat, lng, speedKmh, batteryLevel = null) {
    currentLat = lat;
    currentLng = lng;
    currentSpeed = Math.max(0, Math.round((speedKmh || 0) * 10) / 10);

    if (currentSpeed > maxSpeed) maxSpeed = currentSpeed;
    if (currentSpeed > 2) speedSamples.push(currentSpeed);
    if (speedSamples.length > 30) speedSamples.shift();

    const avgSpeed = speedSamples.length
      ? Math.round((speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length) * 10) / 10
      : currentSpeed;

    // Update Speed Display
    document.getElementById('cockpitSpeedVal').textContent = currentSpeed.toFixed(1);
    document.getElementById('cockpitMaxSpeed').textContent = maxSpeed.toFixed(1);
    document.getElementById('cockpitAvgSpeed').textContent = avgSpeed.toFixed(1);
    if (batteryLevel != null) {
      document.getElementById('cockpitBattery').textContent = `${Math.round(batteryLevel)}%`;
    }

    // Nearest point & distance covered
    const nearest = findNearestRoutePoint(lat, lng, routeCoords, totalKm);
    coveredKm = nearest.distanceKm;
    const remainingKm = Math.max(0, Math.round((totalKm - coveredKm) * 10) / 10);
    const progressPct = nearest.progressPct;

    document.getElementById('cockpitDistCovered').textContent = coveredKm.toFixed(1);
    document.getElementById('cockpitDistRemaining').textContent = remainingKm.toFixed(1);
    document.getElementById('cockpitProgressPct').textContent = `Progress: ${progressPct}%`;
    document.getElementById('cockpitGpsStatus').textContent = 'GPS Terhubung';
    document.getElementById('cockpitCoordsSub').textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    // Update Mini Map Marker
    if (cockpitMap && cockpitRiderMarker) {
      cockpitRiderMarker.setLatLng([lat, lng]);
      cockpitMap.panTo([lat, lng], { animate: true, duration: 0.5 });
    }

    // Off-Route Check
    const offRouteInfo = checkOffRoute(lat, lng, routeCoords, 100);
    const offRouteBanner = document.getElementById('cockpitOffRouteAlert');
    if (offRouteInfo.isOffRoute) {
      offRouteBanner.classList.add('active');
      document.getElementById('cockpitDeviationText').textContent = `Deviasi: +${offRouteInfo.deviationMeters}m dari trek`;
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    } else {
      offRouteBanner.classList.remove('active');
    }

    // Checkpoint & COT Calculation
    updateCheckpointWidget(coveredKm, avgSpeed);
  }

  function updateCheckpointWidget(currentCoveredKm, movingAvg) {
    if (!checkpoints.length) {
      document.getElementById('cockpitCpName').textContent = 'Tidak ada checkpoint terdaftar';
      return;
    }

    // Find next checkpoint
    const nextCp = checkpoints.find(cp => cp.km_distance > currentCoveredKm) || checkpoints[checkpoints.length - 1];
    const isPastAll = currentCoveredKm >= checkpoints[checkpoints.length - 1].km_distance;

    if (isPastAll) {
      document.getElementById('cockpitCpName').textContent = '🏁 Menuju Garis Finish!';
      document.getElementById('cockpitCpPill').textContent = 'FINAL STAGE';
      document.getElementById('cockpitCpPill').className = 'cockpit-cp-status-pill safe';
      document.getElementById('cockpitCpDist').textContent = `${Math.max(0, (totalKm - currentCoveredKm).toFixed(1))} km`;
      document.getElementById('cockpitCpCot').textContent = 'FINISH';
      document.getElementById('cockpitCpEta').textContent = 'SEGERA';
      document.getElementById('cockpitCpProgressFill').style.width = '100%';
      return;
    }

    const distToCp = Math.max(0, Math.round((nextCp.km_distance - currentCoveredKm) * 10) / 10);
    const prevCpKm = checkpoints.indexOf(nextCp) > 0 ? checkpoints[checkpoints.indexOf(nextCp) - 1].km_distance : 0;
    const cpSpan = nextCp.km_distance - prevCpKm;
    const cpProgress = cpSpan > 0 ? Math.min(100, Math.max(0, Math.round(((currentCoveredKm - prevCpKm) / cpSpan) * 100))) : 50;

    document.getElementById('cockpitCpName').textContent = `${nextCp.name} (KM ${nextCp.km_distance})`;
    document.getElementById('cockpitCpDist').textContent = `${distToCp} km`;
    document.getElementById('cockpitCpCot').textContent = nextCp.close_time || '--:--';
    document.getElementById('cockpitCpProgressFill').style.width = `${cpProgress}%`;

    // Compute ETA
    const speedRef = movingAvg > 5 ? movingAvg : 20;
    const hoursToCp = distToCp / speedRef;
    const now = new Date();
    const etaDate = new Date(now.getTime() + hoursToCp * 3600 * 1000);
    const etaStr = etaDate.toTimeString().substring(0, 5);
    document.getElementById('cockpitCpEta').textContent = etaStr;

    // Check COT Delta
    if (nextCp.close_time) {
      const [cotH, cotM] = nextCp.close_time.split(':').map(Number);
      const cotDate = new Date(now);
      cotDate.setHours(cotH, cotM, 0, 0);

      const deltaMin = Math.round((cotDate - etaDate) / (60 * 1000));
      const pill = document.getElementById('cockpitCpPill');
      if (deltaMin >= 15) {
        pill.textContent = `AMAN (+${deltaMin}m)`;
        pill.className = 'cockpit-cp-status-pill safe';
      } else if (deltaMin >= 0) {
        pill.textContent = `WASPADA (+${deltaMin}m)`;
        pill.className = 'cockpit-cp-status-pill warning';
      } else {
        pill.textContent = `LEWAT COT (${deltaMin}m)`;
        pill.className = 'cockpit-cp-status-pill late';
      }
    }
  }

  // ── 7. WebSocket Live Telemetry Listener ──
  function connectCockpitWs() {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    cockpitWs = new WebSocket(`${proto}//${window.location.host}/traccar-ws`);

    cockpitWs.onmessage = e => {
      try {
        const data = JSON.parse(e.data);
        if (data.positions && Array.isArray(data.positions)) {
          data.positions.forEach(pos => {
            // Check if this position matches our rider BIB or traccar device
            const rawUnique = String(pos.uniqueId || pos.deviceId || '').trim();
            const matchesRider = rawUnique.includes(rider.bib) ||
                                 rawUnique === config.traccar?.deviceIdentifier ||
                                 pos.deviceId === rider.traccar_device_id;

            if (matchesRider) {
              const rawSpeed = Number(pos.speed || 0);
              const spd = pos.isKmh ? rawSpeed : rawSpeed * 1.852;
              const batt = pos.attributes?.batteryLevel != null ? Number(pos.attributes.batteryLevel) : null;
              updateTelemetry(pos.latitude, pos.longitude, spd, batt);
            }
          });
        }
      } catch (err) {
        console.warn('[Cockpit WS] Error processing message:', err);
      }
    };
  }

  connectCockpitWs();

  // ── 8. Real Browser Geolocation Watcher ──
  if ('geolocation' in navigator) {
    cockpitGeoWatchId = navigator.geolocation.watchPosition(
      pos => {
        const speedKmh = pos.coords.speed != null ? pos.coords.speed * 3.6 : 0;
        updateTelemetry(pos.coords.latitude, pos.coords.longitude, speedKmh);
      },
      err => console.log('[Cockpit Geolocation] Info:', err.message),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
  }

  // ── 9. Ride Simulator Toggle ──
  const btnSim = document.getElementById('btnToggleSim');
  const simText = document.getElementById('simStatusText');
  let simActive = false;
  let simStep = 0;

  btnSim.addEventListener('click', () => {
    simActive = !simActive;
    if (simActive) {
      btnSim.classList.add('sim-active');
      simText.textContent = 'Sim ON';
      startSimulation();
      showToast('Ride Simulator Aktif! Data kecepatan disimulasikan.', 'info');
    } else {
      btnSim.classList.remove('sim-active');
      simText.textContent = 'Sim';
      clearInterval(cockpitSimTimer);
      showToast('Simulator dinonaktifkan.', 'info');
    }
  });

  function startSimulation() {
    clearInterval(cockpitSimTimer);
    cockpitSimTimer = setInterval(() => {
      if (!cockpitActive || !simActive) return;
      simStep = (simStep + 1) % routeCoords.length;
      const pt = routeCoords[simStep];
      const simSpeed = 26 + (Math.sin(simStep * 0.4) * 6) + (Math.random() * 2);
      const simBatt = Math.max(15, 95 - Math.floor(simStep * 0.5));
      updateTelemetry(pt[0], pt[1], simSpeed, simBatt);
    }, 2000);
  }

  // Initial update with route start
  if (routeCoords.length) {
    updateTelemetry(routeCoords[0][0], routeCoords[0][1], 0, 98);
  }

  // Dismiss off-route banner button
  document.getElementById('btnDismissOffRoute').addEventListener('click', () => {
    document.getElementById('cockpitOffRouteAlert').classList.remove('active');
  });

  // ── 10. Emergency SOS Modal Handlers ──
  const sosModal = document.getElementById('cockpitSosModalOverlay');
  const btnOpenSos = document.getElementById('btnCockpitSos');
  const btnCloseSos = document.getElementById('btnCloseCockpitSos');
  const btnCancelSos = document.getElementById('btnCancelCockpitSos');
  const btnConfirmSos = document.getElementById('btnConfirmCockpitSos');
  let selectedSosType = 'MEDICAL';

  btnOpenSos.addEventListener('click', () => {
    sosModal.style.display = 'flex';
  });

  function closeSos() {
    sosModal.style.display = 'none';
  }

  btnCloseSos.addEventListener('click', closeSos);
  btnCancelSos.addEventListener('click', closeSos);

  document.querySelectorAll('.sos-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sos-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSosType = btn.dataset.type;
    });
  });

  btnConfirmSos.addEventListener('click', async () => {
    const note = document.getElementById('cockpitSosMsgInput').value.trim();
    btnConfirmSos.disabled = true;
    btnConfirmSos.textContent = 'MENGIRIM...';

    const payload = {
      rider_id: rider.id || 1,
      type: selectedSosType,
      lat: currentLat || (routeCoords[0] ? routeCoords[0][0] : 0),
      lng: currentLng || (routeCoords[0] ? routeCoords[0][1] : 0),
      message: note || `Sinyal SOS dari Cockpit Rider #${rider.bib}`
    };

    try {
      const res = await fetch(`/api/events/${event.id}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('🚨 Sinyal SOS Darurat Berhasil Dikirim ke Panitia!', 'success');
        closeSos();
      } else {
        showToast('Gagal mengirim SOS. Coba lagi atau hubungi panitia.', 'error');
      }
    } catch (err) {
      showToast('Koneksi terputus saat kirim SOS.', 'error');
    } finally {
      btnConfirmSos.disabled = false;
      btnConfirmSos.textContent = '🚨 KIRIM SEKARANG';
    }
  });
}

// Teardown when navigating away
window.addEventListener('popstate', () => {
  if (cockpitActive) {
    cockpitActive = false;
    document.body.classList.remove('cockpit-active');
    if (cockpitWakeLock) {
      cockpitWakeLock.release().catch(() => {});
      cockpitWakeLock = null;
    }
    if (cockpitWs) {
      cockpitWs.close();
      cockpitWs = null;
    }
    if (cockpitSimTimer) clearInterval(cockpitSimTimer);
    if (cockpitGeoWatchId != null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(cockpitGeoWatchId);
    }
  }
});
