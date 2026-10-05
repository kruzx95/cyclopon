const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db/database');

const gpxDir = path.join(__dirname, '..', 'public', 'gpx');
if (!fs.existsSync(gpxDir)) fs.mkdirSync(gpxDir, { recursive: true });

const upload = multer({
  dest: gpxDir,
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.gpx')) cb(null, true);
    else cb(new Error('Hanya file .gpx yang diperbolehkan'));
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// ── Public routes ─────────────────────────────────────────────

// GET /api/events — list all events
router.get('/', (_req, res) => {
  res.json(db.getAllEvents.all());
});

// GET /api/events/:id — event detail
router.get('/:id', (req, res) => {
  const event = db.getEventById.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });
  res.json(event);
});

// GET /api/events/:id/riders — public rider list (no PIN)
router.get('/:id/riders', (req, res) => {
  const riders = db.getRidersByEvent.all(req.params.id).map(r => ({
    id: r.id, bib: r.bib, name: r.name,
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
router.post('/admin', (req, res) => {
  const { name, date } = req.body;
  if (!name || !date) return res.status(400).json({ error: 'name dan date wajib diisi' });
  const result = db.createEvent.run({ name, date });
  const event  = db.getEventById.get(result.lastInsertRowid);
  res.status(201).json(event);
});

// PUT /api/events/admin/:id — update event
router.put('/admin/:id', (req, res) => {
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
router.post('/admin/:id/gpx', upload.single('gpx'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File GPX tidak ditemukan dalam request' });

  const targetPath = path.join(gpxDir, `${req.params.id}.gpx`);
  fs.renameSync(req.file.path, targetPath);

  const gpxUrl = `/gpx/${req.params.id}.gpx`;
  db.updateEventGpx.run(gpxUrl, req.params.id);

  res.json({ success: true, gpx_path: gpxUrl });
});

module.exports = router;
