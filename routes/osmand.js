const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Universal body parsers for Traccar Client / OsmAnd payloads (form-urlencoded, text, JSON)
router.use(express.urlencoded({ extended: true, limit: '1mb' }));
router.use(express.text({ type: ['text/*', 'application/octet-stream', 'application/x-www-form-urlencoded'] }));

let wsBroadcastFn = null;
try {
  const wsProxy = require('../lib/traccar-ws-proxy');
  wsBroadcastFn = wsProxy.broadcastToClients;
} catch (e) {
  console.warn('[OsmAnd API] WebSocket proxy not loaded:', e.message);
}

function calcHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// In-memory cache for last coordinates and odometer distance to prevent DB hammering
const lastCoords = new Map(); // rider_id -> { lat, lon, totalKm, lastTime }

/**
 * Universal OsmAnd / Traccar Client Protocol Handler
 * Accepts GET and POST from Traccar Client app (Android / iOS)
 * e.g. /api/osmand?id=195&lat=-7.123&lon=107.123&speed=5.2&timestamp=1731640000&batt=85
 */
async function handleOsmandPosition(req, res) {
  try {
    let bodyObj = {};
    if (typeof req.body === 'object' && req.body !== null) {
      bodyObj = req.body;
    } else if (typeof req.body === 'string' && req.body.trim()) {
      try {
        bodyObj = Object.fromEntries(new URLSearchParams(req.body));
      } catch (e) {}
    }

    const source = { ...req.query, ...bodyObj };
    const rawId = source.id || source.deviceid || source.deviceId;
    const rawLat = source.lat || source.latitude;
    const rawLon = source.lon || source.longitude || source.lng;

    if (!rawId || rawLat == null || rawLon == null) {
      return res.status(400).send('Missing id, lat, or lon parameter');
    }

    const lat = parseFloat(rawLat);
    const lon = parseFloat(rawLon);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).send('Invalid latitude/longitude coordinates');
    }

    // Resolve Rider by BIB, traccar_device_id, or ID
    const devStr = String(rawId).trim();
    const cleanDev = devStr.replace(/^BIB-?/i, '').trim();
    const strippedZero = cleanDev.replace(/^0+/, '') || '0';
    const pad3 = cleanDev.padStart(3, '0');
    const pad4 = cleanDev.padStart(4, '0');

    let rider = null;
    try {
      rider = db.db.prepare(`
        SELECT * FROM riders 
        WHERE bib = ? OR bib = ? OR bib = ? OR bib = ? OR bib = ? OR bib = ?
           OR traccar_device_id = ?
           OR id = ?
        ORDER BY id DESC
        LIMIT 1
      `).get(
        cleanDev,
        devStr,
        `BIB-${cleanDev}`,
        strippedZero,
        pad3,
        pad4,
        Number(cleanDev) || 0,
        Number(cleanDev) || 0
      );
    } catch (e) {
      console.warn('[OsmAnd API] Error querying rider:', e.message);
    }

    // If still not found, check if there's only 1 rider in the system (testing convenience)
    if (!rider) {
      try {
        const allRiders = db.db.prepare('SELECT * FROM riders').all();
        if (allRiders && allRiders.length === 1) {
          rider = allRiders[0];
        }
      } catch (e) {}
    }

    if (!rider) {
      console.warn(`[OsmAnd API] Telemetry received for unregistered device ID: "${devStr}"`);
      // Return 200 OK so Traccar Client does not flood retries or drain battery
      return res.status(200).send('OK (Rider not found)');
    }

    // Throttle writes per rider: minimum 1000ms between records
    const now = Date.now();
    const prev = lastCoords.get(rider.id);
    if (prev && now - prev.lastTime < 1000) {
      return res.status(200).send('OK (Throttled)');
    }

    // Calculate speed: OsmAnd protocol in Traccar sends knots by default
    const rawSpeed = parseFloat(source.speed || 0);
    // If rawSpeed > 70 it's likely already in km/h, otherwise convert knots to km/h (1 knot = 1.852 km/h)
    const speedKmh = rawSpeed > 70 ? rawSpeed : Math.round(rawSpeed * 1.852 * 10) / 10;

    // Battery percentage
    const rawBatt = source.batt || source.battery;
    const battPct = rawBatt != null ? Math.round(Number(rawBatt)) : null;

    // Cumulative distance calculation
    let totalDistKm = 0;
    if (prev) {
      const delta = calcHaversineKm(prev.lat, prev.lon, lat, lon);
      if (delta >= 0.003 && delta < 2.0) {
        totalDistKm = Math.round((prev.totalKm + delta) * 100) / 100;
      } else {
        totalDistKm = prev.totalKm;
      }
    } else {
      try {
        const lastRow = db.db.prepare(
          'SELECT distance_km FROM position_history WHERE rider_id = ? ORDER BY id DESC LIMIT 1'
        ).get(rider.id);
        totalDistKm = lastRow && lastRow.distance_km ? Number(lastRow.distance_km) : 0;
      } catch (e) {
        totalDistKm = 0;
      }
    }

    lastCoords.set(rider.id, { lat, lon, totalKm: totalDistKm, lastTime: now });

    // Timestamp
    let recordedAt = new Date().toISOString();
    const rawTime = source.timestamp || source.time;
    if (rawTime) {
      const numTime = Number(rawTime);
      if (!isNaN(numTime)) {
        // If seconds (10 digits), convert to ms
        const ms = numTime < 10000000000 ? numTime * 1000 : numTime;
        recordedAt = new Date(ms).toISOString();
      }
    }

    // 1. Record in position_history
    db.recordPositionHistory.run({
      event_id:    rider.event_id,
      rider_id:    rider.id,
      latitude:    lat,
      longitude:   lon,
      speed:       speedKmh,
      distance_km: totalDistKm,
      recorded_at: recordedAt
    });

    // 2. Broadcast via WebSocket to all spectators on Live Map
    if (typeof wsBroadcastFn === 'function') {
      const devId = rider.traccar_device_id || (rider.bib ? Number(rider.bib) : rider.id) || rider.id;
      const wsPosition = {
        deviceId:    devId,
        rider_id:    rider.id,
        latitude:    lat,
        longitude:   lon,
        speed:       speedKmh,
        isKmh:       true,
        distance_km: totalDistKm,
        fixTime:     recordedAt,
        attributes:  battPct != null ? { batteryLevel: battPct } : {}
      };
      wsBroadcastFn(JSON.stringify({ positions: [wsPosition] }), rider.event_id);
    }

    // Standard OsmAnd response: HTTP 200 with text "OK"
    return res.status(200).send('OK');
  } catch (err) {
    console.error('[OsmAnd API] Error processing telemetry:', err);
    return res.status(500).send('Server Error');
  }
}

router.get('/', handleOsmandPosition);
router.post('/', handleOsmandPosition);

module.exports = router;
