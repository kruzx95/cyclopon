const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAdminAuth, safeStringCompare } = require('../lib/admin-auth');
const { requireEventAccess } = require('../lib/event-access');
const virtualCot = require('../lib/virtual-cot');

/**
 * Middleware to check event access PIN for protected events.
 * Used for history/replay data, positions, etc.
 */
const requireEventAccessForHistory = requireEventAccess();

// In-memory micro-cache to mitigate high spectator concurrency spikes (TTL: 2s)
const latestPositionsCache = new Map(); // eventId -> { timestamp: number, data: Array }
const LATEST_POSITIONS_TTL_MS = 2000;

function invalidateLatestPositionsCache(eventId) {
  if (eventId != null) {
    latestPositionsCache.delete(Number(eventId));
  } else {
    latestPositionsCache.clear();
  }
}

// GET /api/events/:id/positions/latest — Fetch the single latest position per rider (ultra-fast for live map sync)
router.get('/events/:id/positions/latest', requireEventAccessForHistory, (req, res) => {
  const eventId = Number(req.params.id);
  const now = Date.now();

  // Fast-path: serve from in-memory cache if fresh (< 2s old)
  const cached = latestPositionsCache.get(eventId);
  if (cached && (now - cached.timestamp < LATEST_POSITIONS_TTL_MS)) {
    return res.json(cached.data);
  }

  const event = db.getEventById.get(eventId);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });

  try {
    const route = virtualCot.loadRoute ? virtualCot.loadRoute(eventId) : null;
    const eventDist = (route && route.totalKm > 0) ? route.totalKm : 0;
    const cps = db.getCheckpointsByEvent ? db.getCheckpointsByEvent.all(eventId) : [];
    const totalCps = cps.length;

    const latestRows = db.db.prepare(`
      SELECT 
        h.*, 
        r.bib as rider_bib, 
        r.name as rider_name, 
        r.color as rider_color, 
        r.traccar_device_id,
        agg.max_distance_km
      FROM position_history h
      JOIN riders r ON h.rider_id = r.id
      JOIN (
        SELECT rider_id, MAX(id) AS max_id, MAX(distance_km) AS max_distance_km
        FROM position_history
        WHERE event_id = ?
        GROUP BY rider_id
      ) agg ON agg.max_id = h.id
    `).all(eventId);

    const splits = (totalCps > 0 && db.getSplitsByEvent) ? db.getSplitsByEvent.all(eventId) : [];

    const enriched = latestRows.map(row => {
      const maxKm = Number(row.max_distance_km || row.distance_km || 0);
      let isFinished = false;

      if (totalCps > 0) {
        const clearedCps = splits.filter(s => s.rider_id === row.rider_id).length;
        if (clearedCps >= totalCps) isFinished = true;
      } else if (eventDist > 0) {
        if (maxKm >= (eventDist * 0.95)) isFinished = true;
      }

      return {
        ...row,
        max_distance_km: maxKm,
        is_finished: isFinished
      };
    });

    latestPositionsCache.set(eventId, { timestamp: now, data: enriched || [] });
    res.json(enriched || []);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil posisi terbaru: ' + err.message });
  }
});

// GET /api/events/:id/history/meta — Fetch history metadata (min/max time, count, riders)
router.get('/events/:id/history/meta', requireEventAccessForHistory, (req, res) => {
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
router.get('/events/:id/history', requireEventAccessForHistory, (req, res) => {
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
router.post('/events/:id/history', requireEventAccessForHistory, (req, res) => {
  const eventId = Number(req.params.id);
  const event = db.getEventById.get(eventId);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });

  const isSingle = !Array.isArray(req.body.positions);
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

  const headerRiderToken = req.headers && req.headers['x-rider-token'];

  // For single-position submissions, validate the rider immediately to return explicit errors
  if (isSingle) {
    const singlePos = positions[0];
    const riderId = Number(singlePos.rider_id);
    if (!Number.isInteger(riderId) || riderId <= 0) {
      return res.status(400).json({ error: 'rider_id tidak valid' });
    }
    const rider = db.getRiderById.get(riderId);
    if (!rider || rider.event_id !== eventId) {
      return res.status(400).json({ error: 'Rider tidak valid untuk event ini' });
    }
    const token = headerRiderToken || singlePos.token;
    if (token && rider.token && !safeStringCompare(String(token).trim(), String(rider.token).trim())) {
      return res.status(401).json({ error: 'Token rider tidak valid' });
    }
  }

  try {
    const validPositions = [];
    const riderCache = new Map();

    const insertTx = db.db.transaction((items) => {
      let count = 0;
      for (const pos of items) {
        const lat = Number(pos.latitude);
        const lon = Number(pos.longitude);
        if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          continue; // Skip invalid coordinates safely
        }

        const riderId = Number(pos.rider_id);
        if (!Number.isInteger(riderId) || riderId <= 0) continue;

        let rider = riderCache.get(riderId);
        if (rider === undefined) {
          rider = db.getRiderById.get(riderId) || null;
          riderCache.set(riderId, rider);
        }

        // Rider must exist and belong to this event
        if (!rider || rider.event_id !== eventId) continue;

        // If rider token was provided, verify it
        const token = headerRiderToken || pos.token;
        if (token && rider.token && !safeStringCompare(String(token).trim(), String(rider.token).trim())) {
          continue;
        }

        db.recordPositionHistory.run({
          event_id: eventId,
          rider_id: riderId,
          latitude: lat,
          longitude: lon,
          speed: Number(pos.speed || 0),
          distance_km: Number(pos.distance_km || 0),
          recorded_at: pos.recorded_at || new Date().toISOString()
        });
        count++;
        validPositions.push({ pos, rider });
      }
      return count;
    });

    const inserted = insertTx(positions);

    try {
      const { broadcastToClients } = require('../lib/traccar-ws-proxy');
      if (typeof broadcastToClients === 'function' && validPositions.length > 0) {
        const wsPositions = validPositions.map(({ pos, rider: r }) => {
          const devId = (r && r.traccar_device_id) ? r.traccar_device_id : (r && r.bib ? (Number(r.bib) || pos.rider_id) : pos.rider_id);
          const rawBatt = pos.battery != null ? pos.battery : (pos.attributes && pos.attributes.batteryLevel != null ? pos.attributes.batteryLevel : (pos.batteryLevel != null ? pos.batteryLevel : null));
          const attributes = {};
          if (rawBatt != null) {
            attributes.batteryLevel = rawBatt;
          }
          return {
            deviceId: devId,
            rider_id: Number(pos.rider_id),
            event_id: r ? r.event_id : eventId,
            latitude: Number(pos.latitude),
            longitude: Number(pos.longitude),
            speed: Number(pos.speed || 0),
            isKmh: true,
            course: Number(pos.course || 0),
            altitude: Number(pos.altitude || 0),
            distance_km: Number(pos.distance_km || 0),
            fixTime: pos.recorded_at || new Date().toISOString(),
            attributes
          };
        });
        broadcastToClients(JSON.stringify({ positions: wsPositions }), eventId);
      }
    } catch (wsErr) {}

    invalidateLatestPositionsCache(eventId);
    res.status(201).json({ success: true, inserted });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan history: ' + err.message });
  }
});

// DELETE /api/events/:id/history — Clear all telemetry history for an event (Admin only)
router.delete('/events/:id/history', requireAdminAuth, (req, res) => {
  const eventId = Number(req.params.id);
  const event = db.getEventById.get(eventId);
  if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });

  try {
    const info = db.db.prepare('DELETE FROM position_history WHERE event_id = ?').run(eventId);
    invalidateLatestPositionsCache(eventId);
    res.json({ success: true, message: `Berhasil menghapus ${info.changes} titik jejak GPS untuk event ini.` });
  } catch (err) {
    res.status(500).json({ error: 'Gagal membersihkan history: ' + err.message });
  }
});

module.exports = router;
