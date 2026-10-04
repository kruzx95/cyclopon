const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const db = require('../db/database');
const app = require('../server');

test('Official Results & CSV Export API', async (t) => {
  let server;
  let baseUrl;

  await t.test('setup server and test event data', async () => {
    // 1. Create event
    const eventResult = db.createEvent.run({
      name: 'Audax Brevet 200 Results Test',
      date: '2026-10-20'
    });
    const eventId = Number(eventResult.lastInsertRowid);

    // 2. Create 2 riders
    const rider1 = db.createRider.run({
      event_id: eventId,
      bib: '101',
      name: 'Finisher Rider A',
      pin: '1111',
      traccar_device_id: 201,
      color: '#00E5FF'
    });
    const riderId1 = Number(rider1.lastInsertRowid);

    const rider2 = db.createRider.run({
      event_id: eventId,
      bib: '102',
      name: 'DNF Rider B',
      pin: '2222',
      traccar_device_id: 202,
      color: '#FFE600'
    });
    const riderId2 = Number(rider2.lastInsertRowid);

    // 3. Create 2 checkpoints
    const cp1 = db.createCheckpoint.run({
      event_id: eventId,
      name: 'CP 1 Waduk Cirata',
      km_distance: 50.0,
      open_time: '06:00',
      close_time: '10:00',
      latitude: -6.72,
      longitude: 107.35,
      order_index: 1
    });
    const cpId1 = Number(cp1.lastInsertRowid);

    const cp2 = db.createCheckpoint.run({
      event_id: eventId,
      name: 'Finish Gate',
      km_distance: 100.0,
      open_time: '08:00',
      close_time: '14:00',
      latitude: -6.90,
      longitude: 107.60,
      order_index: 2
    });
    const cpId2 = Number(cp2.lastInsertRowid);

    // 4. Record splits: Rider 1 finished both, Rider 2 only CP 1
    db.recordSplit.run({
      event_id: eventId,
      rider_id: riderId1,
      checkpoint_id: cpId1,
      arrival_time: '08:15:00',
      status: 'IN_TIME'
    });
    db.recordSplit.run({
      event_id: eventId,
      rider_id: riderId1,
      checkpoint_id: cpId2,
      arrival_time: '12:30:00',
      status: 'IN_TIME'
    });

    db.recordSplit.run({
      event_id: eventId,
      rider_id: riderId2,
      checkpoint_id: cpId1,
      arrival_time: '09:45:00',
      status: 'IN_TIME'
    });

    // 5. Add position history for telemetry/speed/distance calculation
    db.recordPositionHistory.run({
      event_id: eventId,
      rider_id: riderId1,
      latitude: -6.70,
      longitude: 107.30,
      speed: 25.5,
      distance_km: 100.0,
      recorded_at: '2026-10-20T06:00:00Z'
    });
    db.recordPositionHistory.run({
      event_id: eventId,
      rider_id: riderId1,
      latitude: -6.90,
      longitude: 107.60,
      speed: 28.0,
      distance_km: 100.0,
      recorded_at: '2026-10-20T12:30:00Z'
    });

    t.context = { eventId, riderId1, riderId2, cpId1, cpId2 };

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  await t.test('GET /api/events/:id/results returns official results with status and ranks', async () => {
    const { eventId, riderId1 } = t.context;

    const res = await fetch(`${baseUrl}/api/events/${eventId}/results`);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.ok(data.event);
    assert.equal(data.event.id, eventId);
    assert.ok(Array.isArray(data.results));
    assert.equal(data.results.length, 2);

    // Rider 1 should be ranked 1 as FINISHER
    const r1 = data.results.find(r => r.rider_id === riderId1);
    assert.ok(r1);
    assert.equal(r1.status, 'FINISHER');
    assert.equal(r1.bib, '101');
    assert.equal(r1.checkpoints_cleared, 2);
    assert.equal(r1.total_checkpoints, 2);
    assert.ok(r1.elapsed_time);

    // Rider 2 only cleared 1 CP, so DNF
    const r2 = data.results.find(r => r.bib === '102');
    assert.ok(r2);
    assert.equal(r2.status, 'DNF');
    assert.equal(r2.checkpoints_cleared, 1);
  });

  await t.test('GET /api/events/:id/export/csv exports results as CSV file', async () => {
    const { eventId } = t.context;

    const res = await fetch(`${baseUrl}/api/events/${eventId}/export/csv`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/csv/);
    assert.match(res.headers.get('content-disposition'), /cyclopon-event/);

    const csvText = await res.text();
    assert.ok(csvText.includes('Rank,BIB,Rider Name,Status'));
    assert.ok(csvText.includes('Finisher Rider A'));
    assert.ok(csvText.includes('FINISHER'));
    assert.ok(csvText.includes('DNF Rider B'));
  });

  await t.test('teardown', async () => {
    const { eventId } = t.context;
    db.db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });
});
