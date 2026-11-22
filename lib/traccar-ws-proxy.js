const WebSocket = require('ws');
const db = require('../db/database');
const { isAccessPinRequired, verifyAccessPin } = require('./event-access');
const { verifyAdminSession } = require('./admin-auth');
const fetchFn = typeof fetch === 'function' ? fetch : require('node-fetch');

let wssInstance = null;
let peakViewers = 0;
let upstreamWs = null;
let isConnectingUpstream = false;
let isDestroyed = false;
let reconnectTimer = null;
let reconnectDelayMs = 2000;
let lastTelemetryPayload = null;
let lastDevicesPayload = null;
let traccarSessionCookie = null;
const traccarDeviceMap = new Map();
const lastCoordByRider = new Map();

function calcHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const lastSavedByRider = new Map();
const ingestionCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, time] of lastSavedByRider.entries()) {
    if (now - time > 60000) lastSavedByRider.delete(id);
  }
}, 60000);
if (ingestionCleanupTimer.unref) ingestionCleanupTimer.unref();

/**
 * Universal helper to find and auto-link a Traccar device to a CycloPon Rider.
 */
function findRiderForDevice(devId, rawUnique = '') {
  if (!devId) return null;
  const numDevId = Number(devId);

  let rider = db.getRiderByTraccarDeviceId ? db.getRiderByTraccarDeviceId.get(numDevId) : null;
  if (rider) return rider;

  // Retrieve uniqueId / identifier from cached devices if not provided
  if (!rawUnique && traccarDeviceMap.has(numDevId)) {
    const dev = traccarDeviceMap.get(numDevId);
    rawUnique = String(dev.uniqueId || dev.name || '').trim();
  }

  let targetEventId = null;
  let devIdentifier = String(rawUnique || devId || '').trim();

  // Support composite ID: {eventId}-{bib} or E{eventId}-{bib}
  const compositeMatch = /^E?(\d+)[-_:](.+)$/i.exec(devIdentifier);
  if (compositeMatch) {
    targetEventId = Number(compositeMatch[1]);
    devIdentifier = compositeMatch[2].trim();
  }

  if (rawUnique || devIdentifier) {
    const cleanUnique = devIdentifier.replace(/^BIB-?/i, '').trim();
    const strippedZero = cleanUnique.replace(/^0+/, '') || '0';
    const padded3 = cleanUnique.padStart(3, '0');
    const padded4 = cleanUnique.padStart(4, '0');

    try {
      if (targetEventId && Number.isInteger(targetEventId)) {
        rider = db.db.prepare(`
          SELECT * FROM riders 
          WHERE event_id = ? AND (
            bib = ? OR bib = ? OR bib = ? OR bib = ? OR bib = ? OR bib = ?
          )
          ORDER BY id DESC LIMIT 1
        `).get(targetEventId, cleanUnique, devIdentifier, `BIB-${cleanUnique}`, strippedZero, padded3, padded4);
      } else {
        rider = db.db.prepare(`
          SELECT r.* FROM riders r
          JOIN events e ON r.event_id = e.id
          WHERE r.bib = ? OR r.bib = ? OR r.bib = ? OR r.bib = ? OR r.bib = ? OR r.bib = ?
          ORDER BY CASE WHEN e.active = 1 THEN 0 ELSE 1 END, e.created_at DESC, r.id DESC
          LIMIT 1
        `).get(cleanUnique, devIdentifier, `BIB-${cleanUnique}`, strippedZero, padded3, padded4);
      }

      if (rider) {
        db.db.prepare('UPDATE riders SET traccar_device_id = ? WHERE id = ?').run(numDevId, rider.id);
        console.log(`[WS Proxy] Auto-linked Traccar device ${numDevId} (${rawUnique}) to rider #${rider.bib} (${rider.name}) in database`);
        return rider;
      }
    } catch (e) {}
  }

  // Match deviceId number directly with BIB
  const devStr = String(devId).trim();
  const devClean = devStr.replace(/^0+/, '') || '0';
  const devPad3 = devClean.padStart(3, '0');
  try {
    if (targetEventId && Number.isInteger(targetEventId)) {
      rider = db.db.prepare(`
        SELECT * FROM riders 
        WHERE event_id = ? AND (bib = ? OR bib = ? OR bib = ? OR bib = ?)
        ORDER BY id DESC LIMIT 1
      `).get(targetEventId, devStr, devClean, devPad3, `BIB-${devPad3}`);
    } else {
      rider = db.db.prepare(`
        SELECT r.* FROM riders r
        JOIN events e ON r.event_id = e.id
        WHERE r.bib = ? OR r.bib = ? OR r.bib = ? OR r.bib = ?
        ORDER BY CASE WHEN e.active = 1 THEN 0 ELSE 1 END, e.created_at DESC, r.id DESC
        LIMIT 1
      `).get(devStr, devClean, devPad3, `BIB-${devPad3}`);
    }

    if (rider) {
      db.db.prepare('UPDATE riders SET traccar_device_id = ? WHERE id = ?').run(numDevId, rider.id);
      console.log(`[WS Proxy] Auto-linked Traccar device ${numDevId} directly to rider #${rider.bib} (${rider.name})`);
      return rider;
    }
  } catch (e) {}

  // Solo / trial safety: if there is only 1 rider in the database, link automatically
  try {
    const allRiders = db.db.prepare('SELECT * FROM riders').all();
    if (allRiders && allRiders.length === 1) {
      rider = allRiders[0];
      db.db.prepare('UPDATE riders SET traccar_device_id = ? WHERE id = ?').run(numDevId, rider.id);
      console.log(`[WS Proxy] Single rider detected: Auto-linked device ${numDevId} to lone rider #${rider.bib} (${rider.name})`);
      return rider;
    }
  } catch (e) {}

  return null;
}

/**
 * Handle and cache devices from Traccar (either via REST or WebSocket)
 * Automatically syncs traccar_device_id to SQLite riders table matching BIB.
 */
function handleDevicesList(devices) {
  if (!Array.isArray(devices) || devices.length === 0) return;
  lastDevicesPayload = JSON.stringify({ devices });

  for (const dev of devices) {
    if (!dev || dev.id == null) continue;
    traccarDeviceMap.set(Number(dev.id), dev);
    findRiderForDevice(dev.id, String(dev.uniqueId || dev.name || ''));
  }
}

/**
 * Actively fetch registered devices from Traccar REST API to ensure
 * device-to-BIB mapping is always warm even if WebSocket devices payload was missed.
 */
async function syncTraccarDevicesFromRest() {
  try {
    const traccarHost = (process.env.TRACCAR_HOST || 'http://localhost:8082');
    const authHeader = 'Basic ' + Buffer.from(
      `${process.env.TRACCAR_USER || 'admin'}:${process.env.TRACCAR_PASS || 'admin'}`
    ).toString('base64');

    const res = await fetchFn(`${traccarHost}/api/devices`, {
      headers: { Authorization: authHeader }
    });
    if (res.ok) {
      const devices = await res.json();
      if (Array.isArray(devices) && devices.length > 0) {
        handleDevicesList(devices);
      }
    }
  } catch (err) {
    // Non-blocking if Traccar is unreachable or mock
  }
}

/**
 * Automatically persist Traccar GPS telemetry directly to SQLite position_history.
 * Throttled to ~1.0s per rider to prevent DB lock contention without missing telemetry.
 */
function processTraccarIngestion(raw) {
  try {
    const text = typeof raw === 'string' ? raw : raw.toString('utf8');
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.positions) || parsed.positions.length === 0) {
      return;
    }

    const now = Date.now();
    for (const pos of parsed.positions) {
      if (!pos.deviceId || pos.latitude == null || pos.longitude == null) continue;

      let rider = pos.rider_id ? (db.getRiderById ? db.getRiderById.get(Number(pos.rider_id)) : null) : null;
      if (!rider) {
        rider = findRiderForDevice(pos.deviceId);
      }

      if (!rider) continue;

      // Throttle ingestion writes per-rider to once every 1.0 second
      const last = lastSavedByRider.get(rider.id) || 0;
      if (now - last < 1000) continue;
      lastSavedByRider.set(rider.id, now);

      const rawSpeed = Number(pos.speed || 0);
      const speedKmh = pos.isKmh ? rawSpeed : (rawSpeed > 70 ? rawSpeed : rawSpeed * 1.852);

      // Accumulate ground odometer distance
      let totalDistKm = 0;
      const lat = Number(pos.latitude);
      const lon = Number(pos.longitude);

      if (lastCoordByRider.has(rider.id)) {
        const prev = lastCoordByRider.get(rider.id);
        const delta = calcHaversineKm(prev.lat, prev.lon, lat, lon);
        if (delta >= 0.003 && delta < 2.0) {
          totalDistKm = Math.round((prev.totalKm + delta) * 100) / 100;
        } else {
          totalDistKm = prev.totalKm;
        }
        lastCoordByRider.set(rider.id, { lat, lon, totalKm: totalDistKm });
      } else {
        try {
          const lastRow = db.db.prepare(
            'SELECT distance_km FROM position_history WHERE rider_id = ? ORDER BY id DESC LIMIT 1'
          ).get(rider.id);
          totalDistKm = lastRow && lastRow.distance_km ? Number(lastRow.distance_km) : 0;
        } catch (e) {
          totalDistKm = 0;
        }
        lastCoordByRider.set(rider.id, { lat, lon, totalKm: totalDistKm });
      }

      db.recordPositionHistory.run({
        event_id:    rider.event_id,
        rider_id:    rider.id,
        latitude:    lat,
        longitude:   lon,
        speed:       Math.max(0, Math.round(speedKmh * 10) / 10),
        distance_km: totalDistKm,
        recorded_at: pos.fixTime || pos.deviceTime || new Date().toISOString()
      });
    }
  } catch (err) {
    // Non-blocking error handling
  }
}

/**
 * Parse a JSON WebSocket payload once. Returns null when the payload is not
 * JSON (some Traccar builds send plain text frames).
 */
function parseWsPayload(data) {
  try {
    const text = typeof data === 'string' ? data : data.toString('utf8');
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

/**
 * Resolve which event a position belongs to (null when unmapped).
 */
function resolvePositionEventId(pos) {
  if (!pos) return null;
  if (pos.event_id != null) return Number(pos.event_id);

  let rider = pos.rider_id != null
    ? (db.getRiderById ? db.getRiderById.get(Number(pos.rider_id)) : null)
    : null;
  if (!rider && pos.deviceId != null) rider = findRiderForDevice(pos.deviceId);
  return rider ? Number(rider.event_id) : null;
}

/**
 * Pre-compute event ownership once per payload so filtering does not perform a
 * database lookup per client.
 */
function buildPayloadScope(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;

  const scope = {};
  if (Array.isArray(parsed.positions)) {
    scope.positionEventIds = parsed.positions.map(resolvePositionEventId);
  }
  if (Array.isArray(parsed.devices)) {
    scope.deviceEventIds = parsed.devices.map((dev) => {
      const rider = findRiderForDevice(dev.id, dev.uniqueId);
      return rider ? Number(rider.event_id) : null;
    });
  }
  return scope;
}

/**
 * Restrict a broadcast payload to the event a browser client is watching.
 * Returns the original payload when nothing needed filtering, or null when the
 * client must not receive anything.
 */
function filterPayloadForEvent(rawData, parsed, eventId, scope = null) {
  if (!parsed || typeof parsed !== 'object' || eventId == null) return rawData;
  const payloadScope = scope || buildPayloadScope(parsed);

  if (Array.isArray(parsed.positions)) {
    const positions = parsed.positions.filter((pos, index) => {
      const positionEventId = payloadScope && payloadScope.positionEventIds
        ? payloadScope.positionEventIds[index]
        : resolvePositionEventId(pos);
      // Unmapped devices belong to no event, so they cannot be attributed to
      // the event being watched. Showing them would leak riders from other
      // events (and bypass event access PINs), so drop them.
      return positionEventId != null && positionEventId === Number(eventId);
    });

    if (positions.length === 0) return null;
    if (positions.length === parsed.positions.length) return rawData;
    return JSON.stringify({ ...parsed, positions });
  }

  if (Array.isArray(parsed.devices)) {
    const devices = parsed.devices.filter((dev, index) => {
      const deviceEventId = payloadScope && payloadScope.deviceEventIds
        ? payloadScope.deviceEventIds[index]
        : resolvePositionEventId({ deviceId: dev.id });
      // Same rule as positions: an unmapped device id belongs to no event.
      return deviceEventId != null && deviceEventId === Number(eventId);
    });

    if (devices.length === 0) return null;
    if (devices.length === parsed.devices.length) return rawData;
    return JSON.stringify({ ...parsed, devices });
  }

  return rawData;
}

/**
 * Broadcast payload to currently connected browser clients.
 * Optionally filtered by targetEventId if clients specify an event_id.
 * Clients without an event_id never receive telemetry (they would otherwise
 * see every event, bypassing event access PINs).
 * @param {string|Buffer} data
 * @param {number|null} targetEventId
 */
function broadcastToClients(data, targetEventId = null) {
  // Only genuine telemetry may seed the replay cache. Alerts (SOS), device
  // lists and other side-channel payloads also flow through this function and
  // must not overwrite the last known positions of new clients.
  const cacheProbe = parseWsPayload(data);
  if (cacheProbe && Array.isArray(cacheProbe.positions) && cacheProbe.positions.length > 0) {
    lastTelemetryPayload = data;
  }

  if (!wssInstance) return;

  const parsed = targetEventId == null ? parseWsPayload(data) : null;
  const payloadScope = parsed ? buildPayloadScope(parsed) : null;

  for (const client of wssInstance.clients) {
    if (client.readyState !== WebSocket.OPEN || client.eventId == null) continue;
    if (targetEventId != null && Number(client.eventId) !== Number(targetEventId)) continue;

    // If broadcast is scoped to a specific event, the payload is already
    // filtered. Otherwise filter mixed Traccar payloads per client.
    const payload = targetEventId != null
      ? data
      : filterPayloadForEvent(data, parsed, client.eventId, payloadScope);

    if (!payload) continue;
    try {
      client.send(payload);
    } catch (err) {
      console.error('[WS Proxy] Error sending message to client:', err.message);
    }
  }
}

/**
 * Login to Traccar REST API to obtain session cookie required for WebSocket upgrade.
 */
async function authenticateTraccarSession(traccarHttp, authHeader) {
  try {
    const res = await fetchFn(`${traccarHttp}/api/session`, {
      headers: { Authorization: authHeader }
    });
    if (res.ok) {
      const setCookie = res.headers.get('set-cookie');
      if (setCookie) {
        // Extract JSESSIONID=...
        const match = setCookie.match(/JSESSIONID=[^;]+/i);
        if (match) {
          traccarSessionCookie = match[0];
          return traccarSessionCookie;
        }
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Connect single persistent upstream connection to Traccar GPS Server.
 */
async function ensureUpstreamConnected() {
  if (upstreamWs && (upstreamWs.readyState === WebSocket.OPEN || upstreamWs.readyState === WebSocket.CONNECTING)) {
    return;
  }
  if (isConnectingUpstream) return;

  isConnectingUpstream = true;

  const rawHost = (process.env.TRACCAR_HOST || 'http://localhost:8082');
  const traccarWsHost = rawHost
    .replace(/^http:\/\//, 'ws://')
    .replace(/^https:\/\//, 'wss://');

  const authHeader = 'Basic ' + Buffer.from(
    `${process.env.TRACCAR_USER || 'admin'}:${process.env.TRACCAR_PASS || 'admin'}`
  ).toString('base64');

  // Attempt to warm up session cookie before WebSocket handshake
  await authenticateTraccarSession(rawHost, authHeader);

  const wsHeaders = { Authorization: authHeader };
  if (traccarSessionCookie) {
    wsHeaders['Cookie'] = traccarSessionCookie;
  }

  try {
    const ws = new WebSocket(`${traccarWsHost}/api/socket`, {
      headers: wsHeaders
    });

    upstreamWs = ws;

    ws.on('open', () => {
      isConnectingUpstream = false;
      reconnectDelayMs = 2000; // Reset backoff delay on successful connect
      console.log('[WS Proxy] Connected to Traccar Server (Singleton Upstream)');
      syncTraccarDevicesFromRest();
    });

    ws.on('message', (data) => {
      try {
        const text = typeof data === 'string' ? data : data.toString('utf8');
        const parsed = JSON.parse(text);

        // If Traccar pushes device updates, refresh mapping and broadcast
        if (parsed.devices && Array.isArray(parsed.devices)) {
          handleDevicesList(parsed.devices);
          broadcastToClients(data);
          return;
        }

        // If Traccar pushes positions, enrich with rider_id and bib before fan-out
        if (parsed.positions && Array.isArray(parsed.positions)) {
          for (const pos of parsed.positions) {
            let rider = pos.rider_id ? (db.getRiderById ? db.getRiderById.get(Number(pos.rider_id)) : null) : null;
            if (!rider) {
              rider = findRiderForDevice(pos.deviceId);
            }

            if (rider) {
              pos.rider_id = rider.id;
              pos.bib = rider.bib;
              pos.event_id = rider.event_id;
              if (lastCoordByRider.has(rider.id)) {
                pos.distance_km = lastCoordByRider.get(rider.id).totalKm;
              }
            }
          }
          const enrichedPayload = JSON.stringify(parsed);
          broadcastToClients(enrichedPayload);
          processTraccarIngestion(enrichedPayload);
          return;
        }
      } catch (e) {
        // Fallback to standard broadcast
      }

      broadcastToClients(data);
      processTraccarIngestion(data);
    });

    ws.on('close', (code, reason) => {
      isConnectingUpstream = false;
      upstreamWs = null;
      console.log(`[WS Proxy] Traccar upstream closed: ${code} ${reason || ''}`);
      scheduleReconnect();
    });

    ws.on('error', (err) => {
      isConnectingUpstream = false;
      upstreamWs = null;
      console.error('[WS Proxy] Traccar upstream error:', err.message);
      scheduleReconnect();
    });
  } catch (err) {
    isConnectingUpstream = false;
    upstreamWs = null;
    console.error('[WS Proxy] Exception connecting to Traccar:', err.message);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (isDestroyed || reconnectTimer) return;
  // Only auto-reconnect if there is at least one active browser client connected
  if (!wssInstance || !wssInstance.clients || wssInstance.clients.size === 0) {
    return;
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (isDestroyed) return;
    reconnectDelayMs = Math.min(reconnectDelayMs * 1.5, 15000);
    ensureUpstreamConnected();
  }, reconnectDelayMs);

  if (reconnectTimer && typeof reconnectTimer.unref === 'function') {
    reconnectTimer.unref();
  }
}

function parseCookieHeader(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const part of String(header).split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(value);
    } catch (e) {
      cookies[key] = value;
    }
  }
  return cookies;
}

/**
 * Setup WebSocket proxy server:
 * Browser connects to /traccar-ws. A single upstream connection to Traccar is maintained,
 * and incoming GPS telemetry is fanned out to all connected browser clients.
 *
 * @param {import('http').Server} httpServer
 */
function setupTraccarWsProxy(httpServer) {
  isDestroyed = false;
  const wss = new WebSocket.Server({ server: httpServer, path: '/traccar-ws' });
  wssInstance = wss;

  wss.on('connection', (clientWs, req) => {
    let paramId = null;
    let submittedPin = null;
    try {
      const url = new URL(req.url, 'http://localhost');
      paramId = url.searchParams.get('event_id');
      submittedPin = url.searchParams.get('pin') || url.searchParams.get('event_pin');
    } catch (e) {}

    // A browser WebSocket handshake cannot set custom headers, so the event
    // PIN travels as a (deprecated but necessary) query parameter. Admin
    // sessions can instead supply the normal admin cookie.
    const cookies = parseCookieHeader(req.headers.cookie);
    const adminToken = cookies.cyclopon_admin || req.headers['x-admin-token'];
    const isAdmin = !!(adminToken && verifyAdminSession(adminToken));

    if (paramId != null && paramId !== '') {
      const eventId = Number(paramId);
      const event = Number.isFinite(eventId) ? db.getEventById.get(eventId) : null;

      if (!event) {
        try { clientWs.close(1008, 'Event tidak ditemukan'); } catch (e) {}
        return;
      }

      if (isAccessPinRequired(event) && !isAdmin && !verifyAccessPin(event, submittedPin)) {
        try { clientWs.close(1008, 'PIN akses event diperlukan'); } catch (e) {}
        return;
      }

      clientWs.eventId = Number(event.id);
      clientWs.isAdmin = isAdmin;
    } else {
      // Connections without event_id are kept open for viewer analytics, but
      // they never receive telemetry (this used to leak every event).
      clientWs.eventId = null;
      clientWs.isAdmin = isAdmin;
    }

    const currentActive = wss.clients.size;
    if (currentActive > peakViewers) peakViewers = currentActive;

    const eventTag = clientWs.eventId ? ` [Event: #${clientWs.eventId}]` : ' [no event scope]';
    console.log(`[WS Proxy] Browser client connected from ${req.socket.remoteAddress}${eventTag} (Active: ${currentActive})`);

    // Ensure single upstream connection is alive
    ensureUpstreamConnected();

    if (clientWs.eventId != null) {
      // Send cached devices so browser always has complete device mapping immediately
      if (lastDevicesPayload && clientWs.readyState === WebSocket.OPEN) {
        try {
          const payload = filterPayloadForEvent(lastDevicesPayload, parseWsPayload(lastDevicesPayload), clientWs.eventId);
          if (payload) clientWs.send(payload);
        } catch (e) {}
      } else {
        syncTraccarDevicesFromRest().then(() => {
          if (lastDevicesPayload && clientWs.readyState === WebSocket.OPEN) {
            try {
              const payload = filterPayloadForEvent(lastDevicesPayload, parseWsPayload(lastDevicesPayload), clientWs.eventId);
              if (payload) clientWs.send(payload);
            } catch (e) {}
          }
        }).catch(() => {});
      }

      // Immediately replay latest cached telemetry state to new client so UI populates instantly
      if (lastTelemetryPayload && clientWs.readyState === WebSocket.OPEN) {
        try {
          const payload = filterPayloadForEvent(lastTelemetryPayload, parseWsPayload(lastTelemetryPayload), clientWs.eventId);
          if (payload) clientWs.send(payload);
        } catch (e) {}
      }
    }

    clientWs.on('close', () => {
      // Client disconnected; do not close upstream connection.
    });

    clientWs.on('error', (err) => {
      console.error('[WS Proxy] Client error:', err.message);
    });
  });

  console.log('[WS Proxy] Traccar WebSocket proxy ready at /traccar-ws');
  return wss;
}

function getActiveViewersCount() {
  return wssInstance ? wssInstance.clients.size : 0;
}

function getPeakViewersCount() {
  const current = getActiveViewersCount();
  if (current > peakViewers) peakViewers = current;
  return peakViewers;
}

function resetPeakViewersCount() {
  peakViewers = getActiveViewersCount();
}

function getUpstreamStatus() {
  const isConnected = !!(upstreamWs && upstreamWs.readyState === WebSocket.OPEN);
  const isConnecting = isConnectingUpstream || !!(upstreamWs && upstreamWs.readyState === WebSocket.CONNECTING);
  return {
    connected: isConnected,
    connecting: isConnecting,
    status: isConnected ? 'connected' : (isConnecting ? 'connecting' : 'standby')
  };
}

function closeUpstream() {
  isDestroyed = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (upstreamWs) {
    try {
      upstreamWs.removeAllListeners();
      upstreamWs.close();
    } catch (e) {}
    upstreamWs = null;
  }
  if (wssInstance) {
    try {
      wssInstance.close();
    } catch (e) {}
    wssInstance = null;
  }
  isConnectingUpstream = false;
  lastTelemetryPayload = null;
  lastDevicesPayload = null;
  traccarDeviceMap.clear();
  lastCoordByRider.clear();
}

module.exports = {
  setupTraccarWsProxy,
  getActiveViewersCount,
  getPeakViewersCount,
  resetPeakViewersCount,
  getUpstreamStatus,
  broadcastToClients,
  ensureUpstreamConnected,
  closeUpstream,
  findRiderForDevice
};
