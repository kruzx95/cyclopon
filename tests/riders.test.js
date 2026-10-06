const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const db = require('../db/database');
const app = require('../server');

test('Riders Onboarding, Manual Registration, Roles & Magic Link API', async (t) => {
  let server;
  let baseUrl;
  let eventId;

  await t.test('setup server and test event', async () => {
    const evResult = db.createEvent.run({
      name: 'Rider Onboarding Test Event',
      date: '2026-10-25'
    });
    eventId = Number(evResult.lastInsertRowid);

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  let createdSweeperToken = '';
  let createdSweeperId = null;

  await t.test('POST /api/admin/riders creates a manual sweeper with custom PIN and phone', async () => {
    const res = await fetch(`${baseUrl}/api/admin/riders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        bib: 'SWEEP-01',
        name: 'Pak Doni Sweeper',
        role: 'sweeper',
        phone: '081234567890',
        pin: '9988'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.bib, 'SWEEP-01');
    assert.equal(data.name, 'Pak Doni Sweeper');
    assert.equal(data.role, 'sweeper');
    assert.equal(data.phone, '081234567890');
    assert.equal(data.pin, '9988');
    assert.equal(data.color, '#F97316'); // Sweeper orange
    assert.ok(data.token, 'Token should be auto-generated');
    createdSweeperToken = data.token;
    createdSweeperId = data.id;
  });

  await t.test('POST /api/admin/riders defaults PIN to last 4 digits of phone if PIN is omitted', async () => {
    const res = await fetch(`${baseUrl}/api/admin/riders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        bib: 'RC-01',
        name: 'Marshall Captain',
        role: 'marshall',
        phone: '085799994321'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.role, 'marshall');
    assert.equal(data.pin, '4321');
    assert.equal(data.color, '#3B82F6'); // Marshall blue
  });

  await t.test('GET /api/admin/riders/events/:id returns full rider details including pin and token', async () => {
    const res = await fetch(`${baseUrl}/api/admin/riders/events/${eventId}`);
    assert.equal(res.status, 200);
    const list = await res.json();
    assert.ok(Array.isArray(list));
    assert.equal(list.length, 2);

    const sw = list.find(r => r.bib === 'SWEEP-01');
    assert.ok(sw);
    assert.equal(sw.pin, '9988');
    assert.equal(sw.phone, '081234567890');
    assert.equal(sw.token, createdSweeperToken);
  });

  await t.test('GET /api/auth/token/:token validates magic link login without requiring BIB or PIN', async () => {
    const res = await fetch(`${baseUrl}/api/auth/token/${createdSweeperToken}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.rider.bib, 'SWEEP-01');
    assert.equal(data.rider.role, 'sweeper');
    assert.equal(data.event.id, eventId);
  });

  await t.test('GET /api/auth/token/:token returns 404 for non-existent token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/token/invalidtoken999`);
    assert.equal(res.status, 404);
  });

  await t.test('POST /api/auth/rider/register allows on-the-spot self-service registration', async () => {
    const res = await fetch(`${baseUrl}/api/auth/rider/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        bib: 'MED-01',
        name: 'Dr. Siti Evakuasi',
        role: 'medic',
        phone: '081911223344',
        pin: '1122'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.rider.bib, 'MED-01');
    assert.equal(data.rider.role, 'medic');
    assert.equal(data.rider.color, '#EF4444'); // Medic red
  });

  await t.test('POST /api/admin/riders/events/:id/import bulk imports riders via CSV string', async () => {
    const csvContent = [
      'bib,nama,no_hp,peran,pin',
      '101,Rider Seratus Satu,081211112222,rider,',
      '102,Rider Seratus Dua,081233334444,rider,4444',
      'SWEEP-01,Duplicate Sweeper,081299998888,sweeper,1234' // Should be skipped as duplicate BIB
    ].join('\n');

    const res = await fetch(`${baseUrl}/api/admin/riders/events/${eventId}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: csvContent })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.imported, 2);
    assert.equal(data.skipped, 1);
  });

  await t.test('GET /api/admin/riders/events/:id/template downloads valid CSV template', async () => {
    const res = await fetch(`${baseUrl}/api/admin/riders/events/${eventId}/template`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/csv'));
    const text = await res.text();
    assert.ok(text.includes('bib,nama,no_hp,peran,pin'));
    assert.ok(text.includes('SWEEP-01'));
  });

  await t.test('DELETE /api/admin/riders/:id removes rider successfully', async () => {
    const res = await fetch(`${baseUrl}/api/admin/riders/${createdSweeperId}`, {
      method: 'DELETE'
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
  });

  await t.test('teardown', async () => {
    db.db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
