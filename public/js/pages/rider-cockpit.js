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
        <div class="cockpit-topbar-row">
          <div class="cockpit-rider-info">
            <a href="/rider/setup" data-link class="cockpit-hub-link" title="Kembali ke Rider Hub">🏠 Hub</a>
            <span class="cockpit-bib-badge">BIB #${rider.bib}</span>
            <span class="cockpit-rider-name" title="${rider.name}">${rider.name}</span>
          </div>
          <div class="cockpit-top-quick">
            <button id="btnToggleFullscreen" class="cockpit-pill-btn icon-only" title="Fullscreen HUD">⛶</button>
            <button id="btnCockpitLogout" class="cockpit-pill-btn icon-only danger" title="Keluar / Logout">🚪</button>
          </div>
        </div>
        <div class="cockpit-top-actions">
          <button id="btnShareCockpit" class="cockpit-pill-btn" title="Bagikan Tautan Live Tracking Saya ke WhatsApp / Medsos">
            📲 <span id="shareStatusText">Bagikan</span>
          </button>
          <button id="btnTogglePocket" class="cockpit-pill-btn" title="Mode Kantong Jersey (Background GPS Keep-Alive saat layar dikunci)">
            <span id="pocketIcon">🎒</span> <span id="pocketStatusText">Kantong</span>
          </button>
          <button id="btnToggleNight" class="cockpit-pill-btn" title="Mode Malam AMOLED / Siang">
            <span id="nightIcon">🌙</span> <span id="nightStatusText">Malam</span>
          </button>
          <button id="btnToggleAudio" class="cockpit-pill-btn" title="Toggle Suara Notifikasi Checkpoint">
            <span id="audioIcon">🔔</span> <span id="audioStatusText">Suara</span>
          </button>
          <button id="btnToggleWakeLock" class="cockpit-pill-btn" title="Toggle Screen Wake Lock">
            <span class="wake-icon">💡</span> <span id="wakeStatusText">Layar</span>
          </button>
          <button id="btnToggleSim" class="cockpit-pill-btn" title="Toggle Ride Simulator">
            🎮 <span id="simStatusText">Sim</span>
          </button>
        </div>
      </div>

      ${isDemo ? `
        <div style="background:rgba(242,132,47,0.14);border-bottom:1px solid rgba(242,132,47,0.35);padding:6px 14px;font-size:12px;color:var(--color-orange);display:flex;align-items:center;justify-content:space-between">
          <span>⚠️ <strong>Mode Demo Simulator</strong> — Anda belum login.</span>
          <a href="/rider" data-link style="color:var(--color-orange);font-weight:800;text-decoration:underline">Login Rider →</a>
        </div>
      ` : ''}

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

      <!-- Pocket Mode (Background GPS Keep-Alive) Status Banner -->
      <div id="cockpitPocketBanner" class="cockpit-pocket-banner">
        <div class="cockpit-pocket-header">
          <div class="cockpit-pocket-title">
            <span>🎒</span> <span>MODE KANTONG JERSEY AKTIF</span>
          </div>
          <button id="btnStopPocketMode" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:#FFF;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">
            Matikan
          </button>
        </div>
        <div class="cockpit-pocket-desc">
          Layar HP dapat dimatikan / dikunci sekarang. Silent audio loop menjaga browser tetap aktif mengirim titik GPS di latar belakang.
        </div>
        <div class="cockpit-pocket-stats">
          <span>📡 GPS: <strong id="pocketGpsAcc">Mencari...</strong></span>
          <span>•</span>
          <span>🚀 Terkirim: <strong id="pocketPointsSent">0 titik</strong></span>
          <span>•</span>
          <span>📦 Antrean Offline: <strong id="pocketQueueCount">0</strong></span>
        </div>
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

        <div class="cockpit-stat-box">
          <div class="cockpit-stat-label">
            <span>📐</span> Kemiringan (Grade)
          </div>
          <div class="cockpit-stat-value grade-val" id="cockpitGradeVal" data-grade-level="flat">
            0%
          </div>
          <div class="cockpit-stat-sub" id="cockpitEleSub">Elevasi: -- mdpl</div>
        </div>

        <div class="cockpit-stat-box">
          <div class="cockpit-stat-label">
            <span>⛰️</span> Total Elev Gain
          </div>
          <div class="cockpit-stat-value">
            <span id="cockpitElevGainVal">+0</span><span class="cockpit-stat-unit">m</span>
          </div>
          <div class="cockpit-stat-sub" id="cockpitClimbSummarySub">0 Tanjakan Terdeteksi</div>
        </div>
      </div>

      <!-- Dynamic ClimbPro Card (Auto-activated when approaching or climbing) -->
      <div class="cockpit-climb-card hidden" id="cockpitClimbCard">
        <div class="cockpit-climb-header">
          <div class="cockpit-climb-title-wrap">
            <span class="climb-cat-pill" id="cockpitClimbCatPill" style="background:#F59E0B">CAT 3</span>
            <span class="cockpit-climb-title" id="cockpitClimbTitle">Tanjakan 1</span>
          </div>
          <span class="cockpit-climb-avg" id="cockpitClimbAvg">Avg 6.5% • Max 12%</span>
        </div>

        <div class="cockpit-climb-canvas-container">
          <canvas id="cockpitClimbCanvas"></canvas>
        </div>

        <div class="cockpit-climb-stats">
          <div class="cockpit-climb-stat-item">
            <div class="cockpit-climb-stat-lbl">Sisa Jarak</div>
            <div class="cockpit-climb-stat-val" id="cockpitClimbDistRemaining">-- km</div>
          </div>
          <div class="cockpit-climb-stat-item">
            <div class="cockpit-climb-stat-lbl">Sisa Elevasi</div>
            <div class="cockpit-climb-stat-val" id="cockpitClimbElevRemaining">+-- m</div>
          </div>
          <div class="cockpit-climb-stat-item">
            <div class="cockpit-climb-stat-lbl">Kemiringan</div>
            <div class="cockpit-climb-stat-val grade-val" id="cockpitClimbGradeLive">0%</div>
          </div>
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
          <button id="btnRecenterMap" style="background:#FFF;border:1px solid #0D1117;color:#0D1117;font-size:11px;font-weight:800;font-family:monospace;padding:2px 8px;border-radius:4px;cursor:pointer">
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
                 style="width:100%;padding:10px 12px;background:#FFFFFF;border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-size:13px">
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

  // ── Share Live Tracking Link ──
  const btnShareCockpit = document.getElementById('btnShareCockpit');
  if (btnShareCockpit) {
    btnShareCockpit.addEventListener('click', async () => {
      const shareUrl = `${window.location.origin}/watch/${event.id}?bib=${encodeURIComponent(rider.bib)}`;
      const shareText = `🚴 Pantau posisi gowes saya (${rider.name} - BIB #${rider.bib}) secara langsung di ${event.name} via CycloPon Live Map:\n${shareUrl}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: `Live Tracking ${rider.name} - CycloPon`,
            text: shareText,
            url: shareUrl
          });
          showToast('Tautan pelacakan berhasil dibagikan!', 'success');
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          showToast('✓ Tautan Live Tracking disalin ke clipboard!', 'success');
        } catch {
          prompt('Salin link tracking ini:', shareUrl);
        }
      } else {
        prompt('Salin link tracking ini:', shareUrl);
      }
    });
  }

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

  // Fallback coords for demo or empty route
  if (!routeCoords.length) {
    routeCoords = [
      [-6.9147, 107.6098],
      [-6.9170, 107.6150],
      [-6.9200, 107.6200],
      [-6.9250, 107.6300],
      [-6.9300, 107.6400],
      [-6.9350, 107.6500],
      [-6.9400, 107.6600],
      [-6.9450, 107.6700]
    ];
    totalKm = 25.0;
    gpxPoints = [];
    for (let i = 0; i < routeCoords.length; i++) {
      const dist = Math.round((i / (routeCoords.length - 1)) * totalKm * 100) / 100;
      let ele = 100;
      if (dist >= 6 && dist <= 15) {
        ele = 100 + ((dist - 6) / 9) * 280;
      } else if (dist > 15) {
        ele = 380 - ((dist - 15) / 10) * 150;
      }
      gpxPoints.push({ lat: routeCoords[i][0], lng: routeCoords[i][1], ele: Math.round(ele * 10) / 10, distKm: dist, gradePct: 0 });
    }
    routeClimbs = typeof detectClimbs === 'function' ? detectClimbs(gpxPoints) : [];
    totalElevGain = 280;
  }

  document.getElementById('cockpitTotalDistSub').textContent = `Total Rute: ${totalKm} km`;
  const climbSumInit = document.getElementById('cockpitClimbSummarySub');
  if (climbSumInit) climbSumInit.textContent = `${routeClimbs.length} Tanjakan Terdeteksi`;

  // Initial Checkpoint state
  updateCheckpointWidget(0, 0);

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

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(cockpitMap);

    // Draw route polyline
    cockpitRoutePolyline = L.polyline(routeCoords, {
      color: '#D1A980',
      weight: 4,
      opacity: 0.85
    }).addTo(cockpitMap);

    // Add Checkpoint markers to mini-map
    checkpoints.forEach(cp => {
      if (cp.lat && cp.lng) {
        const cpIcon = L.divIcon({
          className: 'cp-mini-icon',
          html: `<div style="background:var(--color-primary);color:#FFFFFF;font-size:10px;font-weight:900;padding:2px 5px;border-radius:4px;border:1px solid #E5E0D8;white-space:nowrap">${cp.name}</div>`,
          iconSize: [60, 20],
          iconAnchor: [30, 10]
        });
        L.marker([cp.lat, cp.lng], { icon: cpIcon }).addTo(cockpitMap);
      }
    });

    // Rider marker
    const riderIcon = L.divIcon({
      className: 'rider-mini-icon',
      html: `<div style="width:18px;height:18px;border-radius:50%;background:#D1A980;border:3px solid #F8F8F8;box-shadow:0 0 12px #D1A980"></div>`,
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

    // Grade % and Altitude calculation
    let liveGrade = { gradePct: 0, ele: 0 };
    if (typeof getLiveGrade === 'function' && gpxPoints.length) {
      liveGrade = getLiveGrade(coveredKm, gpxPoints);
    }
    const gradeEl = document.getElementById('cockpitGradeVal');
    const eleEl = document.getElementById('cockpitEleSub');
    if (gradeEl) {
      const gPct = liveGrade.gradePct;
      gradeEl.textContent = `${gPct > 0 ? '+' : ''}${gPct}%`;
      gradeEl.setAttribute('data-grade-level', getGradeLevel(gPct));
    }
    if (eleEl) {
      eleEl.textContent = `Elevasi: ${Math.round(liveGrade.ele)} mdpl`;
    }

    // Cumulative elevation gain so far
    let gainSoFar = 0;
    for (let p = 1; p < gpxPoints.length; p++) {
      if (gpxPoints[p].distKm > coveredKm) break;
      const dE = gpxPoints[p].ele - gpxPoints[p - 1].ele;
      if (dE > 0.25) gainSoFar += dE;
    }
    const gainEl = document.getElementById('cockpitElevGainVal');
    if (gainEl) gainEl.textContent = `+${Math.round(gainSoFar)}`;

    // Checkpoint & COT Calculation
    updateCheckpointWidget(coveredKm, avgSpeed);

    // Dynamic ClimbPro Card update
    updateCockpitClimbWidget(coveredKm, liveGrade);
  }

  function getGradeLevel(gradePct) {
    if (gradePct < -1) return 'downhill';
    if (gradePct <= 3) return 'flat';
    if (gradePct <= 6) return 'mild';
    if (gradePct <= 9) return 'moderate';
    if (gradePct <= 14) return 'steep';
    return 'extreme';
  }

  function updateCockpitClimbWidget(distKm, liveGrade) {
    const climbCard = document.getElementById('cockpitClimbCard');
    if (!climbCard) return;

    if (!routeClimbs || !routeClimbs.length || typeof getCurrentClimbStatus !== 'function') {
      climbCard.classList.add('hidden');
      return;
    }

    const climbStatus = getCurrentClimbStatus(distKm, routeClimbs);
    const { activeClimb, isUpcoming, distRemainingKm, elevRemainingM } = climbStatus;

    if (!activeClimb) {
      climbCard.classList.add('hidden');
      return;
    }

    climbCard.classList.remove('hidden');
    if (isUpcoming) {
      climbCard.classList.add('upcoming');
      const titleEl = document.getElementById('cockpitClimbTitle');
      if (titleEl) titleEl.textContent = `${activeClimb.name} (Segera)`;
    } else {
      climbCard.classList.remove('upcoming');
      const titleEl = document.getElementById('cockpitClimbTitle');
      if (titleEl) titleEl.textContent = activeClimb.name;
    }

    const catPill = document.getElementById('cockpitClimbCatPill');
    if (catPill) {
      catPill.textContent = activeClimb.category;
      catPill.style.backgroundColor = activeClimb.color;
    }

    const avgEl = document.getElementById('cockpitClimbAvg');
    if (avgEl) {
      avgEl.textContent = `Avg ${activeClimb.avgGrade}% • Max ${activeClimb.maxGrade}%`;
    }

    const remDistEl = document.getElementById('cockpitClimbDistRemaining');
    if (remDistEl) {
      remDistEl.textContent = `${distRemainingKm.toFixed(1)} km`;
    }

    const remElevEl = document.getElementById('cockpitClimbElevRemaining');
    if (remElevEl) {
      remElevEl.textContent = `+${elevRemainingM} m`;
    }

    const liveGradeEl = document.getElementById('cockpitClimbGradeLive');
    if (liveGradeEl) {
      const gPct = liveGrade.gradePct;
      liveGradeEl.textContent = `${gPct > 0 ? '+' : ''}${gPct}%`;
      liveGradeEl.setAttribute('data-grade-level', getGradeLevel(gPct));
    }

    // Render mini slope profile
    drawMiniClimbProfile(activeClimb, distKm);
  }

  function drawMiniClimbProfile(climb, riderDistKm) {
    const canvas = document.getElementById('cockpitClimbCanvas');
    if (!canvas || !gpxPoints.length) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const padL = 12;
    const padR = 12;
    const padT = 10;
    const padB = 10;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const startIdx = Math.max(0, climb.startIndex);
    const endIdx = Math.min(gpxPoints.length - 1, climb.endIndex);
    const pts = gpxPoints.slice(startIdx, endIdx + 1);
    if (pts.length < 2) return;

    const minEle = climb.startEle;
    const maxEle = Math.max(minEle + 10, climb.topEle);
    const startDist = climb.startKm;
    const endDist = climb.endKm;
    const distSpan = Math.max(0.1, endDist - startDist);

    const getX = d => padL + (Math.max(0, Math.min(distSpan, d - startDist)) / distSpan) * plotW;
    const getY = ele => padT + (1 - (Math.max(minEle, Math.min(maxEle, ele)) - minEle) / (maxEle - minEle)) * plotH;
    const baselineY = padT + plotH;

    // Gradient fill under slope
    const grad = ctx.createLinearGradient(0, padT, 0, baselineY);
    grad.addColorStop(0, climb.color);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.04)');

    ctx.beginPath();
    ctx.moveTo(getX(pts[0].distKm), baselineY);
    for (let i = 0; i < pts.length; i++) {
      ctx.lineTo(getX(pts[i].distKm), getY(pts[i].ele));
    }
    ctx.lineTo(getX(pts[pts.length - 1].distKm), baselineY);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Slope outline
    ctx.beginPath();
    ctx.moveTo(getX(pts[0].distKm), getY(pts[0].ele));
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(getX(pts[i].distKm), getY(pts[i].ele));
    }
    ctx.strokeStyle = climb.color;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Rider position indicator
    const rDist = Math.max(startDist, Math.min(endDist, riderDistKm));
    const rx = getX(rDist);
    const rProgress = Math.max(0, Math.min(1, (rDist - startDist) / distSpan));
    const rEle = minEle + (maxEle - minEle) * rProgress;
    const ry = getY(rEle);

    ctx.beginPath();
    ctx.arc(rx, ry, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = climb.color;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = climb.color;
    ctx.fill();

    // Summit flag
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('🏁', padL + plotW, padT + 8);
  }

  function updateCheckpointWidget(currentCoveredKm, movingAvg) {
    const cpCard = document.getElementById('cockpitCpCard');
    const cpDetails = cpCard?.querySelector('.cockpit-cp-details');
    const cpProgressEl = cpCard?.querySelector('.cockpit-cp-progress-bar');
    let noCpNotice = document.getElementById('cockpitNoCpNotice');

    if (!checkpoints.length) {
      const nameEl = document.getElementById('cockpitCpName');
      if (nameEl) nameEl.textContent = '🏁 Rute Bebas (Tanpa Transit)';
      const pill = document.getElementById('cockpitCpPill');
      if (pill) {
        pill.textContent = 'NAVIGASI GPX';
        pill.className = 'cockpit-cp-status-pill safe';
      }
      if (cpDetails) cpDetails.style.display = 'none';
      if (cpProgressEl) cpProgressEl.style.display = 'none';
      if (!noCpNotice && cpCard) {
        noCpNotice = document.createElement('div');
        noCpNotice.id = 'cockpitNoCpNotice';
        noCpNotice.style.cssText = 'font-size:12px;color:var(--cockpit-muted);display:flex;align-items:center;gap:6px;padding:4px 0';
        noCpNotice.innerHTML = '<span>ℹ️</span> Ikuti garis rute GPX pada peta hingga garis finish.';
        cpCard.appendChild(noCpNotice);
      }
      return;
    }

    if (cpDetails) cpDetails.style.display = 'grid';
    if (cpProgressEl) cpProgressEl.style.display = 'block';
    if (noCpNotice) noCpNotice.remove();

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
      document.getElementById('cockpitCpProximityAlert')?.classList.remove('active');
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
  let lastCockpitReportTime = 0;
  if ('geolocation' in navigator) {
    cockpitGeoWatchId = navigator.geolocation.watchPosition(
      pos => {
        const speedKmh = pos.coords.speed != null ? pos.coords.speed * 3.6 : 0;
        updateTelemetry(pos.coords.latitude, pos.coords.longitude, speedKmh);

        // Auto-report telemetry to server every 5 seconds for live tracking
        const now = Date.now();
        if (now - lastCockpitReportTime >= 5000) {
          lastCockpitReportTime = now;
          fetch(`/api/events/${event.id}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rider_id: rider.id,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              speed: speedKmh,
              distance_km: coveredKm,
              recorded_at: new Date().toISOString()
            })
          }).catch(() => {});
        }
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

  // Dismiss Checkpoint Proximity banner button
  document.getElementById('btnDismissProximityAlert')?.addEventListener('click', () => {
    document.getElementById('cockpitCpProximityAlert')?.classList.remove('active');
  });

  // ── AMOLED Night Mode Toggle & Persistence ──
  const btnToggleNight = document.getElementById('btnToggleNight');
  const nightIcon = document.getElementById('nightIcon');
  const nightStatusText = document.getElementById('nightStatusText');
  const cockpitContainer = document.querySelector('.cockpit-container');

  const savedNight = localStorage.getItem('cyclopon_cockpit_night');
  let nightModeActive = false;
  if (savedNight !== null) {
    nightModeActive = savedNight === 'true';
  } else {
    const curHour = new Date().getHours();
    nightModeActive = curHour < 6 || curHour >= 18;
  }

  function applyNightMode(isNight) {
    if (isNight) {
      document.body.classList.add('night-mode');
      cockpitContainer?.classList.add('night-mode');
      btnToggleNight?.classList.add('night-active');
      if (nightIcon) nightIcon.textContent = '☀️';
      if (nightStatusText) nightStatusText.textContent = 'Siang';
      if (btnToggleNight) btnToggleNight.title = 'Beralih ke Mode Siang (Terang)';
    } else {
      document.body.classList.remove('night-mode');
      cockpitContainer?.classList.remove('night-mode');
      btnToggleNight?.classList.remove('night-active');
      if (nightIcon) nightIcon.textContent = '🌙';
      if (nightStatusText) nightStatusText.textContent = 'Malam';
      if (btnToggleNight) btnToggleNight.title = 'Beralih ke Mode Malam AMOLED (Hitam Pekat Anti-Silau)';
    }
  }

  applyNightMode(nightModeActive);

  btnToggleNight?.addEventListener('click', () => {
    nightModeActive = !nightModeActive;
    localStorage.setItem('cyclopon_cockpit_night', nightModeActive);
    applyNightMode(nightModeActive);
    showToast(nightModeActive ? '🌙 Mode Malam AMOLED Aktif (Hemat Baterai)' : '☀️ Mode Siang Aktif', 'info');
  });

  // ── Audio Checkpoint Chime Toggle & Persistence ──
  const btnToggleAudio = document.getElementById('btnToggleAudio');
  const audioIcon = document.getElementById('audioIcon');
  const audioStatusText = document.getElementById('audioStatusText');

  function updateAudioBtnUI() {
    if (audioAlertEnabled) {
      btnToggleAudio?.classList.remove('audio-muted');
      if (audioIcon) audioIcon.textContent = '🔔';
      if (audioStatusText) audioStatusText.textContent = 'Suara';
      if (btnToggleAudio) btnToggleAudio.title = 'Audio Chime Checkpoint Aktif (Klik untuk Mute)';
    } else {
      btnToggleAudio?.classList.add('audio-muted');
      if (audioIcon) audioIcon.textContent = '🔕';
      if (audioStatusText) audioStatusText.textContent = 'Mute';
      if (btnToggleAudio) btnToggleAudio.title = 'Audio Chime Checkpoint Dimatikan (Klik untuk Aktifkan)';
    }
  }
  updateAudioBtnUI();

  btnToggleAudio?.addEventListener('click', () => {
    audioAlertEnabled = !audioAlertEnabled;
    localStorage.setItem('cyclopon_cockpit_audio', audioAlertEnabled);
    updateAudioBtnUI();
    if (audioAlertEnabled) {
      playCheckpointChime();
      showToast('🔔 Audio Chime Checkpoint Diaktifkan', 'info');
    } else {
      showToast('🔕 Audio Chime Checkpoint Dimatikan', 'info');
    }
  });

  // ── Pocket Mode (Background GPS Keep-Alive) Handlers ──
  const btnTogglePocket = document.getElementById('btnTogglePocket');
  const pocketIcon = document.getElementById('pocketIcon');
  const pocketStatusText = document.getElementById('pocketStatusText');
  const pocketBanner = document.getElementById('cockpitPocketBanner');
  const btnStopPocket = document.getElementById('btnStopPocketMode');
  const pocketGpsAcc = document.getElementById('pocketGpsAcc');
  const pocketPointsSent = document.getElementById('pocketPointsSent');
  const pocketQueueCount = document.getElementById('pocketQueueCount');

  function updatePocketUI(isActive) {
    if (isActive) {
      btnTogglePocket?.classList.add('pocket-active');
      pocketBanner?.classList.add('active');
      if (pocketStatusText) pocketStatusText.textContent = 'Kantong ON';
      if (pocketIcon) pocketIcon.textContent = '🟢';
    } else {
      btnTogglePocket?.classList.remove('pocket-active');
      pocketBanner?.classList.remove('active');
      if (pocketStatusText) pocketStatusText.textContent = 'Kantong';
      if (pocketIcon) pocketIcon.textContent = '🎒';
    }
  }

  btnTogglePocket?.addEventListener('click', async () => {
    if (window.GpsKeeper && GpsKeeper.isActive()) {
      GpsKeeper.stop();
      updatePocketUI(false);
      showToast('🎒 Mode Kantong Jersey Dinonaktifkan.', 'info');
    } else if (window.GpsKeeper) {
      updatePocketUI(true);
      showToast('🎒 Mode Kantong Jersey Aktif! Layar dapat dimatikan sekarang.', 'success');
      await GpsKeeper.start({
        rider,
        event,
        traccar: config.traccar,
        onUpdate: (data) => {
          updateTelemetry(data.latitude, data.longitude, data.speed);
        },
        onStatus: (status) => {
          if (pocketGpsAcc) pocketGpsAcc.textContent = status.accuracy ? `±${Math.round(status.accuracy)}m` : 'Aktif';
          if (pocketPointsSent) pocketPointsSent.textContent = `${status.pointsSent} titik`;
          if (pocketQueueCount) pocketQueueCount.textContent = `${status.offlineQueueCount}`;
        }
      });
    } else {
      showToast('Modul GPS Keeper sedang dimuat...', 'info');
    }
  });

  btnStopPocket?.addEventListener('click', () => {
    if (window.GpsKeeper && GpsKeeper.isActive()) {
      GpsKeeper.stop();
      updatePocketUI(false);
      showToast('🎒 Mode Kantong Jersey Dinonaktifkan.', 'info');
    }
  });

  // ── Logout Rider from Cockpit ──
  const btnCockpitLogout = document.getElementById('btnCockpitLogout');
  if (btnCockpitLogout) {
    btnCockpitLogout.addEventListener('click', () => {
      if (confirm('Keluar dari sesi rider dan kembali ke login?')) {
        sessionStorage.removeItem('riderConfig');
        localStorage.removeItem('riderConfig');
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
    document.body.classList.remove('night-mode');
    notifiedCpSet.clear();
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
    if (window.GpsKeeper && GpsKeeper.isActive()) {
      GpsKeeper.stop();
    }
    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
  }
});
