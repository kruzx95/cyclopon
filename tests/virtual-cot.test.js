const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('fs');
const path = require('path');
const db = require('../db/database');
const virtualCot = require('../lib/virtual-cot');

const GPX_DIR = path.join(__dirname, '..', 'public', 'gpx');
const createdEventIds = [];
const createdGpxFiles = [];

function roundTripGpx(eventId, maxLon = 0.03) {
  const steps = 4;
  const points = [];
  for (let i = 0; i < steps; i++) {
    const lon = (maxLon / (steps - 1)) * i;
    points.push(`<trkpt lat="0" lon="${lon}"></trkpt>`);
  }
  const body = `<?xml version="1.0"?><gpx><trk><trkseg>${points.join('')}</trkseg></trk></gpx>`;
  if (!fs.existsSync(GPX_DIR)) fs.mkdirSync(GPX_DIR, { recursive: true });
  const file = path.join(GPX_DIR, `${eventId}.gpx`);
  fs.writeFileSync(file, body);
  createdGpxFiles.push(file);
  return file;
}

function createEvent(overrides = {}) {
  const result = db.createEvent.run({
    name: overrides.name || `Virtual COT Test ${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: overrides.date || '2026-11-18'
  });
  const eventId = Number(result.lastInsertRowid);
  createdEventIds.push(eventId);

  const startMs = overrides.cot_start_ms ?? null;
  const startTime = overrides.cot_start_time
    ?? (startMs ? new Date(startMs + 7 * 3600000).toISOString().slice(11, 16) : '05:00');

  db.updateEventCot.run({
    id: eventId,
    cot_start_time: startTime,
    cot_start_ms: startMs,
    cot_pace: overrides.cot_pace ?? 20,
    cot_mode: overrides.cot_mode ?? 'live'
  });

  if (overrides.gpx !== false) roundTripGpx(eventId, overrides.maxLon ?? 0.03);
  return eventId;
}

function addRider(eventId, bib, role = 'rider') {
  const result = db.createRider.run({
    event_id: eventId,
    bib,
    name: `Rider ${bib}`,
    pin: '1234',
    role,
    color: '#00E5FF'
  });
  return Number(result.lastInsertRowid);
}

function addPosition(eventId, riderId, distanceKm, recordedAt) {
  db.recordPositionHistory.run({
    event_id: eventId,
    rider_id: riderId,
    latitude: 0,
    longitude: 0.01,
    speed: 20,
    distance_km: distanceKm,
    recorded_at: new Date(recordedAt).toISOString()
  });
}

test('Virtual COT — marker, evaluation guards, DNF ledger & endpoints', async (t) => {
  let server;
  let baseUrl;
  const nowMs = Date.now();

  await t.test('setup test server', async () => {
    await new Promise((resolve) => {
      server = http.createServer(require('../server'));
      server.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  await t.test('wibToEpochMs converts WIB wall clock into UTC epoch', () => {
    const ms = virtualCot.wibToEpochMs('2026-11-18', '05:00');
    assert.equal(new Date(ms).toISOString(), '2026-11-17T22:00:00.000Z');

    // Crossing midnight must stay purely arithmetic
    const late = virtualCot.wibToEpochMs('2026-11-18', '23:30');
    assert.equal(new Date(late).toISOString(), '2026-11-18T16:30:00.000Z');
  });

  await t.test('marker is NOT_STARTED before its start time', () => {
    const startMs = nowMs + 60 * 60 * 1000;
    const eventId = createEvent({ cot_start_ms: startMs, cot_mode: 'dry_run' });
    const marker = virtualCot.computeMarker(db.getEventById.get(eventId), nowMs);

    assert.equal(marker.status, 'NOT_STARTED');
    assert.equal(marker.distanceKm, 0);
  });

  await t.test('marker clamps at the finish and reports FINISHED', () => {
    const startMs = nowMs - 10 * 3600000; // 10h * 20km/h = 200km on a ~3.3km route
    const eventId = createEvent({ cot_start_ms: startMs, cot_mode: 'dry_run' });
    const marker = virtualCot.computeMarker(db.getEventById.get(eventId), nowMs);

    assert.equal(marker.status, 'FINISHED');
    assert.ok(Math.abs(marker.distanceKm - marker.routeLengthKm) < 0.1);
    assert.ok(marker.distanceKm > 3);
  });

  await t.test('marker distance maps to a coordinate on the GPX route', () => {
    const startMs = nowMs - 3 * 60 * 1000; // 3 min * 20km/h = 1 km
    const eventId = createEvent({ cot_start_ms: startMs, cot_mode: 'dry_run' });
    const marker = virtualCot.computeMarker(db.getEventById.get(eventId), nowMs);

    assert.equal(marker.status, 'MOVING');
    assert.ok(Math.abs(marker.distanceKm - 1) < 0.05);
    assert.ok(marker.latitude !== null && marker.longitude !== null);
    // Route runs east along the equator, so 1 km ≈ 0.009 degrees of longitude
    assert.ok(marker.longitude > 0.007 && marker.longitude < 0.011, `lon=${marker.longitude}`);
  });

  await t.test('rider ahead of the marker is safe and not recorded', () => {
    const eventId = createEvent({ cot_start_ms: nowMs - 6 * 60 * 1000 }); // marker ~2 km
    const ahead = addRider(eventId, 'A1');
    const behind = addRider(eventId, 'A2');
    addPosition(eventId, ahead, 2.6, nowMs - 30 * 1000);
    addPosition(eventId, behind, 0.8, nowMs - 30 * 1000);

    const result = virtualCot.evaluateVirtualCot(eventId, { nowMs });
    assert.equal(result.state, 'ok');

    const states = new Map(result.states.map(s => [s.rider_id, s.state]));
    assert.equal(states.get(ahead), 'AHEAD');
    assert.equal(states.get(behind), 'BEHIND');

    const ledger = virtualCot.getDnfLedger(eventId);
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].rider_id, behind);
    assert.equal(ledger[0].status, 'ACTIVE');
    assert.ok(ledger[0].last_seen_at);
    assert.ok(ledger[0].rider_km < ledger[0].cot_km);
  });

  await t.test('DNF is sticky even when the rider later moves ahead', () => {
    const eventId = createEvent({ cot_start_ms: nowMs - 6 * 60 * 1000 });
    const riderId = addRider(eventId, 'B1');
    addPosition(eventId, riderId, 0.2, nowMs - 20 * 1000);

    virtualCot.evaluateVirtualCot(eventId, { nowMs });
    assert.equal(virtualCot.getDnfLedger(eventId).length, 1);

    addPosition(eventId, riderId, 3.2, nowMs - 5 * 1000);
    const second = virtualCot.evaluateVirtualCot(eventId, { nowMs });
    assert.equal(second.states.find(s => s.rider_id === riderId).state, 'DNF');

    const ledger = virtualCot.getDnfLedger(eventId);
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].status, 'ACTIVE');
  });

  await t.test('stale positions are never judged as DNF', () => {
    const eventId = createEvent({ cot_start_ms: nowMs - 6 * 60 * 1000 });
    const staleRider = addRider(eventId, 'C1');
    const freshRider = addRider(eventId, 'C2');
    addPosition(eventId, staleRider, 0.2, nowMs - 30 * 60 * 1000);
    addPosition(eventId, freshRider, 2.6, nowMs - 30 * 1000);

    const result = virtualCot.evaluateVirtualCot(eventId, { nowMs });
    const states = new Map(result.states.map(s => [s.rider_id, s.state]));

    assert.equal(states.get(staleRider), 'STALE');
    assert.equal(states.get(freshRider), 'AHEAD');
    assert.equal(virtualCot.getDnfLedger(eventId).length, 0);
  });

  await t.test('riders inside the margin are still safe', () => {
    const eventId = createEvent({ cot_start_ms: nowMs - 6 * 60 * 1000 }); // marker ~2 km
    const riderId = addRider(eventId, 'D1');
    addPosition(eventId, riderId, 1.5, nowMs - 20 * 1000); // 0.5 km behind

    virtualCot.evaluateVirtualCot(eventId, { nowMs });
    assert.equal(virtualCot.getDnfLedger(eventId).length, 0);
  });

  await t.test('event-wide telemetry gap freezes evaluation', () => {
    const eventId = createEvent({ cot_start_ms: nowMs - 6 * 60 * 1000 });
    const riderId = addRider(eventId, 'E1');
    addPosition(eventId, riderId, 0.2, nowMs - 40 * 60 * 1000);

    const result = virtualCot.evaluateVirtualCot(eventId, { nowMs });
    assert.equal(result.state, 'deferred');
    assert.equal(result.reason, 'data_gap');
    assert.equal(virtualCot.getDnfLedger(eventId).length, 0);
  });

  await t.test('dry_run reports candidates without writing the ledger', () => {
    const eventId = createEvent({ cot_start_ms: nowMs - 6 * 60 * 1000, cot_mode: 'dry_run' });
    const riderId = addRider(eventId, 'F1');
    addPosition(eventId, riderId, 0.4, nowMs - 20 * 1000);

    const result = virtualCot.evaluateVirtualCot(eventId, { nowMs });
    assert.equal(result.state, 'dry_run');
    assert.equal(result.candidates.length, 1);
    assert.equal(virtualCot.getDnfLedger(eventId).length, 0);
  });

  await t.test('mode off performs no evaluation at all', () => {
    const eventId = createEvent({ cot_start_ms: nowMs - 6 * 60 * 1000, cot_mode: 'off' });
    const riderId = addRider(eventId, 'G1');
    addPosition(eventId, riderId, 0.4, nowMs - 20 * 1000);

    const result = virtualCot.evaluateVirtualCot(eventId, { nowMs });
    assert.equal(result.state, 'off');
    assert.equal(result.candidates.length, 0);
    assert.equal(virtualCot.getDnfLedger(eventId).length, 0);
  });

  await t.test('sweepers and other non-rider roles are ignored', () => {
    const eventId = createEvent({ cot_start_ms: nowMs - 6 * 60 * 1000 });
    const sweeper = addRider(eventId, 'S01', 'sweeper');
    const medic = addRider(eventId, 'M01', 'medic');
    addPosition(eventId, sweeper, 0.1, nowMs - 20 * 1000);
    addPosition(eventId, medic, 0.1, nowMs - 20 * 1000);

    const result = virtualCot.evaluateVirtualCot(eventId, { nowMs });
    assert.equal(result.states.length, 0);
    assert.equal(virtualCot.getDnfLedger(eventId).length, 0);
  });

  await t.test('voiding a DNF removes it from results and blocks re-evaluation', () => {
    const eventId = createEvent({ cot_start_ms: nowMs - 6 * 60 * 1000 });
    const riderId = addRider(eventId, 'H1');
    addPosition(eventId, riderId, 0.3, nowMs - 20 * 1000);

    virtualCot.evaluateVirtualCot(eventId, { nowMs });
    assert.equal(virtualCot.getDnfLedger(eventId)[0].status, 'ACTIVE');

    const ok = virtualCot.voidDnf(eventId, riderId, 'Salah baca jam mulai');
    assert.equal(ok, true);

    const ledger = virtualCot.getDnfLedger(eventId);
    assert.equal(ledger[0].status, 'VOID');
    assert.equal(ledger[0].void_reason, 'Salah baca jam mulai');
    assert.ok(ledger[0].voided_at);

    // Re-running the evaluator must not resurrect it
    virtualCot.evaluateVirtualCot(eventId, { nowMs });
    assert.equal(virtualCot.getDnfLedger(eventId)[0].status, 'VOID');
    assert.equal(db.getActiveVirtualDnfByEvent.all(eventId).length, 0);
  });

  await t.test('GET /api/events/:id/virtual-cot returns the public marker payload', async () => {
    const eventId = createEvent({ cot_start_ms: nowMs - 3 * 60 * 1000 });
    const riderId = addRider(eventId, 'K1');
    addPosition(eventId, riderId, 2.8, nowMs - 10 * 1000);

    const res = await fetch(`${baseUrl}/api/events/${eventId}/virtual-cot`);
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.enabled, true);
    assert.equal(body.mode, 'live');
    assert.ok(['MOVING', 'FINISHED'].includes(body.status));
    assert.ok(body.route_length_km > 3);
    assert.ok(body.latitude !== null && body.longitude !== null);
    assert.ok(body.last_telemetry_age_sec >= 0);
    assert.equal(typeof body.dnf_count, 'number');
    assert.ok(body.evaluation);
  });

  await t.test('GET virtual-cot reports enabled:false for unconfigured events', async () => {
    const result = db.createEvent.run({ name: `No COT ${Date.now()}`, date: '2026-11-18' });
    const eventId = Number(result.lastInsertRowid);
    createdEventIds.push(eventId);

    const res = await fetch(`${baseUrl}/api/events/${eventId}/virtual-cot`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.enabled, false);
    assert.equal(body.status, 'DISABLED');
    assert.equal(body.evaluation, null);
  });

  await t.test('admin CRUD persists COT fields including the computed epoch', async () => {
    const createRes = await fetch(`${baseUrl}/api/events/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'CRUD COT Event',
        date: '2026-12-01',
        cot_start_time: '04:30',
        cot_pace: 22.5,
        cot_mode: 'dry_run'
      })
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    createdEventIds.push(created.id);

    assert.equal(created.cot_start_time, '04:30');
    assert.equal(created.cot_pace, 22.5);
    assert.equal(created.cot_mode, 'dry_run');
    assert.equal(new Date(created.cot_start_ms).toISOString(), '2026-11-30T21:30:00.000Z');

    const updateRes = await fetch(`${baseUrl}/api/events/admin/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cot_pace: 18, cot_mode: 'off' })
    });
    assert.equal(updateRes.status, 200);
    const updated = await updateRes.json();
    assert.equal(updated.cot_pace, 18);
    assert.equal(updated.cot_mode, 'off');
    assert.equal(updated.cot_start_time, '04:30');
  });

  await t.test('activating live with too many candidates requires force', async () => {
    const eventId = createEvent({ cot_start_ms: nowMs - 6 * 60 * 1000, cot_mode: 'dry_run' });
    for (const bib of ['L1', 'L2', 'L3']) {
      const riderId = addRider(eventId, bib);
      addPosition(eventId, riderId, 0.2, nowMs - 20 * 1000);
    }

    const blocked = await fetch(`${baseUrl}/api/events/admin/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cot_mode: 'live' })
    });
    assert.equal(blocked.status, 409);
    const blockedBody = await blocked.json();
    assert.equal(blockedBody.preview.candidates.length, 3);

    const forced = await fetch(`${baseUrl}/api/events/admin/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cot_mode: 'live', force: true })
    });
    assert.equal(forced.status, 200);
    assert.equal((await forced.json()).cot_mode, 'live');
  });

  await t.test('admin preview and void endpoints work end-to-end', async () => {
    const eventId = createEvent({ cot_start_ms: nowMs - 6 * 60 * 1000 });
    const riderId = addRider(eventId, 'P1');
    addPosition(eventId, riderId, 0.3, nowMs - 20 * 1000);

    const previewRes = await fetch(`${baseUrl}/api/events/${eventId}/virtual-cot/preview`);
    assert.equal(previewRes.status, 200);
    const preview = await previewRes.json();
    assert.equal(preview.candidates.length, 1);
    assert.equal(preview.ledger.length, 0);

    const evalRes = await fetch(`${baseUrl}/api/events/${eventId}/virtual-cot`);
    assert.equal((await evalRes.json()).dnf_count, 1);

    const missingReason = await fetch(`${baseUrl}/api/events/${eventId}/virtual-cot/void/${riderId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(missingReason.status, 400);

    const voidRes = await fetch(`${baseUrl}/api/events/${eventId}/virtual-cot/void/${riderId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'GPS sempat mati' })
    });
    assert.equal(voidRes.status, 200);
    const voided = await voidRes.json();
    assert.equal(voided.ledger[0].status, 'VOID');

    const resultsRes = await fetch(`${baseUrl}/api/events/${eventId}/results`);
    const results = await resultsRes.json();
    const row = results.results.find(r => r.rider_id === riderId);
    assert.equal(row.dnf_reason, 'INCOMPLETE');
    assert.equal(results.summary.virtual_dnf, 0);
  });

  await t.test('results classify Virtual COT DNF and keep audit fields', async () => {
    const eventId = createEvent({ cot_start_ms: nowMs - 6 * 60 * 1000 });
    const riderId = addRider(eventId, 'R1');
    addPosition(eventId, riderId, 0.3, nowMs - 20 * 1000);

    const res = await fetch(`${baseUrl}/api/events/${eventId}/results`);
    const body = await res.json();
    const row = body.results.find(r => r.rider_id === riderId);

    assert.equal(row.status, 'DNF');
    assert.equal(row.dnf_reason, 'VIRTUAL_COT');
    assert.ok(row.virtual_cot);
    assert.ok(row.virtual_cot.cot_km > row.virtual_cot.rider_km);
    assert.equal(body.summary.virtual_dnf, 1);
  });

  await t.test('cleanup', () => {
    for (const id of createdEventIds) {
      try { db.deleteEvent.run(id); } catch (e) {}
    }
    for (const file of createdGpxFiles) {
      try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch (e) {}
    }
    virtualCot.invalidateEvaluation();

    if (server) server.close();
  });
});
