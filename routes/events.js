const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db/database');
const { requireAdminAuth } = require('../lib/admin-auth');
const { sanitizeEvent, normalizeAccessPin, requireEventAccess: buildEventAccessGuard, isAccessPinRequired, verifyAccessPin, getClientIp, isThrottled, recordFailedAttempt, clearFailedAttempts, getThrottleRetryAfterSeconds } = require('../lib/event-access');
const virtualCot = require('../lib/virtual-cot');

const gpxDir = path.join(__dirname, '..', 'public', 'gpx');
if (!fs.existsSync(gpxDir)) fs.mkdirSync(gpxDir, { recursive: true });

const sponsorUploadDir = path.join(__dirname, '..', 'public', 'uploads', 'sponsors');
if (!fs.existsSync(sponsorUploadDir)) fs.mkdirSync(sponsorUploadDir, { recursive: true });

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

const sponsorStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, sponsorUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `sponsor-${uniqueSuffix}${ext}`);
  }
});

const uploadSponsorLogo = multer({
  storage: sponsorStorage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      const err = new Error('Hanya file gambar (.png, .jpg, .jpeg, .svg, .webp) yang diperbolehkan');
      err.status = 400;
      cb(err);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

function sanitizeSponsorLink(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/i.test(trimmed)) return `https://${trimmed}`;
  return null;
}

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
  const countStmt = db.db.prepare('SELECT COUNT(*) as c FROM riders WHERE event_id = ?');
  const events = db.getAllEvents.all().map(ev => {
    let riderCount = 0;
    try {
      const row = countStmt.get(ev.id);
      if (row) riderCount = Number(row.c) || 0;
    } catch {}
    return {
      ...sanitizeEvent(ev),
      distance_km: getEventDistanceKm(ev),
      rider_count: riderCount
    };
  });
  res.json(events);
});

// GET /api/events/:id — event detail
router.get('/:id', (req, res) => {
  const event = db.getEventById.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });
  let riderCount = 0;
  try {
    const row = db.db.prepare('SELECT COUNT(*) as c FROM riders WHERE event_id = ?').get(event.id);
    if (row) riderCount = Number(row.c) || 0;
  } catch {}
  res.json({
    ...sanitizeEvent(event),
    distance_km: getEventDistanceKm(event),
    rider_count: riderCount
  });
});

// ── Protected event routes (require event access PIN if configured) ─────────

/**
 * Middleware to check if user has access to a PIN-protected event.
 * Bypasses check for admins. For public access, accepts ?pin=XXXX (legacy
 * links) or the `x-event-pin` header. Shared with results/history/GPX guards.
 */
const requireEventAccess = buildEventAccessGuard();

// POST /api/events/:id/verify-pin — verify event access PIN for riders / viewers
router.post('/:id/verify-pin', (req, res) => {
  const eventId = req.params.id;
  const event = db.getEventById.get(eventId);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });

  // If event has no access PIN, it's always open
  if (!isAccessPinRequired(event)) {
    return res.json({ success: true, access_pin_required: false });
  }

  const ip = getClientIp(req);
  const { pin } = req.body || {};

  // A correct PIN is always accepted, so a throttled spectator who finally
  // receives the right PIN is not locked out for the rest of the window.
  if (pin && verifyAccessPin(event, pin)) {
    clearFailedAttempts(ip, event.id);
    return res.json({ success: true, access_pin_required: true });
  }

  recordFailedAttempt(ip, event.id);
  if (isThrottled(ip, event.id)) {
    res.set('Retry-After', String(getThrottleRetryAfterSeconds(ip, event.id)));
    return res.status(429).json({
      success: false,
      error: 'Terlalu banyak percobaan PIN akses. Coba lagi beberapa menit lagi.'
    });
  }

  return res.status(401).json({
    success: false,
    error: 'PIN Akses Event salah. Periksa kembali PIN dari panitia.'
  });
});

// GET /api/events/:id/riders — public rider list (no PIN)
// Protected by event access PIN if configured
router.get('/:id/riders', requireEventAccess, (req, res) => {
  const riders = db.getRidersByEvent.all(req.params.id).map(r => ({
    id: r.id, bib: r.bib, name: r.name,
    role: r.role || 'rider',
    traccar_device_id: r.traccar_device_id,
    color: r.color
  }));
  res.json(riders);
});

// GET /api/events/:id/virtual-cot — live marker + DNF evaluation (public)
// Protected by event access PIN if configured
router.get('/:id/virtual-cot', requireEventAccess, (req, res) => {
  const event = req.event || db.getEventById.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });
  res.json(virtualCot.buildStatus(event));
});

// GET & POST /api/events/:id/virtual-cot/preview — dry-run candidates (admin)
function handleCotPreview(req, res) {
  const event = db.getEventById.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });

  // Normalise first so cot_start_ms is recomputed from cot_start_time; a raw
  // body would keep the stale epoch and place the marker at the wrong km.
  let cotFields;
  try {
    cotFields = normalizeCotInput(req.body, event);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  const preview = buildCotPreview(event.id, cotFields);
  res.json({
    event_id: event.id,
    mode: cotFields.cot_mode || event.cot_mode || 'off',
    ...preview,
    ledger: virtualCot.getDnfLedger(event.id)
  });
}
router.get('/:id/virtual-cot/preview', requireAdminAuth, handleCotPreview);
router.post('/:id/virtual-cot/preview', requireAdminAuth, handleCotPreview);

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
// Protected by event access PIN if configured
router.get('/:id/gpx/download', requireEventAccess, (req, res) => {
  const event = req.event || db.getEventById.get(req.params.id);
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

// GET /api/events/:id/sponsors — sponsor logo strip data (public)
router.get('/:id/sponsors', (req, res) => {
  const event = db.getEventById.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });
  const sponsors = db.getSponsorsByEvent.all(req.params.id);
  res.json(sponsors.map(s => ({
    ...s,
    link: sanitizeSponsorLink(s.link)
  })));
});

// POST /api/events/admin/:id/sponsors — create sponsor for event
router.post('/admin/:id/sponsors', requireAdminAuth, (req, res) => {
  uploadSponsorLogo.single('logo')(req, res, (err) => {
    if (err) return res.status(err.status || 400).json({ error: err.message });

    const eventId = Number(req.params.id);
    const event = db.getEventById.get(eventId);
    if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });

    const { name, link, sort_order, logo_path } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama sponsor wajib diisi' });
    }

    let resolvedLogo = '';
    if (req.file) {
      resolvedLogo = `/uploads/sponsors/${req.file.filename}`;
    } else if (logo_path && logo_path.trim()) {
      resolvedLogo = logo_path.trim();
    } else {
      return res.status(400).json({ error: 'Logo wajib di-upload atau berupa path/URL gambar' });
    }

    const cleanLink = sanitizeSponsorLink(link);
    const order = Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0;

    const result = db.createSponsor.run({
      event_id: eventId,
      name: name.trim(),
      logo_path: resolvedLogo,
      link: cleanLink,
      sort_order: order
    });

    const newSponsor = db.getSponsorById.get(result.lastInsertRowid);
    res.status(201).json({ success: true, sponsor: newSponsor });
  });
});

// DELETE /api/events/admin/sponsors/:id — delete sponsor
router.delete('/admin/sponsors/:id', requireAdminAuth, (req, res) => {
  const sponsor = db.getSponsorById.get(req.params.id);
  if (!sponsor) return res.status(404).json({ error: 'Sponsor tidak ditemukan' });

  // Delete uploaded logo file if managed by CycloPon (starts with /uploads/sponsors/sponsor-)
  if (sponsor.logo_path && sponsor.logo_path.startsWith('/uploads/sponsors/sponsor-')) {
    const filename = path.basename(sponsor.logo_path);
    const targetFile = path.join(sponsorUploadDir, filename);
    try {
      if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);
    } catch {}
  }

  db.deleteSponsor.run(req.params.id);
  res.json({ success: true, message: 'Sponsor berhasil dihapus' });
});

module.exports = router;
