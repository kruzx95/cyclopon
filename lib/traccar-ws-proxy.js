const WebSocket = require('ws');
const db = require('../db/database');

let wssInstance = null;
let peakViewers = 0;
let upstreamWs = null;
let isConnectingUpstream = false;
let isDestroyed = false;
let reconnectTimer = null;
let reconnectDelayMs = 2000;
let lastTelemetryPayload = null;

const lastSavedByRider = new Map();
const ingestionCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, time] of lastSavedByRider.entries()) {
    if (now - time > 60000) lastSavedByRider.delete(id);
  }
}, 60000);
if (ingestionCleanupTimer.unref) ingestionCleanupTimer.unref();

/**
 * Automatically persist Traccar GPS telemetry directly to SQLite position_history.
 * Throttled to ~3.5s per rider to prevent DB lock contention.
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

      const rider = db.getRiderByTraccarDeviceId ? db.getRiderByTraccarDeviceId.get(Number(pos.deviceId)) : null;
      if (!rider) continue;

      // Throttle ingestion writes per-rider to once every 3.5 seconds
      const last = lastSavedByRider.get(rider.id) || 0;
      if (now - last < 3500) continue;
      lastSavedByRider.set(rider.id, now);

      const rawSpeed = Number(pos.speed || 0);
      const speedKmh = pos.isKmh ? rawSpeed : (rawSpeed > 70 ? rawSpeed : rawSpeed * 1.852);

      db.recordPositionHistory.run({
        event_id:    rider.event_id,
        rider_id:    rider.id,
        latitude:    Number(pos.latitude),
        longitude:   Number(pos.longitude),
        speed:       Math.max(0, Math.round(speedKmh * 10) / 10),
        distance_km: 0,
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
 * Connect single persistent upstream connection to Traccar GPS Server.
 */
function ensureUpstreamConnected() {
  if (upstreamWs && (upstreamWs.readyState === WebSocket.OPEN || upstreamWs.readyState === WebSocket.CONNECTING)) {
    return;
  }
  if (isConnectingUpstream) return;

  isConnectingUpstream = true;

  const traccarHost = (process.env.TRACCAR_HOST || 'http://localhost:8082')
    .replace(/^http:\/\//, 'ws://')
    .replace(/^https:\/\//, 'wss://');

  const authHeader = 'Basic ' + Buffer.from(
    `${process.env.TRACCAR_USER || 'admin'}:${process.env.TRACCAR_PASS || 'admin'}`
  ).toString('base64');

  try {
    const ws = new WebSocket(`${traccarHost}/api/socket`, {
      headers: { Authorization: authHeader }
    });

    upstreamWs = ws;

    ws.on('open', () => {
      isConnectingUpstream = false;
      reconnectDelayMs = 2000; // Reset backoff delay on successful connect
      console.log('[WS Proxy] Connected to Traccar Server (Singleton Upstream)');
    });

    ws.on('message', (data) => {
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
