const WebSocket = require('ws');

let wssInstance = null;
let peakViewers = 0;

/**
 * Setup WebSocket proxy: browser connects to /traccar-ws,
 * server authenticates to Traccar /api/socket with admin credentials
 * and forwards all position/device/event messages to the browser client.
 *
 * @param {import('http').Server} httpServer
 */
function setupTraccarWsProxy(httpServer) {
  const wss = new WebSocket.Server({ server: httpServer, path: '/traccar-ws' });
  wssInstance = wss;

  const traccarHost = (process.env.TRACCAR_HOST || 'http://localhost:8082')
    .replace(/^http:\/\//, 'ws://')
    .replace(/^https:\/\//, 'wss://');

  const authHeader = 'Basic ' + Buffer.from(
    `${process.env.TRACCAR_USER || 'admin'}:${process.env.TRACCAR_PASS || 'admin'}`
  ).toString('base64');

  wss.on('connection', (clientWs, req) => {
    const currentActive = wss.clients.size;
    if (currentActive > peakViewers) peakViewers = currentActive;

    console.log(`[WS Proxy] Browser client connected from ${req.socket.remoteAddress} (Active: ${currentActive})`);

    const traccarWs = new WebSocket(`${traccarHost}/api/socket`, {
      headers: { Authorization: authHeader }
    });

    traccarWs.on('open', () => {
      console.log('[WS Proxy] Connected to Traccar Server');
    });

    traccarWs.on('message', (data) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data);
      }
    });

    traccarWs.on('close', (code, reason) => {
      console.log(`[WS Proxy] Traccar closed: ${code} ${reason}`);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(1001, 'Traccar disconnected');
      }
    });

    traccarWs.on('error', (err) => {
      console.error('[WS Proxy] Traccar error:', err.message);
      // Don't crash — browser will reconnect
    });

    clientWs.on('close', () => {
      if (traccarWs.readyState !== WebSocket.CLOSED) traccarWs.close();
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

module.exports = {
  setupTraccarWsProxy,
  getActiveViewersCount,
  getPeakViewersCount,
  resetPeakViewersCount
};
