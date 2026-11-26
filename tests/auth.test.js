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

  await t.test('POST /api/auth/rider and GET /api/auth/token allow sweeper, marshall, and medic on archived events', async () => {
    const archivedEvResult = db.createEvent.run({
      name: 'Archived Poster Event',
      date: '2026-09-01'
    });
    const archivedEventId = Number(archivedEvResult.lastInsertRowid);
    db.db.prepare('UPDATE events SET active = 0 WHERE id = ?').run(archivedEventId);

    try {
      const roles = [
        { bib: 'SWEEP-01', name: 'Doni Sweeper', role: 'sweeper', pin: '1111' },
        { bib: 'RC-01', name: 'Agus Marshall', role: 'marshall', pin: '2222' },
        { bib: 'MED-01', name: 'Sari Medic', role: 'medic', pin: '3333' }
      ];

      for (const participant of roles) {
        db.createRider.run({
          event_id: archivedEventId,
          bib: participant.bib,
          name: participant.name,
          pin: participant.pin,
          role: participant.role
        });

        // Verify lowercase BIB input also resolves on login
        const loginRes = await fetch(`${baseUrl}/api/auth/rider`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: archivedEventId,
            bib: participant.bib.toLowerCase(),
            pin: participant.pin
          })
        });
        assert.equal(loginRes.status, 200);
        const loginData = await loginRes.json();
        assert.equal(loginData.success, true);
        assert.equal(loginData.rider.role, participant.role);
        assert.equal(loginData.event.name, 'Archived Poster Event');
        assert.ok(loginData.rider.token);

        // Verify token lookup works for Ride Card session check
        const tokenRes = await fetch(`${baseUrl}/api/auth/token/${encodeURIComponent(loginData.rider.token)}`);
        assert.equal(tokenRes.status, 200);
        const tokenData = await tokenRes.json();
        assert.equal(tokenData.success, true);
        assert.equal(tokenData.rider.bib, participant.bib);
        assert.equal(tokenData.rider.role, participant.role);
      }
    } finally {
      db.db.prepare('DELETE FROM events WHERE id = ?').run(archivedEventId);
    }
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

  await t.test('POST /api/auth/admin/login rejects default admin password in production mode', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await fetch(`${baseUrl}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin', password: 'admin' })
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.ok(data.error.includes('dinonaktifkan di VPS/Production'));
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  await t.test('POST /api/auth/admin/login authenticates with custom ADMIN_USER and ADMIN_PASSWORD in production', async () => {
    const origEnv = process.env.NODE_ENV;
    const origUser = process.env.ADMIN_USER;
    const origPass = process.env.ADMIN_PASSWORD;
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_USER = 'racecontrol_official';
    process.env.ADMIN_PASSWORD = 'SuperSecureRaceControlPass2026!';

    try {
      // 1. Wrong password rejected
      const failRes = await fetch(`${baseUrl}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'racecontrol_official', password: 'wrongpassword' })
      });
      assert.equal(failRes.status, 401);

      // 2. Correct credentials accepted
      const passRes = await fetch(`${baseUrl}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'racecontrol_official', password: 'SuperSecureRaceControlPass2026!' })
      });
      assert.equal(passRes.status, 200);
      const data = await passRes.json();
      assert.equal(data.success, true);
      assert.equal(data.user.email, 'racecontrol_official');
    } finally {
      if (origEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = origEnv;
      if (origUser === undefined) delete process.env.ADMIN_USER;
      else process.env.ADMIN_USER = origUser;
      if (origPass === undefined) delete process.env.ADMIN_PASSWORD;
      else process.env.ADMIN_PASSWORD = origPass;
    }
  });

  await t.test('POST /api/auth/admin/logout revokes cookie session on server', async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin', password: 'admin' })
    });
    assert.equal(loginRes.status, 200);
    const setCookie = loginRes.headers.get('set-cookie') || '';
    const cookieMatch = setCookie.match(/cyclopon_admin=([^;]+)/);
    assert.ok(cookieMatch, 'Should set cyclopon_admin cookie');
    const cookieHeader = `cyclopon_admin=${cookieMatch[1]}`;

    const beforeLogout = await fetch(`${baseUrl}/api/auth/admin/session`, {
      headers: { 'Cookie': cookieHeader }
    });
    assert.equal((await beforeLogout.json()).ok, true);

    const logoutRes = await fetch(`${baseUrl}/api/auth/admin/logout`, {
      method: 'POST',
      headers: { 'Cookie': cookieHeader }
    });
    assert.equal(logoutRes.status, 200);

    const afterLogout = await fetch(`${baseUrl}/api/auth/admin/session`, {
      headers: { 'Cookie': cookieHeader }
    });
    assert.equal((await afterLogout.json()).ok, false, 'Cookie should be revoked after logout');
  });

  await t.test('X-Forwarded-For spoofing does not bypass rider PIN brute-force protection', async () => {
    const { eventId1 } = t.context;
    let blocked = false;
    for (let i = 0; i < 10; i++) {
      const res = await fetch(`${baseUrl}/api/auth/rider`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': `10.0.0.${i + 1}, 203.0.113.5`
        },
        body: JSON.stringify({ event_id: eventId1, bib: '001', pin: `999${i}` })
      });
      if (res.status === 429) {
        blocked = true;
        break;
      }
    }
    assert.equal(blocked, true, 'Spoofed X-Forwarded-For headers must still hit 429 lockout');
  });

  await t.test('teardown', async () => {
    const { eventId1, eventId2 } = t.context;
    db.db.prepare('DELETE FROM events WHERE id IN (?, ?)').run(eventId1, eventId2);
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
