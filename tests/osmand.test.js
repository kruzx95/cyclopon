const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const db = require('../db/database');
const app = require('../server');

test('OsmAnd / Traccar Client Integration API', async (t) => {
  let server;
  let baseUrl;
  let testEventId;
  let testRiderId;

  await t.test('setup test event and rider', async () => {
    const eventRes = db.createEvent.run({
      name: 'OsmAnd Test Event',
      date: '2026-11-15'
    });
    testEventId = Number(eventRes.lastInsertRowid);

    const riderRes = db.createRider.run({
      event_id: testEventId,
      bib: '998877',
      name: 'Test OsmAnd Rider',
      pin: '1234',
      traccar_device_id: 998877,
      color: '#10B981'
    });
    testRiderId = Number(riderRes.lastInsertRowid);

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  await t.test('GET /api/osmand with BIB identifier logs position correctly', async () => {
    const res = await fetch(`${baseUrl}/api/osmand?id=998877&lat=-6.9175&lon=107.6191&speed=10.0&batt=90`);
    assert.strictEqual(res.status, 200);
    const body = await res.text();
    assert.strictEqual(body, 'OK');

    const history = db.db.prepare('SELECT * FROM position_history WHERE rider_id = ? ORDER BY id DESC LIMIT 1').get(testRiderId);
    assert.ok(history, 'Position should be recorded in database');
    assert.strictEqual(history.rider_id, testRiderId);
    assert.strictEqual(history.latitude, -6.9175);
    assert.strictEqual(history.longitude, 107.6191);
    assert.ok(history.speed > 0, 'Speed should be converted and saved');
  });

  await t.test('GET /osmand route alias works identical to /api/osmand', async () => {
    // Wait > 1000ms so throttle does not skip
    await new Promise(r => setTimeout(r, 1100));
    const res = await fetch(`${baseUrl}/osmand?id=998877&lat=-6.9200&lon=107.6200&speed=8.5`);
    assert.strictEqual(res.status, 200);
    const body = await res.text();
    assert.strictEqual(body, 'OK');

    const history = db.db.prepare('SELECT * FROM position_history WHERE rider_id = ? ORDER BY id DESC LIMIT 1').get(testRiderId);
    assert.strictEqual(history.latitude, -6.9200);
  });

  await t.test('GET /api/osmand works without admin authentication (never returns 401)', async () => {
    await new Promise(r => setTimeout(r, 1100));
    // Simulate production mode security check where x-enforce-auth is evaluated
    const res = await fetch(`${baseUrl}/api/osmand?id=998877&lat=-6.9210&lon=107.6210&speed=12.0`, {
      headers: { 'x-enforce-auth': '1' }
    });
    assert.strictEqual(res.status, 200, 'Public telemetry endpoint must not be blocked by admin auth');
    const body = await res.text();
    assert.strictEqual(body, 'OK');
  });

  await t.test('POST /api/osmand with x-www-form-urlencoded body succeeds (Traccar Client default)', async () => {
    await new Promise(r => setTimeout(r, 1100));
    const res = await fetch(`${baseUrl}/api/osmand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'id=998877&lat=-6.9220&lon=107.6220&speed=15.0&batt=88'
    });
    assert.strictEqual(res.status, 200);
    const body = await res.text();
    assert.strictEqual(body, 'OK');

    const history = db.db.prepare('SELECT * FROM position_history WHERE rider_id = ? ORDER BY id DESC LIMIT 1').get(testRiderId);
    assert.strictEqual(history.latitude, -6.9220);
    assert.strictEqual(history.longitude, 107.6220);
  });

  await t.test('POST /api/osmand with text/plain body succeeds', async () => {
    await new Promise(r => setTimeout(r, 1100));
    const res = await fetch(`${baseUrl}/api/osmand`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'id=998877&lat=-6.9230&lon=107.6230&speed=11.0'
    });
    assert.strictEqual(res.status, 200);
    const body = await res.text();
    assert.strictEqual(body, 'OK');
  });

  await t.test('GET /api/osmand returns 400 when missing parameters', async () => {
    const res = await fetch(`${baseUrl}/api/osmand?lat=-6.9175`);
    assert.strictEqual(res.status, 400);
  });

  await t.test('teardown server and cleanup test data', async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    db.db.prepare('DELETE FROM position_history WHERE event_id = ?').run(testEventId);
    db.db.prepare('DELETE FROM riders WHERE event_id = ?').run(testEventId);
    db.db.prepare('DELETE FROM events WHERE id = ?').run(testEventId);
  });
});
