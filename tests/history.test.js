const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const db = require('../db/database');
const app = require('../server');

test('Telemetry History Logger & API', async (t) => {
  let server;
  let baseUrl;

  await t.test('setup server and test event', async () => {
    const eventResult = db.createEvent.run({
      name: 'Replay Test Event 2026',
      date: '2026-10-20'
    });
    const eventId = Number(eventResult.lastInsertRowid);

    const rider1Result = db.createRider.run({
      event_id: eventId,
      bib: '201',
      name: 'Rider Satu',
      pin: '1234',
      traccar_device_id: 20101,
      color: '#FFE600'
    });
    const rider1Id = Number(rider1Result.lastInsertRowid);

    const rider2Result = db.createRider.run({
      event_id: eventId,
      bib: '202',
      name: 'Rider Dua',
      pin: '1234',
      traccar_device_id: 20202,
      color: '#00E5FF'
    });
    const rider2Id = Number(rider2Result.lastInsertRowid);

    t.context = { eventId, rider1Id, rider2Id };

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  await t.test('POST /api/events/:id/history logs a single telemetry position', async () => {
    const { eventId, rider1Id } = t.context;

    const res = await fetch(`${baseUrl}/api/events/${eventId}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rider_id: rider1Id,
        latitude: -6.9175,
        longitude: 107.6191,
        speed: 28.5,
        distance_km: 12.4,
        recorded_at: '2026-10-20T07:15:00.000Z'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.inserted, 1);
  });

  await t.test('POST /api/events/:id/history logs batch telemetry positions', async () => {
    const { eventId, rider1Id, rider2Id } = t.context;

    const res = await fetch(`${baseUrl}/api/events/${eventId}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        positions: [
          {
            rider_id: rider1Id,
            latitude: -6.9200,
            longitude: 107.6250,
            speed: 31.0,
            distance_km: 15.0,
            recorded_at: '2026-10-20T07:20:00.000Z'
          },
          {
            rider_id: rider2Id,
            latitude: -6.9180,
            longitude: 107.6210,
            speed: 26.2,
            distance_km: 13.8,
            recorded_at: '2026-10-20T07:20:00.000Z'
          }
        ]
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.inserted, 2);
  });

  await t.test('GET /api/events/:id/history returns sorted history points with rider info', async () => {
    const { eventId } = t.context;

    const res = await fetch(`${baseUrl}/api/events/${eventId}/history`);
    assert.equal(res.status, 200);
    const points = await res.json();

    assert.ok(Array.isArray(points));
    assert.equal(points.length, 3);
    assert.ok(points[0].rider_name);
    assert.ok(points[0].rider_bib);
    assert.equal(points[0].speed, 28.5);
    // Chronological ordering
    assert.ok(new Date(points[0].recorded_at) <= new Date(points[1].recorded_at));
  });

  await t.test('GET /api/events/:id/history?rider_id=X filters by rider', async () => {
    const { eventId, rider1Id } = t.context;

    const res = await fetch(`${baseUrl}/api/events/${eventId}/history?rider_id=${rider1Id}`);
    assert.equal(res.status, 200);
    const points = await res.json();

    assert.ok(Array.isArray(points));
    assert.equal(points.length, 2);
    assert.ok(points.every(p => p.rider_id === rider1Id));
  });

  await t.test('teardown', async () => {
    const { eventId } = t.context;
    try {
      db.db.prepare('DELETE FROM position_history WHERE event_id = ?').run(eventId);
      db.db.prepare('DELETE FROM riders WHERE event_id = ?').run(eventId);
      db.db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
    } catch (_) {}
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });
});
