const test = require('node:test');
const assert = require('node:assert/strict');
const { checkOffRoute, haversineKm, findNearestRoutePoint, totalRouteKm } = require('../public/js/lib/gpx-utils');

test('GPX Off-Route Detection Math', async (t) => {
  // A straight route from point A to B
  // [-6.9147, 107.6098] to [-6.9200, 107.6098]
  const route = [
    [-6.9147, 107.6098],
    [-6.9160, 107.6098],
    [-6.9180, 107.6098],
    [-6.9200, 107.6098]
  ];

  await t.test('rider exactly on route returns isOffRoute: false', () => {
    const result = checkOffRoute(-6.9160, 107.6098, route, 100);
    assert.equal(result.isOffRoute, false);
    assert.ok(result.deviationMeters <= 5);
  });

  await t.test('rider 30m away from route is within 100m tolerance', () => {
    // Shifting longitude slightly (~0.0003 deg is ~33m at equator/tropics)
    const result = checkOffRoute(-6.9160, 107.6101, route, 100);
    assert.equal(result.isOffRoute, false);
    assert.ok(result.deviationMeters > 10);
    assert.ok(result.deviationMeters <= 100);
  });

  await t.test('rider 250m away from route triggers isOffRoute: true', () => {
    // Shifting longitude by ~0.0025 deg (~275m)
    const result = checkOffRoute(-6.9160, 107.6125, route, 100);
    assert.equal(result.isOffRoute, true);
    assert.ok(result.deviationMeters > 100);
  });

  await t.test('empty route returns isOffRoute: false', () => {
    const result = checkOffRoute(-6.9160, 107.6098, [], 100);
    assert.equal(result.isOffRoute, false);
    assert.equal(result.deviationMeters, 0);
  });
});

test('Loop Course False Finish Protection in findNearestRoutePoint', async (t) => {
  // Generate a circular/loop route of 30 points (approx 2.8 km loop)
  // Center: [-7.3300, 108.2200], Radius: ~0.004 deg (~450m)
  const centerLat = -7.3300;
  const centerLng = 108.2200;
  const numPts = 30;
  const loopRoute = [];

  for (let i = 0; i < numPts; i++) {
    const angle = (i / numPts) * 2 * Math.PI;
    const lat = centerLat + 0.004 * Math.sin(angle);
    const lng = centerLng + 0.004 * Math.cos(angle);
    loopRoute.push([lat, lng]);
  }
  // Close the loop (finish = start)
  loopRoute.push([loopRoute[0][0], loopRoute[0][1]]);
  const totalKm = totalRouteKm(loopRoute);

  await t.test('rider at start line of loop route snaps to 0 km (0%), not finish', () => {
    // At start point
    const res = findNearestRoutePoint(loopRoute[0][0], loopRoute[0][1], loopRoute, totalKm, null, 0);
    assert.equal(res.index, 0);
    assert.equal(res.progressPct, 0);
    assert.equal(res.distanceKm, 0);
  });

  await t.test('rider 3.2 km off-route (e.g. at home before race) snaps to start (0%), not finish', () => {
    // Coordinate 3 km north of loop center
    const offLat = centerLat + 0.0300;
    const offLng = centerLng;
    const res = findNearestRoutePoint(offLat, offLng, loopRoute, totalKm, null, 0);
    assert.equal(res.index, 0);
    assert.equal(res.progressPct, 0);
    assert.equal(res.distanceKm, 0);
  });

  await t.test('rider legitimately approaching finish with established progress stays near finish', () => {
    // Point at 90% of loop (index 27 of 30)
    const nearFinishPt = loopRoute[27];
    // Previous established progress at 80% (index 24) and cumulative distance 2.4 km
    const res = findNearestRoutePoint(nearFinishPt[0], nearFinishPt[1], loopRoute, totalKm, 24, 2.4);
    assert.ok(res.index >= 25, 'Should snap to near finish point');
    assert.ok(res.progressPct >= 75, 'Progress should reflect near finish');
    assert.ok(res.distanceKm >= 2.0, 'Distance should reflect near finish');
  });
});

test('Universal Pre-Start & False Finish Protection on Non-Loop / Point-to-Point Routes', async (t) => {
  // A straight point-to-point route from City A (-7.0000, 107.5000) to City B (-7.4000, 107.5000)
  // Approx 44 km north-to-south
  const p2pRoute = [];
  const totalPts = 45;
  for (let i = 0; i <= totalPts; i++) {
    const lat = -7.0000 - (i / totalPts) * 0.4000;
    const lng = 107.5000;
    p2pRoute.push([lat, lng]);
  }
  const totalKm = totalRouteKm(p2pRoute);

  await t.test('rider standing at finish line (City B) before race starts snaps to 0 km (0%), NOT finish', () => {
    // Rider turns on tracker in City B (finish area) before race starts (pedaled = 0 km, prevIndex = null)
    const finishCoord = p2pRoute[p2pRoute.length - 1];
    const res = findNearestRoutePoint(finishCoord[0], finishCoord[1], p2pRoute, totalKm, null, 0);
    assert.equal(res.index, 0, 'Must snap to Start (index 0)');
    assert.equal(res.progressPct, 0, 'Must have 0% progress');
    assert.equal(res.distanceKm, 0, 'Must have 0 km distance');
  });

  await t.test('rider in hotel near km 30 before race starts snaps to 0 km (0%), NOT mid-route', () => {
    // Rider in hotel near index 30 before start (pedaled = 0 km, prevIndex = null)
    const midCoord = p2pRoute[30];
    const res = findNearestRoutePoint(midCoord[0], midCoord[1], p2pRoute, totalKm, null, 0);
    assert.equal(res.index, 0, 'Must snap to Start (index 0)');
    assert.equal(res.progressPct, 0, 'Must have 0% progress');
    assert.equal(res.distanceKm, 0, 'Must have 0 km distance');
  });

  await t.test('rider at home 5 km away from point-to-point route snaps to 0 km (0%)', () => {
    // Rider 5 km east of route before start
    const offLat = -7.2000;
    const offLng = 107.5500;
    const res = findNearestRoutePoint(offLat, offLng, p2pRoute, totalKm, null, 0);
    assert.equal(res.index, 0, 'Must snap to Start (index 0)');
    assert.equal(res.progressPct, 0, 'Must have 0% progress');
    assert.equal(res.distanceKm, 0, 'Must have 0 km distance');
  });

  await t.test('rider who has actually ridden 40 km and reaches near finish legitimately advances', () => {
    // Rider legitimately reaches index 42 with 40 km pedaled
    const nearFinishCoord = p2pRoute[42];
    const res = findNearestRoutePoint(nearFinishCoord[0], nearFinishCoord[1], p2pRoute, totalKm, 40, 40.0);
    assert.ok(res.index >= 40, 'Should locate near end point');
    assert.ok(res.progressPct >= 85, 'Progress should be high');
    assert.ok(res.distanceKm >= 38.0, 'Distance should reflect 40km ridden');
  });
});
