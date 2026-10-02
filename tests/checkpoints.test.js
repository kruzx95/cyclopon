const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const db = require('../db/database');
const app = require('../server');

test('Checkpoints & Split Times API & Database', async (t) => {
  let server;
  let baseUrl;

  await t.test('setup server and test event', async () => {
    // Ensure test event exists
    const eventResult = db.createEvent.run({
      name: 'Audax 200 Test Event',
      date: '2026-10-15'
    });
    const eventId = Number(eventResult.lastInsertRowid);

    // Ensure test rider exists
    const riderResult = db.createRider.run({
      event_id: eventId,
      bib: '101',
      name: 'Audax Rider',
      pin: '1234',
      traccar_device_id: 10101,
      color: '#00E5FF'
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

  await t.test('POST /api/events/:id/checkpoints creates a new checkpoint', async () => {
    const { eventId } = t.context;

    const res = await fetch(`${baseUrl}/api/events/${eventId}/checkpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'CP 1 Waduk Cirata',
        km_distance: 50.5,
        open_time: '06:00',
        close_time: '10:00',
        latitude: -6.7214,
        longitude: 107.3512
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.checkpoint.name, 'CP 1 Waduk Cirata');
    assert.equal(data.checkpoint.km_distance, 50.5);
    assert.equal(data.checkpoint.close_time, '10:00');
    assert.ok(data.checkpoint.id);
    t.context.checkpointId = data.checkpoint.id;
  });

  await t.test('GET /api/events/:id/checkpoints returns checkpoints list ordered by km', async () => {
    const { eventId } = t.context;

    // Add CP 2
    await fetch(`${baseUrl}/api/events/${eventId}/checkpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'CP 2 Padalarang',
        km_distance: 105.0,
        open_time: '08:00',
        close_time: '14:30',
        latitude: -6.8421,
        longitude: 107.4812
      })
    });

    const res = await fetch(`${baseUrl}/api/events/${eventId}/checkpoints`);
    assert.equal(res.status, 200);
    const cps = await res.json();
    assert.ok(Array.isArray(cps));
    assert.ok(cps.length >= 2);
    assert.equal(cps[0].name, 'CP 1 Waduk Cirata');
    assert.equal(cps[1].name, 'CP 2 Padalarang');
  });

  await t.test('POST /api/events/:id/splits records rider CP split time and COT status', async () => {
    const { eventId, riderId, checkpointId } = t.context;

    const res = await fetch(`${baseUrl}/api/events/${eventId}/splits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rider_id: riderId,
        checkpoint_id: checkpointId,
        arrival_time: '2026-10-15T08:45:00.000Z',
        status: 'IN_TIME'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.split.rider_id, riderId);
    assert.equal(data.split.status, 'IN_TIME');
  });

  await t.test('GET /api/events/:id/splits returns all event splits with rider details', async () => {
    const { eventId, riderId } = t.context;

    const res = await fetch(`${baseUrl}/api/events/${eventId}/splits`);
    assert.equal(res.status, 200);
    const splits = await res.json();
    assert.ok(Array.isArray(splits));
    assert.ok(splits.length >= 1);
    const split = splits.find(s => s.rider_id === riderId);
    assert.ok(split);
    assert.equal(split.rider_bib, '101');
    assert.equal(split.checkpoint_name, 'CP 1 Waduk Cirata');
  });

  await t.test('DELETE /api/checkpoints/:id removes checkpoint', async () => {
    const { checkpointId, eventId } = t.context;

    const res = await fetch(`${baseUrl}/api/checkpoints/${checkpointId}`, {
      method: 'DELETE'
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);

    const checkRes = await fetch(`${baseUrl}/api/events/${eventId}/checkpoints`);
    const cps = await checkRes.json();
    assert.equal(cps.some(c => c.id === checkpointId), false);
  });

  await t.test('teardown', async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
