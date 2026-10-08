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

  await t.test('teardown', async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
