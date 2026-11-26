const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const db = require('../db/database');
const app = require('../server');

test('Checkpoints & Split Times API & Database', async (t) => {
  let server;
  let baseUrl;

  await t.test('setup server and test event', async () => {
    // Ensure test event exists
    const eventResult = db.createEvent.run({
      name: 'Audax 200 Test Event',
      date: '2026-10-15'
    });
    const eventId = Number(eventResult.lastInsertRowid);

    // Ensure test rider exists
    const riderResult = db.createRider.run({
      event_id: eventId,
      bib: '101',
      name: 'Audax Rider',
      pin: '1234',
      traccar_device_id: 10101,
      color: '#00E5FF'
    });
    const riderId = Number(riderResult.lastInsertRowid);

    t.context = { eventId, riderId };

    // Start HTTP server on dynamic port
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  await t.test('POST /api/events/:id/checkpoints creates a new checkpoint', async () => {
    const { eventId } = t.context;

    const res = await fetch(`${baseUrl}/api/events/${eventId}/checkpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'CP 1 Waduk Cirata',
        km_distance: 50.5,
        open_time: '06:00',
        close_time: '10:00',
        latitude: -6.7214,
        longitude: 107.3512
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.checkpoint.name, 'CP 1 Waduk Cirata');
    assert.equal(data.checkpoint.km_distance, 50.5);
    assert.equal(data.checkpoint.close_time, '10:00');
    assert.ok(data.checkpoint.id);
    assert.ok(data.checkpoint.qr_token);
    t.context.checkpointId = data.checkpoint.id;
    t.context.checkpointQrToken = data.checkpoint.qr_token;
  });

  await t.test('GET /api/checkpoints/lookup/:qrToken returns checkpoint metadata and rejects unknown tokens', async () => {
    const { eventId, checkpointQrToken } = t.context;

    const okRes = await fetch(`${baseUrl}/api/checkpoints/lookup/${checkpointQrToken}`);
    assert.equal(okRes.status, 200);
    const data = await okRes.json();
    assert.equal(data.checkpoint.qr_token, checkpointQrToken);
    assert.equal(data.event.id, eventId);
    assert.equal(data.event.active, true);

    const badRes = await fetch(`${baseUrl}/api/checkpoints/lookup/nonexistent123`);
    assert.equal(badRes.status, 404);
  });

  await t.test('POST /api/checkpoints/checkin records self check-in via QR URL or token and preserves first arrival on duplicate scan', async () => {
    const { eventId, riderId, checkpointId, checkpointQrToken } = t.context;
    const rider = db.getRiderById.get(riderId);

    const firstRes = await fetch(`${baseUrl}/api/checkpoints/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rider-token': rider.token
      },
      body: JSON.stringify({
        qr_token: `https://cyclopon.my.id/cp/${checkpointQrToken}`,
        lat: -6.7214,
        lng: 107.3512
      })
    });
    assert.equal(firstRes.status, 201);
    const firstData = await firstRes.json();
    assert.equal(firstData.success, true);
    assert.equal(firstData.already_checked_in, false);
    assert.equal(firstData.split.checkpoint_id, checkpointId);
    assert.equal(firstData.split.source, 'qr_scan');
    assert.equal(firstData.split.check_in_lat, -6.7214);
    assert.equal(firstData.split.check_in_lng, 107.3512);

    const dupRes = await fetch(`${baseUrl}/api/checkpoints/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rider-token': rider.token
      },
      body: JSON.stringify({ qr_token: checkpointQrToken })
    });
    assert.equal(dupRes.status, 200);
    const dupData = await dupRes.json();
    assert.equal(dupData.already_checked_in, true);
    assert.equal(dupData.split.arrival_time, firstData.split.arrival_time);

    // Reject rider registered to a different event
    const otherEvent = db.createEvent.run({ name: 'Other Event', date: '2026-10-16' });
    const otherRiderRes = db.createRider.run({
      event_id: Number(otherEvent.lastInsertRowid),
      bib: '999',
      name: 'Other Rider',
      pin: '4321'
    });
    const otherRider = db.getRiderById.get(Number(otherRiderRes.lastInsertRowid));
    const crossRes = await fetch(`${baseUrl}/api/checkpoints/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rider-token': otherRider.token
      },
      body: JSON.stringify({ qr_token: checkpointQrToken })
    });
    assert.equal(crossRes.status, 403);
    db.db.prepare('DELETE FROM events WHERE id = ?').run(Number(otherEvent.lastInsertRowid));
  });

  await t.test('POST /api/checkpoints/checkin supports inline BIB + PIN and enforces event access PIN when locked', async () => {
    const { eventId, checkpointQrToken } = t.context;
    const rider2Res = db.createRider.run({
      event_id: eventId,
      bib: '202',
      name: 'Inline Rider',
      pin: '5678'
    });
    const rider2Id = Number(rider2Res.lastInsertRowid);

    // Lock event with access_pin
    db.updateEventAccessPin.run('9988', eventId);

    const deniedRes = await fetch(`${baseUrl}/api/checkpoints/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        qr_token: checkpointQrToken,
        bib: '202',
        pin: '5678'
      })
    });
    assert.equal(deniedRes.status, 401);

    const okRes = await fetch(`${baseUrl}/api/checkpoints/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        qr_token: checkpointQrToken,
        bib: '202',
        pin: '5678',
        event_pin: '9988'
      })
    });
    assert.equal(okRes.status, 201);
    const data = await okRes.json();
    assert.equal(data.split.rider_id, rider2Id);

    // Restore unlocked event state
    db.updateEventAccessPin.run(null, eventId);
  });

  await t.test('POST /api/events/:id/checkpoints/:cpId/regenerate-qr rotates token and invalidates old token', async () => {
    const { eventId, checkpointId, checkpointQrToken, riderId } = t.context;
    const rider = db.getRiderById.get(riderId);

    const rotRes = await fetch(`${baseUrl}/api/events/${eventId}/checkpoints/${checkpointId}/regenerate-qr`, {
      method: 'POST'
    });
    assert.equal(rotRes.status, 200);
    const rotData = await rotRes.json();
    assert.equal(rotData.success, true);
    assert.ok(rotData.checkpoint.qr_token);
    assert.notEqual(rotData.checkpoint.qr_token, checkpointQrToken);

    const oldLookup = await fetch(`${baseUrl}/api/checkpoints/lookup/${checkpointQrToken}`);
    assert.equal(oldLookup.status, 404);

    const oldCheckin = await fetch(`${baseUrl}/api/checkpoints/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rider-token': rider.token
      },
      body: JSON.stringify({ qr_token: checkpointQrToken })
    });
    assert.equal(oldCheckin.status, 404);
    t.context.checkpointQrToken = rotData.checkpoint.qr_token;
  });

  await t.test('POST /api/checkpoints/checkin evaluates OVER_COT when close_time has passed in WIB', async () => {
    const pastEvent = db.createEvent.run({ name: 'Past COT Event', date: '2020-01-01' });
    const pastEventId = Number(pastEvent.lastInsertRowid);
    const cpRes = db.createCheckpoint.run({
      event_id: pastEventId,
      name: 'CP Expired',
      km_distance: 25,
      open_time: '05:00',
      close_time: '06:00'
    });
    const cp = db.getCheckpointById.get(Number(cpRes.lastInsertRowid));
    const rRes = db.createRider.run({
      event_id: pastEventId,
      bib: '777',
      name: 'Late Rider',
      pin: '1111'
    });
    const lateRider = db.getRiderById.get(Number(rRes.lastInsertRowid));

    const res = await fetch(`${baseUrl}/api/checkpoints/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rider-token': lateRider.token
      },
      body: JSON.stringify({ qr_token: cp.qr_token })
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.split.status, 'OVER_COT');

    db.db.prepare('DELETE FROM events WHERE id = ?').run(pastEventId);
  });

  await t.test('PUT checkpoint coords/radius and enforce geofence radius lock on QR check-in with fresh telemetry fallback', async () => {
    const geoEvent = db.createEvent.run({ name: 'Geo Radius Event', date: '2026-10-20' });
    const geoEventId = Number(geoEvent.lastInsertRowid);

    // Reject radius lock without coordinates
    const invalidRes = await fetch(`${baseUrl}/api/events/${geoEventId}/checkpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'CP Tanpa Koordinat',
        km_distance: 40,
        radius_meters: 500
      })
    });
    assert.equal(invalidRes.status, 400);

    // Create with Google Maps coords string and 500m radius lock
    const createRes = await fetch(`${baseUrl}/api/events/${geoEventId}/checkpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'CP Radius Locked',
        km_distance: 40,
        coords: '-6.917500, 107.619100',
        radius_meters: 500
      })
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    assert.equal(created.checkpoint.latitude, -6.9175);
    assert.equal(created.checkpoint.longitude, 107.6191);
    assert.equal(created.checkpoint.radius_meters, 500);

    // Update radius to 300m via PUT
    const putRes = await fetch(`${baseUrl}/api/events/${geoEventId}/checkpoints/${created.checkpoint.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'CP Radius Locked Updated',
        km_distance: 42.5,
        coords: '-6.917500, 107.619100',
        radius_meters: 300
      })
    });
    assert.equal(putRes.status, 200);
    const putData = await putRes.json();
    assert.equal(putData.checkpoint.radius_meters, 300);
    assert.equal(putData.checkpoint.km_distance, 42.5);

    const lookupRes = await fetch(`${baseUrl}/api/checkpoints/lookup/${created.checkpoint.qr_token}`);
    assert.equal(lookupRes.status, 200);
    const lookupData = await lookupRes.json();
    assert.equal(lookupData.checkpoint.requires_gps, true);
    assert.equal(lookupData.checkpoint.radius_meters, 300);

    const r1Res = db.createRider.run({ event_id: geoEventId, bib: '801', name: 'Geo Rider', pin: '1234' });
    const r1 = db.getRiderById.get(Number(r1Res.lastInsertRowid));

    // 1. Missing GPS & no fresh telemetry -> 400 GPS_REQUIRED
    const noGpsRes = await fetch(`${baseUrl}/api/checkpoints/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-rider-token': r1.token },
      body: JSON.stringify({ qr_token: created.checkpoint.qr_token })
    });
    assert.equal(noGpsRes.status, 400);
    const noGpsData = await noGpsRes.json();
    assert.equal(noGpsData.code, 'GPS_REQUIRED');

    // 2. Far away (~5km away) -> 403 OUT_OF_RADIUS
    const farRes = await fetch(`${baseUrl}/api/checkpoints/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-rider-token': r1.token },
      body: JSON.stringify({
        qr_token: created.checkpoint.qr_token,
        lat: -6.9600,
        lng: 107.6191
      })
    });
    assert.equal(farRes.status, 403);
    const farData = await farRes.json();
    assert.equal(farData.code, 'OUT_OF_RADIUS');
    assert.ok(farData.distance_meters > 300);

    // 3. Inside radius (~110m away) -> 201 and distance_meters recorded
    const nearRes = await fetch(`${baseUrl}/api/checkpoints/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-rider-token': r1.token },
      body: JSON.stringify({
        qr_token: created.checkpoint.qr_token,
        lat: -6.9185,
        lng: 107.6191
      })
    });
    assert.equal(nearRes.status, 201);
    const nearData = await nearRes.json();
    assert.ok(nearData.split.distance_meters != null);
    assert.ok(nearData.split.distance_meters <= 300);

    // 4. Fresh position_history fallback when browser GPS is omitted
    const r2Res = db.createRider.run({ event_id: geoEventId, bib: '802', name: 'Traccar Rider', pin: '1234' });
    const r2 = db.getRiderById.get(Number(r2Res.lastInsertRowid));
    db.recordPositionHistory.run({
      event_id: geoEventId,
      rider_id: r2.id,
      latitude: -6.9178,
      longitude: 107.6192,
      speed: 20,
      distance_km: 42.5,
      recorded_at: new Date().toISOString()
    });

    const fallbackRes = await fetch(`${baseUrl}/api/checkpoints/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-rider-token': r2.token },
      body: JSON.stringify({ qr_token: created.checkpoint.qr_token })
    });
    assert.equal(fallbackRes.status, 201);
    const fallbackData = await fallbackRes.json();
    assert.ok(fallbackData.split.distance_meters <= 300);

    // 5. Flagged fallback check-in (allow_flagged) -> PENDING_VERIFY until admin approves or rejects
    const r3Res = db.createRider.run({ event_id: geoEventId, bib: '803', name: 'Flagged Rider', pin: '1234' });
    const r3 = db.getRiderById.get(Number(r3Res.lastInsertRowid));

    const flaggedRes = await fetch(`${baseUrl}/api/checkpoints/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-rider-token': r3.token },
      body: JSON.stringify({
        qr_token: created.checkpoint.qr_token,
        lat: -6.9600,
        lng: 107.6191,
        allow_flagged: true
      })
    });
    assert.equal(flaggedRes.status, 201);
    const flaggedData = await flaggedRes.json();
    assert.equal(flaggedData.flagged, true);
    assert.equal(flaggedData.split.verification_status, 'PENDING_VERIFY');
    assert.equal(flaggedData.split.flag_reason, 'OUT_OF_RADIUS');

    // Results should not count PENDING_VERIFY as cleared/FINISHER yet
    const resBeforeApprove = await fetch(`${baseUrl}/api/events/${geoEventId}/results`);
    const resultsBefore = await resBeforeApprove.json();
    const r3Before = resultsBefore.results.find(r => r.rider_id === r3.id);
    assert.equal(r3Before.checkpoints_cleared, 0);
    assert.equal(r3Before.pending_verification_count, 1);
    assert.equal(r3Before.status, 'DNF');

    // Admin approves flagged split -> becomes VERIFIED & rider becomes FINISHER
    const approveRes = await fetch(`${baseUrl}/api/events/${geoEventId}/splits/${flaggedData.split.id}/approve`, {
      method: 'PUT'
    });
    assert.equal(approveRes.status, 200);
    const approveData = await approveRes.json();
    assert.equal(approveData.split.verification_status, 'VERIFIED');
    assert.equal(approveData.split.flag_reason, null);

    const resAfterApprove = await fetch(`${baseUrl}/api/events/${geoEventId}/results`);
    const resultsAfter = await resAfterApprove.json();
    const r3After = resultsAfter.results.find(r => r.rider_id === r3.id);
    assert.equal(r3After.checkpoints_cleared, 1);
    assert.equal(r3After.pending_verification_count, 0);
    assert.equal(r3After.status, 'FINISHER');

    // Admin rejects/deletes a split -> removed cleanly
    const delSplitRes = await fetch(`${baseUrl}/api/events/${geoEventId}/splits/${flaggedData.split.id}`, {
      method: 'DELETE'
    });
    assert.equal(delSplitRes.status, 200);
    const checkAfterDel = db.getSplitByRiderAndCheckpoint.get(r3.id, created.checkpoint.id);
    assert.equal(checkAfterDel, undefined);

    db.db.prepare('DELETE FROM events WHERE id = ?').run(geoEventId);
  });

  await t.test('GET /api/events/:id/checkpoints returns checkpoints list ordered by km', async () => {
    const { eventId } = t.context;

    // Add CP 2
    await fetch(`${baseUrl}/api/events/${eventId}/checkpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'CP 2 Padalarang',
        km_distance: 105.0,
        open_time: '08:00',
        close_time: '14:30',
        latitude: -6.8421,
        longitude: 107.4812
      })
    });

    const res = await fetch(`${baseUrl}/api/events/${eventId}/checkpoints`);
    assert.equal(res.status, 200);
    const cps = await res.json();
    assert.ok(Array.isArray(cps));
    assert.ok(cps.length >= 2);
    assert.equal(cps[0].name, 'CP 1 Waduk Cirata');
    assert.equal(cps[1].name, 'CP 2 Padalarang');
    // Public callers must never see qr_token
    assert.equal(cps[0].qr_token, undefined);

    // Authenticated admin callers receive qr_token
    const { generateAdminSession } = require('../lib/admin-auth');
    const adminSess = generateAdminSession();
    const adminRes = await fetch(`${baseUrl}/api/events/${eventId}/checkpoints`, {
      headers: { 'x-admin-token': adminSess.token }
    });
    assert.equal(adminRes.status, 200);
    const adminCps = await adminRes.json();
    assert.ok(adminCps[0].qr_token);
  });

  await t.test('POST /api/checkpoints/checkin enforces rate limit after 8 failed inline PIN attempts', async () => {
    const { checkpointQrToken } = t.context;
    for (let i = 0; i < 8; i++) {
      const failRes = await fetch(`${baseUrl}/api/checkpoints/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_token: checkpointQrToken, bib: '101', pin: '0000' })
      });
      assert.equal(failRes.status, 401);
    }
    const lockedRes = await fetch(`${baseUrl}/api/checkpoints/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_token: checkpointQrToken, bib: '101', pin: '1234' })
    });
    assert.equal(lockedRes.status, 429);
  });

  await t.test('POST /api/events/:id/splits auto-evaluates COT when status is omitted', async () => {
    const { eventId, riderId, checkpointId } = t.context;
    // Event date is 2026-10-15, CP 1 close_time is 10:00 WIB (03:00Z)
    const lateRes = await fetch(`${baseUrl}/api/events/${eventId}/splits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rider_id: riderId,
        checkpoint_id: checkpointId,
        arrival_time: '2026-10-15T04:00:00.000Z'
      })
    });
    assert.equal(lateRes.status, 201);
    const lateData = await lateRes.json();
    assert.equal(lateData.split.status, 'OVER_COT');
  });

  await t.test('POST /api/events/:id/splits records rider CP split time and COT status', async () => {
    const { eventId, riderId, checkpointId } = t.context;

    const res = await fetch(`${baseUrl}/api/events/${eventId}/splits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rider_id: riderId,
        checkpoint_id: checkpointId,
        arrival_time: '2026-10-15T08:45:00.000Z',
        status: 'IN_TIME'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.split.rider_id, riderId);
    assert.equal(data.split.status, 'IN_TIME');
  });

  await t.test('GET /api/events/:id/splits returns all event splits with rider details', async () => {
    const { eventId, riderId } = t.context;

    const res = await fetch(`${baseUrl}/api/events/${eventId}/splits`);
    assert.equal(res.status, 200);
    const splits = await res.json();
    assert.ok(Array.isArray(splits));
    assert.ok(splits.length >= 1);
    const split = splits.find(s => s.rider_id === riderId);
    assert.ok(split);
    assert.equal(split.rider_bib, '101');
    assert.equal(split.checkpoint_name, 'CP 1 Waduk Cirata');
  });

  await t.test('DELETE /api/checkpoints/:id removes checkpoint', async () => {
    const { checkpointId, eventId } = t.context;

    const res = await fetch(`${baseUrl}/api/checkpoints/${checkpointId}`, {
      method: 'DELETE'
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);

    const checkRes = await fetch(`${baseUrl}/api/events/${eventId}/checkpoints`);
    const cps = await checkRes.json();
    assert.equal(cps.some(c => c.id === checkpointId), false);
  });

  await t.test('teardown', async () => {
    const { eventId } = t.context;
    db.db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
