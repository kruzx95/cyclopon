const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../db/database');
const { findRiderForDevice } = require('../lib/traccar-ws-proxy');
const osmandRouter = require('../routes/osmand');

test('Multi-Event BIB Collision Resolution & Sticky Finish', async (t) => {
  let eventAId;
  let eventBId;
  let riderAId;
  let riderBId;

  await t.test('setup two simultaneous events with duplicate BIB numbers', () => {
    // Event A: PASIR ANGIN
    const evA = db.createEvent.run({
      name: 'PASIR ANGIN TEST',
      date: '2026-11-22'
    });
    eventAId = Number(evA.lastInsertRowid);
    db.db.prepare('UPDATE events SET active = 1 WHERE id = ?').run(eventAId);

    // Event B: MODALDENGKUL.CC SUKAPULANG
    const evB = db.createEvent.run({
      name: 'MODALDENGKUL TEST',
      date: '2026-11-22'
    });
    eventBId = Number(evB.lastInsertRowid);
    db.db.prepare('UPDATE events SET active = 1 WHERE id = ?').run(eventBId);

    // Both events have a rider with BIB 01
    const rA = db.createRider.run({
      event_id: eventAId,
      bib: '01',
      name: 'Rider Pasir Angin',
      pin: '1111',
      traccar_device_id: null,
      color: '#3B82F6'
    });
    riderAId = Number(rA.lastInsertRowid);

    const rB = db.createRider.run({
      event_id: eventBId,
      bib: '01',
      name: 'Rider Modaldengkul',
      pin: '2222',
      traccar_device_id: null,
      color: '#EF4444'
    });
    riderBId = Number(rB.lastInsertRowid);
  });

  await t.test('findRiderForDevice resolves correct rider when composite ID is used', () => {
    const resolvedB = findRiderForDevice(999901, `${eventBId}-01`);
    assert.ok(resolvedB, 'Should find rider');
    assert.strictEqual(resolvedB.id, riderBId, 'Should resolve to Modaldengkul rider');
    assert.strictEqual(resolvedB.event_id, eventBId);

    const resolvedA = findRiderForDevice(999902, `E${eventAId}-01`);
    assert.ok(resolvedA, 'Should find rider');
    assert.strictEqual(resolvedA.id, riderAId, 'Should resolve to Pasir Angin rider');
    assert.strictEqual(resolvedA.event_id, eventAId);
  });

  await t.test('OsmAnd handleOsmandPosition routes telemetry to correct rider with composite ID', async () => {
    const mockRes = {
      statusCode: null,
      body: null,
      status(c) { this.statusCode = c; return this; },
      send(b) { this.body = b; return this; }
    };

    const mockReq = {
      method: 'GET',
      query: {
        id: `${eventBId}-01`,
        lat: '-6.9123',
        lon: '107.6123',
        speed: '12.5'
      },
      body: {},
      headers: {}
    };

    await osmandRouter.handleOsmandPosition(mockReq, mockRes);
    assert.strictEqual(mockRes.statusCode, 200);
    assert.strictEqual(mockRes.body, 'OK');

    const lastPos = db.db.prepare('SELECT * FROM position_history WHERE rider_id = ? ORDER BY id DESC LIMIT 1').get(riderBId);
    assert.ok(lastPos, 'Position must be stored for Modaldengkul rider');
    assert.strictEqual(lastPos.rider_id, riderBId);
    assert.strictEqual(lastPos.event_id, eventBId);
  });

  await t.test('OsmAnd handleOsmandPosition routes telemetry with event_id query param', async () => {
    const mockRes = {
      statusCode: null,
      body: null,
      status(c) { this.statusCode = c; return this; },
      send(b) { this.body = b; return this; }
    };

    const mockReq = {
      method: 'GET',
      query: {
        id: '01',
        event_id: String(eventAId),
        lat: '-6.8500',
        lon: '107.5500',
        speed: '15.0'
      },
      body: {},
      headers: {}
    };

    await osmandRouter.handleOsmandPosition(mockReq, mockRes);
    assert.strictEqual(mockRes.statusCode, 200);
    assert.strictEqual(mockRes.body, 'OK');

    const lastPos = db.db.prepare('SELECT * FROM position_history WHERE rider_id = ? ORDER BY id DESC LIMIT 1').get(riderAId);
    assert.ok(lastPos, 'Position must be stored for Pasir Angin rider');
    assert.strictEqual(lastPos.rider_id, riderAId);
    assert.strictEqual(lastPos.event_id, eventAId);
  });

  await t.test('positions/latest SQL aggregation tracks max_distance_km correctly', () => {
    // Record multiple positions for riderB (including an out-and-back turning back)
    db.db.prepare(`
      INSERT INTO position_history (event_id, rider_id, latitude, longitude, speed, distance_km, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-5 minutes'))
    `).run(eventBId, riderBId, -6.90, 107.60, 25.0, 20.8); // Finished point

    db.db.prepare(`
      INSERT INTO position_history (event_id, rider_id, latitude, longitude, speed, distance_km, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(eventBId, riderBId, -6.91, 107.61, 20.0, 15.2); // Riding back home

    const latest = db.db.prepare(`
      SELECT h.*, r.name, r.bib, r.color,
             agg.max_distance_km
      FROM position_history h
      JOIN riders r ON h.rider_id = r.id
      JOIN (
        SELECT rider_id, MAX(id) AS max_id, MAX(distance_km) AS max_distance_km
        FROM position_history
        WHERE event_id = ?
        GROUP BY rider_id
      ) agg ON agg.max_id = h.id
    `).all(eventBId);

    assert.strictEqual(latest.length, 1);
    const row = latest[0];
    assert.strictEqual(row.rider_id, riderBId);
    assert.strictEqual(row.distance_km, 15.2, 'Latest distance is return distance');
    assert.strictEqual(row.max_distance_km, 20.8, 'Max distance preserves highest reached point');
  });

  await t.test('cleanup test fixtures', () => {
    db.db.prepare('DELETE FROM position_history WHERE event_id IN (?, ?)').run(eventAId, eventBId);
    db.db.prepare('DELETE FROM riders WHERE event_id IN (?, ?)').run(eventAId, eventBId);
    db.db.prepare('DELETE FROM events WHERE id IN (?, ?)').run(eventAId, eventBId);
  });
});
