/**
 * CycloPon Live Race Movement Daemon (scripts/simulate-race.js)
 * Simulates active real-time GPS telemetry movement of riders along the GPX route.
 * Automatically broadcasts live positions to connected browser spectators via WebSocket
 * and detects checkpoint passings with official split time recordings.
 *
 * Usage:
 *   node scripts/simulate-race.js
 *   node scripts/simulate-race.js --speed 5x
 *   node scripts/simulate-race.js --event 21 --interval 1000
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const db = require('../db/database');

// 1. Parse Command Line Arguments
const args = process.argv.slice(2);
let eventId = 21;
let speedMultiplier = 3.0; // 3x faster than real-time for dynamic demo feel
let tickIntervalMs = 1500;  // Update every 1.5s
let serverPort = process.env.PORT || 3000;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--event' && args[i + 1]) eventId = Number(args[i + 1]);
  if (args[i] === '--speed' && args[i + 1]) speedMultiplier = parseFloat(args[i + 1].replace('x', ''));
  if (args[i] === '--interval' && args[i + 1]) tickIntervalMs = Number(args[i + 1]);
  if (args[i] === '--port' && args[i + 1]) serverPort = Number(args[i + 1]);
}

// 2. Load Event Data
const event = db.getEventById.get(eventId);
if (!event) {
  console.error(`\x1b[31m[ERROR] Event ID ${eventId} tidak ditemukan dalam database!\x1b[0m`);
  console.log('Jalankan: npm run seed:demo terlebih dahulu.');
  if (require.main === module) process.exit(1);
}

const gpxAbsPath = event ? path.join(__dirname, '..', 'public', event.gpx_path.replace(/^\//, '')) : '';
if (event && !fs.existsSync(gpxAbsPath)) {
  console.error(`\x1b[31m[ERROR] File GPX ${gpxAbsPath} tidak ditemukan!\x1b[0m`);
  if (require.main === module) process.exit(1);
}

// 3. Robust GPX Trackpoints Parser
function parseGpxTrackpoints(gpxStr) {
  const points = [];
  const trkptRegex = /<trkpt\s+([^>]+)>([\s\S]*?)<\/trkpt>/gi;
  let match;
  while ((match = trkptRegex.exec(gpxStr)) !== null) {
    const attrs = match[1];
    const body = match[2];
    const latMatch = attrs.match(/lat=["']([^"']+)["']/i);
    const lonMatch = attrs.match(/lon=["']([^"']+)["']/i);
    const eleMatch = body.match(/<ele>([^<]+)<\/ele>/i);
    if (latMatch && lonMatch) {
      points.push({
        lat: parseFloat(latMatch[1]),
        lon: parseFloat(lonMatch[1]),
        ele: eleMatch ? parseFloat(eleMatch[1]) : 0
      });
    }
  }
  return points;
}

function computeTrackCumulativeKm(points) {
  let totalKm = 0;
  if (!points || points.length === 0) return 0;
  points[0].km = 0;
  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1], p2 = points[i];
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLon = (p2.lon - p1.lon) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    totalKm += 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    points[i].km = totalKm;
  }
  return totalKm;
}

const gpxContent = (event && fs.existsSync(gpxAbsPath)) ? fs.readFileSync(gpxAbsPath, 'utf-8') : '';
const trackpoints = parseGpxTrackpoints(gpxContent);
const totalRouteKm = computeTrackCumulativeKm(trackpoints);

// 4. Load Riders & Checkpoints
const riders = event ? db.getRidersByEvent.all(eventId) : [];
const checkpoints = event ? db.getCheckpointsByEvent.all(eventId) : [];

// Track splits to avoid duplicate recordings within a race loop
const existingSplits = event ? db.db.prepare('SELECT rider_id, checkpoint_id FROM rider_splits WHERE event_id = ?').all(eventId) : [];
const recordedSplitsSet = new Set(existingSplits.map(s => `${s.rider_id}_${s.checkpoint_id}`));

// Initialize Rider Simulation States
const riderStates = riders.map((r, idx) => {
  const latest = db.db.prepare(`
    SELECT * FROM position_history
    WHERE event_id = ? AND rider_id = ?
    ORDER BY recorded_at DESC LIMIT 1
  `).get(eventId, r.id);

  let curKm = 0;
  let curIndex = 0;

  if (latest && latest.distance_km != null) {
    curKm = Number(latest.distance_km);
    curIndex = trackpoints.findIndex(pt => pt.km >= curKm);
    if (curIndex < 0) curIndex = trackpoints.length - 1;
  } else {
    // Default staggering across the route
    const staggerFractions = [0.75, 0.68, 0.52, 0.48, 0.38, 0.30, 0.22, 0.18, 0.10, 0.08];
    const fraction = staggerFractions[idx % staggerFractions.length];
    curIndex = Math.min(Math.floor(trackpoints.length * fraction), trackpoints.length - 1);
    curKm = trackpoints[curIndex].km;
  }

  // Base speed in km/h based on rider role
  let baseSpeed = 28.0;
  if (r.bib === '001') baseSpeed = 35.0; // Solo breakaway leader
  else if (r.bib === '007') baseSpeed = 32.5; // Chaser leader
  else if (r.bib === '012' || r.bib === '023') baseSpeed = 29.5; // Peloton A
  else if (r.bib === '034' || r.bib === '045') baseSpeed = 27.0; // Peloton B
  else if (r.role === 'sweeper') baseSpeed = 21.0; // Sweeper official
  else if (r.bib === '099') baseSpeed = 19.0; // Lantern rouge

  return {
    rider: r,
    curIndex,
    curKm,
    baseSpeed,
    curSpeed: baseSpeed,
    isFinished: curKm >= totalRouteKm,
    finishRank: null,
    lastCheckpoint: 'Start'
  };
});

let tickCount = 0;
let isStopping = false;
const RESET_COOLDOWN_TICKS = 4;
let resetCooldown = RESET_COOLDOWN_TICKS;

// HTTP POST helper to send position batches using deterministic IPv4 loopback
function postPositions(batch) {
  const payload = JSON.stringify({ positions: batch });
  const req = http.request({
    hostname: '127.0.0.1',
    port: serverPort,
    path: `/api/events/${eventId}/history`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, res => {
    res.resume();
  });

  req.on('error', () => {
    // Fallback: insert directly into local SQLite if HTTP server is not listening
    try {
      const insertStmt = db.db.prepare(`
        INSERT INTO position_history (event_id, rider_id, latitude, longitude, speed, distance_km, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const insertTx = db.db.transaction((items) => {
        for (const p of items) {
          insertStmt.run(eventId, p.rider_id, p.latitude, p.longitude, p.speed, p.distance_km, p.recorded_at);
        }
      });
      insertTx(batch);
    } catch (e) {}
  });

  req.write(payload);
  req.end();
}

const insertSplitStmt = db.db.prepare(`
  INSERT OR REPLACE INTO rider_splits (event_id, rider_id, checkpoint_id, arrival_time, status)
  VALUES (?, ?, ?, ?, ?)
`);

// Simulation Tick Loop
async function simulationTick() {
  if (isStopping) return;
  tickCount++;

  const dtSeconds = (tickIntervalMs / 1000) * speedMultiplier;
  const positionsToPost = [];
  const nowIso = new Date().toISOString();
  const cpEvents = [];

  // Check if all riders have finished
  const finishedRiders = riderStates.filter(s => s.isFinished);
  const allFinished = (finishedRiders.length === riderStates.length && riderStates.length > 0);

  if (allFinished) {
    resetCooldown--;
    if (resetCooldown <= 0) {
      // Synchronized reset for all riders to start a fresh lap
      for (let i = 0; i < riderStates.length; i++) {
        const st = riderStates[i];
        st.curIndex = 0;
        st.curKm = 0;
        st.isFinished = false;
        st.finishRank = null;
        st.curSpeed = st.baseSpeed;
        st.lastCheckpoint = 'Start';
      }
      recordedSplitsSet.clear();
      resetCooldown = RESET_COOLDOWN_TICKS;
      try {
        db.db.prepare('DELETE FROM rider_splits WHERE event_id = ?').run(eventId);
      } catch (e) {}
      cpEvents.push('🔄 BALAPAN DIRESET: Semua rider bersiap di garis start untuk etape baru!');
    }
  }

  let nextRank = finishedRiders.length + 1;

  // Update each rider
  for (const st of riderStates) {
    if (st.isFinished) {
      // Stay parked at finish line with 0 speed until everyone finishes
      const finishPt = trackpoints[trackpoints.length - 1];
      positionsToPost.push({
        rider_id: st.rider.id,
        latitude: finishPt.lat,
        longitude: finishPt.lon,
        speed: 0,
        altitude: finishPt.ele,
        distance_km: Math.round(totalRouteKm * 10) / 10,
        recorded_at: nowIso
      });
      continue;
    }

    // Realistic gradient speed adjustment
    const curPt = trackpoints[st.curIndex];
    const nextIdx = Math.min(st.curIndex + 1, trackpoints.length - 1);
    const nextPt = trackpoints[nextIdx];
    
    // Elevation gradient %
    const distDeltaMeters = Math.max(1, (nextPt.km - curPt.km) * 1000);
    const eleDeltaMeters = nextPt.ele - curPt.ele;
    const gradePct = (eleDeltaMeters / distDeltaMeters) * 100;

    let adjustedSpeed = st.baseSpeed;
    if (gradePct > 3) adjustedSpeed *= 0.80; // Climbing penalty
    else if (gradePct > 6) adjustedSpeed *= 0.65; // Steep climb penalty
    else if (gradePct < -3) adjustedSpeed *= 1.25; // Descent boost

    // Random small speed jitter (+- 1.5 km/h)
    adjustedSpeed += (Math.random() - 0.5) * 3;
    st.curSpeed = Math.max(12, Math.round(adjustedSpeed * 10) / 10);

    // Distance covered in this tick
    const deltaKm = (st.curSpeed / 3600) * dtSeconds;
    st.curKm += deltaKm;

    if (st.curKm >= totalRouteKm) {
      st.curKm = totalRouteKm;
      st.curIndex = trackpoints.length - 1;
      st.isFinished = true;
      st.curSpeed = 0;
      st.finishRank = nextRank++;
      cpEvents.push(`🏁 BIB #${st.rider.bib} (${st.rider.name}) MENEMBUS FINISH! [PODIUM P${st.finishRank}]`);
    } else {
      // Advance trackpoint index
      while (st.curIndex < trackpoints.length - 1 && trackpoints[st.curIndex].km < st.curKm) {
        st.curIndex++;
      }
    }

    const currentCoords = trackpoints[st.curIndex];

    // Checkpoint detection
    for (const cp of checkpoints) {
      const splitKey = `${st.rider.id}_${cp.id}`;
      if (st.curKm >= cp.km_distance && !recordedSplitsSet.has(splitKey)) {
        recordedSplitsSet.add(splitKey);
        st.lastCheckpoint = cp.name.split(':')[0].trim();
        
        const status = 'IN_TIME';
        try {
          insertSplitStmt.run(eventId, st.rider.id, cp.id, nowIso, status);
          cpEvents.push(`⚡ BIB #${st.rider.bib} (${st.rider.name}) -> ${cp.name} (KM ${cp.km_distance})`);
        } catch (e) {}
      }
    }

    positionsToPost.push({
      rider_id: st.rider.id,
      latitude: currentCoords.lat,
      longitude: currentCoords.lon,
      speed: st.curSpeed,
      altitude: currentCoords.ele,
      distance_km: Math.round(st.curKm * 10) / 10,
      recorded_at: nowIso
    });
  }

  // Push to server / WebSocket broadcast
  postPositions(positionsToPost);

  // Render ANSI Console Dashboard
  if (require.main === module) {
    renderDashboard(tickCount, riderStates, cpEvents, allFinished, resetCooldown);
  }
}

function renderDashboard(tick, states, recentCpHits, allFinished, cooldownTicks) {
  // Sort states: finished riders sorted by rank, active riders sorted by distance descending
  const sorted = [...states].sort((a, b) => {
    if (a.isFinished && b.isFinished) return (a.finishRank || 99) - (b.finishRank || 99);
    if (a.isFinished) return -1;
    if (b.isFinished) return 1;
    return b.curKm - a.curKm;
  });

  process.stdout.write('\x1b[H'); // Move cursor to top without flicker
  console.log('\x1b[1m\x1b[36m╔══════════════════════════════════════════════════════════════════════════════════════════╗\x1b[0m');
  console.log(`\x1b[1m\x1b[36m║\x1b[0m  \x1b[1mCYCLOPON LIVE RACE SIMULATOR\x1b[0m | Tick: \x1b[33m#${tick}\x1b[0m | Kecepatan: \x1b[32m${speedMultiplier}x\x1b[0m | Rute: \x1b[1m${totalRouteKm.toFixed(1)} KM\x1b[0m      \x1b[1m\x1b[36m║\x1b[0m`);
  console.log(`\x1b[1m\x1b[36m║\x1b[0m  Live Spectator Map: \x1b[34mhttp://localhost:${serverPort}/watch/${eventId}\x1b[0m                              \x1b[1m\x1b[36m║\x1b[0m`);
  console.log('\x1b[1m\x1b[36m╠═════╤══════╤═════════════════════╤═══════════╤════════════╤══════════════════════╤══════════╣\x1b[0m');
  console.log('\x1b[1m\x1b[37m║ POS │ BIB  │ NAMA RIDER          │ SPEED     │ JARAK (KM) │ PROGRES RUTE         │ LAST CP  ║\x1b[0m');
  console.log('\x1b[1m\x1b[36m╠═════╪══════╪═════════════════════╪═══════════╪════════════╪══════════════════════╪══════════╣\x1b[0m');

  sorted.forEach((st, idx) => {
    let posNum = String(idx + 1).padStart(3);
    if (st.isFinished && st.finishRank) {
      posNum = `P${st.finishRank}`.padStart(3);
    }
    const bibStr = `#${st.rider.bib}`.padEnd(4);
    const nameStr = st.rider.name.substring(0, 19).padEnd(19);
    
    let speedStr = `${st.curSpeed.toFixed(1)} km/h`.padStart(9);
    if (st.isFinished) {
      speedStr = '\x1b[32m  FINISHER\x1b[0m';
    }

    const distStr = `${st.curKm.toFixed(1)} km`.padStart(10);
    
    // Progress bar (18 chars)
    const pct = Math.min(100, Math.round((st.curKm / totalRouteKm) * 100));
    const filled = Math.min(18, Math.round((pct / 100) * 18));
    const bar = '█'.repeat(filled) + '░'.repeat(18 - filled);
    const lastCp = (st.lastCheckpoint || '-').substring(0, 8).padEnd(8);

    let posColor = '\x1b[0m';
    if (st.finishRank === 1 || (!st.isFinished && idx === 0)) posColor = '\x1b[1m\x1b[32m'; // Leader green
    else if (st.rider.role === 'sweeper') posColor = '\x1b[1m\x1b[31m'; // Sweeper red

    console.log(`║ ${posColor}${posNum}\x1b[0m │ ${bibStr} │ ${nameStr} │ ${speedStr} │ ${distStr} │ [${bar}] │ ${lastCp} ║`);
  });

  console.log('\x1b[1m\x1b[36m╚═════╧══════╧═════════════════════╧═══════════╧════════════╧══════════════════════╧══════════╝\x1b[0m');
  
  if (allFinished) {
    console.log(`\x1b[1m\x1b[33m🏆 SEMUA RIDER TELAH FINISH! Balapan baru dimulai kembali dalam ${cooldownTicks} tick...\x1b[0m`);
  } else if (recentCpHits.length > 0) {
    console.log(`\x1b[33m🔔 ${recentCpHits.join(' | ')}\x1b[0m`);
  } else {
    console.log('💡 Buka browser di \x1b[1mhttp://localhost:3000/watch/21\x1b[0m untuk memantau pergerakan live!');
  }
  console.log('\x1b[90mTekan Ctrl+C untuk menghentikan simulator race kapan saja.\x1b[0m');
}

// Graceful shutdown
function shutdown() {
  if (isStopping) return;
  isStopping = true;
  if (timer) clearInterval(timer);
  console.log('\n\x1b[33m[INFO] Simulator balap dihentikan dengan aman. Terima kasih!\x1b[0m\n');
  process.exit(0);
}

let timer = null;
if (require.main === module) {
  console.clear();
  console.log('\x1b[1m\x1b[36m╔══════════════════════════════════════════════════════════════════════════════╗\x1b[0m');
  console.log(`\x1b[1m\x1b[36m║\x1b[0m  \x1b[1mCYCLOPON LIVE RACE SIMULATOR\x1b[0m // Telemetry Engine Active              \x1b[1m\x1b[36m║\x1b[0m`);
  console.log(`\x1b[1m\x1b[36m║\x1b[0m  Event: \x1b[1m${event.name}\x1b[0m (${totalRouteKm.toFixed(1)} KM)                         \x1b[1m\x1b[36m║\x1b[0m`);
  console.log(`\x1b[1m\x1b[36m║\x1b[0m  Speed Multiplier: \x1b[33m${speedMultiplier}x\x1b[0m | Interval: \x1b[33m${tickIntervalMs}ms\x1b[0m | Riders: \x1b[32m${riders.length}\x1b[0m               \x1b[1m\x1b[36m║\x1b[0m`);
  console.log('\x1b[1m\x1b[36m╚══════════════════════════════════════════════════════════════════════════════╝\x1b[0m');
  console.log(`📡 Menghubungkan ke server HTTP CycloPon port ${serverPort}...`);

  timer = setInterval(simulationTick, tickIntervalMs);
  simulationTick();

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = {
  parseGpxTrackpoints,
  computeTrackCumulativeKm,
  simulationTick,
  riderStates,
  totalRouteKm
};
