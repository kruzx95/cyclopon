const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/events/:id/history/meta — Fetch history metadata (min/max time, count, riders)
router.get('/events/:id/history/meta', (req, res) => {
  const eventId = Number(req.params.id);
  const event = db.getEventById.get(eventId);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });

  try {
    const meta = db.db.prepare(`
      SELECT 
        MIN(recorded_at) as start_time,
        MAX(recorded_at) as end_time,
        COUNT(*) as total_points,
        COUNT(DISTINCT rider_id) as rider_count
      FROM position_history
      WHERE event_id = ?
    `).get(eventId);
    res.json(meta || { start_time: null, end_time: null, total_points: 0, rider_count: 0 });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil metadata history: ' + err.message });
  }
});

// GET /api/events/:id/history — Fetch historical telemetry for replay
router.get('/events/:id/history', (req, res) => {
  const eventId = Number(req.params.id);
  const event = db.getEventById.get(eventId);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });

  const { rider_id, from, to, limit } = req.query;

  try {
    let history;
    const maxLimit = limit ? Math.min(Math.max(1, Number(limit) || 10000), 20000) : 10000;

    let query = `
      SELECT h.*, r.bib as rider_bib, r.name as rider_name, r.color as rider_color
      FROM position_history h
      JOIN riders r ON h.rider_id = r.id
      WHERE h.event_id = ?
    `;
    const params = [eventId];

    if (rider_id) {
      query += ` AND h.rider_id = ?`;
      params.push(Number(rider_id));
    }
    if (from) {
      query += ` AND h.recorded_at >= ?`;
      params.push(String(from));
    }
    if (to) {
      query += ` AND h.recorded_at <= ?`;
      params.push(String(to));
    }

    query += ` ORDER BY h.recorded_at ASC LIMIT ?`;
    params.push(maxLimit);

    history = db.db.prepare(query).all(...params);
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

  // Guard against massive batch payloads (DoS protection)
  if (positions.length > 300) {
    return res.status(400).json({ error: 'Ukuran batch melebihi batas maksimal (300 titik)' });
  }

  try {
    const insertTx = db.db.transaction((items) => {
      let count = 0;
      for (const pos of items) {
        const lat = Number(pos.latitude);
        const lon = Number(pos.longitude);
        if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          continue; // Skip invalid coordinates safely
        }

        db.recordPositionHistory.run({
          event_id: eventId,
          rider_id: Number(pos.rider_id),
          latitude: lat,
          longitude: lon,
          speed: Number(pos.speed || 0),
          distance_km: Number(pos.distance_km || 0),
          recorded_at: pos.recorded_at || new Date().toISOString()
        });
        count++;
      }
      return count;
    });

    const inserted = insertTx(positions);

    try {
      const { broadcastToClients } = require('../lib/traccar-ws-proxy');
      if (typeof broadcastToClients === 'function') {
        const wsPositions = positions.map(pos => {
          const r = db.getRiderById.get(Number(pos.rider_id));
          const devId = (r && r.traccar_device_id) ? r.traccar_device_id : (r && r.bib ? (Number(r.bib) || pos.rider_id) : pos.rider_id);
          const rawBatt = pos.battery != null ? pos.battery : (pos.attributes && pos.attributes.batteryLevel != null ? pos.attributes.batteryLevel : (pos.batteryLevel != null ? pos.batteryLevel : null));
          const attributes = {};
          if (rawBatt != null) {
            attributes.batteryLevel = rawBatt;
          }
          return {
            deviceId: devId,
            rider_id: Number(pos.rider_id),
            latitude: Number(pos.latitude),
            longitude: Number(pos.longitude),
            speed: Number(pos.speed || 0),
            isKmh: true,
            course: Number(pos.course || 0),
            altitude: Number(pos.altitude || 0),
            fixTime: pos.recorded_at || new Date().toISOString(),
            attributes
          };
        });
        broadcastToClients(JSON.stringify({ positions: wsPositions }), eventId);
      }
    } catch (wsErr) {}

    res.status(201).json({ success: true, inserted });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan history: ' + err.message });
  }
});

module.exports = router;
