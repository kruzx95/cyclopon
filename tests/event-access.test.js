const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const db = require('../db/database');
const app = require('../server');

test('Event Access PIN — locked events for trial riders', async (t) => {
  let server;
  let baseUrl;
  let eventId;
  let riderToken;
  let riderId;

  await t.test('setup server, event and rider', async () => {
    const evResult = db.createEvent.run({
      name: 'Event Access PIN Test Event',
      date: '2026-11-20'
    });
    eventId = Number(evResult.lastInsertRowid);

    const riderResult = db.createRider.run({
      event_id: eventId,
      bib: 'ACP-01',
      name: 'Rider Uji Coba',
      pin: '1234',
      color: '#00E5FF'
    });
    riderToken = db.getRiderById.get(Number(riderResult.lastInsertRowid)).token;
    riderId = Number(riderResult.lastInsertRowid);

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  await t.test('admin can set an event access PIN', async () => {
    const res = await fetch(`${baseUrl}/api/events/admin/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_pin: '654321' })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.access_pin, '654321');
  });

  await t.test('public event detail exposes only access_pin_required, never the PIN', async () => {
    const res = await fetch(`${baseUrl}/api/events/${eventId}`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.access_pin, undefined);
    assert.equal(data.access_pin_required, true);

    const listRes = await fetch(`${baseUrl}/api/events`);
    const list = await listRes.json();
    const listEvent = list.find(e => e.id === eventId);
    assert.ok(listEvent);
    assert.equal(listEvent.access_pin, undefined);
    assert.equal(listEvent.access_pin_required, true);
  });

  await t.test('rider login is rejected when the event PIN is missing or wrong', async () => {
    const missingRes = await fetch(`${baseUrl}/api/auth/rider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, bib: 'ACP-01', pin: '1234' })
    });
    assert.equal(missingRes.status, 401);
    const missing = await missingRes.json();
    assert.ok(missing.error.includes('terkunci'));

    const wrongRes = await fetch(`${baseUrl}/api/auth/rider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, bib: 'ACP-01', pin: '1234', event_pin: '000000' })
    });
    assert.equal(wrongRes.status, 401);
    const wrong = await wrongRes.json();
    assert.ok(wrong.error.includes('salah'));
  });

  await t.test('rider login succeeds with the correct event PIN', async () => {
    const res = await fetch(`${baseUrl}/api/auth/rider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, bib: 'ACP-01', pin: '1234', event_pin: '654321' })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.rider.bib, 'ACP-01');
  });

  await t.test('POST /api/events/:id/verify-pin validates event access PIN', async () => {
    const wrongRes = await fetch(`${baseUrl}/api/events/${eventId}/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '000000' })
    });
    assert.equal(wrongRes.status, 401);
    const wrong = await wrongRes.json();
    assert.equal(wrong.success, false);
    assert.ok(wrong.error.includes('salah'));

    const correctRes = await fetch(`${baseUrl}/api/events/${eventId}/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '654321' })
    });
    assert.equal(correctRes.status, 200);
    const correct = await correctRes.json();
    assert.equal(correct.success, true);
    assert.equal(correct.access_pin_required, true);
  });

  await t.test('GET /api/events/:id/riders supports x-event-pin header or ?pin query', async () => {
    const forbiddenRes = await fetch(`${baseUrl}/api/events/${eventId}/riders`);
    assert.equal(forbiddenRes.status, 403);

    const queryRes = await fetch(`${baseUrl}/api/events/${eventId}/riders?pin=654321`);
    assert.equal(queryRes.status, 200);
    const queryRiders = await queryRes.json();
    assert.ok(Array.isArray(queryRiders));

    const headerRes = await fetch(`${baseUrl}/api/events/${eventId}/riders`, {
      headers: { 'x-event-pin': '654321' }
    });
    assert.equal(headerRes.status, 200);
    const headerRiders = await headerRes.json();
    assert.ok(Array.isArray(headerRiders));
  });

  await t.test('GET /api/events/:id/results and CSV export require the event PIN', async () => {
    const forbiddenResults = await fetch(`${baseUrl}/api/events/${eventId}/results`);
    assert.equal(forbiddenResults.status, 403);
    const forbiddenJson = await forbiddenResults.json();
    assert.equal(forbiddenJson.access_pin_required, true);

    const allowedResults = await fetch(`${baseUrl}/api/events/${eventId}/results`, {
      headers: { 'x-event-pin': '654321' }
    });
    assert.equal(allowedResults.status, 200);
    const results = await allowedResults.json();
    assert.equal(results.event.access_pin, undefined);
    assert.equal(results.event.access_pin_required, true);

    const forbiddenCsv = await fetch(`${baseUrl}/api/events/${eventId}/export/csv`);
    assert.equal(forbiddenCsv.status, 403);

    const allowedCsv = await fetch(`${baseUrl}/api/events/${eventId}/export/csv`, {
      headers: { 'x-event-pin': '654321' }
    });
    assert.equal(allowedCsv.status, 200);
    assert.match(allowedCsv.headers.get('content-type') || '', /text\/csv/i);
  });

  await t.test('SOS alerts and telemetry ingestion require the event PIN', async () => {
    const alertsNoPin = await fetch(`${baseUrl}/api/events/${eventId}/alerts`);
    assert.equal(alertsNoPin.status, 403);

    const alertsWithPin = await fetch(`${baseUrl}/api/events/${eventId}/alerts`, {
      headers: { 'x-event-pin': '654321' }
    });
    assert.equal(alertsWithPin.status, 200);

    const alertPayload = {
      rider_id: riderId,
      type: 'MEDICAL',
      latitude: -6.9,
      longitude: 107.6,
      message: 'Butuh bantuan medis'
    };

    const sosNoPin = await fetch(`${baseUrl}/api/events/${eventId}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alertPayload)
    });
    assert.equal(sosNoPin.status, 403);

    const sosWithPin = await fetch(`${baseUrl}/api/events/${eventId}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-event-pin': '654321' },
      body: JSON.stringify(alertPayload)
    });
    assert.equal(sosWithPin.status, 201);

    const historyPayload = {
      positions: [{
        rider_id: riderId,
        latitude: -6.9,
        longitude: 107.6,
        speed: 20,
        recorded_at: new Date().toISOString()
      }]
    };

    const historyNoPin = await fetch(`${baseUrl}/api/events/${eventId}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(historyPayload)
    });
    assert.equal(historyNoPin.status, 403);

    const historyWithPin = await fetch(`${baseUrl}/api/events/${eventId}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-event-pin': '654321' },
      body: JSON.stringify(historyPayload)
    });
    assert.equal(historyWithPin.status, 201);
  });

  await t.test('checkpoint and split data require the event PIN', async () => {
    for (const path of [
      `/api/events/${eventId}/checkpoints`,
      `/api/events/${eventId}/splits`,
      `/api/riders/${riderId}/splits`
    ]) {
      const noPin = await fetch(`${baseUrl}${path}`);
      assert.equal(noPin.status, 403, `${path} should require the event PIN`);

      const withPin = await fetch(`${baseUrl}${path}`, {
        headers: { 'x-event-pin': '654321' }
      });
      assert.equal(withPin.status, 200, `${path} should work with the event PIN`);
    }
  });

  await t.test('static /gpx/:id.gpx cannot bypass the event PIN', async () => {
    const noPin = await fetch(`${baseUrl}/gpx/${eventId}.gpx`);
    assert.equal(noPin.status, 403);

    const wrongPin = await fetch(`${baseUrl}/gpx/${eventId}.gpx?pin=000000`);
    assert.equal(wrongPin.status, 403);

    // Correct PIN reaches the static handler (200 when the GPX exists, 404 otherwise).
    const correctPin = await fetch(`${baseUrl}/gpx/${eventId}.gpx?pin=654321`);
    assert.ok([200, 404].includes(correctPin.status), `Unexpected status ${correctPin.status}`);
  });

  await t.test('GET /api/events/:id/gpx/download allows registered rider via token or PIN', async () => {
    const noAuth = await fetch(`${baseUrl}/api/events/${eventId}/gpx/download`);
    assert.equal(noAuth.status, 403);

    const wrongToken = await fetch(`${baseUrl}/api/events/${eventId}/gpx/download?token=invalid_token`);
    assert.equal(wrongToken.status, 403);

    const rider = db.getRiderById.get(riderId);
    const withToken = await fetch(`${baseUrl}/api/events/${eventId}/gpx/download?token=${rider.token}`);
    assert.equal(withToken.status, 404);

    const withHeader = await fetch(`${baseUrl}/api/events/${eventId}/gpx/download`, {
      headers: { 'x-rider-token': rider.token }
    });
    assert.equal(withHeader.status, 404);
  });

  await t.test('verify-pin throttles repeated wrong PIN guesses', async () => {
    let lastRes;
    for (let i = 0; i < 10; i++) {
      lastRes = await fetch(`${baseUrl}/api/events/${eventId}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: '000000' })
      });
    }

    assert.equal(lastRes.status, 429);
    assert.ok(Number(lastRes.headers.get('retry-after')) > 0);

    // The correct PIN is still accepted and clears the throttle counter.
    const correctRes = await fetch(`${baseUrl}/api/events/${eventId}/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '654321' })
    });
    assert.equal(correctRes.status, 200);
  });

  await t.test('admin Magic Link still works without the event PIN', async () => {
    const res = await fetch(`${baseUrl}/api/auth/token/${riderToken}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
  });

  await t.test('self-registration requires the event PIN', async () => {
    const payload = {
      event_id: eventId,
      bib: 'ACP-02',
      name: 'Rider Walk In',
      phone: '081200001111',
      pin: '1111'
    };

    const missingRes = await fetch(`${baseUrl}/api/auth/rider/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(missingRes.status, 403);

    const wrongRes = await fetch(`${baseUrl}/api/auth/rider/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, event_pin: '999999' })
    });
    assert.equal(wrongRes.status, 403);

    const okRes = await fetch(`${baseUrl}/api/auth/rider/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, event_pin: '654321' })
    });
    assert.equal(okRes.status, 201);
    const ok = await okRes.json();
    assert.equal(ok.success, true);
    assert.equal(ok.rider.bib, 'ACP-02');
  });

  await t.test('invalid event PIN format is rejected by the admin API', async () => {
    const res = await fetch(`${baseUrl}/api/events/admin/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_pin: 'abc' })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes('4-8 digit'));
  });

  await t.test('clearing the access PIN unlocks the event', async () => {
    const res = await fetch(`${baseUrl}/api/events/admin/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_pin: null })
    });
    assert.equal(res.status, 200);

    const detailRes = await fetch(`${baseUrl}/api/events/${eventId}`);
    const detail = await detailRes.json();
    assert.equal(detail.access_pin_required, false);

    const loginRes = await fetch(`${baseUrl}/api/auth/rider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, bib: 'ACP-01', pin: '1234' })
    });
    assert.equal(loginRes.status, 200);
  });

  await t.test('register page exposes dynamic event PIN field for locked events', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const registerSrc = fs.readFileSync(path.join(__dirname, '..', 'public/js/pages/register.js'), 'utf8');
    assert.match(registerSrc, /id="regEventPinGroup"/);
    assert.match(registerSrc, /id="regEventPin"/);
    assert.match(registerSrc, /ev\.access_pin_required/);
    assert.match(registerSrc, /event_pin:\s*eventPin \|\| undefined/);
  });

  await t.test('teardown', async () => {
    db.db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
