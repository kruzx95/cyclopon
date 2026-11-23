const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const db = require('../db/database');
const app = require('../server');

test('Admin Event Logs & Preventive Recap Suite', async (t) => {
  let server;
  let baseUrl;
  let testEventId;
  let rider1Id;
  let rider2Id;

  await t.test('setup server and test trial event data', async () => {
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Create a trial event
    const ev = db.createEvent.run({
      name: 'Trial Event Mini Race 2026',
      date: '2026-11-23',
      gpx_path: null,
      active: 1,
      access_pin: ''
    });
    testEventId = Number(ev.lastInsertRowid);

    // Register 2 riders
    const r1 = db.createRider.run({
      event_id: testEventId,
      bib: '01',
      name: 'Rider Trial Satu',
      pin: '1234',
      traccar_device_id: null,
      color: '#00E5FF',
      phone: '08123456789',
      role: 'rider'
    });
    rider1Id = Number(r1.lastInsertRowid);

    const r2 = db.createRider.run({
      event_id: testEventId,
      bib: '02',
      name: 'Rider Trial Dua',
      pin: '1234',
      traccar_device_id: null,
      color: '#E11D48',
      phone: '08987654321',
      role: 'rider'
    });
    rider2Id = Number(r2.lastInsertRowid);

    // Insert pings for rider 1 with an intentional 15-minute gap (blank spot simulation)
    const baseTime = Date.now() - 3600 * 1000;
    const t0 = new Date(baseTime).toISOString();
    const t1 = new Date(baseTime + 60 * 1000).toISOString();
    const t2 = new Date(baseTime + 16 * 60 * 1000).toISOString(); // 15 min gap!
    const t3 = new Date(baseTime + 17 * 60 * 1000).toISOString();

    db.recordPositionHistory.run({ event_id: testEventId, rider_id: rider1Id, latitude: -6.90, longitude: 107.60, speed: 25.5, distance_km: 1.0, recorded_at: t0 });
    db.recordPositionHistory.run({ event_id: testEventId, rider_id: rider1Id, latitude: -6.91, longitude: 107.61, speed: 26.0, distance_km: 2.0, recorded_at: t1 });
    db.recordPositionHistory.run({ event_id: testEventId, rider_id: rider1Id, latitude: -6.95, longitude: 107.65, speed: 24.0, distance_km: 7.5, recorded_at: t2 });
    db.recordPositionHistory.run({ event_id: testEventId, rider_id: rider1Id, latitude: -6.96, longitude: 107.66, speed: 27.0, distance_km: 8.5, recorded_at: t3 });

    // Rider 2 has 0 pings (testing zero ping detection)

    // Insert an alert and resolve it
    const alt = db.createAlert.run({
      event_id: testEventId,
      rider_id: rider1Id,
      type: 'MECHANICAL',
      latitude: -6.95,
      longitude: 107.65,
      message: 'Rantai putus di KM 7.5'
    });
    db.resolveAlert.run(alt.lastInsertRowid);
  });

  await t.test('GET /api/admin/metrics/event-logs returns list of events with recap stats', async () => {
    const res = await fetch(`${baseUrl}/api/admin/metrics/event-logs`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.events));

    const found = json.events.find(e => e.id === testEventId);
    assert.ok(found);
    assert.strictEqual(found.name, 'Trial Event Mini Race 2026');
    assert.strictEqual(found.ridersCount, 2);
    assert.strictEqual(found.pings, 4);
    assert.strictEqual(found.alertsCount, 1);
  });

  await t.test('GET /api/admin/metrics/event-logs/:id returns 404 for unknown event', async () => {
    const res = await fetch(`${baseUrl}/api/admin/metrics/event-logs/999999`);
    assert.strictEqual(res.status, 404);
  });

  await t.test('GET /api/admin/metrics/event-logs/:id returns comprehensive audit and preventive recommendations', async () => {
    const res = await fetch(`${baseUrl}/api/admin/metrics/event-logs/${testEventId}`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);

    // KPI check
    assert.strictEqual(json.event.name, 'Trial Event Mini Race 2026');
    assert.strictEqual(json.kpi.totalRiders, 2);
    assert.strictEqual(json.kpi.activeRidersWithPings, 1);
    assert.strictEqual(json.kpi.totalPings, 4);
    assert.strictEqual(json.kpi.totalAlerts, 1);
    assert.strictEqual(json.kpi.unresolvedAlerts, 0);
    assert.strictEqual(json.kpi.totalBlankSpotIncidents, 1);
    assert.ok(json.kpi.healthScore > 0 && json.kpi.healthScore <= 100);

    // Rider logs check
    assert.strictEqual(json.riderLogs.length, 2);
    const r1Log = json.riderLogs.find(r => r.bib === '01');
    assert.ok(r1Log);
    assert.strictEqual(r1Log.pings, 4);
    assert.strictEqual(r1Log.hasBlankSpot, true);
    assert.ok(r1Log.longestGapMinutes >= 15);

    const r2Log = json.riderLogs.find(r => r.bib === '02');
    assert.ok(r2Log);
    assert.strictEqual(r2Log.pings, 0);

    // Recommendations check
    assert.ok(Array.isArray(json.recommendations));
    assert.ok(json.recommendations.length >= 2);

    // Blank spot recommendation exists
    const blankSpotRec = json.recommendations.find(r => r.category.includes('Blank Spot'));
    assert.ok(blankSpotRec);
    assert.strictEqual(blankSpotRec.type, 'WARNING');

    // Zero-ping rider recommendation exists
    const zeroPingRec = json.recommendations.find(r => r.category.includes('Setup Perangkat'));
    assert.ok(zeroPingRec);

    // Resolved alert recommendation exists
    const alertRec = json.recommendations.find(r => r.category.includes('Protokol Darurat'));
    assert.ok(alertRec);
  });

  await t.test('teardown test server and trial data', async () => {
    try {
      db.deleteEvent.run(testEventId);
    } catch (e) {}
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
