const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../server');

test('Admin Reports API Suite', async (t) => {
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

  await t.test('GET /api/admin/reports/latest returns latest diagnostic report data', async () => {
    const res = await fetch(`${baseUrl}/api/admin/reports/latest`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(typeof data.hasReport, 'boolean');
    if (data.hasReport) {
      assert.ok(data.parsed, 'Should contain parsed report');
      assert.ok(data.parsed.verdict, 'Should contain verdict string');
      assert.ok(data.parsed.metricsSummary, 'Should contain metrics summary');
      assert.ok(data.markdown.includes('# 📊 Laporan Diagnostik Kesiapan Produksi VPS'));
    }
  });

  await t.test('GET /api/admin/reports returns list of generated report files', async () => {
    const res = await fetch(`${baseUrl}/api/admin/reports`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.reports), 'reports should be an array');
  });

  await t.test('POST /api/admin/reports/run rejects unauthenticated request in strict mode', async () => {
    const res = await fetch(`${baseUrl}/api/admin/reports/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-enforce-auth': '1' }
    });
    assert.equal(res.status, 401);
  });

  await t.test('POST /api/admin/reports/run executes diagnostic trial and returns updated report', async () => {
    const res = await fetch(`${baseUrl}/api/admin/reports/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.parsed, 'Should return freshly parsed report');
    assert.ok(data.output.includes('HASIL DIAGNOSTIK KESIAPAN VPS'), 'Should contain terminal summary output');
  });

  await t.test('teardown', async () => {
    await new Promise((resolve) => server.close(resolve));
  });
});
