const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db/database');
const { requireAdminAuth } = require('../lib/admin-auth');
const { sanitizeEvent, normalizeAccessPin } = require('../lib/event-access');
const virtualCot = require('../lib/virtual-cot');

const gpxDir = path.join(__dirname, '..', 'public', 'gpx');
if (!fs.existsSync(gpxDir)) fs.mkdirSync(gpxDir, { recursive: true });

const upload = multer({
  dest: gpxDir,
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.gpx')) {
      cb(null, true);
    } else {
      const err = new Error('Hanya file .gpx yang diperbolehkan');
      err.status = 400;
      cb(err);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// In-memory cache for computed event distance (km)
const eventDistanceCache = new Map();

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
  let fileMtime = 0;
  try {
    if (fs.existsSync(gpxFilePath)) {
      fileMtime = fs.statSync(gpxFilePath).mtimeMs;
    }
  } catch {}

  const cacheKey = `${event.id}:${fileMtime}`;
  if (eventDistanceCache.has(cacheKey)) {
    return eventDistanceCache.get(cacheKey);
  }

  // 1. Calculate from GPX file if available
  if (fileMtime > 0) {
    try {
      const gpxText = fs.readFileSync(gpxFilePath, 'utf8');
      const ptRegex = /<(?:trkpt|rtept)[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"/gi;
      let match;
      const coords = [];
      while ((match = ptRegex.exec(gpxText)) !== null) {
        const lat = parseFloat(match[1]);
        const lon = parseFloat(match[2]);
        if (!isNaN(lat) && !isNaN(lon)) {
          coords.push([lat, lon]);
        }
      }
      if (coords.length > 1) {
        let total = 0;
        for (let i = 1; i < coords.length; i++) {
          total += haversineDistance(coords[i-1][0], coords[i-1][1], coords[i][0], coords[i][1]);
        }
        const distKm = Math.round(total * 10) / 10;
        eventDistanceCache.set(cacheKey, distKm);
        return distKm;
      }
    } catch (e) {
      console.warn(`[Events] Failed to parse GPX distance for event ${event.id}:`, e.message);
    }
  }

  // 2. Fallback: check checkpoints table for max target KM
  try {
    const cp = db.db.prepare('SELECT MAX(km_distance) AS max_km FROM checkpoints WHERE event_id = ?').get(event.id);
    if (cp && cp.max_km > 0) {
      const distKm = Math.round(cp.max_km * 10) / 10;
      eventDistanceCache.set(cacheKey, distKm);
      return distKm;
    }
  } catch {}

  eventDistanceCache.set(cacheKey, 0);
  return 0;
}

// ── Virtual COT helpers ───────────────────────────────────────
const COT_MODES = ['off', 'dry_run', 'live'];

function hasBodyField(body, key) {
  return Object.prototype.hasOwnProperty.call(body || {}, key);
}

/**
 * Normalise Virtual COT fields from an admin payload.
 * Falls back to the existing event values for fields that are not sent.
 */
function normalizeCotInput(body, event) {
  const source = body || {};
  const base = event || {};

  let startTime = hasBodyField(source, 'cot_start_time')
    ? (source.cot_start_time ? String(source.cot_start_time).trim() : null)
    : (base.cot_start_time || null);
  if (startTime && !/^\d{1,2}:\d{2}$/.test(startTime)) {
    const err = new Error('cot_start_time harus berformat HH:MM');
    err.status = 400;
    throw err;
  }

  let pace = hasBodyField(source, 'cot_pace')
    ? (source.cot_pace === '' || source.cot_pace == null ? null : Number(source.cot_pace))
    : (base.cot_pace != null ? Number(base.cot_pace) : null);
  if (pace != null && (!Number.isFinite(pace) || pace <= 0)) {
    const err = new Error('cot_pace harus berupa angka km/jam lebih dari 0');
    err.status = 400;
    throw err;
  }

  let mode = hasBodyField(source, 'cot_mode')
    ? String(source.cot_mode || 'off').trim().toLowerCase()
    : (base.cot_mode || null);
  if (mode == null) mode = startTime && pace ? 'dry_run' : 'off';
  if (!COT_MODES.includes(mode)) {
    const err = new Error('cot_mode harus salah satu dari: off, dry_run, live');
    err.status = 400;
    throw err;
  }

  const startMs = startTime && pace
    ? virtualCot.wibToEpochMs(base.date, startTime)
    : null;
  if (startTime && pace && startMs == null) {
    const err = new Error('Tidak dapat menghitung waktu mulai COT dari tanggal event');
    err.status = 400;
    throw err;
  }

  return {
    cot_start_time: startTime || null,
    cot_start_ms: startMs,
    cot_pace: pace,
    cot_mode: mode
  };
}

/**
 * Dry-run evaluation against a prospective configuration (no writes).
 */
function buildCotPreview(eventId, cotFields) {
  const event = db.getEventById.get(eventId);
  const prospective = { ...event, ...(cotFields || {}) };
  const nowMs = Date.now();
  const marker = virtualCot.computeMarker(prospective, nowMs);
  const riders = db.getRidersByEvent.all(eventId).filter(r => (r.role || 'rider') === 'rider');

  let states = [];
  let evaluation = null;
  if (marker.enabled && marker.mode !== 'off') {
    const result = virtualCot.evaluateVirtualCot(eventId, { event: prospective, nowMs, preview: true });
    states = result.states || [];
    evaluation = { state: result.state, reason: result.reason };
  }

  return {
    marker,
    riders_total: riders.length,
    candidates: states.filter(s => s.state === 'BEHIND'),
    stale: states.filter(s => s.state === 'STALE'),
    states,
    evaluation
  };
}

// ── Public routes ─────────────────────────────────────────────

// GET /api/events — list all events
router.get('/', (_req, res) => {
  const events = db.getAllEvents.all().map(ev => ({
    ...sanitizeEvent(ev),
    distance_km: getEventDistanceKm(ev)
  }));
  res.json(events);
});

// GET /api/events/:id — event detail
router.get('/:id', (req, res) => {
  const event = db.getEventById.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });
  res.json({
    ...sanitizeEvent(event),
    distance_km: getEventDistanceKm(event)
  });
});

// GET /api/events/:id/riders — public rider list (no PIN)
router.get('/:id/riders', (req, res) => {
  const riders = db.getRidersByEvent.all(req.params.id).map(r => ({
    id: r.id, bib: r.bib, name: r.name,
    role: r.role || 'rider',
    traccar_device_id: r.traccar_device_id,
    color: r.color
  }));
  res.json(riders);
});

// GET /api/events/:id/virtual-cot — live marker + DNF evaluation (public)
router.get('/:id/virtual-cot', (req, res) => {
  const event = db.getEventById.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });
  res.json(virtualCot.buildStatus(event));
});

// GET /api/events/:id/virtual-cot/preview — dry-run candidates (admin)
router.get('/:id/virtual-cot/preview', requireAdminAuth, (req, res) => {
  const event = db.getEventById.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });

  const preview = buildCotPreview(event.id, {});
  res.json({
    event_id: event.id,
    mode: event.cot_mode || 'off',
    ...preview,
    ledger: virtualCot.getDnfLedger(event.id)
  });
});

// GET /api/events/:id/virtual-cot/dnf — DNF ledger (admin)
router.get('/:id/virtual-cot/dnf', requireAdminAuth, (req, res) => {
  const event = db.getEventById.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });
  res.json({ event_id: event.id, ledger: virtualCot.getDnfLedger(event.id) });
});

// POST /api/events/:id/virtual-cot/void/:riderId — void a DNF (admin)
router.post('/:id/virtual-cot/void/:riderId', requireAdminAuth, (req, res) => {
  const event = db.getEventById.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });

  const reason = String((req.body || {}).reason || '').trim();
  if (!reason) return res.status(400).json({ error: 'Alasan pembatalan (reason) wajib diisi' });

  const riderId = Number(req.params.riderId);
  const row = db.getVirtualDnfByRider.get(riderId);
  if (!row || Number(row.event_id) !== Number(event.id)) {
    return res.status(404).json({ error: 'Catatan DNF tidak ditemukan untuk rider ini' });
  }
  if (row.status !== 'ACTIVE') {
    return res.status(409).json({ error: 'DNF ini sudah dibatalkan sebelumnya' });
  }

  const ok = virtualCot.voidDnf(event.id, riderId, reason);
  if (!ok) return res.status(409).json({ error: 'Gagal membatalkan DNF' });

  res.json({ success: true, ledger: virtualCot.getDnfLedger(event.id) });
});

// GET /api/events/:id/gpx/download — download GPX file for bike computers
router.get('/:id/gpx/download', (req, res) => {
  const event = db.getEventById.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });

  const targetPath = path.join(gpxDir, `${event.id}.gpx`);
  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ error: 'File GPX untuk event ini belum diunggah' });
  }

  const safeName = (event.name || `event_${event.id}`)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/__+/g, '_');

  res.setHeader('Content-Type', 'application/gpx+xml');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}_Route.gpx"`);
  res.sendFile(targetPath);
});

// ── Admin routes ──────────────────────────────────────────────

// GET /api/events/admin/:id — full event detail including the access PIN
router.get('/admin/:id', requireAdminAuth, (req, res) => {
  const event = db.getEventById.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });
  res.json({
    ...event,
    distance_km: getEventDistanceKm(event)
  });
});

// POST /api/events/admin — create new event
router.post('/admin', requireAdminAuth, (req, res, next) => {
  try {
    const { name, date } = req.body || {};
    if (!name || !date) return res.status(400).json({ error: 'name dan date wajib diisi' });

    const cot = normalizeCotInput(req.body, { date });
    const accessPin = normalizeAccessPin((req.body || {}).access_pin);
    const result = db.createEvent.run({ name, date });
    const eventId = Number(result.lastInsertRowid);
    db.updateEventCot.run({ id: eventId, ...cot });
    db.updateEventAccessPin.run(accessPin, eventId);
    virtualCot.invalidateEvaluation(eventId);

    res.status(201).json(db.getEventById.get(eventId));
  } catch (err) {
    next(err);
  }
});

// PUT /api/events/admin/:id — update event
router.put('/admin/:id', requireAdminAuth, (req, res, next) => {
  try {
    const event = db.getEventById.get(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });

    const body = req.body || {};
    const nextDate = body.date ?? event.date;
    const cot = normalizeCotInput(body, { ...event, date: nextDate });
    const accessPin = Object.prototype.hasOwnProperty.call(body, 'access_pin')
      ? normalizeAccessPin(body.access_pin)
      : (event.access_pin || null);

    // Guard: activating `live` for the first time may not silently DNF a large share of the field
    const becomingLive = cot.cot_mode === 'live' && event.cot_mode !== 'live';
    if (becomingLive && body.force !== true) {
      const preview = buildCotPreview(event.id, cot);
      if (preview.riders_total > 0 && preview.candidates.length > preview.riders_total * 0.2) {
        return res.status(409).json({
          error: 'Aktivasi COT dibatalkan: lebih dari 20% rider akan langsung DNF. Periksa jam mulai/pace, atau kirim force: true.',
          preview: {
            riders_total: preview.riders_total,
            candidates: preview.candidates.map(c => ({ bib: c.bib, name: c.name, rider_km: c.rider_km })),
            marker: preview.marker
          }
        });
      }
    }

    db.updateEvent.run({
      id:     event.id,
      name:   body.name ?? event.name,
      date:   nextDate,
      active: body.active ?? event.active
    });
    db.updateEventCot.run({ id: event.id, ...cot });
    db.updateEventAccessPin.run(accessPin, event.id);
    virtualCot.invalidateEvaluation(event.id);

    res.json(db.getEventById.get(event.id));
  } catch (err) {
    next(err);
  }
});

// POST /api/events/admin/:id/gpx — upload GPX file
router.post('/admin/:id/gpx', requireAdminAuth, upload.single('gpx'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File GPX tidak ditemukan dalam request' });

  const tempPath = req.file.path;
  const targetPath = path.join(gpxDir, `${req.params.id}.gpx`);

  try {
    // 1. Verify file content contains valid GPX tags
    const preview = fs.readFileSync(tempPath, { encoding: 'utf8', flag: 'r' }).slice(0, 4000);
    const isGpxContent = preview.includes('<gpx') || preview.includes('<trk') || preview.includes('<rte') || preview.includes('<wpt');
    if (!isGpxContent) {
      try { fs.unlinkSync(tempPath); } catch (e) {}
      return res.status(400).json({ error: 'Berkas bukan format GPX yang valid' });
    }

    // 2. Cross-device safe move (copy + unlink instead of renameSync)
    fs.copyFileSync(tempPath, targetPath);
    try { fs.unlinkSync(tempPath); } catch (e) {}

    const gpxUrl = `/gpx/${req.params.id}.gpx`;
    db.updateEventGpx.run(gpxUrl, req.params.id);
    eventDistanceCache.clear();
    virtualCot.invalidateEvaluation(req.params.id);

    res.json({ success: true, gpx_path: gpxUrl });
  } catch (err) {
    try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (e) {}
    res.status(500).json({ error: 'Gagal memproses file GPX: ' + err.message });
  }
});

// DELETE /api/events/admin/:id — delete event and associated records
router.delete('/admin/:id', requireAdminAuth, (req, res) => {
  const event = db.getEventById.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });

  const targetGpx = path.join(gpxDir, `${event.id}.gpx`);
  if (fs.existsSync(targetGpx)) {
    try { fs.unlinkSync(targetGpx); } catch (e) {}
  }

  db.deleteEvent.run(event.id);
  eventDistanceCache.clear();
  res.json({ success: true, message: `Event #${event.id} berhasil dihapus` });
});

module.exports = router;
