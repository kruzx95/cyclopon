const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../server');

test('Production Security Hardening & Headers', async (t) => {
  let server;
  let baseUrl;

  await t.test('setup server on dynamic port', async () => {
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  await t.test('disables X-Powered-By header', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-powered-by'), null, 'X-Powered-By should not be exposed');
  });

  await t.test('injects standard security headers', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);

    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.ok(res.headers.get('permissions-policy')?.includes('geolocation=(self)'));
  });

  await t.test('rate limits excessive registration attempts', async () => {
    // Attempt rapid requests to registration endpoint with dummy payload
    let hitRateLimit = false;
    for (let i = 0; i < 35; i++) {
      const res = await fetch(`${baseUrl}/api/auth/rider/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: 21, bib: `TEST-${i}`, name: 'Spam Bot' })
      });
      if (res.status === 429) {
        hitRateLimit = true;
        const data = await res.json();
        assert.ok(data.error?.includes('Terlalu banyak permintaan') || data.error?.includes('Rate limit'));
        break;
      }
    }
    assert.ok(hitRateLimit, 'Should trigger rate limit (429) after excessive rapid attempts');
  });

  await t.test('blocks brute-force attempts on rider login (PIN guessing)', async () => {
    let hitBruteForceBlock = false;
    // Attempt rapid failed logins with wrong PIN
    for (let i = 0; i < 12; i++) {
      const res = await fetch(`${baseUrl}/api/auth/rider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bib: '001', pin: `wrong_${i}`, event_id: 21 })
      });
      if (res.status === 429) {
        hitBruteForceBlock = true;
        const data = await res.json();
        assert.ok(data.error?.includes('percobaan login') || data.error?.includes('dibekukan'));
        break;
      }
    }
    assert.ok(hitBruteForceBlock, 'Should block rider login (429) after excessive failed attempts');
  });

  await t.test('rate limits rapid SOS emergency alerts flooding', async () => {
    let hitSosRateLimit = false;
    for (let i = 0; i < 8; i++) {
      const res = await fetch(`${baseUrl}/api/events/21/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rider_id: 1, type: 'SOS', message: 'Test Flood' })
      });
      if (res.status === 429) {
        hitSosRateLimit = true;
        const data = await res.json();
        assert.ok(data.error?.includes('panggilan darurat') || data.error?.includes('Rate limit'));
        break;
      }
    }
    assert.ok(hitSosRateLimit, 'Should rate limit rapid SOS requests (429)');
  });

  await t.test('enforces admin authentication guard on admin routes', async () => {
    // 1. Unauthenticated request with enforced security check returns 401
    const unauthRes = await fetch(`${baseUrl}/api/admin/riders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-enforce-auth': '1'
      },
      body: JSON.stringify({ event_id: 21, bib: 'HACK-01', name: 'Unauthorized Rider' })
    });
    assert.equal(unauthRes.status, 401, 'Should block unauthorized access to admin endpoints');
    const unauthData = await unauthRes.json();
    assert.ok(unauthData.error?.includes('Autentikasi admin diperlukan') || unauthData.error?.includes('Akses ditolak'));

    // 2. Authenticated request using x-admin-key passes
    const adminKey = process.env.SESSION_SECRET || 'cyclopon_secret_dev_2026_x8f9a2';
    const authRes = await fetch(`${baseUrl}/api/admin/riders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-enforce-auth': '1',
        'x-admin-key': adminKey
      },
      body: JSON.stringify({ event_id: 21, bib: `AUTH-${Date.now()}`, name: 'Authorized Admin Rider' })
    });
    assert.equal(authRes.status, 201, 'Should allow authorized access with valid admin key');
  });

  await t.test('teardown', async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
