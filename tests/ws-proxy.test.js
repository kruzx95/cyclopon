const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const WebSocket = require('ws');
const db = require('../db/database');
const { setupTraccarWsProxy, getActiveViewersCount, broadcastToClients, closeUpstream } = require('../lib/traccar-ws-proxy');

test('WebSocket Proxy Singleton Upstream & Fan-Out Broadcast Engine', async (t) => {
  let mockTraccarServer;
  let mockTraccarPort;
  let appServer;
  let appPort;
  let upstreamConnectionsCount = 0;
  let mockTraccarSockets = [];
  let eventId;
  let testBib;
  let testDeviceId;
  let ownerRiderId;
  let ownerDeviceId;

  await t.test('setup mock traccar server and cyclopon ws proxy', async () => {
    // 1. Create test event (all WS clients are scoped to an event)
    const evResult = db.createEvent.run({
      name: 'WS Proxy Test Event',
      date: '2026-11-18'
    });
    eventId = Number(evResult.lastInsertRowid);
    // Unique per run so leftover test riders/devices from aborted runs never win
    // the auto-link lookup.
    testBib = `WSTEST-${eventId}`;
    testDeviceId = 800000 + eventId;

    // Generic fan-out device: must be mapped to this event, otherwise the proxy
    // correctly drops it (unmapped devices would leak across events).
    const ownerRes = db.createRider.run({
      event_id: eventId,
      bib: `WSOWNER-${eventId}`,
      name: 'WS Owner',
      pin: '1234',
      color: '#00E5FF'
    });
    ownerRiderId = Number(ownerRes.lastInsertRowid);
    ownerDeviceId = 900000 + eventId;
    db.db.prepare('UPDATE riders SET traccar_device_id = ? WHERE id = ?').run(ownerDeviceId, ownerRiderId);

    // 2. Create Mock Traccar WebSocket server
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
      const client = new WebSocket(`ws://127.0.0.1:${appPort}/traccar-ws?event_id=${eventId}`);
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
    // (device is mapped to this test event so it is deliverable to its viewers)
    const testPayload = JSON.stringify({
      positions: [{ deviceId: ownerDeviceId, latitude: -6.9175, longitude: 107.6191, speed: 28.4 }]
    });

    assert.ok(mockTraccarSockets.length > 0, 'Mock Traccar must have accepted upstream connection');
    mockTraccarSockets[0].send(testPayload);

    // Wait for fan-out delivery
    await new Promise((r) => setTimeout(r, 100));

    // All 5 clients must have received the fan-out broadcast
    for (let i = 0; i < CLIENT_COUNT; i++) {
      assert.equal(receivedMessages[i].length, 1, `Client ${i} did not receive broadcast`);
      assert.equal(receivedMessages[i][0].positions[0].deviceId, ownerDeviceId);
    }

    // Cleanup clients
    for (const client of clientSockets) {
      client.close();
    }
    await new Promise((r) => setTimeout(r, 50));
  });

  await t.test('broadcastToClients directly fans out to all active clients', async () => {
    const client1 = new WebSocket(`ws://127.0.0.1:${appPort}/traccar-ws?event_id=${eventId}`);
    const client2 = new WebSocket(`ws://127.0.0.1:${appPort}/traccar-ws?event_id=${eventId}`);

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
    // Use the scoped test event so the client is allowed to receive its riders
    let rider = db.db.prepare("SELECT * FROM riders WHERE event_id = ? AND bib = ?").get(eventId, testBib);
    if (!rider) {
      const res = db.createRider.run({
        event_id: eventId,
        bib: testBib,
        name: 'Test Rider 001',
        pin: '1234',
        color: '#00E5FF'
      });
      rider = db.getRiderById.get(res.lastInsertRowid);
    }

    // 1. Simulate Traccar upstream sending a device list containing the unique BIB
    mockTraccarSockets[0].send(JSON.stringify({
      devices: [{ id: testDeviceId, uniqueId: `BIB-${testBib}`, name: 'Rider Phone' }]
    }));

    // Wait a tick for proxy to process and sync SQLite
    await new Promise((r) => setTimeout(r, 120));

    // Verify: SQLite rider table has updated traccar_device_id
    const updatedRider = db.getRiderById.get(rider.id);
    assert.equal(updatedRider.traccar_device_id, testDeviceId);

    // 2. Connect a new spectator client and verify it immediately receives the cached device list
    const clientNew = new WebSocket(`ws://127.0.0.1:${appPort}/traccar-ws?event_id=${eventId}`);
    const receivedFromNew = [];
    clientNew.on('message', (d) => {
      receivedFromNew.push(JSON.parse(d.toString()));
    });

    await new Promise((res) => clientNew.on('open', res));
    await new Promise((r) => setTimeout(r, 120));

    assert.ok(receivedFromNew.some(msg => msg.devices && msg.devices[0].id === testDeviceId), 'New client must receive cached devices payload');

    // 3. Simulate Traccar upstream sending a position for the test device
    mockTraccarSockets[0].send(JSON.stringify({
      positions: [{ deviceId: testDeviceId, latitude: -7.3312, longitude: 108.2415, speed: 22.5 }]
    }));

    await new Promise((r) => setTimeout(r, 120));

    // Client must receive enriched position with rider_id and bib
    const posMsg = receivedFromNew.find(msg => msg.positions && msg.positions.some(p => p.deviceId === testDeviceId));
    assert.ok(posMsg, `Client must receive position update for device ${testDeviceId}`);
    assert.equal(posMsg.positions[0].rider_id, rider.id, 'Position must be enriched with rider_id');
    assert.equal(posMsg.positions[0].bib, testBib, 'Position must be enriched with rider bib');

    clientNew.close();
  });

  await t.test('unmapped devices are not leaked to event viewers and alerts do not poison the replay cache', async () => {
    const UNMAPPED_DEVICE_ID = ownerDeviceId + 7777;
    const client = new WebSocket(`ws://127.0.0.1:${appPort}/traccar-ws?event_id=${eventId}`);
    const replay = new WebSocket(`ws://127.0.0.1:${appPort}/traccar-ws?event_id=${eventId}`);
    const received = [];
    const replayMessages = [];
    client.on('message', (d) => { received.push(JSON.parse(d.toString())); });
    replay.on('message', (d) => { replayMessages.push(JSON.parse(d.toString())); });

    try {
      await Promise.all([
        new Promise((res) => client.on('open', res)),
        new Promise((res) => replay.on('open', res))
      ]);
      await new Promise((r) => setTimeout(r, 100));
      received.length = 0;

      // 1. Owned device reaches the viewer; unmapped device must be filtered out.
      mockTraccarSockets[0].send(JSON.stringify({
        positions: [
          { deviceId: ownerDeviceId, latitude: -6.9, longitude: 107.6, speed: 20 },
          { deviceId: UNMAPPED_DEVICE_ID, latitude: -6.2, longitude: 106.8, speed: 10 }
        ]
      }));
      await new Promise((r) => setTimeout(r, 120));

      assert.ok(
        received.some(msg => msg.positions && msg.positions.some(p => p.deviceId === ownerDeviceId)),
        'Owned device position must reach event viewer'
      );
      assert.equal(
        received.filter(msg => msg.positions && msg.positions.some(p => p.deviceId === UNMAPPED_DEVICE_ID)).length,
        0,
        'Unmapped device position must not reach event viewers'
      );

      // 2. Alert broadcast must not overwrite the cached telemetry payload.
      broadcastToClients(JSON.stringify({ type: 'alert', alerts: [{ id: 1, type: 'SOS' }] }), eventId);
      await new Promise((r) => setTimeout(r, 80));

      // A fresh client connecting now must replay telemetry, not the alert.
      const late = new WebSocket(`ws://127.0.0.1:${appPort}/traccar-ws?event_id=${eventId}`);
      const lateMessages = [];
      late.on('message', (d) => { lateMessages.push(JSON.parse(d.toString())); });
      try {
        await new Promise((res) => late.on('open', res));
        await new Promise((r) => setTimeout(r, 150));
      } finally {
        late.close();
      }

      assert.ok(
        lateMessages.some(msg => msg.positions && msg.positions.some(p => p.deviceId === ownerDeviceId)),
        'New client must still receive cached telemetry after an alert broadcast'
      );
      assert.equal(
        lateMessages.filter(msg => msg.type === 'alert').length,
        0,
        'Alert payload must not be replayed as cached telemetry'
      );
    } finally {
      client.close();
      replay.close();
      await new Promise((r) => setTimeout(r, 50));
    }
  });

  await t.test('teardown', async () => {
    if (typeof closeUpstream === 'function') closeUpstream();
    for (const s of mockTraccarSockets) s.close();
    if (mockTraccarServer) await new Promise((res) => mockTraccarServer.close(res));
    if (appServer) await new Promise((res) => appServer.close(res));
    if (eventId) db.db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
  });
});
