/**
 * Virtual COT — moving cut-off time marker.
 *
 * The marker starts at the route origin at a configured WIB time and advances
 * at a constant pace (km/h). Riders whose freshest known position is already
 * behind the marker are recorded as DNF in `virtual_dnf`.
 *
 * All marker math is pure epoch arithmetic (no per-request timezone parsing).
 */

const fs = require('fs');
const path = require('path');
const db = require('../db/database');

const GPX_DIR = path.join(__dirname, '..', 'public', 'gpx');
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000; // Indonesia has no DST

const ROUTE_CACHE = new Map();
const EVAL_CACHE = new Map();

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function envNumber(name, fallback) {
  if (process.env[name] == null || process.env[name] === '') return fallback;
  return toNumber(process.env[name], fallback);
}

function round(value, decimals = 1) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function isFeatureEnabled() {
  const raw = process.env.VIRTUAL_COT_ENABLED;
  if (raw == null || raw === '') return true;
  return !['false', '0', 'off', 'no'].includes(String(raw).trim().toLowerCase());
}

function getThresholds() {
  return {
    freshMin: envNumber('VIRTUAL_COT_FRESH_MIN', 10),
    marginKm: envNumber('VIRTUAL_COT_MARGIN_KM', 1),
    gapMin: envNumber('VIRTUAL_COT_GAP_MIN', 15),
    evalTtlMs: envNumber('VIRTUAL_COT_EVAL_TTL_SEC', 20) * 1000
  };
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Convert a WIB (UTC+7) date + HH:MM into an epoch timestamp (ms).
 * @param {string} dateStr 'YYYY-MM-DD'
 * @param {string} timeStr 'HH:MM'
 * @returns {number|null}
 */
function wibToEpochMs(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const dateMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(dateStr).trim());
  const timeMatch = /^(\d{1,2}):(\d{2})/.exec(String(timeStr).trim());
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hour > 23 || minute > 59) return null;

  return Date.UTC(year, month - 1, day, hour, minute, 0) - WIB_OFFSET_MS;
}

function parseGpxPoints(text) {
  const ptRegex = /<(?:trkpt|rtept)[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"/gi;
  const coords = [];
  let match;
  while ((match = ptRegex.exec(text)) !== null) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    if (Number.isFinite(lat) && Number.isFinite(lon)) coords.push([lat, lon]);
  }
  return coords;
}

/**
 * Load (and cache by mtime) the cumulative distances of an event route.
 * Returns { points: [{lat, lon, km}], totalKm }.
 */
function loadRoute(eventId) {
  const filePath = path.join(GPX_DIR, `${eventId}.gpx`);
  let mtime = 0;
  try {
    if (fs.existsSync(filePath)) mtime = fs.statSync(filePath).mtimeMs;
  } catch (e) {}

  const cacheKey = `${eventId}:${mtime}`;
  if (ROUTE_CACHE.has(cacheKey)) return ROUTE_CACHE.get(cacheKey);

  let points = [];
  let totalKm = 0;

  if (mtime > 0) {
    try {
      const coords = parseGpxPoints(fs.readFileSync(filePath, 'utf8'));
      if (coords.length > 1) {
        points.push({ lat: coords[0][0], lon: coords[0][1], km: 0 });
        let cumulative = 0;
        for (let i = 1; i < coords.length; i++) {
          cumulative += haversineDistance(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
          points.push({ lat: coords[i][0], lon: coords[i][1], km: cumulative });
        }
        totalKm = cumulative;
      }
    } catch (e) {
      console.warn(`[VirtualCOT] Gagal membaca GPX event ${eventId}:`, e.message);
    }
  }

  // Fallback: tallest checkpoint distance still gives a usable marker range
  if (totalKm <= 0) {
    try {
      const row = db.db.prepare('SELECT MAX(km_distance) AS km FROM checkpoints WHERE event_id = ?').get(eventId);
      if (row && Number(row.km) > 0) totalKm = Number(row.km);
    } catch (e) {}
  }

  const route = { points, totalKm: round(totalKm, 3) };
  if (ROUTE_CACHE.size > 64) ROUTE_CACHE.clear();
  ROUTE_CACHE.set(cacheKey, route);
  return route;
}

/**
 * Interpolate lat/lng for a cumulative distance along the route.
 */
function pointAtKm(route, km) {
  const points = route && route.points ? route.points : [];
  if (points.length === 0) return null;

  if (km <= 0) return { lat: points[0].lat, lon: points[0].lon };
  const last = points[points.length - 1];
  if (km >= last.km) return { lat: last.lat, lon: last.lon };

  let low = 0;
  let high = points.length - 1;
  while (low + 1 < high) {
    const mid = (low + high) >> 1;
    if (points[mid].km <= km) low = mid;
    else high = mid;
  }

  const a = points[low];
  const b = points[high];
  const span = b.km - a.km;
  const ratio = span > 0 ? (km - a.km) / span : 0;
  return {
    lat: a.lat + (b.lat - a.lat) * ratio,
    lon: a.lon + (b.lon - a.lon) * ratio
  };
}

function getConfig(event) {
  const startMs = event && event.cot_start_ms != null ? Number(event.cot_start_ms) : null;
  const pace = event && event.cot_pace != null ? Number(event.cot_pace) : null;
  const configured = Number.isFinite(startMs) && startMs > 0 && Number.isFinite(pace) && pace > 0;

  return {
    configured,
    mode: (event && event.cot_mode) || 'off',
    startTime: (event && event.cot_start_time) || null,
    startMs: Number.isFinite(startMs) ? startMs : null,
    pace: Number.isFinite(pace) ? pace : null
  };
}

/**
 * Compute the marker position at a given moment.
 */
function computeMarker(event, nowMs = Date.now()) {
  const config = getConfig(event);
  const route = event && event.id ? loadRoute(event.id) : { points: [], totalKm: 0 };
  const base = {
    enabled: config.configured,
    mode: config.mode,
    startTime: config.startTime,
    startMs: config.startMs,
    pace: config.pace,
    routeLengthKm: round(route.totalKm, 1)
  };

  if (!config.configured) {
    return { ...base, status: 'DISABLED', distanceKm: 0, latitude: null, longitude: null };
  }

  let distanceKm = config.pace * ((nowMs - config.startMs) / 3600000);
  let status = 'MOVING';

  if (distanceKm < 0) {
    distanceKm = 0;
    status = 'NOT_STARTED';
  } else if (route.totalKm > 0 && distanceKm >= route.totalKm) {
    distanceKm = route.totalKm;
    status = 'FINISHED';
  }

  const point = pointAtKm(route, distanceKm);
  return {
    ...base,
    status,
    distanceKm: round(distanceKm, 3),
    latitude: point ? round(point.lat, 6) : null,
    longitude: point ? round(point.lon, 6) : null
  };
}

/**
 * Per-rider position state relative to the marker.
 * Only riders with role 'rider' are scored.
 */
function computeRiderStates(eventId, markerKm, nowMs = Date.now()) {
  const { freshMin, marginKm } = getThresholds();
  const riders = db.getRidersByEvent.all(eventId).filter(r => (r.role || 'rider') === 'rider');
  const latestByRider = new Map(
    db.getLatestPositionsByEvent.all(eventId).map(p => [p.rider_id, p])
  );
  const ledgerStatus = new Map(
    db.getVirtualDnfByEvent.all(eventId).map(v => [v.rider_id, v.status])
  );

  return riders.map(rider => {
    const pos = latestByRider.get(rider.id);
    const base = {
      rider_id: rider.id,
      bib: rider.bib,
      name: rider.name,
      color: rider.color,
      role: rider.role || 'rider'
    };

    const ledgerState = ledgerStatus.get(rider.id);
    if (ledgerState === 'ACTIVE' || ledgerState === 'VOID') {
      return { ...base, state: ledgerState === 'ACTIVE' ? 'DNF' : 'VOID', rider_km: pos ? round(Number(pos.distance_km) || 0, 2) : null, last_seen_at: pos ? pos.recorded_at : null, age_min: null };
    }
    if (!pos) {
      return { ...base, state: 'NO_DATA', rider_km: null, last_seen_at: null, age_min: null };
    }

    const seenMs = Date.parse(pos.recorded_at);
    const ageMin = Number.isFinite(seenMs) ? (nowMs - seenMs) / 60000 : Infinity;
    const riderKm = round(Number(pos.distance_km) || 0, 3);

    let state;
    if (!Number.isFinite(ageMin) || ageMin > freshMin) state = 'STALE';
    else if (riderKm >= markerKm - marginKm) state = 'AHEAD';
    else state = 'BEHIND';

    return {
      ...base,
      state,
      rider_km: riderKm,
      last_seen_at: pos.recorded_at,
      age_min: Number.isFinite(ageMin) ? round(ageMin, 1) : null
    };
  });
}

/**
 * Core evaluation. Pure computation + optional DNF insert.
 * @param {number} eventId
 * @param {{event?: object, nowMs?: number, preview?: boolean}} opts
 */
function evaluateVirtualCot(eventId, opts = {}) {
  const event = opts.event || db.getEventById.get(eventId);
  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  if (!event) return { eventId, state: 'off', reason: 'event_not_found', candidates: [], inserted: [], states: [], marker: null };

  const marker = computeMarker(event, nowMs);
  const base = { eventId, nowMs, marker };

  if (!event.active && !opts.preview) return { ...base, state: 'off', reason: 'event_inactive', candidates: [], inserted: [], states: [] };
  if (!marker.enabled) return { ...base, state: 'off', reason: 'not_configured', candidates: [], inserted: [], states: [] };
  if (!isFeatureEnabled()) return { ...base, state: 'disabled', reason: 'kill_switch', candidates: [], inserted: [], states: [] };
  if (marker.mode === 'off') return { ...base, state: 'off', reason: 'mode_off', candidates: [], inserted: [], states: [] };
  if (marker.status === 'NOT_STARTED') return { ...base, state: 'not_started', reason: null, candidates: [], inserted: [], states: [] };
  if (marker.status === 'FINISHED') return { ...base, state: 'finished', reason: null, candidates: [], inserted: [], states: [] };
  if (!(marker.routeLengthKm > 0)) return { ...base, state: 'deferred', reason: 'no_route', candidates: [], inserted: [], states: [] };
  if (marker.latitude == null || marker.longitude == null) return { ...base, state: 'deferred', reason: 'no_coordinates', candidates: [], inserted: [], states: [] };

  const { gapMin } = getThresholds();
  const newest = db.getNewestPositionAtByEvent.get(eventId);
  const newestMs = newest && newest.newest ? Date.parse(newest.newest) : NaN;
  if (!Number.isFinite(newestMs)) {
    return { ...base, state: 'deferred', reason: 'data_gap', candidates: [], inserted: [], states: [] };
  }
  if ((nowMs - newestMs) / 60000 > gapMin) {
    return { ...base, state: 'deferred', reason: 'data_gap', candidates: [], inserted: [], states: [] };
  }

  const states = computeRiderStates(eventId, marker.distanceKm, nowMs);
  const candidates = states.filter(s => s.state === 'BEHIND');
  const preview = opts.preview === true || marker.mode === 'dry_run';

  const inserted = [];
  if (!preview && candidates.length > 0) {
    const insertAll = db.db.transaction((rows) => {
      for (const row of rows) {
        const info = db.insertVirtualDnf.run({
          event_id: eventId,
          rider_id: row.rider_id,
          cot_km: marker.distanceKm,
          rider_km: row.rider_km,
          last_seen_at: row.last_seen_at
        });
        if (info.changes > 0) inserted.push(row.rider_id);
      }
    });
    insertAll(candidates);
  }

  return {
    ...base,
    state: preview ? 'dry_run' : 'ok',
    reason: null,
    states,
    candidates,
    inserted
  };
}

/**
 * Throttled evaluation used by read endpoints.
 */
function evaluateThrottled(eventId, opts = {}) {
  const { evalTtlMs } = getThresholds();
  const useCache = !opts.force && !Number.isFinite(opts.nowMs);
  if (useCache) {
    const cached = EVAL_CACHE.get(eventId);
    if (cached && Date.now() - cached.at < evalTtlMs) return cached.value;
  }

  const value = evaluateVirtualCot(eventId, opts);
  EVAL_CACHE.set(eventId, { at: Date.now(), value });
  return value;
}

function invalidateEvaluation(eventId) {
  if (eventId == null) EVAL_CACHE.clear();
  else EVAL_CACHE.delete(Number(eventId));
}

/**
 * Snapshot of the DNF ledger for an event.
 */
function getDnfLedger(eventId) {
  return db.getVirtualDnfByEvent.all(eventId).map(row => ({
    rider_id: row.rider_id,
    bib: row.bib,
    name: row.name,
    color: row.color,
    status: row.status,
    cot_km: row.cot_km,
    rider_km: row.rider_km,
    last_seen_at: row.last_seen_at,
    marked_at: row.marked_at,
    voided_at: row.voided_at,
    void_reason: row.void_reason
  }));
}

function voidDnf(eventId, riderId, reason) {
  const info = db.voidVirtualDnf.run({ event_id: Number(eventId), rider_id: Number(riderId), reason: String(reason || '').trim() || 'Tanpa alasan' });
  if (info.changes > 0) invalidateEvaluation(eventId);
  return info.changes > 0;
}

/**
 * Full status payload for GET /api/events/:id/virtual-cot.
 */
function buildStatus(event, nowMs = Date.now(), opts = {}) {
  const marker = computeMarker(event, nowMs);

  let evaluation = null;
  if (marker.enabled && marker.mode !== 'off') {
    const result = evaluateThrottled(event.id, {
      event,
      nowMs: opts.nowMs,
      force: opts.force,
      preview: marker.mode === 'dry_run'
    });
    evaluation = {
      state: result.state,
      reason: result.reason,
      candidates: result.candidates.length,
      inserted: result.inserted.length
    };
  }

  // Read the ledger after evaluation so newly recorded DNFs are reflected immediately
  const newest = db.getNewestPositionAtByEvent.get(event.id);
  const newestMs = newest && newest.newest ? Date.parse(newest.newest) : NaN;
  const ledger = getDnfLedger(event.id);
  const active = ledger.filter(row => row.status === 'ACTIVE');

  return {
    enabled: marker.enabled,
    configured: marker.enabled,
    mode: marker.mode,
    start_time: marker.startTime,
    start_ms: marker.startMs,
    pace: marker.pace,
    status: marker.status,
    distance_km: marker.distanceKm,
    latitude: marker.latitude,
    longitude: marker.longitude,
    route_length_km: marker.routeLengthKm,
    last_telemetry_age_sec: Number.isFinite(newestMs) ? Math.max(0, Math.round((nowMs - newestMs) / 1000)) : null,
    dnf_count: active.length,
    dnf_riders: active.map(row => ({ rider_id: row.rider_id, bib: row.bib, rider_km: row.rider_km, cot_km: row.cot_km })),
    dnf_by_reason: { VIRTUAL_COT: active.length },
    evaluation
  };
}

module.exports = {
  WIB_OFFSET_MS,
  wibToEpochMs,
  parseGpxPoints,
  loadRoute,
  pointAtKm,
  getConfig,
  computeMarker,
  computeRiderStates,
  evaluateVirtualCot,
  evaluateThrottled,
  invalidateEvaluation,
  getDnfLedger,
  voidDnf,
  buildStatus,
  getThresholds,
  isFeatureEnabled
};
