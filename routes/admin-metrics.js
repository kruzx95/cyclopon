const express = require('express');
const router = express.Router();
const os = require('os');
const fs = require('fs');
const path = require('path');
const db = require('../db/database');
const { getActiveViewersCount, getEventViewersCount, getPeakViewersCount, getUpstreamStatus } = require('../lib/traccar-ws-proxy');
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

    const now = Date.now();
    const oneMinAgo = new Date(now - 60 * 1000).toISOString();
    const fiveMinAgo = new Date(now - 5 * 60 * 1000).toISOString();
    let telemetryRatePerMin = 0;
    let activeRidersCount = 0;
    try {
      const tRow = db.db.prepare('SELECT COUNT(*) as c FROM position_history WHERE recorded_at >= ?').get(oneMinAgo);
      if (tRow) telemetryRatePerMin = Number(tRow.c) || 0;
      const rRow = db.db.prepare('SELECT COUNT(DISTINCT rider_id) as c FROM position_history WHERE recorded_at >= ?').get(fiveMinAgo);
      if (rRow) activeRidersCount = Number(rRow.c) || 0;
    } catch (e) {}

    const socketLimit = 65535;
    const surgeLevel = liveViewers > 500 ? 'HIGH_SURGE' : (liveViewers > 150 ? 'MODERATE' : 'NORMAL');

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
      system,
      surgeMitigation: {
        socketLimit,
        socketUsed: liveViewers,
        surgeLevel,
        telemetryRatePerMin,
        activeRidersCount,
        ports: {
          primaryWebPort: 443,
          fallbackGpsPort: 5055,
          traccarConnected: system.traccar?.connected || false
        }
      }
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

// GET /api/admin/metrics/event/:id — retrieve real-time telemetry & spectator metrics for specific event
router.get('/event/:id', (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const event = db.getEventById.get(eventId);
    if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' });

    const eventViewers = typeof getEventViewersCount === 'function' ? getEventViewersCount(eventId) : 0;
    const now = Date.now();
    const oneMinAgo = new Date(now - 60 * 1000).toISOString();
    const fiveMinAgo = new Date(now - 5 * 60 * 1000).toISOString();

    let telemetryRate = 0;
    let activeRiders = 0;
    try {
      const tRow = db.db.prepare('SELECT COUNT(*) as c FROM position_history WHERE event_id = ? AND recorded_at >= ?').get(eventId, oneMinAgo);
      if (tRow) telemetryRate = Number(tRow.c) || 0;
      const rRow = db.db.prepare('SELECT COUNT(DISTINCT rider_id) as c FROM position_history WHERE event_id = ? AND recorded_at >= ?').get(eventId, fiveMinAgo);
      if (rRow) activeRiders = Number(rRow.c) || 0;
    } catch (e) {}

    const totalRiders = (db.getRidersByEvent.all(eventId) || []).length;
    const system = getSystemHealthMetrics();

    res.json({
      success: true,
      eventId,
      eventViewers,
      telemetryRatePerMin: telemetryRate,
      activeRiders,
      totalRiders,
      surgeStatus: eventViewers > 300 ? 'HIGH_SURGE' : (eventViewers > 100 ? 'MODERATE' : 'NORMAL'),
      system: {
        memUsagePct: system.vps.memUsagePct,
        usedMemMB: system.vps.usedMemMB,
        totalMemMB: system.vps.totalMemMB,
        cpuLoadPct: system.vps.cpuLoadPct,
        traccarConnected: system.traccar?.connected || false
      }
    });
  } catch (err) {
    console.error('[Admin Metrics] Error generating event metrics:', err);
    res.status(500).json({ error: 'Gagal mengambil metrik event' });
  }
});

// GET /api/admin/metrics/event-logs — list all events for log & recap selection
router.get('/event-logs', (req, res) => {
  try {
    const events = db.getAllEvents.all() || [];
    const list = events.map(ev => {
      let pings = 0;
      let alertsCount = 0;
      try {
        const pRow = db.db.prepare('SELECT COUNT(*) as c FROM position_history WHERE event_id = ?').get(ev.id);
        if (pRow) pings = Number(pRow.c) || 0;
        const aRow = db.db.prepare('SELECT COUNT(*) as c FROM alerts WHERE event_id = ?').get(ev.id);
        if (aRow) alertsCount = Number(aRow.c) || 0;
      } catch (e) {}
      const ridersCount = (db.getRidersByEvent.all(ev.id) || []).length;
      return {
        id: ev.id,
        name: ev.name,
        date: ev.date,
        active: ev.active,
        ridersCount,
        pings,
        alertsCount
      };
    });
    res.json({ success: true, events: list });
  } catch (err) {
    console.error('[Admin Metrics] Error listing event logs:', err);
    res.status(500).json({ error: 'Gagal mengambil daftar log event' });
  }
});

// GET /api/admin/metrics/event-logs/:id — comprehensive recap, telemetry audit & prevention recommendations
router.get('/event-logs/:id', (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const event = db.getEventById.get(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event tidak ditemukan' });
    }

    const riders = db.getRidersByEvent.all(eventId) || [];
    const checkpoints = db.getCheckpointsByEvent.all(eventId) || [];
    let splitsCount = 0;
    try {
      const sRow = db.db.prepare('SELECT COUNT(*) as c FROM rider_splits WHERE event_id = ?').get(eventId);
      if (sRow) splitsCount = Number(sRow.c) || 0;
    } catch (e) {}

    // Overall telemetry stats
    const pSummary = db.db.prepare('SELECT COUNT(*) as total_pings, MIN(recorded_at) as first_ping, MAX(recorded_at) as last_ping, MAX(speed) as top_speed, AVG(speed) as avg_speed FROM position_history WHERE event_id = ?').get(eventId) || {};
    const totalPings = Number(pSummary.total_pings) || 0;
    const firstPing = pSummary.first_ping || null;
    const lastPing = pSummary.last_ping || null;
    let durationMinutes = 0;
    if (firstPing && lastPing) {
      durationMinutes = Math.max(1, Math.round((new Date(lastPing).getTime() - new Date(firstPing).getTime()) / 60000));
    }

    // Per rider telemetry & gap analysis (detect blank spots / battery dies)
    let totalBlankSpotIncidents = 0;
    let zeroPingRiders = 0;
    const riderLogs = riders.map(r => {
      const stats = db.db.prepare('SELECT COUNT(*) as pings, MIN(recorded_at) as first_seen, MAX(recorded_at) as last_seen, MAX(speed) as max_speed, AVG(speed) as avg_speed, MAX(distance_km) as max_dist FROM position_history WHERE event_id = ? AND rider_id = ?').get(eventId, r.id) || {};
      const pingsCount = Number(stats.pings) || 0;

      let longestGapMinutes = 0;
      if (pingsCount > 1) {
        const pingTimes = db.db.prepare('SELECT recorded_at FROM position_history WHERE event_id = ? AND rider_id = ? ORDER BY recorded_at ASC').all(eventId, r.id);
        let maxGapMs = 0;
        for (let i = 1; i < pingTimes.length; i++) {
          const diff = new Date(pingTimes[i].recorded_at).getTime() - new Date(pingTimes[i - 1].recorded_at).getTime();
          if (diff > maxGapMs) maxGapMs = diff;
        }
        longestGapMinutes = Math.round(maxGapMs / 60000);
      }

      if (pingsCount === 0) zeroPingRiders++;
      if (longestGapMinutes >= 10) totalBlankSpotIncidents++;

      const avgIntervalSeconds = (pingsCount > 1 && stats.first_seen && stats.last_seen)
        ? Math.round(((new Date(stats.last_seen).getTime() - new Date(stats.first_seen).getTime()) / 1000) / (pingsCount - 1))
        : 0;

      return {
        id: r.id,
        bib: r.bib,
        name: r.name,
        role: r.role || 'rider',
        color: r.color || '#00E5FF',
        pings: pingsCount,
        firstSeen: stats.first_seen || null,
        lastSeen: stats.last_seen || null,
        longestGapMinutes,
        avgIntervalSeconds,
        maxSpeed: Math.round((Number(stats.max_speed) || 0) * 10) / 10,
        avgSpeed: Math.round((Number(stats.avg_speed) || 0) * 10) / 10,
        maxDistanceKm: Math.round((Number(stats.max_dist) || 0) * 10) / 10,
        hasBlankSpot: longestGapMinutes >= 10
      };
    });

    // Alerts / Incident audit
    const alerts = db.db.prepare('SELECT a.*, r.bib, r.name as rider_name FROM alerts a LEFT JOIN riders r ON a.rider_id = r.id WHERE a.event_id = ? ORDER BY a.created_at DESC').all(eventId) || [];
    const resolvedAlerts = alerts.filter(a => a.resolved === 1).length;
    const unresolvedAlerts = alerts.length - resolvedAlerts;

    // Spectator traffic for this event
    let eventPageViews = 0;
    let eventVisitors = 0;
    try {
      const pvRow = db.db.prepare('SELECT COUNT(*) as views, COUNT(DISTINCT ip_hash) as visitors FROM page_views WHERE event_id = ? OR path LIKE ?').get(eventId, `%/watch/${eventId}%`);
      if (pvRow) {
        eventPageViews = Number(pvRow.views) || 0;
        eventVisitors = Number(pvRow.visitors) || 0;
      }
    } catch (e) {}

    // System resources snapshot
    const system = getSystemHealthMetrics();

    // Automated Findings & Prevention Recommendations (Pencegahan Masalah)
    const recommendations = [];
    let healthScore = 100;

    // 1. Sinyal & Blank Spot
    if (totalBlankSpotIncidents > 0) {
      healthScore -= Math.min(25, totalBlankSpotIncidents * 10);
      recommendations.push({
        type: 'WARNING',
        category: 'Konektivitas & Blank Spot',
        title: `Terdeteksi ${totalBlankSpotIncidents} kejadian sinyal rider hilang > 10 menit`,
        detail: 'Terdapat jeda transmisi sinyal cukup lama pada peserta di rute. Ini biasanya akibat blank spot operator seluler lokal atau ponsel masuk mode hemat baterai (battery optimization).',
        action: 'Tempatkan petugas marshal / pos checkpoint manual di segmen KM terkait, dan instruksikan rider agar mematikan Battery Optimization untuk OsmAnd/GPS app.'
      });
    } else if (totalPings > 0) {
      recommendations.push({
        type: 'SUCCESS',
        category: 'Konektivitas & Blank Spot',
        title: 'Transmisi sinyal GPS rider stabil sepanjang rute',
        detail: 'Tidak ada jeda sinyal terputus lebih dari 10 menit pada seluruh peserta yang aktif.',
        action: 'Jalur komunikasi telemetri siap dipertahankan untuk event berikutnya.'
      });
    }

    // 2. Rider Tanpa Sinyal (Zero Pings)
    if (zeroPingRiders > 0 && riders.length > 0) {
      healthScore -= Math.min(20, zeroPingRiders * 8);
      recommendations.push({
        type: 'WARNING',
        category: 'Setup Perangkat Rider',
        title: `${zeroPingRiders} dari ${riders.length} rider belum memancarkan data GPS`,
        detail: 'Ada peserta terdaftar yang aplikasinya belum pernah terhubung atau belum menekan tombol start tracking.',
        action: 'Wajibkan verifikasi ping GPS di meja registrasi ulang (Rider Hub) sebelum flag-off diberangkatkan.'
      });
    }

    // 3. Frekuensi Pengiriman GPS & Ketahanan Baterai
    const fastPingingRiders = riderLogs.filter(r => r.pings > 10 && r.avgIntervalSeconds > 0 && r.avgIntervalSeconds < 4);
    if (fastPingingRiders.length > 0) {
      healthScore -= 5;
      recommendations.push({
        type: 'INFO',
        category: 'Konsumsi Baterai Peserta',
        title: `Frekuensi update GPS terlalu rapat (< 4 detik) pada ${fastPingingRiders.length} rider`,
        detail: 'Pengiriman data setiap 1-3 detik mempercepat habisnya baterai HP rider sebelum rute selesai.',
        action: 'Rekomendasikan interval kirim 5–10 detik pada setting OsmAnd / Traccar Client agar baterai bertahan hingga 8–12 jam.'
      });
    }

    // 4. Insiden Darurat (SOS)
    if (unresolvedAlerts > 0) {
      healthScore -= 15;
      recommendations.push({
        type: 'DANGER',
        category: 'Protokol Darurat & Medis',
        title: `Ada ${unresolvedAlerts} laporan SOS yang belum ditandai selesai (Resolved)`,
        detail: 'Laporan darurat harus segera ditutup setelah rider dievakuasi atau dipastikan aman oleh panitia.',
        action: 'Pastikan panitia / koordinator medis selalu menekan tombol Selesaikan di Pusat SOS setelah pertolongan selesai.'
      });
    } else if (alerts.length > 0) {
      recommendations.push({
        type: 'SUCCESS',
        category: 'Protokol Darurat & Medis',
        title: `Semua insiden SOS (${alerts.length} laporan) berhasil diselesaikan`,
        detail: 'Alur penanganan darurat dan respons tim medis lapangan berjalan efektif.',
        action: 'Pertahankan kesiapan koordinasi tim ambulans/sweeper untuk event besar.'
      });
    }

    // 5. Beban Server & Trafik Penonton
    if (system.vps && system.vps.memUsagePct < 70 && system.vps.cpuLoadPct < 50) {
      recommendations.push({
        type: 'SUCCESS',
        category: 'Kapasitas Server & Infrastruktur',
        title: 'Performa server VPS sangat prima dan stabil',
        detail: `Penggunaan RAM ${system.vps.memUsagePct}% dan CPU ${system.vps.cpuLoadPct}%. Tidak terdeteksi bottleneck memori atau socket issue.`,
        action: 'Infrastruktur VPS aman dan siap menampung lonjakan penonton hingga ribuan pengunjung pada event utama.'
      });
    }

    healthScore = Math.max(20, Math.min(100, healthScore));

    res.json({
      success: true,
      event: {
        id: event.id,
        name: event.name,
        date: event.date,
        active: event.active,
        gpx_path: event.gpx_path,
        cot_mode: event.cot_mode
      },
      kpi: {
        healthScore,
        totalRiders: riders.length,
        activeRidersWithPings: riders.length - zeroPingRiders,
        totalPings,
        durationMinutes,
        firstPing,
        lastPing,
        totalCheckpoints: checkpoints.length,
        totalSplits: splitsCount,
        totalAlerts: alerts.length,
        unresolvedAlerts,
        totalBlankSpotIncidents,
        eventPageViews,
        eventVisitors
      },
      riderLogs,
      alerts,
      recommendations,
      system
    });
  } catch (err) {
    console.error('[Admin Metrics] Error generating event logs recap:', err);
    res.status(500).json({ error: 'Gagal mengambil rekap log event' });
  }
});

module.exports = router;
