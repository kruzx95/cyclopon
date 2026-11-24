/**
 * CycloPon Activity Card — model builder.
 *
 * Turns a raw GPX / TCX track into a normalized "share card" model that the
 * canvas renderer (`card-renderer.js`) and the share page consume.
 *
 * Everything here is pure: no DOM, no network, no globals required — so
 * `node --test` can cover it exactly like `gpx-utils.js` does.
 *
 * Distance formula mirrors `haversineKm()` in gpx-utils.js; elevation noise
 * threshold mirrors `parseGpxData()` so card numbers agree with the rest of
 * the app.
 */

const CARD_MONTHS_ID = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

const CARD_ELEV_NOISE_M = 0.25;     // ignore altitude jitter below 25 cm
const CARD_MOVING_MIN_KMH = 0.8;    // slower than this counts as a pause
const CARD_MOVING_MAX_KMH = 90;     // faster than this is a GPS spike
const CARD_PAUSE_GAP_SEC = 120;     // a gap longer than this is a stop

const ACTIVITY_ERROR_CODES = {
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  EMPTY_ACTIVITY: 'EMPTY_ACTIVITY'
};

function cardError(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function cardNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cardRound(value, decimals) {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Haversine distance in kilometres (same formula as gpx-utils.haversineKm).
 */
function cardHaversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
          + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
          * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Detect the activity file format from its name and/or XML root element.
 * @returns {'gpx'|'tcx'|null}
 */
function detectActivityFormat(fileName, text) {
  const name = String(fileName || '').toLowerCase();
  const body = String(text || '');
  if (/<TrainingCenterDatabase[\s>]/i.test(body) || name.endsWith('.tcx')) return 'tcx';
  if (/<gpx[\s>]/i.test(body) || name.endsWith('.gpx')) return 'gpx';
  return null;
}

/**
 * Parse GPX track/route points including `<ele>` and `<time>`.
 * `parseGpxData()` in gpx-utils.js ignores timestamps, so we read them here.
 * @returns {Array<{lat:number,lng:number,ele:number|null,time:number|null}>}
 */
function parseGpxActivity(text) {
  const points = [];
  const blockRe = /<(trkpt|rtept)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = blockRe.exec(String(text || ''))) !== null) {
    const attrs = match[2] || '';
    const body = match[3] || '';
    const latMatch = /lat\s*=\s*["']([^"']+)["']/i.exec(attrs);
    const lonMatch = /lon\s*=\s*["']([^"']+)["']/i.exec(attrs);
    if (!latMatch || !lonMatch) continue;

    const lat = cardNumber(latMatch[1]);
    const lng = cardNumber(lonMatch[1]);
    if (lat === null || lng === null) continue;

    const eleMatch = /<ele>\s*([^<]+?)\s*<\/ele>/i.exec(body);
    const timeMatch = /<time>\s*([^<]+?)\s*<\/time>/i.exec(body);
    const parsedTime = timeMatch ? Date.parse(timeMatch[1]) : NaN;

    points.push({
      lat,
      lng,
      ele: eleMatch ? cardNumber(eleMatch[1]) : null,
      time: Number.isFinite(parsedTime) ? parsedTime : null
    });
  }
  return points;
}

/**
 * Parse a TCX (Training Center XML) activity — every Trackpoint carries
 * Time, Position and AltitudeMeters.
 * @returns {Array<{lat:number,lng:number,ele:number|null,time:number|null}>}
 */
function parseTcxActivity(text) {
  const points = [];
  const blockRe = /<Trackpoint\b[^>]*>([\s\S]*?)<\/Trackpoint>/gi;
  let match;
  while ((match = blockRe.exec(String(text || ''))) !== null) {
    const body = match[1] || '';
    const latMatch = /<LatitudeDegrees>\s*([^<]+?)\s*<\/LatitudeDegrees>/i.exec(body);
    const lonMatch = /<LongitudeDegrees>\s*([^<]+?)\s*<\/LongitudeDegrees>/i.exec(body);
    if (!latMatch || !lonMatch) continue;

    const lat = cardNumber(latMatch[1]);
    const lng = cardNumber(lonMatch[1]);
    if (lat === null || lng === null) continue;

    const altMatch = /<AltitudeMeters>\s*([^<]+?)\s*<\/AltitudeMeters>/i.exec(body);
    const timeMatch = /<Time>\s*([^<]+?)\s*<\/Time>/i.exec(body);
    const parsedTime = timeMatch ? Date.parse(timeMatch[1]) : NaN;

    points.push({
      lat,
      lng,
      ele: altMatch ? cardNumber(altMatch[1]) : null,
      time: Number.isFinite(parsedTime) ? parsedTime : null
    });
  }
  return points;
}
/**
 * Derive ride metrics from an ordered track.
 * Moving time discards stops (> 2 min gap) and implausible speeds.
 */
function computeTrackStats(points) {
  const list = Array.isArray(points) ? points : [];
  let distanceKm = 0;
  let elevGainM = 0;
  let elevLossM = 0;
  let minEle = null;
  let maxEle = null;
  let movingSec = 0;
  let maxKmh = 0;

  for (let i = 0; i < list.length; i++) {
    const point = list[i];
    if (Number.isFinite(point.ele)) {
      if (minEle === null || point.ele < minEle) minEle = point.ele;
      if (maxEle === null || point.ele > maxEle) maxEle = point.ele;
    }
    if (i === 0) continue;

    const prev = list[i - 1];
    const dKm = cardHaversineKm(prev.lat, prev.lng, point.lat, point.lng);
    distanceKm += dKm;

    if (Number.isFinite(prev.ele) && Number.isFinite(point.ele)) {
      const dEle = point.ele - prev.ele;
      if (dEle > CARD_ELEV_NOISE_M) elevGainM += dEle;
      else if (dEle < -CARD_ELEV_NOISE_M) elevLossM += -dEle;
    }

    if (prev.time !== null && point.time !== null) {
      const dtSec = (point.time - prev.time) / 1000;
      if (dtSec > 0 && dtSec <= CARD_PAUSE_GAP_SEC) {
        const speedKmh = (dKm / dtSec) * 3600;
        if (speedKmh >= CARD_MOVING_MIN_KMH && speedKmh <= CARD_MOVING_MAX_KMH) {
          movingSec += dtSec;
          if (speedKmh > maxKmh) maxKmh = speedKmh;
        }
      }
    }
  }

  const times = list.filter(p => p.time !== null && p.time !== undefined).map(p => p.time);
  const elapsedSec = times.length >= 2 ? Math.max(0, (times[times.length - 1] - times[0]) / 1000) : 0;

  return {
    distanceKm: cardRound(distanceKm, 2),
    elevGainM: Math.round(elevGainM),
    elevLossM: Math.round(elevLossM),
    minEle: minEle === null ? null : Math.round(minEle),
    maxEle: maxEle === null ? null : Math.round(maxEle),
    movingSec: Math.round(movingSec),
    elapsedSec: Math.round(elapsedSec),
    avgKmh: movingSec > 0 ? cardRound(distanceKm / (movingSec / 3600), 1) : null,
    maxKmh: maxKmh > 0 ? cardRound(maxKmh, 1) : null
  };
}

/**
 * Geographic bounding box of a track.
 * @returns {{minLat:number,maxLat:number,minLng:number,maxLng:number,centerLat:number,centerLng:number}|null}
 */
function computeBbox(points) {
  const list = Array.isArray(points) ? points : [];
  if (!list.length) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of list) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  if (!Number.isFinite(minLat) || !Number.isFinite(minLng)) return null;
  return {
    minLat, maxLat, minLng, maxLng,
    centerLat: (minLat + maxLat) / 2,
    centerLng: (minLng + maxLng) / 2
  };
}

/**
 * Uniform point decimation that always keeps the first and last point.
 * A 20 000-point GPX would otherwise cost seconds per canvas redraw.
 */
function simplifyTrack(points, maxPoints = 420) {
  const list = Array.isArray(points) ? points : [];
  const limit = Math.max(2, Math.floor(maxPoints) || 2);
  if (list.length <= limit) return list.slice();
  const step = (list.length - 1) / (limit - 1);
  const out = [];
  for (let i = 0; i < limit; i++) out.push(list[Math.round(i * step)]);
  out[0] = list[0];
  out[out.length - 1] = list[list.length - 1];
  return out;
}

/**
 * Chaikin corner-cutting — one pass turns GPX zig-zags into a smooth ribbon
 * while preserving both endpoints.
 */
function chaikinSmooth(points, iterations = 1) {
  let src = Array.isArray(points) ? points.slice() : [];
  const passes = Math.max(0, Math.floor(iterations) || 0);
  for (let pass = 0; pass < passes; pass++) {
    if (src.length < 3) return src;
    const out = [src[0]];
    for (let i = 0; i < src.length - 1; i++) {
      const a = src[i];
      const b = src[i + 1];
      out.push({ lat: a.lat * 0.75 + b.lat * 0.25, lng: a.lng * 0.75 + b.lng * 0.25 });
      out.push({ lat: a.lat * 0.25 + b.lat * 0.75, lng: a.lng * 0.25 + b.lng * 0.75 });
    }
    out.push(src[src.length - 1]);
    src = out;
  }
  return src;
}
/**
 * Strava-style duration: "45s" / "47m" / "1h 57m".
 * @returns {string|null}
 */
function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || seconds === '') return null;
  const total = Math.round(Number(seconds));
  if (!Number.isFinite(total)) return null;
  if (total <= 0) return '0m';
  if (total < 60) return `${total}s`;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours < 1) return `${Math.max(1, minutes)}m`;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatDistance(km) {
  const n = Number(km);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function formatSpeed(kmh) {
  const n = Number(kmh);
  return Number.isFinite(n) && n > 0 ? n.toFixed(1) : '—';
}

/**
 * "2026-11-24T05:12:30.000Z" (or epoch ms) -> "24 NOV 2026".
 * Uses UTC so the card never shifts a day with the rider's timezone.
 */
function formatDateId(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${String(date.getUTCDate()).padStart(2, '0')} ${CARD_MONTHS_ID[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function cardTitleFromFileName(fileName) {
  const base = String(fileName || '').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim();
  if (!base) return 'Aktivitas Gowes';
  const words = base.split(/\s+/).filter(Boolean).map(word => {
    if (/^\d+$/.test(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  return words.join(' ').slice(0, 60);
}

/**
 * Caption text reused by the Web Share sheet and clipboard fallback.
 */
function formatCaption(model) {
  if (!model || !model.stats) return 'Kartu aktivitas dari CycloPon';
  const parts = [`${formatDistance(model.stats.distanceKm)} km`];
  const duration = formatDuration(model.stats.movingSec || model.stats.elapsedSec);
  if (duration) parts.push(duration);
  if (model.stats.elevGainM > 0) parts.push(`${model.stats.elevGainM} m elevasi`);
  if (model.stats.avgKmh) parts.push(`${formatSpeed(model.stats.avgKmh)} km/jam`);
  const title = model.title || 'Aktivitas Gowes';
  return `${title} — ${parts.join(' · ')}. Dibuat dengan CycloPon 🚴`;
}

/**
 * Build the complete card model from uploaded file text.
 * @param {{fileName?:string, text:string, title?:string, riderName?:string}} input
 */
function buildCardModel(input = {}) {
  const { fileName = '', text = '', title = '', riderName = '' } = input;
  const format = detectActivityFormat(fileName, text);
  if (!format) {
    throw cardError('Format file tidak dikenali. Gunakan file .gpx atau .tcx.', ACTIVITY_ERROR_CODES.UNSUPPORTED_FORMAT);
  }

  const points = format === 'tcx' ? parseTcxActivity(text) : parseGpxActivity(text);
  if (points.length < 2) {
    throw cardError('Trek terlalu pendek. Pastikan file berisi minimal 2 titik koordinat.', ACTIVITY_ERROR_CODES.EMPTY_ACTIVITY);
  }

  const stats = computeTrackStats(points);
  const firstTimed = points.find(p => p.time !== null && p.time !== undefined) || null;

  return {
    source: format,
    sport: 'Ride',
    title: String(title || '').trim() || cardTitleFromFileName(fileName),
    riderName: String(riderName || '').trim(),
    startedAt: firstTimed ? new Date(firstTimed.time).toISOString() : null,
    points,
    bbox: computeBbox(points),
    stats,
    hasTime: stats.movingSec > 0 || stats.elapsedSec > 0,
    hasElevation: stats.maxEle !== null
  };
}

const CARD_MODEL_API = {
  ACTIVITY_ERROR_CODES,
  CARD_MONTHS_ID,
  detectActivityFormat,
  parseGpxActivity,
  parseTcxActivity,
  computeTrackStats,
  computeBbox,
  simplifyTrack,
  chaikinSmooth,
  formatDuration,
  formatDistance,
  formatSpeed,
  formatDateId,
  formatCaption,
  buildCardModel
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CARD_MODEL_API;
}
if (typeof window !== 'undefined') {
  window.CardModel = CARD_MODEL_API;
}