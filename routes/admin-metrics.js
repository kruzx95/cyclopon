const express = require('express');
const router = express.Router();
const os = require('os');
const fs = require('fs');
const path = require('path');
const db = require('../db/database');
const { getActiveViewersCount, getPeakViewersCount, getUpstreamStatus } = require('../lib/traccar-ws-proxy');
const { flushQueue } = require('../lib/traffic-queue');
const { requireAdminAuth } = require('../lib/admin-auth');

// Protect admin traffic metrics with admin auth
router.use(requireAdminAuth);

/**
 * Gather lightweight OS, process memory, database and Traccar health telemetry
 */
function getSystemHealthMetrics() {
  let totalMem = os.totalmem();
  let freeMem = os.freemem();
  let usedMem = totalMem - freeMem;

  // Linux cgroups container check if running under Docker with memory caps
  try {
    if (fs.existsSync('/sys/fs/cgroup/memory.current') && fs.existsSync('/sys/fs/cgroup/memory.max')) {
      const cCurrent = parseInt(fs.readFileSync('/sys/fs/cgroup/memory.current', 'utf8').trim(), 10);
      const cMaxStr = fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim();
      if (!isNaN(cCurrent) && cMaxStr !== 'max') {
        const cMax = parseInt(cMaxStr, 10);
        if (!isNaN(cMax) && cMax > 0 && cMax < totalMem) {
          totalMem = cMax;
          usedMem = cCurrent;
          freeMem = Math.max(0, totalMem - usedMem);
        }
      }
    }
  } catch (e) {}

  const memUsagePct = totalMem > 0 ? Math.min(100, Math.round((usedMem / totalMem) * 100)) : 0;
  const procMem = process.memoryUsage();

  const cpus = os.cpus() || [];
  const cpuCount = cpus.length || 1;
  const loadAvg = os.loadavg() || [0, 0, 0];
  const cpuLoadPct = Math.min(100, Math.round((loadAvg[0] / cpuCount) * 100));

  const dbDir = path.join(__dirname, '..', 'data');
  const dbPath = path.join(dbDir, 'cyclopon.db');
  const walPath = path.join(dbDir, 'cyclopon.db-wal');
  let dbSizeBytes = 0;
  let walSizeBytes = 0;
  try {
    if (fs.existsSync(dbPath)) dbSizeBytes = fs.statSync(dbPath).size;
    if (fs.existsSync(walPath)) walSizeBytes = fs.statSync(walPath).size;
  } catch (e) {}

  // 4. Disk storage stats (50 GB VPS Storage)
  let disk = { totalGB: 50, freeGB: 45, usedGB: 5, usedPct: 10 };
  try {
    if (typeof fs.statfsSync === 'function') {
      const s = fs.statfsSync(dbDir);
      const totalBytes = s.bsize * s.blocks;
      const freeBytes = s.bsize * s.bfree;
      const usedBytes = totalBytes - freeBytes;
      const totalGB = Number((totalBytes / (1024 ** 3)).toFixed(1));
      const freeGB = Number((freeBytes / (1024 ** 3)).toFixed(1));
      const usedGB = Number((usedBytes / (1024 ** 3)).toFixed(1));
      const usedPct = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;
      disk = { totalGB, freeGB, usedGB, usedPct };
    }
  } catch (e) {}

  const traccar = typeof getUpstreamStatus === 'function' ? getUpstreamStatus() : { connected: false, status: 'standby' };
  const uptimeSec = Math.round(process.uptime());
  const sysUptimeSec = Math.round(os.uptime());

  return {
    vps: {
      cpuCount,
      cpuModel: cpus[0]?.model || 'VPS Virtual CPU',
      cpuLoadAvg: [
        Number(loadAvg[0].toFixed(2)),
        Number(loadAvg[1].toFixed(2)),
        Number(loadAvg[2].toFixed(2))
      ],
      cpuLoadPct,
      totalMemMB: Math.round(totalMem / (1024 * 1024)),
      usedMemMB: Math.round(usedMem / (1024 * 1024)),
      freeMemMB: Math.round(freeMem / (1024 * 1024)),
      memUsagePct,
      sysUptimeSec
    },
    process: {
      nodeVersion: process.version,
      uptimeSec,
      heapUsedMB: Number((procMem.heapUsed / (1024 * 1024)).toFixed(1)),
      heapTotalMB: Number((procMem.heapTotal / (1024 * 1024)).toFixed(1)),
      rssMB: Number((procMem.rss / (1024 * 1024)).toFixed(1))
    },
    database: {
      dbSizeKB: Math.round(dbSizeBytes / 1024),
      walSizeKB: Math.round(walSizeBytes / 1024),
      totalSizeKB: Math.round((dbSizeBytes + walSizeBytes) / 1024),
      journalMode: 'WAL'
    },
    disk,
    traccar
  };
}

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
    const system = getSystemHealthMetrics();

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
      eventViews,
      system
    });
  } catch (err) {
    console.error('[Admin Metrics] Error generating traffic metrics:', err);
    res.status(500).json({ error: 'Gagal mengambil metrik trafik pengunjung' });
  }
});

// GET /api/admin/metrics/system — retrieve detailed server & load monitor
router.get('/system', (req, res) => {
  try {
    const system = getSystemHealthMetrics();
    res.json({ success: true, ...system });
  } catch (err) {
    console.error('[Admin Metrics] Error generating system health:', err);
    res.status(500).json({ error: 'Gagal mengambil metrik kesehatan server' });
  }
});

module.exports = router;
