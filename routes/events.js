const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db/database');
const { requireAdminAuth } = require('../lib/admin-auth');

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

// ── Public routes ─────────────────────────────────────────────

// GET /api/events — list all events
router.get('/', (_req, res) => {
  const events = db.getAllEvents.all().map(ev => ({
    ...ev,
    distance_km: getEventDistanceKm(ev)
  }));
  res.json(events);
});

// GET /api/events/:id — event detail
router.get('/:id', (req, res) => {
  const event = db.getEventById.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });
  res.json({
    ...event,
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

// POST /api/events/admin — create new event
router.post('/admin', requireAdminAuth, (req, res) => {
  const { name, date } = req.body;
  if (!name || !date) return res.status(400).json({ error: 'name dan date wajib diisi' });
  const result = db.createEvent.run({ name, date });
  const event  = db.getEventById.get(result.lastInsertRowid);
  res.status(201).json(event);
});

// PUT /api/events/admin/:id — update event
router.put('/admin/:id', requireAdminAuth, (req, res) => {
  const event = db.getEventById.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });
  const { name, date, active } = req.body;
  db.updateEvent.run({
    id:     req.params.id,
    name:   name   ?? event.name,
    date:   date   ?? event.date,
    active: active ?? event.active
  });
  res.json(db.getEventById.get(req.params.id));
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
