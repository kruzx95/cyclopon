async function renderLiveMap(params) {
  loadCss('/css/map.css?v=94');

  const eventId = params.eventId;
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const hasAdminParam = params.query?.admin === '1' || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('admin') === '1');
  const hasAdminSession = typeof window !== 'undefined' && Boolean(
    sessionStorage.getItem('adminUser') || localStorage.getItem('adminUser')
  );
  // Panitia / Admin mode on live map is strictly active only when ?admin=1 and an admin session exist
  const isAdmin = typeof window !== 'undefined' && Boolean(
    hasAdminParam && hasAdminSession
  );
  const app = document.getElementById('app');

  // ── Clean & Legal Vector SVGs (Google Maps / Clean Open-Standard Style) ──
  const ICONS = {
    layers: `<svg class="fab-svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
      <polyline points="2 17 12 22 22 17"></polyline>
      <polyline points="2 12 12 17 22 12"></polyline>
    </svg>`,
    fitRoute: `<svg class="fab-svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="7"></circle>
      <circle cx="12" cy="12" r="2.5" fill="currentColor"></circle>
      <line x1="12" y1="1" x2="12" y2="4"></line>
      <line x1="12" y1="20" x2="12" y2="23"></line>
      <line x1="1" y1="12" x2="4" y2="12"></line>
      <line x1="20" y1="12" x2="23" y2="12"></line>
    </svg>`,
    elevation: `<svg class="fab-svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m8 3 4 8 5-5 5 15H2L8 3z"></path>
      <path d="M4.14 15.08c2.62-1.57 5.24-1.43 7.86.42 2.74 1.94 5.49 2 8.23.19"></path>
    </svg>`,
    zoomIn: `<svg class="fab-svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>`,
    zoomOut: `<svg class="fab-svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>`,
    osmMap: `<svg class="layer-opt-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
      <line x1="9" y1="3" x2="9" y2="18"></line>
      <line x1="15" y1="6" x2="15" y2="21"></line>
    </svg>`,
    cycleMap: `<svg class="layer-opt-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="5.5" cy="17.5" r="3.5"></circle>
      <circle cx="18.5" cy="17.5" r="3.5"></circle>
      <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5L9.5 9H6"></path>
      <path d="M12 17.5V14l3.5-3.5 2 2.5"></path>
    </svg>`,
    satMap: `<svg class="layer-opt-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>`,
    leaderboard: `<svg class="nav-svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 20V10"></path>
      <path d="M12 20V4"></path>
      <path d="M6 20v-6"></path>
    </svg>`,
    trophy: `<svg class="nav-svg-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
      <path d="M4 22h16"></path>
      <path d="M10 14.66V17c0 .55-.45 1-1 1H7v2h10v-2h-2c-.55 0-1-.45-1-1v-2.34"></path>
      <path d="M6 4h12v5a6 6 0 0 1-12 0V4z"></path>
    </svg>`,
    replay: `<svg class="nav-svg-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 4v6h6"></path>
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
    </svg>`,
    replayFab: `<svg class="fab-svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 4v6h6"></path>
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
    </svg>`,
    downloadGpx: `<svg class="nav-svg-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>`,
    milestone: `<svg class="layer-opt-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
      <line x1="4" y1="22" x2="4" y2="15"></line>
    </svg>`
  };

  app.innerHTML = `
    <div class="live-map-wrapper">
      <!-- ── Unified Top Navigation Bar ── -->
      <header class="live-map-header ${isAdmin ? 'admin-mode' : 'spectator-mode'}">
        <div class="header-left">
          <a href="/" data-link class="header-back-btn" title="Kembali ke Beranda" aria-label="Kembali ke Beranda">
            <span class="back-arrow" aria-hidden="true">←</span>
          </a>
          <div class="header-title-stack">
            <a href="/" data-link class="header-logo" title="Kembali ke Beranda CycloPon">
              <span class="logo-text">CYCLOPON</span>
            </a>
            <div class="event-info-cluster">
              <h1 class="header-event-title" id="eventBadge">Memuat Event...</h1>
              <span class="header-event-stats" id="eventStats">Menghitung...</span>
            </div>
          </div>
          ${isAdmin ? `
            <span class="badge badge-admin-mode" style="background:#0D1117;color:#FFF;border:1.5px solid #0D1117;font-size:10px;padding:3px 8px;border-radius:4px;font-weight:900;letter-spacing:0.06em;font-family:monospace">🛡️ PANITIA</span>
          ` : ''}
        </div>

        <div class="header-right">
          ${isAdmin && !isMobile ? `
            <!-- Toggle Replay (Desktop, Admin Only) -->
            <button class="header-action-btn" id="btnToggleReplay" style="display:none" title="Putar Ulang Lintasan (Time Machine Replay)">
              ${ICONS.replay}<span class="action-btn-label">Replay</span>
            </button>
          ` : ''}
          ${!isMobile ? `
            <!-- Toggle Leaderboard (Desktop) -->
            <button class="header-action-btn active btn-highlight-leaderboard" id="btnToggleSidebar" title="Tampilkan / Sembunyikan Leaderboard">
              ${ICONS.leaderboard}<span class="action-btn-label">Leaderboard</span>
              <span class="badge" id="headerRiderCount" style="background:#FFFFFF;color:#0D1117;border:1px solid #0D1117;font-family:monospace;font-weight:900;border-radius:4px;padding:1px 6px">0</span>
            </button>
          ` : ''}
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
          ${isAdmin ? `<button class="btn-emergency-resolve" id="btnResolveEmergency">✓ Selesai</button>` : ''}
        </div>
      </div>

      <!-- ── Head-to-Head Comparison Modal ── -->
      <div id="h2hModalBackdrop" class="h2h-modal-backdrop" style="display:none">
        <div class="h2h-modal" id="h2hModalContent"></div>
      </div>

      <!-- ── Replay Video Export Modal (Admin Only) ── -->
      ${isAdmin ? `
      <div id="modalExportReplay" class="modal-backdrop" style="display:none">
        <div class="modal-card export-replay-modal">
          <div class="modal-header" style="padding:16px 20px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;justify-content:space-between">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:24px">🎥</span>
              <div>
                <h3 style="margin:0;font-size:16px;font-weight:900;color:#0D1117">Ekspor Video Replay</h3>
                <div style="font-size:11.5px;color:#64748B">Rekam pergerakan rute selayaknya screen recorder untuk dibagikan</div>
              </div>
            </div>
            <button class="btn-close-modal" id="btnCloseExportModal" style="background:none;border:none;font-size:18px;cursor:pointer;color:#64748B">✕</button>
          </div>
          <div class="modal-body" style="padding:18px 20px">
            <div style="margin-bottom:16px">
              <label style="font-size:11px;font-weight:800;text-transform:uppercase;color:#64748B;display:block;margin-bottom:8px">// PILIH METODE PEREKAMAN</label>
              <div class="export-mode-grid">
                <div class="export-mode-card active" id="cardModeScreen">
                  <div class="mode-icon">🖥️</div>
                  <div class="mode-title">Rekam Layar Peta</div>
                  <div class="mode-desc">Merekam langsung seluruh tampilan peta Leaflet dengan animasi marker halus, speedometer, dan leaderboard.</div>
                </div>
                <div class="export-mode-card" id="cardModeCanvas">
                  <div class="mode-icon">📱</div>
                  <div class="mode-title">Video Animasi Story</div>
                  <div class="mode-desc">Video 15-20 detik format Story (9:16) vertikal elegan ala Strava/Relive. Cocok untuk HP &amp; medsos.</div>
                </div>
              </div>
            </div>

            <div style="margin-bottom:16px" id="exportRiderFilterWrap">
              <label for="exportRiderSelect" style="font-size:11px;font-weight:800;text-transform:uppercase;color:#64748B;display:block;margin-bottom:8px">// TARGET REKAMAN (RIDER)</label>
              <select id="exportRiderSelect" style="width:100%;padding:9px 12px;border:1.5px solid #CBD5E1;border-radius:8px;font-size:13px;font-weight:700;color:#0D1117;background:#FFF;cursor:pointer">
                <option value="all">🏁 Semua Rider (Race Overview)</option>
              </select>
            </div>

            <div style="margin-bottom:16px">
              <label style="font-size:11px;font-weight:800;text-transform:uppercase;color:#64748B;display:block;margin-bottom:8px">// KECEPATAN PUTAR REKAMAN</label>
              <div class="export-speed-pills">
                <button type="button" class="export-speed-pill" data-speed="1">1× Normal</button>
                <button type="button" class="export-speed-pill" data-speed="2">2× Cepat</button>
                <button type="button" class="export-speed-pill active" data-speed="4">4× Story</button>
                <button type="button" class="export-speed-pill" data-speed="8">8× Kilat</button>
                <button type="button" class="export-speed-pill" data-speed="16">16× Turbo</button>
              </div>
            </div>

            <div id="exportCanvasProgressWrap" style="display:none;margin-top:14px;background:#F8FAFC;border:1.5px solid #CBD5E1;border-radius:10px;padding:14px;text-align:center">
              <div style="font-size:12.5px;font-weight:800;color:#0D1117;margin-bottom:8px" id="exportProgressText">Memproses Render Video... 0%</div>
              <div style="height:8px;background:#E2E8F0;border-radius:99px;overflow:hidden">
                <div id="exportProgressBar" style="height:100%;width:0%;background:#10B981;transition:width 0.15s"></div>
              </div>
            </div>
          </div>
          <div class="modal-footer" style="padding:14px 20px;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid #E2E8F0;background:#F8FAFC">
            <button type="button" class="btn" id="btnCancelExportModal" style="padding:8px 16px;border-radius:6px;border:1px solid #CBD5E1;background:#FFF;font-weight:700">Batal</button>
            <button type="button" class="btn" id="btnStartExportVideo" style="padding:8px 18px;border-radius:6px;background:#E11D48;border:1px solid #BE123C;color:#FFF;font-weight:800">
              🔴 Mulai Merekam
            </button>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- ── Viewport Grid (Map + Sidebar) ── -->
      <div class="map-viewport" id="mapViewport">
        <div class="map-container ${isMobile ? '' : 'elev-open'}" id="mapContainer">
          <div id="leaflet-map"></div>

          <!-- Virtual COT notice banner -->
          <div id="cotBanner" style="display:none;position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:950;max-width:min(92%,640px);pointer-events:none">
            <div style="display:flex;align-items:center;gap:8px;background:rgba(255,251,235,0.97);border:1px solid #FCD34D;border-radius:99px;padding:6px 14px;font-size:12px;font-weight:800;color:#92400E;box-shadow:0 4px 14px rgba(0,0,0,0.12)">
              <span id="cotBannerText">COT Virtual</span>
            </div>
          </div>

          <!-- ── Floating Map Action Controls (Google Maps / Strava Style) ── -->
          <div class="map-floating-stack" id="mapFloatingStack">
            <!-- Floating Layer Picker FAB -->
            <div class="fab-layer-wrap" id="fabLayerWrap">
              <button class="map-fab-btn" id="fabLayerToggle" title="Ganti Lapisan Peta" aria-label="Ganti Lapisan Peta">
                ${ICONS.layers}
              </button>
              
              <!-- Popover Menu Pilihan Peta -->
              <div class="fab-layer-popover" id="fabLayerPopover" style="display:none">
                <div class="layer-popover-title">Pilih Lapisan Peta</div>
                <div class="layer-popover-list">
                  <button class="layer-opt-btn active" id="btnLayerOsm">
                    <span class="layer-opt-svg-wrap">${ICONS.osmMap}</span>
                    <div class="layer-opt-info">
                      <span class="layer-opt-name">OSM (Jalan)</span>
                      <span class="layer-opt-desc">Jalan raya & navigasi standar</span>
                    </div>
                    <span class="layer-opt-check">✓</span>
                  </button>
                  <button class="layer-opt-btn" id="btnLayerCycle">
                    <span class="layer-opt-svg-wrap">${ICONS.cycleMap}</span>
                    <div class="layer-opt-info">
                      <span class="layer-opt-name">CyclOSM</span>
                      <span class="layer-opt-desc">Kontur bukit & rute sepeda</span>
                    </div>
                    <span class="layer-opt-check">✓</span>
                  </button>
                  <button class="layer-opt-btn" id="btnLayerSat">
                    <span class="layer-opt-svg-wrap">${ICONS.satMap}</span>
                    <div class="layer-opt-info">
                      <span class="layer-opt-name">Esri Satelit</span>
                      <span class="layer-opt-desc">Citra foto satelit bumi</span>
                    </div>
                    <span class="layer-opt-check">✓</span>
                  </button>
                </div>
                <div class="layer-popover-divider"></div>
                <div class="layer-popover-title">Fitur Lintasan</div>
                <div class="layer-popover-list">
                  <button class="layer-opt-btn active" id="btnToggleKmMilestones" title="Aktifkan/nonaktifkan penanda titik kilometer di lintasan">
                    <span class="layer-opt-svg-wrap">${ICONS.milestone}</span>
                    <div class="layer-opt-info">
                      <span class="layer-opt-name">Titik Kilometer</span>
                      <span class="layer-opt-desc">Penanda KM adaptif rute</span>
                    </div>
                    <span class="layer-opt-check">✓</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Elevation Profile Toggle FAB -->
            <button class="map-fab-btn ${isMobile ? '' : 'active'}" id="btnToggleElevation" title="Buka / Tutup Profil Elevasi" aria-label="Toggle Elevasi">
              ${ICONS.elevation}
            </button>

            <!-- Center Rider / Fit Route FAB -->
            <button class="map-fab-btn" id="btnFitRoute" title="Pusatkan peta ke posisi rider / seluruh lintasan" aria-label="Pusatkan Peta">
              ${ICONS.fitRoute}
            </button>

            <!-- Zoom Controls (In / Out Pill) -->
            <div class="map-zoom-group" id="mapZoomGroup">
              <button type="button" class="map-fab-btn zoom-btn zoom-in" id="btnZoomIn" title="Perbesar Peta" aria-label="Zoom In">
                ${ICONS.zoomIn}
              </button>
              <div class="zoom-divider"></div>
              <button type="button" class="map-fab-btn zoom-btn zoom-out" id="btnZoomOut" title="Perkecil Peta" aria-label="Zoom Out">
                ${ICONS.zoomOut}
              </button>
            </div>
          </div>

          <!-- ── Sponsor Logo Strip (di atas Leaderboard) ── -->
          <div id="supporterStrip" class="supporter-strip" style="display:none">
            <span class="supporter-strip-label" id="supporterStripLabel">Didukung oleh</span>
            <div class="supporter-strip-logos" id="supporterStripLogos"></div>
          </div>

          ${isAdmin ? `
          <!-- ── Time Machine Replay Control Bar (Admin Only) ── -->
          <div id="replayControlBar" class="replay-control-bar" style="display:none">
            <div class="replay-bar-inner">
              <button id="btnReplayPrevCp" class="replay-btn replay-nav-btn" title="Lompat ke Pos Checkpoint Sebelumnya" aria-label="CP Sebelumnya">⏮ CP</button>
              <button id="btnReplayPlay" class="replay-play-btn" title="Play / Pause Replay" aria-label="Play / Pause">⏸</button>
              <button id="btnReplayNextCp" class="replay-btn replay-nav-btn" title="Lompat ke Pos Checkpoint Berikutnya" aria-label="CP Berikutnya">CP ⏭</button>
              <div class="replay-time-display">
                <span class="replay-badge">WAKTU REPLAY</span>
                <span id="replayClock" class="replay-clock">--:--:--</span>
              </div>
              <div class="replay-slider-wrap">
                <span id="replayStartTime" class="replay-time-bound">--:--</span>
                <input type="range" id="replaySlider" class="replay-slider" min="0" max="100" value="0" step="1" aria-label="Seek Replay">
                <span id="replayEndTime" class="replay-time-bound">--:--</span>
              </div>
              <div class="replay-speed-group">
                <button class="replay-speed-btn active" data-speed="1">1×</button>
                <button class="replay-speed-btn" data-speed="2">2×</button>
                <button class="replay-speed-btn" data-speed="4">4×</button>
                <button class="replay-speed-btn" data-speed="8">8×</button>
                <button class="replay-speed-btn" data-speed="16">16×</button>
                <button class="replay-speed-btn" data-speed="32">32×</button>
              </div>
              <button id="btnToggleReplayAutoSkip" class="replay-btn replay-skip-btn active" title="Otomatis lewati jeda waktu tanpa pergerakan (jam mati)">⏩ Skip Jeda</button>
              <button id="btnExportReplayVideo" class="replay-btn replay-export-btn" title="Rekam & Ekspor Video Replay">🎥 Rekam Video</button>
              <button id="btnExitReplay" class="replay-btn replay-exit-btn" title="Keluar dari Replay">✕ Kembali Live</button>
            </div>
          </div>

          <!-- ── Floating Replay Recording Indicator (Admin Only) ── -->
          <div id="replayRecordingBar" class="replay-recording-floating-bar" style="display:none">
            <span class="recording-pulse-dot"></span>
            <span class="recording-label">MEREKAM VIDEO... (<span id="recordingTimer">00:00</span>)</span>
            <button id="btnStopRecordingNow" class="btn-stop-record">■ Selesai &amp; Unduh</button>
          </div>
          ` : ''}

          <!-- Floating button to reopen sidebar on mobile when collapsed -->
          <button id="btnMobileOpenSidebar" class="btn-mobile-sidebar-float" style="display:none" title="Buka Leaderboard">
            ${ICONS.leaderboard} Leaderboard
          </button>

          <!-- ── 1-Handed Mobile Rider Detail Sheet ── -->
          <div id="mobileRiderSheet" class="mobile-rider-sheet" role="dialog" aria-label="Detail Rider" aria-hidden="true"></div>

          <!-- ── Active Pocket Mode Keep-Alive Floating Indicator ── -->
          <div id="riderPocketActivePill" class="rider-pocket-floating-pill" style="display:none">
            <div class="pocket-pill-info">
              <span class="pulse-dot-green"></span>
              <span>🎒 <strong>Mode Kantong Aktif</strong></span>
            </div>
            <a href="/rider/cockpit" data-link class="btn-pocket-return-cockpit">
              🚴 Cockpit →
            </a>
          </div>



          <!-- ── Komoot Elevation Profile Drawer ── -->
          <div class="elevation-drawer ${isMobile ? 'collapsed' : ''}" id="elevationDrawer">
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
                <button class="elev-tab-btn" id="btnToggleClimbsDrawer" title="Buka / Tutup Daftar Tanjakan Resmi">
                  ⛰️ Tanjakan (<span id="climbCountBadge">0</span>)
                </button>
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

            <!-- ── Climb List Panel (ClimbPro Drawer) ── -->
            <div class="climb-list-panel collapsed" id="climbListPanel">
              <div class="climb-list-header">
                <span>⛰️ DAFTAR TANJAKAN RESMI (CLIMBPRO)</span>
                <span id="climbListSub" style="font-size:11px;font-weight:600;color:var(--text-secondary)">0 tanjakan terdeteksi</span>
              </div>
              <div class="climb-cards-grid" id="climbCardsContainer"></div>
            </div>
          </div>
        </div>

        <!-- Leaderboard Sidebar -->
        <aside class="map-sidebar" id="mapSidebar">
          <div class="map-sidebar-header">
            <div class="sidebar-title-row">
              <div class="sidebar-title-left" style="display:flex;align-items:center;gap:8px">
                <h2 id="sidebarTitle">Leaderboard</h2>
                <span class="badge badge-yellow" id="sidebarRiderBadge">0 Rider</span>
              </div>
              <button class="btn-mobile-sidebar-close" id="btnMobileCloseSidebar" title="Tutup Leaderboard (Peta Penuh)">✕</button>
            </div>
            <!-- Sort Toggle Button Group -->
            <div class="sidebar-sort-group">
              <button class="sort-tab-btn active" id="btnSortRank" title="Urutkan berdasarkan posisi terdepan lomba">
                🏆 Live Rank
              </button>
              <button class="sort-tab-btn" id="btnSortBib" title="Urutkan tetap berdasarkan nomor BIB">
                🔢 No. BIB
              </button>
            </div>
            <div class="sidebar-search-box">
              <span class="search-icon-placeholder">🔍</span>
              <input type="text" class="sidebar-search-input" id="riderSearchInput" placeholder="Cari nama atau nomor BIB...">
              <button id="btnClearSearch" class="clear-search-btn" style="display:none" title="Hapus pencarian">✕</button>
            </div>
            <!-- Status Filter Pills -->
            <div class="sidebar-filter-pills" id="sidebarFilterPills">
              <button class="status-filter-pill active" data-filter="all">Semua</button>
              <button class="status-filter-pill" data-filter="moving">⚡ Gowes</button>
              <button class="status-filter-pill" data-filter="idle">⏸️ Diam</button>
              <button class="status-filter-pill" data-filter="offroute">⚠️ Nyasar</button>
              <button class="status-filter-pill" data-filter="finished">🏁 Finish</button>
            </div>
          </div>
          <div class="leaderboard" id="leaderboard">
            <div style="padding:28px 16px;text-align:center;color:var(--text-secondary);font-size:13px">
              ⏳ Menunggu sinyal GPS aktif dari rider...
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

  const urlParams = new URLSearchParams(window.location.search);
  const queryPin = urlParams.get('pin') || urlParams.get('event_pin');
  if (queryPin) {
    sessionStorage.setItem('event_pin_' + eventId, queryPin);
  }
  let isLiveMapMounted = true;
  let savedPin = sessionStorage.getItem('event_pin_' + eventId) || '';

  function renderSponsorStrip(sponsors) {
    const strip = document.getElementById('supporterStrip');
    const logos = document.getElementById('supporterStripLogos');
    if (!strip || !logos) return;
    if (!sponsors || !sponsors.length) {
      strip.style.display = 'none';
      return;
    }

    // Adaptive sizing class based on sponsor count
    strip.classList.remove('supporters-1', 'supporters-2', 'supporters-3', 'supporters-many');
    strip.classList.toggle('supporter-strip--plain', event?.sponsor_strip_bg === 'transparent');
    const stripLabel = document.getElementById('supporterStripLabel');
    if (stripLabel) {
      const text = event?.sponsor_strip_label ?? 'Didukung oleh';
      stripLabel.textContent = text;
      stripLabel.style.display = text ? '' : 'none';
      stripLabel.style.color = event?.sponsor_strip_label_color || '#64748B';
    }
    if (sponsors.length === 1) strip.classList.add('supporters-1');
    else if (sponsors.length === 2) strip.classList.add('supporters-2');
    else if (sponsors.length === 3) strip.classList.add('supporters-3');
    else strip.classList.add('supporters-many');

    logos.innerHTML = sponsors.map(s => {
      const name = escapeHtml(s.name || 'Sponsor');
      const logoPath = escapeHtml(s.logo_path || '');
      const rawLink = s.link ? String(s.link).trim() : '';
      const safeLink = rawLink && /^https?:\/\//i.test(rawLink) ? escapeHtml(rawLink) : '';
      const customSize = Number(s.sponsor_logo_size);
      const sizeStyle = Number.isFinite(customSize) && customSize >= 16 && customSize <= 200
        ? ` style="height:${customSize}px;max-width:${customSize * 4}px"`
        : '';
      const logo = `<img class="supporter-logo"${sizeStyle} src="${logoPath}" alt="${name}" title="${name}" loading="eager" decoding="async" onload="if(this.naturalWidth&&this.naturalHeight){this.classList.add(this.naturalWidth/this.naturalHeight>2.2?'logo-wide':'logo-square')}">`;
      return safeLink
        ? `<a class="supporter-link" href="${safeLink}" target="_blank" rel="noopener noreferrer" title="${name} — Klik untuk kunjungi tautan">${logo}</a>`
        : `<span class="supporter-link" title="${name}">${logo}</span>`;
    }).join('');
    strip.style.display = 'flex';
    requestAnimationFrame(updateSponsorPosition);
  }

  function updateSponsorPosition() {
    const strip = document.getElementById('supporterStrip');
    const drawer = document.getElementById('elevationDrawer');
    if (!strip) return;
    if (window.innerWidth <= 768) {
      strip.style.bottom = '';
      if (typeof updateFloatingControlsBottom === 'function') {
        updateFloatingControlsBottom();
      }
      return;
    }

    const isElevOpen = drawer && !drawer.classList.contains('collapsed');
    if (isElevOpen) {
      const drawerHeight = drawer.offsetHeight || 270;
      strip.style.bottom = `${drawerHeight + 22}px`;
    } else {
      strip.style.bottom = '24px';
    }
  }

  function eventFetch(url, options = {}) {
    const pin = savedPin || sessionStorage.getItem('event_pin_' + eventId) || '';
    if (!pin) return fetch(url, options);
    const headers = { ...(options.headers || {}), 'x-event-pin': pin };
    return fetch(url, { ...options, headers });
  }

  // ── Fetch event + riders + checkpoints + splits ──
  let event, riders;
  let checkpoints = [];
  const splitsCache = {};
  try {
    const [evRes, rRes, cpRes, spRes, sponRes] = await Promise.all([
      fetch(`/api/events/${eventId}`),
      eventFetch(`/api/events/${eventId}/riders`),
      eventFetch(`/api/events/${eventId}/checkpoints`),
      eventFetch(`/api/events/${eventId}/splits`),
      fetch(`/api/events/${eventId}/sponsors`)
    ]);
    if (!evRes.ok) {
      if (evRes.status === 404) throw new Error('Event tidak ditemukan.');
      const errData = await evRes.json().catch(() => ({}));
      throw new Error(errData.error || `Tidak dapat terhubung ke server (HTTP ${evRes.status}). Pastikan server backend sedang aktif.`);
    }
    event = await evRes.json();

    if (rRes.status === 403) {
      if (typeof promptEventAccess === 'function') {
        promptEventAccess(event, (pin) => {
          sessionStorage.setItem('event_pin_' + eventId, pin);
          Router.navigate(`/watch/${eventId}`, true);
        }, {
          forcePrompt: true,
          onCancel: () => Router.navigate('/')
        });
        return;
      }
      throw new Error('Event ini dibatasi dengan PIN Akses. Silakan masukkan PIN Akses dari panitia.');
    }

    riders = await rRes.json();
    if (!Array.isArray(riders)) riders = [];
    checkpoints = cpRes.ok ? await cpRes.json() : [];
    const initialSplits = spRes.ok ? await spRes.json() : [];
    initialSplits.forEach(sp => {
      splitsCache[`${sp.rider_id}_${sp.checkpoint_id}`] = sp;
    });

    // Sponsor logo strip — silent, never blocks the live map
    let sponsors = [];
    if (sponRes && sponRes.ok) {
      sponsors = await sponRes.json().catch(() => []);
      if (!Array.isArray(sponsors)) sponsors = [];
    }
    renderSponsorStrip(sponsors);
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
  const headerRiderCountEl = document.getElementById('headerRiderCount');
  if (headerRiderCountEl) headerRiderCountEl.textContent = riders.length;
  document.title = `${event.name} — CycloPon Live`;

  // Replay controls are strictly restricted to admin / panitia
  const btnReplayHeader = document.getElementById('btnToggleReplay');
  if (isAdmin && btnReplayHeader) {
    btnReplayHeader.style.display = 'inline-flex';
  }

  // ── Init Leaflet Map (Touch pinch-to-zoom & mouse scroll zoom enabled) ──
  const map = L.map('leaflet-map', {
    zoomControl: false,
    attributionControl: true
  }).setView([-2.5, 118], 5);

  // ── Tile Layers ──
  const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });

  const cycleLayer = L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap | <a href="https://www.cyclosm.org">CyclOSM</a>'
  });

  const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: '© Esri'
  });

  // Default to OSM layer
  let currentLayer = osmLayer;
  osmLayer.addTo(map);

  // ── Kilometer Milestone Markers Layer Group (Adaptive Zoom & CycloPon Identity) ──
  const kmMarkersLayerGroup = L.layerGroup().addTo(map);
  let kmMilestonesData = [];
  let showKmMilestones = true;

  function updateKmMilestones() {
    if (!kmMarkersLayerGroup) return;
    kmMarkersLayerGroup.clearLayers();
    if (!showKmMilestones || !kmMilestonesData.length || !map) return;

    const zoom = map.getZoom();
    let step = 0;
    if (zoom >= 14) {
      step = 1;
    } else if (zoom >= 12) {
      step = 5;
    } else if (zoom >= 10) {
      step = 10;
    } else if (zoom >= 8) {
      step = 25;
    } else {
      return; // Sembunyikan pada zoom out skala regional/provinsi (< 8)
    }

    const isZoomedOut = step >= 5;
    const badgeSize = isZoomedOut ? 29 : 25;
    const anchor = Math.round(badgeSize / 2);

    const bounds = map.getBounds().pad(0.25);
    for (let i = 0; i < kmMilestonesData.length; i++) {
      const item = kmMilestonesData[i];
      if (item.km % step !== 0) continue;
      if (!bounds.contains([item.lat, item.lng])) continue;

      const isTriple = item.km >= 100;
      const marker = L.marker([item.lat, item.lng], {
        icon: L.divIcon({
          className: 'km-milestone-marker',
          html: `<div class="km-milestone-badge${isZoomedOut ? ' km-major' : ''}${isTriple ? ' km-3digits' : ''}">${item.km}</div>`,
          iconSize: [badgeSize, badgeSize],
          iconAnchor: [anchor, anchor]
        }),
        interactive: true,
        zIndexOffset: 350
      });

      marker.bindTooltip(`Kilometer ${item.km}`, {
        direction: 'top',
        offset: [0, -anchor - 1],
        className: 'km-milestone-tooltip'
      });

      marker.on('click', (e) => {
        if (L.DomEvent) L.DomEvent.stopPropagation(e);
      });

      kmMarkersLayerGroup.addLayer(marker);
    }
  }

  map.on('zoomend moveend', updateKmMilestones);

  function switchTileLayer(layer, activeBtn) {
    if (currentLayer === layer) return;
    map.removeLayer(currentLayer);
    layer.addTo(map);
    currentLayer = layer;

    document.querySelectorAll('.layer-opt-btn, .layer-pill-btn').forEach(b => b.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
  }

  // ── Floating Layer Picker Popover Toggle ──
  const fabLayerToggle = document.getElementById('fabLayerToggle');
  const fabLayerPopover = document.getElementById('fabLayerPopover');

  function closeLayerPopover() {
    if (fabLayerPopover) fabLayerPopover.style.display = 'none';
    if (fabLayerToggle) fabLayerToggle.classList.remove('active');
  }

  if (fabLayerToggle && fabLayerPopover) {
    fabLayerToggle.addEventListener('click', e => {
      e.stopPropagation();
      const isVisible = fabLayerPopover.style.display === 'block';
      fabLayerPopover.style.display = isVisible ? 'none' : 'block';
      fabLayerToggle.classList.toggle('active', !isVisible);
    });

    document.addEventListener('click', e => {
      if (fabLayerPopover && !fabLayerPopover.contains(e.target) && e.target !== fabLayerToggle) {
        closeLayerPopover();
      }
    });
  }

  const btnLayerOsm = document.getElementById('btnLayerOsm') || document.getElementById('btnLayerDark');
  if (btnLayerOsm) {
    btnLayerOsm.addEventListener('click', e => {
      switchTileLayer(osmLayer, e.currentTarget);
      closeLayerPopover();
      showToast('Lapisan peta: OSM (Jalan)', 'info');
    });
  }
  const btnLayerCycle = document.getElementById('btnLayerCycle');
  if (btnLayerCycle) {
    btnLayerCycle.addEventListener('click', e => {
      switchTileLayer(cycleLayer, e.currentTarget);
      closeLayerPopover();
      showToast('Lapisan peta: CyclOSM Sepeda', 'info');
    });
  }
  const btnLayerSat = document.getElementById('btnLayerSat');
  if (btnLayerSat) {
    btnLayerSat.addEventListener('click', e => {
      switchTileLayer(satLayer, e.currentTarget);
      closeLayerPopover();
      showToast('Lapisan peta: Esri Satelit', 'info');
    });
  }

  const btnToggleKm = document.getElementById('btnToggleKmMilestones');
  if (btnToggleKm) {
    btnToggleKm.addEventListener('click', e => {
      e.stopPropagation();
      showKmMilestones = !showKmMilestones;
      btnToggleKm.classList.toggle('active', showKmMilestones);
      updateKmMilestones();
      showToast(showKmMilestones ? 'Penanda KM ditampilkan' : 'Penanda KM disembunyikan', 'info');
    });
  }

  // ── Auto-Mapping Rider & Device State ──
  const riderById = {};  // numeric deviceId → rider
  const bibToRider = {};  // "001" or "BIB-001" → rider
  const markerById = {};  // numeric deviceId → Leaflet marker
  const progressById = {};  // numeric deviceId → { progressPct, distanceKm, speed, lastTime }
  const telemetryById = {}; // numeric deviceId → { history: [], movingAvg, currentSpeed, remainingKm, etaTime, etaDuration, etaBadgeClass, isFinished }
  let searchQuery = '';

  riders.forEach(r => {
    const cleanBib = String(r.bib).trim();
    bibToRider[cleanBib] = r;
    bibToRider[`BIB-${cleanBib}`] = r;
    bibToRider[`BIB${cleanBib}`] = r;
    const numBib = String(parseInt(cleanBib, 10));
    if (numBib && numBib !== 'NaN') {
      bibToRider[numBib] = r;
      bibToRider[`BIB-${numBib}`] = r;
    }
    riderById[r.id] = r;
    riderById[`rider_${r.id}`] = r;
    riderById[`BIB-${cleanBib}`] = r;
    riderById[cleanBib] = r;
    if (r.traccar_device_id) {
      riderById[r.traccar_device_id] = r;
      riderById[String(r.traccar_device_id)] = r;
    }
  });

  // ── Sidebar Toggle & Fit Route Handlers ──
  const mapViewport = document.getElementById('mapViewport');
  const mapContainer = document.getElementById('mapContainer');
  const elevationDrawer = document.getElementById('elevationDrawer');
  const mobileRiderSheet = document.getElementById('mobileRiderSheet');
  const btnToggleSidebar = document.getElementById('btnToggleSidebar');
  const btnMobileCloseSidebar = document.getElementById('btnMobileCloseSidebar');
  const btnMobileOpenSidebar = document.getElementById('btnMobileOpenSidebar');
  let activeMobileSheetRiderId = null;
  let isReplayActive = false;

  function isMobileViewport() {
    return window.innerWidth <= 768;
  }

  function closeMobileRiderSheet() {
    activeMobileSheetRiderId = null;
    if (mobileRiderSheet) {
      mobileRiderSheet.classList.remove('open');
      mobileRiderSheet.setAttribute('aria-hidden', 'true');
    }
    if (mapContainer) {
      mapContainer.classList.remove('rider-sheet-open');
    }
    if (btnMobileOpenSidebar) {
      const isCollapsed = mapViewport.classList.contains('sidebar-collapsed');
      btnMobileOpenSidebar.style.display = (isCollapsed && isMobileViewport() && !isReplayActive) ? 'inline-flex' : 'none';
    }
    updateFloatingControlsBottom();
  }

  function updateFloatingControlsBottom() {
    const stack = document.getElementById('mapFloatingStack');
    if (stack) stack.style.bottom = '';
  }

  function setSidebarCollapsed(collapsed) {
    mapViewport.classList.toggle('sidebar-collapsed', collapsed);
    mapViewport.classList.toggle('sidebar-open', !collapsed);
    if (btnToggleSidebar) btnToggleSidebar.classList.toggle('active', !collapsed);
    const sheetOpen = mapContainer && mapContainer.classList.contains('rider-sheet-open');
    if (btnMobileOpenSidebar) {
      btnMobileOpenSidebar.style.display = (collapsed && isMobileViewport() && !sheetOpen && !isReplayActive) ? 'inline-flex' : 'none';
    }
    updateSponsorPosition();
    updateFloatingControlsBottom();
    setTimeout(() => {
      map.invalidateSize();
      redrawElevationChart();
    }, 310);
  }

  if (btnToggleSidebar) {
    btnToggleSidebar.addEventListener('click', () => {
      const isCollapsed = mapViewport.classList.contains('sidebar-collapsed');
      setSidebarCollapsed(!isCollapsed);
    });
  }

  if (btnMobileCloseSidebar) {
    btnMobileCloseSidebar.addEventListener('click', () => {
      setSidebarCollapsed(true);
    });
  }

  if (btnMobileOpenSidebar) {
    btnMobileOpenSidebar.addEventListener('click', () => {
      closeMobileRiderSheet();
      setSidebarCollapsed(false);
    });
  }

  // ── Auto-collapse Leaderboard on Mobile (Full-Screen Map Priority) ──
  if (isMobileViewport()) {
    setSidebarCollapsed(true);
  }

  window.addEventListener('resize', () => {
    const sheetOpen = mapContainer && mapContainer.classList.contains('rider-sheet-open');
    if (btnMobileOpenSidebar) {
      const isCollapsed = mapViewport.classList.contains('sidebar-collapsed');
      btnMobileOpenSidebar.style.display = (isCollapsed && isMobileViewport() && !sheetOpen && !isReplayActive) ? 'inline-flex' : 'none';
    }
    if (!isMobileViewport() && activeMobileSheetRiderId != null) {
      const riderId = activeMobileSheetRiderId;
      closeMobileRiderSheet();
      const m = markerById[riderId];
      if (m) m.openPopup();
    }
    updateSponsorPosition();
    updateFloatingControlsBottom();
  });

  let polylineBounds = null;

  function getFocusedRiderLatLng() {
    let myRiderId = null;
    let myBib = null;
    try {
      const cfg = JSON.parse(sessionStorage.getItem('riderConfig') || localStorage.getItem('riderConfig') || '{}');
      if (cfg?.rider && Number(cfg.rider.event_id) === Number(eventId)) {
        myRiderId = cfg.rider.id;
        myBib = cfg.rider.bib;
      }
    } catch { }

    if (!myBib && targetBibParam) {
      myBib = targetBibParam;
    }

    if (myRiderId && markerById[myRiderId]?.getLatLng) {
      return markerById[myRiderId].getLatLng();
    }
    if (myBib) {
      const clean = String(myBib).trim();
      const m = markerById[clean] || (bibToRider[clean] && markerById[bibToRider[clean].id]);
      if (m?.getLatLng) return m.getLatLng();
    }
    return null;
  }

  const btnFitRoute = document.getElementById('btnFitRoute');
  if (btnFitRoute) {
    btnFitRoute.addEventListener('click', () => {
      const riderPos = getFocusedRiderLatLng();
      if (riderPos) {
        const center = map.getCenter();
        const distDeg = Math.hypot(center.lat - riderPos.lat, center.lng - riderPos.lng);
        // Jika sudah terpusat di rider dan zoom dekat, klik kedua menampilkan seluruh lintasan GPX
        if (distDeg < 0.002 && map.getZoom() >= 14 && polylineBounds) {
          map.fitBounds(polylineBounds, { padding: [40, 40] });
        } else {
          map.setView(riderPos, Math.max(map.getZoom(), 15), { animate: true });
        }
      } else if (polylineBounds) {
        map.fitBounds(polylineBounds, { padding: [40, 40] });
      } else {
        map.setView([-2.5, 118], 5);
      }
    });
  }

  // ── Dedicated Zoom Controls (Zoom In & Zoom Out) ──
  const btnZoomIn = document.getElementById('btnZoomIn');
  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
      map.zoomIn();
    });
  }

  const btnZoomOut = document.getElementById('btnZoomOut');
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
      map.zoomOut();
    });
  }

  // ── Komoot Elevation Drawer & Chart Engine ──
  const btnToggleElevation = document.getElementById('btnToggleElevation');
  const btnCloseElevation = document.getElementById('btnCloseElevation');
  const canvas = document.getElementById('elevationCanvas');
  const tooltip = document.getElementById('elevTooltip');

  let gpxData = null;
  let activeHoverDist = null;
  let scrubMarker = null;
  let routeCoords = [];
  let routeKm = 0;

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
    if (isVisible && isMobileViewport()) {
      closeMobileRiderSheet();
    }
    elevationDrawer.classList.toggle('collapsed', !isVisible);
    mapContainer.classList.toggle('elev-open', isVisible);
    if (btnToggleElevation) btnToggleElevation.classList.toggle('active', isVisible);
    if (isVisible && gpxData) {
      setTimeout(redrawElevationChart, 50);
    }
    updateSponsorPosition();
    updateFloatingControlsBottom();
  }

  if (btnToggleElevation) btnToggleElevation.addEventListener('click', () => toggleElevation());
  if (btnCloseElevation) btnCloseElevation.addEventListener('click', () => toggleElevation(false));

  if (window.ResizeObserver && elevationDrawer) {
    const drawerObserver = new ResizeObserver(() => updateSponsorPosition());
    drawerObserver.observe(elevationDrawer);
  }

  const btnToggleClimbsDrawer = document.getElementById('btnToggleClimbsDrawer');
  const climbListPanel = document.getElementById('climbListPanel');

  function renderClimbsList() {
    const container = document.getElementById('climbCardsContainer');
    const badge = document.getElementById('climbCountBadge');
    const sub = document.getElementById('climbListSub');
    if (!container || !gpxData || !gpxData.climbs) return;

    const climbs = gpxData.climbs;
    if (badge) badge.textContent = climbs.length;
    if (sub) sub.textContent = `${climbs.length} tanjakan terdeteksi dari rute GPX`;

    if (!climbs.length) {
      container.innerHTML = `<div style="grid-column:1/-1;font-size:12px;color:var(--text-secondary);padding:6px 0">Tidak ada tanjakan signifikan (kategori 4 s.d HC) pada rute ini.</div>`;
      return;
    }

    container.innerHTML = climbs.map(climb => {
      const activeRiders = [];
      Object.entries(progressById).forEach(([devId, prog]) => {
        const r = riderById[devId];
        if (r && prog.distanceKm != null && prog.distanceKm >= climb.startKm && prog.distanceKm <= climb.endKm) {
          activeRiders.push(r.bib ? `#${r.bib}` : r.name);
        }
      });

      const ridersText = activeRiders.length
        ? `<div class="climb-card-riders">🚴 ${activeRiders.join(', ')} sedang menanjak</div>`
        : `<div class="climb-card-riders empty">Belum ada rider di tanjakan ini</div>`;

      return `
        <div class="climb-summary-card" data-climb-id="${climb.id}" title="Klik untuk fokus ke awal tanjakan">
          <div class="climb-card-top">
            <span class="climb-card-title">${climb.name} (KM ${climb.startKm} - ${climb.endKm})</span>
            <span class="climb-cat-pill" style="background:${climb.color}">${climb.category}</span>
          </div>
          <div class="climb-card-metrics">
            <span>📏 ${climb.lengthKm} km · ↗ +${climb.elevGain}m</span>
            <span>Avg: ${climb.avgGrade}% · Max: ${climb.maxGrade}%</span>
          </div>
          ${ridersText}
        </div>
      `;
    }).join('');

    container.querySelectorAll('.climb-summary-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = parseInt(card.getAttribute('data-climb-id'), 10);
        const climb = climbs.find(c => c.id === id);
        if (climb && map && gpxData.points) {
          const pt = gpxData.points[climb.startIndex];
          if (pt) {
            map.flyTo([pt.lat, pt.lng], 14, { duration: 1 });
            showToast(`Fokus ke ${climb.name} (KM ${climb.startKm})`, 'info');
          }
        }
      });
    });
  }

  if (btnToggleClimbsDrawer && climbListPanel) {
    btnToggleClimbsDrawer.addEventListener('click', () => {
      const isCollapsed = climbListPanel.classList.contains('collapsed');
      climbListPanel.classList.toggle('collapsed', !isCollapsed);
      btnToggleClimbsDrawer.classList.toggle('active', isCollapsed);
      if (isCollapsed) renderClimbsList();
    });
  }

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

    canvas.width = Math.round(rect.width * dpr);
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
    ctx.font = '500 10px "Plus Jakarta Sans", system-ui, sans-serif';
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

      ctx.font = 'bold 9px "Barlow", "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y);
    };

    drawBadge('A', '#2B4E30', padL + 10, padT + 12);
    drawBadge('B', '#966025', padL + plotW - 10, padT + 12);

    // ── Climb Segments & Summit Badges (ClimbPro) ──
    const climbs = gpxData.climbs || [];
    if (climbs && climbs.length) {
      climbs.forEach(climb => {
        const xStart = getX(climb.startKm);
        const xEnd = getX(climb.endKm);
        const topPt = findNearestPointByDist(pts, climb.endKm);
        const yTop = topPt ? getY(topPt.ele) : padT + 20;

        // Draw tinted band behind curve for climb span
        ctx.fillStyle = `${climb.color}1E`;
        ctx.fillRect(xStart, padT, Math.max(2, xEnd - xStart), plotH);

        // Highlight top ridge of climb
        const startIdx = Math.max(0, climb.startIndex);
        const endIdx = Math.min(pts.length - 1, climb.endIndex);
        if (endIdx > startIdx) {
          ctx.beginPath();
          ctx.moveTo(getX(pts[startIdx].distKm), getY(pts[startIdx].ele));
          for (let k = startIdx + 1; k <= endIdx; k++) {
            ctx.lineTo(getX(pts[k].distKm), getY(pts[k].ele));
          }
          ctx.strokeStyle = climb.color;
          ctx.lineWidth = 3.6;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // Summit circular marker
        ctx.beginPath();
        ctx.arc(xEnd, yTop, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = climb.color;
        ctx.shadowColor = climb.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Summit label tag
        ctx.font = '900 8.5px "Barlow", "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillStyle = climb.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`⛰️ C${climb.id}`, xEnd, yTop - 4);
      });
    }

    // ── Live Riders on Elevation Curve ──
    Object.entries(progressById).forEach(([devId, prog]) => {
      const rider = riderById[devId];
      if (!rider || prog.distanceKm == null) return;
      const rDist = Math.max(0, Math.min(totalDist, prog.routeDistanceKm != null ? prog.routeDistanceKm : prog.distanceKm));
      const rPt = findNearestPointByDist(pts, rDist);
      if (!rPt) return;

      const rx = getX(rDist);
      const ry = getY(rPt.ele);
      const rColor = prog.isOffRoute ? '#EF4444' : (rider.color || '#FFE600');

      // Outer glow (enhanced red pulsing glow when off-route)
      ctx.beginPath();
      ctx.arc(rx, ry, prog.isOffRoute ? 8 : 6.5, 0, Math.PI * 2);
      ctx.fillStyle = rColor;
      ctx.shadowColor = rColor;
      ctx.shadowBlur = prog.isOffRoute ? 14 : 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner white dot
      ctx.beginPath();
      ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      // BIB tag above dot
      ctx.font = '800 9px "Barlow", "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = prog.isOffRoute ? '#EF4444' : '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(prog.isOffRoute ? `⚠️ #${rider.bib}` : `#${rider.bib}`, rx, ry - 6);
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
        ctx.font = '800 9px "Barlow", "Plus Jakarta Sans", system-ui, sans-serif';
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

  // ── Marker cluster group (Lower threshold so riders stay visible on active zoom) ──
  const clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 25,
    disableClusteringAtZoom: 13,
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

  // ── Virtual COT: moving cut-off marker ─────────────────────────
  let cotMarker = null;
  let cotTimer = null;
  let cotConfig = null;
  function stopCotTimer() {
    if (cotTimer) {
      clearInterval(cotTimer);
      cotTimer = null;
    }
    if (cotMarker && map) {
      try { map.removeLayer(cotMarker); } catch (e) { }
      cotMarker = null;
    }
    window.removeEventListener('beforeunload', stopCotTimer);
  }
  let cotDnfRiderIds = new Set();
  const cotBannerEl = document.getElementById('cotBanner');
  const cotBannerTextEl = document.getElementById('cotBannerText');

  function cotDivIcon() {
    return L.divIcon({
      className: '',
      html: `<div style="width:34px;height:34px;border-radius:50%;background:#DC2626;border:2.5px solid #FFF;box-shadow:0 3px 12px rgba(220,38,38,0.5);display:flex;align-items:center;justify-content:center;font-size:16px">⏱️</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
  }

  function cotStatusLabel(status) {
    return { MOVING: 'BERGERAK', NOT_STARTED: 'BELUM MULAI', FINISHED: 'SELESAI', DISABLED: 'NONAKTIF' }[status] || status || '—';
  }

  function applyCotDnfVisuals(ids) {
    const next = new Set(ids || []);

    function refreshMarkerIcon(id) {
      const m = markerById[id];
      const rider = riderById[id];
      if (!m || !rider) return;

      // progressById (keyed by rider.id) is where the last fix time lives.
      // telemetryById has no lastTime, so reading it here made every rider
      // look Offline right after the DNF flag was cleared.
      const prog = progressById[rider.id] || {};
      const telem = telemetryById[rider.id] || {};
      const st = getRiderStatus(prog.lastTime || null);

      m._iconKey = null;
      m.setIcon(createRiderIcon(rider, !!telem.isOffRoute, st, next.has(id)));
    }

    // 1. Restore riders that are NO LONGER DNF
    cotDnfRiderIds.forEach(id => {
      if (!next.has(id)) refreshMarkerIcon(id);
    });

    // 2. Apply visuals only to riders that are NEWLY DNF
    next.forEach(id => {
      if (!cotDnfRiderIds.has(id)) refreshMarkerIcon(id);
    });

    const hasChanged = cotDnfRiderIds.size !== next.size || ![...cotDnfRiderIds].every(id => next.has(id));
    cotDnfRiderIds = next;
    if (hasChanged) {
      updateLeaderboard();
    }
  }

  async function refreshVirtualCot() {
    if (!isLiveMapMounted) return;
    try {
      const res = await eventFetch(`/api/events/${eventId}/virtual-cot`);
      if (!isLiveMapMounted || !res.ok) return;
      const data = await res.json();
      if (!isLiveMapMounted) return;

      cotConfig = data;

      // mode === 'off' means the admin disabled the session: the marker must
      // disappear even though the start time/pace are still stored.
      if (!data.enabled || data.mode === 'off' || data.latitude == null) {
        if (cotMarker) { map.removeLayer(cotMarker); cotMarker = null; }
        if (cotBannerEl) cotBannerEl.style.display = 'none';
        applyCotDnfVisuals((data.dnf_riders || []).map(r => r.rider_id));
        return;
      }

      const latlng = [data.latitude, data.longitude];

      if (!cotMarker) {
        cotMarker = L.marker(latlng, { icon: cotDivIcon(), zIndexOffset: 1600 }).addTo(map);
      } else {
        cotMarker.setLatLng(latlng);
      }

      const popup = `
        <div style="font-family:ui-monospace,monospace;font-size:10.5px;font-weight:800;color:#991B1B;letter-spacing:0.06em">⏱️ COT VIRTUAL</div>
        <div style="font-weight:900;font-size:15px;color:#0D1117;margin-top:2px">km ${Number(data.distance_km || 0).toFixed(1)}</div>
        <div style="font-size:12px;color:#4B5563;margin-top:2px">${data.pace ? `${data.pace} km/jam` : '—'} · ${cotStatusLabel(data.status)}</div>
        <div style="font-size:12px;color:#4B5563;margin-top:2px">Mulai ${data.start_time || '—'} WIB · Selesai ±${data.end_time || '—'} WIB</div>
        <div style="font-size:11px;color:#6B7280;margin-top:4px">Rute ${Number(data.route_length_km || 0).toFixed(1)} km · ${data.dnf_count || 0} rider DNF</div>
      `;
      cotMarker.bindPopup(popup, { autoPan: false, closeButton: true, offset: [0, -12], maxWidth: 260 });

      let bannerMsg = null;
      if (data.evaluation && data.evaluation.state === 'deferred') {
        bannerMsg = '⚠️ Penilaian DNF ditunda — telemetri rider belum segar';
      } else if (data.status === 'NOT_STARTED') {
        bannerMsg = `⏱️ COT Virtual mulai ${data.start_time || '—'} WIB · selesai ±${data.end_time || '—'} WIB · ${data.pace} km/jam`;
      } else if (data.status === 'FINISHED') {
        bannerMsg = `⏱️ COT Virtual selesai ±${data.end_time || '—'} WIB — sudah mencapai garis finish`;
      }

      if (cotBannerEl && cotBannerTextEl) {
        if (bannerMsg) {
          cotBannerTextEl.textContent = bannerMsg;
          cotBannerEl.style.display = 'block';
        } else {
          cotBannerEl.style.display = 'none';
        }
      }

      applyCotDnfVisuals((data.dnf_riders || []).map(r => r.rider_id));
    } catch (err) {
      // Silent: COT is an enhancement, never block the live map
    }
  }

  refreshVirtualCot();
  cotTimer = setInterval(refreshVirtualCot, 20000);
  window.addEventListener('beforeunload', stopCotTimer);

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
            <div style="transform: translate(-50%, -50%); width: max-content;">
              <div class="cp-map-marker" style="
                background: #FFFFFF;
                border: 2px solid #2B4E30;
                color: #111815;
                padding: 3px 8px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 800;
                white-space: nowrap;
                width: max-content;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
                display: inline-flex;
                align-items: center;
                gap: 4px;
                cursor: pointer;
              ">
                <span>🚩</span>
                <span>${escapeHtml(cp.name)}</span>
                <span style="color:#FFFFFF;background:#2B4E30;padding:1px 5px;border-radius:4px;font-size:10px">${cp.km_distance}K</span>
              </div>
            </div>
          `,
          className: '',
          iconSize: null,
          iconAnchor: [0, 0]
        });

        const popupHtml = `
          <div style="font-family:'Plus Jakarta Sans',system-ui,sans-serif;min-width:180px">
            <div style="font-size:11px;font-weight:800;color:var(--color-sage);text-transform:uppercase;letter-spacing:0.5px">CHECKPOINT ${idx + 1}</div>
            <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin:4px 0">${escapeHtml(cp.name)}</div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);border-top:1px solid var(--border);padding-top:6px;margin-top:6px">
              <span>Jarak: <strong style="color:var(--color-sage)">${cp.km_distance} km</strong></span>
              <span>COT: <strong style="color:var(--color-red)">${escapeHtml(cp.close_time || '—')}</strong></span>
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

  function getRiderShortName(name) {
    if (!name) return '';
    const clean = String(name).trim();
    const parts = clean.split(/[\s-]+/);
    let chosen = parts[0] || clean;
    chosen = chosen.replace(/[^a-zA-Z0-9\.]/g, '');
    if (!chosen) chosen = clean.substring(0, 8);
    if (chosen.length > 9) {
      return chosen.substring(0, 9) + '…';
    }
    return chosen;
  }

  function getRiderMarkerMeta(rider) {
    const role = (rider.role || 'rider').toLowerCase();
    const shortName = getRiderShortName(rider.name);

    if (role === 'sweeper') {
      const hasWord = shortName.toLowerCase().includes('sweep');
      const label = hasWord ? `🧹 ${shortName}` : (shortName ? `🧹 Sweeper ${shortName}` : '🧹 Sweeper');
      const color = rider.color || '#F97316';
      return { label, color, isRole: true };
    }
    if (role === 'marshall') {
      const hasWord = shortName.toLowerCase().includes('marshal');
      const label = hasWord ? `🏍️ ${shortName}` : (shortName ? `🏍️ Marshall ${shortName}` : '🏍️ Marshall');
      const color = rider.color || '#3B82F6';
      return { label, color, isRole: true };
    }
    if (role === 'medic') {
      const hasWord = shortName.toLowerCase().includes('med');
      const label = hasWord ? `🚑 ${shortName}` : (shortName ? `🚑 Medis ${shortName}` : '🚑 Medis');
      const color = rider.color || '#EF4444';
      return { label, color, isRole: true };
    }

    // Default: Participant / Rider
    const bibStr = rider.bib ? `#${rider.bib}` : '';
    let label = bibStr;
    if (shortName) {
      label = bibStr ? `${bibStr} ${shortName}` : shortName;
    } else if (!label) {
      label = 'Rider';
    }
    const color = rider.color || '#FFE600';
    return { label, color, isRole: false };
  }

  function createRiderIcon(rider, isOffRoute, status = null, isCotDnf = false) {
    const meta = getRiderMarkerMeta(rider || {});
    const isOffline = status && (status.text === 'Offline' || status.text === 'Blank Spot');
    const isIdle = status && status.text === 'Idle';

    // Rider hit by COT stays lit up with original vivid colors (not dimmed or grayed out)
    const baseColor = isOffRoute ? '#EF4444' : (isOffline ? '#94A3B8' : meta.color);
    const markerOpacity = isOffline ? '0.50' : (isIdle ? '0.80' : '1.0');
    const markerFilter = isOffline ? 'grayscale(40%)' : 'none';

    let statusTag = '';
    if (isCotDnf) {
      statusTag = `<div style="
          position:absolute;top:-36px;left:50%;transform:translateX(-50%);
          background:#EA580C;color:#FFFFFF;font-size:8.5px;font-weight:900;
          padding:2px 7px;border-radius:100px;white-space:nowrap;
          border:1.5px solid #FFFFFF;
          box-shadow:0 2px 8px rgba(234,88,12,0.6);
          pointer-events:none;z-index:15;
        ">⏱️ OVER COT</div>`;
    } else if (isOffRoute) {
      statusTag = `<div style="
          position:absolute;top:-36px;left:50%;transform:translateX(-50%);
          background:#EF4444;color:#FFFFFF;font-size:9px;font-weight:900;
          padding:1px 6px;border-radius:100px;white-space:nowrap;
          box-shadow:0 2px 6px rgba(239,68,68,0.5);
          pointer-events:none;z-index:10;
        ">⚠️ NYASAR</div>`;
    } else if (isOffline) {
      statusTag = `<div style="
          position:absolute;top:-36px;left:50%;transform:translateX(-50%);
          background:rgba(71,85,105,0.92);color:#F1F5F9;font-size:8px;font-weight:800;
          padding:1px 6px;border-radius:100px;white-space:nowrap;
          border:1px solid rgba(255,255,255,0.25);
          box-shadow:0 2px 6px rgba(0,0,0,0.3);
          pointer-events:none;z-index:10;
        ">⚪ NONAKTIF</div>`;
    } else if (isIdle) {
      statusTag = `<div style="
          position:absolute;top:-36px;left:50%;transform:translateX(-50%);
          background:rgba(217,119,6,0.92);color:#FFFFFF;font-size:8px;font-weight:800;
          padding:1px 6px;border-radius:100px;white-space:nowrap;
          box-shadow:0 2px 6px rgba(217,119,6,0.4);
          pointer-events:none;z-index:10;
        ">⏸️ DIAM</div>`;
    }

    return L.divIcon({
      html: `
        <div style="position:relative;width:20px;height:20px"${isCotDnf ? ' title="DNF · Tertinggal COT Virtual"' : ''}>
          <div style="width:20px;height:20px;opacity:${markerOpacity};filter:${markerFilter}">
            <div style="
              width:14px;height:14px;border-radius:50%;
              background:${baseColor};
              border:2.5px solid rgba(255,255,255,0.95);
              box-shadow:0 0 10px ${baseColor}80,0 2px 5px rgba(0,0,0,0.6);
              position:absolute;top:3px;left:3px;
            "></div>
            <div style="
              position:absolute;top:-20px;left:50%;transform:translateX(-50%);
              background:rgba(8,10,15,0.92);
              color:${baseColor};font-size:10px;font-weight:800;
              padding:1px 7px;border-radius:100px;white-space:nowrap;
              border:1px solid ${baseColor}70;
              box-shadow:0 2px 8px rgba(0,0,0,0.4);
              letter-spacing:0.02em;
              pointer-events:none;
            ">${meta.label}</div>
          </div>
          ${statusTag}
        </div>
      `,
      className: 'rider-marker-pin', iconSize: [20, 20], iconAnchor: [10, 10]
    });
  }

  // ── Helper: Format Time Ago & Status ──
  function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Belum ada data';
    const elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
    if (elapsedSec < 15) return 'Baru saja';
    if (elapsedSec < 60) return `${elapsedSec} dtk lalu`;
    const min = Math.floor(elapsedSec / 60);
    if (min < 60) return `${min} mnt lalu`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} jam lalu`;
    const days = Math.floor(hr / 24);
    return `${days} hari lalu`;
  }

  function getRiderStatus(timestamp) {
    if (!timestamp) return { text: 'Offline', color: '#94A3B8', dot: '⚪' };
    const elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
    if (elapsedSec <= 90) return { text: 'Online', color: '#10B981', dot: '🟢' };
    if (elapsedSec <= 300) return { text: 'Idle', color: '#D1A980', dot: '🟠' };
    return { text: 'Blank Spot', color: '#94A3B8', dot: '⚪' };
  }

  // ── Load GPX route & Komoot Stats ──
  if (event.gpx_path) {
    try {
      const gpxText = await eventFetch(event.gpx_path).then(r => r.text());
      gpxData = parseGpxData(gpxText);
      routeCoords = gpxData.coords;
      routeKm = gpxData.stats.totalKm;

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
        const endPt = routeCoords[routeCoords.length - 1];
        const isLoop = Math.abs(startPt[0] - endPt[0]) < 0.0005 && Math.abs(startPt[1] - endPt[1]) < 0.0005;

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
        if (typeof extractKilometerMilestones === 'function' && gpxData.points) {
          kmMilestonesData = extractKilometerMilestones(gpxData.points, routeKm);
          updateKmMilestones();
        }

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

        if (!isMobile) {
          setTimeout(redrawElevationChart, 60);
        }
        renderClimbsList();
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

  // ── Core Function: Update Single Rider Position ──
  function updateRiderPosition(deviceId, pos) {
    let rider = riderById[deviceId];
    if (!rider && pos.rider_id) rider = riderById[pos.rider_id];
    if (!rider && bibToRider[String(deviceId)]) rider = bibToRider[String(deviceId)];
    if (!rider) return;

    const latlng = [pos.latitude, pos.longitude];
    const fixTime = pos.fixTime || pos.deviceTime || new Date().toISOString();

    // 1. Determine base speed in km/h with deadband & sanity limits
    let speedKmh = null;
    if (pos.speed != null) {
      if (typeof normalizeSpeedKmh === 'function') {
        speedKmh = normalizeSpeedKmh(pos.speed, !!pos.isKmh);
      } else {
        const raw = Number(pos.speed);
        if (!isNaN(raw)) {
          const converted = pos.isKmh ? raw : (raw > 70 ? raw : raw * 1.852);
          speedKmh = converted < 1.8 ? 0 : Math.max(0, Math.min(90, Math.round(converted)));
        }
      }
    }

    // 2. Initialize or retrieve rider telemetry state (canonicalized by rider.id)
    const telemKey = rider.id || deviceId;
    if (!telemetryById[telemKey]) {
      telemetryById[telemKey] = {
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
        isFinished: false,
        lastRouteIndex: null,
        totalTraveledKm: (pos.distance_km != null && !isNaN(Number(pos.distance_km))) ? Number(pos.distance_km) : 0
      };
    }
    const telem = telemetryById[telemKey];
    if (deviceId !== telemKey) {
      telemetryById[deviceId] = telem;
    }

    // Update battery if available
    let batteryLevel = null;
    const rawBatt = (pos.attributes && pos.attributes.batteryLevel != null)
      ? pos.attributes.batteryLevel
      : (pos.battery != null ? pos.battery : null);

    if (rawBatt != null) {
      batteryLevel = typeof normalizeBattery === 'function'
        ? normalizeBattery(rawBatt)
        : Math.round(Number(rawBatt));
    }
    if (batteryLevel != null) telem.batteryLevel = batteryLevel;

    // Ground odometer: accumulate real GPS displacement or use reported distance_km
    const curLat = Number(pos.latitude);
    const curLng = Number(pos.longitude);
    if (pos.distance_km != null && !isNaN(Number(pos.distance_km))) {
      telem.totalTraveledKm = Number(pos.distance_km);
    } else if (telem.lastLat != null && telem.lastLng != null) {
      const stepKm = typeof haversineKm === 'function' ? haversineKm(telem.lastLat, telem.lastLng, curLat, curLng) : 0;
      if (stepKm >= 0.003 && stepKm < 3.0) {
        telem.totalTraveledKm = Math.round(((telem.totalTraveledKm || 0) + stepKm) * 100) / 100;
      }
    }
    telem.lastLat = curLat;
    telem.lastLng = curLng;

    // 3. Nearest-point route calculation & Off-Route detection
    let calc = { index: 0, progressPct: 0, distanceKm: 0 };
    if (routeCoords.length) {
      calc = findNearestRoutePoint(
        pos.latitude,
        pos.longitude,
        routeCoords,
        routeKm,
        telem.lastRouteIndex,
        telem.totalTraveledKm
      );
      telem.lastRouteIndex = calc.index;
    }

    // Auto-detect Checkpoint crossing for live UI display (Spectator read-only mode)
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

          const clockStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const cotMsg = cotStatus === 'IN_TIME' ? '✅ Lolos COT' : '⏱️ Melebihi COT';
          if (!isReplayActive) {
            showToast(`🚩 #${rider.bib} ${rider.name} tiba di ${cp.name} (${clockStr}) — ${cotMsg}!`, cotStatus === 'IN_TIME' ? 'success' : 'warning');
          }
        }
      });
    }

    let offRoute = { isOffRoute: false, deviationMeters: 0 };
    if (routeCoords.length && typeof checkOffRoute === 'function') {
      offRoute = checkOffRoute(pos.latitude, pos.longitude, routeCoords, 100);
    }
    telem.isOffRoute = offRoute.isOffRoute;
    telem.deviationMeters = offRoute.deviationMeters;

    // When off-route, display real pedaled ground distance so rider's distance doesn't freeze
    const displayKm = telem.isOffRoute
      ? Math.max(calc.distanceKm, Math.round((telem.totalTraveledKm || 0) * 10) / 10)
      : calc.distanceKm;

    // 4. Compute ground speed from distance delta if speed is missing or 0 while advancing
    const nowMs = new Date(fixTime).getTime() || Date.now();
    const prevPt = telem.history[telem.history.length - 1];
    if (prevPt) {
      const dtHr = (nowMs - prevPt.timeMs) / 3600000;
      const dDistKm = displayKm - prevPt.distanceKm;
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
      distanceKm: displayKm,
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

    // Checkpoint completion requirement
    const hasCps = Array.isArray(checkpoints) && checkpoints.length > 0;
    const allCpsCleared = !hasCps || checkpoints.every(cp => !!splitsCache[`${rider.id}_${cp.id}`]);

    // Minimum distance traveled requirement (prevent false finish before ride / at start line on ANY route)
    const minTraveledRequired = totalDist > 1.0 ? (totalDist * 0.75) : (totalDist * 0.5);
    const hasTraveledEnough = totalDist > 0
      ? ((telem.totalTraveledKm || 0) >= minTraveledRequired)
      : ((telem.totalTraveledKm || 0) >= 1.0);

    // A rider can ONLY finish if:
    // 1. Not currently far off-route (within 100m)
    // 2. Traveled sufficient cumulative distance (>= 75% of route)
    // 3. Cleared all checkpoints (if any)
    // 4. Progressed to the finish point (progress >= 98% or remainingKm <= 0.15)
    // OR pos.is_finished was already confirmed from server / previous finish!
    const meetsFinishCriteria = !!pos.is_finished || (!telem.isOffRoute &&
      hasTraveledEnough &&
      allCpsCleared &&
      (calc.progressPct >= 98 || (totalDist > 0 && remainingKm <= 0.15)));

    // STICKY FINISH LATCH: Once finished, ALWAYS stay finished!
    // Never reset to false even if rider turns around and rides back home along the course!
    if (meetsFinishCriteria || telem.isFinished) {
      if (!telem.isFinished) {
        telem.finishTime = fixTime || new Date().toISOString();
        telem.finishDist = totalDist > 0 ? totalDist : (calc.distanceKm || totalDist);
      }
      telem.isFinished = true;
    }

    const isFinished = !!telem.isFinished;

    if (isFinished) {
      telem.etaTime = 'FINISH';
      telem.etaDuration = 'Tiba di Finish';
      telem.etaBadgeClass = 'eta-finished';
      telem.remainingKm = 0;
      calc.progressPct = 100;
      if (totalDist > 0) {
        calc.distanceKm = totalDist;
      }
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

    const canonicalId = rider.id;
    const status = getRiderStatus(fixTime);
    const batBadge = telem.batteryLevel != null
      ? `<span class="battery-pill ${telem.batteryLevel < 20 ? 'battery-low' : 'battery-good'}">
           ${telem.batteryLevel < 20 ? '🪫' : '🔋'} ${telem.batteryLevel}%
         </span>`
      : '';

    const popupHtml = `
      <div class="rider-map-popup">
        <div class="popup-header">
          <div class="popup-title-group">
            <div class="popup-rider-name">${escapeHtml(rider.name)}</div>
            <div class="popup-rider-bib" style="color:${rider.color || 'var(--color-yellow)'}">
              BIB #${escapeHtml(rider.bib)}
              ${rider.role === 'sweeper' ? '<span style="background:#F97316;color:#FFF;font-size:10px;padding:1px 5px;border-radius:3px;font-weight:700;margin-left:4px">🧹 SWEEPER</span>' : (rider.role === 'marshall' ? '<span style="background:#3B82F6;color:#FFF;font-size:10px;padding:1px 5px;border-radius:3px;font-weight:700;margin-left:4px">🏍️ MARSHALL</span>' : (rider.role === 'medic' ? '<span style="background:#EF4444;color:#FFF;font-size:10px;padding:1px 5px;border-radius:3px;font-weight:700;margin-left:4px">🚑 MEDIS</span>' : ''))}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            ${batBadge}
            <span class="popup-status-badge" style="background:${status.color}22;color:${status.color};border:1px solid ${status.color}55">
              ${status.dot} ${status.text}
            </span>
          </div>
        </div>

        ${telem.isOffRoute ? `
          <div class="popup-offroute-warning" style="background:rgba(239,68,68,0.2);color:#B91C1C;border:1px solid #EF4444;border-radius:6px;padding:6px 10px;font-size:11px;font-weight:800;margin-bottom:10px;text-align:center">
            ⚠️ PERINGATAN: KELUAR DARI RUTE RESMI (+${telem.deviationMeters} meter)
          </div>
        ` : ''}

        <div class="popup-metrics-grid">
          <div class="popup-metric-box">
            <div class="popup-metric-label">📏 Jarak Ditempuh</div>
            <div class="popup-metric-value">${displayKm} <span class="popup-metric-unit">km</span></div>
            <div class="popup-metric-sub">${calc.progressPct}% dari total rute</div>
          </div>

          <div class="popup-metric-box">
            <div class="popup-metric-label">🎯 Sisa Jarak</div>
            <div class="popup-metric-value">${telem.remainingKm} <span class="popup-metric-unit">km</span></div>
            <div class="popup-metric-sub">${telem.isOffRoute ? `⚠️ Deviasi +${telem.deviationMeters}m` : 'Sesuai rute resmi'}</div>
          </div>


        </div>

        ${checkpoints && checkpoints.length ? `
          <div class="popup-cp-splits">
            <div class="popup-cp-title">🚩 CHECKPOINTS & CUT-OFF TIME</div>
            <div class="popup-cp-grid">
              ${checkpoints.map((cp, idx) => {
      const rawCpName = String(cp.name || '').trim();
      const cpNumMatch = rawCpName.match(/^cp\s*[-_#:]?\s*(\d+)/i);
      const cpChipLabel = cpNumMatch
        ? `CP ${cpNumMatch[1]}`
        : (rawCpName ? `CP ${idx + 1} · ${rawCpName.slice(0, 10)}` : `CP ${idx + 1}`);
      const sp = splitsCache[`${rider.id}_${cp.id}`];
      if (sp) {
        const d = new Date(sp.arrival_time);
        const tStr = !isNaN(d.getTime())
          ? d.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false })
          : sp.arrival_time;
        const isPendingVerify = sp.verification_status === 'PENDING_VERIFY';
        const isPass = !isPendingVerify && sp.status === 'IN_TIME';
        const qrMark = sp.source === 'qr_scan' ? ' · QR' : '';
        return `<div class="cp-split-chip ${isPass ? 'split-pass' : 'split-fail'}" title="${escapeHtml(cp.name)}">
                    <span>${escapeHtml(cpChipLabel)}: <strong>${escapeHtml(tStr)}</strong>${qrMark}</span>
                    <span>${isPendingVerify ? '⏳' : (isPass ? '✓' : '⚠️ COT')}</span>
                  </div>`;
      } else {
        return `<div class="cp-split-chip split-pending" title="${escapeHtml(cp.name)}">
                    <span>${escapeHtml(cpChipLabel)}: ${cp.km_distance}km</span>
                  </div>`;
      }
    }).join('')}
            </div>
          </div>
        ` : ''}

        <div class="popup-footer" style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <span>Update: <strong>${formatTimeAgo(fixTime)}</strong></span>
          <div style="display:flex;align-items:center;gap:6px">
            <a href="/api/og/preview/${eventId}?bib=${encodeURIComponent(rider.bib)}" target="_blank" class="popup-og-btn" style="color:var(--text-secondary);text-decoration:none;font-size:11px;font-weight:700;padding:5px 8px;border-radius:6px;border:1px solid var(--border);background:rgba(255,255,255,0.05);display:inline-flex;align-items:center;gap:3px" title="Lihat kartu infografis medsos">
              🖼️ Info Graph
            </a>
            <button class="popup-share-link-btn" data-bib="${escapeHtml(rider.bib)}" data-name="${escapeHtml(rider.name)}" onclick="window.shareRiderLink(this.dataset.bib, this.dataset.name)" title="Salin / Bagikan Link Tracking Rider Ini">
              🔗 Bagikan
            </button>
          </div>
        </div>
      </div>
    `;

    // Smoothly update existing marker or create once
    let marker = markerById[canonicalId] || (rider.traccar_device_id && markerById[rider.traccar_device_id]);
    const isCotDnf = cotDnfRiderIds.has(canonicalId) || (rider.traccar_device_id && cotDnfRiderIds.has(rider.traccar_device_id));
    const updatedIcon = createRiderIcon(rider, telem.isOffRoute, status, isCotDnf);
    const meta = getRiderMarkerMeta(rider || {});
    const iconKey = `${meta.label}_${meta.color}_${telem.isOffRoute ? 1 : 0}_${status ? status.text : ''}_${isCotDnf ? 1 : 0}`;

    if (marker && (clusterGroup.hasLayer(marker) || map.hasLayer(marker))) {
      marker.setLatLng(latlng);

      // Only update icon if status/appearance actually changed to prevent DOM thrashing & popup blinking
      if (marker._iconKey !== iconKey) {
        marker.setIcon(updatedIcon);
        marker._iconKey = iconKey;
        if (!marker.isPopupOpen() && clusterGroup && typeof clusterGroup.refreshClusters === 'function' && clusterGroup.hasLayer(marker)) {
          clusterGroup.refreshClusters(marker);
        }
      }

      if (marker.getPopup()) {
        if (marker.isPopupOpen()) {
          const popupEl = marker.getPopup().getElement();
          if (popupEl) {
            const distVal = popupEl.querySelector('.popup-metric-box:nth-child(1) .popup-metric-value');
            if (distVal) distVal.innerHTML = `${displayKm} <span class="popup-metric-unit">km</span>`;
            const distSub = popupEl.querySelector('.popup-metric-box:nth-child(1) .popup-metric-sub');
            if (distSub) distSub.textContent = `${calc.progressPct}% dari total rute`;

            const remVal = popupEl.querySelector('.popup-metric-box:nth-child(2) .popup-metric-value');
            if (remVal) remVal.innerHTML = `${telem.remainingKm} <span class="popup-metric-unit">km</span>`;
            const remSub = popupEl.querySelector('.popup-metric-box:nth-child(2) .popup-metric-sub');
            if (remSub) remSub.textContent = telem.isOffRoute ? `⚠️ Deviasi +${telem.deviationMeters}m` : 'Sesuai rute resmi';

            const etaBox = popupEl.querySelector('.popup-metric-box.full-width');
            if (etaBox) etaBox.remove();

            const timeAgoVal = popupEl.querySelector('.popup-footer span strong');
            if (timeAgoVal) timeAgoVal.textContent = formatTimeAgo(fixTime);

            const statusBadge = popupEl.querySelector('.popup-status-badge');
            if (statusBadge) {
              statusBadge.style.background = `${status.color}22`;
              statusBadge.style.color = status.color;
              statusBadge.style.border = `1px solid ${status.color}55`;
              statusBadge.textContent = `${status.dot} ${status.text}`;
            }

            const existingWarn = popupEl.querySelector('.popup-offroute-warning');
            if (telem.isOffRoute) {
              if (existingWarn) {
                existingWarn.textContent = `⚠️ PERINGATAN: KELUAR DARI RUTE RESMI (+${telem.deviationMeters} meter)`;
              } else {
                marker.setPopupContent(popupHtml);
              }
            } else if (existingWarn) {
              marker.setPopupContent(popupHtml);
            }
          } else {
            marker.setPopupContent(popupHtml);
          }
        } else {
          marker.setPopupContent(popupHtml);
        }
      }
    } else {
      if (marker) {
        clusterGroup.removeLayer(marker);
      }
      marker = L.marker(latlng, { icon: updatedIcon });
      marker._iconKey = iconKey;
      marker._riderId = canonicalId;
      marker.bindPopup(popupHtml, {
        autoPan: false,
        closeButton: true,
        autoClose: false,
        offset: [0, -10]
      });
      clusterGroup.addLayer(marker);
    }
    marker._riderId = canonicalId;

    markerById[canonicalId] = marker;
    if (rider.traccar_device_id) {
      markerById[rider.traccar_device_id] = marker;
    }
    markerById[deviceId] = marker;
    markerById[rider.bib] = marker;

    // Save state for leaderboard uniquely by canonical rider.id
    const finalLeaderboardDist = isFinished
      ? (totalDist > 0 ? totalDist : (telem.finishDist || displayKm))
      : displayKm;

    progressById[canonicalId] = {
      ...calc,
      distanceKm: finalLeaderboardDist,
      routeDistanceKm: isFinished ? (totalDist > 0 ? totalDist : calc.distanceKm) : calc.distanceKm,
      progressPct: isFinished ? 100 : calc.progressPct,
      remainingKm: isFinished ? 0 : telem.remainingKm,
      speed: telem.currentSpeed,
      movingAvg: telem.movingAvg,
      etaTime: telem.etaTime,
      etaDuration: telem.etaDuration,
      etaBadgeClass: telem.etaBadgeClass,
      batteryLevel: telem.batteryLevel,
      isOffRoute: isFinished ? false : telem.isOffRoute,
      deviationMeters: isFinished ? 0 : telem.deviationMeters,
      isFinished: isFinished,
      finishTime: telem.finishTime || null,
      lastTime: fixTime
    };

    handleTargetRiderFocus(rider, latlng, telem, calc);
    if (activeMobileSheetRiderId === canonicalId && isMobileViewport()) {
      renderMobileRiderSheet(canonicalId);
    }
    updateLeaderboard();
  }

  function panMarkerToVisibleCenter(m, options = {}) {
    if (!m || !map) return;
    const latlng = m.getLatLng();
    if (!latlng) return;

    const targetZoom = options.zoom != null ? options.zoom : map.getZoom();
    const mapSize = map.getSize();
    const markerPt = map.project(latlng, targetZoom);
    let offsetY = 0;

    if (isMobileViewport() && mapContainer && mapContainer.classList.contains('rider-sheet-open')) {
      const sheetH = (mobileRiderSheet && mobileRiderSheet.offsetHeight) ? mobileRiderSheet.offsetHeight : 250;
      offsetY = Math.round(sheetH / 2);
    } else if (!isMobileViewport() && options.isDesktopPopup !== false) {
      const elevH = (elevationDrawer && !elevationDrawer.classList.contains('collapsed'))
        ? (elevationDrawer.offsetHeight || 200)
        : 0;
      const availH = Math.max(240, mapSize.y - elevH);
      offsetY = -Math.min(135, Math.max(64, Math.round(availH * 0.22)));
    }

    const centerPt = L.point(markerPt.x, markerPt.y + offsetY);
    const centerLatLng = map.unproject(centerPt, targetZoom);
    map.setView(centerLatLng, targetZoom, { animate: options.animate !== false });
  }

  function renderMobileRiderSheet(riderId) {
    if (!mobileRiderSheet) return;
    const rider = riderById[riderId];
    if (!rider) return;

    const telem = telemetryById[rider.id] || {};
    const prog = progressById[rider.id] || {};
    const status = getRiderStatus(prog.lastTime || null);
    const displayKm = prog.distanceKm != null ? prog.distanceKm : (telem.totalTraveledKm || 0);
    const progressPct = prog.progressPct != null ? prog.progressPct : 0;
    const remainingKm = prog.remainingKm != null ? prog.remainingKm : (telem.remainingKm || 0);
    const isFinished = !!(prog.isFinished || telem.isFinished);
    const isOffRoute = !isFinished && !!(prog.isOffRoute || telem.isOffRoute);
    const deviationMeters = prog.deviationMeters || telem.deviationMeters || 0;
    const batteryLevel = prog.batteryLevel != null ? prog.batteryLevel : telem.batteryLevel;

    const prevCpEl = mobileRiderSheet.querySelector('.sheet-cp-grid');
    const prevCpScroll = prevCpEl ? prevCpEl.scrollLeft : 0;

    const roleChip = rider.role === 'sweeper'
      ? '<span class="sheet-role-badge role-sweeper">SWEEPER</span>'
      : (rider.role === 'marshall'
        ? '<span class="sheet-role-badge role-marshall">MARSHALL</span>'
        : (rider.role === 'medic'
          ? '<span class="sheet-role-badge role-medic">MEDIS</span>'
          : ''));

    const batChip = batteryLevel != null
      ? `<span class="battery-pill ${batteryLevel < 20 ? 'battery-low' : 'battery-good'}">${batteryLevel < 20 ? '🪫' : '🔋'} ${batteryLevel}%</span>`
      : '';

    const cpHtml = (checkpoints && checkpoints.length) ? `
      <div class="sheet-cp-section">
        <div class="sheet-cp-title">🚩 CHECKPOINTS &amp; CUT-OFF TIME</div>
        <div class="sheet-cp-grid">
          ${checkpoints.map((cp, idx) => {
      const rawCpName = String(cp.name || '').trim();
      const cpNumMatch = rawCpName.match(/^cp\s*[-_#:]?\s*(\d+)/i);
      const cpChipLabel = cpNumMatch
        ? `CP ${cpNumMatch[1]}`
        : (rawCpName ? `CP ${idx + 1} · ${rawCpName.slice(0, 10)}` : `CP ${idx + 1}`);
      const sp = splitsCache[`${rider.id}_${cp.id}`];
      if (sp) {
        const d = new Date(sp.arrival_time);
        const tStr = !isNaN(d.getTime())
          ? d.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false })
          : sp.arrival_time;
        const isPendingVerify = sp.verification_status === 'PENDING_VERIFY';
        const isPass = !isPendingVerify && sp.status === 'IN_TIME';
        const qrMark = sp.source === 'qr_scan' ? ' · QR' : '';
        return `<div class="cp-split-chip ${isPass ? 'split-pass' : 'split-fail'}" title="${escapeHtml(cp.name)}">
                  <span>${escapeHtml(cpChipLabel)}: <strong>${escapeHtml(tStr)}</strong>${qrMark}</span>
                  <span>${isPendingVerify ? '⏳' : (isPass ? '✓' : '⚠️ COT')}</span>
                </div>`;
      }
      return `<div class="cp-split-chip split-pending" title="${escapeHtml(cp.name)}">
                <span>${escapeHtml(cpChipLabel)}: ${cp.km_distance}km</span>
              </div>`;
    }).join('')}
        </div>
      </div>
    ` : '';

    const bibBg = rider.color || '#FFE600';
    let bibFg = '#0D1117';
    if (bibBg.startsWith('#') && bibBg.length === 7) {
      const r = parseInt(bibBg.slice(1, 3), 16) || 0;
      const g = parseInt(bibBg.slice(3, 5), 16) || 0;
      const b = parseInt(bibBg.slice(5, 7), 16) || 0;
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      bibFg = yiq >= 150 ? '#0D1117' : '#FFFFFF';
    }

    mobileRiderSheet.innerHTML = `
      <div class="sheet-grab-bar" aria-hidden="true"></div>
      <div class="sheet-header">
        <div class="sheet-rider-identity">
          <div class="sheet-bib-badge" style="background:${bibBg};color:${bibFg}">${escapeHtml(rider.bib)}</div>
          <div class="sheet-name-col">
            <div class="sheet-rider-name">${escapeHtml(rider.name)} ${roleChip}</div>
            <div class="sheet-meta-row">
              <span class="popup-status-badge" style="background:${status.color}22;color:${status.color};border:1px solid ${status.color}55">
                ${status.dot} ${status.text}
              </span>
              ${batChip}
              <span class="sheet-update-age">Update: <strong>${formatTimeAgo(prog.lastTime || null)}</strong></span>
            </div>
          </div>
        </div>
        <button type="button" class="sheet-close-btn" id="btnCloseRiderSheet" title="Tutup detail rider" aria-label="Tutup detail rider">✕</button>
      </div>

      ${isOffRoute ? `
        <div class="sheet-offroute-banner">
          ⚠️ Keluar dari rute resmi (+${deviationMeters} m)
        </div>
      ` : ''}

      <div class="sheet-metrics-grid">
        <div class="sheet-metric-box">
          <div class="popup-metric-label">📏 Jarak Ditempuh</div>
          <div class="popup-metric-value">${displayKm} <span class="popup-metric-unit">km</span></div>
          <div class="popup-metric-sub">${progressPct}% dari total rute</div>
        </div>
        <div class="sheet-metric-box">
          <div class="popup-metric-label">🎯 ${isFinished ? 'Status Rute' : 'Sisa Jarak'}</div>
          <div class="popup-metric-value">${isFinished ? 'FINISH' : `${remainingKm} <span class="popup-metric-unit">km</span>`}</div>
          <div class="popup-metric-sub">${isFinished ? 'Tiba di garis finish' : (isOffRoute ? `⚠️ Deviasi +${deviationMeters}m` : 'Sesuai rute resmi')}</div>
        </div>
      </div>

      ${cpHtml}

      <div class="sheet-actions-bar">
        <button type="button" class="sheet-action-btn sheet-btn-list" id="btnSheetOpenList">
          ${ICONS.leaderboard} Daftar
        </button>
        <a href="/api/og/preview/${eventId}?bib=${encodeURIComponent(rider.bib)}" target="_blank" class="sheet-action-btn sheet-btn-og">
          🖼️ Info Graph
        </a>
        <button type="button" class="sheet-action-btn sheet-btn-share" id="btnSheetShareRider">
          🔗 Bagikan
        </button>
      </div>
    `;

    const nextCpEl = mobileRiderSheet.querySelector('.sheet-cp-grid');
    if (nextCpEl && prevCpScroll > 0) {
      nextCpEl.scrollLeft = prevCpScroll;
    }

    mobileRiderSheet.querySelector('#btnCloseRiderSheet')?.addEventListener('click', () => {
      closeMobileRiderSheet();
    });
    mobileRiderSheet.querySelector('#btnSheetOpenList')?.addEventListener('click', () => {
      closeMobileRiderSheet();
      setSidebarCollapsed(false);
    });
    mobileRiderSheet.querySelector('#btnSheetShareRider')?.addEventListener('click', () => {
      window.shareRiderLink(rider.bib, rider.name);
    });
  }

  function openMobileRiderSheet(riderId) {
    if (!mobileRiderSheet || !riderById[riderId]) return;
    activeMobileSheetRiderId = riderId;
    if (elevationDrawer && !elevationDrawer.classList.contains('collapsed')) {
      toggleElevation(false);
    }
    if (mapViewport && !mapViewport.classList.contains('sidebar-collapsed')) {
      setSidebarCollapsed(true);
    }
    renderMobileRiderSheet(riderId);
    if (mapContainer) {
      mapContainer.classList.add('rider-sheet-open');
    }
    mobileRiderSheet.classList.add('open');
    mobileRiderSheet.setAttribute('aria-hidden', 'false');
    if (btnMobileOpenSidebar) {
      btnMobileOpenSidebar.style.display = 'none';
    }
    updateFloatingControlsBottom();
  }

  // ── Target Rider Focus & Tracking State ──
  const targetBibParam = (params.query?.bib || new URLSearchParams(window.location.search).get('bib') || '').trim();
  let targetRider = null;
  let isAutoFollowing = false;
  let targetTrailPolyline = null;
  let suppressNextMapClick = false;
  const targetTrailCoords = [];

  function clearTargetTrail() {
    if (targetTrailPolyline && map && map.hasLayer(targetTrailPolyline)) {
      map.removeLayer(targetTrailPolyline);
    }
    targetTrailPolyline = null;
    targetTrailCoords.length = 0;
  }

  function activateTargetRider(r) {
    if (!r) return;
    clearTargetTrail();
    targetRider = r;
    isAutoFollowing = true;
    const focusZoom = Math.max(map.getZoom(), 17);
    const wasSidebarOpen = mapViewport && !mapViewport.classList.contains('sidebar-collapsed');
    const m = markerById[r.id] || (r.traccar_device_id && markerById[r.traccar_device_id]);
    if (m) {
      if (isMobileViewport()) {
        suppressNextMapClick = true;
        setTimeout(() => { suppressNextMapClick = false; }, 100);
        openMobileRiderSheet(r.id);
        panMarkerToVisibleCenter(m, { zoom: focusZoom, isMobileSheet: true });
        if (wasSidebarOpen) {
          setTimeout(() => {
            if (isLiveMapMounted && activeMobileSheetRiderId === r.id) {
              map.invalidateSize({ animate: false });
              panMarkerToVisibleCenter(m, { zoom: focusZoom, isMobileSheet: true });
            }
          }, 330);
        }
      } else {
        m._skipNextPopupPan = true;
        panMarkerToVisibleCenter(m, { zoom: focusZoom, isDesktopPopup: true });
        m.openPopup();
      }
      if (m.getLatLng()) {
        targetTrailCoords.push(m.getLatLng());
      }
    } else if (isMobileViewport()) {
      openMobileRiderSheet(r.id);
    }
    updateLeaderboard();
  }

  function handleTargetRiderFocus(rider, latlng, telem, calc) {
    if (!targetRider || String(targetRider.bib).toLowerCase() !== String(rider.bib).toLowerCase()) return;

    // Dynamic Live Breadcrumb Trail for focused rider
    if (latlng) {
      targetTrailCoords.push(latlng);
      if (targetTrailCoords.length > 30) targetTrailCoords.shift();

      if (!targetTrailPolyline) {
        targetTrailPolyline = L.polyline(targetTrailCoords, {
          color: rider.color || '#00E5FF',
          weight: 4,
          opacity: 0.75,
          dashArray: '5, 8',
          lineCap: 'round',
          zIndexOffset: 1200
        }).addTo(map);
      } else {
        targetTrailPolyline.setLatLngs(targetTrailCoords);
        targetTrailPolyline.setStyle({ color: rider.color || '#00E5FF' });
        if (!map.hasLayer(targetTrailPolyline)) targetTrailPolyline.addTo(map);
      }
    }

    if (isAutoFollowing && latlng) {
      const m = markerById[rider.id];
      if (m && ((isMobileViewport() && activeMobileSheetRiderId === rider.id) || (!isMobileViewport() && m.isPopupOpen()))) {
        panMarkerToVisibleCenter(m, { zoom: map.getZoom(), animate: true });
      } else {
        map.panTo(latlng, { animate: true, duration: 0.5 });
      }
    }
  }

  // ── Leaderboard Sort Mode & Status Filter State ──
  let leaderboardSortMode = 'rank';
  let currentStatusFilter = 'all';

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
    // Helper: non-competitive staff role (sweeper, marshall, medic)
    const isSupportRole = r => r && (r.role === 'sweeper' || r.role === 'marshall' || r.role === 'medic');

    // Helper: check if rider has DNF (via Virtual COT or explicit status)
    const isRiderDnf = rId => cotDnfRiderIds.has(rId) || (riderById[rId]?.traccar_device_id && cotDnfRiderIds.has(riderById[rId].traccar_device_id));

    // 1. Calculate live race ranks exclusively for competitive, active racers
    const rankByRiderId = {};
    const competitiveEntries = Object.entries(progressById)
      .map(([riderId, prog]) => ({ riderId: Number(riderId), rider: riderById[riderId], ...prog }))
      .filter(e => e.rider && !isSupportRole(e.rider) && !isRiderDnf(e.riderId));

    competitiveEntries.sort((a, b) => {
      if (a.isFinished && b.isFinished) {
        if (a.finishTime && b.finishTime) {
          return new Date(a.finishTime).getTime() - new Date(b.finishTime).getTime();
        }
        return b.distanceKm - a.distanceKm;
      }
      if (a.isFinished) return -1;
      if (b.isFinished) return 1;
      return (b.distanceKm - a.distanceKm) || (b.progressPct - a.progressPct);
    });

    competitiveEntries.forEach((item, idx) => {
      rankByRiderId[item.riderId] = idx + 1;
    });

    // Top leader reference for Gap calculation (P1)
    const leaderEntry = competitiveEntries.length ? competitiveEntries[0] : null;
    const leaderKm = leaderEntry ? (Number(leaderEntry.distanceKm) || 0) : 0;

    let entries = Object.entries(progressById)
      .map(([riderId, prog]) => ({ rider: riderById[riderId], ...prog }))
      .filter(e => e.rider);

    // 2. Sort according to user preference
    if (leaderboardSortMode === 'bib') {
      entries.sort((a, b) => {
        const numA = parseInt(String(a.rider.bib).replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(String(b.rider.bib).replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });
    } else {
      // 🏆 Live Rank Mode:
      // Group 1: Competitive active racers (Finished first, then active by distance)
      // Group 2: DNF racers (sorted by last distance reached)
      // Group 3: Support staff (Sweeper, Marshall, Medic at the bottom)
      entries.sort((a, b) => {
        const aSupport = isSupportRole(a.rider);
        const bSupport = isSupportRole(b.rider);
        if (aSupport !== bSupport) return aSupport ? 1 : -1;

        const aDnf = isRiderDnf(a.rider.id);
        const bDnf = isRiderDnf(b.rider.id);
        if (aDnf !== bDnf) return aDnf ? 1 : -1;

        if (a.isFinished && b.isFinished) {
          if (a.finishTime && b.finishTime) {
            return new Date(a.finishTime).getTime() - new Date(b.finishTime).getTime();
          }
          return b.distanceKm - a.distanceKm;
        }
        if (a.isFinished) return -1;
        if (b.isFinished) return 1;

        return (b.distanceKm - a.distanceKm) || (b.progressPct - a.progressPct);
      });
    }

    // 3. Status filter
    if (currentStatusFilter !== 'all') {
      if (currentStatusFilter === 'moving') {
        entries = entries.filter(e => {
          const st = getRiderStatus(e.lastTime);
          return st.text === 'Online' && e.speed > 2 && !e.isFinished;
        });
      } else if (currentStatusFilter === 'idle') {
        entries = entries.filter(e => {
          const st = getRiderStatus(e.lastTime);
          return (st.text !== 'Online' || e.speed <= 2) && !e.isFinished;
        });
      } else if (currentStatusFilter === 'offroute') {
        entries = entries.filter(e => e.isOffRoute);
      } else if (currentStatusFilter === 'finished') {
        entries = entries.filter(e => e.isFinished);
      }
    }

    // 4. Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      entries = entries.filter(e =>
        e.rider.name.toLowerCase().includes(q) ||
        String(e.rider.bib).toLowerCase().includes(q)
      );
    }

    const leaderboardEl = document.getElementById('leaderboard');
    const badgeEl = document.getElementById('sidebarRiderBadge');
    if (badgeEl && riders) {
      badgeEl.textContent = `${entries.length} / ${riders.length} Rider`;
    }

    // Synchronize card visibility: hide cards not in current filter
    const activeRiderIds = new Set(entries.map(e => e.rider.id));
    leaderboardEl.querySelectorAll('.leaderboard-item').forEach(card => {
      const cardRiderId = Number(card.id.replace('rider-card-', ''));
      if (!activeRiderIds.has(cardRiderId)) {
        card.style.display = 'none';
      } else {
        card.style.display = 'flex';
      }
    });

    if (!entries.length) {
      let emptyNotice = document.getElementById('leaderboardEmptyNotice');
      if (!emptyNotice) {
        emptyNotice = document.createElement('div');
        emptyNotice.id = 'leaderboardEmptyNotice';
        emptyNotice.style.cssText = 'padding:28px 16px;text-align:center;color:var(--text-secondary);font-size:13px';
        leaderboardEl.appendChild(emptyNotice);
      }
      emptyNotice.innerHTML = searchQuery || currentStatusFilter !== 'all'
        ? '🔍 Tidak ada rider yang cocok dengan filter atau pencarian.'
        : '⏳ Menunggu sinyal GPS aktif dari rider...';
      emptyNotice.style.display = 'block';
      return;
    } else {
      const emptyNotice = document.getElementById('leaderboardEmptyNotice');
      if (emptyNotice) emptyNotice.style.display = 'none';
    }

    // Clear initial static placeholder if present
    const initPlaceholder = leaderboardEl.querySelector(':scope > div:not(.leaderboard-item):not(#leaderboardEmptyNotice)');
    if (initPlaceholder) initPlaceholder.remove();

    entries.forEach((e, i) => {
      const riderId = e.rider.id;
      const isDnf = isRiderDnf(riderId);
      const isSupport = isSupportRole(e.rider);
      const raceRank = !isSupport && !isDnf ? rankByRiderId[riderId] : null;

      let rankDisplay = '';
      let rankClass = 'leaderboard-rank';
      if (isSupport) {
        rankDisplay = e.rider.role === 'sweeper' ? '🧹' : (e.rider.role === 'medic' ? '🚑' : '🛡️');
        rankClass += ' rank-support';
      } else if (isDnf) {
        rankDisplay = 'COT';
        rankClass += ' rank-dnf';
      } else if (raceRank) {
        rankDisplay = raceRank <= 3 ? ['🥇', '🥈', '🥉'][raceRank - 1] : `#${raceRank}`;
        if (raceRank <= 3) rankClass += ' top';
      } else {
        rankDisplay = `#${i + 1}`;
      }

      // Gap calculation relative to P1 (Leader)
      let gapText = '';
      let isLeader = false;
      if (!isSupport && !isDnf && leaderEntry) {
        if (riderId === leaderEntry.riderId) {
          gapText = 'LEADER';
          isLeader = true;
        } else {
          const gapKm = Math.max(0, Math.round((leaderKm - (Number(e.distanceKm) || 0)) * 10) / 10);
          gapText = `-${gapKm.toFixed(1)} km`;
        }
      } else if (isDnf) {
        gapText = 'OVER COT';
      }

      const status = getRiderStatus(e.lastTime);
      const isOnline = status && status.text === 'Online';
      const isMoving = isOnline && (e.speed > 2);
      const displaySpeed = isOnline ? e.speed : 0;
      const displayEta = e.isFinished ? 'Finish' : (isOnline && e.etaTime && e.etaTime !== '-' ? e.etaTime : '-');
      const etaBadgeClass = e.isFinished ? 'eta-finished' : (isOnline && e.etaTime && e.etaTime !== '-' ? (e.etaBadgeClass || 'eta-active') : 'eta-idle');
      const isTarget = targetRider && String(targetRider.bib).toLowerCase() === String(e.rider.bib).toLowerCase();

      let card = document.getElementById(`rider-card-${riderId}`);
      if (!card) {
        card = document.createElement('div');
        card.id = `rider-card-${riderId}`;
        card.className = `leaderboard-item ${isTarget ? 'focused-rider' : ''}`;
        card.onclick = () => {
          activateTargetRider(e.rider);
        };
        const rSplits = checkpoints ? checkpoints.map(cp => splitsCache[`${e.rider.id}_${cp.id}`]).filter(Boolean) : [];
        const latSp = rSplits.length ? rSplits[rSplits.length - 1] : null;
        let cpDisplayHtml = '';
        if (latSp) {
          const arrD = new Date(latSp.arrival_time);
          const tStr = !isNaN(arrD.getTime()) ? arrD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : latSp.arrival_time;
          const isPass = latSp.status === 'IN_TIME';
          let cleanCpName = (latSp.cp_name || 'CP').replace(/\s*\([^)]*\)/g, '').trim();
          cpDisplayHtml = `
            <div class="leaderboard-cp-row">
              <span class="cp-pill ${isPass ? 'cp-in-time' : 'cp-over-cot'}" title="${escapeHtml(latSp.cp_name || 'CP')}">
                🚩 <span class="val-cp-text">${escapeHtml(cleanCpName)} · ${tStr} ${isPass ? '✓ In Time' : '⚠️ COT'}</span>
              </span>
            </div>
          `;
        } else {
          cpDisplayHtml = `
            <div class="leaderboard-cp-row" style="display:none">
              <span class="cp-pill"></span>
            </div>
          `;
        }

        card.innerHTML = `
          <div class="${rankClass}">${rankDisplay}</div>
          <div class="rider-avatar" style="background:${e.rider.color || '#FFE600'}">${escapeHtml(e.rider.bib)}</div>
          <div class="leaderboard-info">
            <div class="leaderboard-name-row">
              <span class="leaderboard-name" title="${escapeHtml(e.rider.name)}">${escapeHtml(e.rider.name)}</span>
              ${e.rider.role === 'sweeper' ? '<span class="badge" style="background:#F97316;color:#FFF;font-size:9px;padding:1px 5px;border-radius:3px;font-weight:700">SWEEPER</span>' : (e.rider.role === 'marshall' ? '<span class="badge" style="background:#3B82F6;color:#FFF;font-size:9px;padding:1px 5px;border-radius:3px;font-weight:700">MARSHALL</span>' : (e.rider.role === 'medic' ? '<span class="badge" style="background:#EF4444;color:#FFF;font-size:9px;padding:1px 5px;border-radius:3px;font-weight:700">MEDIS</span>' : ''))}
              <button class="btn-compare-rider ${comparingRiderId === e.rider.id ? 'active' : ''}" onclick="event.stopPropagation(); triggerCompareRider(${e.rider.id})" title="Bandingkan rider">
                ⚔️ ${comparingRiderId === e.rider.id ? 'Batal' : 'VS'}
              </button>
            </div>
            <div class="leaderboard-telemetry-row">
              <span class="telemetry-status-tag">
                <span class="val-status-dot" style="color:${status.color}">${status.dot}</span>
                <span class="val-timeago">${formatTimeAgo(e.lastTime)}</span>
              </span>
              ${e.isFinished ? '<span class="telemetry-pill eta-pill eta-finished">🏁 FINISH</span>' : ''}
              <span class="offroute-pill" style="display:${e.isOffRoute ? 'inline-flex' : 'none'}">
                ⚠️ NYASAR (+<span class="val-deviation">${e.deviationMeters}</span>m)
              </span>
              <span class="battery-pill ${e.batteryLevel != null && e.batteryLevel < 20 ? 'battery-low' : 'battery-good'}" style="display:${e.batteryLevel != null ? 'inline-flex' : 'none'}">
                <span class="val-bat-icon">${e.batteryLevel != null && e.batteryLevel < 20 ? '🪫' : '🔋'}</span><span class="val-bat">${e.batteryLevel != null ? e.batteryLevel : ''}</span>%
              </span>
            </div>
            ${cpDisplayHtml}
          </div>
          <div class="leaderboard-stat">
            <div class="leaderboard-km"><span class="val-km">${e.distanceKm}</span> <span class="km-unit">km</span></div>
            <div class="leaderboard-progress-bar-wrap">
              <div class="leaderboard-progress-bar-fill" style="width:${e.progressPct}%;background:${e.rider.color || 'var(--color-yellow)'}"></div>
            </div>
            <div class="leaderboard-pct"><span class="val-pct">${e.progressPct}</span>%</div>
            ${gapText ? `<div class="leaderboard-gap ${isLeader ? 'is-leader' : ''}">${gapText}</div>` : ''}
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
          rankEl.className = rankClass;
        }

        const nameEl = card.querySelector('.leaderboard-name');
        if (nameEl && nameEl.textContent !== e.rider.name) {
          nameEl.textContent = e.rider.name;
          nameEl.title = e.rider.name;
        }

        const speedPill = card.querySelector('.speed-pill');
        if (speedPill) speedPill.remove();

        const etaPill = card.querySelector('.eta-pill');
        if (e.isFinished) {
          if (!etaPill) {
            const telemRow = card.querySelector('.leaderboard-telemetry-row');
            if (telemRow) {
              const span = document.createElement('span');
              span.className = 'telemetry-pill eta-pill eta-finished';
              span.innerHTML = '🏁 FINISH';
              telemRow.prepend(span);
            }
          }
        } else if (etaPill) {
          etaPill.remove();
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
        let cpRow = card.querySelector('.leaderboard-cp-row');
        if (!cpRow) {
          const infoCol = card.querySelector('.leaderboard-info');
          if (infoCol) {
            cpRow = document.createElement('div');
            cpRow.className = 'leaderboard-cp-row';
            infoCol.appendChild(cpRow);
          }
        }
        if (cpRow) {
          if (latSp) {
            const arrD = new Date(latSp.arrival_time);
            const tStr = !isNaN(arrD.getTime()) ? arrD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : latSp.arrival_time;
            const isPass = latSp.status === 'IN_TIME';
            let cleanCpName = (latSp.cp_name || 'CP').replace(/\s*\([^)]*\)/g, '').trim();
            cpRow.style.display = 'flex';
            cpRow.innerHTML = `
              <span class="cp-pill ${isPass ? 'cp-in-time' : 'cp-over-cot'}" title="${escapeHtml(latSp.cp_name || 'CP')}">
                🚩 <span class="val-cp-text">${escapeHtml(cleanCpName)} · ${tStr} ${isPass ? '✓ In Time' : '⚠️ COT'}</span>
              </span>
            `;
          } else {
            cpRow.style.display = 'none';
          }
        }

        const oldStatusSub = card.querySelector('.leaderboard-status-sub');
        if (oldStatusSub) oldStatusSub.remove();

        const statusDot = card.querySelector('.val-status-dot');
        if (statusDot) {
          statusDot.textContent = status.dot;
          statusDot.style.color = status.color;
        }

        const timeAgoEl = card.querySelector('.val-timeago');
        if (timeAgoEl) timeAgoEl.textContent = formatTimeAgo(e.lastTime);

        const kmEl = card.querySelector('.val-km');
        if (kmEl) kmEl.textContent = e.distanceKm;

        const pctEl = card.querySelector('.val-pct');
        if (pctEl) pctEl.textContent = e.progressPct;

        const barFill = card.querySelector('.leaderboard-progress-bar-fill');
        if (barFill) barFill.style.width = `${e.progressPct}%`;

        let gapEl = card.querySelector('.leaderboard-gap');
        if (gapText) {
          if (!gapEl) {
            const statCol = card.querySelector('.leaderboard-stat');
            if (statCol) {
              gapEl = document.createElement('div');
              statCol.appendChild(gapEl);
            }
          }
          if (gapEl) {
            gapEl.className = `leaderboard-gap ${isLeader ? 'is-leader' : ''}`;
            gapEl.textContent = gapText;
            gapEl.style.display = '';
          }
        } else if (gapEl) {
          gapEl.style.display = 'none';
        }

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

  // ── Filter Pills & Search Input Listeners ──
  const searchInputEl = document.getElementById('riderSearchInput');
  const clearSearchBtn = document.getElementById('btnClearSearch');

  if (searchInputEl) {
    searchInputEl.addEventListener('input', e => {
      searchQuery = e.target.value.trim();
      if (clearSearchBtn) {
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
      }
      updateLeaderboard();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInputEl) {
        searchInputEl.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        updateLeaderboard();
        searchInputEl.focus();
      }
    });
  }

  document.querySelectorAll('#sidebarFilterPills .status-filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#sidebarFilterPills .status-filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentStatusFilter = btn.dataset.filter;
      updateLeaderboard();
    });
  });

  // ── Filter Pills Horizontal Scroll Affordance (Visual Fade Indicator) ──
  const filterPillsRow = document.getElementById('sidebarFilterPills');
  if (filterPillsRow) {
    const updatePillsScrollState = () => {
      const hasOverflow = filterPillsRow.scrollWidth > filterPillsRow.clientWidth + 2;
      const atStart = filterPillsRow.scrollLeft <= 4;
      const atEnd = filterPillsRow.scrollLeft + filterPillsRow.clientWidth >= filterPillsRow.scrollWidth - 4;

      filterPillsRow.classList.toggle('has-overflow', hasOverflow);
      filterPillsRow.classList.toggle('is-scrolled', !atStart);
      filterPillsRow.classList.toggle('is-at-end', atEnd);
    };

    filterPillsRow.addEventListener('scroll', updatePillsScrollState, { passive: true });
    window.addEventListener('resize', updatePillsScrollState, { passive: true });
    setTimeout(updatePillsScrollState, 150);
  }



  // Disengage auto-following when user manually drags the map
  map.on('dragstart', () => {
    if (isAutoFollowing) {
      isAutoFollowing = false;
    }
  });

  // Intercept rider marker popup openings:
  // - On mobile, show 1-handed bottom Rider Detail Sheet instead of floating popup
  // - On desktop, auto-zoom and pan marker slightly down so the full popup fits cleanly inside viewport
  map.on('popupopen', e => {
    const src = e.popup && e.popup._source;
    if (!src || !src._riderId) return;
    if (isMobileViewport()) {
      map.closePopup(e.popup);
      const rider = riderById[src._riderId];
      if (rider) activateTargetRider(rider);
      return;
    }
    if (src._skipNextPopupPan) {
      src._skipNextPopupPan = false;
      return;
    }
    const focusZoom = Math.max(map.getZoom(), 17);
    panMarkerToVisibleCenter(src, { zoom: focusZoom, isDesktopPopup: true });
  });

  map.on('click', () => {
    if (suppressNextMapClick) return;
    if (isMobileViewport() && activeMobileSheetRiderId != null) {
      closeMobileRiderSheet();
    }
  });

  window.panToRider = deviceId => {
    const m = markerById[deviceId];
    if (m) {
      if (isMobileViewport()) {
        const rider = riderById[m._riderId || deviceId];
        if (rider) activateTargetRider(rider);
      } else {
        const focusZoom = Math.max(map.getZoom(), 17);
        m._skipNextPopupPan = true;
        panMarkerToVisibleCenter(m, { zoom: focusZoom, isDesktopPopup: true });
        m.openPopup();
      }
    }
  };

  // Global helper to share a rider tracking link
  window.shareRiderLink = async (bib, name) => {
    const shareUrl = `${window.location.origin}/watch/${eventId}?bib=${encodeURIComponent(bib)}`;
    const shareText = `🚴 Pantau posisi gowes ${name} (BIB #${bib}) secara real-time di CycloPon Live Map:\n${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Live Tracking ${name} - CycloPon`,
          text: shareText,
          url: shareUrl
        });
        showToast('✓ Tautan & infografis live berhasil dibagikan!', 'success');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast(`✓ Tautan & infografis BIB #${bib} disalin ke clipboard!`, 'success');
      } catch {
        prompt('Salin link tracking ini (preview infografis aktif saat dipaste di medsos):', shareUrl);
      }
    } else {
      prompt('Salin link tracking ini (preview infografis aktif saat dipaste di medsos):', shareUrl);
    }
  };

  // Auto-activate target rider from URL if param exists
  if (targetBibParam && riders && riders.length) {
    const matched = riders.find(r => String(r.bib).trim().toLowerCase() === targetBibParam.toLowerCase());
    if (matched) {
      setTimeout(() => activateTargetRider(matched), 500);
    }
  }

  // ── Active SOS Alerts System ──
  const emergencyBar = document.getElementById('liveEmergencyBar');
  const emergencyText = document.getElementById('emergencyText');
  const btnFocusEmergency = document.getElementById('btnFocusEmergency');
  const btnResolveEmergency = document.getElementById('btnResolveEmergency');
  let currentAlerts = [];
  let alertMarkers = {};
  let notifiedAlertIds = new Set();

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
    } catch (err) { }
  }

  async function checkActiveAlerts() {
    if (isReplayActive) return;
    try {
      const res = await eventFetch(`/api/events/${eventId}/alerts?active=1`);
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
            <strong>#${escapeHtml(topAlert.rider_bib || '?')} ${escapeHtml(topAlert.rider_name || 'Rider')}</strong>
            — ${escapeHtml(sosTypeLabel(topAlert.type))}: ${escapeHtml(sosDisplayMessage(topAlert))}
            <span style="opacity:0.75;margin-left:4px">(${formatTimeAgo(topAlert.created_at)})</span>
          `;
        }

        if (!notifiedAlertIds.has(topAlert.id)) {
          notifiedAlertIds.add(topAlert.id);
          playEmergencyChime();
        }

        // Add beacon markers on map
        currentAlerts.forEach(a => {
          let alertLat = a.latitude;
          let alertLng = a.longitude;

          // Fallback to rider current map marker position if alert coordinates are null
          if (!alertLat || !alertLng) {
            const rm = (a.rider_id && riderMarkers[a.rider_id]) ||
              (a.rider_bib && bibToRider[a.rider_bib] && riderMarkers[bibToRider[a.rider_bib].id]);
            if (rm && typeof rm.getLatLng === 'function') {
              const pos = rm.getLatLng();
              alertLat = pos.lat;
              alertLng = pos.lng;
            }
          }

          if (alertLat && alertLng) {
            const sosIcon = L.divIcon({
              html: `<div class="sos-map-marker-beacon">🚨</div>`,
              className: '',
              iconSize: [28, 28],
              iconAnchor: [14, 14]
            });
            const resolveActionHtml = isAdmin ? `
                <button onclick="resolveAlertDirect(${a.id})" style="background:#10B981;color:#FFF;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-weight:700;font-size:11px">
                  ✓ Tandai Kasus Selesai
                </button>
            ` : `
                <div style="font-size:11px;color:#EF4444;font-weight:600;margin-top:4px">
                  🛡️ Panitia & tim medis sedang dalam penanganan
                </div>
            `;

            const m = L.marker([alertLat, alertLng], { icon: sosIcon, zIndexOffset: 3000 }).addTo(map);
            m.bindPopup(`
              <div style="color:#080A0F;padding:4px">
                <strong style="color:#EF4444;font-size:13px">🚨 SINYAL SOS DARURAT</strong><br>
                <strong>#${a.rider_bib || '?'} ${a.rider_name || 'Rider'}</strong><br>
                <span>Jenis: <strong>${escapeHtml(sosTypeLabel(a.type))}</strong></span><br>
                <p style="margin:4px 0 8px 0;font-size:12px">${escapeHtml(sosDisplayMessage(a))}</p>
                ${resolveActionHtml}
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
      if (!isAdmin) return;
      if (currentAlerts.length > 0) {
        const topAlert = currentAlerts[0];
        await resolveAlertDirect(topAlert.id);
      }
    });
  }

  window.resolveAlertDirect = async id => {
    if (!isAdmin) {
      showToast('Hanya panitia yang berwenang menyelesaikan status darurat.', 'error');
      return;
    }
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

  let alertCheckInterval = null;
  checkActiveAlerts();
  alertCheckInterval = setInterval(() => {
    if (liveWs && liveWs.readyState === WebSocket.OPEN) return;
    checkActiveAlerts();
  }, 10000);

  // ── Time Machine Replay Engine State & Lifecycle ──
  isReplayActive = false;
  let replayHistoryData = [];      // Raw array of telemetry history points
  let replayFrames = [];           // Array of { timeMs, points: [] }
  let replayPointsByRider = null;  // rider_id -> sorted array of historical telemetry points for lerp
  let replayCpFrames = [];         // Checkpoints mapped to frame index for fast jump navigation
  let replayAutoSkipEnabled = true;// Auto-skip long dead hours by default
  let lastAutoSkipToastMs = 0;
  let replayFrameIndex = 0;        // Current frame index
  let replayInterval = null;       // Timer interval
  let replaySpeed = 1;             // 1, 2, 4, 8, 16, 32
  let replayIsPlaying = false;
  let originalSplitsBackup = null; // Backup of splitsCache before replay
  let replayTrailsByRider = {};    // rider_id -> L.polyline

  function clearReplayTrails() {
    Object.values(replayTrailsByRider).forEach(poly => {
      if (poly && map && map.hasLayer(poly)) {
        map.removeLayer(poly);
      }
    });
    replayTrailsByRider = {};
  }

  function addReplayTrail(riderId, latlng, color) {
    if (!map) return;
    if (!replayTrailsByRider[riderId]) {
      replayTrailsByRider[riderId] = L.polyline([latlng], {
        color: color || '#10B981',
        weight: 3,
        opacity: 0.7,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
    } else {
      const poly = replayTrailsByRider[riderId];
      const pts = poly.getLatLngs();
      if (pts.length > 0) {
        const last = pts[pts.length - 1];
        if (Math.abs(last.lat - latlng[0]) < 0.00002 && Math.abs(last.lng - latlng[1]) < 0.00002) {
          return;
        }
      }
      poly.addLatLng(latlng);
    }
  }

  function buildReplayFrames(points, windowMs = 30000) {
    if (!points || !points.length) return [];
    const minTime = new Date(points[0].recorded_at).getTime();
    const maxTime = new Date(points[points.length - 1].recorded_at).getTime();

    if (minTime >= maxTime) {
      return [{ timeMs: minTime, points: points }];
    }

    const frames = [];
    let curBucket = minTime;
    let ptIdx = 0;

    while (curBucket <= maxTime) {
      const bucketEnd = curBucket + windowMs;
      const bucketPoints = [];
      while (ptIdx < points.length) {
        const ptTime = new Date(points[ptIdx].recorded_at).getTime();
        if (ptTime < bucketEnd) {
          bucketPoints.push(points[ptIdx]);
          ptIdx++;
        } else {
          break;
        }
      }
      frames.push({
        timeMs: curBucket,
        points: bucketPoints
      });
      curBucket = bucketEnd;
    }

    if (ptIdx < points.length && frames.length) {
      frames[frames.length - 1].points.push(...points.slice(ptIdx));
    }

    return frames;
  }

  // ── Virtual COT Replay Coordinate Interpolation ──
  let routeCumulativeKm = null;
  function getPointAtRouteKm(coords, targetKm) {
    if (!coords || !coords.length) return null;
    if (targetKm <= 0) return coords[0];

    if (!routeCumulativeKm || routeCumulativeKm.length !== coords.length) {
      routeCumulativeKm = [0];
      let acc = 0;
      for (let i = 1; i < coords.length; i++) {
        const d = typeof haversineKm === 'function'
          ? haversineKm(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1])
          : 0;
        acc += d;
        routeCumulativeKm.push(acc);
      }
    }

    const total = routeCumulativeKm[routeCumulativeKm.length - 1];
    if (targetKm >= total) return coords[coords.length - 1];

    let low = 0;
    let high = routeCumulativeKm.length - 1;
    while (low + 1 < high) {
      const mid = (low + high) >> 1;
      if (routeCumulativeKm[mid] <= targetKm) low = mid;
      else high = mid;
    }

    const a = coords[low];
    const b = coords[high];
    const segSpan = routeCumulativeKm[high] - routeCumulativeKm[low];
    const ratio = segSpan > 0 ? (targetKm - routeCumulativeKm[low]) / segSpan : 0;
    return [
      a[0] + (b[0] - a[0]) * ratio,
      a[1] + (b[1] - a[1]) * ratio
    ];
  }

  function updateReplayCot(targetTimeMs) {
    if (!cotConfig || !cotConfig.enabled || cotConfig.mode === 'off' || !routeCoords || !routeCoords.length || !cotConfig.start_ms || !cotConfig.pace) {
      if (cotMarker && map) {
        try { map.removeLayer(cotMarker); } catch (e) { }
        cotMarker = null;
      }
      return 0;
    }

    const elapsedHours = (targetTimeMs - cotConfig.start_ms) / 3600000;
    const totalRouteLength = cotConfig.route_length_km || routeKm || 0;

    let cotDistanceKm = 0;
    let cotStatus = 'NOT_STARTED';

    if (elapsedHours < 0) {
      cotDistanceKm = 0;
      cotStatus = 'NOT_STARTED';
    } else if (totalRouteLength > 0 && elapsedHours * cotConfig.pace >= totalRouteLength) {
      cotDistanceKm = totalRouteLength;
      cotStatus = 'FINISHED';
    } else {
      cotDistanceKm = elapsedHours * cotConfig.pace;
      cotStatus = 'MOVING';
    }

    const latlng = getPointAtRouteKm(routeCoords, cotDistanceKm);
    if (!latlng) return cotDistanceKm;

    if (!cotMarker) {
      cotMarker = L.marker(latlng, { icon: cotDivIcon(), zIndexOffset: 1600 }).addTo(map);
    } else {
      cotMarker.setLatLng(latlng);
    }

    const statusLabel = cotStatus === 'MOVING' ? 'BERGERAK' : (cotStatus === 'NOT_STARTED' ? 'BELUM MULAI' : 'SELESAI');
    const popupContent = `
      <div style="font-family:ui-monospace,monospace;font-size:10.5px;font-weight:800;color:#991B1B;letter-spacing:0.06em">⏱️ COT VIRTUAL (REPLAY)</div>
      <div style="font-weight:900;font-size:15px;color:#0D1117;margin-top:2px">km ${cotDistanceKm.toFixed(1)}</div>
      <div style="font-size:12px;color:#4B5563;margin-top:2px">${cotConfig.pace} km/jam · ${statusLabel}</div>
      <div style="font-size:11px;color:#6B7280;margin-top:4px">Waktu Replay: ${new Date(targetTimeMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB</div>
    `;
    cotMarker.bindPopup(popupContent);
    return cotDistanceKm;
  }

  // ── Smooth Linear Interpolation (Lerp) for Replay Coordinates ──
  function getInterpolatedRiderPosition(riderId, targetTimeMs) {
    if (!replayPointsByRider) return null;
    const pts = replayPointsByRider[riderId];
    if (!pts || !pts.length) return null;

    if (targetTimeMs < pts[0].timeMs) {
      return null; // Rider has not started yet
    }
    if (targetTimeMs >= pts[pts.length - 1].timeMs) {
      return pts[pts.length - 1]; // Rider reached end of telemetry
    }

    // Binary search for surrounding points ptA.timeMs <= targetTimeMs < ptB.timeMs
    let low = 0;
    let high = pts.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (pts[mid].timeMs <= targetTimeMs) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const idxA = Math.max(0, high);
    const ptA = pts[idxA];
    const ptB = pts[idxA + 1];

    if (!ptB) return ptA;

    const dt = ptB.timeMs - ptA.timeMs;
    // If telemetry gap is > 20 minutes (e.g. overnight sleep, resting at CP, or GPS blackout),
    // stay stationary at ptA until shortly before ptB (last 60s) to avoid unnatural slow drifting.
    if (dt > 1200000) {
      if (targetTimeMs < ptB.timeMs - 60000) {
        return ptA;
      }
      const ratio = (targetTimeMs - (ptB.timeMs - 60000)) / 60000;
      return {
        ...ptB,
        latitude: ptA.latitude + (ptB.latitude - ptA.latitude) * ratio,
        longitude: ptA.longitude + (ptB.longitude - ptA.longitude) * ratio,
        distance_km: (ptA.distance_km || 0) + ((ptB.distance_km || 0) - (ptA.distance_km || 0)) * ratio,
        speed: (ptA.speed || 0) + ((ptB.speed || 0) - (ptA.speed || 0)) * ratio,
        recorded_at: new Date(targetTimeMs).toISOString()
      };
    }

    const ratio = dt > 0 ? (targetTimeMs - ptA.timeMs) / dt : 0;
    return {
      ...ptA,
      latitude: ptA.latitude + (ptB.latitude - ptA.latitude) * ratio,
      longitude: ptA.longitude + (ptB.longitude - ptA.longitude) * ratio,
      distance_km: (ptA.distance_km || 0) + ((ptB.distance_km || 0) - (ptA.distance_km || 0)) * ratio,
      speed: (ptA.speed || 0) + ((ptB.speed || 0) - (ptA.speed || 0)) * ratio,
      recorded_at: new Date(targetTimeMs).toISOString()
    };
  }

  function applyReplayFrame(targetIdx) {
    if (targetIdx < 0 || targetIdx >= replayFrames.length) return;
    replayFrameIndex = targetIdx;

    const frame = replayFrames[targetIdx];
    const targetTimeMs = frame.timeMs;
    const frameDate = new Date(targetTimeMs);
    const clockStr = frameDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const clockEl = document.getElementById('replayClock');
    if (clockEl) clockEl.textContent = clockStr;
    const slider = document.getElementById('replaySlider');
    if (slider && Number(slider.value) !== targetIdx) slider.value = targetIdx;

    // Smooth linear interpolation (lerp) for every active rider at current targetTimeMs
    if (replayPointsByRider) {
      Object.keys(replayPointsByRider).forEach(rId => {
        const riderId = Number(rId);
        const r = riders.find(item => item.id === riderId);
        if (!r) return;
        const devKey = r.traccar_device_id || r.id;

        const interpolated = getInterpolatedRiderPosition(riderId, targetTimeMs);
        if (interpolated) {
          updateRiderPosition(devKey, {
            latitude: interpolated.latitude,
            longitude: interpolated.longitude,
            speed: interpolated.speed || 0,
            distance_km: interpolated.distance_km,
            isKmh: true,
            fixTime: interpolated.recorded_at,
            attributes: {}
          });

          addReplayTrail(riderId, [interpolated.latitude, interpolated.longitude], interpolated.rider_color || r.color);
        }
      });
    }

    // Update Virtual COT position & dynamic DNF state during replay
    const replayCotKm = updateReplayCot(targetTimeMs);
    if (cotConfig && cotConfig.enabled && cotConfig.mode !== 'off' && cotConfig.start_ms && cotConfig.pace) {
      const elapsedHours = (targetTimeMs - cotConfig.start_ms) / 3600000;
      if (elapsedHours > 0 && replayCotKm > 0 && replayPointsByRider) {
        const dnfIds = [];
        Object.keys(replayPointsByRider).forEach(rId => {
          const riderId = Number(rId);
          const r = riders.find(item => item.id === riderId);
          if (r && (!r.role || r.role === 'rider')) {
            const interpolated = getInterpolatedRiderPosition(riderId, targetTimeMs);
            if (interpolated && interpolated.distance_km != null && interpolated.distance_km < (replayCotKm - 1.0)) {
              dnfIds.push(riderId);
            }
          }
        });
        applyCotDnfVisuals(dnfIds);
      } else {
        applyCotDnfVisuals([]);
      }
    }

    // Sync elevation profile with current replay rider positions if drawer is open
    const elevationDrawer = document.getElementById('elevationDrawer');
    if (elevationDrawer && !elevationDrawer.classList.contains('collapsed') && typeof redrawElevationChart === 'function') {
      redrawElevationChart();
    }
  }

  function seekReplay(targetIdx) {
    if (!isReplayActive || !replayFrames.length) return;
    targetIdx = Math.max(0, Math.min(targetIdx, replayFrames.length - 1));

    // Reset state to cleanly re-populate up to target frame
    Object.keys(splitsCache).forEach(k => delete splitsCache[k]);
    Object.keys(telemetryById).forEach(k => delete telemetryById[k]);
    Object.keys(progressById).forEach(k => delete progressById[k]);
    clearReplayTrails();

    const targetTimeMs = replayFrames[targetIdx].timeMs;

    // Re-populate historical trail lines up to targetTimeMs
    if (replayPointsByRider) {
      Object.keys(replayPointsByRider).forEach(rId => {
        const rPts = replayPointsByRider[rId];
        const rInfo = riders.find(r => r.id === Number(rId));
        const color = (rInfo && rInfo.color) || '#10B981';
        for (let i = 0; i < rPts.length; i++) {
          if (rPts[i].timeMs <= targetTimeMs) {
            addReplayTrail(Number(rId), [rPts[i].latitude, rPts[i].longitude], color);
          } else {
            break;
          }
        }
      });
    }

    // Re-populate splitsCache for checkpoints reached up to target time
    if (checkpoints && checkpoints.length) {
      for (let i = 0; i < replayHistoryData.length; i++) {
        const pt = replayHistoryData[i];
        const ptTime = new Date(pt.recorded_at).getTime();
        if (ptTime > targetTimeMs) break;

        if (pt.distance_km > 0) {
          checkpoints.forEach(cp => {
            const cacheKey = `${pt.rider_id}_${cp.id}`;
            if (!splitsCache[cacheKey] && pt.distance_km >= cp.km_distance) {
              const cpTime = new Date(pt.recorded_at);
              splitsCache[cacheKey] = {
                rider_id: pt.rider_id,
                checkpoint_id: cp.id,
                cp_name: cp.name,
                km_distance: cp.km_distance,
                arrival_time: pt.recorded_at,
                status: checkCotStatus(cpTime, cp.open_time, cp.close_time)
              };
            }
          });
        }
      }
    }

    // Apply smoothly interpolated positions at target frame
    applyReplayFrame(targetIdx);
  }

  function jumpToPrevCheckpoint() {
    if (!isReplayActive || !replayCpFrames.length) {
      showToast('Belum ada data checkpoint yang terlewati.', 'info');
      return;
    }
    let target = null;
    for (let i = replayCpFrames.length - 1; i >= 0; i--) {
      if (replayCpFrames[i].frameIdx < replayFrameIndex - 1) {
        target = replayCpFrames[i];
        break;
      }
    }
    if (!target) target = replayCpFrames[0];
    seekReplay(target.frameIdx);
    showToast(`🚩 Lompat ke ${target.name} (${target.km} km)`, 'info');
  }

  function jumpToNextCheckpoint() {
    if (!isReplayActive || !replayCpFrames.length) {
      showToast('Belum ada data checkpoint yang terlewati.', 'info');
      return;
    }
    let target = null;
    for (let i = 0; i < replayCpFrames.length; i++) {
      if (replayCpFrames[i].frameIdx > replayFrameIndex + 1) {
        target = replayCpFrames[i];
        break;
      }
    }
    if (!target) target = replayCpFrames[replayCpFrames.length - 1];
    seekReplay(target.frameIdx);
    showToast(`🚩 Lompat ke ${target.name} (${target.km} km)`, 'info');
  }

  function startReplayTimer() {
    if (replayInterval) clearInterval(replayInterval);
    const baseIntervalMs = 800;
    const targetInterval = baseIntervalMs / replaySpeed;
    let step = 1;
    let intervalMs = targetInterval;
    if (targetInterval < 40) {
      intervalMs = 40;
      step = Math.max(1, Math.round(40 / targetInterval));
    } else {
      intervalMs = Math.round(targetInterval);
    }

    replayInterval = setInterval(() => {
      if (!isReplayActive || !replayIsPlaying) return;

      if (replayFrameIndex >= replayFrames.length - 1) {
        stopReplay(true);
        return;
      }

      // Smart Auto-Skip: If auto-skip is enabled and upcoming frames have zero telemetry activity
      if (replayAutoSkipEnabled && replayFrameIndex < replayFrames.length - 1) {
        const curFrame = replayFrames[replayFrameIndex];
        if (!curFrame.points || curFrame.points.length === 0) {
          let emptyCount = 0;
          let nextActiveIdx = -1;
          for (let j = replayFrameIndex + 1; j < replayFrames.length; j++) {
            if (!replayFrames[j].points || replayFrames[j].points.length === 0) {
              emptyCount++;
            } else {
              nextActiveIdx = j;
              break;
            }
          }

          // If gap is >= 6 frames (>= 3 minutes of empty telemetry across all riders)
          if (emptyCount >= 6 && nextActiveIdx !== -1) {
            const skipMinutes = Math.round((emptyCount * 30) / 60);
            const nowTime = Date.now();
            if (nowTime - lastAutoSkipToastMs > 5000) {
              showToast(`⏩ Melompati jeda kosong (${skipMinutes} menit)...`, 'info');
              lastAutoSkipToastMs = nowTime;
            }
            seekReplay(nextActiveIdx);
            return;
          }
        }
      }

      const nextIdx = Math.min(replayFrames.length - 1, replayFrameIndex + step);
      for (let i = replayFrameIndex + 1; i <= nextIdx; i++) {
        applyReplayFrame(i);
      }
    }, intervalMs);
  }

  function toggleReplayPlayPause() {
    if (!isReplayActive) return;
    replayIsPlaying = !replayIsPlaying;
    const playBtn = document.getElementById('btnReplayPlay');
    if (playBtn) {
      playBtn.innerHTML = replayIsPlaying ? '⏸' : '▶';
      playBtn.title = replayIsPlaying ? 'Pause Replay' : 'Lanjutkan Replay';
    }
    if (replayIsPlaying) {
      startReplayTimer();
    } else if (replayInterval) {
      clearInterval(replayInterval);
      replayInterval = null;
    }
  }

  function setReplaySpeed(speed) {
    replaySpeed = Number(speed) || 1;
    document.querySelectorAll('.replay-speed-btn').forEach(btn => {
      btn.classList.toggle('active', Number(btn.dataset.speed) === replaySpeed);
    });
    if (replayIsPlaying) {
      startReplayTimer();
    }
  }

  async function startReplay() {
    if (!isAdmin) {
      showToast('Akses Replay hanya dapat digunakan oleh panitia.', 'warning');
      return;
    }
    if (isReplayActive) return;

    showToast('Memuat rekaman telemetri event...', 'info');

    let historyPoints = [];
    try {
      const res = await eventFetch(`/api/events/${eventId}/history?limit=10000`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      historyPoints = await res.json();
    } catch (err) {
      showToast('Gagal memuat rekaman replay: ' + err.message, 'error');
      return;
    }

    if (!Array.isArray(historyPoints) || historyPoints.length === 0) {
      showToast('Belum ada rekaman riwayat GPS untuk event ini.', 'warning');
      return;
    }

    // Chronological order
    historyPoints.sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));

    // 1. RISK 1: Mark active, pause live polling, and close WebSocket
    isReplayActive = true;
    if (historyPollInterval) {
      clearInterval(historyPollInterval);
      historyPollInterval = null;
    }
    if (liveWs) {
      try { liveWs.close(); } catch (e) { }
      liveWs = null;
    }
    if (cotTimer) {
      clearInterval(cotTimer);
      cotTimer = null;
    }

    const btnMobileSidebar = document.getElementById('btnMobileOpenSidebar');
    if (btnMobileSidebar) btnMobileSidebar.style.display = 'none';

    // Ensure Virtual COT config is cached for replay interpolation
    if (!cotConfig) {
      try {
        const cotRes = await eventFetch(`/api/events/${eventId}/virtual-cot`);
        if (cotRes.ok) cotConfig = await cotRes.json();
      } catch (e) { }
    }

    const dot = document.getElementById('liveDot');
    const statusText = document.getElementById('liveStatusText');
    if (dot) { dot.className = 'live-dot'; dot.style.background = '#D97706'; }
    if (statusText) { statusText.textContent = '⏪ REPLAY'; }

    // 2. RISK 2: Backup and clear splitsCache so checkpoints aren't falsely marked
    originalSplitsBackup = { ...splitsCache };
    Object.keys(splitsCache).forEach(k => delete splitsCache[k]);

    // Reset telemetry & progress
    Object.keys(telemetryById).forEach(k => delete telemetryById[k]);
    Object.keys(progressById).forEach(k => delete progressById[k]);
    clearReplayTrails();

    // 3. Build frames (30s window)
    replayHistoryData = historyPoints;
    replayFrames = buildReplayFrames(historyPoints, 30000);
    if (!replayFrames.length) {
      showToast('Tidak ada frame replay yang dapat diproses.', 'warning');
      stopReplay();
      return;
    }

    // Index points by rider for smooth linear interpolation (lerp)
    replayPointsByRider = {};
    historyPoints.forEach(pt => {
      if (pt.latitude != null && pt.longitude != null) {
        if (!replayPointsByRider[pt.rider_id]) {
          replayPointsByRider[pt.rider_id] = [];
        }
        replayPointsByRider[pt.rider_id].push({
          ...pt,
          timeMs: new Date(pt.recorded_at).getTime()
        });
      }
    });
    Object.values(replayPointsByRider).forEach(pts => {
      pts.sort((a, b) => a.timeMs - b.timeMs);
    });

    // Map checkpoints to nearest arrival frames for fast jump navigation
    replayCpFrames = [];
    if (checkpoints && checkpoints.length) {
      checkpoints.forEach(cp => {
        const arrivalPt = historyPoints.find(p => (p.distance_km || 0) >= cp.km_distance);
        if (arrivalPt) {
          const arrTime = new Date(arrivalPt.recorded_at).getTime();
          let matchedFrameIdx = 0;
          for (let f = 0; f < replayFrames.length; f++) {
            if (replayFrames[f].timeMs >= arrTime) {
              matchedFrameIdx = f;
              break;
            }
          }
          replayCpFrames.push({
            id: cp.id,
            name: cp.name,
            km: cp.km_distance,
            timeMs: arrTime,
            frameIdx: matchedFrameIdx
          });
        }
      });
      replayCpFrames.sort((a, b) => a.frameIdx - b.frameIdx);
    }

    replayFrameIndex = 0;
    replaySpeed = 1;
    replayIsPlaying = true;

    // 4. Update UI
    const replayControlBar = document.getElementById('replayControlBar');
    const btnReplay = document.getElementById('btnToggleReplay');
    if (btnReplay) btnReplay.classList.add('active');
    if (replayControlBar) {
      replayControlBar.style.display = 'block';
      const playBtn = document.getElementById('btnReplayPlay');
      if (playBtn) playBtn.innerHTML = '⏸';

      const startDate = new Date(replayFrames[0].timeMs);
      const endDate = new Date(replayFrames[replayFrames.length - 1].timeMs);
      const startEl = document.getElementById('replayStartTime');
      const endEl = document.getElementById('replayEndTime');
      if (startEl) startEl.textContent = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (endEl) endEl.textContent = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const slider = document.getElementById('replaySlider');
      if (slider) {
        slider.min = 0;
        slider.max = replayFrames.length - 1;
        slider.value = 0;
      }
    }

    // Collapse elevation drawer and mobile rider sheet on mobile if open to give full view
    if (isMobileViewport()) {
      closeMobileRiderSheet();
      if (typeof toggleElevation === 'function') {
        try { toggleElevation(false); } catch (e) { }
      }
    }

    // 5. Apply first frame and start timer
    applyReplayFrame(0);
    startReplayTimer();
    showToast('Mode Replay Aktif 🎬 Putar rekaman perlombaan', 'success');
  }

  function stopReplay(isFinished = false) {
    if (!isReplayActive) return;
    isReplayActive = false;
    replayIsPlaying = false;

    if (activeScreenRecorder && activeScreenRecorder.state === 'recording') {
      stopScreenRecording(true);
    }

    if (replayInterval) {
      clearInterval(replayInterval);
      replayInterval = null;
    }

    const replayControlBar = document.getElementById('replayControlBar');
    const btnReplay = document.getElementById('btnToggleReplay');
    if (replayControlBar) replayControlBar.style.display = 'none';
    if (btnReplay) btnReplay.classList.remove('active');

    const dot = document.getElementById('liveDot');
    const statusText = document.getElementById('liveStatusText');
    if (dot) { dot.style.background = ''; }
    if (statusText) { statusText.textContent = 'LIVE'; }

    clearReplayTrails();

    // RISK 2: Restore original splitsCache
    if (originalSplitsBackup) {
      Object.keys(splitsCache).forEach(k => delete splitsCache[k]);
      Object.assign(splitsCache, originalSplitsBackup);
      originalSplitsBackup = null;
    }

    // Reset telemetry & progress back to live state
    Object.keys(telemetryById).forEach(k => delete telemetryById[k]);
    Object.keys(progressById).forEach(k => delete progressById[k]);
    replayPointsByRider = null;
    replayCpFrames = [];

    // Sync elevation profile back to live positions if drawer is open
    const elevationDrawer = document.getElementById('elevationDrawer');
    if (elevationDrawer && !elevationDrawer.classList.contains('collapsed') && typeof redrawElevationChart === 'function') {
      setTimeout(redrawElevationChart, 100);
    }

    // RISK 1: Re-sync to latest live positions and restore polling + WebSocket
    syncLatestPositionsFromHistory().catch(() => { });
    scheduleNextFallbackSync();
    connectWs();

    // Restore live Virtual COT timer & marker
    refreshVirtualCot();
    if (!cotTimer) {
      cotTimer = setInterval(refreshVirtualCot, 20000);
    }
    const btnMobileSidebar = document.getElementById('btnMobileOpenSidebar');
    if (isMobileViewport() && btnMobileSidebar) btnMobileSidebar.style.display = 'inline-flex';
    updateFloatingControlsBottom();

    if (isFinished) {
      showToast('🏁 Replay selesai — kembali ke Live Tracking', 'info');
    } else {
      showToast('Kembali ke Live Tracking', 'info');
    }
  }

  // Setup Replay UI event listeners
  const btnToggleReplay = document.getElementById('btnToggleReplay');
  if (btnToggleReplay) {
    btnToggleReplay.addEventListener('click', () => {
      if (isReplayActive) stopReplay();
      else startReplay();
    });
  }


  const btnReplayPlay = document.getElementById('btnReplayPlay');
  if (btnReplayPlay) {
    btnReplayPlay.addEventListener('click', toggleReplayPlayPause);
  }

  const btnReplayPrevCp = document.getElementById('btnReplayPrevCp');
  if (btnReplayPrevCp) {
    btnReplayPrevCp.addEventListener('click', jumpToPrevCheckpoint);
  }

  const btnReplayNextCp = document.getElementById('btnReplayNextCp');
  if (btnReplayNextCp) {
    btnReplayNextCp.addEventListener('click', jumpToNextCheckpoint);
  }

  const btnToggleReplayAutoSkip = document.getElementById('btnToggleReplayAutoSkip');
  if (btnToggleReplayAutoSkip) {
    btnToggleReplayAutoSkip.addEventListener('click', () => {
      replayAutoSkipEnabled = !replayAutoSkipEnabled;
      btnToggleReplayAutoSkip.classList.toggle('active', replayAutoSkipEnabled);
      showToast(replayAutoSkipEnabled ? '⏩ Auto-skip jam mati diaktifkan' : '⏸ Auto-skip dimatikan', 'info');
    });
  }

  const btnExitReplay = document.getElementById('btnExitReplay');
  if (btnExitReplay) {
    btnExitReplay.addEventListener('click', () => stopReplay(false));
  }

  const replaySlider = document.getElementById('replaySlider');
  if (replaySlider) {
    replaySlider.addEventListener('input', e => {
      seekReplay(Number(e.target.value));
    });
  }

  document.querySelectorAll('.replay-speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setReplaySpeed(Number(btn.dataset.speed));
    });
  });

  // ── Replay Video Export Engine (Screen & Canvas Story Recorder) ──
  let activeScreenRecorder = null;
  let screenRecordStream = null;
  let screenRecordChunks = [];
  let screenRecordSeconds = 0;
  let screenRecordTimerInterval = null;
  let selectedExportMode = 'screen'; // 'screen' | 'canvas'
  let selectedExportSpeed = 4; // 1, 2, 4, 8

  const modalExportReplay = document.getElementById('modalExportReplay');
  const btnExportReplayVideo = document.getElementById('btnExportReplayVideo');
  const btnCloseExportModal = document.getElementById('btnCloseExportModal');
  const btnCancelExportModal = document.getElementById('btnCancelExportModal');
  const btnStartExportVideo = document.getElementById('btnStartExportVideo');
  const cardModeScreen = document.getElementById('cardModeScreen');
  const cardModeCanvas = document.getElementById('cardModeCanvas');
  const replayRecordingBar = document.getElementById('replayRecordingBar');
  const btnStopRecordingNow = document.getElementById('btnStopRecordingNow');
  const recordingTimerEl = document.getElementById('recordingTimer');

  function openExportModal() {
    if (!replayHistoryData.length) {
      showToast('Data telemetri replay belum siap untuk direkam.', 'warning');
      return;
    }
    // Pause replay while configuring export
    if (replayIsPlaying) {
      toggleReplayPlayPause();
    }

    const riderSelect = document.getElementById('exportRiderSelect');
    if (riderSelect) {
      const curVal = riderSelect.value || 'all';
      riderSelect.innerHTML = '<option value="all">🏁 Semua Rider (Race Overview)</option>';
      if (Array.isArray(riders) && riders.length) {
        riders.forEach(r => {
          const opt = document.createElement('option');
          opt.value = String(r.id);
          opt.textContent = `#${r.bib || '-'} ${r.name || 'Rider'}`;
          riderSelect.appendChild(opt);
        });
      }
      if (selectedRiderId && riders.some(r => String(r.id) === String(selectedRiderId))) {
        riderSelect.value = String(selectedRiderId);
      } else {
        riderSelect.value = curVal;
      }
    }

    modalExportReplay.style.display = 'flex';
  }

  function closeExportModal() {
    modalExportReplay.style.display = 'none';
    const progressWrap = document.getElementById('exportCanvasProgressWrap');
    if (progressWrap) progressWrap.style.display = 'none';
    if (btnStartExportVideo) btnStartExportVideo.disabled = false;
  }

  btnExportReplayVideo?.addEventListener('click', openExportModal);
  btnCloseExportModal?.addEventListener('click', closeExportModal);
  btnCancelExportModal?.addEventListener('click', closeExportModal);

  cardModeScreen?.addEventListener('click', () => {
    selectedExportMode = 'screen';
    cardModeScreen.classList.add('active');
    cardModeCanvas.classList.remove('active');
  });

  cardModeCanvas?.addEventListener('click', () => {
    selectedExportMode = 'canvas';
    cardModeCanvas.classList.add('active');
    cardModeScreen.classList.remove('active');
  });

  document.querySelectorAll('.export-speed-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.export-speed-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedExportSpeed = Number(pill.dataset.speed) || 4;
    });
  });

  btnStopRecordingNow?.addEventListener('click', () => {
    stopScreenRecording(true);
  });

  async function startScreenRecording(speed) {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
      showToast('Browser Anda tidak mendukung perekaman layar langsung. Mengalihkan ke Video Animasi Story...', 'info');
      startCanvasStoryExport(speed);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser', frameRate: 30 },
        audio: false,
        preferCurrentTab: true
      });

      screenRecordStream = stream;
      screenRecordChunks = [];

      const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
        ? 'video/mp4;codecs=avc1'
        : (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : (MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : ''));

      activeScreenRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      activeScreenRecorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          screenRecordChunks.push(e.data);
        }
      };

      activeScreenRecorder.onstop = () => {
        clearInterval(screenRecordTimerInterval);
        if (replayRecordingBar) replayRecordingBar.style.display = 'none';

        if (screenRecordStream) {
          screenRecordStream.getTracks().forEach(tr => tr.stop());
          screenRecordStream = null;
        }

        if (screenRecordChunks.length > 0) {
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const blob = new Blob(screenRecordChunks, { type: mimeType || 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const cleanEventName = (event && event.name ? event.name : 'Event').replace(/[^a-zA-Z0-9_-]/g, '_');
          a.href = url;
          a.download = `CycloPon-Replay-${cleanEventName}-${Date.now()}.${ext}`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 3000);
          showToast('🎉 Video Replay berhasil disimpan!', 'success');
        }
        activeScreenRecorder = null;
      };

      // If user ends share via browser native stop button
      stream.getVideoTracks()[0].onended = () => {
        stopScreenRecording(true);
      };

      activeScreenRecorder.start(500);
      closeExportModal();

      // Show recording floating indicator
      if (replayRecordingBar) replayRecordingBar.style.display = 'flex';
      screenRecordSeconds = 0;
      if (recordingTimerEl) recordingTimerEl.textContent = '00:00';
      if (screenRecordTimerInterval) clearInterval(screenRecordTimerInterval);
      screenRecordTimerInterval = setInterval(() => {
        screenRecordSeconds++;
        const mm = String(Math.floor(screenRecordSeconds / 60)).padStart(2, '0');
        const ss = String(screenRecordSeconds % 60).padStart(2, '0');
        if (recordingTimerEl) recordingTimerEl.textContent = `${mm}:${ss}`;
      }, 1000);

      // Start replay playback automatically at selected speed
      setReplaySpeed(speed);
      seekReplay(0);
      if (!replayIsPlaying) {
        toggleReplayPlayPause();
      }
      showToast('🔴 Perekaman Replay Aktif! Klik [■ Selesai & Unduh] saat ingin selesai.', 'info');
    } catch (err) {
      console.warn('Screen recording cancelled or failed:', err);
      if (err.name !== 'NotAllowedError') {
        showToast('Gagal membuka perekam layar. Mencoba Mode Animasi Story...', 'warning');
        startCanvasStoryExport(speed);
      }
    }
  }

  function stopScreenRecording(download = true) {
    if (activeScreenRecorder && activeScreenRecorder.state === 'recording') {
      try {
        activeScreenRecorder.stop();
      } catch (e) { }
    }
  }

  async function startCanvasStoryExport(speed) {
    if (!replayHistoryData || !replayHistoryData.length) {
      showToast('Data telemetri replay kosong.', 'warning');
      return;
    }

    const selectedRiderVal = document.getElementById('exportRiderSelect')?.value || 'all';
    const isSingleRider = selectedRiderVal !== 'all';
    const targetRiderId = isSingleRider ? Number(selectedRiderVal) : null;
    const targetRider = isSingleRider ? (riders.find(r => r.id === targetRiderId) || null) : null;

    let pts = [];
    if (isSingleRider) {
      pts = replayHistoryData.filter(p => p.rider_id === targetRiderId && p.latitude != null && p.longitude != null);
      if (pts.length < 2) {
        showToast('Data GPS rider tidak mencukupi untuk video animasi.', 'warning');
        closeExportModal();
        return;
      }
    } else {
      pts = replayHistoryData.filter(p => p.latitude != null && p.longitude != null);
      if (pts.length < 2) {
        showToast('Data GPS tidak mencukupi untuk video animasi.', 'warning');
        closeExportModal();
        return;
      }
    }

    const progressWrap = document.getElementById('exportCanvasProgressWrap');
    const progressText = document.getElementById('exportProgressText');
    const progressBar = document.getElementById('exportProgressBar');
    if (progressWrap) progressWrap.style.display = 'block';
    if (btnStartExportVideo) btnStartExportVideo.disabled = true;

    // Create 720x1280 (9:16 vertical story) high-resolution canvas
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d');

    // Determine bounding box across whole course & telemetry points
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    pts.forEach(p => {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    });

    if (routeCoords && routeCoords.length) {
      routeCoords.forEach(c => {
        if (c[0] < minLat) minLat = c[0];
        if (c[0] > maxLat) maxLat = c[0];
        if (c[1] < minLng) minLng = c[1];
        if (c[1] > maxLng) maxLng = c[1];
      });
    }

    const dLat = (maxLat - minLat) || 0.01;
    const dLng = (maxLng - minLng) || 0.01;
    const mapX = 60, mapY = 240, mapW = 600, mapH = 680;

    function project(lat, lng) {
      const x = mapX + 30 + ((lng - minLng) / dLng) * (mapW - 60);
      const y = mapY + mapH - 30 - ((lat - minLat) / dLat) * (mapH - 60);
      return [x, y];
    }

    // Group points by rider for multi-rider race overview
    const pointsByRider = {};
    if (!isSingleRider) {
      pts.forEach(p => {
        if (!pointsByRider[p.rider_id]) pointsByRider[p.rider_id] = [];
        pointsByRider[p.rider_id].push(p);
      });
    }

    // Determine global timestamps
    const globalMinTime = new Date(pts[0].recorded_at).getTime();
    const globalMaxTime = new Date(pts[pts.length - 1].recorded_at).getTime();
    const totalTimeSpan = Math.max(1000, globalMaxTime - globalMinTime);
    const totalCourse = routeKm || (event && event.distance_km) || 0;

    const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
      ? 'video/mp4;codecs=avc1'
      : (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : (MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : ''));

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

    recorder.onstop = () => {
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const cleanEventName = (event && event.name ? event.name : 'Event').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileTarget = isSingleRider && targetRider ? `Rider_${targetRider.bib || targetRider.id}` : 'Race_Overview';
      a.href = url;
      a.download = `CycloPon-Story-${fileTarget}-${cleanEventName}-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 3000);

      closeExportModal();
      if (btnStartExportVideo) btnStartExportVideo.disabled = false;
      showToast('🎉 Video Animasi Story berhasil diunduh!', 'success');
    };

    recorder.start();

    const totalFrames = 360; // 12 detik pada 30 fps
    let frame = 0;

    const renderInterval = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;

      if (progressBar) progressBar.style.width = `${Math.round(progress * 100)}%`;
      if (progressText) progressText.textContent = `Rendering Video Story... ${Math.round(progress * 100)}%`;

      const curTargetTimeMs = globalMinTime + progress * totalTimeSpan;
      const clockDate = new Date(curTargetTimeMs);
      const clockStr = clockDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // 1. Canvas Background
      ctx.fillStyle = '#0F141C';
      ctx.fillRect(0, 0, 720, 1280);

      // Subtle background grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 720; x += 45) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1280); ctx.stroke();
      }
      for (let y = 0; y < 1280; y += 45) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(720, y); ctx.stroke();
      }

      // 2. Top Header Brand & Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('CYCLOPON', 60, 90);

      ctx.fillStyle = '#10B981';
      ctx.font = '800 13px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText('// TELEMETRY REPLAY', 220, 90);

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '800 26px -apple-system, BlinkMacSystemFont, sans-serif';
      const eventTitle = (event && event.name ? event.name : 'EVENT REPLAY').toUpperCase();
      ctx.fillText(eventTitle.length > 28 ? eventTitle.substring(0, 26) + '...' : eventTitle, 60, 138);

      let curDist = 0;
      let curSpeed = 0;

      if (isSingleRider) {
        const ptIndex = Math.min(pts.length - 1, Math.floor(progress * pts.length));
        const curPt = pts[ptIndex];
        curDist = curPt.distance_km || 0;
        curSpeed = curPt.speed || 0;

        const riderName = targetRider ? targetRider.name : (curPt.rider_name || 'Rider');
        const riderBib = targetRider ? targetRider.bib : (curPt.rider_bib || '-');
        ctx.fillStyle = '#94A3B8';
        ctx.font = '700 16px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(`RIDER: #${riderBib} ${riderName.toUpperCase()}`, 60, 172);
      } else {
        ctx.fillStyle = '#94A3B8';
        ctx.font = '700 16px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(`RACE OVERVIEW: ${Object.keys(pointsByRider).length} RIDERS TRACKED`, 60, 172);
      }

      // 3. Map Card Background
      ctx.fillStyle = '#161B22';
      ctx.strokeStyle = '#2E3846';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(mapX - 10, mapY - 10, mapW + 20, mapH + 20, 16);
      } else {
        ctx.rect(mapX - 10, mapY - 10, mapW + 20, mapH + 20);
      }
      ctx.fill();
      ctx.stroke();

      // Full Route Ghost Line
      if (routeCoords && routeCoords.length > 1) {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const p0 = project(routeCoords[0][0], routeCoords[0][1]);
        ctx.moveTo(p0[0], p0[1]);
        for (let i = 1; i < routeCoords.length; i++) {
          const pi = project(routeCoords[i][0], routeCoords[i][1]);
          ctx.lineTo(pi[0], pi[1]);
        }
        ctx.stroke();
      }

      // Draw Trails and Pins
      if (isSingleRider) {
        const ptIndex = Math.min(pts.length - 1, Math.floor(progress * pts.length));
        const riderColor = (targetRider && targetRider.color) || pts[0].rider_color || '#10B981';

        // Single Rider Traversed Route Line
        if (ptIndex > 0) {
          ctx.strokeStyle = riderColor;
          ctx.lineWidth = 5;
          ctx.shadowColor = riderColor;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          const p0 = project(pts[0].latitude, pts[0].longitude);
          ctx.moveTo(p0[0], p0[1]);
          for (let i = 1; i <= ptIndex; i++) {
            const pi = project(pts[i].latitude, pts[i].longitude);
            ctx.lineTo(pi[0], pi[1]);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Rider Pin
        const curPt = pts[ptIndex];
        const curCoord = project(curPt.latitude, curPt.longitude);
        ctx.fillStyle = riderColor;
        ctx.beginPath();
        ctx.arc(curCoord[0], curCoord[1], 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else {
        // Multi-Rider: render each rider's trail and pin up to curTargetTimeMs
        let leadRider = null;
        let leadDist = -1;

        Object.keys(pointsByRider).forEach(rId => {
          const rPts = pointsByRider[rId];
          const passedPts = [];
          for (let i = 0; i < rPts.length; i++) {
            const ptTime = new Date(rPts[i].recorded_at).getTime();
            if (ptTime <= curTargetTimeMs) {
              passedPts.push(rPts[i]);
            } else {
              break;
            }
          }

          if (passedPts.length > 0) {
            const rInfo = riders.find(r => r.id === Number(rId));
            const rColor = (rInfo && rInfo.color) || passedPts[0].rider_color || '#10B981';

            // Draw rider trail
            if (passedPts.length > 1) {
              ctx.strokeStyle = rColor;
              ctx.lineWidth = 3;
              ctx.globalAlpha = 0.65;
              ctx.beginPath();
              const p0 = project(passedPts[0].latitude, passedPts[0].longitude);
              ctx.moveTo(p0[0], p0[1]);
              for (let j = 1; j < passedPts.length; j++) {
                const pj = project(passedPts[j].latitude, passedPts[j].longitude);
                ctx.lineTo(pj[0], pj[1]);
              }
              ctx.stroke();
              ctx.globalAlpha = 1.0;
            }

            // Draw current pin
            const latest = passedPts[passedPts.length - 1];
            const pinCoord = project(latest.latitude, latest.longitude);
            ctx.fillStyle = rColor;
            ctx.beginPath();
            ctx.arc(pinCoord[0], pinCoord[1], 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            const dist = latest.distance_km || 0;
            if (dist > leadDist) {
              leadDist = dist;
              leadRider = { info: rInfo, latest: latest };
            }
          }
        });

        if (leadRider) {
          curDist = leadDist;
          curSpeed = leadRider.latest.speed || 0;
        }
      }

      // 4. Bottom Dashboard Hero Cards
      const dashY = 960;

      // Card 1: Sisa Jarak
      ctx.fillStyle = '#161B22';
      ctx.strokeStyle = '#2E3846';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(60, dashY, 280, 170, 14);
      } else {
        ctx.rect(60, dashY, 280, 170);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '800 12px ui-monospace, monospace';
      ctx.fillText('// SISA JARAK', 80, dashY + 36);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 50px ui-monospace, monospace';
      const remKm = totalCourse > 0 ? Math.max(0, totalCourse - curDist).toFixed(1) : curDist.toFixed(1);
      ctx.fillText(remKm, 80, dashY + 104);

      ctx.fillStyle = '#10B981';
      ctx.font = '800 14px -apple-system, sans-serif';
      ctx.fillText(totalCourse > 0 ? 'KM SISA' : 'KM TOTAL', 220, dashY + 100);

      // Card 2: Jarak & Waktu Replay
      ctx.fillStyle = '#161B22';
      ctx.strokeStyle = '#2E3846';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(360, dashY, 300, 170, 14);
      } else {
        ctx.rect(360, dashY, 300, 170);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '800 12px ui-monospace, monospace';
      ctx.fillText(isSingleRider ? '// PROGRES & WAKTU' : '// PIMPINAN (LEADER)', 380, dashY + 36);

      ctx.fillStyle = '#10B981';
      ctx.font = '900 36px ui-monospace, monospace';
      ctx.fillText(`${curDist.toFixed(1)} km`, 380, dashY + 84);

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '700 20px ui-monospace, monospace';
      ctx.fillText(`🕒 ${clockStr}`, 380, dashY + 128);

      // Progress Bar at bottom
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(60, 1160, 600, 8);
      ctx.fillStyle = '#10B981';
      ctx.fillRect(60, 1160, 600 * progress, 8);

      // Finisher / Summary Overlay for last 1.5 seconds
      if (frame >= totalFrames - 45) {
        ctx.fillStyle = 'rgba(15, 20, 28, 0.92)';
        ctx.fillRect(mapX, mapY + 180, mapW, 280);
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2;
        ctx.strokeRect(mapX, mapY + 180, mapW, 280);

        ctx.fillStyle = '#10B981';
        ctx.font = '900 36px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏁 FINISHER SUMMARY', mapX + mapW / 2, mapY + 270);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '800 22px ui-monospace, monospace';
        const finishDistStr = isSingleRider
          ? `#${targetRider?.bib || '-'} ${targetRider?.name || 'Rider'} · ${curDist.toFixed(1)} KM`
          : `TOTAL EVENT: ${curDist.toFixed(1)} KM COMPLETED`;
        ctx.fillText(finishDistStr, mapX + mapW / 2, mapY + 330);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '600 16px -apple-system, sans-serif';
        ctx.fillText('Selamat atas pencapaian rute Anda!', mapX + mapW / 2, mapY + 380);
        ctx.textAlign = 'left';
      }

      if (frame >= totalFrames) {
        clearInterval(renderInterval);
        setTimeout(() => {
          recorder.stop();
        }, 500);
      }
    }, 33);
  }

  btnStartExportVideo?.addEventListener('click', () => {
    if (selectedExportMode === 'screen') {
      startScreenRecording(selectedExportSpeed);
    } else {
      startCanvasStoryExport(selectedExportSpeed);
    }
  });

  // ── Head-to-Head Comparison State & Engine ──
  let comparingRiderId = null;

  window.triggerCompareRider = function (riderId) {
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
          <div class="h2h-val">${progA.remainingKm != null ? progA.remainingKm : '-'} km</div>
          <div class="h2h-lbl">Sisa Jarak ke Finish</div>
          <div class="h2h-val val-b">${progB.remainingKm != null ? progB.remainingKm : '-'} km</div>
        </div>

        <div class="h2h-stat-row">
          <div class="h2h-val">${formatTimeAgo(progA.lastTime)}</div>
          <div class="h2h-lbl">Sinyal GPS Terakhir</div>
          <div class="h2h-val val-b">${formatTimeAgo(progB.lastTime)}</div>
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

  // ── Resilient WebSocket Connection to Traccar Proxy ──
  let liveWs = null;
  let liveWsReconnectTimer = null;
  let liveWsBackoffMs = 2000;
  isLiveMapMounted = true;
  let historyPollInterval = null;

  if (typeof Router !== 'undefined' && typeof Router.onUnmount === 'function') {
    Router.onUnmount(() => {
      isLiveMapMounted = false;
      if (replayInterval) {
        clearInterval(replayInterval);
        replayInterval = null;
      }
      clearReplayTrails();
      if (historyPollInterval) {
        clearInterval(historyPollInterval);
        historyPollInterval = null;
      }
      if (alertCheckInterval) {
        clearInterval(alertCheckInterval);
        alertCheckInterval = null;
      }
      if (liveWsReconnectTimer) {
        clearTimeout(liveWsReconnectTimer);
        liveWsReconnectTimer = null;
      }
      if (liveWs) {
        try { liveWs.close(); } catch (e) { }
        liveWs = null;
      }
      stopCotTimer();
    });
  }

  function connectWs() {
    if (!isLiveMapMounted || isReplayActive) return;
    if (liveWsReconnectTimer) {
      clearTimeout(liveWsReconnectTimer);
      liveWsReconnectTimer = null;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsPin = sessionStorage.getItem('event_pin_' + eventId) || '';
    const wsQuery = `event_id=${eventId}${wsPin ? `&pin=${encodeURIComponent(wsPin)}` : ''}`;
    const ws = new WebSocket(`${proto}//${window.location.host}/traccar-ws?${wsQuery}`);
    liveWs = ws;
    const dot = document.getElementById('liveDot');
    const statusText = document.getElementById('liveStatusText');

    if (dot) { dot.className = 'live-dot connecting'; dot.classList.remove('pulse'); }
    if (statusText) { statusText.textContent = 'Menghubungkan...'; }

    ws.onopen = () => {
      if (!isLiveMapMounted || isReplayActive) return;
      liveWsBackoffMs = 2000;
      if (dot) { dot.className = 'live-dot pulse'; }
      if (statusText) { statusText.textContent = '● LIVE STREAM'; }
      console.log('[LiveMap] WebSocket connected');
      // Backfill any positions or alerts missed during disconnect
      syncLatestPositionsFromHistory().catch(() => { });
      checkActiveAlerts().catch(() => { });
    };

    ws.onmessage = e => {
      if (isReplayActive) return;
      try {
        const data = JSON.parse(e.data);

        // Immediate reaction to emergency SOS alert create/resolve broadcast
        if (data.type === 'alert' || data.type === 'alert_resolved' || data.alerts) {
          checkActiveAlerts().catch(() => { });
        }

        // Immediate reaction to self check-in QR checkpoint split
        if (data.type === 'checkpoint_split' && data.split && Number(data.event_id) === Number(eventId)) {
          const sp = data.split;
          splitsCache[`${sp.rider_id}_${sp.checkpoint_id}`] = sp;
          const d = new Date(sp.arrival_time);
          const wibStr = !isNaN(d.getTime())
            ? d.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }) + ' WIB'
            : sp.arrival_time;
          const isPendingVerify = sp.verification_status === 'PENDING_VERIFY';
          const statusMsg = isPendingVerify ? 'Menunggu Verifikasi' : (sp.status === 'OVER_COT' ? 'Melebihi COT' : 'Lolos COT');
          showToast(`Check-In QR: #${sp.rider_bib || ''} ${sp.rider_name || ''} di ${sp.checkpoint_name || 'CP'} (${wibStr}, ${statusMsg})`, isPendingVerify || sp.status === 'OVER_COT' ? 'warning' : 'success');
        } else if (data.type === 'checkpoint_split_removed' && Number(data.event_id) === Number(eventId)) {
          delete splitsCache[`${data.rider_id}_${data.checkpoint_id}`];
        }

        // 1. Auto-Mapping Traccar Devices to Riders by BIB Number!
        if (data.devices && Array.isArray(data.devices)) {
          data.devices.forEach(dev => {
            const rawUnique = String(dev.uniqueId || dev.name || '').trim();
            const cleanUnique = rawUnique.replace(/^BIB-?/i, '');
            const strippedZero = cleanUnique.replace(/^0+/, '') || '0';
            const padded = cleanUnique.padStart(3, '0');
            const matchedRider = bibToRider[rawUnique] || bibToRider[cleanUnique] || bibToRider[`BIB-${cleanUnique}`] || bibToRider[padded] || bibToRider[strippedZero] || (riders.length === 1 ? riders[0] : null);
            if (matchedRider) {
              matchedRider.traccar_device_id = dev.id;
              riderById[dev.id] = matchedRider;
              riderById[String(dev.id)] = matchedRider;
              console.log(`[LiveMap] Auto-mapped Traccar device ${dev.id} (${rawUnique}) to rider #${matchedRider.bib} (${matchedRider.name})`);
            }
          });
        }

        // 2. Process incoming positions
        if (data.positions && Array.isArray(data.positions)) {
          data.positions.forEach(pos => {
            let rider = riderById[pos.deviceId];

            // Auto-fallback mapping by rider_id, bib, or deviceId string
            if (!rider && pos.rider_id && riderById[pos.rider_id]) {
              rider = riderById[pos.rider_id];
              riderById[pos.deviceId] = rider;
            }
            if (!rider && pos.bib) {
              const bibStr = String(pos.bib).trim();
              const cleanB = bibStr.replace(/^BIB-?/i, '');
              const strippedZero = cleanB.replace(/^0+/, '') || '0';
              rider = bibToRider[bibStr] || bibToRider[cleanB] || bibToRider[cleanB.padStart(3, '0')] || bibToRider[strippedZero];
              if (rider) riderById[pos.deviceId] = rider;
            }
            if (!rider && bibToRider[String(pos.deviceId)]) {
              rider = bibToRider[String(pos.deviceId)];
              riderById[pos.deviceId] = rider;
            }
            // Solo test fallback: if event only has 1 rider, map incoming position to that rider
            if (!rider && riders.length === 1) {
              rider = riders[0];
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
      if (!isLiveMapMounted || isReplayActive) return;
      if (dot) { dot.className = 'live-dot offline'; }
      if (statusText) { statusText.textContent = 'Menghubungkan kembali...'; }
      console.log(`[LiveMap] WebSocket disconnected. Reconnecting in ${liveWsBackoffMs / 1000}s...`);

      liveWsReconnectTimer = setTimeout(() => {
        if (isLiveMapMounted && !isReplayActive) connectWs();
      }, liveWsBackoffMs);

      liveWsBackoffMs = Math.min(Math.round(liveWsBackoffMs * 1.5), 15000);
    };

    ws.onerror = err => console.error('[LiveMap] WS error:', err);
  }

  // ── Initial and Fallback Polling for Web Telemetry (Ultra-fast Latest Endpoint) ──
  async function syncLatestPositionsFromHistory() {
    if (isReplayActive) return;
    try {
      // 1. First attempt the optimized latest-position endpoint
      let res = await eventFetch(`/api/events/${eventId}/positions/latest`);
      let points = [];
      if (res.ok) {
        points = await res.json();
      } else {
        // Fallback to standard history if latest endpoint unavailable
        res = await eventFetch(`/api/events/${eventId}/history`);
        if (res.ok) {
          const allHistory = await res.json();
          if (Array.isArray(allHistory)) {
            const latestMap = {};
            allHistory.forEach(pt => {
              if (!latestMap[pt.rider_id] || new Date(pt.recorded_at) > new Date(latestMap[pt.rider_id].recorded_at)) {
                latestMap[pt.rider_id] = pt;
              }
            });
            points = Object.values(latestMap);
          }
        }
      }

      if (!Array.isArray(points) || !points.length) return;

      points.forEach(pt => {
        const r = riders.find(item => item.id === pt.rider_id) || (riders.length === 1 ? riders[0] : null);
        if (!r) return;

        const devKey = r.traccar_device_id || pt.deviceId || r.id;
        updateRiderPosition(devKey, {
          latitude: pt.latitude,
          longitude: pt.longitude,
          speed: pt.speed || 0,
          isKmh: true,
          distance_km: Number(pt.max_distance_km || pt.distance_km || 0),
          is_finished: !!pt.is_finished,
          fixTime: pt.recorded_at,
          attributes: {}
        });
      });
    } catch (e) { }
  }

  // Trigger position sync fallback only when WebSocket is not actively streaming
  function triggerFallbackPositionSync() {
    checkPocketModeIndicator();
    // If WebSocket is alive and streaming, skip HTTP polling to keep server idle
    if (liveWs && liveWs.readyState === WebSocket.OPEN) {
      return;
    }
    syncLatestPositionsFromHistory();
  }

  // Periodic fallback sync with randomized jitter (4.5s - 6.5s) to eliminate thundering herd
  function scheduleNextFallbackSync() {
    if (historyPollInterval) {
      clearTimeout(historyPollInterval);
      clearInterval(historyPollInterval);
      historyPollInterval = null;
    }
    if (!isLiveMapMounted || isReplayActive) return;
    const jitterMs = 4500 + Math.random() * 2000;
    historyPollInterval = setTimeout(() => {
      triggerFallbackPositionSync();
      scheduleNextFallbackSync();
    }, jitterMs);
  }

  // Check and update pocket mode indicator if rider navigated to map with Pocket Mode active
  function checkPocketModeIndicator() {
    const pill = document.getElementById('riderPocketActivePill');
    if (!pill) return;
    if (window.GpsKeeper && GpsKeeper.isActive()) {
      pill.style.display = 'flex';
    } else {
      pill.style.display = 'none';
    }
  }
  checkPocketModeIndicator();

  // Fetch immediately on load
  syncLatestPositionsFromHistory();
  scheduleNextFallbackSync();

  window.addEventListener('popstate', () => {
    if (replayInterval) {
      clearInterval(replayInterval);
      replayInterval = null;
    }
    clearReplayTrails();
    if (historyPollInterval) {
      clearInterval(historyPollInterval);
      historyPollInterval = null;
    }
    if (alertCheckInterval) {
      clearInterval(alertCheckInterval);
      alertCheckInterval = null;
    }
    stopCotTimer();
    if (liveWsReconnectTimer) {
      clearTimeout(liveWsReconnectTimer);
      liveWsReconnectTimer = null;
    }
    if (liveWs) {
      try { liveWs.close(); } catch (e) { }
      liveWs = null;
    }
  }, { once: true });

  connectWs();
}
