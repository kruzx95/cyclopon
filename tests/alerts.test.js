const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const db = require('../db/database');
const app = require('../server');

test('Alerts API & Database', async (t) => {
  let server;
  let baseUrl;

  await t.test('setup server and test event', async () => {
    // Ensure test event exists
    const eventResult = db.createEvent.run({
      name: 'Test Safety Event',
      date: '2026-10-15'
    });
    const eventId = Number(eventResult.lastInsertRowid);

    // Ensure test rider exists
    const riderResult = db.createRider.run({
      event_id: eventId,
      bib: '999',
      name: 'Safety Test Rider',
      pin: '1234',
      traccar_device_id: 9999,
      color: '#FF0000'
    });
    const riderId = Number(riderResult.lastInsertRowid);

    t.context = { eventId, riderId };

    // Start HTTP server on dynamic port
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  await t.test('POST /api/events/:id/alerts creates a new SOS alert', async () => {
    const { eventId, riderId } = t.context;

    const res = await fetch(`${baseUrl}/api/events/${eventId}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rider_id: riderId,
        type: 'CRASH',
        latitude: -6.9147,
        longitude: 107.6098,
        message: 'Jatuh di turunan KM 45, butuh ambulans'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.alert.rider_id, riderId);
    assert.equal(data.alert.type, 'CRASH');
    assert.equal(data.alert.resolved, 0);
    assert.ok(data.alert.id);
    t.context.alertId = data.alert.id;
  });

  await t.test('GET /api/events/:id/alerts returns active alerts with rider details', async () => {
    const { eventId, riderId } = t.context;

    const res = await fetch(`${baseUrl}/api/events/${eventId}/alerts`);
    assert.equal(res.status, 200);
    const alerts = await res.json();
    assert.ok(Array.isArray(alerts));
    const created = alerts.find(a => a.id === t.context.alertId);
    assert.ok(created, 'Created alert must be in active alerts list');
    assert.equal(created.rider_name, 'Safety Test Rider');
    assert.equal(created.rider_bib, '999');
  });

  await t.test('PUT /api/alerts/:id/resolve resolves the active alert', async () => {
    const { alertId, eventId } = t.context;

    const res = await fetch(`${baseUrl}/api/alerts/${alertId}/resolve`, {
      method: 'PUT'
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);

    // Verify it is no longer returned in active alerts
    const checkRes = await fetch(`${baseUrl}/api/events/${eventId}/alerts?active=1`);
    const activeAlerts = await checkRes.json();
    const stillActive = activeAlerts.find(a => a.id === alertId);
    assert.equal(stillActive, undefined, 'Resolved alert should not be in active list');
  });

  await t.test('POST /api/events/:id/alerts falls back to latest GPS coordinates from position_history when coordinates not provided', async () => {
    const { eventId, riderId } = t.context;

    // Seed position_history for the rider
    db.recordPositionHistory.run({
      event_id: eventId,
      rider_id: riderId,
      latitude: -7.2504,
      longitude: 112.7688,
      speed: 25.5,
      distance_km: 12.4,
      recorded_at: new Date().toISOString()
    });

    const res = await fetch(`${baseUrl}/api/events/${eventId}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rider_id: riderId,
        type: 'MEDICAL',
        latitude: null,
        longitude: null,
        message: 'Kram otot parah'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.alert.latitude, -7.2504);
    assert.equal(data.alert.longitude, 112.7688);
  });

  await t.test('teardown', async () => {
    const { eventId } = t.context;
    db.db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
