const fs = require('fs');
const path = require('path');
const FastCanvas = require('./fast-canvas');
const db = require('../db/database');

const gpxDir = path.join(__dirname, '..', 'public', 'gpx');

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getEventDistanceKm(event) {
  if (!event || !event.id) return 0;
  const gpxFilePath = path.join(gpxDir, `${event.id}.gpx`);
  if (!fs.existsSync(gpxFilePath)) return 0;

  try {
    const gpxText = fs.readFileSync(gpxFilePath, 'utf8');
    const ptRegex = /<(?:trkpt|rtept)[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"/gi;
    let match;
    let prevLat = null;
    let prevLon = null;
    let total = 0;
    while ((match = ptRegex.exec(gpxText)) !== null) {
      const lat = parseFloat(match[1]);
      const lon = parseFloat(match[2]);
      if (prevLat !== null && prevLon !== null) {
        total += haversineDistance(prevLat, prevLon, lat, lon);
      }
      prevLat = lat;
      prevLon = lon;
    }
    return Math.round(total * 10) / 10;
  } catch (e) {
    return 0;
  }
}

function escapeXml(unsafe) {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Fetch all necessary aggregate data for an event and optional rider BIB
 */
function getOgData(eventId, bib = null) {
  const numId = Number(eventId);
  const event = db.getEventById.get(numId);
  if (!event) return null;

  const distanceKm = getEventDistanceKm(event);
  const riders = db.getRidersByEvent.all(numId) || [];
  const totalRiders = riders.length;

  let totalCheckpoints = 0;
  try {
    const cpRow = db.db.prepare('SELECT COUNT(*) as count FROM checkpoints WHERE event_id = ?').get(numId);
    totalCheckpoints = cpRow ? cpRow.count : 0;
  } catch (e) {}

  let rider = null;
  let latestPos = null;

  if (bib) {
    const cleanBib = String(bib).trim();
    rider = riders.find(r => String(r.bib).trim().toLowerCase() === cleanBib.toLowerCase());
    if (rider) {
      try {
        latestPos = db.db.prepare(`
          SELECT * FROM position_history 
          WHERE event_id = ? AND rider_id = ? 
          ORDER BY id DESC LIMIT 1
        `).get(numId, rider.id);
      } catch (e) {}
    }
  }

  return {
    event,
    distanceKm,
    totalRiders,
    totalCheckpoints,
    rider,
    latestPos
  };
}

/**
 * Generate Ultra-Crisp SVG Vector Infograph (1200 x 630)
 * Styled after CycloPon Beranda (Earthy Gravel & Pro Editorial Racing Dossier Theme)
 */
function generateOgSvg(data) {
  const { event, distanceKm, totalRiders, totalCheckpoints, rider, latestPos } = data;
  const isRider = !!rider;

  const roleText = rider && rider.role ? rider.role.toUpperCase() : 'PESERTA';
  const speed = latestPos && latestPos.speed != null ? Number(latestPos.speed).toFixed(1) : '0.0';
  const traveledKm = latestPos && latestPos.distance_km != null ? Number(latestPos.distance_km).toFixed(1) : '0.0';
  const progressPct = distanceKm > 0 ? Math.min(100, Math.round((Number(traveledKm) / distanceKm) * 100)) : 0;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Beranda Dot Matrix Pattern -->
    <pattern id="beranda-dots" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.2" fill="#0D1117" opacity="0.06"/>
    </pattern>

    <!-- Dossier Card Drop Shadow -->
    <filter id="dossier-shadow" x="-5%" y="-5%" width="110%" height="118%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#0D1117" flood-opacity="0.10"/>
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0D1117" flood-opacity="0.04"/>
    </filter>
  </defs>

  <style>
    .font-sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  </style>

  <!-- 1. Background Surface (Beranda Light Cream Canvas) -->
  <rect width="1200" height="630" fill="#F8F9FA"/>
  <rect width="1200" height="630" fill="url(#beranda-dots)"/>

  <!-- 2. Top Nav Brand Bar (Identical with Beranda Navbar) -->
  <g transform="translate(56, 28)">
    <!-- Logo Emblem Icon -->
    <rect width="36" height="36" rx="8" fill="#0D1117"/>
    <circle cx="18" cy="18" r="10" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-dasharray="3 3"/>
    <circle cx="18" cy="18" r="3.5" fill="#10B981"/>

    <!-- Brand Name Group -->
    <text class="font-sans" x="48" y="24" fill="#0D1117" font-size="22" font-weight="900" letter-spacing="-0.04em">CYCLOPON</text>
    <text class="font-mono" x="178" y="23" fill="#6B7280" font-size="11" font-weight="700" letter-spacing="0.05em">// LIVE TELEMETRY MATRIX</text>

    <!-- Nav Right Status Pill -->
    <g transform="translate(860, 2)">
      <rect width="228" height="32" rx="16" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.2"/>
      <circle cx="16" cy="16" r="4.5" fill="#10B981"/>
      <text class="font-mono" x="28" y="20" fill="#374151" font-size="11" font-weight="800" letter-spacing="0.06em">RADAR LIVE // AKTIF</text>
    </g>
  </g>

  <!-- 3. Central Pro Racing Dossier Card (Hero Dossier Card) -->
  <g filter="url(#dossier-shadow)">
    <!-- Main Card Body -->
    <rect x="56" y="80" width="1088" height="490" rx="14" fill="#FFFFFF" stroke="#0D1117" stroke-width="2"/>

    <!-- Dossier Card Topbar (Obsidian Header) -->
    <path d="M 56 94 A 14 14 0 0 1 70 80 L 1130 80 A 14 14 0 0 1 1144 94 L 1144 126 L 56 126 Z" fill="#0D1117"/>
    
    <circle cx="78" cy="103" r="4.5" fill="#10B981"/>
    <text class="font-mono" x="90" y="107" fill="#10B981" font-size="11" font-weight="800" letter-spacing="0.08em">LIVE RADAR // HIGH-FREQUENCY INGEST</text>
    <text class="font-mono" x="1122" y="107" text-anchor="end" fill="#9CA3AF" font-size="11" font-weight="800" letter-spacing="0.08em">OFFICIAL DOSSIER</text>

    <!-- Dossier Card Content -->
    ${isRider ? `
    <!-- RIDER SPECIFIC CONTENT -->
    <!-- Tech Badge (Earthy Green Chip) -->
    <g transform="translate(80, 146)">
      <rect width="180" height="24" rx="4" fill="#EEF4EE" stroke="#C8DEC9" stroke-width="1"/>
      <text class="font-mono" x="10" y="16" fill="#1C3E24" font-size="10.5" font-weight="800" letter-spacing="0.05em"># LIVE ATHLETE PROFILE</text>
    </g>

    <!-- BIB Plate Box (Solid Obsidian Block) -->
    <rect x="80" y="182" width="120" height="120" rx="10" fill="#0D1117"/>
    <text class="font-sans" x="140" y="210" text-anchor="middle" fill="#9CA3AF" font-size="12" font-weight="800" letter-spacing="0.1em">BIB</text>
    <text class="font-mono" x="140" y="264" text-anchor="middle" fill="#FFFFFF" font-size="44" font-weight="900">#${escapeXml(rider.bib)}</text>
    <text class="font-sans" x="140" y="288" text-anchor="middle" fill="#10B981" font-size="11" font-weight="800" letter-spacing="0.08em">${escapeXml(roleText)}</text>

    <!-- Rider Name and Stage Info -->
    <text class="font-sans" x="224" y="222" fill="#0D1117" font-size="38" font-weight="900" letter-spacing="-0.03em">${escapeXml(rider.name)}</text>
    <text class="font-mono" x="224" y="254" fill="#4B5563" font-size="13" font-weight="700">
      EVENT: <tspan fill="#0D1117" font-weight="900">${escapeXml(event.name)}</tspan>  •  TOTAL RUTE: <tspan fill="#0D1117" font-weight="900">${distanceKm} KM</tspan>
    </text>
    <text class="font-sans" x="224" y="284" fill="#6B7280" font-size="13" font-weight="500">
      Status: Sinyal GPS Terhubung • Traccar Client Aktif • Tasikmalaya, ID
    </text>

    <!-- 3 Telemetry KPI Metric Cards -->
    <g transform="translate(80, 320)">
      <!-- Metric 1: Speed -->
      <rect x="0" y="0" width="318" height="160" rx="8" fill="#FAFAFA" stroke="#E5E7EB" stroke-width="1.2"/>
      <text class="font-mono" x="20" y="32" fill="#6B7280" font-size="11.5" font-weight="800" letter-spacing="0.06em">⚡ KECEPATAN LIVE</text>
      <text class="font-sans" x="20" y="96" fill="#0D1117" font-size="52" font-weight="900">${speed}</text>
      <text class="font-sans" x="165" y="92" fill="#4B5563" font-size="18" font-weight="800">KM/H</text>
      <text class="font-sans" x="20" y="132" fill="#6B7280" font-size="13" font-weight="500">Real-time GPS Speedometer</text>

      <!-- Metric 2: Distance -->
      <rect x="340" y="0" width="318" height="160" rx="8" fill="#FAFAFA" stroke="#E5E7EB" stroke-width="1.2"/>
      <text class="font-mono" x="360" y="32" fill="#6B7280" font-size="11.5" font-weight="800" letter-spacing="0.06em">📏 ODOMETER TEMPUH</text>
      <text class="font-sans" x="360" y="96" fill="#0D1117" font-size="52" font-weight="900">${traveledKm}</text>
      <text class="font-sans" x="495" y="92" fill="#4B5563" font-size="18" font-weight="800">KM</text>
      <text class="font-sans" x="360" y="132" fill="#6B7280" font-size="13" font-weight="500">Dari total rute ${distanceKm} km</text>

      <!-- Metric 3: Progress -->
      <rect x="680" y="0" width="360" height="160" rx="8" fill="#FAFAFA" stroke="#E5E7EB" stroke-width="1.2"/>
      <text class="font-mono" x="700" y="32" fill="#6B7280" font-size="11.5" font-weight="800" letter-spacing="0.06em">🏁 PROGRES RUTE</text>
      <text class="font-sans" x="700" y="96" fill="#0D1117" font-size="52" font-weight="900">${progressPct}%</text>
      <!-- Progress Bar -->
      <rect x="700" y="112" width="320" height="10" rx="5" fill="#E5E7EB"/>
      <rect x="700" y="112" width="${Math.round(320 * (progressPct / 100))}" height="10" rx="5" fill="#10B981"/>
      <text class="font-sans" x="700" y="142" fill="#6B7280" font-size="12" font-weight="600">Pelacakan Rute Live Map</text>
    </g>
    ` : `
    <!-- GENERAL EVENT CONTENT -->
    <!-- Tech Badge (Earthy Green Chip) -->
    <g transform="translate(80, 148)">
      <rect width="180" height="24" rx="4" fill="#EEF4EE" stroke="#C8DEC9" stroke-width="1"/>
      <text class="font-mono" x="10" y="16" fill="#1C3E24" font-size="10.5" font-weight="800" letter-spacing="0.05em"># OFFICIAL RACE DOSSIER</text>
    </g>

    <!-- Event Title -->
    <text class="font-sans" x="80" y="218" fill="#0D1117" font-size="46" font-weight="900" letter-spacing="-0.035em">${escapeXml(event.name)}</text>
    <text class="font-mono" x="80" y="254" fill="#4B5563" font-size="13" font-weight="700">
      TANGGAL: <tspan fill="#0D1117" font-weight="900">${escapeXml(event.date)}</tspan>  •  TOTAL RUTE: <tspan fill="#0D1117" font-weight="900">${distanceKm} KM</tspan>  •  LOKASI: <tspan fill="#0D1117" font-weight="900">TASIKMALAYA, ID</tspan>
    </text>
    <text class="font-sans" x="80" y="284" fill="#6B7280" font-size="13" font-weight="500">
      Live GPS Radar Telemetry Matrix • Terintegrasi Traccar Engine &amp; WebSockets
    </text>

    <!-- 4 Event KPI Metric Cards -->
    <g transform="translate(80, 318)">
      <!-- Metric 1: Total Route -->
      <rect x="0" y="0" width="240" height="164" rx="8" fill="#FAFAFA" stroke="#E5E7EB" stroke-width="1.2"/>
      <text class="font-mono" x="18" y="32" fill="#6B7280" font-size="11" font-weight="800" letter-spacing="0.06em">🏁 TOTAL RUTE</text>
      <text class="font-sans" x="18" y="96" fill="#0D1117" font-size="46" font-weight="900">${distanceKm}</text>
      <text class="font-sans" x="135" y="92" fill="#4B5563" font-size="16" font-weight="800">KM</text>
      <text class="font-sans" x="18" y="134" fill="#6B7280" font-size="12" font-weight="500">GPX Course Terverifikasi</text>

      <!-- Metric 2: Participants -->
      <rect x="256" y="0" width="240" height="164" rx="8" fill="#FAFAFA" stroke="#E5E7EB" stroke-width="1.2"/>
      <text class="font-mono" x="274" y="32" fill="#6B7280" font-size="11" font-weight="800" letter-spacing="0.06em">👥 PESERTA</text>
      <text class="font-sans" x="274" y="96" fill="#0D1117" font-size="46" font-weight="900">${totalRiders}</text>
      <text class="font-sans" x="350" y="92" fill="#4B5563" font-size="16" font-weight="800">RIDER</text>
      <text class="font-sans" x="274" y="134" fill="#6B7280" font-size="12" font-weight="500">Terdaftar di Startlist</text>

      <!-- Metric 3: Checkpoints -->
      <rect x="512" y="0" width="240" height="164" rx="8" fill="#FAFAFA" stroke="#E5E7EB" stroke-width="1.2"/>
      <text class="font-mono" x="530" y="32" fill="#6B7280" font-size="11" font-weight="800" letter-spacing="0.06em">🚩 CHECKPOINTS</text>
      <text class="font-sans" x="530" y="96" fill="#0D1117" font-size="46" font-weight="900">${totalCheckpoints}</text>
      <text class="font-sans" x="585" y="92" fill="#4B5563" font-size="16" font-weight="800">POS</text>
      <text class="font-sans" x="530" y="134" fill="#6B7280" font-size="12" font-weight="500">Audit Split &amp; COT</text>

      <!-- Metric 4: Live Ingest -->
      <rect x="768" y="0" width="272" height="164" rx="8" fill="#FAFAFA" stroke="#E5E7EB" stroke-width="1.2"/>
      <text class="font-mono" x="786" y="32" fill="#6B7280" font-size="11" font-weight="800" letter-spacing="0.06em">🛰️ UPDATE INGEST</text>
      <text class="font-sans" x="786" y="96" fill="#0D1117" font-size="46" font-weight="900">1.0s</text>
      <text class="font-sans" x="890" y="92" fill="#10B981" font-size="16" font-weight="800">LIVE</text>
      <text class="font-sans" x="786" y="134" fill="#6B7280" font-size="12" font-weight="500">WebSocket Singleton Fan-Out</text>
    </g>
    `}

    <!-- Dossier Card Footer Bar -->
    <line x1="56" y1="520" x2="1144" y2="520" stroke="#E5E7EB" stroke-width="1"/>
    <text class="font-sans" x="80" y="546" fill="#4B5563" font-size="13" font-weight="600">
      🔗 Buka radar live di: <tspan fill="#2563EB" font-weight="800">cyclopon.my.id/watch/${event.id}${isRider ? '?bib=' + escapeXml(rider.bib) : ''}</tspan>
    </text>
    <text class="font-mono" x="1120" y="546" text-anchor="end" fill="#9CA3AF" font-size="11" font-weight="700">
      CYCLOPON // PRO TELEMETRY DOSSIER
    </text>
  </g>

  <!-- 4. Outer Bottom Copyright Strip -->
  <text class="font-sans" x="56" y="598" fill="#9CA3AF" font-size="11.5" font-weight="500">
    CycloPon Live Tracker — Sistem Monitoring Balap Sepeda Ultra-Distance &amp; Road Race
  </text>
  <text class="font-mono" x="1144" y="598" text-anchor="end" fill="#9CA3AF" font-size="11" font-weight="600">
    © 2026 CYCLOPON.MY.ID
  </text>
</svg>`;
}

/**
 * Generate High-Speed Raster PNG Infograph (1200 x 630) using FastCanvas
 * Styled after Beranda Light Editorial Aesthetic (#F8F9FA, #0D1117, #FFFFFF, #10B981)
 */
function generateOgPng(data) {
  const { event, distanceKm, totalRiders, totalCheckpoints, rider, latestPos } = data;
  const isRider = !!rider;

  const canvas = new FastCanvas(1200, 630);

  // 1. Light Canvas Background (#F8F9FA)
  canvas.fillRect(0, 0, 1200, 630, 248, 249, 250);

  // 2. Subtle Dot Grid (28px spacing)
  for (let x = 28; x < 1200; x += 28) {
    for (let y = 28; y < 630; y += 28) {
      canvas.setPixel(x, y, 209, 213, 219); // Muted gray dot
    }
  }

  // 3. Top Nav Brand Bar
  // Logo Emblem (Solid Obsidian square with white dot)
  canvas.fillRect(56, 26, 36, 36, 13, 17, 23);
  canvas.fillRect(72, 42, 6, 6, 16, 185, 129); // Emerald center

  canvas.drawText('CYCLOPON', 104, 28, 3, 13, 17, 23);
  canvas.drawText('// LIVE TELEMETRY MATRIX', 104, 56, 1, 107, 114, 128);

  // Nav Right Status Pill (White box with green dot)
  canvas.fillRect(920, 28, 224, 32, 255, 255, 255);
  canvas.drawRect(920, 28, 224, 32, 1, 229, 231, 235);
  canvas.fillRect(936, 41, 6, 6, 16, 185, 129); // Green dot
  canvas.drawText('RADAR LIVE // AKTIF', 952, 38, 1, 55, 65, 81);

  // 4. Central Pro Racing Dossier Card (#FFFFFF, 2px border #0D1117)
  canvas.fillRect(56, 78, 1088, 494, 255, 255, 255);
  canvas.drawRect(56, 78, 1088, 494, 2, 13, 17, 23);

  // Dossier Card Topbar (#0D1117)
  canvas.fillRect(56, 78, 1088, 44, 13, 17, 23);
  canvas.fillRect(78, 97, 6, 6, 16, 185, 129);
  canvas.drawText('LIVE RADAR // HIGH-FREQUENCY INGEST', 94, 94, 1, 16, 185, 129);
  canvas.drawText('OFFICIAL DOSSIER', 980, 94, 1, 156, 163, 175);

  // 5. Card Body
  if (isRider) {
    // Tech badge (#EEF4EE)
    canvas.fillRect(80, 142, 180, 22, 238, 244, 238);
    canvas.drawRect(80, 142, 180, 22, 1, 200, 222, 201);
    canvas.drawText('# LIVE ATHLETE PROFILE', 90, 147, 1, 28, 62, 36);

    // BIB Plate (Solid Obsidian #0D1117)
    canvas.fillRect(80, 178, 120, 120, 13, 17, 23);
    canvas.drawText('BIB', 128, 192, 1, 156, 163, 175);
    const bibStr = `#${rider.bib}`;
    canvas.drawText(bibStr, 96, 218, 4, 255, 255, 255);
    const roleStr = (rider.role || 'RIDER').toUpperCase();
    canvas.drawText(roleStr, 114, 276, 1, 16, 185, 129);

    // Rider Name & Event Context
    canvas.drawText(rider.name.toUpperCase(), 224, 182, 4, 13, 17, 23);
    const evText = `EVENT: ${event.name.toUpperCase()}  ROUTE: ${distanceKm} KM`;
    canvas.drawText(evText, 224, 230, 2, 75, 85, 99);
    canvas.drawText('STATUS: GPS CONNECTED // TRACCAR INGEST // TASIKMALAYA', 224, 268, 1, 107, 114, 128);

    // 3 Metrics Bottom Cards (#FAFAFA, border #E5E7EB)
    const speed = latestPos && latestPos.speed != null ? Number(latestPos.speed).toFixed(1) : '0.0';
    const traveledKm = latestPos && latestPos.distance_km != null ? Number(latestPos.distance_km).toFixed(1) : '0.0';
    const progressPct = distanceKm > 0 ? Math.min(100, Math.round((Number(traveledKm) / distanceKm) * 100)) : 0;

    // Card 1: Speed
    canvas.fillRect(80, 318, 318, 160, 250, 250, 250);
    canvas.drawRect(80, 318, 318, 160, 1, 229, 231, 235);
    canvas.drawText('SPEED LIVE', 100, 338, 2, 107, 114, 128);
    canvas.drawText(`${speed} KM/H`, 100, 388, 4, 13, 17, 23);
    canvas.drawText('Real-time GPS Speedometer', 100, 448, 1, 107, 114, 128);

    // Card 2: Distance
    canvas.fillRect(420, 318, 318, 160, 250, 250, 250);
    canvas.drawRect(420, 318, 318, 160, 1, 229, 231, 235);
    canvas.drawText('ODOMETER', 440, 338, 2, 107, 114, 128);
    canvas.drawText(`${traveledKm} KM`, 440, 388, 4, 13, 17, 23);
    canvas.drawText(`Dari total rute ${distanceKm} km`, 440, 448, 1, 107, 114, 128);

    // Card 3: Progress
    canvas.fillRect(760, 318, 360, 160, 250, 250, 250);
    canvas.drawRect(760, 318, 360, 160, 1, 229, 231, 235);
    canvas.drawText('PROGRESS', 780, 338, 2, 107, 114, 128);
    canvas.drawText(`${progressPct} %`, 780, 388, 4, 13, 17, 23);
    // Progress Bar
    canvas.fillRect(780, 442, 320, 10, 229, 231, 235);
    canvas.fillRect(780, 442, Math.round(320 * (progressPct / 100)), 10, 16, 185, 129);
  } else {
    // Event Hero Content
    // Tech badge (#EEF4EE)
    canvas.fillRect(80, 142, 180, 22, 238, 244, 238);
    canvas.drawRect(80, 142, 180, 22, 1, 200, 222, 201);
    canvas.drawText('# OFFICIAL RACE DOSSIER', 90, 147, 1, 28, 62, 36);

    canvas.drawText(event.name.toUpperCase(), 80, 182, 4, 13, 17, 23);
    const sub = `DATE: ${event.date}   DISTANCE: ${distanceKm} KM   RIDERS: ${totalRiders}`;
    canvas.drawText(sub, 80, 232, 2, 75, 85, 99);
    canvas.drawText('LIVE GPS RADAR TELEMETRY MATRIX // TASIKMALAYA, ID', 80, 270, 1, 107, 114, 128);

    // 4 Event Cards (#FAFAFA, border #E5E7EB)
    // 1. Total Route
    canvas.fillRect(80, 318, 240, 160, 250, 250, 250);
    canvas.drawRect(80, 318, 240, 160, 1, 229, 231, 235);
    canvas.drawText('TOTAL COURSE', 98, 338, 1, 107, 114, 128);
    canvas.drawText(`${distanceKm}`, 98, 384, 4, 13, 17, 23);
    canvas.drawText('KM (GPX Verified)', 98, 448, 1, 75, 85, 99);

    // 2. Riders
    canvas.fillRect(342, 318, 240, 160, 250, 250, 250);
    canvas.drawRect(342, 318, 240, 160, 1, 229, 231, 235);
    canvas.drawText('PARTICIPANTS', 360, 338, 1, 107, 114, 128);
    canvas.drawText(`${totalRiders}`, 360, 384, 4, 13, 17, 23);
    canvas.drawText('Riders Registered', 360, 448, 1, 75, 85, 99);

    // 3. Checkpoints
    canvas.fillRect(604, 318, 240, 160, 250, 250, 250);
    canvas.drawRect(604, 318, 240, 160, 1, 229, 231, 235);
    canvas.drawText('CHECKPOINTS', 622, 338, 1, 107, 114, 128);
    canvas.drawText(`${totalCheckpoints}`, 622, 384, 4, 13, 17, 23);
    canvas.drawText('Pos Kontrol COT', 622, 448, 1, 75, 85, 99);

    // 4. Ingest Rate
    canvas.fillRect(866, 318, 258, 160, 250, 250, 250);
    canvas.drawRect(866, 318, 258, 160, 1, 229, 231, 235);
    canvas.drawText('INGEST RATE', 884, 338, 1, 107, 114, 128);
    canvas.drawText('1.0s', 884, 384, 4, 13, 17, 23);
    canvas.drawText('Singleton Fan-Out', 884, 448, 1, 16, 185, 129);
  }

  // 6. Dossier Footer Line (#E5E7EB)
  canvas.fillRect(56, 520, 1088, 1, 229, 231, 235);
  const footerUrl = `cyclopon.my.id/watch/${event.id}${isRider ? '?bib=' + rider.bib : ''}`;
  canvas.drawText(`LIVE RADAR : ${footerUrl}`, 80, 540, 2, 37, 99, 235);
  canvas.drawText('CYCLOPON // PRO TELEMETRY DOSSIER', 830, 544, 1, 156, 163, 175);

  return canvas.toPng();
}

/**
 * Generate Open Graph Meta Tags string
 */
function getOgMetadata(data, host = 'cyclopon.my.id', protocol = 'https') {
  const { event, distanceKm, totalRiders, rider, latestPos } = data;
  const isRider = !!rider;
  const baseUrl = `${protocol}://${host}`;

  let title, description;
  if (isRider) {
    const speed = latestPos && latestPos.speed != null ? `${Number(latestPos.speed).toFixed(1)} km/h` : 'Standby';
    title = `🚴 #${rider.bib} ${rider.name} — Live Tracking | ${event.name}`;
    description = `Pantau posisi live GPS, kecepatan (${speed}), dan status gowes #${rider.bib} ${rider.name} di event ${event.name} (${distanceKm} km) secara real-time di CycloPon!`;
  } else {
    title = `🔴 LIVE: ${event.name} (${distanceKm} km) — CycloPon Live Tracker`;
    description = `Pantau radar GPS live, pergerakan ${totalRiders} rider, pos checkpoint COT, dan update leaderboard resmi ${event.name} secara real-time!`;
  }

  const query = isRider ? `?bib=${encodeURIComponent(rider.bib)}` : '';
  const pageUrl = `${baseUrl}/watch/${event.id}${query}`;
  const imageUrl = `${baseUrl}/api/og/events/${event.id}.png${query}`;
  const imageSvgUrl = `${baseUrl}/api/og/events/${event.id}.svg${query}`;

  const tags = [
    `<title>${escapeXml(title)}</title>`,
    `<meta name="description" content="${escapeXml(description)}">`,
    `<link rel="canonical" href="${pageUrl}">`,
    // Open Graph
    `<meta property="og:site_name" content="CycloPon // Live Telemetry Matrix">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${pageUrl}">`,
    `<meta property="og:title" content="${escapeXml(title)}">`,
    `<meta property="og:description" content="${escapeXml(description)}">`,
    `<meta property="og:image" content="${imageUrl}">`,
    `<meta property="og:image:secure_url" content="${imageUrl}">`,
    `<meta property="og:image:type" content="image/png">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${escapeXml(title)}">`,
    // Twitter Cards
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:url" content="${pageUrl}">`,
    `<meta name="twitter:title" content="${escapeXml(title)}">`,
    `<meta name="twitter:description" content="${escapeXml(description)}">`,
    `<meta name="twitter:image" content="${imageUrl}">`
  ].join('\n  ');

  return {
    title,
    description,
    pageUrl,
    imageUrl,
    imageSvgUrl,
    tags
  };
}

/**
 * Inject dynamic Open Graph tags into index.html
 */
function injectOgMeta(indexHtml, meta) {
  let html = indexHtml;

  // Replace existing <title>
  html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeXml(meta.title)}</title>`);

  // Replace existing <meta name="description">
  html = html.replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${escapeXml(meta.description)}">`);

  // Inject OG and Twitter tags right before </head>
  const insertIndex = html.indexOf('</head>');
  if (insertIndex !== -1) {
    const before = html.substring(0, insertIndex);
    const after = html.substring(insertIndex);
    html = `${before}  <!-- Dynamic Social Share & Infograph Open Graph Tags -->\n  ${meta.tags}\n${after}`;
  }

  return html;
}

/**
 * Fetch aggregate platform stats for home/root domain OG
 */
function getHomeOgData() {
  let activeEvents = 0;
  let totalRiders = 0;
  let totalCheckpoints = 0;
  let latestEvent = null;

  try {
    const evCount = db.db.prepare('SELECT COUNT(*) as count FROM events WHERE active = 1').get();
    activeEvents = evCount ? evCount.count : 0;
    const rCount = db.db.prepare('SELECT COUNT(*) as count FROM riders').get();
    totalRiders = rCount ? rCount.count : 0;
    const cpCount = db.db.prepare('SELECT COUNT(*) as count FROM checkpoints').get();
    totalCheckpoints = cpCount ? cpCount.count : 0;
    latestEvent = db.db.prepare('SELECT * FROM events WHERE active = 1 ORDER BY id DESC LIMIT 1').get();
  } catch (e) {}

  return {
    activeEvents,
    totalRiders,
    totalCheckpoints,
    latestEvent
  };
}

/**
 * Generate Home / Root Domain SVG Vector Infograph (1200 x 630)
 */
function generateHomeOgSvg(data) {
  const { activeEvents, totalRiders, latestEvent } = data;
  const eventName = latestEvent ? latestEvent.name : 'ROAD RACE & GRAVEL CYCLING';
  const eventDistance = latestEvent ? getEventDistanceKm(latestEvent) : 0;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="beranda-dots" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.2" fill="#0D1117" opacity="0.06"/>
    </pattern>
    <filter id="dossier-shadow" x="-5%" y="-5%" width="110%" height="118%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#0D1117" flood-opacity="0.10"/>
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0D1117" flood-opacity="0.04"/>
    </filter>
  </defs>

  <style>
    .font-sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  </style>

  <rect width="1200" height="630" fill="#F8F9FA"/>
  <rect width="1200" height="630" fill="url(#beranda-dots)"/>

  <!-- Top Nav Bar -->
  <g transform="translate(56, 28)">
    <rect width="36" height="36" rx="8" fill="#0D1117"/>
    <circle cx="18" cy="18" r="10" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-dasharray="3 3"/>
    <circle cx="18" cy="18" r="3.5" fill="#10B981"/>

    <text class="font-sans" x="48" y="24" fill="#0D1117" font-size="22" font-weight="900" letter-spacing="-0.04em">CYCLOPON</text>
    <text class="font-mono" x="178" y="23" fill="#6B7280" font-size="11" font-weight="700" letter-spacing="0.05em">// LIVE TELEMETRY MATRIX</text>

    <g transform="translate(860, 2)">
      <rect width="228" height="32" rx="16" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.2"/>
      <circle cx="16" cy="16" r="4.5" fill="#10B981"/>
      <text class="font-mono" x="28" y="20" fill="#374151" font-size="11" font-weight="800" letter-spacing="0.06em">RADAR LIVE // AKTIF</text>
    </g>
  </g>

  <!-- Central Dossier Card -->
  <g filter="url(#dossier-shadow)">
    <rect x="56" y="80" width="1088" height="490" rx="14" fill="#FFFFFF" stroke="#0D1117" stroke-width="2"/>

    <path d="M 56 94 A 14 14 0 0 1 70 80 L 1130 80 A 14 14 0 0 1 1144 94 L 1144 126 L 56 126 Z" fill="#0D1117"/>
    <circle cx="78" cy="103" r="4.5" fill="#10B981"/>
    <text class="font-mono" x="90" y="107" fill="#10B981" font-size="11" font-weight="800" letter-spacing="0.08em">LIVE RADAR // PRO CYCLING TELEMETRY ENGINE</text>
    <text class="font-mono" x="1122" y="107" text-anchor="end" fill="#9CA3AF" font-size="11" font-weight="800" letter-spacing="0.08em">OFFICIAL PLATFORM</text>

    <g transform="translate(80, 148)">
      <rect width="205" height="24" rx="4" fill="#EEF4EE" stroke="#C8DEC9" stroke-width="1"/>
      <text class="font-mono" x="10" y="16" fill="#1C3E24" font-size="10.5" font-weight="800" letter-spacing="0.05em"># PRO CYCLING RADAR</text>
    </g>

    <text class="font-sans" x="80" y="218" fill="#0D1117" font-size="46" font-weight="900" letter-spacing="-0.035em">CYCLOPON LIVE TRACKER</text>
    <text class="font-mono" x="80" y="254" fill="#4B5563" font-size="13" font-weight="700">
      PLATFORM PEMANTAU GPS REAL-TIME  •  ULTRA-DISTANCE &amp; ROAD RACE  •  TASIKMALAYA, ID
    </text>
    <text class="font-sans" x="80" y="284" fill="#6B7280" font-size="13" font-weight="500">
      ${latestEvent ? `Event Terkini: ${escapeXml(eventName)} (${eventDistance > 0 ? eventDistance + ' KM' : 'Terjadwal'}) • Didukung OsmAnd GPS &amp; Traccar Engine` : 'Monitoring Posisi Rider, Odometer, Split Checkpoint COT &amp; Live Leaderboard'}
    </text>

    <!-- 4 Platform Feature Cards -->
    <g transform="translate(80, 318)">
      <rect x="0" y="0" width="240" height="164" rx="8" fill="#FAFAFA" stroke="#E5E7EB" stroke-width="1.2"/>
      <text class="font-mono" x="18" y="32" fill="#6B7280" font-size="11" font-weight="800" letter-spacing="0.06em">🛰️ GPS ENGINE</text>
      <text class="font-sans" x="18" y="96" fill="#0D1117" font-size="44" font-weight="900">1.0s</text>
      <text class="font-sans" x="120" y="92" fill="#10B981" font-size="16" font-weight="800">INGEST</text>
      <text class="font-sans" x="18" y="134" fill="#6B7280" font-size="12" font-weight="500">Traccar High-Frequency Ingest</text>

      <rect x="256" y="0" width="240" height="164" rx="8" fill="#FAFAFA" stroke="#E5E7EB" stroke-width="1.2"/>
      <text class="font-mono" x="274" y="32" fill="#6B7280" font-size="11" font-weight="800" letter-spacing="0.06em">🚴 LIVE RADAR</text>
      <text class="font-sans" x="274" y="96" fill="#0D1117" font-size="38" font-weight="900">REALTIME</text>
      <text class="font-sans" x="274" y="134" fill="#6B7280" font-size="12" font-weight="500">WebSocket Singleton Fan-Out</text>

      <rect x="512" y="0" width="240" height="164" rx="8" fill="#FAFAFA" stroke="#E5E7EB" stroke-width="1.2"/>
      <text class="font-mono" x="530" y="32" fill="#6B7280" font-size="11" font-weight="800" letter-spacing="0.06em">🚩 RACE ENGINE</text>
      <text class="font-sans" x="530" y="96" fill="#0D1117" font-size="44" font-weight="900">COT</text>
      <text class="font-sans" x="625" y="92" fill="#F59E0B" font-size="16" font-weight="800">AUDIT</text>
      <text class="font-sans" x="530" y="134" fill="#6B7280" font-size="12" font-weight="500">Split &amp; Leaderboard Otomatis</text>

      <rect x="768" y="0" width="272" height="164" rx="8" fill="#FAFAFA" stroke="#E5E7EB" stroke-width="1.2"/>
      <text class="font-mono" x="786" y="32" fill="#6B7280" font-size="11" font-weight="800" letter-spacing="0.06em">📱 MOBILE APP</text>
      <text class="font-sans" x="786" y="96" fill="#0D1117" font-size="38" font-weight="900">OSMAND</text>
      <text class="font-sans" x="786" y="134" fill="#6B7280" font-size="12" font-weight="500">Kompatibel Android &amp; iOS</text>
    </g>

    <line x1="56" y1="520" x2="1144" y2="520" stroke="#E5E7EB" stroke-width="1"/>
    <text class="font-sans" x="80" y="546" fill="#4B5563" font-size="13" font-weight="600">
      🔗 Kunjungi situs resmi: <tspan fill="#2563EB" font-weight="800">cyclopon.my.id</tspan>
    </text>
    <text class="font-mono" x="1120" y="546" text-anchor="end" fill="#9CA3AF" font-size="11" font-weight="700">
      CYCLOPON // PRO TELEMETRY DOSSIER
    </text>
  </g>

  <text class="font-sans" x="56" y="598" fill="#9CA3AF" font-size="11.5" font-weight="500">
    CycloPon Live Tracker — Sistem Monitoring Balap Sepeda Ultra-Distance &amp; Road Race
  </text>
  <text class="font-mono" x="1144" y="598" text-anchor="end" fill="#9CA3AF" font-size="11" font-weight="600">
    © 2026 CYCLOPON.MY.ID
  </text>
</svg>`;
}

/**
 * Generate Home / Root Domain PNG Infograph (1200 x 630) using FastCanvas
 */
function generateHomeOgPng(data) {
  const { latestEvent } = data;
  const eventName = latestEvent ? latestEvent.name : 'PRO RACING DOSSIER';

  const canvas = new FastCanvas(1200, 630);

  // 1. Light Canvas Background (#F8F9FA)
  canvas.fillRect(0, 0, 1200, 630, 248, 249, 250);

  // 2. Subtle Dot Grid (28px spacing)
  for (let x = 28; x < 1200; x += 28) {
    for (let y = 28; y < 630; y += 28) {
      canvas.setPixel(x, y, 209, 213, 219);
    }
  }

  // 3. Top Nav Brand Bar
  canvas.fillRect(56, 26, 36, 36, 13, 17, 23);
  canvas.fillRect(72, 42, 6, 6, 16, 185, 129);

  canvas.drawText('CYCLOPON', 104, 28, 3, 13, 17, 23);
  canvas.drawText('// LIVE TELEMETRY MATRIX', 104, 56, 1, 107, 114, 128);

  canvas.fillRect(920, 28, 224, 32, 255, 255, 255);
  canvas.drawRect(920, 28, 224, 32, 1, 229, 231, 235);
  canvas.fillRect(936, 41, 6, 6, 16, 185, 129);
  canvas.drawText('RADAR LIVE // AKTIF', 952, 38, 1, 55, 65, 81);

  // 4. Central Dossier Card
  canvas.fillRect(56, 78, 1088, 494, 255, 255, 255);
  canvas.drawRect(56, 78, 1088, 494, 2, 13, 17, 23);

  // Topbar
  canvas.fillRect(56, 78, 1088, 44, 13, 17, 23);
  canvas.fillRect(78, 97, 6, 6, 16, 185, 129);
  canvas.drawText('LIVE RADAR // PRO CYCLING TELEMETRY ENGINE', 94, 94, 1, 16, 185, 129);
  canvas.drawText('OFFICIAL PLATFORM', 970, 94, 1, 156, 163, 175);

  // Card Body
  canvas.fillRect(80, 142, 200, 22, 238, 244, 238);
  canvas.drawRect(80, 142, 200, 22, 1, 200, 222, 201);
  canvas.drawText('# PRO CYCLING RADAR', 90, 147, 1, 28, 62, 36);

  canvas.drawText('CYCLOPON LIVE TRACKER', 80, 182, 4, 13, 17, 23);
  canvas.drawText('REAL-TIME GPS RADAR  •  ULTRA-DISTANCE & ROAD RACE  •  TASIKMALAYA', 80, 232, 2, 75, 85, 99);
  canvas.drawText(`EVENT AKTIF: ${eventName.toUpperCase()} // DIDUKUNG TRACCAR & OSMAND`, 80, 270, 1, 107, 114, 128);

  // 4 Feature Cards (#FAFAFA, border #E5E7EB)
  // Card 1
  canvas.fillRect(80, 318, 240, 160, 250, 250, 250);
  canvas.drawRect(80, 318, 240, 160, 1, 229, 231, 235);
  canvas.drawText('GPS ENGINE', 98, 338, 1, 107, 114, 128);
  canvas.drawText('1.0s', 98, 384, 4, 13, 17, 23);
  canvas.drawText('Traccar Ingest', 98, 448, 1, 16, 185, 129);

  // Card 2
  canvas.fillRect(342, 318, 240, 160, 250, 250, 250);
  canvas.drawRect(342, 318, 240, 160, 1, 229, 231, 235);
  canvas.drawText('LIVE RADAR', 360, 338, 1, 107, 114, 128);
  canvas.drawText('LIVE', 360, 384, 4, 13, 17, 23);
  canvas.drawText('WebSocket Fan-Out', 360, 448, 1, 75, 85, 99);

  // Card 3
  canvas.fillRect(604, 318, 240, 160, 250, 250, 250);
  canvas.drawRect(604, 318, 240, 160, 1, 229, 231, 235);
  canvas.drawText('RACE ENGINE', 622, 338, 1, 107, 114, 128);
  canvas.drawText('COT', 622, 384, 4, 13, 17, 23);
  canvas.drawText('Split & Leaderboard', 622, 448, 1, 245, 158, 11);

  // Card 4
  canvas.fillRect(866, 318, 258, 160, 250, 250, 250);
  canvas.drawRect(866, 318, 258, 160, 1, 229, 231, 235);
  canvas.drawText('CLIENT APP', 884, 338, 1, 107, 114, 128);
  canvas.drawText('OSMAND', 884, 384, 3, 13, 17, 23);
  canvas.drawText('Android & iOS Traccar', 884, 448, 1, 75, 85, 99);

  // Footer
  canvas.fillRect(56, 520, 1088, 1, 229, 231, 235);
  canvas.drawText('KUNJUNGI : cyclopon.my.id', 80, 540, 2, 37, 99, 235);
  canvas.drawText('CYCLOPON // PRO TELEMETRY DOSSIER', 830, 544, 1, 156, 163, 175);

  return canvas.toPng();
}

/**
 * Generate Home / Root Domain Open Graph Metadata
 */
function getHomeOgMetadata(data, host = 'cyclopon.my.id', protocol = 'https') {
  const baseUrl = `${protocol}://${host}`;
  const title = '🚴 CycloPon — Live GPS Tracker & Telemetry Matrix Balap Sepeda';
  const description = 'Platform pemantau posisi GPS live, radar rute balap, kecepatan, odometer tempuh, split checkpoint Cut-Off-Time (COT), dan leaderboard resmi balap sepeda secara real-time di CycloPon!';

  const pageUrl = `${baseUrl}/`;
  const imageUrl = `${baseUrl}/api/og/home.png`;
  const imageSvgUrl = `${baseUrl}/api/og/home.svg`;

  const tags = [
    `<title>${escapeXml(title)}</title>`,
    `<meta name="description" content="${escapeXml(description)}">`,
    `<link rel="canonical" href="${pageUrl}">`,
    // Open Graph
    `<meta property="og:site_name" content="CycloPon // Live Telemetry Matrix">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${pageUrl}">`,
    `<meta property="og:title" content="${escapeXml(title)}">`,
    `<meta property="og:description" content="${escapeXml(description)}">`,
    `<meta property="og:image" content="${imageUrl}">`,
    `<meta property="og:image:secure_url" content="${imageUrl}">`,
    `<meta property="og:image:type" content="image/png">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${escapeXml(title)}">`,
    // Twitter Cards
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:url" content="${pageUrl}">`,
    `<meta name="twitter:title" content="${escapeXml(title)}">`,
    `<meta name="twitter:description" content="${escapeXml(description)}">`,
    `<meta name="twitter:image" content="${imageUrl}">`
  ].join('\n  ');

  return {
    title,
    description,
    pageUrl,
    imageUrl,
    imageSvgUrl,
    tags
  };
}

module.exports = {
  getOgData,
  generateOgSvg,
  generateOgPng,
  getOgMetadata,
  getHomeOgData,
  generateHomeOgSvg,
  generateHomeOgPng,
  getHomeOgMetadata,
  injectOgMeta
};
