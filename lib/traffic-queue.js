const db = require('../db/database');

const BATCH_THRESHOLD = 50;
let queue = [];
let flushIntervalMs = 2000;
let flushTimer = null;
let pruneIntervalMs = 24 * 60 * 60 * 1000; // 24 hours
let pruneTimer = null;

/**
 * Automatically prune page_views records older than retentionDays (default 60 days).
 * Keeps database lean without sacrificing recent analytics.
 * @param {number} [retentionDays=60]
 * @returns {number} number of deleted rows
 */
function pruneOldPageViews(retentionDays = 60) {
  try {
    const days = Math.max(1, Number(retentionDays) || 60);
    const result = db.db.prepare(
      "DELETE FROM page_views WHERE viewed_at < datetime('now', '-' || ? || ' days')"
    ).run(days);
    if (result && result.changes > 0) {
      console.log(`[TrafficQueue] Auto-pruned ${result.changes} old page_views records (> ${days} days)`);
    }
    return result ? result.changes : 0;
  } catch (err) {
    console.warn('[TrafficQueue] Error pruning old page views:', err.message);
    return 0;
  }
}

/**
 * Start periodic background pruning schedule (default once every 24 hours).
 * @param {number} [intervalMs=86400000]
 */
function startPruneSchedule(intervalMs = 24 * 60 * 60 * 1000) {
  if (pruneTimer) clearInterval(pruneTimer);
  pruneIntervalMs = intervalMs;
  pruneTimer = setInterval(() => pruneOldPageViews(60), pruneIntervalMs);
  if (pruneTimer && typeof pruneTimer.unref === 'function') {
    pruneTimer.unref();
  }
}

/**
 * Stop periodic background pruning schedule.
 */
function stopPruneSchedule() {
  if (pruneTimer) {
    clearInterval(pruneTimer);
    pruneTimer = null;
  }
}

/**
 * Flush all queued page views to SQLite in a single transaction.
 * @returns {number} number of flushed records
 */
function flushQueue() {
  if (queue.length === 0) return 0;

  const items = queue.splice(0, queue.length);
  try {
    const insertBatch = db.db.transaction((records) => {
      for (const rec of records) {
        db.recordPageView.run(rec);
      }
    });
    insertBatch(items);
    return items.length;
  } catch (err) {
    console.error('[TrafficQueue] Error flushing page views batch:', err.message);
    return 0;
  }
}

/**
 * Enqueue a page view event in-memory.
 * Automatically flushes if queue exceeds BATCH_THRESHOLD.
 * @param {{ path: string, event_id: number|null, ip_hash: string, user_agent: string }} item
 */
function enqueuePageView(item) {
  queue.push(item);
  if (queue.length >= BATCH_THRESHOLD) {
    flushQueue();
  }
}

/**
 * Start the periodic flush timer.
 * @param {number} [intervalMs=2000]
 */
function startQueue(intervalMs = 2000) {
  if (flushTimer) {
    clearInterval(flushTimer);
  }
  flushIntervalMs = intervalMs;
  flushTimer = setInterval(flushQueue, flushIntervalMs);
  if (flushTimer && typeof flushTimer.unref === 'function') {
    flushTimer.unref();
  }
}

/**
 * Stop the queue timer and flush any remaining items.
 */
function stopQueue() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  stopPruneSchedule();
  flushQueue();
}

/**
 * Get current pending queue size.
 * @returns {number}
 */
function getQueueSize() {
  return queue.length;
}

// Auto-start queue with 2 second interval
startQueue(2000);

// Auto-start daily retention pruning (24h) and run deferred initial prune after 10s
startPruneSchedule(24 * 60 * 60 * 1000);
if (process.env.NODE_ENV !== 'test') {
  setTimeout(() => pruneOldPageViews(60), 10000).unref?.();
}

// Ensure buffered items are persisted on process termination
process.on('beforeExit', () => {
  flushQueue();
});

module.exports = {
  enqueuePageView,
  flushQueue,
  startQueue,
  stopQueue,
  getQueueSize,
  pruneOldPageViews,
  startPruneSchedule,
  stopPruneSchedule
};
