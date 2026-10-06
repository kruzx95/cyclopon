const WebSocket = require('ws');

let wssInstance = null;
let peakViewers = 0;
let upstreamWs = null;
let isConnectingUpstream = false;
let isDestroyed = false;
let reconnectTimer = null;
let reconnectDelayMs = 2000;
let lastTelemetryPayload = null;

/**
 * Broadcast payload to all currently connected browser clients.
 * @param {string|Buffer} data
 */
function broadcastToClients(data) {
  lastTelemetryPayload = data;
  if (!wssInstance) return;

  for (const client of wssInstance.clients) {
    if (client.readyState === WebSocket.OPEN) {
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
    const currentActive = wss.clients.size;
    if (currentActive > peakViewers) peakViewers = currentActive;

    console.log(`[WS Proxy] Browser client connected from ${req.socket.remoteAddress} (Active: ${currentActive})`);

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
  broadcastToClients,
  ensureUpstreamConnected,
  closeUpstream
};
