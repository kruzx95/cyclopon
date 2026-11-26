/**
 * CycloPon Rider Live Cockpit HUD (/rider/cockpit)
 * Mobile-first handlebar display with speedometer, telemetry, COT countdown, mini-map & SOS.
 */

let cockpitActive = false;
let cockpitWakeLock = null;
let cockpitWs = null;
let cockpitWsReconnectTimer = null;
let cockpitWsBackoffMs = 2000;
let cockpitGeoWatchId = null;
let cockpitTimerInterval = null;
let cockpitCotTimer = null;
let audioCtx = null;
let audioAlertEnabled = localStorage.getItem('cyclopon_cockpit_audio') !== 'false';
const notifiedCpSet = new Set();

function playCheckpointChime() {
  if (!audioAlertEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    const now = audioCtx.currentTime;

    // Harmonic two-tone chord chime: D5 (587.33Hz) -> A5 (880Hz)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.28, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.18);
    gain2.gain.setValueAtTime(0.32, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.7);

    if ('vibrate' in navigator) {
      navigator.vibrate([150, 100, 250]);
    }
  } catch (err) {
    console.warn('[Audio Alert] Error playing chime:', err);
  }
}

let offRouteAudioTimer = null;
let isCurrentlyOffRoute = false;
let offRouteMutedByUser = false;

function playOffRouteBeep() {
  if (!audioAlertEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    const now = audioCtx.currentTime;

    // Dual-tone warning pulse: 440Hz (A4) -> 349.23Hz (F4)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(440.0, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(349.23, now + 0.26);
    gain2.gain.setValueAtTime(0.28, now + 0.26);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.26);
    osc2.stop(now + 0.52);
  } catch (err) {
    console.warn('[OffRoute Audio] Error playing beep:', err);
  }
}

function startOffRouteAlert() {
  if (offRouteMutedByUser || !audioAlertEnabled) return;
  if (!offRouteAudioTimer) {
    playOffRouteBeep();
    offRouteAudioTimer = setInterval(() => {
      if (!offRouteMutedByUser && audioAlertEnabled && isCurrentlyOffRoute) {
        playOffRouteBeep();
      } else {
        stopOffRouteAlert();
      }
    }, 5000);
  }
}

function stopOffRouteAlert() {
  if (offRouteAudioTimer) {
    clearInterval(offRouteAudioTimer);
    offRouteAudioTimer = null;
  }
}

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

  // Validate rider session
  if (!config || !config.rider || !config.event) {
    document.body.classList.remove('cockpit-active');
    cockpitActive = false;
    const app = document.getElementById('app');
    app.innerHTML = `
      <div style="min-height:80vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center">
        <div style="max-width:440px;background:var(--card-bg, #fff);border:1px solid var(--border-color, #e5e7eb);border-radius:12px;padding:36px 28px;box-shadow:0 8px 24px rgba(0,0,0,0.06)">
          <div style="font-size:44px;margin-bottom:14px">🚴</div>
          <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;color:var(--text-primary, #111827)">Sesi Rider Belum Ditemukan</h2>
          <p style="font-size:14px;color:var(--text-secondary, #6b7280);line-height:1.5;margin-bottom:24px">
            Anda belum masuk ke sesi rider aktif. Masuk menggunakan nomor BIB dan PIN atau gunakan tautan personal registrasi Anda untuk mengakses Cockpit Telemetri.
          </p>
          <a href="/rider" data-link class="btn btn-primary" style="display:inline-block;padding:12px 24px;font-weight:700;text-decoration:none">
            Masuk ke Rider Portal →
          </a>
        </div>
      </div>
    `;
    return;
  }

  const { rider, event } = config;
  if (event && event.access_pin && !sessionStorage.getItem('event_pin_' + event.id)) {
    sessionStorage.setItem('event_pin_' + event.id, event.access_pin);
  }

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="cockpit-container">

      <!-- Top Bar -->
      <div class="cockpit-topbar">
        <!-- Baris 1: Hub (Kiri) & BIB (Kanan) -->
        <div class="cockpit-topbar-row">
          <a href="/rider/setup" data-link class="cockpit-hub-link" title="Kembali ke Rider Hub">🏠 Hub</a>
          <span class="cockpit-bib-badge" title="Nomor Peserta BIB #${rider.bib}">BIB #${rider.bib}</span>
        </div>

        <!-- Baris 2: Toggle Layar Melek (Penuh 100%) -->
        <div class="cockpit-wake-row">
          <button id="btnToggleWakeLock" class="cockpit-pill-btn wake-lock-btn" title="Kunci Layar Selalu Menyala (Screen Wake Lock)">
            <span class="wake-icon">💡</span> <span id="wakeStatusText">Layar Selalu Menyala: AKTIF</span>
          </button>
        </div>

        <!-- Baris 3: Menu Alat & Kontrol -->
        <div class="cockpit-tools-row">
          <button type="button" id="btnCockpitCpScan" class="cockpit-pill-btn tool-btn" title="Scan QR Check-In Pos Kontrol">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
              <path d="M14 14h3v3h-3zM17 17h4v4h-4z"/>
            </svg>
            <span id="cockpitCpScanLabel">Scan CP</span>
          </button>
          <button type="button" id="btnToggleTheme" class="cockpit-pill-btn tool-btn" title="Ganti Mode Terang / Gelap">
            <span id="themeIcon">☀️</span> <span id="themeText">Terang</span>
          </button>
          <button type="button" id="btnToggleFullscreen" class="cockpit-pill-btn tool-btn" title="Layar Penuh (Fullscreen)">
            <span>⛶</span> <span>Fullscreen</span>
          </button>
          <button type="button" id="btnCockpitLogout" class="cockpit-pill-btn tool-btn danger" title="Keluar / Logout">
            <span>🚪</span> <span>Keluar</span>
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
        <button id="btnDismissOffRoute" class="cockpit-offroute-mute-btn" title="Heningkan suara alarm peringatan">
          🔇 Matikan Suara
        </button>
      </div>

      <!-- Checkpoint Proximity Alert Banner (<200m) -->
      <div id="cockpitCpProximityAlert" class="cockpit-proximity-banner">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:24px">📍</span>
          <div>
            <div id="cockpitProximityTitle" style="font-size:14px;letter-spacing:0.02em">MENDEKATI CHECKPOINT!</div>
            <div id="cockpitProximitySub" style="font-size:12px;font-weight:600;opacity:0.95">Jarak tersisa: 150m — Persiapkan kartu brevet / stampel kontrol</div>
          </div>
        </div>
        <button id="btnDismissProximityAlert" style="background:rgba(0,0,0,0.25);border:none;color:#FFF;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer">
          OK
        </button>
      </div>

      <!-- Primary Metrics Grid (4-box High Contrast) -->
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

      <!-- Virtual COT Status -->
      <div class="cockpit-cp-card" id="cockpitCotCard" style="display:none;margin-top:10px">
        <div class="cockpit-cp-header">
          <div class="cockpit-cp-title">
            <span>⏱️</span>
            <span id="cockpitCotTitle">Virtual COT</span>
          </div>
          <span id="cockpitCotPill" class="cockpit-cp-status-pill safe">—</span>
        </div>
        <div class="cockpit-cp-details" style="margin-top:8px">
          <div class="cockpit-cp-detail-box">
            <div class="cockpit-cp-detail-lbl">Posisi COT</div>
            <div class="cockpit-cp-detail-val" id="cockpitCotKm">-- km</div>
          </div>
          <div class="cockpit-cp-detail-box">
            <div class="cockpit-cp-detail-lbl">Selisih</div>
            <div class="cockpit-cp-detail-val" id="cockpitCotDiff">-- km</div>
          </div>
        </div>
      </div>

    </div>

    <!-- Sticky Bottom Emergency Action Bar -->
    <div class="cockpit-bottom-bar">
      <button id="btnCockpitSos" class="cockpit-sos-btn" title="Kirim Sinyal SOS Darurat">
        <span class="sos-beacon">
          <span class="sos-beacon-ring"></span>
          <span class="sos-beacon-core"></span>
        </span>
        <span>SOS DARURAT</span>
      </button>
      <a href="/watch/${event.id}" data-link class="cockpit-nav-btn" title="Buka Spectator Map">
        <svg class="nav-btn-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
          <line x1="8" y1="2" x2="8" y2="18"/>
          <line x1="16" y1="6" x2="16" y2="22"/>
        </svg>
        <span>LIVE MAP</span>
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
          <label style="font-size:12px;font-weight:700;color:var(--cockpit-text);display:block;margin-bottom:6px">
            Apa yang sedang Anda alami? <span style="font-weight:600;color:var(--cockpit-muted)">(opsional)</span>
          </label>
          <div class="sos-reason-chips" id="cockpitSosReasonChips">
            <button type="button" class="sos-reason-chip" data-reason="Pingsan">Pingsan</button>
            <button type="button" class="sos-reason-chip" data-reason="Patah tulang">Patah tulang</button>
            <button type="button" class="sos-reason-chip" data-reason="Dehidrasi">Dehidrasi</button>
            <button type="button" class="sos-reason-chip" data-reason="Sesak napas">Sesak napas</button>
            <button type="button" class="sos-reason-chip" data-reason="Luka / berdarah">Luka / berdarah</button>
            <button type="button" class="sos-reason-chip" data-reason="Ban bocor">Ban bocor</button>
            <button type="button" class="sos-reason-chip" data-reason="Rantai putus">Rantai putus</button>
            <button type="button" class="sos-reason-chip" data-reason="Tidak bisa lanjut">Tidak bisa lanjut</button>
          </div>
          <input type="text" id="cockpitSosMsgInput" placeholder="Contoh: Pingsan, sesak napas, lutut berdarah"
                 style="width:100%;padding:10px 12px;background:#FFFFFF;border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-size:13px">
          <small style="display:block;margin-top:6px;font-size:10.5px;color:var(--cockpit-muted)">
            Boleh dikosongkan. Panitia tetap menerima jenis situasi dan lokasi GPS Anda.
          </small>
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
  let gpxPoints = [];
  let routeClimbs = [];
  let totalElevGain = 0;
  let checkpoints = [];
  let riderSplits = [];
  let totalKm = 0;
  let currentLat = null;
  let currentLng = null;
  let currentSpeed = 0;
  let smoothedSpeed = 0;
  let maxSpeed = 0;
  let speedSamples = [];
  let coveredKm = 0;
  let totalGroundKm = null;
  let lastNearestIndex = null;
  let lastOdoLat = null;
  let lastOdoLng = null;
  let movingSeconds = 0;
  let currentBatteryLevel = null;
  let deviceBatteryManager = null;
  let batteryChangeHandler = null;
  let startTime = Date.now();
  let lastCoveredKm = 0;
  let cotStatusCache = null;

  // ── Device Battery API Listener ──
  if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
    navigator.getBattery().then(batt => {
      deviceBatteryManager = batt;
      batteryChangeHandler = () => {
        const norm = typeof normalizeBattery === 'function' ? normalizeBattery(batt.level) : Math.round(batt.level * 100);
        if (norm != null) {
          currentBatteryLevel = norm;
          const el = document.getElementById('cockpitBattery');
          if (el) el.textContent = `${norm}%`;
        }
      };
      batteryChangeHandler();
      batt.addEventListener('levelchange', batteryChangeHandler);
      batt.addEventListener('chargingchange', batteryChangeHandler);
    }).catch(err => {
      console.log('[Cockpit Battery API] Info:', err.message);
    });
  }

  // ── 1. Wake Lock API ──
  const btnWakeLock = document.getElementById('btnToggleWakeLock');
  const wakeStatusText = document.getElementById('wakeStatusText');

  async function activateWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        cockpitWakeLock = await navigator.wakeLock.request('screen');
        cockpitWakeLock.addEventListener('release', () => {
          btnWakeLock?.classList.remove('wake-active');
          if (wakeStatusText) wakeStatusText.textContent = 'Layar Selalu Menyala: OFF';
        });
        btnWakeLock?.classList.add('wake-active');
        if (wakeStatusText) wakeStatusText.textContent = 'Layar Selalu Menyala: AKTIF';
      } catch (err) {
        console.warn('[Cockpit WakeLock] Failed to request:', err);
        btnWakeLock?.classList.remove('wake-active');
        if (wakeStatusText) wakeStatusText.textContent = 'Layar Selalu Menyala: OFF';
      }
    } else {
      if (wakeStatusText) wakeStatusText.textContent = 'Layar Selalu Menyala (Tidak Didukung)';
    }
  }

  async function releaseWakeLock() {
    if (cockpitWakeLock) {
      try {
        await cockpitWakeLock.release();
        cockpitWakeLock = null;
      } catch { /* ignore */ }
    }
    btnWakeLock?.classList.remove('wake-active');
    if (wakeStatusText) wakeStatusText.textContent = 'Layar Selalu Menyala: OFF';
  }

  btnWakeLock?.addEventListener('click', () => {
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

  // Register teardown on router unmount
  if (typeof Router !== 'undefined' && typeof Router.onUnmount === 'function') {
    Router.onUnmount(teardownRiderCockpit);
  }

  // ── 3. Moving Time & Elapsed Clock ──
  const movingTimeEl = document.getElementById('cockpitMovingTime');
  if (cockpitTimerInterval) clearInterval(cockpitTimerInterval);
  cockpitTimerInterval = setInterval(() => {
    if (!cockpitActive) return;
    if (currentSpeed > 2.0) {
      movingSeconds++;
    }
    const hrs = String(Math.floor(movingSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((movingSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(movingSeconds % 60).padStart(2, '0');
    if (movingTimeEl) movingTimeEl.textContent = `${hrs}:${mins}:${secs}`;
  }, 1000);

  // ── 4. Fetch Event & Checkpoints & GPX ──
  try {
    const cockpitEventPin = sessionStorage.getItem('event_pin_' + event.id) || '';
    const cockpitEventHeaders = cockpitEventPin ? { 'x-event-pin': cockpitEventPin } : {};
    const [eventRes, cpRes, splitRes] = await Promise.all([
      fetch(`/api/events/${event.id}`).then(r => r.json()).catch(() => null),
      fetch(`/api/events/${event.id}/checkpoints`, { headers: cockpitEventHeaders }).then(r => r.json()).catch(() => []),
      fetch(`/api/riders/${rider.id}/splits`, { headers: cockpitEventHeaders }).then(r => r.json()).catch(() => [])
    ]);

    if (cpRes && Array.isArray(cpRes)) {
      checkpoints = cpRes.sort((a, b) => a.km_distance - b.km_distance);
    }
    if (splitRes && Array.isArray(splitRes)) {
      riderSplits = splitRes;
    }
    const scanLabel = document.getElementById('cockpitCpScanLabel');
    if (scanLabel && checkpoints.length) {
      scanLabel.textContent = `Scan CP (${riderSplits.length}/${checkpoints.length})`;
    }

    if (eventRes && eventRes.gpx_path) {
      try {
        const savedPin = sessionStorage.getItem('event_pin_' + event.id) || '';
        const gpxRes = await fetch(eventRes.gpx_path, {
          headers: savedPin ? { 'x-event-pin': savedPin } : {}
        });
        if (!gpxRes.ok) throw new Error(`HTTP ${gpxRes.status}`);
        const gpxText = await gpxRes.text();
        const parsed = parseGpxData(gpxText);
        routeCoords = parsed.coords || [];
        gpxPoints = parsed.points || [];
        routeClimbs = parsed.climbs || (typeof detectClimbs === 'function' ? detectClimbs(gpxPoints) : []);
        totalKm = parsed.stats?.totalKm || totalRouteKm(routeCoords);
        totalElevGain = parsed.stats?.elevGain || 0;
      } catch (e) {
        console.warn('[Cockpit] Failed to parse GPX:', e);
      }
    }
  } catch (err) {
    console.warn('[Cockpit] Init fetch error:', err);
  }

  // Empty route fallback handling
  if (!routeCoords.length) {
    totalKm = 0;
    gpxPoints = [];
    routeClimbs = [];
    totalElevGain = 0;
  }

  document.getElementById('cockpitTotalDistSub').textContent = totalKm ? `Total Rute: ${totalKm} km` : 'Rute belum diunggah';
  const climbSumInit = document.getElementById('cockpitClimbSummarySub');
  if (climbSumInit) climbSumInit.textContent = routeClimbs.length ? `${routeClimbs.length} Tanjakan Terdeteksi` : 'Tidak ada data tanjakan';

  // Initial Checkpoint state
  updateCheckpointWidget(0, 0);

  // Initial Virtual COT state + polling (10s)
  refreshCotStatus();
  if (cockpitCotTimer) clearInterval(cockpitCotTimer);
  cockpitCotTimer = setInterval(refreshCotStatus, 10000);

  // ── 5. Telemetry Update Handler ──
  function updateTelemetry(lat, lng, speedKmh, batteryLevel = null, isKmh = true) {
    currentLat = lat;
    currentLng = lng;

    // 1. Normalize speed (knots conversion, deadband <1.8km/h, and max 90km/h clamp)
    const rawTarget = typeof normalizeSpeedKmh === 'function'
      ? normalizeSpeedKmh(speedKmh, isKmh)
      : (speedKmh < 1.8 ? 0 : Math.min(90, Math.max(0, Math.round((speedKmh || 0) * 10) / 10)));

    // 2. Exponential Moving Average (EMA) Speed Smoothing
    if (rawTarget === 0) {
      smoothedSpeed = 0; // Immediate zero when stopping (no sluggish lag at lights)
    } else if (smoothedSpeed === 0) {
      smoothedSpeed = rawTarget; // Instant response on acceleration from standstill
    } else {
      // Responsive yet jitter-free smoothing filter
      smoothedSpeed = (rawTarget * 0.45) + (smoothedSpeed * 0.55);
    }
    currentSpeed = Math.round(smoothedSpeed * 10) / 10;

    if (currentSpeed > maxSpeed) maxSpeed = currentSpeed;
    if (currentSpeed > 2.0) {
      speedSamples.push(currentSpeed);
      if (speedSamples.length > 300) speedSamples.shift();
    }

    // Garmin/Wahoo style Average Moving Speed (Distance / Moving Hours)
    const movingHours = movingSeconds / 3600;
    let avgSpeed = 0;
    if (movingHours > (10 / 3600) && coveredKm > 0.05) {
      avgSpeed = Math.round((coveredKm / movingHours) * 10) / 10;
    } else if (speedSamples.length > 0) {
      avgSpeed = Math.round((speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length) * 10) / 10;
    } else {
      avgSpeed = currentSpeed;
    }

    // Update Speed Display
    // Update Speed Display (safe if element removed)
    const spdEl = document.getElementById('cockpitSpeedVal');
    if (spdEl) spdEl.textContent = currentSpeed.toFixed(1);
    const maxSpdEl = document.getElementById('cockpitMaxSpeed');
    if (maxSpdEl) maxSpdEl.textContent = maxSpeed.toFixed(1);
    const avgSpdEl = document.getElementById('cockpitAvgSpeed');
    if (avgSpdEl) avgSpdEl.textContent = avgSpeed.toFixed(1);

    // Battery Display with Multi-Format Normalization
    if (batteryLevel != null) {
      const norm = typeof normalizeBattery === 'function' ? normalizeBattery(batteryLevel) : Math.round(Number(batteryLevel));
      if (norm != null) {
        currentBatteryLevel = norm;
      }
    }
    const battEl = document.getElementById('cockpitBattery');
    if (battEl) {
      battEl.textContent = currentBatteryLevel != null ? `${currentBatteryLevel}%` : '--%';
    }

    // Nearest point & distance covered (protecting loop course from false finish)
    const nearest = findNearestRoutePoint(lat, lng, routeCoords, totalKm, lastNearestIndex, totalGroundKm);
    lastNearestIndex = nearest.index;
    const offRouteInfo = checkOffRoute(lat, lng, routeCoords, 100);

    // Ground odometer: accumulate real GPS displacement across fixes (especially active when off-route)
    if (lastOdoLat != null && lastOdoLng != null) {
      const stepKm = typeof haversineKm === 'function' ? haversineKm(lastOdoLat, lastOdoLng, lat, lng) : 0;
      if (stepKm >= 0.003 && stepKm < 3.0) {
        totalGroundKm = Math.round(((totalGroundKm || nearest.distanceKm) + stepKm) * 100) / 100;
      }
    } else {
      totalGroundKm = (nearest.distanceKm > 0 && nearest.progressPct < 50) ? nearest.distanceKm : 0;
    }
    lastOdoLat = lat;
    lastOdoLng = lng;

    coveredKm = offRouteInfo.isOffRoute
      ? Math.max(nearest.distanceKm, Math.round((totalGroundKm || nearest.distanceKm) * 10) / 10)
      : nearest.distanceKm;
    const remainingKm = Math.max(0, Math.round((totalKm - nearest.distanceKm) * 10) / 10);
    const progressPct = nearest.progressPct;

    document.getElementById('cockpitDistCovered').textContent = coveredKm.toFixed(1);
    document.getElementById('cockpitDistRemaining').textContent = remainingKm.toFixed(1);
    document.getElementById('cockpitProgressPct').textContent = `Progress: ${progressPct}%`;
    document.getElementById('cockpitGpsStatus').textContent = 'GPS Terhubung';
    document.getElementById('cockpitCoordsSub').textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    // Update OLED Dark Pocket Mode Display
    const oledSpeed = document.getElementById('oledSpeedVal');
    if (oledSpeed) oledSpeed.textContent = currentSpeed.toFixed(1);
    const oledDist = document.getElementById('oledDistVal');
    if (oledDist) {
      const hrs = String(Math.floor(movingSeconds / 3600)).padStart(2, '0');
      const mins = String(Math.floor((movingSeconds % 3600) / 60)).padStart(2, '0');
      const secs = String(movingSeconds % 60).padStart(2, '0');
      oledDist.textContent = `${coveredKm.toFixed(1)} km • ${hrs}:${mins}:${secs}`;
    }

    // Off-Route Check (Sound-Only Alert, No Vibration)
    const offRouteBanner = document.getElementById('cockpitOffRouteAlert');
    if (offRouteInfo.isOffRoute) {
      isCurrentlyOffRoute = true;
      if (offRouteBanner) {
        offRouteBanner.classList.add('active');
      }
      const devEl = document.getElementById('cockpitDeviationText');
      if (devEl) {
        devEl.textContent = `Deviasi: +${offRouteInfo.deviationMeters}m dari trek${offRouteMutedByUser ? ' (Suara diheningkan)' : ''}`;
      }
      if (!offRouteMutedByUser) {
        startOffRouteAlert();
      }
    } else {
      // Rider kembali ke rute resmi (Auto-Stop & Reset status)
      if (isCurrentlyOffRoute) {
        isCurrentlyOffRoute = false;
        offRouteMutedByUser = false;
        stopOffRouteAlert();
        const btnMute = document.getElementById('btnDismissOffRoute');
        if (btnMute) {
          btnMute.innerHTML = '🔇 Matikan Suara';
          btnMute.classList.remove('muted');
        }
      }
      if (offRouteBanner) {
        offRouteBanner.classList.remove('active');
      }
      stopOffRouteAlert();
    }

    // Checkpoint Calculation (simple progress fill towards next checkpoint)
    updateCheckpointWidget(coveredKm, avgSpeed);
  }

  function updateCheckpointWidget(currentCoveredKm, movingAvg) {
    lastCoveredKm = currentCoveredKm;
    renderCotWidget(currentCoveredKm);

    if (!checkpoints.length) return;

    // Find next checkpoint
    const nextCp = checkpoints.find(cp => cp.km_distance > currentCoveredKm) || checkpoints[checkpoints.length - 1];
    const isPastAll = currentCoveredKm >= checkpoints[checkpoints.length - 1].km_distance;

    if (isPastAll) {
      document.getElementById('cockpitCpProximityAlert')?.classList.remove('active');
      return;
    }

    const distToCp = Math.max(0, Math.round((nextCp.km_distance - currentCoveredKm) * 10) / 10);

    // Checkpoint Proximity Detection (< 200m / 0.2km)
    const proxBanner = document.getElementById('cockpitCpProximityAlert');
    const proxTitle = document.getElementById('cockpitProximityTitle');
    const proxSub = document.getElementById('cockpitProximitySub');

    if (distToCp <= 0.2 && distToCp >= 0) {
      const cpKey = nextCp.id != null ? `cp_${nextCp.id}` : `cp_${nextCp.name}_${nextCp.km_distance}`;
      if (!notifiedCpSet.has(cpKey)) {
        notifiedCpSet.add(cpKey);
        playCheckpointChime();
      }
      if (proxBanner) {
        proxBanner.classList.add('active');
        if (proxTitle) proxTitle.textContent = `📍 MENDEKATI ${nextCp.name.toUpperCase()}!`;
        if (proxSub) {
          const meters = Math.max(10, Math.round(distToCp * 1000));
          proxSub.textContent = `Jarak tersisa: ${meters}m (KM ${nextCp.km_distance}) • Siapkan kartu brevet / stampel kontrol`;
        }
      }
    } else if (distToCp > 0.3) {
      if (proxBanner) proxBanner.classList.remove('active');
    }
  }

  // ── Virtual COT widget ──────────────────────────────────────
  function renderCotWidget(km) {
    const card = document.getElementById('cockpitCotCard');
    if (!card) return;

    const data = cotStatusCache;
    if (!data || !data.enabled) {
      card.style.display = 'none';
      return;
    }

    card.style.display = 'block';

    const titleEl = document.getElementById('cockpitCotTitle');
    const pillEl = document.getElementById('cockpitCotPill');
    const kmEl = document.getElementById('cockpitCotKm');
    const diffEl = document.getElementById('cockpitCotDiff');

    const cotKm = Number(data.distance_km) || 0;
    const riderKm = Number(km) || 0;
    const diff = riderKm - cotKm;
    const diffStr = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} km`;
    const paceStr = data.pace ? ` · ${data.pace} km/jam` : '';

    const setPill = (text, cls) => {
      if (!pillEl) return;
      pillEl.textContent = text;
      pillEl.className = `cockpit-cp-status-pill ${cls}`;
    };

    if (kmEl) kmEl.textContent = `${cotKm.toFixed(1)} km`;
    if (diffEl) diffEl.textContent = diffStr;

    // DNF is sticky — checked first
    const dnfIds = (data.dnf_riders || []).map(r => Number(r.rider_id));
    if (dnfIds.includes(Number(rider.id))) {
      if (titleEl) titleEl.textContent = 'Virtual COT — DNF';
      setPill('DNF', 'late');
      return;
    }

    if (data.status === 'NOT_STARTED') {
      if (titleEl) titleEl.textContent = `Virtual COT · mulai ${data.start_time || '—'} WIB · selesai ±${data.end_time || '—'} WIB${paceStr}`;
      setPill('BELUM MULAI', 'warning');
      return;
    }

    if (data.status === 'FINISHED') {
      if (titleEl) titleEl.textContent = `Virtual COT — selesai ±${data.end_time || '—'} WIB`;
      setPill('SELESAI', 'safe');
      return;
    }

    if (data.evaluation && (data.evaluation.state === 'deferred' || data.evaluation.state === 'disabled')) {
      if (titleEl) titleEl.textContent = `Virtual COT${paceStr}`;
      setPill('TERTUNDA', 'warning');
      return;
    }

    if (titleEl) titleEl.textContent = `Virtual COT${paceStr}`;

    if (diff >= 1) {
      setPill(`AMAN (+${diff.toFixed(1)} km)`, 'safe');
    } else if (diff >= -1) {
      setPill(`ME PET (${diffStr})`, 'warning');
    } else {
      setPill(`TERTINGGAL (${diffStr})`, 'late');
    }
  }

  async function refreshCotStatus() {
    if (!cockpitActive) return;
    try {
      const savedPin = sessionStorage.getItem('event_pin_' + event.id) || '';
      const res = await fetch(`/api/events/${event.id}/virtual-cot`, {
        headers: savedPin ? { 'x-event-pin': savedPin } : {}
      });
      if (!res.ok) return;
      cotStatusCache = await res.json();
      renderCotWidget(lastCoveredKm);
    } catch (err) {
      // Silent: COT widget is an enhancement, never break the cockpit
    }
  }

  // ── 7. Resilient WebSocket Live Telemetry Listener ──
  function connectCockpitWs() {
    if (!cockpitActive) return;
    if (cockpitWsReconnectTimer) {
      clearTimeout(cockpitWsReconnectTimer);
      cockpitWsReconnectTimer = null;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const cockpitPin = sessionStorage.getItem('event_pin_' + event.id) || '';
    const cockpitWsQuery = `event_id=${event.id}${cockpitPin ? `&pin=${encodeURIComponent(cockpitPin)}` : ''}`;
    cockpitWs = new WebSocket(`${proto}//${window.location.host}/traccar-ws?${cockpitWsQuery}`);

    cockpitWs.onopen = () => {
      if (!cockpitActive) return;
      cockpitWsBackoffMs = 2000;
      console.log('[Cockpit WS] Connected to live telemetri stream');
    };

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
              const isKmh = !!pos.isKmh;
              const rawBatt = pos.attributes?.batteryLevel != null
                ? pos.attributes.batteryLevel
                : (pos.battery != null ? pos.battery : null);
              updateTelemetry(pos.latitude, pos.longitude, rawSpeed, rawBatt, isKmh);
            }
          });
        }
      } catch (err) {
        console.warn('[Cockpit WS] Error processing message:', err);
      }
    };

    cockpitWs.onclose = () => {
      if (!cockpitActive) return;
      console.log(`[Cockpit WS] Connection closed. Reconnecting in ${cockpitWsBackoffMs / 1000}s...`);
      cockpitWsReconnectTimer = setTimeout(() => {
        if (cockpitActive) connectCockpitWs();
      }, cockpitWsBackoffMs);
      cockpitWsBackoffMs = Math.min(Math.round(cockpitWsBackoffMs * 1.5), 15000);
    };

    cockpitWs.onerror = err => {
      console.warn('[Cockpit WS] Error:', err);
    };
  }

  connectCockpitWs();

  // ── 8. Real Browser Geolocation Watcher with Offline Resilience ──
  let lastCockpitReportTime = 0;
  let offlineTelemetryQueue = [];
  try {
    const saved = localStorage.getItem('cyclopon_cockpit_offline');
    if (saved) offlineTelemetryQueue = JSON.parse(saved);
  } catch (e) {
    offlineTelemetryQueue = [];
  }

  if ('geolocation' in navigator) {
    cockpitGeoWatchId = navigator.geolocation.watchPosition(
      pos => {
        // GPS Accuracy & Jitter Filter: Ignore fixes with excessive error (> 100m)
        if (pos.coords.accuracy && pos.coords.accuracy > 100) {
          return;
        }

        const rawSpeed = pos.coords.speed != null ? pos.coords.speed * 3.6 : 0;
        updateTelemetry(pos.coords.latitude, pos.coords.longitude, rawSpeed, currentBatteryLevel, true);

        // If Pocket Mode (GpsKeeper) is actively running, let GpsKeeper handle server reporting
        // to prevent duplicate simultaneous telemetry submissions & distance jumps!
        if (window.GpsKeeper && GpsKeeper.isActive()) {
          return;
        }

        // Auto-report telemetry to server every 5 seconds for live tracking
        const now = Date.now();
        if (now - lastCockpitReportTime >= 5000) {
          lastCockpitReportTime = now;
          const point = {
            rider_id: rider.id,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            speed: currentSpeed,
            distance_km: coveredKm,
            battery: currentBatteryLevel,
            recorded_at: new Date().toISOString()
          };

          const payload = offlineTelemetryQueue.length > 0
            ? { positions: [...offlineTelemetryQueue, point] }
            : point;

          const historyPin = sessionStorage.getItem('event_pin_' + event.id) || '';
          fetch(`/api/events/${event.id}/history`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(historyPin ? { 'x-event-pin': historyPin } : {}),
              ...(rider && rider.token ? { 'x-rider-token': rider.token } : {})
            },
            body: JSON.stringify(payload)
          }).then(res => {
            if (res.ok) {
              offlineTelemetryQueue = [];
              try { localStorage.removeItem('cyclopon_cockpit_offline'); } catch (e) {}
            } else {
              offlineTelemetryQueue.push(point);
              if (offlineTelemetryQueue.length > 100) offlineTelemetryQueue.shift();
              try { localStorage.setItem('cyclopon_cockpit_offline', JSON.stringify(offlineTelemetryQueue)); } catch (e) {}
            }
          }).catch(() => {
            offlineTelemetryQueue.push(point);
            if (offlineTelemetryQueue.length > 100) offlineTelemetryQueue.shift();
            try { localStorage.setItem('cyclopon_cockpit_offline', JSON.stringify(offlineTelemetryQueue)); } catch (e) {}
          });
        }
      },
      err => console.log('[Cockpit Geolocation] Info:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }

  // Initial update with route start
  if (routeCoords.length) {
    updateTelemetry(routeCoords[0][0], routeCoords[0][1], 0, currentBatteryLevel, true);
  }

  // Manual Mute / Unmute off-route audio alert button
  const btnDismissOffRoute = document.getElementById('btnDismissOffRoute');
  btnDismissOffRoute?.addEventListener('click', () => {
    if (!offRouteMutedByUser) {
      // Rider menonaktifkan suara secara manual
      offRouteMutedByUser = true;
      stopOffRouteAlert();
      btnDismissOffRoute.innerHTML = '🔕 Terhening';
      btnDismissOffRoute.classList.add('muted');
      const devEl = document.getElementById('cockpitDeviationText');
      if (devEl) {
        devEl.textContent = devEl.textContent.replace(' (Suara diheningkan)', '') + ' (Suara diheningkan)';
      }
      showToast('🔇 Suara keluar rute diheningkan', 'info');
    } else {
      // Rider mengaktifkan kembali suara
      offRouteMutedByUser = false;
      btnDismissOffRoute.innerHTML = '🔇 Matikan Suara';
      btnDismissOffRoute.classList.remove('muted');
      startOffRouteAlert();
      const devEl = document.getElementById('cockpitDeviationText');
      if (devEl) {
        devEl.textContent = devEl.textContent.replace(' (Suara diheningkan)', '');
      }
      showToast('🔔 Suara keluar rute diaktifkan kembali', 'info');
    }
  });

  // Dismiss Checkpoint Proximity banner button
  document.getElementById('btnDismissProximityAlert')?.addEventListener('click', () => {
    document.getElementById('cockpitCpProximityAlert')?.classList.remove('active');
  });

  // ── Scan QR Checkpoint from Cockpit ──
  document.getElementById('btnCockpitCpScan')?.addEventListener('click', () => {
    if (typeof window.openCpQrScanner !== 'function') {
      showToast('Komponen scanner belum siap. Muat ulang halaman.', 'error');
      return;
    }
    window.openCpQrScanner({
      riderConfig: config,
      checkpoints,
      existingSplits: riderSplits,
      onCheckInSuccess: (data) => {
        if (data && data.split && !riderSplits.some(s => Number(s.checkpoint_id) === Number(data.split.checkpoint_id))) {
          riderSplits.push(data.split);
          const scanLabel = document.getElementById('cockpitCpScanLabel');
          if (scanLabel && checkpoints.length) {
            scanLabel.textContent = `Scan CP (${riderSplits.length}/${checkpoints.length})`;
          }
        }
      }
    });
  });

  // ── Auto & Manual Dark / Light Mode ──
  const btnToggleTheme = document.getElementById('btnToggleTheme');
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');
  const savedNight = localStorage.getItem('cyclopon_cockpit_night');
  let nightModeActive = false;
  if (savedNight !== null) {
    nightModeActive = savedNight === 'true';
  } else {
    const curHour = new Date().getHours();
    nightModeActive = curHour < 6 || curHour >= 18;
  }
  const cockpitContainer = document.querySelector('.cockpit-container');
  const bottomBar = document.querySelector('.cockpit-bottom-bar');

  function updateThemeButton(isNight) {
    if (themeIcon) themeIcon.textContent = isNight ? '☀️' : '🌙';
    if (themeText) themeText.textContent = isNight ? 'Terang' : 'Gelap';
    if (btnToggleTheme) {
      btnToggleTheme.title = isNight ? 'Beralih ke Mode Terang (Siang)' : 'Beralih ke Mode Gelap (Malam/AMOLED)';
    }
  }

  function applyNightMode(isNight) {
    if (isNight) {
      document.body.classList.add('night-mode');
      cockpitContainer?.classList.add('night-mode');
      bottomBar?.classList.add('night-mode');
    } else {
      document.body.classList.remove('night-mode');
      cockpitContainer?.classList.remove('night-mode');
      bottomBar?.classList.remove('night-mode');
    }
    updateThemeButton(isNight);
  }

  applyNightMode(nightModeActive);

  btnToggleTheme?.addEventListener('click', () => {
    nightModeActive = !nightModeActive;
    try {
      localStorage.setItem('cyclopon_cockpit_night', String(nightModeActive));
    } catch (e) {}
    applyNightMode(nightModeActive);
    if (window.showToast) {
      showToast(nightModeActive ? '🌙 Mode Gelap Aktif' : '☀️ Mode Terang Aktif', 'info');
    }
  });

  // ── Logout Rider from Cockpit ──
  const btnCockpitLogout = document.getElementById('btnCockpitLogout');
  if (btnCockpitLogout) {
    btnCockpitLogout.addEventListener('click', () => {
      if (confirm('Keluar dari Cockpit HUD dan kembali ke login?')) {
        if (window.GpsKeeper && GpsKeeper.isActive()) {
          GpsKeeper.stop();
        }
        teardownRiderCockpit();
        sessionStorage.removeItem('riderConfig');
        localStorage.removeItem('riderConfig');
        if (window.showToast) showToast('Berhasil keluar dari Cockpit.', 'info');
        Router.navigate('/rider');
      }
    });
  }

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
  sosModal.addEventListener('click', (e) => {
    if (e.target === sosModal) closeSos();
  });

  document.querySelectorAll('.sos-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sos-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSosType = btn.dataset.type;
    });
  });

  initSosReasonChips(
    document.getElementById('cockpitSosReasonChips'),
    document.getElementById('cockpitSosMsgInput')
  );

  btnConfirmSos.addEventListener('click', async () => {
    const note = document.getElementById('cockpitSosMsgInput').value.trim();
    btnConfirmSos.disabled = true;
    btnConfirmSos.textContent = 'MENGIRIM...';

    const payload = {
      rider_id: rider.id,
      type: selectedSosType,
      lat: currentLat || (routeCoords[0] ? routeCoords[0][0] : null),
      lng: currentLng || (routeCoords[0] ? routeCoords[0][1] : null),
      message: note
    };

    try {
      const sosPin = sessionStorage.getItem('event_pin_' + event.id) || '';
      const res = await fetch(`/api/events/${event.id}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sosPin ? { 'x-event-pin': sosPin } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const sentLabel = sosTypeLabel(selectedSosType);
        showToast(`🚨 SOS terkirim: ${sentLabel}${note ? ` — ${note}` : ''}`, 'success');
        closeSos();
      } else {
        const errJson = await res.json().catch(() => ({}));
        showToast(errJson.error || 'Gagal mengirim SOS. Coba lagi atau hubungi panitia.', 'error');
      }
    } catch (err) {
      showToast('Koneksi terputus saat kirim SOS.', 'error');
    } finally {
      btnConfirmSos.disabled = false;
      btnConfirmSos.textContent = '🚨 KIRIM SEKARANG';
    }
  });
}

// Teardown function when navigating away or unmounting Cockpit HUD
function teardownRiderCockpit() {
  document.body.classList.remove('cockpit-active', 'night-mode');
  document.querySelector('.cockpit-bottom-bar')?.classList.remove('night-mode');
  if (cockpitActive) {
    cockpitActive = false;
    notifiedCpSet.clear();
    if (cockpitTimerInterval) {
      clearInterval(cockpitTimerInterval);
      cockpitTimerInterval = null;
    }
    if (cockpitCotTimer) {
      clearInterval(cockpitCotTimer);
      cockpitCotTimer = null;
    }
    if (cockpitWakeLock) {
      cockpitWakeLock.release().catch(() => {});
      cockpitWakeLock = null;
    }
    if (cockpitWsReconnectTimer) {
      clearTimeout(cockpitWsReconnectTimer);
      cockpitWsReconnectTimer = null;
    }
    if (cockpitWs) {
      try { cockpitWs.close(); } catch (e) {}
      cockpitWs = null;
    }
    if (cockpitGeoWatchId != null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(cockpitGeoWatchId);
      cockpitGeoWatchId = null;
    }
    // Note: Do NOT stop GpsKeeper here so Pocket Mode keeps tracking in the background
    // even when the rider views Live Map or navigates between pages!
    stopOffRouteAlert();
    isCurrentlyOffRoute = false;
    offRouteMutedByUser = false;
    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
    if (deviceBatteryManager && batteryChangeHandler) {
      try {
        deviceBatteryManager.removeEventListener('levelchange', batteryChangeHandler);
        deviceBatteryManager.removeEventListener('chargingchange', batteryChangeHandler);
      } catch (e) {}
      deviceBatteryManager = null;
      batteryChangeHandler = null;
    }
  }
}

window.teardownRiderCockpit = teardownRiderCockpit;
window.addEventListener('popstate', teardownRiderCockpit);

