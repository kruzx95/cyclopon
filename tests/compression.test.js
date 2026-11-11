const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../server');

test('HTTP Response Compression (Gzip / Deflate)', async (t) => {
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

  await t.test('compresses large static CSS file with gzip', async () => {
    // /css/map.css is ~115KB, well above 1024 bytes threshold
    const res = await fetch(`${baseUrl}/css/map.css`, {
      headers: { 'Accept-Encoding': 'gzip' }
    });
    assert.equal(res.status, 200);
    const encoding = res.headers.get('content-encoding');
    assert.equal(encoding, 'gzip', 'Large CSS file should have content-encoding: gzip');
  });

  await t.test('does not compress small responses or when client does not accept gzip', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: { 'Accept-Encoding': 'identity' }
    });
    assert.equal(res.status, 200);
    const encoding = res.headers.get('content-encoding');
    assert.equal(encoding, null, 'Small response or identity encoding should not have content-encoding: gzip');
  });

  await t.test('teardown', async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
