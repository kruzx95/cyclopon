const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { getActiveViewersCount, getPeakViewersCount } = require('../lib/traccar-ws-proxy');
const { flushQueue } = require('../lib/traffic-queue');

// GET /api/admin/metrics/traffic — retrieve live spectators and visitor traffic analytics
router.get('/traffic', (req, res) => {
  try {
    flushQueue();
    const liveViewers = getActiveViewersCount();
    const peakViewers = getPeakViewersCount();
    const today = db.getTodayPageViews.get() || { total_views: 0, unique_visitors: 0 };
    const allTime = db.getAllTimePageViews.get() || { total_views: 0, unique_visitors: 0 };
    const viewsLast7Days = db.getViewsLast7Days.all() || [];
    const topPages = db.getTopPagesToday.all() || [];
    const eventViews = db.getEventViewsToday.all() || [];

    res.json({
      success: true,
      liveViewers,
      peakViewers,
      todayViews: today.total_views || 0,
      todayUniqueVisitors: today.unique_visitors || 0,
      totalAllTimeViews: allTime.total_views || 0,
      totalAllTimeVisitors: allTime.unique_visitors || 0,
      viewsLast7Days,
      topPages,
      eventViews
    });
  } catch (err) {
    console.error('[Admin Metrics] Error generating traffic metrics:', err);
    res.status(500).json({ error: 'Gagal mengambil metrik trafik pengunjung' });
  }
});

module.exports = router;
