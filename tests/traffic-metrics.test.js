const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const WebSocket = require('ws');
const db = require('../db/database');
const app = require('../server');
const { getActiveViewersCount, getPeakViewersCount } = require('../lib/traccar-ws-proxy');

test('Traffic & Visitor Analytics Engine', async (t) => {
  let server;
  let baseUrl;
  let wsUrl;

  await t.test('setup server and test data', async () => {
    // Start HTTP and WebSocket server on dynamic port
    await new Promise((resolve) => {
      server = http.createServer(app);
      // Re-bind traccar ws proxy for test
      const { setupTraccarWsProxy } = require('../lib/traccar-ws-proxy');
      setupTraccarWsProxy(server);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        wsUrl = `ws://127.0.0.1:${port}/traccar-ws`;
        resolve();
      });
    });
  });

  await t.test('database records page views and calculates today metrics', async () => {
    const testHash1 = 'testhash_11111111';
    const testHash2 = 'testhash_22222222';

    // Insert simulated page views
    db.recordPageView.run({ path: '/watch/99', event_id: 99, ip_hash: testHash1, user_agent: 'TestAgent' });
    db.recordPageView.run({ path: '/watch/99', event_id: 99, ip_hash: testHash1, user_agent: 'TestAgent' });
    db.recordPageView.run({ path: '/rider/cockpit', event_id: null, ip_hash: testHash2, user_agent: 'TestAgent' });

    const todayMetrics = db.getTodayPageViews.get();
    assert.ok(todayMetrics.total_views >= 3);
    assert.ok(todayMetrics.unique_visitors >= 2);

    const topPages = db.getTopPagesToday.all();
    assert.ok(Array.isArray(topPages));
    assert.ok(topPages.length > 0);
  });

  await t.test('HTTP navigation request triggers traffic tracker middleware', async () => {
    const res = await fetch(`${baseUrl}/watch/99`, {
      headers: { 'User-Agent': 'TestBrowserBot' }
    });
    assert.equal(res.status, 200);

    // Static assets should NOT be tracked in page_views
    const beforeCount = db.getTodayPageViews.get().total_views;
    await fetch(`${baseUrl}/css/admin.css`);
    const afterCount = db.getTodayPageViews.get().total_views;
    assert.equal(beforeCount, afterCount, 'Static CSS should not increment page view count');
  });

  await t.test('WebSocket active viewers count tracks live connections', async () => {
    const initialCount = getActiveViewersCount();

    // Connect a mock WebSocket client
    const wsClient = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      wsClient.on('open', resolve);
      wsClient.on('error', reject);
    });

    const activeCount = getActiveViewersCount();
    assert.equal(activeCount, initialCount + 1, 'Active viewers count should increment on connection');

    const peak = getPeakViewersCount();
    assert.ok(peak >= activeCount, 'Peak viewers count should be at least active count');

    // Disconnect client
    wsClient.close();
    await new Promise((resolve) => wsClient.on('close', resolve));

    // Wait a brief moment for cleanup
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(getActiveViewersCount(), initialCount, 'Active viewers count should decrement on close');
  });

  await t.test('GET /api/admin/metrics/traffic returns full analytics payload', async () => {
    const res = await fetch(`${baseUrl}/api/admin/metrics/traffic`);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(typeof data.liveViewers, 'number');
    assert.equal(typeof data.peakViewers, 'number');
    assert.equal(typeof data.todayViews, 'number');
    assert.equal(typeof data.todayUniqueVisitors, 'number');
    assert.ok(Array.isArray(data.viewsLast7Days));
    assert.ok(Array.isArray(data.topPages));
  });

  await t.test('teardown', async () => {
    // Clean up test page views
    db.db.prepare("DELETE FROM page_views WHERE ip_hash IN ('testhash_11111111', 'testhash_22222222')").run();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
