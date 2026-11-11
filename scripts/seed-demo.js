/**
 * CycloPon Live Race Seeder (scripts/seed-demo.js)
 * Sets up a realistic, rich demo event with 10 riders, official checkpoints,
 * realistic split times, and GPX telemetry history.
 *
 * Usage:
 *   node scripts/seed-demo.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../db/database');

console.log('\n🚴 \x1b[1m\x1b[32m[CYCLOPON SEEDER]\x1b[0m Inisialisasi data event balap sepeda realistis...');

// 1. Verify GPX Track File
const gpxRelPath = '/gpx/21.gpx';
const gpxAbsPath = path.join(__dirname, '..', 'public', 'gpx', '21.gpx');
if (!fs.existsSync(gpxAbsPath)) {
  console.error('\x1b[31m[ERROR] File GPX public/gpx/21.gpx tidak ditemukan!\x1b[0m');
  process.exit(1);
}

// 2. Setup or Update Flagship Demo Event
let event = db.db.prepare("SELECT * FROM events WHERE id = 21 OR name LIKE '%Gravel to Gang%'").get();
if (event) {
  db.db.prepare(`
    UPDATE events
    SET name = 'Gravel to Gang // Pro Telemetry 2026',
        date = '2026-10-18',
        gpx_path = ?,
        active = 1
    WHERE id = ?
  `).run(gpxRelPath, event.id);
  console.log(`✓ Event #${event.id} diperbarui: "Gravel to Gang // Pro Telemetry 2026" (Aktif)`);
} else {
  const info = db.db.prepare(`
    INSERT INTO events (id, name, date, gpx_path, active)
    VALUES (21, 'Gravel to Gang // Pro Telemetry 2026', '2026-10-18', ?, 1)
  `).run(gpxRelPath);
  event = { id: 21, name: 'Gravel to Gang // Pro Telemetry 2026', date: '2026-10-18', gpx_path: gpxRelPath, active: 1 };
  console.log(`✓ Event #${event.id} baru dibuat: "${event.name}"`);
}

const eventId = event.id;

// 3. Clear existing CPs, Splits, and History for clean seed
db.db.prepare('DELETE FROM rider_splits WHERE event_id = ?').run(eventId);
db.db.prepare('DELETE FROM checkpoints WHERE event_id = ?').run(eventId);
db.db.prepare('DELETE FROM position_history WHERE event_id = ?').run(eventId);
db.db.prepare('DELETE FROM alerts WHERE event_id = ?').run(eventId);

// 4. Setup Checkpoints with exact GPX coordinates & COT
const checkpointDefs = [
  { name: 'Start Arch (Tasikmalaya Grand Plaza)', km: 0.0,  open: '06:00', close: '07:00', lat: -7.328078, lon: 108.229500, order: 0 },
  { name: 'CP 1: Cineam Pass (Tanjakan Cineam)',  km: 7.5,  open: '06:20', close: '08:30', lat: -7.342565, lon: 108.263873, order: 1 },
  { name: 'CP 2: Karangnunggal KOM Summit',       km: 15.0, open: '06:50', close: '10:15', lat: -7.350830, lon: 108.284902, order: 2 },
  { name: 'CP 3: Cibalong Water Station',          km: 23.5, open: '07:20', close: '12:00', lat: -7.375867, lon: 108.252282, order: 3 },
  { name: 'CP 4: Finish Arch (Pangandaran Gate)',  km: 31.4, open: '07:50', close: '14:00', lat: -7.346917, lon: 108.207560, order: 4 },
];

const insertedCPs = [];
const insertCPStmt = db.db.prepare(`
  INSERT INTO checkpoints (event_id, name, km_distance, open_time, close_time, latitude, longitude, order_index)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const cp of checkpointDefs) {
  const res = insertCPStmt.run(eventId, cp.name, cp.km, cp.open, cp.close, cp.lat, cp.lon, cp.order);
  insertedCPs.push({ id: res.lastInsertRowid, ...cp });
}
console.log(`✓ 5 Pos Kontrol (Checkpoints) resmi berhasil didaftarkan.`);

// 5. Setup Diverse Rider Cohort
const riderDefs = [
  { bib: '001', name: 'Winata',           phone: '081234567001', color: '#10B981', role: 'rider',   traccar_id: 1001, speedBase: 34.5 },
  { bib: '007', name: 'Sarah Jenkins',   phone: '081234567007', color: '#EC4899', role: 'rider',   traccar_id: 1007, speedBase: 31.8 },
  { bib: '012', name: 'Raden Mas Bagus', phone: '081234567012', color: '#3B82F6', role: 'rider',   traccar_id: 1012, speedBase: 29.2 },
  { bib: '023', name: 'Hendra Wijaya',   phone: '081234567023', color: '#6366F1', role: 'rider',   traccar_id: 1023, speedBase: 28.5 },
  { bib: '034', name: 'Dimas Pratama',   phone: '081234567034', color: '#8B5CF6', role: 'rider',   traccar_id: 1034, speedBase: 27.0 },
  { bib: '045', name: 'Rudi Hartono',    phone: '081234567045', color: '#F59E0B', role: 'rider',   traccar_id: 1045, speedBase: 25.4 },
  { bib: '067', name: 'Arif Rahman',     phone: '081234567067', color: '#14B8A6', role: 'rider',   traccar_id: 1067, speedBase: 24.1 },
  { bib: '078', name: 'Kevin Santoso',   phone: '081234567078', color: '#06B6D4', role: 'rider',   traccar_id: 1078, speedBase: 22.8 },
  { bib: '088', name: 'Denny Setiawan',  phone: '081234567088', color: '#EF4444', role: 'sweeper', traccar_id: 1088, speedBase: 20.0 },
  { bib: '099', name: 'Bambang Pamungkas',phone: '081234567099', color: '#F97316', role: 'rider',   traccar_id: 1099, speedBase: 18.5 }
];

const insertedRiders = [];
// Clear existing riders for this event and recreate
db.db.prepare('DELETE FROM riders WHERE event_id = ?').run(eventId);

for (const r of riderDefs) {
  const token = crypto.randomBytes(6).toString('hex');
  const res = db.createRider.run({
    event_id: eventId,
    bib: r.bib,
    name: r.name,
    pin: '1234',
    phone: r.phone,
    token: token,
    role: r.role,
    color: r.color,
    traccar_device_id: r.traccar_id
  });
  insertedRiders.push({ id: res.lastInsertRowid, ...r, token, pin: '1234' });
}
console.log(`✓ 10 Rider resmi berhasil didaftarkan (termasuk Solo Leader & Official Sweeper).`);

// 6. Parse GPX trackpoints to seed initial telemetry points & splits
const gpxContent = fs.readFileSync(gpxAbsPath, 'utf-8');
const trackpoints = [...gpxContent.matchAll(/<trkpt lat=\"([^\"]+)\" lon=\"([^\"]+)\">(?:[\s\S]*?<ele>([^<]+)<\/ele>)?/g)].map(m => ({
  lat: parseFloat(m[1]),
  lon: parseFloat(m[2]),
  ele: m[3] ? parseFloat(m[3]) : 0
}));

// Calculate cumulative distances
let accumKm = 0;
trackpoints[0].km = 0;
for (let i = 1; i < trackpoints.length; i++) {
  const p1 = trackpoints[i-1], p2 = trackpoints[i];
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLon = (p2.lon - p1.lon) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(p1.lat*Math.PI/180) * Math.cos(p2.lat*Math.PI/180) * Math.sin(dLon/2)**2;
  accumKm += 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  trackpoints[i].km = accumKm;
}

// 7. Seed Initial Split Times and Position History
const cp1 = insertedCPs[1]; // KM 7.5
const cp2 = insertedCPs[2]; // KM 15.0
const baseTime = new Date('2026-10-18T06:00:00.000Z');

const insertSplitStmt = db.db.prepare(`
  INSERT OR REPLACE INTO rider_splits (event_id, rider_id, checkpoint_id, arrival_time, status)
  VALUES (?, ?, ?, ?, ?)
`);

// Winata (#001) passed CP1 & CP2
insertSplitStmt.run(eventId, insertedRiders[0].id, cp1.id, '2026-10-18T06:48:20.000Z', 'IN_TIME');
insertSplitStmt.run(eventId, insertedRiders[0].id, cp2.id, '2026-10-18T07:34:15.000Z', 'IN_TIME');

// Sarah (#007) passed CP1 & CP2
insertSplitStmt.run(eventId, insertedRiders[1].id, cp1.id, '2026-10-18T06:51:40.000Z', 'IN_TIME');
insertSplitStmt.run(eventId, insertedRiders[1].id, cp2.id, '2026-10-18T07:42:10.000Z', 'IN_TIME');

// Raden Bagus (#012) & Hendra (#023) passed CP1
insertSplitStmt.run(eventId, insertedRiders[2].id, cp1.id, '2026-10-18T06:57:30.000Z', 'IN_TIME');
insertSplitStmt.run(eventId, insertedRiders[3].id, cp1.id, '2026-10-18T06:59:10.000Z', 'IN_TIME');

// Dimas (#034) & Rudi (#045) passed CP1
insertSplitStmt.run(eventId, insertedRiders[4].id, cp1.id, '2026-10-18T07:05:45.000Z', 'IN_TIME');
insertSplitStmt.run(eventId, insertedRiders[5].id, cp1.id, '2026-10-18T07:11:20.000Z', 'IN_TIME');

// Bambang (#099) passed CP1 close to COT
insertSplitStmt.run(eventId, insertedRiders[9].id, cp1.id, '2026-10-18T08:15:30.000Z', 'IN_TIME');

console.log(`✓ Data rekaman split time checkpoint resmi berhasil digenerate.`);

// Seed initial position history along track
// Riders starting positions:
// Winata: index ~520 (KM ~24.5)
// Sarah: index ~460 (KM ~21.5)
// Peloton A: index ~340 (KM ~16.0)
// Peloton B: index ~240 (KM ~11.0)
// Climber/Chaser: index ~160 (KM ~7.5)
// Sweeper: index ~70 (KM ~3.2)
const startFractions = [0.80, 0.70, 0.54, 0.50, 0.40, 0.32, 0.25, 0.20, 0.12, 0.10];

const insertHistoryStmt = db.db.prepare(`
  INSERT INTO position_history (event_id, rider_id, latitude, longitude, speed, distance_km, recorded_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const nowIso = new Date().toISOString();
db.db.transaction(() => {
  insertedRiders.forEach((r, idx) => {
    const fraction = startFractions[idx];
    const targetIdx = Math.min(Math.floor(trackpoints.length * fraction), trackpoints.length - 1);
    
    // Insert 5 breadcrumb points trailing behind
    for (let step = 4; step >= 0; step--) {
      const pIdx = Math.max(0, targetIdx - step * 12);
      const pt = trackpoints[pIdx];
      const timeOffsetMs = step * 60000;
      const recTime = new Date(Date.now() - timeOffsetMs).toISOString();
      insertHistoryStmt.run(eventId, r.id, pt.lat, pt.lon, r.speedBase, pt.km.toFixed(2), recTime);
    }
  });
})();

console.log(`✓ Titik rekam jejak GPS telemetri (Breadcrumb History) berhasil disimpan.`);

// 8. Output Summary Table
console.log('\n\x1b[1m════════════════════════════════════════════════════════════════════════════════════\x1b[0m');
console.log(`\x1b[1m\x1b[36m🏆 EVENT AKTIF: ${event.name} (ID: ${eventId})\x1b[0m`);
console.log(`📍 Total Rute: \x1b[1m${accumKm.toFixed(1)} KM\x1b[0m | 5 Checkpoints | 10 Riders Terdaftar`);
console.log('────────────────────────────────────────────────────────────────────────────────────');
console.log('🔗 \x1b[33mURL Akses Cepat:\x1b[0m');
console.log(`   • Live Map Penonton  : \x1b[32mhttp://localhost:3000/watch/${eventId}\x1b[0m`);
console.log(`   • Hasil Resmi Brevet : \x1b[32mhttp://localhost:3000/events/${eventId}/results\x1b[0m`);
console.log(`   • Panel Race Control : \x1b[32mhttp://localhost:3000/admin/events/${eventId}\x1b[0m`);
console.log('────────────────────────────────────────────────────────────────────────────────────');
console.log('\x1b[1mDAFTAR KREDENSIAL LOGIN RIDER (BIB & PIN / MAGIC LINK):\x1b[0m');
console.log('BIB   | NAMA PESERTA         | ROLE    | PIN  | 1-KLIK MAGIC LOGIN');
console.log('──────┼──────────────────────┼─────────┼──────┼───────────────────────────────────');
for (const r of insertedRiders) {
  const bibCol = r.bib.padEnd(5);
  const nameCol = r.name.padEnd(20);
  const roleCol = r.role.padEnd(7);
  const magicLink = `http://localhost:3000/auth/token/${r.token}`;
  console.log(`${bibCol} | ${nameCol} | ${roleCol} | ${r.pin} | \x1b[34m${magicLink}\x1b[0m`);
}
console.log('════════════════════════════════════════════════════════════════════════════════════\x1b[0m');
console.log('✨ \x1b[1m\x1b[32mSEEDED SUKSES!\x1b[0m Jalankan \x1b[1mnode scripts/simulate-race.js\x1b[0m untuk simulasi pergerakan live!\n');
