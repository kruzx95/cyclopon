const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const notifications = require('../lib/notifications');
const { requireAdminAuth } = require('../lib/admin-auth');

let wsBroadcastFn = null;
try {
  const wsProxy = require('../lib/traccar-ws-proxy');
  wsBroadcastFn = wsProxy.broadcastToClients;
} catch (e) {
  // WebSocket proxy not loaded in standalone test environment
}

// In-memory rate limiter for emergency SOS alerts (max 5 per minute per IP)
const sosRateMap = new Map();
const sosCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of sosRateMap.entries()) {
    if (now - record.resetTime > 60000) sosRateMap.delete(key);
  }
}, 60000);
if (sosCleanupTimer.unref) sosCleanupTimer.unref();

function sosRateLimiter(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  let record = sosRateMap.get(ip);
  if (!record || (now - record.resetTime > 60000)) {
    record = { count: 1, resetTime: now };
    sosRateMap.set(ip, record);
  } else {
    record.count++;
  }

  if (record.count > 5) {
    return res.status(429).json({ error: 'Terlalu banyak panggilan darurat dalam waktu singkat. Harap tunggu 1 menit.' });
  }
  next();
}

// POST /api/events/:id/alerts — create a new alert (SOS, crash, etc.)
router.post('/events/:id/alerts', sosRateLimiter, (req, res) => {
  const event_id = Number(req.params.id);
  const { rider_id, type, message } = req.body;
  let latitude = (req.body.latitude != null ? req.body.latitude : req.body.lat);
  let longitude = (req.body.longitude != null ? req.body.longitude : req.body.lng);

  if (!type) {
    return res.status(400).json({ error: 'type alert wajib diisi' });
  }

  // Verify rider_id exists for this event to prevent FOREIGN KEY violation
  let validRiderId = null;
  let existingRider = null;
  if (rider_id) {
    existingRider = db.getRiderById.get(Number(rider_id));
    if (existingRider && existingRider.event_id === event_id) {
      validRiderId = existingRider.id;
    }
  }

  // Fallback GPS position from rider's latest recorded location in position_history if not provided
  if ((latitude == null || longitude == null || (Number(latitude) === 0 && Number(longitude) === 0)) && validRiderId) {
    try {
      const lastPos = db.db.prepare('SELECT latitude, longitude FROM position_history WHERE rider_id = ? ORDER BY id DESC LIMIT 1').get(validRiderId);
      if (lastPos && lastPos.latitude != null && lastPos.longitude != null) {
        latitude = lastPos.latitude;
        longitude = lastPos.longitude;
      }
    } catch (e) {
      // ignore
    }
  }

  try {
    const result = db.createAlert.run({
      event_id,
      rider_id:  validRiderId,
      type,
      latitude:  latitude != null ? Number(latitude) : null,
      longitude: longitude != null ? Number(longitude) : null,
      message:   message || ''
    });

    const created = db.getAlertById.get(result.lastInsertRowid);
    res.status(201).json({ success: true, alert: created });

    // Immediate real-time WebSocket broadcast to connected Live Map spectators & panitia
    if (typeof wsBroadcastFn === 'function') {
      try {
        const fullAlert = {
          ...created,
          rider_bib:   existingRider?.bib,
          rider_name:  existingRider?.name,
          rider_phone: existingRider?.phone,
          rider_color: existingRider?.color
        };
        wsBroadcastFn(JSON.stringify({
          type: 'alert',
          alerts: [fullAlert]
        }), event_id);
      } catch (wsErr) {
        console.warn('[Alerts] Gagal broadcast WebSocket SOS:', wsErr.message);
      }
    }

    // Asynchronously dispatch external notifications (non-blocking)
    setImmediate(async () => {
      try {
        const event = db.getEventById.get(event_id);
        const rider = validRiderId ? db.getRiderById.get(validRiderId) : null;
        await notifications.dispatchSosNotification({ event, rider, alert: created });
      } catch (err) {
        console.warn('[Alerts] Gagal mengirim notifikasi SOS:', err.message);
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal membuat alert: ' + err.message });
  }
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

// GET /api/admin/alerts/active — fetch all unresolved alerts across all events for admin
router.get('/admin/alerts/active', requireAdminAuth, (req, res) => {
  try {
    const alerts = db.getAllActiveAlerts.all();
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/alerts/:id/resolve — resolve an alert (admin only)
router.put('/alerts/:id/resolve', requireAdminAuth, (req, res) => {
  const id = Number(req.params.id);
  db.resolveAlert.run(id);
  const updated = db.getAlertById.get(id);
  res.json({ success: true, alert: updated });
});

module.exports = router;
