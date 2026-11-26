const crypto = require('crypto');
const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { requireAdminAuth, isAdminRequest } = require('../lib/admin-auth');
const { requireEventAccess, isAccessPinRequired, verifyAccessPin, getClientIp } = require('../lib/event-access');

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const FRESH_TELEMETRY_MAX_AGE_MS = 2 * 60 * 1000;

// Brute-force protection for inline BIB + PIN check-ins (max 8 failures / 15 min)
const checkinPinAttempts = new Map();
const cpPublicRequests = new Map();
const checkinCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of checkinPinAttempts.entries()) {
    if (now - record.firstAttempt > 15 * 60 * 1000) checkinPinAttempts.delete(key);
  }
  for (const [ip, record] of cpPublicRequests.entries()) {
    if (now - record.resetTime > 60000) cpPublicRequests.delete(ip);
  }
}, 60 * 1000);
if (checkinCleanupTimer.unref) checkinCleanupTimer.unref();

function cpPublicRateLimiter(req, res, next) {
  const ip = getClientIp(req);
  const now = Date.now();
  let rec = cpPublicRequests.get(ip);
  if (!rec || now - rec.resetTime > 60000) {
    rec = { count: 1, resetTime: now };
    cpPublicRequests.set(ip, rec);
  } else {
    rec.count++;
  }
  if (rec.count > 60) {
    return res.status(429).json({ error: 'Terlalu banyak permintaan check-in. Coba lagi sebentar.' });
  }
  next();
}

const requireEventAccessForEvent = requireEventAccess();
// Unknown rider ids resolve to no event; pass through so the handler answers
// with the real payload (empty splits) instead of a misleading 400.
const requireEventAccessForRider = requireEventAccess({
  resolveEventId: (req) => {
    const rider = db.getRiderById.get(Number(req.params.id));
    return rider ? rider.event_id : null;
  },
  passThroughWhenUnresolved: true
});

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseOptionalCoord(val, min, max) {
  if (val == null || val === '') return null;
  const n = Number(val);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

/**
 * Parse checkpoint coordinates from either separate latitude/longitude fields
 * or a combined Google Maps string (e.g. "-6.721401, 107.351245" or URL with @lat,lng).
 */
function parseCheckpointCoordsAndRadius(body) {
  const { coords, latitude, longitude, radius_meters } = body || {};
  let lat = parseOptionalCoord(latitude, -90, 90);
  let lng = parseOptionalCoord(longitude, -180, 180);

  if (lat == null && lng == null && coords != null && String(coords).trim() !== '') {
    const raw = String(coords).trim();
    const match = /(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)/.exec(raw);
    if (!match) {
      return { error: 'Format koordinat tidak valid. Gunakan format: -6.7214, 107.3512' };
    }
    lat = parseOptionalCoord(match[1], -90, 90);
    lng = parseOptionalCoord(match[2], -180, 180);
    if (lat == null || lng == null) {
      return { error: 'Nilai koordinat di luar batas geografis yang valid.' };
    }
  }

  if ((latitude != null && latitude !== '' && lat == null) || (longitude != null && longitude !== '' && lng == null)) {
    return { error: 'Nilai latitude atau longitude tidak valid.' };
  }
  if ((lat == null) !== (lng == null)) {
    return { error: 'Latitude dan longitude harus diisi berpasangan.' };
  }
  if (lat === 0 && lng === 0) {
    return { error: 'Koordinat (0, 0) tidak valid untuk lokasi pos.' };
  }

  let radius = null;
  if (radius_meters != null && radius_meters !== '') {
    const parsed = Number(radius_meters);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 50000) {
      return { error: 'Radius harus antara 0 sampai 50.000 meter.' };
    }
    radius = parsed > 0 ? Math.round(parsed) : null;
  }

  if (radius != null && (lat == null || lng == null)) {
    return { error: 'Koordinat pos wajib diisi jika kunci radius diaktifkan.' };
  }

  return { latitude: lat, longitude: lng, radius_meters: radius };
}

/**
 * Extract the 12-char checkpoint qr_token from either a raw code or a /cp/<token> URL.
 */
function extractCpToken(rawInput) {
  if (!rawInput) return '';
  const trimmed = String(rawInput).trim();
  if (!trimmed) return '';
  const pathMatch = /\/cp\/([A-Za-z0-9_-]+)/.exec(trimmed);
  if (pathMatch) return pathMatch[1];
  return trimmed.replace(/[^A-Za-z0-9_-]/g, '');
}

/**
 * Evaluate checkpoint COT status in WIB (UTC+7) against close_time.
 */
function evaluateCpCotStatus(arrivalDate, eventDate, closeTimeStr) {
  if (!closeTimeStr) return 'IN_TIME';
  const arrivalMs = arrivalDate instanceof Date ? arrivalDate.getTime() : new Date(arrivalDate).getTime();
  if (!Number.isFinite(arrivalMs)) return 'IN_TIME';

  const rawClose = String(closeTimeStr).trim();
  if (!rawClose) return 'IN_TIME';

  if (rawClose.includes('T') || rawClose.includes('-')) {
    const parsed = new Date(rawClose);
    if (!Number.isNaN(parsed.getTime())) {
      return arrivalMs <= parsed.getTime() ? 'IN_TIME' : 'OVER_COT';
    }
    return 'IN_TIME';
  }

  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(rawClose);
  if (!timeMatch) return 'IN_TIME';

  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] || 0);
  if (hour > 23 || minute > 59 || second > 59) return 'IN_TIME';

  const wibArrival = new Date(arrivalMs + WIB_OFFSET_MS);
  const arrY = wibArrival.getUTCFullYear();
  const arrM = wibArrival.getUTCMonth() + 1;
  const arrD = wibArrival.getUTCDate();
  const arrivalYmd = `${arrY}-${String(arrM).padStart(2, '0')}-${String(arrD).padStart(2, '0')}`;

  let targetY = arrY;
  let targetM = arrM;
  let targetD = arrD;

  if (eventDate) {
    const dateMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(eventDate).trim());
    if (dateMatch) {
      const evYmd = `${dateMatch[1]}-${String(Number(dateMatch[2])).padStart(2, '0')}-${String(Number(dateMatch[3])).padStart(2, '0')}`;
      if (evYmd <= arrivalYmd) {
        targetY = Number(dateMatch[1]);
        targetM = Number(dateMatch[2]);
        targetD = Number(dateMatch[3]);
      }
    }
  }

  const closeMs = Date.UTC(targetY, targetM - 1, targetD, hour, minute, second) - WIB_OFFSET_MS;
  return arrivalMs <= closeMs ? 'IN_TIME' : 'OVER_COT';
}

function formatDistanceLabel(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

// ── Checkpoints Management ──

// POST /api/events/:id/checkpoints — create checkpoint
router.post('/events/:id/checkpoints', requireAdminAuth, (req, res) => {
  const event_id = Number(req.params.id);
  const { name, km_distance, open_time, close_time, order_index } = req.body;

  if (!name || km_distance == null) {
    return res.status(400).json({ error: 'name dan km_distance wajib diisi' });
  }

  const geo = parseCheckpointCoordsAndRadius(req.body);
  if (geo.error) {
    return res.status(400).json({ error: geo.error });
  }

  const result = db.createCheckpoint.run({
    event_id,
    name:          name.trim(),
    km_distance:   Number(km_distance),
    open_time:     open_time || null,
    close_time:    close_time || null,
    latitude:      geo.latitude,
    longitude:     geo.longitude,
    radius_meters: geo.radius_meters,
    order_index:   order_index != null ? Number(order_index) : 0
  });

  const cp = db.getCheckpointById.get(result.lastInsertRowid);
  res.status(201).json({ success: true, checkpoint: cp });
});

// PUT /api/events/:id/checkpoints/:cpId — update checkpoint details, coords & radius
router.put('/events/:id/checkpoints/:cpId', requireAdminAuth, (req, res) => {
  const eventId = Number(req.params.id);
  const cpId = Number(req.params.cpId);
  const existing = db.getCheckpointById.get(cpId);

  if (!existing || existing.event_id !== eventId) {
    return res.status(404).json({ error: 'Checkpoint tidak ditemukan' });
  }

  const { name, km_distance, open_time, close_time } = req.body;
  if (!name || km_distance == null) {
    return res.status(400).json({ error: 'name dan km_distance wajib diisi' });
  }

  const geo = parseCheckpointCoordsAndRadius(req.body);
  if (geo.error) {
    return res.status(400).json({ error: geo.error });
  }

  db.updateCheckpoint.run({
    id:            cpId,
    event_id:      eventId,
    name:          name.trim(),
    km_distance:   Number(km_distance),
    open_time:     open_time || null,
    close_time:    close_time || null,
    latitude:      geo.latitude,
    longitude:     geo.longitude,
    radius_meters: geo.radius_meters
  });

  const updated = db.getCheckpointById.get(cpId);
  res.json({ success: true, checkpoint: updated });
});

// GET /api/events/:id/checkpoints — list all checkpoints for event
router.get('/events/:id/checkpoints', requireEventAccessForEvent, (req, res) => {
  const event_id = Number(req.params.id);
  const cps = db.getCheckpointsByEvent.all(event_id);
  if (isAdminRequest(req)) {
    return res.json(cps);
  }
  const publicCps = cps.map(({ qr_token, ...rest }) => rest);
  res.json(publicCps);
});

// POST /api/events/:id/checkpoints/:cpId/regenerate-qr — rotate QR token for a checkpoint
router.post('/events/:id/checkpoints/:cpId/regenerate-qr', requireAdminAuth, (req, res) => {
  const eventId = Number(req.params.id);
  const cpId = Number(req.params.cpId);
  const existing = db.getCheckpointById.get(cpId);

  if (!existing || existing.event_id !== eventId) {
    return res.status(404).json({ error: 'Checkpoint tidak ditemukan' });
  }

  const newToken = crypto.randomBytes(6).toString('hex');
  db.updateCheckpointQrToken.run(newToken, cpId, eventId);
  const updated = db.getCheckpointById.get(cpId);
  res.json({ success: true, checkpoint: updated });
});

// DELETE /api/checkpoints/:id — remove checkpoint
router.delete('/checkpoints/:id', requireAdminAuth, (req, res) => {
  const id = Number(req.params.id);
  db.deleteCheckpoint.run(id);
  res.json({ success: true });
});

// ── Self-Supported Rider QR Check-In ──

// GET /api/checkpoints/lookup/:qrToken — public checkpoint metadata for /cp/:qrToken landing
router.get('/checkpoints/lookup/:qrToken', cpPublicRateLimiter, (req, res) => {
  const token = extractCpToken(req.params.qrToken);
  if (!token) {
    return res.status(400).json({ error: 'Kode QR Checkpoint tidak valid' });
  }

  const cp = db.getCheckpointByQrToken.get(token);
  if (!cp) {
    return res.status(404).json({ error: 'Checkpoint tidak ditemukan atau kode QR sudah diganti' });
  }

  const event = db.getEventById.get(cp.event_id);
  if (!event) {
    return res.status(404).json({ error: 'Event untuk checkpoint ini tidak ditemukan' });
  }

  const hasCoords = cp.latitude != null && cp.longitude != null;
  const radius = cp.radius_meters != null && Number(cp.radius_meters) > 0 ? Number(cp.radius_meters) : null;

  res.json({
    checkpoint: {
      id:            cp.id,
      event_id:      cp.event_id,
      name:          cp.name,
      km_distance:   cp.km_distance,
      open_time:     cp.open_time,
      close_time:    cp.close_time,
      order_index:   cp.order_index,
      qr_token:      cp.qr_token,
      radius_meters: radius,
      requires_gps:  Boolean(hasCoords && radius != null)
    },
    event: {
      id:                  event.id,
      name:                event.name,
      date:                event.date,
      active:              Boolean(event.active),
      requires_access_pin: isAccessPinRequired(event)
    }
  });
});

// POST /api/checkpoints/checkin — rider self check-in by scanning checkpoint QR
router.post('/checkpoints/checkin', cpPublicRateLimiter, (req, res) => {
  const rawQr = req.body.qr_token || req.body.code || req.body.url;
  const qrToken = extractCpToken(rawQr);
  if (!qrToken) {
    return res.status(400).json({ error: 'Kode QR Checkpoint wajib diisi' });
  }

  const cp = db.getCheckpointByQrToken.get(qrToken);
  if (!cp) {
    return res.status(404).json({ error: 'QR Checkpoint tidak dikenali atau sudah tidak berlaku' });
  }

  const event = db.getEventById.get(cp.event_id);
  if (!event) {
    return res.status(404).json({ error: 'Event tidak ditemukan' });
  }
  if (!event.active) {
    return res.status(400).json({ error: 'Event ini sudah tidak aktif atau telah selesai' });
  }

  // Authenticate rider either by personal session token or inline BIB + PIN
  const suppliedToken = (req.headers['x-rider-token'] || req.body.rider_token || '').trim();
  let rider = null;

  if (suppliedToken) {
    rider = db.getRiderByToken.get(suppliedToken);
    if (!rider) {
      return res.status(401).json({ error: 'Sesi rider tidak valid. Silakan login ulang.' });
    }
    if (rider.event_id !== cp.event_id) {
      return res.status(403).json({
        error: `QR ini milik event "${event.name}", sedangkan sesi Anda terdaftar di event lain.`
      });
    }
  } else {
    const cleanBib = req.body.bib != null ? String(req.body.bib).trim() : '';
    const cleanPin = req.body.pin != null ? String(req.body.pin).trim() : '';
    if (!cleanBib || !cleanPin) {
      return res.status(401).json({ error: 'Silakan login dengan nomor BIB dan PIN untuk check-in' });
    }

    const clientIp = getClientIp(req);
    const attemptKey = `${clientIp}_${cp.event_id}_${cleanBib.toUpperCase()}`;
    const nowMs = Date.now();
    const attemptRecord = checkinPinAttempts.get(attemptKey);
    if (attemptRecord && (nowMs - attemptRecord.firstAttempt <= 15 * 60 * 1000) && attemptRecord.failures >= 8) {
      return res.status(429).json({
        error: 'Terlalu banyak percobaan PIN gagal. Coba lagi dalam 15 menit.'
      });
    }

    const recordCheckinFailure = () => {
      if (!attemptRecord || (nowMs - attemptRecord.firstAttempt > 15 * 60 * 1000)) {
        checkinPinAttempts.set(attemptKey, { failures: 1, firstAttempt: nowMs });
      } else {
        attemptRecord.failures++;
      }
    };

    rider = db.getRiderByEventBibPin.get(cp.event_id, cleanBib, cleanPin);
    if (!rider && cleanBib !== cleanBib.toUpperCase()) {
      rider = db.getRiderByEventBibPin.get(cp.event_id, cleanBib.toUpperCase(), cleanPin);
    }
    if (!rider) {
      recordCheckinFailure();
      return res.status(401).json({ error: 'BIB atau PIN tidak cocok untuk event ini' });
    }

    if (isAccessPinRequired(event)) {
      const eventPin = req.headers['x-event-pin'] || req.body.event_pin || '';
      if (!eventPin || !verifyAccessPin(event, eventPin)) {
        recordCheckinFailure();
        return res.status(401).json({
          error: eventPin
            ? 'PIN Akses Event salah. Periksa kembali PIN dari panitia.'
            : 'Event ini terkunci. Masukkan PIN Akses Event dari panitia.',
          requires_access_pin: true
        });
      }
    }

    checkinPinAttempts.delete(attemptKey);
  }

  // Duplicate check-in protection: preserve the rider's first arrival timestamp
  const existingSplit = db.getSplitByRiderAndCheckpoint.get(rider.id, cp.id);
  if (existingSplit) {
    return res.status(200).json({
      success:            true,
      already_checked_in: true,
      split:              existingSplit,
      checkpoint:         cp,
      event:              { id: event.id, name: event.name, date: event.date },
      rider:              { id: rider.id, bib: rider.bib, name: rider.name, role: rider.role || 'rider', color: rider.color, token: rider.token }
    });
  }

  let lat = parseOptionalCoord(req.body.lat, -90, 90);
  let lng = parseOptionalCoord(req.body.lng, -180, 180);

  // Fallback to fresh telemetry (< 2 minutes) from position_history if browser GPS was unavailable
  if (lat == null || lng == null) {
    try {
      const latestPos = db.db.prepare(
        'SELECT latitude, longitude, recorded_at FROM position_history WHERE rider_id = ? ORDER BY id DESC LIMIT 1'
      ).get(rider.id);
      if (latestPos && latestPos.latitude != null && latestPos.longitude != null && latestPos.recorded_at) {
        const recMs = new Date(latestPos.recorded_at).getTime();
        if (Number.isFinite(recMs) && (Date.now() - recMs) <= FRESH_TELEMETRY_MAX_AGE_MS) {
          lat = Number(latestPos.latitude);
          lng = Number(latestPos.longitude);
        }
      }
    } catch {}
  }

  let distanceMeters = null;
  const hasCpCoords = cp.latitude != null && cp.longitude != null;
  const radiusLimit = cp.radius_meters != null && Number(cp.radius_meters) > 0 ? Number(cp.radius_meters) : null;

  if (hasCpCoords && lat != null && lng != null) {
    distanceMeters = Math.round(haversineMeters(lat, lng, Number(cp.latitude), Number(cp.longitude)));
  }

  const allowFlagged = Boolean(req.body.allow_flagged);
  let verificationStatus = 'VERIFIED';
  let flagReason = null;

  if (hasCpCoords && radiusLimit != null) {
    if (lat == null || lng == null) {
      if (!allowFlagged) {
        return res.status(400).json({
          error: `Pos "${cp.name}" mewajibkan verifikasi lokasi GPS (maks. ${formatDistanceLabel(radiusLimit)}). Aktifkan izin lokasi di browser lalu coba lagi.`,
          code: 'GPS_REQUIRED',
          radius_meters: radiusLimit,
          can_submit_flagged: true
        });
      }
      verificationStatus = 'PENDING_VERIFY';
      flagReason = 'GPS_REQUIRED';
    } else if (distanceMeters > radiusLimit) {
      if (!allowFlagged) {
        return res.status(403).json({
          error: `Lokasi Anda terdeteksi ${formatDistanceLabel(distanceMeters)} dari pos "${cp.name}" (batas radius ${formatDistanceLabel(radiusLimit)}). Pastikan Anda berada di area pos.`,
          code: 'OUT_OF_RADIUS',
          distance_meters: distanceMeters,
          radius_meters: radiusLimit,
          can_submit_flagged: true
        });
      }
      verificationStatus = 'PENDING_VERIFY';
      flagReason = 'OUT_OF_RADIUS';
    }
  }

  const now = new Date();
  const arrivalTime = now.toISOString();
  const cotStatus = evaluateCpCotStatus(now, event.date, cp.close_time);

  db.insertCheckinSplitIfAbsent.run({
    event_id:            event.id,
    rider_id:            rider.id,
    checkpoint_id:       cp.id,
    arrival_time:        arrivalTime,
    status:              cotStatus,
    source:              'qr_scan',
    check_in_lat:        lat,
    check_in_lng:        lng,
    distance_meters:     distanceMeters,
    verification_status: verificationStatus,
    flag_reason:         flagReason
  });

  const split = db.getSplitByRiderAndCheckpoint.get(rider.id, cp.id);

  // Fan-out split update to Live Map & Admin Monitor spectators
  try {
    const { broadcastToClients } = require('../lib/traccar-ws-proxy');
    if (typeof broadcastToClients === 'function' && split) {
      broadcastToClients(JSON.stringify({
        type: 'checkpoint_split',
        event_id: event.id,
        split
      }), event.id);
    }
  } catch (wsErr) {}

  res.status(201).json({
    success:            true,
    already_checked_in: false,
    flagged:            verificationStatus === 'PENDING_VERIFY',
    split,
    checkpoint:         cp,
    event:              { id: event.id, name: event.name, date: event.date },
    rider:              { id: rider.id, bib: rider.bib, name: rider.name, role: rider.role || 'rider', color: rider.color, token: rider.token }
  });
});

// ── Rider Split Times (Audax COT) ──

// PUT /api/events/:id/splits/:splitId/approve — approve a flagged GPS check-in
router.put('/events/:id/splits/:splitId/approve', requireAdminAuth, (req, res) => {
  const eventId = Number(req.params.id);
  const splitId = Number(req.params.splitId);
  const existing = db.getSplitById.get(splitId);

  if (!existing || existing.event_id !== eventId) {
    return res.status(404).json({ error: 'Data check-in tidak ditemukan' });
  }

  db.approveSplit.run(splitId, eventId);
  const updated = db.getSplitByRiderAndCheckpoint.get(existing.rider_id, existing.checkpoint_id)
    || db.getSplitById.get(splitId);

  try {
    const { broadcastToClients } = require('../lib/traccar-ws-proxy');
    if (typeof broadcastToClients === 'function' && updated) {
      broadcastToClients(JSON.stringify({
        type: 'checkpoint_split',
        event_id: eventId,
        split: updated
      }), eventId);
    }
  } catch {}

  res.json({ success: true, split: updated });
});

// DELETE /api/events/:id/splits/:splitId — reject/remove a check-in split
router.delete('/events/:id/splits/:splitId', requireAdminAuth, (req, res) => {
  const eventId = Number(req.params.id);
  const splitId = Number(req.params.splitId);
  const existing = db.getSplitById.get(splitId);

  if (!existing || existing.event_id !== eventId) {
    return res.status(404).json({ error: 'Data check-in tidak ditemukan' });
  }

  db.deleteSplitById.run(splitId, eventId);

  try {
    const { broadcastToClients } = require('../lib/traccar-ws-proxy');
    if (typeof broadcastToClients === 'function') {
      broadcastToClients(JSON.stringify({
        type: 'checkpoint_split_removed',
        event_id: eventId,
        split_id: splitId,
        rider_id: existing.rider_id,
        checkpoint_id: existing.checkpoint_id
      }), eventId);
    }
  } catch {}

  res.json({ success: true });
});

// POST /api/events/:id/splits — record rider checkpoint arrival split (Admin override/manual)
router.post('/events/:id/splits', requireAdminAuth, (req, res) => {
  const event_id = Number(req.params.id);
  const { rider_id, checkpoint_id, arrival_time, status } = req.body;

  if (!rider_id || !checkpoint_id) {
    return res.status(400).json({ error: 'rider_id dan checkpoint_id wajib diisi' });
  }

  const timeStr = arrival_time || new Date().toISOString();
  let splitStatus = status;
  if (!splitStatus) {
    const event = db.getEventById.get(event_id);
    const cp = db.getCheckpointById.get(Number(checkpoint_id));
    splitStatus = evaluateCpCotStatus(new Date(timeStr), event && event.date, cp && cp.close_time);
  }

  const result = db.recordSplit.run({
    event_id,
    rider_id:      Number(rider_id),
    checkpoint_id: Number(checkpoint_id),
    arrival_time:  timeStr,
    status:        splitStatus
  });

  const split = db.getSplitByRiderAndCheckpoint.get(Number(rider_id), Number(checkpoint_id))
    || db.getSplitById.get(result.lastInsertRowid);

  try {
    const { broadcastToClients } = require('../lib/traccar-ws-proxy');
    if (typeof broadcastToClients === 'function' && split) {
      broadcastToClients(JSON.stringify({
        type: 'checkpoint_split',
        event_id,
        split
      }), event_id);
    }
  } catch {}

  res.status(201).json({ success: true, split });
});

// GET /api/events/:id/splits — list all splits for an event
router.get('/events/:id/splits', requireEventAccessForEvent, (req, res) => {
  const event_id = Number(req.params.id);
  const splits = db.getSplitsByEvent.all(event_id);
  res.json(splits);
});

// GET /api/riders/:id/splits — list splits for a specific rider
router.get('/riders/:id/splits', requireEventAccessForRider, (req, res) => {
  const rider_id = Number(req.params.id);
  const splits = db.getSplitsByRider.all(rider_id);
  res.json(splits);
});

module.exports = router;
