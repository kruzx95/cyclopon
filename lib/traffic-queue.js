const db = require('../db/database');

const BATCH_THRESHOLD = 50;
let queue = [];
let flushIntervalMs = 2000;
let flushTimer = null;

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

// Ensure buffered items are persisted on process termination
process.on('beforeExit', () => {
  flushQueue();
});

module.exports = {
  enqueuePageView,
  flushQueue,
  startQueue,
  stopQueue,
  getQueueSize
};
