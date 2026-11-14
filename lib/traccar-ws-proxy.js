const WebSocket = require('ws');
const db = require('../db/database');
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

  if (rawUnique) {
    const cleanUnique = rawUnique.replace(/^BIB-?/i, '').trim();
    const strippedZero = cleanUnique.replace(/^0+/, '') || '0';
    const padded3 = cleanUnique.padStart(3, '0');
    const padded4 = cleanUnique.padStart(4, '0');

    try {
      rider = db.db.prepare(`
        SELECT * FROM riders 
        WHERE bib = ? OR bib = ? OR bib = ? OR bib = ? OR bib = ? OR bib = ?
      `).get(cleanUnique, rawUnique, `BIB-${cleanUnique}`, strippedZero, padded3, padded4);

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
    rider = db.db.prepare(`
      SELECT * FROM riders 
      WHERE bib = ? OR bib = ? OR bib = ? OR bib = ?
    `).get(devStr, devClean, devPad3, `BIB-${devPad3}`);

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
 * Broadcast payload to currently connected browser clients.
 * Optionally filtered by targetEventId if clients specify an event_id.
 * @param {string|Buffer} data
 * @param {number|null} targetEventId
 */
function broadcastToClients(data, targetEventId = null) {
  lastTelemetryPayload = data;
  if (!wssInstance) return;

  for (const client of wssInstance.clients) {
    if (client.readyState === WebSocket.OPEN) {
      // If broadcast is scoped to a specific event and client has an event_id, filter out mismatches
      if (targetEventId != null && client.eventId != null && client.eventId !== targetEventId) {
        continue;
      }
      try {
        client.send(data);
      } catch (err) {
        console.error('[WS Proxy] Error sending message to client:', err.message);
      }
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
    try {
      const url = new URL(req.url, 'http://localhost');
      const paramId = url.searchParams.get('event_id');
      clientWs.eventId = paramId ? Number(paramId) : null;
    } catch (e) {
      clientWs.eventId = null;
    }

    const currentActive = wss.clients.size;
    if (currentActive > peakViewers) peakViewers = currentActive;

    const eventTag = clientWs.eventId ? ` [Event: #${clientWs.eventId}]` : '';
    console.log(`[WS Proxy] Browser client connected from ${req.socket.remoteAddress}${eventTag} (Active: ${currentActive})`);

    // Ensure single upstream connection is alive
    ensureUpstreamConnected();

    // Send cached devices so browser always has complete device mapping immediately
    if (lastDevicesPayload && clientWs.readyState === WebSocket.OPEN) {
      try {
        clientWs.send(lastDevicesPayload);
      } catch (e) {}
    } else {
      syncTraccarDevicesFromRest().then(() => {
        if (lastDevicesPayload && clientWs.readyState === WebSocket.OPEN) {
          try {
            clientWs.send(lastDevicesPayload);
          } catch (e) {}
        }
      }).catch(() => {});
    }

    // Immediately replay latest cached telemetry state to new client so UI populates instantly
    if (lastTelemetryPayload && clientWs.readyState === WebSocket.OPEN) {
      try {
        clientWs.send(lastTelemetryPayload);
      } catch (e) {}
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
  closeUpstream
};
