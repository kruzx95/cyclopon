/**
 * CycloPon Demo & Dummy Data Cleaner (scripts/clean-demo-data.js)
 * Clean Code & Antislop Data Hygiene:
 * Purges demo events, fake riders, mock checkpoints, simulated position history,
 * residual test runs, and test telemetry, leaving production database pristine.
 *
 * Usage:
 *   node scripts/clean-demo-data.js
 *   npm run clean:data
 */

const db = require('../db/database');

console.log('\n🧹 \x1b[1m\x1b[36m[CYCLOPON CLEAN-CODE]\x1b[0m Pembersihan data demo, dummy, dan riwayat simulasi...\n');

// 1. Identify demo/dummy events to delete
const demoEvents = db.db.prepare(`
  SELECT id, name FROM events
  WHERE id IN (1, 2, 21, 231)
     OR name LIKE '%Gravel to Gang%'
     OR name LIKE '%Tour de Gang%'
     OR name LIKE '%Demo%'
     OR name LIKE '%Trial Run%'
     OR name LIKE '%Test%'
     OR name LIKE '%Gran Fondo%'
     OR name = 'ULTRA'
`).all();

console.log(`Ditemukan ${demoEvents.length} event demo/dummy untuk dibersihkan:`);
demoEvents.forEach(ev => console.log(`  • Event #${ev.id}: "${ev.name}"`));

const deleteEventStmt = db.db.prepare('DELETE FROM events WHERE id = ?');
const deleteHistoryByEventStmt = db.db.prepare('DELETE FROM position_history WHERE event_id = ?');
const deleteSplitsByEventStmt = db.db.prepare('DELETE FROM rider_splits WHERE event_id = ?');
const deleteCpsByEventStmt = db.db.prepare('DELETE FROM checkpoints WHERE event_id = ?');
const deleteRidersByEventStmt = db.db.prepare('DELETE FROM riders WHERE event_id = ?');
const deleteAlertsByEventStmt = db.db.prepare('DELETE FROM alerts WHERE event_id = ?');

db.db.transaction(() => {
  for (const ev of demoEvents) {
    deleteHistoryByEventStmt.run(ev.id);
    deleteSplitsByEventStmt.run(ev.id);
    deleteCpsByEventStmt.run(ev.id);
    deleteRidersByEventStmt.run(ev.id);
    deleteAlertsByEventStmt.run(ev.id);
    deleteEventStmt.run(ev.id);
  }

  // 2. Clear simulated position history & residual alerts from real events (e.g. Tour de Gang)
  const remainingEvents = db.db.prepare('SELECT id, name FROM events').all();
  for (const ev of remainingEvents) {
    const deletedHist = deleteHistoryByEventStmt.run(ev.id);
    const deletedAlerts = deleteAlertsByEventStmt.run(ev.id);
    if (deletedHist.changes > 0) {
      console.log(`✓ Membersihkan ${deletedHist.changes} titik GPS telemetri lama/simulasi pada Event #${ev.id} ("${ev.name}")`);
    }
    if (deletedAlerts.changes > 0) {
      console.log(`✓ Membersihkan ${deletedAlerts.changes} alert lama pada Event #${ev.id}`);
    }
  }

  // 3. Clear orphaned records across all tables
  db.db.prepare('DELETE FROM position_history WHERE event_id NOT IN (SELECT id FROM events)').run();
  db.db.prepare('DELETE FROM rider_splits WHERE event_id NOT IN (SELECT id FROM events)').run();
  db.db.prepare('DELETE FROM checkpoints WHERE event_id NOT IN (SELECT id FROM events)').run();
  db.db.prepare('DELETE FROM riders WHERE event_id NOT IN (SELECT id FROM events)').run();
  db.db.prepare('DELETE FROM alerts WHERE event_id NOT IN (SELECT id FROM events)').run();

  // 4. Clear test visitor traffic / page views
  const clearedViews = db.db.prepare('DELETE FROM page_views').run();
  console.log(`✓ Mereset ${clearedViews.changes} rekam traffic page_views pengujian.`);
})();

// 5. Optimize & defragment SQLite database
try {
  db.db.pragma('wal_checkpoint(TRUNCATE)');
  db.db.exec('VACUUM;');
  db.db.exec('PRAGMA optimize;');
} catch (e) {
  // If in transaction or locked, ignore
}

console.log('\n✨ \x1b[1m\x1b[32m[SUKSES]\x1b[0m Database sekarang bersih dari semua data demo dan dummy!');
console.log('────────────────────────────────────────────────────────────────────────');
const activeEvents = db.db.prepare('SELECT * FROM events').all();
console.log(`Daftar event resmi tersisa (${activeEvents.length}):`);
activeEvents.forEach(e => {
  const riders = db.db.prepare('SELECT count(*) as c FROM riders WHERE event_id = ?').get(e.id);
  const cps = db.db.prepare('SELECT count(*) as c FROM checkpoints WHERE event_id = ?').get(e.id);
  console.log(`  • [ID: ${e.id}] "${e.name}" | ${riders.c} Riders | ${cps.c} Checkpoints | Aktif: ${e.active ? 'Ya' : 'Tidak'}`);
});
console.log('────────────────────────────────────────────────────────────────────────\n');

