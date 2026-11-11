const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const db = require('../db/database');
const app = require('../server');

test('Auth API & Flow Validation', async (t) => {
  let server;
  let baseUrl;

  await t.test('setup server and test events', async () => {
    // Create Event 1
    const ev1Result = db.createEvent.run({
      name: 'Auth Test Event 1',
      date: '2026-10-20'
    });
    const eventId1 = Number(ev1Result.lastInsertRowid);

    // Create Event 2
    const ev2Result = db.createEvent.run({
      name: 'Auth Test Event 2',
      date: '2026-10-21'
    });
    const eventId2 = Number(ev2Result.lastInsertRowid);

    // Create Rider in Event 1 with BIB 777
    const rider1Result = db.createRider.run({
      event_id: eventId1,
      bib: '777',
      name: 'Rider Event 1',
      pin: '1234',
      traccar_device_id: 7771,
      color: '#00E5FF'
    });
    const riderId1 = Number(rider1Result.lastInsertRowid);

    // Create Rider in Event 2 with SAME BIB 777 but different PIN
    const rider2Result = db.createRider.run({
      event_id: eventId2,
      bib: '777',
      name: 'Rider Event 2',
      pin: '5678',
      traccar_device_id: 7772,
      color: '#FFE600'
    });
    const riderId2 = Number(rider2Result.lastInsertRowid);

    t.context = { eventId1, eventId2, riderId1, riderId2 };

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  await t.test('POST /api/auth/rider logs in rider with specific event_id, bib, and pin', async () => {
    const { eventId1 } = t.context;
    const res = await fetch(`${baseUrl}/api/auth/rider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId1, bib: '777', pin: '1234' })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.rider.name, 'Rider Event 1');
    assert.equal(data.event.id, eventId1);
    assert.equal(data.traccar.deviceIdentifier, '7771');
  });

  await t.test('POST /api/auth/rider rejects login if bib/pin is for another event', async () => {
    const { eventId2 } = t.context;
    // Rider 1's PIN in Event 2
    const res = await fetch(`${baseUrl}/api/auth/rider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId2, bib: '777', pin: '1234' })
    });

    assert.equal(res.status, 401);
  });

  await t.test('POST /api/auth/admin/login handles dev admin login', async () => {
    const res = await fetch(`${baseUrl}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin', password: 'admin' })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.user.administrator, true);
  });

  await t.test('teardown', async () => {
    const { eventId1, eventId2 } = t.context;
    db.db.prepare('DELETE FROM events WHERE id IN (?, ?)').run(eventId1, eventId2);
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
