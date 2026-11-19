const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const db = require('../db/database');
const app = require('../server');
const { generateAdminSession } = require('../lib/admin-auth');

test('Sponsors & Partner Logos Suite', async (t) => {
  let server;
  let baseUrl;
  let adminToken;

  await t.test('setup server and test event', async () => {
    const eventResult = db.createEvent.run({
      name: 'Sponsor Test Event 2026',
      date: '2026-11-20'
    });
    const eventId = Number(eventResult.lastInsertRowid);
    const session = generateAdminSession();
    adminToken = session.token;

    t.context = { eventId };

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  await t.test('GET /api/events/:id/sponsors returns empty list initially', async () => {
    const { eventId } = t.context;
    const res = await fetch(`${baseUrl}/api/events/${eventId}/sponsors`);
    assert.equal(res.status, 200);
    const sponsors = await res.json();
    assert.ok(Array.isArray(sponsors));
    assert.equal(sponsors.length, 0);
  });

  await t.test('POST /api/events/admin/:id/sponsors rejects unauthenticated requests', async () => {
    const { eventId } = t.context;
    const res = await fetch(`${baseUrl}/api/events/admin/${eventId}/sponsors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-enforce-auth': '1'
      },
      body: JSON.stringify({
        name: 'Unauth Sponsor',
        logo_path: '/uploads/sponsors/test.png'
      })
    });
    assert.equal(res.status, 401);
  });

  await t.test('POST /api/events/admin/:id/sponsors creates multiple sponsors with sanitised links', async () => {
    const { eventId } = t.context;

    // Sponsor 1: Suddenly CC (order: 2, raw domain link)
    const res1 = await fetch(`${baseUrl}/api/events/admin/${eventId}/sponsors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Suddenly CC',
        logo_path: '/uploads/sponsors/sdnlycc.jpeg',
        link: 'suddenly.cc',
        sort_order: 2
      })
    });
    assert.equal(res1.status, 201);
    const data1 = await res1.json();
    assert.equal(data1.success, true);
    assert.equal(data1.sponsor.name, 'Suddenly CC');
    assert.equal(data1.sponsor.logo_path, '/uploads/sponsors/sdnlycc.jpeg');
    assert.equal(data1.sponsor.link, 'https://suddenly.cc');
    t.context.sponsor1Id = data1.sponsor.id;

    // Sponsor 2: Polygon Bikes (order: 1, full https link)
    const res2 = await fetch(`${baseUrl}/api/events/admin/${eventId}/sponsors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Polygon Bikes',
        logo_path: '/uploads/sponsors/polygon.png',
        link: 'https://polygonbikes.com',
        sort_order: 1
      })
    });
    assert.equal(res2.status, 201);
    const data2 = await res2.json();
    assert.equal(data2.sponsor.name, 'Polygon Bikes');
    assert.equal(data2.sponsor.link, 'https://polygonbikes.com');
    t.context.sponsor2Id = data2.sponsor.id;

    // Sponsor 3: Wahoo Fitness (order: 3, link without protocol)
    const res3 = await fetch(`${baseUrl}/api/events/admin/${eventId}/sponsors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Wahoo Fitness',
        logo_path: '/uploads/sponsors/wahoo.svg',
        link: 'wahoofitness.com/gps',
        sort_order: 3
      })
    });
    assert.equal(res3.status, 201);
    const data3 = await res3.json();
    assert.equal(data3.sponsor.link, 'https://wahoofitness.com/gps');
    t.context.sponsor3Id = data3.sponsor.id;
  });

  await t.test('PATCH /api/events/admin/sponsors/:id/size updates logo size', async () => {
    const { eventId } = t.context;
    const auth = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` };

    const createRes = await fetch(`${baseUrl}/api/events/admin/${eventId}/sponsors`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ name: 'SizeTest', logo_path: '/img.png', sort_order: 9, sponsor_logo_size: 60 })
    });
    const created = (await createRes.json()).sponsor;
    assert.equal(created.sponsor_logo_size, 60);

    const res = await fetch(`${baseUrl}/api/events/admin/sponsors/${created.id}/size`, {
      method: 'PATCH', headers: auth, body: JSON.stringify({ size: 80 })
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).sponsor.sponsor_logo_size, 80);

    const bad = await fetch(`${baseUrl}/api/events/admin/sponsors/${created.id}/size`, {
      method: 'PATCH', headers: auth, body: JSON.stringify({ size: 500 })
    });
    assert.equal(bad.status, 400);

    // cleanup so later count assertions stay valid
    await fetch(`${baseUrl}/api/events/admin/sponsors/${created.id}`, {
      method: 'DELETE', headers: { 'Authorization': `Bearer ${adminToken}` }
    });
  });

  await t.test('GET /api/events/:id/sponsors returns all sponsors sorted by sort_order', async () => {
    const { eventId } = t.context;
    const res = await fetch(`${baseUrl}/api/events/${eventId}/sponsors`);
    assert.equal(res.status, 200);
    const sponsors = await res.json();
    assert.equal(sponsors.length, 3);

    // Sorted by sort_order: Polygon Bikes (1), Suddenly CC (2), Wahoo Fitness (3)
    assert.equal(sponsors[0].name, 'Polygon Bikes');
    assert.equal(sponsors[0].link, 'https://polygonbikes.com');
    assert.equal(sponsors[1].name, 'Suddenly CC');
    assert.equal(sponsors[1].link, 'https://suddenly.cc');
    assert.equal(sponsors[2].name, 'Wahoo Fitness');
    assert.equal(sponsors[2].link, 'https://wahoofitness.com/gps');
  });

  await t.test('DELETE /api/events/admin/sponsors/:id deletes sponsor', async () => {
    const { eventId, sponsor2Id } = t.context;
    const res = await fetch(`${baseUrl}/api/events/admin/sponsors/${sponsor2Id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);

    // Verify list now has 2 sponsors
    const listRes = await fetch(`${baseUrl}/api/events/${eventId}/sponsors`);
    const sponsors = await listRes.json();
    assert.equal(sponsors.length, 2);
    assert.equal(sponsors.some(s => s.name === 'Polygon Bikes'), false);
  });

  await t.test('Cascade delete: deleting event removes all its sponsors', async () => {
    const { eventId } = t.context;
    db.deleteEvent.run(eventId);

    const remainingSponsors = db.getSponsorsByEvent.all(eventId);
    assert.equal(remainingSponsors.length, 0);
  });

  await t.test('teardown', async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
