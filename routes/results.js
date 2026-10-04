const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

/**
 * Helper to compute seconds difference between ISO timestamp or HH:MM:SS strings
 */
function parseTimeSeconds(timeStr) {
  if (!timeStr) return null;
  if (timeStr.includes('T') || timeStr.includes('-')) {
    const d = new Date(timeStr);
    return isNaN(d.getTime()) ? null : Math.floor(d.getTime() / 1000);
  }
  const parts = timeStr.split(':').map(Number);
  if (parts.length >= 2) {
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const s = parts[2] || 0;
    return h * 3600 + m * 60 + s;
  }
  return null;
}

function formatDuration(sec) {
  if (sec == null || isNaN(sec) || sec < 0) return '--:--:--';
  const h = String(Math.floor(sec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(Math.floor(sec % 60)).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Aggregates official event results for all registered riders
 */
function calculateEventResults(eventId) {
  const event = db.getEventById.get(eventId);
  if (!event) return null;

  const riders = db.getRidersByEvent.all(eventId);
  const checkpoints = db.getCheckpointsByEvent.all(eventId);
  const splits = db.getSplitsByEvent.all(eventId);
  const alerts = db.getAlertsByEvent.all(eventId);

  const totalCps = checkpoints.length;

  const results = riders.map(rider => {
    const riderSplits = splits.filter(s => s.rider_id === rider.id);
    const riderAlerts = alerts.filter(a => a.rider_id === rider.id);
    const history = db.getHistoryByEventAndRider.all(eventId, rider.id);

    const clearedCpCount = riderSplits.length;
    const hasOverCot = riderSplits.some(s => s.status === 'OVER_COT');

    // Distance computation
    let distanceKm = 0;
    if (history.length > 0) {
      distanceKm = Math.max(...history.map(h => h.distance_km || 0));
    } else if (riderSplits.length > 0) {
      distanceKm = Math.max(...riderSplits.map(s => s.checkpoint_km || 0));
    }
    distanceKm = Math.round(distanceKm * 10) / 10;

    // Speed computation
    let avgSpeed = 0;
    if (history.length > 0) {
      const moving = history.filter(h => h.speed > 2);
      if (moving.length > 0) {
        avgSpeed = Math.round((moving.reduce((sum, h) => sum + h.speed, 0) / moving.length) * 10) / 10;
      }
    }

    // Time computation
    let elapsedSeconds = null;
    if (history.length >= 2) {
      const tStart = new Date(history[0].recorded_at).getTime();
      const tEnd = new Date(history[history.length - 1].recorded_at).getTime();
      if (!isNaN(tStart) && !isNaN(tEnd) && tEnd >= tStart) {
        elapsedSeconds = Math.floor((tEnd - tStart) / 1000);
      }
    }

    if (elapsedSeconds == null && riderSplits.length >= 2) {
      const s0 = parseTimeSeconds(riderSplits[0].arrival_time);
      const sEnd = parseTimeSeconds(riderSplits[riderSplits.length - 1].arrival_time);
      if (s0 != null && sEnd != null && sEnd >= s0) {
        elapsedSeconds = sEnd - s0;
      }
    }

    if (elapsedSeconds == null && riderSplits.length === 1 && totalCps === 1) {
      elapsedSeconds = 3600; // fallback minimal duration
    }

    // Determine Status
    let status = 'DNF';
    if (totalCps > 0 && clearedCpCount >= totalCps) {
      status = hasOverCot ? 'OVER_COT' : 'FINISHER';
    } else if (totalCps === 0 && distanceKm > 0) {
      status = 'FINISHER';
    }

    // If speed is still 0 but we have distance & time
    if (avgSpeed === 0 && distanceKm > 0 && elapsedSeconds && elapsedSeconds > 0) {
      avgSpeed = Math.round((distanceKm / (elapsedSeconds / 3600)) * 10) / 10;
    }

    return {
      rider_id: rider.id,
      bib: rider.bib,
      name: rider.name,
      color: rider.color,
      status,
      elapsed_seconds: elapsedSeconds || 0,
      elapsed_time: formatDuration(elapsedSeconds),
      distance_km: distanceKm,
      avg_speed: avgSpeed,
      checkpoints_cleared: clearedCpCount,
      total_checkpoints: totalCps,
      splits: riderSplits,
      alerts_count: riderAlerts.length
    };
  });

  // Sort & Rank: FINISHER first (by elapsed_seconds asc), then OVER_COT, then DNF (by checkpoints_cleared desc, distance desc)
  results.sort((a, b) => {
    const statusPriority = { FINISHER: 1, OVER_COT: 2, DNF: 3 };
    const pA = statusPriority[a.status] || 4;
    const pB = statusPriority[b.status] || 4;

    if (pA !== pB) return pA - pB;

    if (a.status === 'FINISHER') {
      return (a.elapsed_seconds || Infinity) - (b.elapsed_seconds || Infinity);
    }
    if (a.status === 'OVER_COT') {
      return b.checkpoints_cleared - a.checkpoints_cleared;
    }
    return b.distance_km - a.distance_km;
  });

  // Assign numeric rank
  results.forEach((r, idx) => {
    r.rank = idx + 1;
  });

  const summary = {
    total_riders: riders.length,
    finishers: results.filter(r => r.status === 'FINISHER').length,
    over_cot: results.filter(r => r.status === 'OVER_COT').length,
    dnf: results.filter(r => r.status === 'DNF').length
  };

  return { event, results, summary };
}

// ── GET /api/events/:id/results ──
router.get('/events/:id/results', (req, res) => {
  const eventId = Number(req.params.id);
  const data = calculateEventResults(eventId);

  if (!data) {
    return res.status(404).json({ error: 'Event tidak ditemukan' });
  }

  res.json(data);
});

// ── GET /api/events/:id/export/csv ──
router.get('/events/:id/export/csv', (req, res) => {
  const eventId = Number(req.params.id);
  const data = calculateEventResults(eventId);

  if (!data) {
    return res.status(404).send('Event tidak ditemukan');
  }

  const header = ['Rank', 'BIB', 'Rider Name', 'Status', 'Total Time', 'Distance (km)', 'Avg Speed (km/h)', 'Checkpoints Cleared', 'SOS Alerts'];
  const rows = data.results.map(r => [
    r.rank,
    `"${r.bib}"`,
    `"${r.name.replace(/"/g, '""')}"`,
    r.status,
    `"${r.elapsed_time}"`,
    r.distance_km,
    r.avg_speed,
    `"${r.checkpoints_cleared}/${r.total_checkpoints}"`,
    r.alerts_count
  ]);

  const csvContent = [
    header.join(','),
    ...rows.map(row => row.join(','))
  ].join('\r\n');

  const filename = `cyclopon-event-${eventId}-results.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csvContent);
});

module.exports = router;
