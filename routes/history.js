const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/events/:id/history — Fetch historical telemetry for replay
router.get('/events/:id/history', (req, res) => {
  const eventId = Number(req.params.id);
  const event = db.getEventById.get(eventId);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });

  const { rider_id } = req.query;

  try {
    let history;
    if (rider_id) {
      history = db.getHistoryByEventAndRider.all(eventId, Number(rider_id));
    } else {
      history = db.getHistoryByEvent.all(eventId);
    }
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data history: ' + err.message });
  }
});

// POST /api/events/:id/history — Log single or batch telemetry points
router.post('/events/:id/history', (req, res) => {
  const eventId = Number(req.params.id);
  const event = db.getEventById.get(eventId);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });

  let positions = [];
  if (Array.isArray(req.body.positions)) {
    positions = req.body.positions;
  } else if (req.body.rider_id != null && req.body.latitude != null && req.body.longitude != null) {
    positions = [req.body];
  } else {
    return res.status(400).json({ error: 'Data posisi tidak valid' });
  }

  try {
    const insertTx = db.db.transaction((items) => {
      let count = 0;
      for (const pos of items) {
        db.recordPositionHistory.run({
          event_id: eventId,
          rider_id: Number(pos.rider_id),
          latitude: Number(pos.latitude),
          longitude: Number(pos.longitude),
          speed: Number(pos.speed || 0),
          distance_km: Number(pos.distance_km || 0),
          recorded_at: pos.recorded_at || new Date().toISOString()
        });
        count++;
      }
      return count;
    });

    const inserted = insertTx(positions);
    res.status(201).json({ success: true, inserted });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan history: ' + err.message });
  }
});

module.exports = router;
