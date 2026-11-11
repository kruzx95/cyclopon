const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const WebSocket = require('ws');
const { setupTraccarWsProxy, getActiveViewersCount, broadcastToClients, closeUpstream } = require('../lib/traccar-ws-proxy');

test('WebSocket Proxy Singleton Upstream & Fan-Out Broadcast Engine', async (t) => {
  let mockTraccarServer;
  let mockTraccarPort;
  let appServer;
  let appPort;
  let upstreamConnectionsCount = 0;
  let mockTraccarSockets = [];

  await t.test('setup mock traccar server and cyclopon ws proxy', async () => {
    // 1. Create Mock Traccar WebSocket server
    await new Promise((resolve) => {
      mockTraccarServer = new WebSocket.Server({ port: 0 }, () => {
        mockTraccarPort = mockTraccarServer.address().port;
        resolve();
      });
    });

    mockTraccarServer.on('connection', (socket) => {
      upstreamConnectionsCount++;
      mockTraccarSockets.push(socket);
    });

    process.env.TRACCAR_HOST = `http://127.0.0.1:${mockTraccarPort}`;

    // 2. Create CycloPon HTTP Server & Proxy
    await new Promise((resolve) => {
      appServer = http.createServer((req, res) => res.end('ok'));
      setupTraccarWsProxy(appServer);
      appServer.listen(0, () => {
        appPort = appServer.address().port;
        resolve();
      });
    });
  });

  await t.test('verifies single upstream connection when multiple clients connect (Singleton Pool)', async () => {
    const CLIENT_COUNT = 5;
    const clientSockets = [];
    const receivedMessages = Array.from({ length: CLIENT_COUNT }, () => []);

    // Connect 5 spectator browser clients
    for (let i = 0; i < CLIENT_COUNT; i++) {
      const client = new WebSocket(`ws://127.0.0.1:${appPort}/traccar-ws`);
      clientSockets.push(client);
      client.on('message', (data) => {
        receivedMessages[i].push(JSON.parse(data.toString()));
      });
    }

    // Wait for all 5 clients to open
    await Promise.all(
      clientSockets.map(
        (sock) =>
          new Promise((resolve, reject) => {
            sock.on('open', resolve);
            sock.on('error', reject);
          })
      )
    );

    // Wait small tick for upstream connection to stabilize
    await new Promise((r) => setTimeout(r, 100));

    // Verify: multiple clients are active
    assert.equal(getActiveViewersCount(), CLIENT_COUNT);

    // CRITICAL: Exactly ONE upstream connection must be created to Traccar!
    assert.equal(upstreamConnectionsCount, 1, `Expected exactly 1 upstream connection to Traccar, got ${upstreamConnectionsCount}`);

    // Broadcast a test position payload from mock Traccar server
    const testPayload = JSON.stringify({
      positions: [{ deviceId: 101, latitude: -6.9175, longitude: 107.6191, speed: 28.4 }]
    });

    assert.ok(mockTraccarSockets.length > 0, 'Mock Traccar must have accepted upstream connection');
    mockTraccarSockets[0].send(testPayload);

    // Wait for fan-out delivery
    await new Promise((r) => setTimeout(r, 100));

    // All 5 clients must have received the fan-out broadcast
    for (let i = 0; i < CLIENT_COUNT; i++) {
      assert.equal(receivedMessages[i].length, 1, `Client ${i} did not receive broadcast`);
      assert.equal(receivedMessages[i][0].positions[0].deviceId, 101);
    }

    // Cleanup clients
    for (const client of clientSockets) {
      client.close();
    }
    await new Promise((r) => setTimeout(r, 50));
  });

  await t.test('broadcastToClients directly fans out to all active clients', async () => {
    const client1 = new WebSocket(`ws://127.0.0.1:${appPort}/traccar-ws`);
    const client2 = new WebSocket(`ws://127.0.0.1:${appPort}/traccar-ws`);

    await Promise.all([
      new Promise((res) => client1.on('open', res)),
      new Promise((res) => client2.on('open', res))
    ]);

    let c1Received = null;
    let c2Received = null;
    client1.on('message', (d) => { c1Received = JSON.parse(d.toString()); });
    client2.on('message', (d) => { c2Received = JSON.parse(d.toString()); });

    broadcastToClients(JSON.stringify({ test: 'direct_fanout' }));

    await new Promise((r) => setTimeout(r, 50));

    assert.deepEqual(c1Received, { test: 'direct_fanout' });
    assert.deepEqual(c2Received, { test: 'direct_fanout' });

    client1.close();
    client2.close();
  });

  await t.test('teardown', async () => {
    if (typeof closeUpstream === 'function') closeUpstream();
    for (const s of mockTraccarSockets) s.close();
    if (mockTraccarServer) await new Promise((res) => mockTraccarServer.close(res));
    if (appServer) await new Promise((res) => appServer.close(res));
  });
});
