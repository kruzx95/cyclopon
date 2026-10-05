const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const db = require('../db/database');
const app = require('../server');
const notifications = require('../lib/notifications');

test('Notifications Engine & API', async (t) => {
  let server;
  let baseUrl;
  let testEventId;
  let testRiderId;
  let testCheckpointId;

  await t.test('setup server and test event data', async () => {
    // Create test event
    const evRes = db.createEvent.run({
      name: 'Audax Notification Test 200K',
      date: '2026-11-01'
    });
    testEventId = Number(evRes.lastInsertRowid);

    // Create test rider
    const rRes = db.createRider.run({
      event_id: testEventId,
      bib: '888',
      name: 'Budi Finisher',
      pin: '1234',
      traccar_device_id: 8888,
      color: '#00E5FF'
    });
    testRiderId = Number(rRes.lastInsertRowid);

    // Create test checkpoint
    const cpRes = db.createCheckpoint.run({
      event_id: testEventId,
      name: 'CP 1 Kopi Daong',
      km_distance: 55.4,
      open_time: '07:30',
      close_time: '10:00',
      latitude: -6.654,
      longitude: 106.876,
      order_index: 1
    });
    testCheckpointId = Number(cpRes.lastInsertRowid);

    // Start server
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  await t.test('database settings get and set', () => {
    notifications.saveConfig({
      telegramToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
      telegramChatId: '-100987654321',
      webhookUrl: 'https://discord.com/api/webhooks/test/mock',
      notifySos: true,
      notifyCot: true
    });

    const cfg = notifications.getConfig();
    assert.equal(cfg.telegramToken, '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
    assert.equal(cfg.telegramChatId, '-100987654321');
    assert.equal(cfg.webhookUrl, 'https://discord.com/api/webhooks/test/mock');
    assert.equal(cfg.notifySos, true);
    assert.equal(cfg.notifyCot, true);
  });

  await t.test('escapeHtml helper', () => {
    assert.equal(notifications.escapeHtml('<script>alert("xss&co")</script>'), '&lt;script&gt;alert("xss&amp;co")&lt;/script&gt;');
  });

  await t.test('GET /api/admin/notifications/settings masks token', async () => {
    const res = await fetch(`${baseUrl}/api/admin/notifications/settings`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.hasTelegramToken, true);
    assert.match(data.telegramTokenMasked, /••••/);
    assert.equal(data.telegramChatId, '-100987654321');
    assert.equal(data.webhookUrl, 'https://discord.com/api/webhooks/test/mock');
    assert.equal(data.notifySos, true);
    assert.equal(data.notifyCot, true);
  });

  await t.test('POST /api/admin/notifications/settings updates config', async () => {
    const res = await fetch(`${baseUrl}/api/admin/notifications/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegramChatId: '-1001122334455',
        webhookUrl: 'https://webhook.site/test-endpoint',
        notifySos: true,
        notifyCot: false
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.settings.telegramChatId, '-1001122334455');
    assert.equal(data.settings.webhookUrl, 'https://webhook.site/test-endpoint');
    assert.equal(data.settings.notifyCot, false);
  });

  await t.test('POST /api/admin/notifications/test handles mock test', async () => {
    const res = await fetch(`${baseUrl}/api/admin/notifications/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegramToken: 'invalid_token_format',
        telegramChatId: '123'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.results);
    assert.ok(data.results.telegram);
    // Invalid telegram token should return failure without throwing crash
    assert.equal(data.results.telegram.success, false);
  });

  await t.test('POST /api/events/:id/alerts triggers notification flow without error', async () => {
    const res = await fetch(`${baseUrl}/api/events/${testEventId}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rider_id: testRiderId,
        type: 'CRASH',
        latitude: -6.9147,
        longitude: 107.6098,
        message: 'Kecelakaan di tikungan tajam KM 55'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.alert.type, 'CRASH');
    // Wait briefly for asynchronous notification dispatch to complete safely
    await new Promise(r => setTimeout(r, 100));
  });

  await t.test('POST /api/events/:id/splits with OVER_COT triggers notification flow', async () => {
    const res = await fetch(`${baseUrl}/api/events/${testEventId}/splits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rider_id: testRiderId,
        checkpoint_id: testCheckpointId,
        arrival_time: '2026-11-01T10:45:00Z',
        status: 'OVER_COT'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.split.status, 'OVER_COT');
    // Wait briefly for asynchronous notification dispatch to complete safely
    await new Promise(r => setTimeout(r, 100));
  });

  await t.test('teardown', async () => {
    db.db.prepare('DELETE FROM events WHERE id = ?').run(testEventId);
    db.db.prepare('DELETE FROM settings WHERE key LIKE ?').run('telegram%');
    db.db.prepare('DELETE FROM settings WHERE key LIKE ?').run('webhook%');
    db.db.prepare('DELETE FROM settings WHERE key LIKE ?').run('notify%');
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });
});
