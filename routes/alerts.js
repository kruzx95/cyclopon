const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const notifications = require('../lib/notifications');

// POST /api/events/:id/alerts — create a new alert (SOS, crash, etc.)
router.post('/events/:id/alerts', (req, res) => {
  const event_id = Number(req.params.id);
  const { rider_id, type, latitude, longitude, message } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'type alert wajib diisi' });
  }

  const result = db.createAlert.run({
    event_id,
    rider_id:  rider_id ? Number(rider_id) : null,
    type,
    latitude:  latitude != null ? Number(latitude) : null,
    longitude: longitude != null ? Number(longitude) : null,
    message:   message || ''
  });

  const created = db.getAlertById.get(result.lastInsertRowid);
  res.status(201).json({ success: true, alert: created });

  // Asynchronously dispatch external notifications (non-blocking)
  setImmediate(async () => {
    try {
      const event = db.getEventById.get(event_id);
      const rider = rider_id ? db.getRiderById.get(Number(rider_id)) : null;
      await notifications.dispatchSosNotification({ event, rider, alert: created });
    } catch (err) {
      console.warn('[Alerts] Gagal mengirim notifikasi SOS:', err.message);
    }
  });
});

// GET /api/events/:id/alerts — fetch alerts for event (filter with ?active=1)
router.get('/events/:id/alerts', (req, res) => {
  const event_id = Number(req.params.id);
  const activeOnly = req.query.active === '1' || req.query.active === 'true';

  const alerts = activeOnly
    ? db.getActiveAlertsByEvent.all(event_id)
    : db.getAlertsByEvent.all(event_id);

  res.json(alerts);
});

// PUT /api/alerts/:id/resolve — resolve an alert
router.put('/alerts/:id/resolve', (req, res) => {
  const id = Number(req.params.id);
  db.resolveAlert.run(id);
  const updated = db.getAlertById.get(id);
  res.json({ success: true, alert: updated });
});

module.exports = router;
