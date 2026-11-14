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

  await t.test('auto-maps Traccar devices to riders, enriches positions with rider_id, and replays devices to new clients', async () => {
    const db = require('../db/database');
    // Ensure test event and rider exists
    let ev = db.db.prepare("SELECT id FROM events LIMIT 1").get();
    let eventId = ev ? ev.id : 1;
    let rider = db.db.prepare("SELECT * FROM riders WHERE event_id = ? AND bib = '001'").get(eventId);
    if (!rider) {
      const res = db.createRider.run({
        event_id: eventId,
        bib: '001',
        name: 'Test Rider 001',
        pin: '1234',
        color: '#00E5FF'
      });
      rider = db.getRiderById.get(res.lastInsertRowid);
    }

    // 1. Simulate Traccar upstream sending a device list containing BIB-001 (internal deviceId: 777)
    mockTraccarSockets[0].send(JSON.stringify({
      devices: [{ id: 777, uniqueId: 'BIB-001', name: 'Rider Phone' }]
    }));

    // Wait a tick for proxy to process and sync SQLite
    await new Promise((r) => setTimeout(r, 120));

    // Verify: SQLite rider table has updated traccar_device_id
    const updatedRider = db.getRiderById.get(rider.id);
    assert.equal(updatedRider.traccar_device_id, 777);

    // 2. Connect a new spectator client and verify it immediately receives the cached device list
    const clientNew = new WebSocket(`ws://127.0.0.1:${appPort}/traccar-ws`);
    const receivedFromNew = [];
    clientNew.on('message', (d) => {
      receivedFromNew.push(JSON.parse(d.toString()));
    });

    await new Promise((res) => clientNew.on('open', res));
    await new Promise((r) => setTimeout(r, 120));

    assert.ok(receivedFromNew.some(msg => msg.devices && msg.devices[0].id === 777), 'New client must receive cached devices payload');

    // 3. Simulate Traccar upstream sending a position for deviceId 777
    mockTraccarSockets[0].send(JSON.stringify({
      positions: [{ deviceId: 777, latitude: -7.3312, longitude: 108.2415, speed: 22.5 }]
    }));

    await new Promise((r) => setTimeout(r, 120));

    // Client must receive enriched position with rider_id and bib
    const posMsg = receivedFromNew.find(msg => msg.positions && msg.positions.some(p => p.deviceId === 777));
    assert.ok(posMsg, 'Client must receive position update for device 777');
    assert.equal(posMsg.positions[0].rider_id, rider.id, 'Position must be enriched with rider_id');
    assert.equal(posMsg.positions[0].bib, '001', 'Position must be enriched with rider bib');

    clientNew.close();
  });

  await t.test('teardown', async () => {
    if (typeof closeUpstream === 'function') closeUpstream();
    for (const s of mockTraccarSockets) s.close();
    if (mockTraccarServer) await new Promise((res) => mockTraccarServer.close(res));
    if (appServer) await new Promise((res) => appServer.close(res));
  });
});
