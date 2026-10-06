const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../db/database');
const {
  enqueuePageView,
  flushQueue,
  getQueueSize,
  stopQueue,
  startQueue
} = require('../lib/traffic-queue');

test('In-Memory Traffic Analytics Batch Queue', async (t) => {
  const TEST_IP_HASH = 'test_batch_hash_99';

  await t.test('enqueues items in-memory without synchronous DB writes', async () => {
    startQueue(10000); // Set high flush interval to test buffering

    const beforeDbCount = db.db.prepare("SELECT COUNT(*) as count FROM page_views WHERE ip_hash = ?").get(TEST_IP_HASH).count;

    enqueuePageView({
      path: '/watch/1',
      event_id: 1,
      ip_hash: TEST_IP_HASH,
      user_agent: 'BatchTestAgent'
    });
    enqueuePageView({
      path: '/watch/2',
      event_id: 2,
      ip_hash: TEST_IP_HASH,
      user_agent: 'BatchTestAgent'
    });

    assert.equal(getQueueSize(), 2, 'Queue should hold 2 items in memory');

    const midDbCount = db.db.prepare("SELECT COUNT(*) as count FROM page_views WHERE ip_hash = ?").get(TEST_IP_HASH).count;
    assert.equal(midDbCount, beforeDbCount, 'DB should not have written items synchronously yet');
  });

  await t.test('flushQueue writes all buffered items in a single transaction', async () => {
    const flushedCount = flushQueue();
    assert.equal(flushedCount, 2);
    assert.equal(getQueueSize(), 0, 'Queue should be empty after flush');

    const afterDbCount = db.db.prepare("SELECT COUNT(*) as count FROM page_views WHERE ip_hash = ?").get(TEST_IP_HASH).count;
    assert.equal(afterDbCount, 2, 'DB should now contain the 2 flushed records');
  });

  await t.test('auto-flushes when batch size threshold is reached', async () => {
    // Enqueue 55 items when batch threshold is 50
    for (let i = 0; i < 55; i++) {
      enqueuePageView({
        path: `/page/${i}`,
        event_id: 1,
        ip_hash: TEST_IP_HASH,
        user_agent: 'BatchTestAgent'
      });
    }

    // 50 should have auto-flushed, 5 should remain
    assert.equal(getQueueSize(), 5);

    // Final flush
    flushQueue();
    assert.equal(getQueueSize(), 0);
  });

  await t.test('teardown', async () => {
    stopQueue();
    db.db.prepare("DELETE FROM page_views WHERE ip_hash = ?").run(TEST_IP_HASH);
  });
});
