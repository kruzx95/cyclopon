const fs = require('fs');
const path = require('path');
const FastCanvas = require('./fast-canvas');
const db = require('../db/database');

const gpxDir = path.join(__dirname, '..', 'public', 'gpx');

const PALETTE = {
  paper: [246, 243, 236],
  paperDot: [213, 205, 189],
  card: [255, 255, 255],
  ink: [20, 26, 23],
  body: [66, 78, 70],
  muted: [124, 131, 125],
  border: [219, 212, 197],
  sage: [43, 78, 48],
  sageSoft: [116, 136, 115],
  sageTint: [234, 239, 231],
  mint: [191, 216, 184],
  amber: [150, 96, 37],
  orange: [184, 86, 27],
  white: [255, 255, 255]
};

const MONTHS_ID = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function readGpxPoints(eventId) {
  const gpxFilePath = path.join(gpxDir, `${eventId}.gpx`);
  if (!fs.existsSync(gpxFilePath)) return [];
  try {
    const gpxText = fs.readFileSync(gpxFilePath, 'utf8');
    const ptRegex = /<(?:trkpt|rtept)[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"/gi;
    const points = [];
    let match;
    while ((match = ptRegex.exec(gpxText)) !== null) {
      const lat = parseFloat(match[1]);
      const lon = parseFloat(match[2]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) points.push({ lat, lon });
    }
    return points;
  } catch (e) {
    return [];
  }
}

function getEventDistanceKm(event) {
  if (!event || !event.id) return 0;
  const points = readGpxPoints(event.id);
  if (points.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
  }
  return Math.round(total * 10) / 10;
}

function sampleRoute(event, maxPoints = 110) {
  const points = readGpxPoints(event && event.id);
  if (points.length < 2) return [];
  if (points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  const sampled = [];
  for (let i = 0; i < maxPoints; i++) sampled.push(points[Math.round(i * step)]);
  return sampled;
}

function projectRoute(points, x, y, w, h, padding = 18) {
  if (!points || points.length < 2) return [];
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLon = Math.min(minLon, p.lon);
    maxLon = Math.max(maxLon, p.lon);
  }
  const innerW = w - padding * 2;
  const innerH = h - padding * 2;
  const spanLat = Math.max(1e-6, maxLat - minLat);
  const spanLon = Math.max(1e-6, maxLon - minLon);
  const scale = Math.min(innerW / spanLon, innerH / spanLat);
  const offsetX = x + padding + (innerW - spanLon * scale) / 2;
  const offsetY = y + padding + (innerH - spanLat * scale) / 2;

  return points.map((p) => [
    offsetX + (p.lon - minLon) * scale,
    // Invert latitude so north points up.
    offsetY + (maxLat - p.lat) * scale
  ]);
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

function formatDateId(dateStr) {
  if (!dateStr) return 'TANGGAL TBD';
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(dateStr).toUpperCase();
  const year = m[1];
  const month = MONTHS_ID[Math.max(0, Math.min(11, Number(m[2]) - 1))];
  const day = Number(m[3]);
  return `${day} ${month} ${year}`;
}

function pad2(n) {
  return String(Math.max(0, Number(n) || 0)).padStart(2, '0');
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

/* ══════════════════════════════════════════════════════════════════
   SHARED RASTER HELPERS (FastCanvas)
   ══════════════════════════════════════════════════════════════════ */

function drawPaper(canvas) {
  canvas.fillRect(0, 0, 1200, 630, ...PALETTE.paper);

  // Fine dot matrix, intentionally very subtle.
  for (let x = 24; x < 1200; x += 24) {
    for (let y = 24; y < 630; y += 24) {
      canvas.setPixel(x, y, ...PALETTE.paperDot, 0.55);
    }
  }

  // Decorative arcs on the far right for depth.
  canvas.drawCircle(1190, 90, 150, 1, ...PALETTE.sage, 0.07);
  canvas.drawCircle(1190, 90, 205, 1, ...PALETTE.sage, 0.045);
}

function drawChrome(canvas) {
  const [inkR, inkG, inkB] = PALETTE.ink;
  const [mutedR, mutedG, mutedB] = PALETTE.muted;
  const [sageR, sageG, sageB] = PALETTE.sage;
  const [borderR, borderG, borderB] = PALETTE.border;
  const [whiteR, whiteG, whiteB] = PALETTE.white;

  // Logo mark
  canvas.fillRoundRect(64, 34, 44, 44, 12, inkR, inkG, inkB);
  canvas.drawCircle(86, 56, 12.5, 1.4, whiteR, whiteG, whiteB, 0.9);
  canvas.fillCircle(86, 56, 4.2, ...PALETTE.mint);

  // Wordmark
  canvas.drawText('CYCLOPON', 122, 38, 2.35, inkR, inkG, inkB, { letterSpacing: 1.1 });
  canvas.drawText('LIVE TELEMETRY MATRIX', 124, 70, 1.05, mutedR, mutedG, mutedB, { letterSpacing: 1.2 });

  // Live pill (right aligned)
  const pillText = 'RADAR LIVE';
  const pillScale = 1.05;
  const textW = canvas.measureText(pillText, pillScale, 1).width;
  const pillW = textW + 44;
  const pillX = 1136 - pillW;
  canvas.fillRoundRect(pillX, 40, pillW, 32, 16, whiteR, whiteG, whiteB);
  canvas.drawRoundRect(pillX, 40, pillW, 32, 16, 1.2, borderR, borderG, borderB);
  canvas.fillCircle(pillX + 17, 56, 3.6, sageR, sageG, sageB);
  canvas.drawText(pillText, pillX + 28, 49, pillScale, inkR, inkG, inkB, { letterSpacing: 1 });

  // Header rule
  canvas.fillRect(64, 104, 1072, 1, borderR, borderG, borderB);
}

function drawFooter(canvas, leftText, rightText) {
  const [borderR, borderG, borderB] = PALETTE.border;
  const [inkR, inkG, inkB] = PALETTE.ink;
  const [mutedR, mutedG, mutedB] = PALETTE.muted;
  const [sageR, sageG, sageB] = PALETTE.sage;

  canvas.fillRect(64, 556, 1072, 1, borderR, borderG, borderB);
  canvas.drawText('cyclopon.my.id', 64, 578, 1.35, sageR, sageG, sageB, { letterSpacing: 0.5 });
  const hostW = canvas.measureText('cyclopon.my.id', 1.35, 0.5).width;
  canvas.drawText(leftText, 64 + hostW + 18, 579, 1.05, inkR, inkG, inkB, { letterSpacing: 0.6 });
  canvas.drawText(rightText, 1136, 579, 1.0, mutedR, mutedG, mutedB, { align: 'right', letterSpacing: 1 });
}

function drawPill(canvas, text, x, y, opts = {}) {
  const scale = opts.scale || 1.05;
  const letterSpacing = opts.letterSpacing == null ? 1 : opts.letterSpacing;
  const padX = opts.padX || 14;
  const padY = opts.padY || 9;
  const fill = opts.fill || PALETTE.sageTint;
  const textColor = opts.text || PALETTE.sage;
  const border = opts.border || PALETTE.sageSoft;
  const width = canvas.measureText(text, scale, letterSpacing).width + padX * 2;
  const height = 8 * scale + padY * 2;

  canvas.fillRoundRect(x, y, width, height, height / 2, ...fill);
  if (border) canvas.drawRoundRect(x, y, width, height, height / 2, 1.2, ...border, 0.7);
  canvas.drawText(text, x + padX, y + padY, scale, ...textColor, { letterSpacing });
  return width;
}

function drawFittedText(canvas, text, x, y, maxWidth, maxScale, minScale, color, opts = {}) {
  let scale = maxScale;
  const letterSpacing = opts.letterSpacing || 0;
  while (scale > minScale && canvas.measureText(text, scale, letterSpacing).width > maxWidth) {
    scale -= 0.1;
  }
  return canvas.drawText(text, x, y, Math.max(minScale, Math.round(scale * 10) / 10), ...color, {
    ...opts,
    maxWidth
  });
}

function drawStat(canvas, opts) {
  const {
    x, y, width, label, value, unit, sub, valueColor = PALETTE.ink
  } = opts;
  const [mutedR, mutedG, mutedB] = PALETTE.muted;

  canvas.drawText(label, x, y, 1.05, mutedR, mutedG, mutedB, { letterSpacing: 1.1 });
  const valueWidth = canvas.drawText(value, x, y + 20, opts.valueScale || 3.2, ...valueColor, { letterSpacing: 0.5 });
  if (unit) {
    const unitScale = 1.15;
    canvas.drawText(unit, x + valueWidth + 8, y + 20 + 8 * (opts.valueScale || 3.2) - 8 * unitScale, unitScale, mutedR, mutedG, mutedB, { letterSpacing: 1 });
  }
  if (sub) {
    canvas.drawText(sub, x, y + 62, 1.0, mutedR, mutedG, mutedB, { letterSpacing: 0.4, maxWidth: width });
  }
}

function drawMetricCard(canvas, opts) {
  const { x, y, w, h, label, value, unit, sub } = opts;
  const [cardR, cardG, cardB] = PALETTE.card;
  const [borderR, borderG, borderB] = PALETTE.border;
  const [inkR, inkG, inkB] = PALETTE.ink;
  const [mutedR, mutedG, mutedB] = PALETTE.muted;

  canvas.fillRoundRect(x, y + 5, w, h, 14, ...PALETTE.ink, 0.05);
  canvas.fillRoundRect(x, y, w, h, 14, cardR, cardG, cardB);
  canvas.drawRoundRect(x, y, w, h, 14, 1.2, borderR, borderG, borderB);

  canvas.drawText(label, x + 22, y + 22, 1.05, mutedR, mutedG, mutedB, { letterSpacing: 1.1 });
  const valueWidth = canvas.drawText(value, x + 22, y + 50, opts.valueScale || 3.8, inkR, inkG, inkB, { letterSpacing: 0.5 });
  if (unit) {
    const unitScale = 1.2;
    canvas.drawText(unit, x + 22 + valueWidth + 10, y + 50 + 8 * (opts.valueScale || 3.8) - 8 * unitScale, unitScale, mutedR, mutedG, mutedB, { letterSpacing: 1 });
  }
  if (opts.bar) {
    const pct = Math.max(0, Math.min(100, opts.barPct || 0));
    canvas.fillRoundRect(x + 22, y + h - 44, w - 44, 8, 4, ...PALETTE.border);
    canvas.fillRoundRect(x + 22, y + h - 44, Math.max(8, (w - 44) * (pct / 100)), 8, 4, ...PALETTE.sage);
  }
  if (sub) {
    canvas.drawText(sub, x + 22, y + h - 26, 1.0, mutedR, mutedG, mutedB, { letterSpacing: 0.4, maxWidth: w - 44 });
  }
}

function drawRadarPanel(canvas, opts = {}) {
  const x = opts.x || 776;
  const y = opts.y || 132;
  const w = opts.w || 360;
  const h = opts.h || 372;
  const [inkR, inkG, inkB] = PALETTE.ink;

  canvas.fillRoundRect(x, y + 7, w, h, 20, ...PALETTE.ink, 0.07);
  canvas.fillRoundRect(x, y, w, h, 20, inkR, inkG, inkB);

  canvas.drawText('LIVE RADAR', x + 24, y + 24, 1.05, ...PALETTE.mint, { letterSpacing: 1.3 });
  canvas.drawText('01', x + w - 24, y + 24, 1.05, 255, 255, 255, { align: 'right', alpha: 0.45, letterSpacing: 1 });

  const cx = x + w / 2;
  const cy = y + h * 0.5 + 14;
  canvas.drawCircle(cx, cy, 46, 1, ...PALETTE.mint, 0.28);
  canvas.drawCircle(cx, cy, 92, 1, ...PALETTE.mint, 0.2);
  canvas.drawCircle(cx, cy, 138, 1, ...PALETTE.mint, 0.13);
  canvas.drawLine(cx - 148, cy, cx + 148, cy, 1, ...PALETTE.mint, 0.12);
  canvas.drawLine(cx, cy - 148, cx, cy + 148, 1, ...PALETTE.mint, 0.12);

  // Sweep beam
  canvas.drawLine(cx, cy, cx + 118, cy - 78, 2, ...PALETTE.mint, 0.35);

  // Rider blips
  canvas.fillCircle(cx - 34, cy - 42, 5, ...PALETTE.mint);
  canvas.drawCircle(cx - 34, cy - 42, 11, 1, ...PALETTE.mint, 0.5);
  canvas.fillCircle(cx + 46, cy + 22, 5, ...PALETTE.orange);
  canvas.drawCircle(cx + 46, cy + 22, 11, 1, ...PALETTE.orange, 0.45);
  canvas.fillCircle(cx + 8, cy - 76, 3.6, 255, 255, 255, 0.9);

  canvas.drawText('TRACCAR INGEST', x + 24, y + h - 34, 0.95, 255, 255, 255, { alpha: 0.5, letterSpacing: 1 });
  canvas.drawText('WEBSOCKET FAN-OUT', x + w - 24, y + h - 34, 0.95, 255, 255, 255, { align: 'right', alpha: 0.5, letterSpacing: 1 });
}

function drawRoutePanel(canvas, event, distanceKm) {
  const x = 776;
  const y = 132;
  const w = 360;
  const h = 300;
  const [cardR, cardG, cardB] = PALETTE.card;
  const [borderR, borderG, borderB] = PALETTE.border;
  const [inkR, inkG, inkB] = PALETTE.ink;
  const [mutedR, mutedG, mutedB] = PALETTE.muted;
  const [sageR, sageG, sageB] = PALETTE.sage;

  canvas.fillRoundRect(x, y + 6, w, h, 18, ...PALETTE.ink, 0.05);
  canvas.fillRoundRect(x, y, w, h, 18, cardR, cardG, cardB);
  canvas.drawRoundRect(x, y, w, h, 18, 1.2, borderR, borderG, borderB);

  // Subtle map grid
  for (let gx = x + 24; gx < x + w - 12; gx += 32) {
    canvas.fillRect(gx, y + 58, 1, h - 92, ...PALETTE.border, 0.4);
  }
  for (let gy = y + 58; gy < y + h - 34; gy += 32) {
    canvas.fillRect(x + 12, gy, w - 24, 1, ...PALETTE.border, 0.4);
  }

  canvas.drawText('RUTE RESMI', x + 22, y + 22, 1.05, mutedR, mutedG, mutedB, { letterSpacing: 1.2 });
  canvas.drawText(`${distanceKm} KM`, x + w - 22, y + 22, 1.05, sageR, sageG, sageB, { align: 'right', letterSpacing: 1 });

  const points = sampleRoute(event, 110);
  const projected = projectRoute(points, x + 10, y + 48, w - 20, h - 88, 22);

  if (projected.length > 1) {
    canvas.drawPolyline(projected, 7, ...PALETTE.sage, 0.12);
    canvas.drawPolyline(projected, 2.6, ...PALETTE.sage, 1);
    const start = projected[0];
    const finish = projected[projected.length - 1];
    canvas.fillCircle(start[0], start[1], 5.5, ...PALETTE.sage);
    canvas.drawCircle(start[0], start[1], 10, 1.2, ...PALETTE.sage, 0.5);
    canvas.fillCircle(finish[0], finish[1], 5.5, ...PALETTE.orange);
    canvas.drawCircle(finish[0], finish[1], 10, 1.2, ...PALETTE.orange, 0.5);
  } else {
    canvas.drawText('FILE GPX BELUM DIUNGGAH', x + w / 2, y + h / 2 - 4, 1.0, mutedR, mutedG, mutedB, {
      align: 'center',
      letterSpacing: 1
    });
  }

  canvas.drawText(event.name.toUpperCase(), x + 22, y + h - 26, 0.95, inkR, inkG, inkB, {
    letterSpacing: 0.8,
    maxWidth: w - 120
  });
}

/* ══════════════════════════════════════════════════════════════════
   PNG GENERATORS
   ══════════════════════════════════════════════════════════════════ */

function generateOgPng(data) {
  const { event, distanceKm, totalRiders, totalCheckpoints, rider, latestPos } = data;
  const isRider = !!rider;
  const canvas = new FastCanvas(1200, 630);

  drawPaper(canvas);
  drawChrome(canvas);

  if (isRider) {
    const traveledKm = latestPos && latestPos.distance_km != null ? Number(latestPos.distance_km).toFixed(1) : '0.0';
    const progressPct = distanceKm > 0 ? Math.min(100, Math.round((Number(traveledKm) / distanceKm) * 100)) : 0;
    const remainingKm = distanceKm > 0 ? Math.max(0, distanceKm - Number(traveledKm)).toFixed(1) : '0.0';

    drawPill(canvas, 'LIVE ATHLETE PROFILE', 64, 136);

    // BIB plate
    canvas.fillRoundRect(64, 178, 156, 156, 16, ...PALETTE.ink);
    canvas.drawText('BIB', 142, 202, 1.05, 255, 255, 255, { align: 'center', alpha: 0.5, letterSpacing: 1.4 });
    canvas.drawText(`#${rider.bib}`, 142, 236, 3.15, ...PALETTE.white, { align: 'center', maxWidth: 132 });
    canvas.drawText((rider.role || 'RIDER').toUpperCase(), 142, 300, 1.0, ...PALETTE.mint, {
      align: 'center',
      letterSpacing: 1,
      maxWidth: 132
    });

    // Identity
    drawFittedText(canvas, String(rider.name).toUpperCase(), 248, 184, 500, 4.0, 2.2, PALETTE.ink);
    canvas.drawText(
      `${event.name.toUpperCase()}   /   ${distanceKm > 0 ? distanceKm + ' KM' : 'RUTE TBD'}   /   TASIKMALAYA, ID`,
      248, 244, 1.1, ...PALETTE.body, { letterSpacing: 0.6, maxWidth: 520 }
    );

    canvas.fillCircle(252, 288, 3.6, ...PALETTE.sage);
    canvas.drawText('GPS TERHUBUNG   //   TRACCAR CLIENT AKTIF', 264, 281, 1.05, ...PALETTE.muted, {
      letterSpacing: 0.8
    });

    drawMetricCard(canvas, {
      x: 64, y: 352, w: 344, h: 148,
      label: 'ODOMETER', value: traveledKm, unit: 'KM',
      sub: `Dari total rute ${distanceKm > 0 ? distanceKm + ' km' : 'belum tersedia'}`
    });
    drawMetricCard(canvas, {
      x: 424, y: 352, w: 344, h: 148,
      label: 'SISA JARAK', value: remainingKm, unit: 'KM',
      sub: progressPct >= 100 ? 'Rute 100% tuntas' : 'Sisa rute menuju finish'
    });
    drawMetricCard(canvas, {
      x: 784, y: 352, w: 344, h: 148,
      label: 'PROGRESS RUTE', value: String(progressPct), unit: '%',
      sub: `${traveledKm} km ditempuh`, bar: true, barPct: progressPct
    });

    canvas.drawText('UPDATE POSISI TIAP 1 DETIK   //   SPLIT CHECKPOINT & COT OTOMATIS', 64, 526, 1.0, ...PALETTE.muted, {
      letterSpacing: 0.8
    });

    drawFooter(canvas, `ATHLETE DOSSIER   //   ${event.name.toUpperCase()}`, 'OPEN GRAPH   //   1200 x 630');
  } else {
    const dateLabel = formatDateId(event.date);

    drawPill(canvas, 'OFFICIAL RACE DOSSIER', 64, 136);
    drawFittedText(canvas, String(event.name).toUpperCase(), 64, 178, 680, 4.7, 2.4, PALETTE.ink);
    canvas.drawText(
      `${dateLabel}   /   ${distanceKm > 0 ? distanceKm + ' KM' : 'RUTE TBD'}   /   ${pad2(totalRiders)} RIDER   /   TASIKMALAYA, ID`,
      64, 240, 1.1, ...PALETTE.body, { letterSpacing: 0.6, maxWidth: 680 }
    );

    canvas.fillRect(64, 288, 664, 1, ...PALETTE.border);

    drawStat(canvas, {
      x: 64, y: 312, width: 190,
      label: 'TOTAL RUTE', value: distanceKm > 0 ? String(distanceKm) : '-', unit: 'KM',
      sub: 'GPX terverifikasi', valueScale: 3.4
    });
    drawStat(canvas, {
      x: 288, y: 312, width: 190,
      label: 'PESERTA', value: pad2(totalRiders), unit: 'RIDER',
      sub: 'Terdaftar di startlist', valueScale: 3.4
    });
    drawStat(canvas, {
      x: 512, y: 312, width: 190,
      label: 'CHECKPOINT', value: pad2(totalCheckpoints), unit: 'POS',
      sub: 'Split time & COT', valueScale: 3.4
    });

    // CTA
    const ctaText = 'TONTON RADAR LIVE';
    const ctaScale = 1.2;
    const ctaW = canvas.measureText(ctaText, ctaScale, 0.8).width + 52;
    canvas.fillRoundRect(64, 462, ctaW, 48, 12, ...PALETTE.sage);
    canvas.drawText(ctaText, 64 + ctaW / 2, 478, ctaScale, ...PALETTE.white, {
      align: 'center', letterSpacing: 0.8
    });
    canvas.drawText(
      `cyclopon.my.id/watch/${event.id}`,
      64 + ctaW + 20, 480, 1.15, ...PALETTE.muted, { letterSpacing: 0.5 }
    );

    drawRoutePanel(canvas, event, distanceKm);
    canvas.drawText('LIVE GPS RADAR   //   TRACCAR + OSMAND   //   WEBSOCKET FAN-OUT', 64, 526, 1.0, ...PALETTE.muted, {
      letterSpacing: 0.8
    });
    drawFooter(canvas, `RACE DOSSIER   //   ${dateLabel}`, 'OPEN GRAPH   //   1200 x 630');
  }

  return canvas.toPng();
}

function generateHomeOgPng(data) {
  const { activeEvents, totalRiders, totalCheckpoints, latestEvent } = data;
  const latestName = latestEvent ? latestEvent.name.toUpperCase() : 'BELUM ADA EVENT';
  const latestDistance = latestEvent ? getEventDistanceKm(latestEvent) : 0;
  const canvas = new FastCanvas(1200, 630);

  drawPaper(canvas);
  drawChrome(canvas);

  drawPill(canvas, 'PRO CYCLING // LIVE RADAR', 64, 136);

  canvas.drawText('LIVE GPS TRACKING', 64, 178, 5.0, ...PALETTE.ink);
  canvas.drawText('UNTUK BALAP SEPEDA', 64, 232, 4.7, ...PALETTE.sage);

  canvas.drawText('Posisi rider real-time, split checkpoint, cut-off time,', 64, 310, 1.2, ...PALETTE.body, {
    letterSpacing: 0.4
  });
  canvas.drawText('dan leaderboard resmi - langsung dari browser.', 64, 332, 1.2, ...PALETTE.body, {
    letterSpacing: 0.4
  });

  canvas.fillRect(64, 374, 664, 1, ...PALETTE.border);

  drawStat(canvas, {
    x: 64, y: 396, width: 190,
    label: 'EVENT AKTIF', value: pad2(activeEvents), sub: 'Sedang berjalan', valueScale: 3.1
  });
  drawStat(canvas, {
    x: 288, y: 396, width: 190,
    label: 'RIDER', value: pad2(totalRiders), sub: 'Terdaftar di startlist', valueScale: 3.1
  });
  drawStat(canvas, {
    x: 512, y: 396, width: 190,
    label: 'CHECKPOINT', value: pad2(totalCheckpoints), sub: 'Split time & COT', valueScale: 3.1
  });

  const ctaText = 'BUKA RADAR LIVE';
  const ctaScale = 1.2;
  const ctaW = canvas.measureText(ctaText, ctaScale, 0.8).width + 52;
  canvas.fillRoundRect(64, 486, ctaW, 46, 12, ...PALETTE.sage);
  canvas.drawText(`${ctaText}  >`, 64 + ctaW / 2, 501, ctaScale, ...PALETTE.white, {
    align: 'center', letterSpacing: 0.8
  });

  drawRadarPanel(canvas);
  drawFooter(canvas, `EVENT TERKINI   //   ${latestName}${latestDistance > 0 ? '  /  ' + latestDistance + ' KM' : ''}`, 'OPEN GRAPH   //   1200 x 630');

  return canvas.toPng();
}

/* ══════════════════════════════════════════════════════════════════
   SVG GENERATORS (vector twin of the raster cards)
   ══════════════════════════════════════════════════════════════════ */

const SVG_FONT_SANS = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;
const SVG_FONT_MONO = `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;

function svgHeaderMarkup() {
  return `
  <g>
    <rect x="64" y="34" width="44" height="44" rx="12" fill="#141A17"/>
    <circle cx="86" cy="56" r="12.5" fill="none" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="1.4"/>
    <circle cx="86" cy="56" r="4.2" fill="#BFD8B8"/>
    <text x="122" y="55" font-family="${SVG_FONT_SANS}" font-size="24" font-weight="900" letter-spacing="1" fill="#141A17">CYCLOPON</text>
    <text x="124" y="74" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1.6" fill="#7C837D">LIVE TELEMETRY MATRIX</text>

    <rect x="1014" y="40" width="122" height="32" rx="16" fill="#FFFFFF" stroke="#DBD4C5" stroke-width="1.2"/>
    <circle cx="1031" cy="56" r="3.6" fill="#2B4E30"/>
    <text x="1042" y="60" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1" fill="#141A17">RADAR LIVE</text>
  </g>
  <line x1="64" y1="104" x2="1136" y2="104" stroke="#DBD4C5" stroke-width="1"/>`;
}

function svgFooterMarkup(leftText, rightText) {
  return `
  <line x1="64" y1="556" x2="1136" y2="556" stroke="#DBD4C5" stroke-width="1"/>
  <text x="64" y="582" font-family="${SVG_FONT_MONO}" font-size="13" font-weight="700" letter-spacing="0.5" fill="#2B4E30">cyclopon.my.id</text>
  <text x="212" y="582" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="0.6" fill="#141A17">${escapeXml(leftText)}</text>
  <text x="1136" y="582" text-anchor="end" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1" fill="#7C837D">${escapeXml(rightText)}</text>`;
}

function svgPaperMarkup() {
  const dots = [];
  for (let x = 24; x < 1200; x += 24) {
    for (let y = 24; y < 630; y += 24) {
      dots.push(`<circle cx="${x}" cy="${y}" r="0.9" fill="#D5CDBD" opacity="0.55"/>`);
    }
  }
  return `
  <rect width="1200" height="630" fill="#F6F3EC"/>
  ${dots.join('')}
  <circle cx="1190" cy="90" r="150" fill="none" stroke="#2B4E30" stroke-opacity="0.07"/>
  <circle cx="1190" cy="90" r="205" fill="none" stroke="#2B4E30" stroke-opacity="0.045"/>`;
}

function generateOgSvg(data) {
  const { event, distanceKm, totalRiders, totalCheckpoints, rider, latestPos } = data;
  const isRider = !!rider;
  const dateLabel = formatDateId(event.date);

  if (isRider) {
    const traveledKm = latestPos && latestPos.distance_km != null ? Number(latestPos.distance_km).toFixed(1) : '0.0';
    const progressPct = distanceKm > 0 ? Math.min(100, Math.round((Number(traveledKm) / distanceKm) * 100)) : 0;
    const remainingKm = distanceKm > 0 ? Math.max(0, distanceKm - Number(traveledKm)).toFixed(1) : '0.0';
    const roleText = (rider.role || 'RIDER').toUpperCase();

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
${svgPaperMarkup()}
${svgHeaderMarkup()}

  <rect x="64" y="136" width="205" height="27" rx="13.5" fill="#EAEFE7" stroke="#748873" stroke-opacity="0.7" stroke-width="1.2"/>
  <text x="78" y="154" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1" fill="#2B4E30">LIVE ATHLETE PROFILE</text>

  <rect x="64" y="178" width="156" height="156" rx="16" fill="#141A17"/>
  <text x="142" y="208" text-anchor="middle" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1.4" fill="#FFFFFF" opacity="0.5">BIB</text>
  <text x="142" y="262" text-anchor="middle" font-family="${SVG_FONT_MONO}" font-size="38" font-weight="900" fill="#FFFFFF">#${escapeXml(rider.bib)}</text>
  <text x="142" y="304" text-anchor="middle" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1" fill="#BFD8B8">${escapeXml(roleText)}</text>

  <text x="248" y="214" font-family="${SVG_FONT_SANS}" font-size="38" font-weight="900" letter-spacing="-0.5" fill="#141A17">${escapeXml(String(rider.name))}</text>
  <text x="248" y="252" font-family="${SVG_FONT_MONO}" font-size="11" font-weight="700" letter-spacing="0.6" fill="#424E46">${escapeXml(event.name)}   •   ${distanceKm > 0 ? distanceKm + ' KM' : 'RUTE TBD'}   •   TASIKMALAYA, ID</text>
  <circle cx="252" cy="286" r="3.6" fill="#2B4E30"/>
  <text x="264" y="290" font-family="${SVG_FONT_MONO}" font-size="10.5" font-weight="700" letter-spacing="0.8" fill="#7C837D">GPS TERHUBUNG   //   TRACCAR CLIENT AKTIF</text>

  <g>
    <rect x="64" y="357" width="344" height="148" rx="14" fill="#141A17" opacity="0.05"/>
    <rect x="64" y="352" width="344" height="148" rx="14" fill="#FFFFFF" stroke="#DBD4C5" stroke-width="1.2"/>
    <text x="86" y="380" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1.1" fill="#7C837D">ODOMETER</text>
    <text x="86" y="430" font-family="${SVG_FONT_SANS}" font-size="42" font-weight="900" fill="#141A17">${traveledKm}</text>
    <text x="${86 + String(traveledKm).length * 25 + 10}" y="428" font-family="${SVG_FONT_MONO}" font-size="11" font-weight="700" letter-spacing="1" fill="#7C837D">KM</text>
    <text x="86" y="474" font-family="${SVG_FONT_SANS}" font-size="10.5" fill="#7C837D">Dari total rute ${distanceKm > 0 ? distanceKm + ' km' : 'belum tersedia'}</text>
  </g>

  <g>
    <rect x="424" y="357" width="344" height="148" rx="14" fill="#141A17" opacity="0.05"/>
    <rect x="424" y="352" width="344" height="148" rx="14" fill="#FFFFFF" stroke="#DBD4C5" stroke-width="1.2"/>
    <text x="446" y="380" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1.1" fill="#7C837D">SISA JARAK</text>
    <text x="446" y="430" font-family="${SVG_FONT_SANS}" font-size="42" font-weight="900" fill="#141A17">${remainingKm}</text>
    <text x="${446 + String(remainingKm).length * 25 + 10}" y="428" font-family="${SVG_FONT_MONO}" font-size="11" font-weight="700" letter-spacing="1" fill="#7C837D">KM</text>
    <text x="446" y="474" font-family="${SVG_FONT_SANS}" font-size="10.5" fill="#7C837D">${progressPct >= 100 ? 'Rute 100% tuntas' : 'Sisa rute menuju finish'}</text>
  </g>

  <g>
    <rect x="784" y="357" width="344" height="148" rx="14" fill="#141A17" opacity="0.05"/>
    <rect x="784" y="352" width="344" height="148" rx="14" fill="#FFFFFF" stroke="#DBD4C5" stroke-width="1.2"/>
    <text x="806" y="380" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1.1" fill="#7C837D">PROGRESS RUTE</text>
    <text x="806" y="430" font-family="${SVG_FONT_SANS}" font-size="42" font-weight="900" fill="#141A17">${progressPct}</text>
    <text x="${806 + String(progressPct).length * 25 + 10}" y="428" font-family="${SVG_FONT_MONO}" font-size="11" font-weight="700" letter-spacing="1" fill="#7C837D">%</text>
    <rect x="806" y="446" width="300" height="8" rx="4" fill="#DBD4C5"/>
    <rect x="806" y="446" width="${Math.max(8, Math.round(300 * (progressPct / 100)))}" height="8" rx="4" fill="#2B4E30"/>
    <text x="806" y="474" font-family="${SVG_FONT_SANS}" font-size="10.5" fill="#7C837D">${traveledKm} km ditempuh</text>
  </g>

  <text x="64" y="530" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="0.8" fill="#7C837D">UPDATE POSISI TIAP 1 DETIK   //   SPLIT CHECKPOINT &amp; COT OTOMATIS</text>

${svgFooterMarkup(`LIVE RADAR   //   ${event.name}`, 'OPEN GRAPH   //   1200 x 630')}
</svg>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
${svgPaperMarkup()}
${svgHeaderMarkup()}

  <rect x="64" y="136" width="205" height="27" rx="13.5" fill="#EAEFE7" stroke="#748873" stroke-opacity="0.7" stroke-width="1.2"/>
  <text x="78" y="154" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1" fill="#2B4E30">OFFICIAL RACE DOSSIER</text>

  <text x="64" y="220" font-family="${SVG_FONT_SANS}" font-size="46" font-weight="900" letter-spacing="-1" fill="#141A17">${escapeXml(event.name)}</text>
  <text x="64" y="256" font-family="${SVG_FONT_MONO}" font-size="11" font-weight="700" letter-spacing="0.6" fill="#424E46">${escapeXml(dateLabel)}   •   ${distanceKm > 0 ? distanceKm + ' KM' : 'RUTE TBD'}   •   ${pad2(totalRiders)} RIDER   •   TASIKMALAYA, ID</text>
  <line x1="64" y1="288" x2="728" y2="288" stroke="#DBD4C5" stroke-width="1"/>

  <text x="64" y="322" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1.1" fill="#7C837D">TOTAL RUTE</text>
  <text x="64" y="372" font-family="${SVG_FONT_SANS}" font-size="38" font-weight="900" fill="#141A17">${distanceKm > 0 ? distanceKm : '-'}</text>
  <text x="${64 + String(distanceKm > 0 ? distanceKm : '-').length * 23 + 10}" y="370" font-family="${SVG_FONT_MONO}" font-size="11" font-weight="700" letter-spacing="1" fill="#7C837D">KM</text>
  <text x="64" y="404" font-family="${SVG_FONT_SANS}" font-size="10.5" fill="#7C837D">GPX terverifikasi</text>

  <text x="288" y="322" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1.1" fill="#7C837D">PESERTA</text>
  <text x="288" y="372" font-family="${SVG_FONT_SANS}" font-size="38" font-weight="900" fill="#141A17">${pad2(totalRiders)}</text>
  <text x="342" y="370" font-family="${SVG_FONT_MONO}" font-size="11" font-weight="700" letter-spacing="1" fill="#7C837D">RIDER</text>
  <text x="288" y="404" font-family="${SVG_FONT_SANS}" font-size="10.5" fill="#7C837D">Terdaftar di startlist</text>

  <text x="512" y="322" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1.1" fill="#7C837D">CHECKPOINT</text>
  <text x="512" y="372" font-family="${SVG_FONT_SANS}" font-size="38" font-weight="900" fill="#141A17">${pad2(totalCheckpoints)}</text>
  <text x="566" y="370" font-family="${SVG_FONT_MONO}" font-size="11" font-weight="700" letter-spacing="1" fill="#7C837D">POS</text>
  <text x="512" y="404" font-family="${SVG_FONT_SANS}" font-size="10.5" fill="#7C837D">Split time &amp; COT</text>

  <rect x="64" y="462" width="252" height="48" rx="12" fill="#2B4E30"/>
  <text x="190" y="492" text-anchor="middle" font-family="${SVG_FONT_MONO}" font-size="12" font-weight="700" letter-spacing="0.8" fill="#FFFFFF">TONTON RADAR LIVE</text>
  <text x="336" y="490" font-family="${SVG_FONT_MONO}" font-size="11.5" font-weight="700" letter-spacing="0.5" fill="#7C837D">cyclopon.my.id/watch/${event.id}</text>

${svgRoutePanelMarkup(event, distanceKm)}
  <text x="64" y="530" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="0.8" fill="#7C837D">LIVE GPS RADAR   //   TRACCAR + OSMAND   //   WEBSOCKET FAN-OUT</text>

${svgFooterMarkup(`LIVE RADAR   //   ${dateLabel}`, 'OPEN GRAPH   //   1200 x 630')}
</svg>`;
}

function svgRoutePanelMarkup(event, distanceKm) {
  const points = sampleRoute(event, 110);
  const projected = projectRoute(points, 786, 180, 340, 212, 18);
  const grid = [];
  for (let gx = 800; gx < 1124; gx += 32) grid.push(`<line x1="${gx}" y1="190" x2="${gx}" y2="394" stroke="#DBD4C5" stroke-opacity="0.55"/>`);
  for (let gy = 190; gy < 396; gy += 32) grid.push(`<line x1="788" y1="${gy}" x2="1124" y2="${gy}" stroke="#DBD4C5" stroke-opacity="0.55"/>`);

  let routeMarkup = '';
  if (projected.length > 1) {
    const d = projected.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    const start = projected[0];
    const finish = projected[projected.length - 1];
    routeMarkup = `
    <path d="${d}" fill="none" stroke="#2B4E30" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${start[0].toFixed(1)}" cy="${start[1].toFixed(1)}" r="5.5" fill="#2B4E30"/>
    <circle cx="${start[0].toFixed(1)}" cy="${start[1].toFixed(1)}" r="10" fill="none" stroke="#2B4E30" stroke-opacity="0.5"/>
    <circle cx="${finish[0].toFixed(1)}" cy="${finish[1].toFixed(1)}" r="5.5" fill="#B8561B"/>
    <circle cx="${finish[0].toFixed(1)}" cy="${finish[1].toFixed(1)}" r="10" fill="none" stroke="#B8561B" stroke-opacity="0.5"/>`;
  } else {
    routeMarkup = `<text x="956" y="296" text-anchor="middle" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1" fill="#7C837D">FILE GPX BELUM DIUNGGAH</text>`;
  }

  return `
  <g>
    <rect x="776" y="138" width="360" height="300" rx="18" fill="#141A17" opacity="0.05"/>
    <rect x="776" y="132" width="360" height="300" rx="18" fill="#FFFFFF" stroke="#DBD4C5" stroke-width="1.2"/>
    ${grid.join('')}
    <text x="798" y="162" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1.2" fill="#7C837D">RUTE RESMI</text>
    <text x="1114" y="162" text-anchor="end" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1" fill="#2B4E30">${distanceKm} KM</text>
    ${routeMarkup}
    <text x="798" y="410" font-family="${SVG_FONT_MONO}" font-size="9.5" font-weight="700" letter-spacing="0.8" fill="#141A17">${escapeXml(event.name.toUpperCase())}</text>
  </g>`;
}

function generateHomeOgSvg(data) {
  const { activeEvents, totalRiders, totalCheckpoints, latestEvent } = data;
  const latestName = latestEvent ? latestEvent.name.toUpperCase() : 'BELUM ADA EVENT';
  const latestDistance = latestEvent ? getEventDistanceKm(latestEvent) : 0;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
${svgPaperMarkup()}
${svgHeaderMarkup()}

  <rect x="64" y="136" width="238" height="27" rx="13.5" fill="#EAEFE7" stroke="#748873" stroke-opacity="0.7" stroke-width="1.2"/>
  <text x="78" y="154" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1" fill="#2B4E30">PRO CYCLING // LIVE RADAR</text>

  <text x="62" y="230" font-family="${SVG_FONT_SANS}" font-size="64" font-weight="900" letter-spacing="-1.5" fill="#141A17">LIVE GPS TRACKING</text>
  <text x="62" y="292" font-family="${SVG_FONT_SANS}" font-size="58" font-weight="900" letter-spacing="-1.2" fill="#2B4E30">UNTUK BALAP SEPEDA</text>

  <text x="64" y="330" font-family="${SVG_FONT_SANS}" font-size="13" fill="#424E46">Posisi rider real-time, split checkpoint, cut-off time,</text>
  <text x="64" y="350" font-family="${SVG_FONT_SANS}" font-size="13" fill="#424E46">dan leaderboard resmi — langsung dari browser.</text>

  <line x1="64" y1="374" x2="728" y2="374" stroke="#DBD4C5" stroke-width="1"/>

  <text x="64" y="400" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1.1" fill="#7C837D">EVENT AKTIF</text>
  <text x="64" y="446" font-family="${SVG_FONT_SANS}" font-size="34" font-weight="900" fill="#141A17">${pad2(activeEvents)}</text>
  <text x="64" y="470" font-family="${SVG_FONT_SANS}" font-size="10.5" fill="#7C837D">Sedang berjalan</text>

  <text x="288" y="400" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1.1" fill="#7C837D">RIDER</text>
  <text x="288" y="446" font-family="${SVG_FONT_SANS}" font-size="34" font-weight="900" fill="#141A17">${pad2(totalRiders)}</text>
  <text x="288" y="470" font-family="${SVG_FONT_SANS}" font-size="10.5" fill="#7C837D">Terdaftar di startlist</text>

  <text x="512" y="400" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1.1" fill="#7C837D">CHECKPOINT</text>
  <text x="512" y="446" font-family="${SVG_FONT_SANS}" font-size="34" font-weight="900" fill="#141A17">${pad2(totalCheckpoints)}</text>
  <text x="512" y="470" font-family="${SVG_FONT_SANS}" font-size="10.5" fill="#7C837D">Split time &amp; COT</text>

  <rect x="64" y="486" width="232" height="46" rx="12" fill="#2B4E30"/>
  <text x="180" y="514" text-anchor="middle" font-family="${SVG_FONT_MONO}" font-size="12" font-weight="700" letter-spacing="0.8" fill="#FFFFFF">BUKA RADAR LIVE  &gt;</text>

  <g>
    <rect x="776" y="139" width="360" height="372" rx="20" fill="#141A17" opacity="0.07"/>
    <rect x="776" y="132" width="360" height="372" rx="20" fill="#141A17"/>
    <text x="800" y="162" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1.3" fill="#BFD8B8">LIVE RADAR</text>
    <text x="1112" y="162" text-anchor="end" font-family="${SVG_FONT_MONO}" font-size="10" font-weight="700" letter-spacing="1" fill="#FFFFFF" opacity="0.45">01</text>

    <circle cx="956" cy="328" r="46" fill="none" stroke="#BFD8B8" stroke-opacity="0.28"/>
    <circle cx="956" cy="328" r="92" fill="none" stroke="#BFD8B8" stroke-opacity="0.2"/>
    <circle cx="956" cy="328" r="138" fill="none" stroke="#BFD8B8" stroke-opacity="0.13"/>
    <line x1="808" y1="328" x2="1104" y2="328" stroke="#BFD8B8" stroke-opacity="0.12"/>
    <line x1="956" y1="180" x2="956" y2="476" stroke="#BFD8B8" stroke-opacity="0.12"/>
    <line x1="956" y1="328" x2="1074" y2="250" stroke="#BFD8B8" stroke-opacity="0.35" stroke-width="2"/>

    <circle cx="922" cy="286" r="5" fill="#BFD8B8"/>
    <circle cx="922" cy="286" r="11" fill="none" stroke="#BFD8B8" stroke-opacity="0.5"/>
    <circle cx="1002" cy="350" r="5" fill="#B8561B"/>
    <circle cx="1002" cy="350" r="11" fill="none" stroke="#B8561B" stroke-opacity="0.45"/>
    <circle cx="964" cy="252" r="3.6" fill="#FFFFFF" opacity="0.9"/>

    <text x="800" y="470" font-family="${SVG_FONT_MONO}" font-size="9" font-weight="700" letter-spacing="1" fill="#FFFFFF" opacity="0.5">TRACCAR INGEST</text>
    <text x="1112" y="470" text-anchor="end" font-family="${SVG_FONT_MONO}" font-size="9" font-weight="700" letter-spacing="1" fill="#FFFFFF" opacity="0.5">WEBSOCKET FAN-OUT</text>
  </g>

${svgFooterMarkup(`EVENT TERKINI   //   ${latestName}${latestDistance > 0 ? '  •  ' + latestDistance + ' KM' : ''}`, 'OPEN GRAPH   //   1200 x 630')}
</svg>`;
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
    const traveledKm = latestPos && latestPos.distance_km != null ? Number(latestPos.distance_km).toFixed(1) : '0.0';
    title = `🚴 #${rider.bib} ${rider.name} — Live Tracking | ${event.name}`;
    description = `Pantau posisi live GPS, jarak tempuh (${traveledKm} km), dan status gowes #${rider.bib} ${rider.name} di event ${event.name} (${distanceKm} km) secara real-time di CycloPon!`;
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
