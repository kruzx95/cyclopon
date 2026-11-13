/**
 * Admin Event Telemetry Audit & Incident Report Page
 * Provides full historical movement audit, Last Known Position tracking,
 * idle/offline rider investigation, breadcrumb trace, and rescue navigation links.
 */

async function renderAdminEventReports(params = {}) {
  loadCss('/css/admin.css');

  // 1. Admin Authentication Route Guard
  const adminUser = sessionStorage.getItem('adminUser') || localStorage.getItem('adminUser');
  if (!adminUser) {
    Router.navigate('/admin');
    return;
  }
  if (!sessionStorage.getItem('adminUser')) sessionStorage.setItem('adminUser', adminUser);

  // 2. Load Leaflet & GPX dependencies dynamically
  await loadScripts([
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    '/js/lib/gpx-utils.js'
  ]);
  loadCss('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="admin-layout">
      ${adminSidebar('reports')}
      <main class="admin-content">

        <!-- Page Header -->
        <div class="page-header" style="flex-wrap:wrap;gap:16px">
          <div class="page-header-title-col">
            <span class="page-header-tag">// TELEMETRY AUDIT &amp; INCIDENT INVESTIGATION</span>
            <h1 style="margin:4px 0">📑 Laporan &amp; Riwayat Event</h1>
            <p style="color:#6B7280;font-size:13px;margin:0">
              Audit history pergerakan rider, pelacakan posisi terakhir (Last Known Position), dan investigasi rider idle atau hilang kontak.
            </p>
          </div>

          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:6px;background:#FFFFFF;border:1px solid #E5E7EB;padding:4px 10px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
              <span style="font-size:13px;font-weight:700;color:#374151">Pilih Event:</span>
              <select id="reportEventSelect" style="border:none;background:transparent;font-size:13px;font-weight:800;color:#0D1117;outline:none;cursor:pointer">
                <option value="">Memuat daftar event...</option>
              </select>
            </div>

            <button id="btnRefreshReport" class="btn btn-outline" style="font-size:12px;padding:7px 12px;display:flex;align-items:center;gap:6px" title="Muat Ulang Data">
              <span>🔄</span> Refresh
            </button>

            <button id="btnExportCsv" class="btn btn-primary" style="font-size:12px;padding:7px 14px;display:flex;align-items:center;gap:6px" title="Unduh Rekapitulasi CSV">
              <span>📥</span> Unduh CSV
            </button>

            <a id="btnLiveMapLink" href="/watch/1" data-link class="btn btn-outline" style="font-size:12px;padding:7px 12px;display:flex;align-items:center;gap:6px" title="Buka Live Map">
              <span>🗺️</span> Live Map
            </a>
          </div>
        </div>

        <!-- KPI Metrics Grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:12px;margin-bottom:20px">
          <div class="card" style="padding:14px;border-left:4px solid #3B82F6">
            <div style="font-size:11px;font-weight:800;color:#6B7280;text-transform:uppercase;letter-spacing:0.04em">Total Peserta</div>
            <div id="statTotalRiders" style="font-size:24px;font-weight:900;color:#111827;margin-top:4px">0</div>
            <div id="statEventName" style="font-size:11px;color:#9CA3AF;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">-</div>
          </div>

          <div class="card" style="padding:14px;border-left:4px solid #10B981">
            <div style="font-size:11px;font-weight:800;color:#059669;text-transform:uppercase;letter-spacing:0.04em">🟢 Aktif Gowes</div>
            <div id="statMovingRiders" style="font-size:24px;font-weight:900;color:#059669;margin-top:4px">0</div>
            <div style="font-size:11px;color:#6B7280;margin-top:2px">Sinyal &le; 90 detik</div>
          </div>

          <div class="card" style="padding:14px;border-left:4px solid #F59E0B">
            <div style="font-size:11px;font-weight:800;color:#D97706;text-transform:uppercase;letter-spacing:0.04em">🟠 Sedang Idle</div>
            <div id="statIdleRiders" style="font-size:24px;font-weight:900;color:#D97706;margin-top:4px">0</div>
            <div style="font-size:11px;color:#6B7280;margin-top:2px">Diam / 90s - 5m</div>
          </div>

          <div class="card" style="padding:14px;border-left:4px solid #64748B">
            <div style="font-size:11px;font-weight:800;color:#64748B;text-transform:uppercase;letter-spacing:0.04em">⚪ Hilang Kontak</div>
            <div id="statOfflineRiders" style="font-size:24px;font-weight:900;color:#475569;margin-top:4px">0</div>
            <div style="font-size:11px;color:#6B7280;margin-top:2px">Blank Spot &gt; 5m</div>
          </div>

          <div class="card" style="padding:14px;border-left:4px solid #EF4444">
            <div style="font-size:11px;font-weight:800;color:#DC2626;text-transform:uppercase;letter-spacing:0.04em">🚨 Darurat SOS</div>
            <div id="statSosAlerts" style="font-size:24px;font-weight:900;color:#DC2626;margin-top:4px">0</div>
            <div style="font-size:11px;color:#6B7280;margin-top:2px">Butuh penanganan</div>
          </div>
        </div>

        <!-- Interactive Map Card -->
        <div class="card" style="margin-bottom:24px;padding:0;overflow:hidden;border:1px solid #E5E7EB;box-shadow:0 4px 12px rgba(0,0,0,0.04)">
          <div style="padding:14px 18px;background:#F9FAFB;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:18px">🗺️</span>
              <div>
                <h3 style="margin:0;font-size:14px;font-weight:800;color:#111827">Peta Posisi Terakhir &amp; Jejak Lintasan (Last Known Position)</h3>
                <span id="mapSubtitle" style="font-size:11px;color:#6B7280">Memuat rute dan titik jejak rider...</span>
              </div>
            </div>

            <!-- Map View Filter Buttons -->
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <div class="map-view-filter-group" style="display:flex;background:#FFFFFF;border:1px solid #D1D5DB;border-radius:6px;overflow:hidden">
                <button type="button" class="map-filter-btn active" data-map-filter="all" style="border:none;background:#2563EB;color:#FFF;padding:5px 10px;font-size:11.5px;font-weight:700;cursor:pointer">
                  Semua Posisi
                </button>
                <button type="button" class="map-filter-btn" data-map-filter="attention" style="border:none;background:transparent;color:#4B5563;padding:5px 10px;font-size:11.5px;font-weight:700;cursor:pointer">
                  ⚠️ Idle &amp; Hilang Kontak
                </button>
              </div>

              <button id="btnResetMapZoom" class="btn btn-outline" style="font-size:11px;padding:5px 9px">
                🔍 Reset Zoom
              </button>

              <button id="btnClearTrail" class="btn btn-outline" style="font-size:11px;padding:5px 9px;display:none">
                ✕ Tutup Jejak
              </button>
            </div>
          </div>

          <div id="reportMapContainer" style="width:100%;height:460px;position:relative;background:#E5E7EB">
            <div id="reportMap" style="width:100%;height:100%"></div>
            <div id="mapTrailBadge" style="display:none;position:absolute;bottom:14px;left:14px;z-index:1000;background:rgba(13,17,23,0.92);color:#FFFFFF;padding:6px 12px;border-radius:8px;font-size:11.5px;font-weight:800;border:1px solid rgba(255,255,255,0.2);box-shadow:0 4px 12px rgba(0,0,0,0.3)">
              <span>📍 Menampilkan jejak rekam pergerakan rider</span>
            </div>
          </div>
        </div>

        <!-- Rider Audit Table Section -->
        <div class="card" style="padding:18px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">
            <div>
              <h2 style="font-size:15px;font-weight:800;color:#111827;margin:0">
                📋 Daftar Status &amp; Posisi Terakhir Setiap Rider
              </h2>
              <p style="font-size:12px;color:#6B7280;margin:2px 0 0 0">
                Klik tombol <strong>"Fokus di Peta"</strong> untuk langsung melihat titik koordinat dan rute perjalanan rider yang bersangkutan.
              </p>
            </div>

            <!-- Table Search & Filter Toolbar -->
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <input type="text" id="reportSearchInput" placeholder="Cari nomor BIB atau nama rider..."
                     style="padding:6px 12px;border:1px solid #D1D5DB;border-radius:6px;font-size:12.5px;min-width:220px;outline:none">

              <div style="display:flex;gap:4px;flex-wrap:wrap">
                <button type="button" class="tbl-filter-pill active" data-filter="all">Semua</button>
                <button type="button" class="tbl-filter-pill" data-filter="idle">🟠 Idle</button>
                <button type="button" class="tbl-filter-pill" data-filter="offline">⚪ Hilang Kontak</button>
                <button type="button" class="tbl-filter-pill" data-filter="sos">🚨 SOS</button>
                <button type="button" class="tbl-filter-pill" data-filter="moving">🟢 Gowes</button>
              </div>
            </div>
          </div>

          <!-- Responsive Data Table -->
          <div class="table-responsive-wrapper">
            <table class="rider-table" id="reportRiderTable">
              <thead>
                <tr>
                  <th style="width:70px">BIB</th>
                  <th>Nama Rider</th>
                  <th>Status Terkini</th>
                  <th>Posisi Rute</th>
                  <th>Kecepatan</th>
                  <th>Baterai</th>
                  <th>Kontak Terakhir</th>
                  <th>Koordinat Terakhir</th>
                  <th style="text-align:right">Aksi Evakuasi &amp; Pantau</th>
                </tr>
              </thead>
              <tbody id="reportTableBody">
                <tr>
                  <td colspan="9" style="text-align:center;padding:32px;color:#6B7280">
                    Memuat data pergerakan rider...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  `;

  // ── State Variables ──
  let allEvents = [];
  let currentEvent = null;
  let eventRiders = [];
  let eventHistory = [];
  let eventAlerts = [];
  let riderTelemetryMap = {}; // riderId -> { rider, lastPoint, history: [], statusObj, statusKey }

  let map = null;
  let gpxLayer = null;
  let routeCoords = [];
  let markersLayer = L.layerGroup();
  let breadcrumbLayer = L.layerGroup();
  let riderMarkers = {}; // riderId -> L.marker

  let activeTableFilter = 'all';
  let activeMapFilter = 'all';
  let activeSearchQuery = '';

  // ── Helper: Format Time Ago ──
  function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Belum ada data';
    const elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
    if (elapsedSec < 60) return `${elapsedSec}d lalu`;
    const min = Math.floor(elapsedSec / 60);
    if (min < 60) return `${min}m lalu`;
    const hr = Math.floor(min / 60);
    return `${hr}j lalu`;
  }

  function formatClockTime(timestamp) {
    if (!timestamp) return '-';
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return timestamp;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // ── 3. Init Leaflet Map ──
  function initReportMap() {
    if (map) return;
    map = L.map('reportMap', { zoomControl: false }).setView([-7.0, 110.0], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    markersLayer.addTo(map);
    breadcrumbLayer.addTo(map);
  }

  // ── 4. Load Events Dropdown ──
  async function loadEventsList() {
    try {
      const res = await fetch('/api/events');
      if (!res.ok) throw new Error('Gagal mengambil daftar event');
      allEvents = await res.json();

      const selectEl = document.getElementById('reportEventSelect');
      if (!allEvents.length) {
        selectEl.innerHTML = '<option value="">Tidak ada event tersedia</option>';
        return;
      }

      selectEl.innerHTML = allEvents.map(ev => `
        <option value="${ev.id}">
          ${ev.name} (${ev.date}) ${ev.active ? '🟢 AKTIF' : '⚪ SELESAI'}
        </option>
      `).join('');

      // Auto-select event: from query param OR active event OR first event
      let targetEventId = params.query?.event_id ? Number(params.query.event_id) : null;
      if (!targetEventId) {
        const activeEv = allEvents.find(e => e.active);
        targetEventId = activeEv ? activeEv.id : allEvents[0].id;
      }

      selectEl.value = targetEventId;
      await selectEvent(targetEventId);

      selectEl.addEventListener('change', async (e) => {
        const chosenId = Number(e.target.value);
        if (chosenId) {
          await selectEvent(chosenId);
        }
      });
    } catch (err) {
      console.error('[AdminReports] Error loading events:', err);
      showToast('Gagal memuat daftar event: ' + err.message, 'error');
    }
  }

  // ── 5. Select & Fetch Event Data ──
  async function selectEvent(eventId) {
    initReportMap();
    breadcrumbLayer.clearLayers();
    document.getElementById('btnClearTrail').style.display = 'none';
    document.getElementById('mapTrailBadge').style.display = 'none';

    try {
      // Parallel fetch event details, riders, history, and alerts
      const [evRes, ridersRes, histRes, alertsRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/riders`),
        fetch(`/api/events/${eventId}/history`),
        fetch(`/api/events/${eventId}/alerts`)
      ]);

      if (!evRes.ok) throw new Error('Event tidak ditemukan');
      currentEvent = await evRes.json();
      eventRiders = ridersRes.ok ? await ridersRes.json() : [];
      eventHistory = histRes.ok ? await histRes.json() : [];
      eventAlerts = alertsRes.ok ? await alertsRes.json() : [];

      // Update Live Map link in header
      const liveLink = document.getElementById('btnLiveMapLink');
      if (liveLink) liveLink.href = `/watch/${currentEvent.id}`;

      // Update Event Name sub-label
      document.getElementById('statEventName').textContent = currentEvent.name;
      document.getElementById('mapSubtitle').textContent = `Event: ${currentEvent.name} • ${eventRiders.length} Rider • ${eventHistory.length} Titik Rekaman Jejak`;

      // Load GPX route if present
      await loadGpxRoute(currentEvent.gpx_path);

      // Process telemetry data per rider
      processRiderTelemetry();

      // Render Map Markers & Table
      renderMapMarkers();
      renderRidersTable();
      updateKpis();

    } catch (err) {
      console.error('[AdminReports] Error fetching event data:', err);
      showToast('Gagal memuat data laporan event: ' + err.message, 'error');
    }
  }

  // ── 6. Load GPX Route on Map ──
  async function loadGpxRoute(gpxPath) {
    if (gpxLayer) {
      map.removeLayer(gpxLayer);
      gpxLayer = null;
    }
    routeCoords = [];

    if (!gpxPath) return;

    try {
      const gpxText = await fetch(gpxPath).then(r => r.text());
      const gpxData = parseGpxData(gpxText);
      routeCoords = gpxData.coords || [];

      if (routeCoords.length) {
        gpxLayer = L.polyline(routeCoords, {
          color: '#2B4E30',
          weight: 4,
          opacity: 0.85
        }).addTo(map);

        map.fitBounds(gpxLayer.getBounds(), { padding: [30, 30] });
      }
    } catch (err) {
      console.warn('[AdminReports] GPX route load warning:', err);
    }
  }

  // ── 7. Group & Process History Points ──
  function processRiderTelemetry() {
    riderTelemetryMap = {};

    // Map active alerts by rider_id
    const activeAlertsByRider = {};
    eventAlerts.filter(a => !a.resolved).forEach(a => {
      activeAlertsByRider[a.rider_id] = a;
    });

    // Group history points by rider_id
    const historyByRider = {};
    eventHistory.forEach(pt => {
      if (!historyByRider[pt.rider_id]) historyByRider[pt.rider_id] = [];
      historyByRider[pt.rider_id].push(pt);
    });

    // Build comprehensive telemetry object for each registered rider
    eventRiders.forEach(rider => {
      const pts = historyByRider[rider.id] || [];
      // Sort ascending by recorded_at
      pts.sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));

      const lastPoint = pts.length ? pts[pts.length - 1] : null;
      const sosAlert = activeAlertsByRider[rider.id] || null;

      let statusKey = 'nodata';
      let statusText = 'Belum Ada Data';
      let statusBadge = '⚪';
      let statusClass = 'status-nodata';

      if (sosAlert) {
        statusKey = 'sos';
        statusText = `🚨 SOS: ${sosAlert.type || 'Darurat'}`;
        statusBadge = '🚨';
        statusClass = 'status-sos';
      } else if (lastPoint) {
        const elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(lastPoint.recorded_at).getTime()) / 1000));
        const speed = Number(lastPoint.speed || 0);

        if (elapsedSec <= 90) {
          if (speed > 2) {
            statusKey = 'moving';
            statusText = `Gowes (${speed.toFixed(1)} km/h)`;
            statusBadge = '🟢';
            statusClass = 'status-moving';
          } else {
            statusKey = 'idle';
            statusText = 'Berhenti / Diam';
            statusBadge = '🟠';
            statusClass = 'status-idle';
          }
        } else if (elapsedSec <= 300) {
          statusKey = 'idle';
          statusText = `Idle (${Math.round(elapsedSec / 60)}m lalu)`;
          statusBadge = '🟠';
          statusClass = 'status-idle';
        } else {
          statusKey = 'offline';
          statusText = `Hilang Kontak (${formatTimeAgo(lastPoint.recorded_at)})`;
          statusBadge = '⚪';
          statusClass = 'status-offline';
        }
      }

      riderTelemetryMap[rider.id] = {
        rider,
        lastPoint,
        history: pts,
        sosAlert,
        statusKey,
        statusText,
        statusBadge,
        statusClass
      };
    });
  }

  // ── 8. Render Markers on Leaflet Map ──
  function renderMapMarkers() {
    markersLayer.clearLayers();
    riderMarkers = {};

    const bounds = [];

    Object.values(riderTelemetryMap).forEach(item => {
      const { rider, lastPoint, statusKey, statusText, sosAlert } = item;
      if (!lastPoint) return;

      const lat = Number(lastPoint.latitude);
      const lng = Number(lastPoint.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      // Filter check based on active map filter
      if (activeMapFilter === 'attention') {
        if (statusKey !== 'idle' && statusKey !== 'offline' && statusKey !== 'sos') {
          return; // Skip normal moving riders
        }
      }

      bounds.push([lat, lng]);

      const baseColor = sosAlert ? '#EF4444' : (rider.color || '#3B82F6');
      const isOffline = statusKey === 'offline' || statusKey === 'nodata';
      const isIdle = statusKey === 'idle';
      const markerOpacity = isOffline ? '0.45' : (isIdle ? '0.75' : '1.0');

      let statusPill = '';
      if (sosAlert) {
        statusPill = `<div style="position:absolute;top:-36px;left:50%;transform:translateX(-50%);background:#EF4444;color:#FFF;font-size:9px;font-weight:900;padding:2px 7px;border-radius:100px;white-space:nowrap;box-shadow:0 0 10px #EF4444">🚨 SOS</div>`;
      } else if (isOffline) {
        statusPill = `<div style="position:absolute;top:-36px;left:50%;transform:translateX(-50%);background:#475569;color:#F1F5F9;font-size:8px;font-weight:800;padding:1px 6px;border-radius:100px;white-space:nowrap;border:1px solid rgba(255,255,255,0.25)">⚪ HILANG KONTAK</div>`;
      } else if (isIdle) {
        statusPill = `<div style="position:absolute;top:-36px;left:50%;transform:translateX(-50%);background:#D97706;color:#FFF;font-size:8px;font-weight:800;padding:1px 6px;border-radius:100px;white-space:nowrap;box-shadow:0 2px 6px rgba(217,119,6,0.3)">⏸️ IDLE</div>`;
      }

      const icon = L.divIcon({
        html: `
          <div style="position:relative;width:24px;height:24px;opacity:${markerOpacity};filter:${isOffline ? 'grayscale(40%)' : 'none'};cursor:pointer">
            ${statusPill}
            <div style="
              width:16px;height:16px;border-radius:50%;
              background:${baseColor};
              border:2.5px solid #FFFFFF;
              box-shadow:0 2px 6px rgba(0,0,0,0.4);
              position:absolute;top:4px;left:4px;
            "></div>
            <div style="
              position:absolute;top:-18px;left:50%;transform:translateX(-50%);
              background:rgba(15,23,42,0.92);
              color:#FFFFFF;font-size:10px;font-weight:800;
              padding:1px 6px;border-radius:100px;white-space:nowrap;
              border:1px solid rgba(255,255,255,0.3);box-shadow:0 2px 6px rgba(0,0,0,0.3);
            ">#${escapeHtml(rider.bib)}</div>
          </div>
        `,
        className: 'rider-report-pin',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([lat, lng], { icon });

      // Build rich popup content with Google Maps navigation link & Trail trace
      const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      const popupHtml = `
        <div style="font-family:'Inter',system-ui,sans-serif;padding:6px 4px;min-width:240px">
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #E5E7EB;padding-bottom:8px;margin-bottom:8px">
            <div>
              <div style="font-weight:800;font-size:14px;color:#111827">#${escapeHtml(rider.bib)} ${escapeHtml(rider.name)}</div>
              <div style="font-size:11px;color:#6B7280;text-transform:capitalize">${escapeHtml(rider.role || 'Peserta')}</div>
            </div>
            <span style="font-size:11px;font-weight:800;padding:2px 8px;border-radius:100px;background:${isOffline ? '#F1F5F9' : (isIdle ? '#FEF3C7' : '#DCFCE7')};color:${isOffline ? '#475569' : (isIdle ? '#B45309' : '#15803D')}">
              ${statusText}
            </span>
          </div>

          <div style="font-size:12px;display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
            <div>📍 Jarak: <strong>${(lastPoint.distance_km || 0).toFixed(1)} km</strong></div>
            <div>⚡ Speed: <strong>${(lastPoint.speed || 0).toFixed(1)} km/h</strong></div>
            <div>⏱️ Waktu: <strong>${formatClockTime(lastPoint.recorded_at)}</strong></div>
            <div>🔋 Sisa: <strong>${lastPoint.battery != null ? lastPoint.battery + '%' : '-'}</strong></div>
          </div>

          <div style="font-size:11px;background:#F9FAFB;padding:6px 8px;border-radius:6px;color:#4B5563;margin-bottom:12px;font-family:monospace">
            Lat, Lng: ${lat.toFixed(5)}, ${lng.toFixed(5)}
          </div>

          <div style="display:flex;gap:6px;flex-direction:column">
            <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
               style="display:flex;align-items:center;justify-content:center;gap:6px;background:#2563EB;color:#FFF;padding:7px 10px;border-radius:6px;font-size:11.5px;font-weight:700;text-decoration:none;text-align:center">
              <span>🚗</span> Buka di Google Maps
            </a>
            <button onclick="window.drawRiderBreadcrumbs(${rider.id})"
                    style="display:flex;align-items:center;justify-content:center;gap:6px;background:#F3F4F6;border:1px solid #D1D5DB;color:#374151;padding:6px 10px;border-radius:6px;font-size:11.5px;font-weight:700;cursor:pointer">
              <span>📈</span> Tampilkan Jejak Lintasan
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      markersLayer.addLayer(marker);
      riderMarkers[rider.id] = marker;
    });

    if (bounds.length && !routeCoords.length) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }

  // ── 9. Draw Breadcrumb Trail for a Specific Rider ──
  window.drawRiderBreadcrumbs = function(riderId) {
    const item = riderTelemetryMap[riderId];
    if (!item || !item.history.length) {
      showToast('Tidak ada jejak rekam GPS untuk rider ini.', 'info');
      return;
    }

    breadcrumbLayer.clearLayers();

    const latlngs = item.history.map(pt => [Number(pt.latitude), Number(pt.longitude)]).filter(c => !isNaN(c[0]) && !isNaN(c[1]));
    if (!latlngs.length) return;

    // Draw glowing breadcrumb polyline
    const trail = L.polyline(latlngs, {
      color: item.rider.color || '#3B82F6',
      weight: 5,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(breadcrumbLayer);

    map.fitBounds(trail.getBounds(), { padding: [50, 50] });

    // Show indicator badge and clear button
    const clearBtn = document.getElementById('btnClearTrail');
    const badgeEl = document.getElementById('mapTrailBadge');
    if (clearBtn) clearBtn.style.display = 'inline-block';
    if (badgeEl) {
      badgeEl.style.display = 'block';
      badgeEl.innerHTML = `📍 Jejak Rekam GPS: <strong>#${escapeHtml(item.rider.bib)} ${escapeHtml(item.rider.name)}</strong> (${latlngs.length} titik)`;
    }

    showToast(`✓ Menampilkan jejak lintasan #${item.rider.bib} (${latlngs.length} titik)`, 'success');
  };

  // Clear Breadcrumb Trail
  document.getElementById('btnClearTrail')?.addEventListener('click', () => {
    breadcrumbLayer.clearLayers();
    document.getElementById('btnClearTrail').style.display = 'none';
    document.getElementById('mapTrailBadge').style.display = 'none';
    if (gpxLayer) map.fitBounds(gpxLayer.getBounds(), { padding: [30, 30] });
  });

  // ── 10. Focus Rider on Map From Table Button ──
  window.focusRiderOnMap = function(riderId) {
    const item = riderTelemetryMap[riderId];
    if (!item || !item.lastPoint) {
      showToast('Rider ini belum pernah mengirim titik koordinat.', 'warning');
      return;
    }

    const lat = Number(item.lastPoint.latitude);
    const lng = Number(item.lastPoint.longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    // Pan & zoom map smoothly to rider's position
    map.flyTo([lat, lng], 16, { animate: true, duration: 1 });

    // Open popup
    const marker = riderMarkers[riderId];
    if (marker) {
      marker.openPopup();
    }

    // Also draw breadcrumb trail
    window.drawRiderBreadcrumbs(riderId);

    // Scroll smoothly to map on mobile
    const mapCard = document.getElementById('reportMapContainer');
    if (mapCard) {
      mapCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // ── 11. Render Rider Table ──
  function renderRidersTable() {
    const tbody = document.getElementById('reportTableBody');
    if (!tbody) return;

    let items = Object.values(riderTelemetryMap);

    // 1. Search Query Filter
    if (activeSearchQuery) {
      const q = activeSearchQuery.toLowerCase();
      items = items.filter(it =>
        String(it.rider.bib).toLowerCase().includes(q) ||
        String(it.rider.name).toLowerCase().includes(q)
      );
    }

    // 2. Status Filter
    if (activeTableFilter !== 'all') {
      items = items.filter(it => it.statusKey === activeTableFilter);
    }

    if (!items.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center;padding:30px;color:#6B7280">
            Tidak ada rider yang cocok dengan filter "${activeTableFilter}".
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = items.map(item => {
      const { rider, lastPoint, statusKey, statusText, statusBadge, sosAlert } = item;
      const lat = lastPoint ? Number(lastPoint.latitude) : null;
      const lng = lastPoint ? Number(lastPoint.longitude) : null;
      const hasCoords = lat != null && lng != null && !isNaN(lat) && !isNaN(lng);

      const mapsUrl = hasCoords ? `https://www.google.com/maps?q=${lat},${lng}` : '#';

      // Badge style
      let pillBg = '#F3F4F6';
      let pillColor = '#4B5563';
      if (statusKey === 'sos') { pillBg = '#FEE2E2'; pillColor = '#B91C1C'; }
      else if (statusKey === 'moving') { pillBg = '#DCFCE7'; pillColor = '#15803D'; }
      else if (statusKey === 'idle') { pillBg = '#FEF3C7'; pillColor = '#B45309'; }
      else if (statusKey === 'offline') { pillBg = '#F1F5F9'; pillColor = '#475569'; }

      const dist = lastPoint ? (lastPoint.distance_km || 0).toFixed(1) + ' km' : '-';
      const speed = lastPoint ? (lastPoint.speed || 0).toFixed(1) + ' km/h' : '-';
      const batt = lastPoint && lastPoint.battery != null ? `${lastPoint.battery}%` : '-';
      const lastClock = lastPoint ? `${formatClockTime(lastPoint.recorded_at)} (${formatTimeAgo(lastPoint.recorded_at)})` : 'Belum ada data';
      const coordsText = hasCoords ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : '-';

      return `
        <tr style="${statusKey === 'sos' ? 'background:rgba(239,68,68,0.06)' : (statusKey === 'offline' ? 'background:rgba(100,116,139,0.03)' : '')}">
          <td>
            <span style="font-weight:900;font-size:12.5px;color:${rider.color || '#3B82F6'}">#${escapeHtml(rider.bib)}</span>
          </td>
          <td>
            <div style="font-weight:800;font-size:13px;color:#111827">${escapeHtml(rider.name)}</div>
            <div style="font-size:11px;color:#6B7280;text-transform:capitalize">${escapeHtml(rider.role || 'Peserta')}</div>
          </td>
          <td>
            <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:100px;font-size:11px;font-weight:800;background:${pillBg};color:${pillColor}">
              <span>${statusBadge}</span> <span>${statusText}</span>
            </span>
          </td>
          <td><strong>${dist}</strong></td>
          <td>${speed}</td>
          <td>${batt}</td>
          <td style="font-size:12px;color:#4B5563">${lastClock}</td>
          <td style="font-family:monospace;font-size:11px;color:#6B7280">${coordsText}</td>
          <td style="text-align:right">
            <div style="display:inline-flex;gap:6px;justify-content:flex-end">
              ${hasCoords ? `
                <button type="button" onclick="window.focusRiderOnMap(${rider.id})" class="btn btn-outline" style="font-size:11px;padding:5px 9px" title="Fokuskan di Peta">
                  🎯 Fokus di Peta
                </button>
                <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="font-size:11px;padding:5px 9px;text-decoration:none" title="Buka Navigasi Google Maps">
                  🚗 Google Maps
                </a>
              ` : `
                <span style="font-size:11px;color:#9CA3AF">Tanpa Sinyal</span>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ── 12. Update KPI Stats ──
  function updateKpis() {
    const list = Object.values(riderTelemetryMap);
    const moving = list.filter(i => i.statusKey === 'moving').length;
    const idle = list.filter(i => i.statusKey === 'idle').length;
    const offline = list.filter(i => i.statusKey === 'offline').length;
    const sos = list.filter(i => i.statusKey === 'sos').length;

    document.getElementById('statTotalRiders').textContent = list.length;
    document.getElementById('statMovingRiders').textContent = moving;
    document.getElementById('statIdleRiders').textContent = idle;
    document.getElementById('statOfflineRiders').textContent = offline;
    document.getElementById('statSosAlerts').textContent = sos;
  }

  // ── 13. Map View Filter Buttons ──
  document.querySelectorAll('.map-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.map-filter-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = '#4B5563';
      });
      btn.classList.add('active');
      btn.style.background = '#2563EB';
      btn.style.color = '#FFF';

      activeMapFilter = btn.dataset.mapFilter;
      renderMapMarkers();
    });
  });

  // Reset Zoom Button
  document.getElementById('btnResetMapZoom')?.addEventListener('click', () => {
    if (gpxLayer) {
      map.fitBounds(gpxLayer.getBounds(), { padding: [30, 30] });
    } else {
      map.setView([-7.0, 110.0], 12);
    }
  });

  // ── 14. Table Filters & Search ──
  document.querySelectorAll('.tbl-filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tbl-filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTableFilter = btn.dataset.filter;
      renderRidersTable();
    });
  });

  document.getElementById('reportSearchInput')?.addEventListener('input', (e) => {
    activeSearchQuery = e.target.value.trim();
    renderRidersTable();
  });

  // Refresh Button
  document.getElementById('btnRefreshReport')?.addEventListener('click', () => {
    if (currentEvent) {
      selectEvent(currentEvent.id);
      showToast('Data riwayat event diperbarui.', 'success');
    }
  });

  // ── 15. Export CSV Feature ──
  document.getElementById('btnExportCsv')?.addEventListener('click', () => {
    if (!currentEvent || !Object.keys(riderTelemetryMap).length) {
      showToast('Tidak ada data yang dapat diekspor.', 'warning');
      return;
    }

    const headers = [
      'BIB',
      'Nama Rider',
      'Role',
      'Status Terkini',
      'Jarak Tempuh (KM)',
      'Kecepatan Terakhir (KM/H)',
      'Sisa Baterai (%)',
      'Waktu Kontak Terakhir',
      'Latitude Terakhir',
      'Longitude Terakhir',
      'Tautan Google Maps'
    ];

    const rows = Object.values(riderTelemetryMap).map(item => {
      const { rider, lastPoint, statusText } = item;
      const lat = lastPoint ? Number(lastPoint.latitude) : '';
      const lng = lastPoint ? Number(lastPoint.longitude) : '';
      const mapsUrl = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : '';

      return [
        `"${rider.bib}"`,
        `"${(rider.name || '').replace(/"/g, '""')}"`,
        `"${rider.role || 'Peserta'}"`,
        `"${statusText}"`,
        lastPoint ? (lastPoint.distance_km || 0).toFixed(2) : '0',
        lastPoint ? (lastPoint.speed || 0).toFixed(1) : '0',
        lastPoint && lastPoint.battery != null ? lastPoint.battery : '',
        lastPoint ? `"${lastPoint.recorded_at}"` : '""',
        lat || '',
        lng || '',
        `"${mapsUrl}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const cleanName = currentEvent.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    link.setAttribute('download', `laporan-telemetri-${cleanName}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('✓ Laporan CSV berhasil diunduh.', 'success');
  });

  // 16. Start initial load
  await loadEventsList();
}

